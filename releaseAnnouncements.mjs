const DEFAULT_APP_LINK_BASE = 'https://deluxetunesapp.pages.dev';
export const MAX_WEBHOOK_ATTEMPTS = 8;
const BASE_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

function readStringProperty(objectSource, property) {
  const pattern = new RegExp(`(?:^|[,{])\\s*["']?${property}["']?\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const match = objectSource.match(pattern);
  if (!match) return '';
  try { return JSON.parse(`"${match[1]}"`); }
  catch { return match[1]; }
}

export function parseBundledSongCatalog(source) {
  const match = String(source ?? '').match(/const\s+DEMOS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error('Could not find the bundled song catalogue.');

  return [...match[1].matchAll(/\{[^{}]*\}/g)]
    .map(([objectSource]) => ({
      id: readStringProperty(objectSource, 'id'),
      title: readStringProperty(objectSource, 'title'),
      artist: readStringProperty(objectSource, 'artist'),
      artwork: readStringProperty(objectSource, 'artwork'),
    }))
    .filter(song => song.id && song.title && song.artist);
}

export async function fetchReleaseCatalog(manifestUrl, { fetchImpl = fetch, now = () => Date.now() } = {}) {
  const url = new URL(manifestUrl);
  url.searchParams.set('_scan', String(now()));
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Release catalogue returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload?.songs)) throw new Error('Release catalogue response is missing its songs array.');
  return payload.songs;
}

export function normalizeReleaseSong(song = {}, appLinkBase = DEFAULT_APP_LINK_BASE) {
  const id = String(song.id ?? '').trim();
  const title = String(song.title ?? '').replace(/\s+/g, ' ').trim();
  const artist = String(song.artist ?? '').replace(/\s+/g, ' ').trim();
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(id) || !title || !artist) return null;

  let artwork = null;
  const artworkValue = String(song.artwork ?? '').trim();
  if (artworkValue) {
    try {
      const url = new URL(artworkValue, appLinkBase);
      if (url.protocol === 'https:' || url.protocol === 'http:') artwork = url.toString();
    } catch {}
  }

  return {
    id,
    title: title.slice(0, 180),
    artist: artist.slice(0, 180),
    artwork,
    appUrl: new URL('/', appLinkBase).toString(),
  };
}

export function buildReleaseWebhookPayload(song) {
  const escapeMarkdown = value => String(value).replace(/([\\_*`~|>])/g, '\\$1');
  const embed = {
    author: { name: 'DELUXE TUNES  •  NEW RELEASE' },
    title: `🎵 ${song.title}`.slice(0, 256),
    description: `**${escapeMarkdown(song.artist)}**\n\n[▶ Open in Deluxe Tunes](${song.appUrl})`,
    url: song.appUrl,
    color: 0xb7ff3c,
    footer: { text: 'DELUXE TUNES  •  FRESH MUSIC' },
  };
  if (song.artwork) embed.image = { url: song.artwork };
  return {
    content: '🆕 **New release**',
    embeds: [embed],
    allowed_mentions: { parse: [] },
  };
}

