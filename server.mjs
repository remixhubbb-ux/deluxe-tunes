import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the local .env for the standalone Node bridge. Vite loads .env automatically for the browser,
// but Node does not unless explicitly configured. Existing process.env values take precedence.
try{
  const envPath=path.join(__dirname,'.env');
  const raw=fsSync.readFileSync(envPath,'utf8');
  for(const line of raw.split(/\r?\n/)){
    const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!m || process.env[m[1]]!==undefined) continue;
    process.env[m[1]]=m[2].replace(/^(["'])(.*)\1$/,'$2');
  }
}catch{}
const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = path.join(__dirname, 'data', 'plays.json');
const SPOTIFY_SESSION_FILE = path.join(__dirname, 'data', 'spotify-auth.json');
const DISCORD_SESSION_FILE = path.join(__dirname, 'data', 'discord-auth.json');
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/api/discord/callback`;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/api/spotify/callback`;
const discordOAuthPending = new Map();
const spotifyOAuthPending = new Map();
let discordAuth = null;
let spotifyAuth = null;

let discordClient = null;
let discordReady = false;
let discordRpcRetryTimer = null;
let discordRpcConnecting = false;
let latestDiscordPresence = null;
function randomBase64Url(bytes=32){return crypto.randomBytes(bytes).toString('base64url');}
function pkceChallenge(verifier){return crypto.createHash('sha256').update(verifier).digest('base64url');}
function logSpotifyError(context, error, extra = {}) {
  console.error('[Spotify]', context, {
    message: error?.message || 'Unknown Spotify error',
    status: error?.status || extra.status || null,
    details: error?.details || extra.details || null,
    requestUrl: error?.requestUrl || extra.requestUrl || null,
    responseBody: error?.responseBody || extra.responseBody || null,
    ...extra,
  });
}

async function spotifyApi(pathname, token, init = {}){
  let urlString = pathname;
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    urlString = new URL(urlString).pathname + new URL(urlString).search;
  }
  const [pathPart, queryPart = ''] = urlString.split('?');
  const normalizedPath = pathPart.startsWith('/v1') ? pathPart : `/v1${pathPart.startsWith('/') ? pathPart : `/${pathPart}`}`;
  const url = new URL(`https://api.spotify.com${normalizedPath}${queryPart ? `?${queryPart}` : ''}`);
  const method = (init.method || 'GET').toUpperCase();
  const requestHeaders = { Authorization: `Bearer ${token}`, ...(init.headers || {}) };
  console.log('[Spotify] request', {
    method,
    url: url.toString(),
    hasToken: Boolean(token),
    tokenLength: token ? String(token).length : 0,
    scopes: spotifyAuth?.scopes || null,
    clientIdConfigured: Boolean(process.env.SPOTIFY_CLIENT_ID),
    redirectUri: SPOTIFY_REDIRECT_URI,
  });
  const r = await fetch(url, { ...init, method, headers: requestHeaders });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if(!r.ok){
    const error = new Error(data?.error?.message || `Spotify API ${r.status} for ${pathname}`);
    error.status = r.status;
    error.details = data;
    error.requestUrl = url.toString();
    error.responseBody = text;
    console.error('[Spotify] request failed', {
      method,
      url: url.toString(),
      status: r.status,
      response: data,
      rawResponse: text,
      scopes: spotifyAuth?.scopes || null,
    });
    throw error;
  }
  return data;
}
async function refreshSpotifyTokenIfNeeded(){
  if(!spotifyAuth) return null;
  const needsRefresh = Date.now() + 60000 >= spotifyAuth.expiresAt;
  if(!needsRefresh) return spotifyAuth.accessToken;
  const tokenRes=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:spotifyAuth.refreshToken,client_id:process.env.SPOTIFY_CLIENT_ID || ''})});
  const token=await tokenRes.json().catch(()=>({}));
  if(!tokenRes.ok || !token.access_token) throw new Error(token?.error_description||token?.error||'Spotify token refresh failed.');
  const scopes = Array.isArray(token.scope ? token.scope.split(' ') : []) ? token.scope.split(' ') : (spotifyAuth?.scopes || []);
  spotifyAuth={...spotifyAuth,accessToken:token.access_token,expiresAt:Date.now()+(Number(token.expires_in)||3600)*1000,scopes};
  await writeSpotifySession(spotifyAuth);
  console.log('[Spotify] token refreshed', {
    scopes,
    expiresIn: Number(token.expires_in) || 3600,
    refreshSucceeded: true,
  });
  return spotifyAuth.accessToken;
}
async function discordApi(pathname, token){
  const r=await fetch(`https://discord.com/api/v10${pathname}`,{headers:{Authorization:`Bearer ${token}`}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.message||`Discord API ${r.status}`);
  return data;
}

async function initDiscord(){
  discordAuth = await readDiscordSession();
  if(!process.env.DISCORD_CLIENT_ID) return;
  if(discordRpcConnecting || discordReady) return;
  discordRpcConnecting = true;
  try{
    const mod = await import('discord-rpc');
    const RPC = mod.default || mod;
    discordClient = new RPC.Client({transport:'ipc'});
    discordClient.on('ready',async()=>{
      discordReady=true;
      console.log('Deluxe Tunes Discord Rich Presence ready');
      if(latestDiscordPresence) await applyDiscordPresence(latestDiscordPresence);
    });
    discordClient.on('disconnected',()=>{
      discordReady=false;
      scheduleDiscordRpcRetry();
    });
    await discordClient.login({clientId:process.env.DISCORD_CLIENT_ID});
  }catch(err){
    discordReady=false;
    discordClient=null;
    console.warn('Discord Rich Presence is unavailable:',err?.message||err);
    scheduleDiscordRpcRetry();
  }finally{discordRpcConnecting=false;}
}
function scheduleDiscordRpcRetry(){
  if(discordRpcRetryTimer||!process.env.DISCORD_CLIENT_ID) return;
  discordRpcRetryTimer=setTimeout(()=>{discordRpcRetryTimer=null;initDiscord();},10000);
}
async function applyDiscordPresence(payload){
  if(!discordClient||!discordReady)return false;
  try{
    await discordClient.request('SET_ACTIVITY',{
      pid:process.pid,
      activity:{
        type:2,
        details:payload.details,
        state:payload.state,
        timestamps:{start:Number(payload.startedAt)||Date.now()},
        assets:{large_image:payload.largeImageKey||'music-note',large_text:'Deluxe Tunes'},
        instance:false,
      },
    });
    return true;
  }
  catch{return false;}
}
async function refreshDiscordTokenIfNeeded(){
  if(!discordAuth) return null;
  if(Date.now()+60000 < Number(discordAuth.expiresAt||0)) return discordAuth.accessToken;
  if(!discordAuth.refreshToken || !process.env.DISCORD_CLIENT_ID) return null;
  const body=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,grant_type:'refresh_token',refresh_token:discordAuth.refreshToken});
  if(process.env.DISCORD_CLIENT_SECRET) body.set('client_secret',process.env.DISCORD_CLIENT_SECRET);
  const tokenRes=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const token=await tokenRes.json().catch(()=>({}));
  if(!tokenRes.ok||!token.access_token) throw new Error(token?.error_description||token?.message||'Discord token refresh failed.');
  discordAuth={...discordAuth,accessToken:token.access_token,refreshToken:token.refresh_token||discordAuth.refreshToken,expiresAt:Date.now()+(Number(token.expires_in)||604800)*1000};
  await writeDiscordSession(discordAuth);
  return discordAuth.accessToken;
}
async function setDiscordPresence(payload){
  latestDiscordPresence=payload;
  return applyDiscordPresence(payload);
}
async function clearDiscordPresence(){if(!discordClient||!discordReady)return false;try{await discordClient.clearActivity();return true}catch{return false;}}
async function readData(){
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); }
  catch { return {plays:{},meta:{}}; }
}
async function writeData(data){
  await fs.mkdir(path.dirname(DATA_FILE), {recursive:true});
  const tmp = DATA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, DATA_FILE);
}
async function readSpotifySession(){
  try {
    const raw = await fs.readFile(SPOTIFY_SESSION_FILE, 'utf8');
    const data = JSON.parse(raw || '{}');
    if (!data || !data.accessToken) return null;
    console.log('[Spotify] restored session from disk', { user: data.user?.id || data.user?.display_name || null, scopes: data.scopes || [] });
    return data;
  } catch {
    return null;
  }
}
async function writeSpotifySession(session){
  if (!session) {
    try { await fs.unlink(SPOTIFY_SESSION_FILE); } catch {}
    return;
  }
  await fs.mkdir(path.dirname(SPOTIFY_SESSION_FILE), {recursive:true});
  const safe = {
    user: session.user || null,
    accessToken: session.accessToken || null,
    refreshToken: session.refreshToken || null,
    expiresAt: session.expiresAt || null,
    scopes: Array.isArray(session.scopes) ? session.scopes : [],
  };
  const tmp = SPOTIFY_SESSION_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(safe, null, 2));
  await fs.rename(tmp, SPOTIFY_SESSION_FILE);
}
async function readDiscordSession(){
  try {
    const raw=await fs.readFile(DISCORD_SESSION_FILE,'utf8');
    const data=JSON.parse(raw||'{}');
    if(!data||!data.accessToken) return null;
    return data;
  } catch { return null; }
}
async function writeDiscordSession(session){
  if(!session){try{await fs.unlink(DISCORD_SESSION_FILE)}catch{};return;}
  await fs.mkdir(path.dirname(DISCORD_SESSION_FILE),{recursive:true});
  const safe={user:session.user||null,accessToken:session.accessToken||null,refreshToken:session.refreshToken||null,expiresAt:session.expiresAt||null};
  const tmp=DISCORD_SESSION_FILE+'.tmp';
  await fs.writeFile(tmp,JSON.stringify(safe,null,2));
  await fs.rename(tmp,DISCORD_SESSION_FILE);
}
function json(res,status,payload){
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Accept','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
  res.end(JSON.stringify(payload));
}
function html(res,status,body){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}

