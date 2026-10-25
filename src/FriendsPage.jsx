import React, {useEffect, useRef, useState} from "react";
import {CheckCircle2, Play, Radio, Settings, ShieldAlert, ShieldCheck, Trash2, UserPlus, UserRound, UsersRound, X} from "lucide-react";
import {API_BASE, resolveApiBase} from "./apiBase.js";
import {resolveAssetUrl} from "./appLogic.js";

const runtimeFriendsApiBases=typeof window!=="undefined"?[
  window.__DT_FRIENDS_API_BASE__,
  window.__DT_API_BASE__,
  window.__DT_OAUTH_BASE__,
  window.__DT_CONFIG__?.apiBaseUrl,
  window.__DT_CONFIG__?.oauthBaseUrl,
]:[];
const FRIENDS_API_BASE=resolveApiBase([
  import.meta.env.VITE_FRIENDS_API_BASE_URL,
  import.meta.env.VITE_API_BASE_URL,
  ...runtimeFriendsApiBases,
  API_BASE,
]);
const assetUrl=value=>resolveAssetUrl(value,typeof window!=="undefined"?window.location.href:"");

export async function friendsApi(path,options={}){
  let response;
  try{
    response=await fetch(`${FRIENDS_API_BASE}${path}`,{
      method:options.method||"GET",
      credentials:"include",
      cache:"no-store",
      headers:options.body?{"Content-Type":"application/json"}:undefined,
      body:options.body?JSON.stringify(options.body):undefined,
      signal:options.signal,
    });
  }catch(fetchError){
    if(fetchError.name==="AbortError")throw fetchError;
    const frontendOrigin=typeof window!=="undefined"?window.location.origin:"this app";
    const error=new Error(`Could not reach the Friends API at ${FRIENDS_API_BASE} from ${frontendOrigin}. Check your connection and confirm this exact frontend origin is allowed by the API. If the API is reachable but sign-in is not remembered, check browser cookie support and site-data settings.`);
    error.code="FRIENDS_API_UNREACHABLE";
    throw error;
  }
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    const missingFriendsRoute=response.status===404&&payload?.error==="Not found";
    const message=missingFriendsRoute
      ? `The server at ${FRIENDS_API_BASE} returned 404 for ${path}; its Friends routes are not deployed at this URL. Verify the configured API base and deploy the current Node.js Friends backend.`
      : payload?.error||`Friends API at ${FRIENDS_API_BASE} returned HTTP ${response.status}.`;
    const error=new Error(message);
    error.status=response.status;
    throw error;
  }
  if(!payload||typeof payload!=="object"){
    throw new Error(`The Friends API at ${FRIENDS_API_BASE} returned an invalid response. Confirm that the frontend points to the Node.js API, not the static site.`);
  }
  return payload;
}