export async function sendDiscordReleaseWebhookTest({ webhookUrl, fetchImpl = fetch } = {}) {
  if (!webhookUrl) throw new Error('DISCORD_NEW_RELEASE_WEBHOOK_URL is not configured.');
  let url;
  try { url = new URL(webhookUrl); }
  catch { throw new Error('The configured Discord webhook URL is invalid.'); }
  if (url.protocol !== 'https:' || !['discord.com', 'discordapp.com'].includes(url.hostname.toLowerCase()) || !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)) {
    throw new Error('The configured webhook must be an HTTPS Discord webhook URL.');
  }
  url.searchParams.set('wait', 'true');
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '🧪 **DELUXE TUNES TEST — NOT A RELEASE ANNOUNCEMENT**\nThis is a one-time delivery check for the new-song-release webhook. No catalogue or release baseline was changed.',
      allowed_mentions: { parse: [] },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Discord rejected the test message (HTTP ${response.status}).`);
  }
  const message = await response.json().catch(() => ({}));
  return {
    messageId: message?.id || null,
    channelId: message?.channel_id || null,
    guildId: message?.guild_id || null,
  };
}

export function getWebhookRetryDelayMs(attemptCount, retryAfterMs = 0) {
  const exponent = Math.max(0, Math.min(Number(attemptCount) - 1, 10));
  const backoff = Math.min(BASE_RETRY_DELAY_MS * (2 ** exponent), MAX_RETRY_DELAY_MS);
  return Math.max(backoff, Math.max(0, Number(retryAfterMs) || 0));
}

export function createReleaseCataloguePoller({
  scan,
  intervalMs = 60_000,
  enabled = true,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
}) {
  let timer = null;
  let activeScan = null;
  let stopped = false;
  const runScan = () => {
    if (stopped || !enabled) return Promise.resolve();
    if (activeScan) return activeScan;
    activeScan = Promise.resolve().then(scan).finally(() => { activeScan = null; });
    return activeScan;
  };
  return {
    scan: runScan,
    start() {
      if (stopped || !enabled || timer) return;
      timer = setIntervalImpl(() => runScan().catch(() => {}), intervalMs);
      timer?.unref?.();
    },
    async stop() {
      stopped = true;
      if (timer) {
        clearIntervalImpl(timer);
        timer = null;
      }
      if (activeScan) await activeScan;
    },
  };
}

async function retryAfterFromResponse(response, now) {
  const header = response.headers?.get?.('retry-after');
  let retryAfterMs = 0;
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) retryAfterMs = seconds * 1000;
    const timestamp = Date.parse(header);
    if (Number.isFinite(timestamp)) retryAfterMs = Math.max(retryAfterMs, timestamp - now);
  }
  if (typeof response.json === 'function') {
    const payload = await response.json().catch(() => null);
    const seconds = Number(payload?.retry_after);
    if (Number.isFinite(seconds) && seconds >= 0) retryAfterMs = Math.max(retryAfterMs, seconds * 1000);
  }
  return retryAfterMs;
}

export function createReleaseAnnouncementService({
  store,
  webhookUrl,
  appLinkBase = DEFAULT_APP_LINK_BASE,
  fetchImpl = fetch,
  now = () => Date.now(),
}) {
  return {
    configured: Boolean(webhookUrl),
    async announceCatalog(rawSongs, { announceBaselineIds = [] } = {}) {
      if (!webhookUrl) return { configured: false, baseline: false, announced: 0 };
      const songs = [...new Map((Array.isArray(rawSongs) ? rawSongs : [])
        .map(song => normalizeReleaseSong(song, appLinkBase))
        .filter(Boolean)
        .map(song => [song.id, song])).values()];
      if (!songs.length) return { configured: true, baseline: false, announced: 0 };

      const forcedBaselineIds = new Set((Array.isArray(announceBaselineIds) ? announceBaselineIds : [])
        .map(id => String(id).trim())
        .filter(id => /^[a-z0-9][a-z0-9._-]{0,119}$/i.test(id)));
      const baseline = await store.initializeBaseline(songs, forcedBaselineIds);
      if (baseline && !forcedBaselineIds.size) return { configured: true, baseline: true, announced: 0 };

      let announced = 0;
      for (const song of songs) {
        const claim = forcedBaselineIds.has(song.id)
          ? (await store.claimBaseline?.(song, now()) || await store.claim(song, now()))
          : baseline ? false : await store.claim(song, now());
        if (!claim) continue;
        const attemptCount = Number(typeof claim === 'number' ? claim : claim.attemptCount) || 1;
        try {
          const response = await fetchImpl(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildReleaseWebhookPayload(song)),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) {
            const status = Number(response.status) || 0;
            const error = `Discord webhook HTTP ${status || 'error'}`;
            if ((status === 408 || status === 425 || status === 429 || status >= 500) && attemptCount < MAX_WEBHOOK_ATTEMPTS) {
              const retryAfterMs = await retryAfterFromResponse(response, now());
              const delayMs = getWebhookRetryDelayMs(attemptCount, retryAfterMs);
              await store.markRetryable(song.id, {
                attemptCount,
                nextAttemptAt: now() + delayMs,
                error,
              });
            } else {
              await store.markRejected(song.id, { attemptCount, error });
            }
            console.error('[Discord releases] webhook rejected announcement', { status: response.status, songId: song.id });
            continue;
          }
          await store.markSent(song.id, { attemptCount });
          announced++;
        } catch (error) {
          // A transport error can happen after Discord accepted the message. Keep its
          // claim to avoid sending a duplicate on the next catalogue sync.
          await store.markUncertain(song.id, { attemptCount, error: error?.message || 'Request failed' });
          console.error('[Discord releases] delivery result uncertain', { songId: song.id, message: error?.message || 'Request failed' });
        }
      }
      return { configured: true, baseline: false, announced };
    },
  };
}