const server=http.createServer(async (req,res)=>{
  if(req.method==='OPTIONS') return json(res,204,{});
  if(req.url==='/api/plays' && req.method==='GET') return json(res,200,await readData());
  if(req.url==='/api/discord/status' && req.method==='GET'){
    try{await refreshDiscordTokenIfNeeded();}catch{discordAuth=null;await writeDiscordSession(null);}
    return json(res,200,{authenticated:Boolean(discordAuth),user:discordAuth?.user||null});
  }
  if(req.url==='/api/spotify/status' && req.method==='GET') return json(res,200,{authenticated:Boolean(spotifyAuth),user:spotifyAuth?.user||null});
  if(req.url==='/api/spotify/playlists' && req.method==='GET'){
    try{
      if(!spotifyAuth) return json(res,401,{error:'Spotify is not connected.'});
      const token=await refreshSpotifyTokenIfNeeded();
      if(!token) return json(res,401,{error:'Spotify is not connected.'});
      console.log('[Spotify] playlist request', {
        method: 'GET',
        url: 'https://api.spotify.com/v1/me/playlists?limit=50',
        hasToken: Boolean(token),
        tokenLength: String(token).length,
        scopes: spotifyAuth?.scopes || null,
        redirectUri: SPOTIFY_REDIRECT_URI,
        clientIdConfigured: Boolean(process.env.SPOTIFY_CLIENT_ID),
      });
      const items=[];
      let nextUrl='https://api.spotify.com/v1/me/playlists?limit=50';
      while(nextUrl){
        const page = await spotifyApi(new URL(nextUrl).pathname + new URL(nextUrl).search, token);
        const pageItems = Array.isArray(page?.items) ? page.items : [];
        for(const item of pageItems){
          if(!item?.id) continue;
          items.push({
            id:item.id,
            name:item.name,
            image:item.images?.[0]?.url || null,
            trackCount:Number(item?.tracks?.total ?? item?.items?.total ?? 0),
            owner:item.owner?.display_name || 'Spotify'
          });
        }
        nextUrl = page?.next || null;
      }
      return json(res,200,{items});
    }catch(err){
      logSpotifyError('load playlists', err, {
        requestUrl: err?.requestUrl || 'https://api.spotify.com/v1/me/playlists',
        responseBody: err?.responseBody || null,
      });
      const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : err?.status === 429 ? 429 : 500;
      const message = err?.status === 401 ? 'Spotify authentication expired or is missing. Please reconnect your Spotify account.' : err?.status === 403 ? 'Spotify denied access to playlist data. Please ensure playlist permissions were granted.' : err?.status === 429 ? 'Spotify rate limit reached. Please wait a moment and try again.' : err?.message || 'Could not load Spotify playlists.';
      return json(res,status,{error:message,requestUrl: err?.requestUrl || 'https://api.spotify.com/v1/me/playlists', responseBody: err?.responseBody || null});
    }
  }
  const spotifyLegacyTracksMatch=req.url?.match(/^\/api\/spotify\/playlists\/([^/]+)\/tracks$/);
  if(spotifyLegacyTracksMatch && req.method==='GET'){
    return json(res,410,{error:'Deprecated Spotify endpoint: use /api/spotify/playlists/:playlistId/items instead.'});
  }
  const spotifyPlaylistItemsMatch=req.url?.match(/^\/api\/spotify\/playlists\/([^/]+)\/items$/);
  if(spotifyPlaylistItemsMatch && req.method==='GET'){
    try{
      if(!spotifyAuth) return json(res,401,{error:'Spotify is not connected.'});
      const token=await refreshSpotifyTokenIfNeeded();
      const playlistId=decodeURIComponent(spotifyPlaylistItemsMatch[1]);
      let nextUrl=`https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;
      const items=[];
      while(nextUrl){
        const page = await spotifyApi(new URL(nextUrl).pathname + new URL(nextUrl).search, token);
        const pageItems = Array.isArray(page?.items) ? page.items : [];
        for(const entry of pageItems){
          const rawItem = entry?.item ?? entry?.track ?? entry;
          const nestedTrack = rawItem && typeof rawItem === 'object' && rawItem.track && typeof rawItem.track === 'object' ? rawItem.track : rawItem;
          const track = nestedTrack && typeof nestedTrack === 'object' ? nestedTrack : null;
          if(!track || (track.type && track.type !== 'track')) continue;
          const artist = (track.artists || []).map(a => a.name).filter(Boolean).join(', ') || 'Unknown artist';
          items.push({
            id: track.id || null,
            title: track.name || 'Unknown track',
            artist,
            album: track.album?.name || '',
            durationMs: Number(track.duration_ms || 0),
            uri: track.uri || null,
            image: track.album?.images?.[0]?.url || null,
            track,
          });
        }
        nextUrl = page?.next || null;
      }
      return json(res,200,{items,total:items.length});
    }catch(err){
      logSpotifyError('load playlist items', err, {
        requestUrl: err?.requestUrl || null,
        responseBody: err?.responseBody || null,
      });
      const status = err?.status === 401 ? 401 : err?.status === 403 ? 403 : err?.status === 429 ? 429 : 500;
      const message = err?.status === 401 ? 'Spotify authentication expired while loading the playlist.' : err?.status === 403 ? 'Spotify denied access to this playlist. Please re-authorise the app.' : err?.status === 429 ? 'Spotify rate limit reached while loading this playlist.' : err?.message || 'Could not load Spotify playlist items.';
      return json(res,status,{error:message,requestUrl:err?.requestUrl || null,responseBody:err?.responseBody || null});
    }
  }
  if(req.url==='/api/discord/auth/start' && req.method==='GET'){
    const clientId=process.env.DISCORD_CLIENT_ID;
    if(!clientId) return json(res,500,{error:'DISCORD_CLIENT_ID is not configured on the Deluxe Tunes server.'});
    const state=randomBase64Url(24);
    const verifier=randomBase64Url(48);
    discordOAuthPending.set(state,{verifier,createdAt:Date.now()});
    const params=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:DISCORD_REDIRECT_URI,scope:'identify',state,code_challenge:pkceChallenge(verifier),code_challenge_method:'S256',prompt:'consent'});
    res.writeHead(302,{Location:`https://discord.com/oauth2/authorize?${params.toString()}`});res.end();return;
  }
  if(req.url==='/api/spotify/auth/start' && req.method==='GET'){
    const clientId=process.env.SPOTIFY_CLIENT_ID;
    if(!clientId) return json(res,500,{error:'SPOTIFY_CLIENT_ID is not configured on the Deluxe Tunes server.'});
    const state=randomBase64Url(24);
    const verifier=randomBase64Url(48);
    spotifyOAuthPending.set(state,{verifier,createdAt:Date.now()});
    const params=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:SPOTIFY_REDIRECT_URI,scope:'user-read-email user-read-private playlist-read-private playlist-read-collaborative',state,code_challenge:pkceChallenge(verifier),code_challenge_method:'S256',show_dialog:'true'});
    res.writeHead(302,{Location:`https://accounts.spotify.com/authorize?${params.toString()}`});res.end();return;
  }
  if(req.url?.startsWith('/api/discord/callback') && req.method==='GET'){
    const u=new URL(req.url,`http://localhost:${PORT}`); const code=u.searchParams.get('code'); const state=u.searchParams.get('state'); const error=u.searchParams.get('error');
    if(error) return html(res,400,`<script>const target = new URL('${APP_ORIGIN}').origin; window.opener?.postMessage({type:'deluxe-discord-auth',ok:false,error:${JSON.stringify(error)}},target); window.close();</script><p>Discord authorization was cancelled. You can close this window.</p>`);
    const pending=state?discordOAuthPending.get(state):null; discordOAuthPending.delete(state);
    if(!code||!pending||Date.now()-pending.createdAt>10*60*1000) return html(res,400,'<p>Discord authorization expired or was invalid. Close this window and try again.</p>');
    try{
      const clientId=process.env.DISCORD_CLIENT_ID; const secret=process.env.DISCORD_CLIENT_SECRET;
      const body=new URLSearchParams({client_id:clientId,grant_type:'authorization_code',code,redirect_uri:DISCORD_REDIRECT_URI,code_verifier:pending.verifier});
      const headers={'Content-Type':'application/x-www-form-urlencoded'};
      if(secret){ headers.Authorization='Basic '+Buffer.from(`${clientId}:${secret}`).toString('base64'); body.delete('client_id'); body.delete('code_verifier'); }
      const tokenRes=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers,body});
      const token=await tokenRes.json().catch(()=>({}));
      if(!tokenRes.ok) throw new Error(token?.error_description||token?.message||`Token exchange failed (${tokenRes.status})`);
      const user=await discordApi('/users/@me',token.access_token);
      discordAuth={user,accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:Date.now()+(Number(token.expires_in)||604800)*1000};
      await writeDiscordSession(discordAuth);
      return html(res,200,`<!doctype html><html><body style="background:#050608;color:#fff;font-family:system-ui;padding:32px"><h2>Discord connected</h2><p>You authenticated as ${escapeHtml(user.global_name||user.username||'Discord user')}.</p><script>const target = new URL('${APP_ORIGIN}').origin; window.opener?.postMessage({type:'deluxe-discord-auth',ok:true},target); setTimeout(()=>window.close(),250);</script></body></html>`);
    }catch(err){return html(res,500,`<p>Discord authorization failed: ${escapeHtml(err?.message||'Unknown error')}</p><script>const target = new URL('${APP_ORIGIN}').origin; window.opener?.postMessage({type:'deluxe-discord-auth',ok:false,error:${JSON.stringify(err?.message||'Unknown error')}},target);</script>`)}
  }
  if(req.url==='/api/discord/logout' && req.method==='POST'){
    const token=discordAuth?.refreshToken||discordAuth?.accessToken;
    if(token && process.env.DISCORD_CLIENT_ID){try{const body=new URLSearchParams({token});const headers={'Content-Type':'application/x-www-form-urlencoded'};if(process.env.DISCORD_CLIENT_SECRET)headers.Authorization='Basic '+Buffer.from(`${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`).toString('base64');else body.set('client_id',process.env.DISCORD_CLIENT_ID);await fetch('https://discord.com/api/v10/oauth2/token/revoke',{method:'POST',headers,body});}catch{}}
    discordAuth=null; await writeDiscordSession(null); await clearDiscordPresence(); return json(res,200,{authenticated:false});
  }
  if(req.url?.startsWith('/api/spotify/callback') && req.method==='GET'){
    const u=new URL(req.url,`http://127.0.0.1:${PORT}`); const code=u.searchParams.get('code'); const state=u.searchParams.get('state'); const error=u.searchParams.get('error');
    if(error) return html(res,400,`<script>const target = new URL('${APP_ORIGIN}').origin; window.opener?.postMessage({type:'deluxe-spotify-auth',ok:false,error:${JSON.stringify(error)}},target); window.close();</script><p>Spotify authorization was cancelled. You can close this window.</p>`);
    const pending=state?spotifyOAuthPending.get(state):null; spotifyOAuthPending.delete(state);
    if(!code||!pending||Date.now()-pending.createdAt>10*60*1000) return html(res,400,'<p>Spotify authorization expired or was invalid. Close this window and try again.</p>');
    try{
      const clientId=process.env.SPOTIFY_CLIENT_ID;
      const tokenRes=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:new URLSearchParams({client_id:clientId,grant_type:'authorization_code',code,redirect_uri:SPOTIFY_REDIRECT_URI,code_verifier:pending.verifier})});
      const token=await tokenRes.json().catch(()=>({}));
      if(!tokenRes.ok) throw new Error(token?.error_description||token?.error||`Token exchange failed (${tokenRes.status})`);
      const profileRes=await fetch('https://api.spotify.com/v1/me',{headers:{Authorization:`Bearer ${token.access_token}`}});
      const user=await profileRes.json().catch(()=>({}));
      if(!profileRes.ok) throw new Error(user?.error?.message||`Profile lookup failed (${profileRes.status})`);
      const scopes = (token.scope || '').split(' ').filter(Boolean);
      spotifyAuth={user,accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:Date.now()+(Number(token.expires_in)||3600)*1000,scopes};
      await writeSpotifySession(spotifyAuth);
      console.log('[Spotify] OAuth success', {
        redirectUri: SPOTIFY_REDIRECT_URI,
        clientIdConfigured: Boolean(process.env.SPOTIFY_CLIENT_ID),
        grantedScopes: scopes,
        tokenExpiresIn: Number(token.expires_in) || 3600,
      });
      return html(res,200,`<!doctype html><html><body style="background:#050608;color:#fff;font-family:system-ui;padding:32px"><h2>Spotify connected</h2><p>You authenticated as ${escapeHtml(user.display_name||user?.id||'Spotify user')}.</p><script>const target = new URL('${APP_ORIGIN}').origin; window.opener?.postMessage({type:'deluxe-spotify-auth',ok:true,user:${JSON.stringify(user)}},target); setTimeout(()=>window.close(),250);</script></body></html>`);
    }catch(err){return html(res,500,`<p>Spotify authorization failed: ${escapeHtml(err?.message||'Unknown error')}</p><script>const target = new URL('${APP_ORIGIN}').origin; window.opener?.postMessage({type:'deluxe-spotify-auth',ok:false,error:${JSON.stringify(err?.message||'Unknown error')}},target);</script>`)}
  }
  if(req.url==='/api/spotify/logout' && req.method==='POST'){
    const token=spotifyAuth?.accessToken || spotifyAuth?.refreshToken;
    if(token && process.env.SPOTIFY_CLIENT_ID){
      try{
        await fetch('https://accounts.spotify.com/api/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token,client_id:process.env.SPOTIFY_CLIENT_ID})});
      }catch{}
    }
    spotifyAuth=null;
    await writeSpotifySession(null);
    return json(res,200,{authenticated:false});
  }
  if(req.url==='/api/discord/presence' && req.method==='POST'){
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',async()=>{let payload={};try{payload=JSON.parse(body||'{}')}catch{};const ok=await setDiscordPresence(payload);json(res,200,{connected:discordReady,updated:ok});});return;
  }
  if(req.url==='/api/discord/clear' && req.method==='POST'){const ok=await clearDiscordPresence();return json(res,200,{connected:discordReady,cleared:ok});}
  const match=req.url?.match(/^\/api\/plays\/([^/?]+)$/);
  if(match && req.method==='POST'){
    const id=decodeURIComponent(match[1]);
    let body='';
    req.on('data',chunk=>body+=chunk);
    req.on('end',async()=>{
      const data=await readData();
      data.plays[id]=(Number(data.plays[id])||0)+1;
      try{Object.assign(data.meta[id]||={}, JSON.parse(body||'{}'));}catch{}
      await writeData(data);
      json(res,200,{id,plays:data.plays[id]});
    });
    return;
  }
  json(res,404,{error:'Not found'});
});
async function initSpotifySession(){
  spotifyAuth = await readSpotifySession();
  if (spotifyAuth) {
    console.log('[Spotify] session restored on startup', {
      user: spotifyAuth.user?.id || spotifyAuth.user?.display_name || null,
      scopes: spotifyAuth.scopes || [],
      expiresAt: spotifyAuth.expiresAt || null,
    });
  }
}
await initSpotifySession();
server.listen(PORT,()=>console.log(`Deluxe Tunes local server listening on :${PORT}`));
initDiscord();