export default function FriendsPage({
  user: authenticatedUser,
  authReady: appAuthReady,
  onAuthenticated,
  onUserUpdated,
  songs,
  play,
  currentSong,
  playing,
  currentStreak,
}){
const [user,setUser]=useState(authenticatedUser || null);
const [authReady,setAuthReady]=useState(Boolean(appAuthReady));
  const [tab,setTab]=useState("friends");
  const [friends,setFriends]=useState([]);
  const [requests,setRequests]=useState([]);
  const [blocks,setBlocks]=useState([]);
  const [query,setQuery]=useState("");
  const [searchResults,setSearchResults]=useState([]);
  const [searchAttempted,setSearchAttempted]=useState(false);
  const [selectedProfile,setSelectedProfile]=useState(null);
  const [profileSettingsOpen,setProfileSettingsOpen]=useState(false);
  const guestProvisionRequest=useRef(null);
  const [guestProvisioning,setGuestProvisioning]=useState(false);
  const [guestProvisionError,setGuestProvisionError]=useState("");
  const [guestRetryCount,setGuestRetryCount]=useState(0);
  const [profileDraft,setProfileDraft]=useState({username:"",displayName:"",bio:"",shareListening:false,shareStreak:false,shareOnlineStatus:false});
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  useEffect(()=>{
    setUser(authenticatedUser || null);
  },[authenticatedUser]);

  useEffect(()=>{
    setAuthReady(Boolean(appAuthReady));
  },[appAuthReady]);

  function handleRequestError(requestError){
    if(requestError.status===401){
      guestProvisionRequest.current=null;
      setUser(null);
      return true;
    }
    return false;
  }

  function handleUserUpdated(nextUser){
    setUser(nextUser);
    if(onUserUpdated)onUserUpdated(nextUser);
  }
  function handleAuthenticatedUser(nextUser){
    setUser(nextUser);
    if(onUserUpdated)onUserUpdated(nextUser);
    if(onAuthenticated)onAuthenticated(nextUser);
  }
  useEffect(()=>{
    if(!appAuthReady||user?.id)return undefined;
    let active=true;
    if(!guestProvisionRequest.current){
      guestProvisionRequest.current=friendsApi("/api/auth/guest",{method:"POST"});
    }
    const request=guestProvisionRequest.current;
    setGuestProvisioning(true);
    setGuestProvisionError("");
    request.then(result=>{
      if(active)handleAuthenticatedUser(result.user);
    }).catch(provisionError=>{
      guestProvisionRequest.current=null;
      if(!active)return;
      if(provisionError.code==="FRIENDS_API_UNREACHABLE"){
        setGuestProvisionError("Friends couldn't be reached. Check your connection and try again.");
      }else if(provisionError.status===401||provisionError.status===404){
        setGuestProvisionError("The Friends server needs an update before guest profiles can connect.");
      }else if(provisionError.status===503){
        setGuestProvisionError("Friends is temporarily unavailable. Please try again later.");
      }else if(provisionError.status===429){
        setGuestProvisionError("Too many profile attempts. Please wait a little and try again.");
      }else{
        setGuestProvisionError("Couldn't create your Friends profile. Please try again.");
      }
    }).finally(()=>{
      if(active)setGuestProvisioning(false);
    });
    return()=>{active=false};
  },[appAuthReady,user?.id,guestRetryCount]);
  useEffect(()=>{
    if(!user?.id)return undefined;
    const sendPresence=()=>{
      friendsApi("/api/friends/presence",{
        method:"POST",
        body:{
          songId:currentSong?.id||null,
          playing:Boolean(playing),
          currentStreak:Number(currentStreak)||0,
        },
      }).catch(presenceError=>{
        if(!handleRequestError(presenceError))console.error("[Friends presence]",presenceError.message);
      });
    };
    sendPresence();
    const interval=setInterval(sendPresence,30_000);
    return()=>clearInterval(interval);
  },[user?.id,currentSong?.id,playing,currentStreak]);

  async function reload(){
    const [friendData,requestData,blockData,profileData]=await Promise.all([
      friendsApi("/api/friends"),
      friendsApi("/api/friends/requests"),
      friendsApi("/api/friends/blocks"),
      friendsApi("/api/friends/profile"),
    ]);
    setFriends(friendData.friends);
    setRequests(requestData.requests);
    setBlocks(blockData.blocks);
    handleUserUpdated(profileData.user);
  }

  useEffect(()=>{
    if(!user?.id)return undefined;
    let active=true;
    setLoading(true);
    setError("");
    Promise.all([
      friendsApi("/api/friends"),
      friendsApi("/api/friends/requests"),
      friendsApi("/api/friends/blocks"),
      friendsApi("/api/friends/profile"),
    ]).then(([friendData,requestData,blockData,profileData])=>{
      if(!active)return;
      setFriends(friendData.friends);
      setRequests(requestData.requests);
      setBlocks(blockData.blocks);
      handleUserUpdated(profileData.user);
      setProfileDraft({
        username:profileData.user.username||"",
        displayName:profileData.user.displayName||"",
        bio:profileData.user.bio||"",
        shareListening:profileData.user.shareListening,
        shareStreak:profileData.user.shareStreak,
        shareOnlineStatus:profileData.user.shareOnlineStatus,
      });
    }).catch(loadError=>{
      if(active&&!handleRequestError(loadError))setError(loadError.message);
    }).finally(()=>{
      if(active)setLoading(false);
    });
    return()=>{active=false};
  },[user?.id]);
  useEffect(()=>{
    if(!user?.id)return undefined;
    let active=true;
    const poll=()=>friendsApi("/api/friends").then(result=>{
      if(active)setFriends(result.friends);
    }).catch(pollError=>{
      if(active&&!handleRequestError(pollError))setError(pollError.message);
    });
    const interval=setInterval(poll,30_000);
    return()=>{active=false;clearInterval(interval)};
  },[user?.id]);

  async function runAction(action,successMessage){
    setBusy(true);
    setError("");
    setMessage("");
    try{
      await action();
      if(successMessage)setMessage(successMessage);
      await reload();
    }catch(actionError){
      if(!handleRequestError(actionError))setError(actionError.message);
    }finally{
      setBusy(false);
    }
  }

  async function searchUsers(event){
    event.preventDefault();
    setSearchAttempted(true);
    setError("");
    setMessage("");
    if(!user?.id){
      setError("Your private Friends profile is still being prepared. Please try again in a moment.");
      return;
    }
    if(!user.username){
      setError("Create your Friends profile before searching for people.");
      return;
    }
    const handle=query.trim().replace(/^@/,"");
    if(!/^[a-z0-9_]{3,20}#[0-9]{4}$/i.test(handle)){
      setError("Enter the full username, including its # and four-digit suffix (for example, Listener#1234).");
      return;
    }
    setBusy(true);
    try{
      const result=await friendsApi(`/api/friends/search?username=${encodeURIComponent(handle)}`);
      setSearchResults(result.users);
      const target=result.users[0];
      if(!target){
        setError("No available account was found for that username. Check the spelling and four-digit suffix.");
      }else if(target.isFriend){
        setMessage(`@${target.username} is already your friend.`);
      }else if(target.requestPending){
        setMessage(`A friend request with @${target.username} is already pending. Check your Requests tab.`);
        setTab("requests");
      }else{
        await friendsApi("/api/friends",{method:"POST",body:{userId:target.id}});
        setSearchResults(results=>results.map(result=>result.id===target.id?{...result,requestPending:true}:result));
        setMessage(`Friend request sent to @${target.username}.`);
        await reload();
      }
    }catch(searchError){
      setSearchResults([]);
      if(!handleRequestError(searchError)){
        setError(searchError.status===404
          ? "No account was found for that username."
          : searchError.status===409
            ? "A friend request is already pending, or you are already friends."
            : searchError.message);
      }
    }finally{
      setBusy(false);
    }
  }

  async function saveProfile(event){
    event.preventDefault();
    await runAction(async()=>{
      const result=await friendsApi("/api/friends/profile",{
        method:"PATCH",
        body:{
          username:profileDraft.username,
          displayName:profileDraft.displayName,
          bio:profileDraft.bio,
          shareListening:profileDraft.shareListening,
          shareStreak:profileDraft.shareStreak,
          shareOnlineStatus:profileDraft.shareOnlineStatus,
        },
      });
      handleUserUpdated(result.user);
      setProfileDraft({
        username:result.user.username,
        displayName:result.user.displayName,
        bio:result.user.bio||"",
        shareListening:result.user.shareListening,
        shareStreak:result.user.shareStreak,
        shareOnlineStatus:result.user.shareOnlineStatus,
      });
    },"Your Friends profile has been saved.");
  }

  async function openProfile(friend){
    setError("");
    try{
      const result=await friendsApi(`/api/friends/profiles/${encodeURIComponent(friend.id)}`);
      setSelectedProfile(result.profile);
    }catch(profileError){
      if(!handleRequestError(profileError))setError(profileError.message);
    }
  }

  async function blockUser(targetId){
    await friendsApi("/api/friends/blocks",{method:"POST",body:{userId:targetId}});
    setSearchResults(results=>results.filter(result=>result.id!==targetId));
    if(selectedProfile?.id===targetId)setSelectedProfile(null);
  }

  function openListeningSong(activity){
    const song=songs.find(item=>item.id===activity?.songId);
    if(!song)return;
    play(song);
    setSelectedProfile(null);
  }

  const incomingCount=requests.filter(request=>request.direction==="incoming").length;
  const profileIncomplete=Boolean(user&&!user.username);
  const onlineCount=friends.filter(friend=>friend.online===true).length;
  const offlineCount=friends.filter(friend=>friend.online===false).length;
  const profileForm=<form className="friendsProfileForm" onSubmit={saveProfile}>
    <div className="friendsProfileFields">
      <label><span>Display name</span><input value={profileDraft.displayName} maxLength={48} onChange={event=>setProfileDraft(value=>({...value,displayName:event.target.value}))} required/></label>
      <label><span>Unique username</span><div className="friendsUsernameInput"><b>@</b><input value={profileDraft.username} maxLength={25} minLength={8} pattern="[A-Za-z0-9_]{3,20}#[0-9]{4}" onChange={event=>setProfileDraft(value=>({...value,username:event.target.value.toLowerCase()}))} placeholder="listener#1234" required/></div><small>Include the four-digit suffix shown on your profile.</small></label>
      <label className="friendsBioField"><span>Short bio</span><textarea value={profileDraft.bio} maxLength={160} onChange={event=>setProfileDraft(value=>({...value,bio:event.target.value}))} placeholder="A little about your music taste"/></label>
    </div>
    <div className="friendsPrivacyOptions">
      <label><input type="checkbox" checked={profileDraft.shareListening} onChange={event=>setProfileDraft(value=>({...value,shareListening:event.target.checked}))}/><span><b>Share listening activity</b><small>Friends can see the song you are playing and its playback status.</small></span></label>
      <label><input type="checkbox" checked={profileDraft.shareStreak} onChange={event=>setProfileDraft(value=>({...value,shareStreak:event.target.checked}))}/><span><b>Share my current streak</b><small>Friends can see your current active streak.</small></span></label>
      <label><input type="checkbox" checked={profileDraft.shareOnlineStatus} onChange={event=>setProfileDraft(value=>({...value,shareOnlineStatus:event.target.checked}))}/><span><b>Share my online status</b><small>Friends can see when you are currently active in Deluxe Tunes.</small></span></label>
    </div>
    <button className="primary" disabled={busy}><CheckCircle2 size={15}/>{busy?"Saving…":profileIncomplete?"Create Friends profile":"Save profile"}</button>
    {profileIncomplete&&<p className="friendsPrivacyNote">Only your chosen display name, username, avatar, and opted-in activity or streak are visible. Your email is never shown.</p>}
  </form>;

  function renderActivity(person){
    if(!person.activity)return null;
    const song=songs.find(item=>item.id===person.activity.songId);
    return <div className="friendsListening">
      {song?.artwork?<img src={assetUrl(song.artwork)} alt=""/>:<span className="friendsListeningIcon"><Radio size={15}/></span>}
      <span><b>{song?.title||"A song in Deluxe Tunes"}</b><small>{song?.artist||"Track unavailable in this library"} · {person.online===null?"Shared listening activity":person.online?(person.activity.playing?"Playing now":"Paused"):"Offline · last heard recently"}</small></span>
      {song&&<button type="button" className="friendsPlaySong" onClick={()=>openListeningSong(person.activity)} aria-label={`Open ${song.title}`}><Play size={14} fill="currentColor"/></button>}
    </div>;
  }

  function renderFriend(friend){
    return <article className="friendsPersonCard" key={friend.id}>
      <button type="button" className="friendsAvatarButton" onClick={()=>openProfile(friend)} aria-label={`View ${friend.displayName}'s profile`}>{friend.avatar?<img src={friend.avatar} alt=""/>:<span>{friend.displayName.slice(0,1).toUpperCase()}</span>}</button>
      <div className="friendsPersonMain">
        <button type="button" className="friendsPersonName" onClick={()=>openProfile(friend)}>{friend.displayName}</button>
        <span className="friendsHandle">@{friend.username} <i className={friend.online===true?"online":""}/> {friend.online===true?"Online":friend.online===false?"Offline":"Status private"}{friend.currentStreak!==null&&<b className="friendsStreak">🔥 {friend.currentStreak} day streak</b>}</span>
        <small className="friendsBio">{friend.bio||"No bio yet"}</small>
        {renderActivity(friend)}
      </div>
      <div className="friendsPersonActions">
        <button type="button" className="ghost friendsIconAction" onClick={()=>openProfile(friend)} aria-label="View profile"><UserRound size={15}/></button>
        <button type="button" className="ghost friendsIconAction" disabled={busy} onClick={()=>runAction(()=>friendsApi(`/api/friends/${friend.id}`,{method:"DELETE"}),"Friend removed.")} aria-label="Remove friend"><Trash2 size={15}/></button>
        <button type="button" className="ghost friendsIconAction" disabled={busy} onClick={()=>runAction(()=>blockUser(friend.id),"User blocked.")} aria-label="Block user"><ShieldAlert size={15}/></button>
      </div>
    </article>;
  }

  return <section className="page friendsPage">
    <div className="pageHeading friendsHeading">
      <div><span className="eyebrow">LISTEN TOGETHER</span><h1>Friends</h1><p>Find people, share what you’re playing, and keep up with your music circle.</p></div>
      {user&&<div className="friendsHeadingIdentity">{user.avatar?<img src={user.avatar} alt=""/>:<span>{user.displayName.slice(0,1).toUpperCase()}</span>}<div><b>{user.displayName}</b><small>@{user.username||"profile setup"}</small></div><button type="button" className="ghost friendsIconAction" onClick={()=>setProfileSettingsOpen(true)} aria-label="Edit profile and privacy"><Settings size={15}/></button></div>}
    </div>

    {error&&<div className="friendsFeedback error" role="alert">{error}</div>}
    {message&&<div className="friendsFeedback success" role="status">{message}</div>}

    <div className="friendsColumns">
      <section className="friendsAddPanel">
        <span className="eyebrow">GROW YOUR CIRCLE</span>
        <h2>Add Friends</h2>
        <p>Enter their unique Deluxe Tunes username to send a request.</p>
        <form className="friendsRequestForm" onSubmit={searchUsers}>
          <label htmlFor="friends-username-search">Friends username</label>
          <input id="friends-username-search" value={query} onChange={event=>{setQuery(event.target.value);setError("");setMessage("");setSearchResults([]);}} placeholder="Username#1234" autoComplete="off" maxLength={25} aria-describedby="friends-handle-help"/>
          <small id="friends-handle-help">Include the four digits after # (for example, Listener#1234).</small>
          <button className="primary friendsSendButton" disabled={busy||!user?.id||profileIncomplete}><UserPlus size={16}/>{busy?"Sending…":"Send Request"}</button>
        </form>
        {!authReady&&<p className="friendsAccessNotice"><span className="friendsLoadingDot"/>Checking your Deluxe Tunes session…</p>}
        {authReady&&!user&&<div className={`friendsAccessNotice${guestProvisionError?" friendsAccessError":""}`} role={guestProvisionError?"alert":"status"}>
          {!guestProvisionError&&<ShieldCheck size={17}/>}
          <span>{guestProvisioning?"Creating your private Friends profile…":guestProvisionError||"Friends will be ready in a moment."}</span>
          {guestProvisionError&&<button type="button" className="friendsTextButton" onClick={()=>setGuestRetryCount(count=>count+1)}>Try again</button>}
        </div>}
        {profileIncomplete&&<div className="friendsAccessNotice"><UserRound size={17}/><span>Finish your Friends profile before sending requests.</span><button type="button" className="friendsTextButton" onClick={()=>setProfileSettingsOpen(true)}>Set up profile</button></div>}
        {searchResults.map(result=><article className="friendsSearchResult" key={result.id}>
          <div className="friendsAvatar">{result.avatar?<img src={result.avatar} alt=""/>:<span>{result.displayName.slice(0,1).toUpperCase()}</span>}</div>
          <div className="friendsPersonMain"><b>{result.displayName}</b><span className="friendsHandle">@{result.username}</span><small>{result.bio||"No bio yet"}</small></div>
          {result.isFriend?<span className="friendsOwnedState"><CheckCircle2 size={14}/>Friends</span>:result.requestPending?<span className="friendsPendingState">Request pending</span>:null}
        </article>)}
      </section>

      <section className="friendsDirectory">
        <header className="friendsDirectoryHeader">
          <div><h2>Friends</h2><span>{friends.length} {friends.length===1?"friend":"friends"}</span></div>
          <div className="friendsCounts"><span className="online"><i/>{onlineCount} online</span><span><i/>{offlineCount} offline</span></div>
        </header>
        <div className="friendsTabs" role="tablist" aria-label="Friends list sections">
          <button type="button" role="tab" aria-selected={tab==="friends"} className={tab==="friends"?"active":""} onClick={()=>setTab("friends")}>Friends <span>{friends.length}</span></button>
          <button type="button" role="tab" aria-selected={tab==="requests"} className={tab==="requests"?"active":""} onClick={()=>setTab("requests")}>Requests {incomingCount>0&&<span className="friendsRequestBadge">{incomingCount}</span>}</button>
          <button type="button" role="tab" aria-selected={tab==="blocked"} className={tab==="blocked"?"active":""} onClick={()=>setTab("blocked")}>Blocked <span>{blocks.length}</span></button>
        </div>
        {tab==="friends"&&<div className="friendsDirectoryList">
          {loading?<div className="friendsEmpty"><span className="friendsLoadingDot"/>Loading your friends…</div>:!user?.id?<div className="friendsEmpty"><UsersRound size={24}/><b>Preparing your Friends profile</b><span>Your private guest profile is created automatically—no sign-in needed.</span></div>:friends.length?friends.map(renderFriend):<div className="friendsEmpty"><UsersRound size={25}/><b>Your circle starts here</b><span>You don’t have any friends yet. Search for someone by their username to send a request.</span></div>}
        </div>}
        {tab==="requests"&&<div className="friendsDirectoryList">
          {loading?<div className="friendsEmpty">Loading friend requests…</div>:requests.length?requests.map(request=><article className="friendsRequestCard" key={request.id}>
            <div className="friendsAvatar">{request.user.avatar?<img src={request.user.avatar} alt=""/>:<span>{request.user.displayName.slice(0,1).toUpperCase()}</span>}</div>
            <div className="friendsPersonMain"><b>{request.user.displayName}</b><span className="friendsHandle">@{request.user.username} · {request.direction==="incoming"?"Incoming request":"Request sent"}</span><small>{request.user.bio||"No bio yet"}</small></div>
            {request.direction==="incoming"?<div className="friendsRequestActions"><button type="button" className="primary small" disabled={busy} onClick={()=>runAction(()=>friendsApi("/api/friends/requests",{method:"POST",body:{requestId:request.id,action:"accept"}}),"Friend request accepted.")}><CheckCircle2 size={14}/>Accept</button><button type="button" className="ghost small" disabled={busy} onClick={()=>runAction(()=>friendsApi("/api/friends/requests",{method:"POST",body:{requestId:request.id,action:"decline"}}),"Request declined.")}>Decline</button><button type="button" className="friendsBlockText" disabled={busy} onClick={()=>runAction(()=>blockUser(request.user.id),"User blocked.")}>Block</button></div>:<div className="friendsRequestActions"><button type="button" className="ghost small" disabled={busy} onClick={()=>runAction(()=>friendsApi("/api/friends/requests",{method:"POST",body:{requestId:request.id,action:"cancel"}}),"Request cancelled.")}>Cancel request</button><button type="button" className="friendsBlockText" disabled={busy} onClick={()=>runAction(()=>blockUser(request.user.id),"User blocked.")}>Block</button></div>}
          </article>):<div className="friendsEmpty"><UsersRound size={24}/><b>No pending requests</b><span>Incoming and outgoing friend requests will appear here.</span></div>}
        </div>}
        {tab==="blocked"&&<div className="friendsDirectoryList">
          {blocks.length?blocks.map(blocked=><article className="friendsRequestCard" key={blocked.id}><div className="friendsAvatar">{blocked.avatar?<img src={blocked.avatar} alt=""/>:<span>{blocked.displayName.slice(0,1).toUpperCase()}</span>}</div><div className="friendsPersonMain"><b>{blocked.displayName}</b><span className="friendsHandle">@{blocked.username}</span></div><button type="button" className="ghost small" disabled={busy} onClick={()=>runAction(()=>friendsApi(`/api/friends/blocks/${blocked.id}`,{method:"DELETE"}),"User unblocked.")}>Unblock</button></article>):<div className="friendsEmpty"><ShieldCheck size={23}/><b>No blocked users</b><span>People you block will appear here.</span></div>}
        </div>}
      </section>
    </div>

    {profileSettingsOpen&&<div className="friendsModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setProfileSettingsOpen(false)}}>
      <section className="friendsProfileModal friendsSettingsModal" role="dialog" aria-modal="true" aria-labelledby="friends-settings-title">
        <button type="button" className="friendsModalClose" onClick={()=>setProfileSettingsOpen(false)} aria-label="Close profile settings"><X size={18}/></button>
        <span className="eyebrow">YOUR PROFILE & PRIVACY</span><h2 id="friends-settings-title">{profileIncomplete?"Set up your profile":"Profile and privacy"}</h2>
        {user&&profileForm}
      </section>
    </div>}
    {selectedProfile&&<div className="friendsModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedProfile(null)}}>
      <section className="friendsProfileModal" role="dialog" aria-modal="true" aria-labelledby="friend-profile-name">
        <button type="button" className="friendsModalClose" onClick={()=>setSelectedProfile(null)} aria-label="Close profile"><X size={18}/></button>
        <div className="friendsModalAvatar">{selectedProfile.avatar?<img src={selectedProfile.avatar} alt=""/>:<span>{selectedProfile.displayName.slice(0,1).toUpperCase()}</span>}</div>
        <span className="eyebrow">FRIEND PROFILE</span><h2 id="friend-profile-name">{selectedProfile.displayName}</h2><p>@{selectedProfile.username}</p>
        <p className="friendsProfileBio">{selectedProfile.bio||"No bio yet"}</p>
        {selectedProfile.online!==null&&<span className={`friendsProfileStatus ${selectedProfile.online?"online":""}`}><i/>{selectedProfile.online?"Online":"Offline"}</span>}
        {selectedProfile.currentStreak!==null&&<div className="friendsProfileStat"><span>Current streak</span><b>🔥 {selectedProfile.currentStreak} days</b></div>}
        {renderActivity(selectedProfile)||<div className="friendsProfileActivity"><Radio size={16}/><span>Listening activity is unavailable or not shared.</span></div>}
        {selectedProfile.activity&&<div className="friendsProfileActions"><button type="button" className="ghost small" onClick={()=>{const song=songs.find(item=>item.id===selectedProfile.activity.songId);if(song)openListeningSong(selectedProfile.activity)}} disabled={!songs.some(item=>item.id===selectedProfile.activity.songId)}><Play size={14}/>Open song</button><button type="button" className="friendsBlockText" onClick={()=>runAction(()=>blockUser(selectedProfile.id),"User blocked.")}>Block user</button></div>}
      </section>
    </div>}
  </section>;
}
