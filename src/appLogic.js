const ALLOWED_ALBUM_TITLES = new Set([
  'formula oneda',
  'wildchild',
  "you'll be alright, kid",
  'overcome',
  'visitor',
  'visitor (deluxe)'
]);

export function isVisibleAlbum(title) {
  return ALLOWED_ALBUM_TITLES.has(String(title || '').trim().toLowerCase());
}

export function filterVisibleAlbums(albums = []) {
  return albums.filter(album => isVisibleAlbum(album?.title));
}

export function getArtistPlaybackSequence(songs = []) {
  return songs.filter(song => Boolean(song?.file || song?.url));
}

export function getNextArtistSong(songs = [], currentIndex = -1) {
  return songs[currentIndex + 1] || null;
}

export function getPreviousArtistSong(songs = [], currentIndex = -1) {
  return songs[currentIndex - 1] || null;
}

export function getNextCatalogSong(songs = [], currentSongId, shuffle = false, excludedSongIds = new Set()) {
  const playableSongs = songs.filter(song => Boolean(song?.file || song?.url) && !excludedSongIds.has(song.id));
  if (!playableSongs.length) return null;
  if (shuffle) return playableSongs[Math.floor(Math.random() * playableSongs.length)];
  const currentIndex = playableSongs.findIndex(song => song.id === currentSongId);
  return playableSongs[(currentIndex + 1) % playableSongs.length];
}

export function removeOneQueuedSong(queue = [], songId) {
  const index = queue.findIndex(song => song?.id === songId);
  if (index < 0) return [...queue];
  return queue.filter((song, itemIndex) => itemIndex !== index);
}

export function normalizePlaybackResumeState(state = {}) {
  const songId = String(state?.songId || '').trim();
  const duration = Number(state?.duration);
  const position = Number(state?.position);
  const source = String(state?.source || 'queue');
  const sessionIndex = Number(state?.sessionIndex);
  const updatedAt = Number(state?.updatedAt);

  if(!songId || !Number.isFinite(duration) || duration < 0 || !Number.isFinite(position) || position < 0) return null;
  if(!['queue','artist','sequence'].includes(source)) return null;
  if(!Number.isFinite(updatedAt) || updatedAt < 0) return null;

  const safeDuration = Math.floor(duration);
  const safePosition = Math.min(Math.floor(position), safeDuration);
  const normalized = { songId, position: safePosition, duration: safeDuration, source, updatedAt: Math.floor(updatedAt) };

  if(Number.isInteger(sessionIndex) && sessionIndex >= 0) normalized.sessionIndex = sessionIndex;
  if(Array.isArray(state?.sessionSongIds)) {
    const sessionSongIds = state.sessionSongIds.filter(id => typeof id === 'string' && id.trim());
    if(sessionSongIds.length) normalized.sessionSongIds = sessionSongIds;
  }

  return normalized;
}

export function getEffectivePlayCount(song = {}, stats = {}, livePlays = {}) {
  return Number(song?.plays || 0) + Number(stats?.[song?.id]?.plays || 0) + Number(livePlays?.[song?.id] || 0);
}

export function getUserPlayCount(song = {}, stats = {}) {
  const count = Number(stats?.[song?.id]?.plays || 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

export function buildArtistSearchCatalog(artists = [], songs = []) {
  const entries = new Map();
  const normalizeName = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const addArtist = (name, extra = {}) => {
    const cleaned = normalizeName(name);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!entries.has(key)) {
      entries.set(key, {
        artistId: extra.artistId || cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artist',
        name: cleaned,
        meta: extra.meta || cleaned,
        image: extra.image || '',
        songId: extra.songId || null,
        accent: extra.accent || 'cyan',
        verifiedBy: extra.verifiedBy || 'Spotify',
        monthlyListeners: Number(extra.monthlyListeners || 0),
      });
      return;
    }
    const current = entries.get(key);
    if (!current.image && extra.image) current.image = extra.image;
    if (!current.songId && extra.songId) current.songId = extra.songId;
    if (!current.meta && extra.meta) current.meta = extra.meta;
    if (!current.monthlyListeners && extra.monthlyListeners) current.monthlyListeners = Number(extra.monthlyListeners);
  };

  for (const artist of Array.isArray(artists) ? artists : []) {
    addArtist(artist?.name, artist);
    if (artist?.meta) addArtist(artist.meta, artist);
  }

  // Keep the artist search list to the curated core catalogue only. Featured names
  // from collab tracks are intentionally excluded here to match the 16-artist
  // artist roster shown in the app.
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function calculateTasteProfile(songs = [], stats = {}) {
  const totals = {};

  for (const song of songs) {
    const genre = (song?.genre || 'Unknown').trim() || 'Unknown';
    const userWeight = getUserPlayCount(song, stats);
    if (userWeight <= 0) continue;
    totals[genre] = (totals[genre] || 0) + userWeight;
  }

  const total = Object.values(totals).reduce((sum, value) => sum + Number(value || 0), 0) || 1;

  return Object.entries(totals)
    .map(([genre, plays] = []) => ({ genre, plays, share: (Number(plays || 0) / total) * 100 }))
    .sort((a, b) => b.plays - a.plays);
}

export async function isAppOnline(timeoutMs = 2200) {
  if (typeof navigator === 'undefined') return true;

  const isLocalApp = typeof window !== 'undefined' && (
    window.location.protocol === 'file:' ||
    window.location.origin === 'null' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  if (isLocalApp) return true;

  const requestUrl = 'https://www.google.com/generate_204';
  const hasNetwork = navigator.onLine !== false;

  if (!hasNetwork) {
    try {
      await fetch(requestUrl, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    await fetch(requestUrl, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    return true;
  } catch {
    return true;
  }
}

export function isRemoteAuthAvailable(origin = '') {
  const value = String(origin || '').trim();
  if (!value || value === 'null' || value.startsWith('file:')) return false;
  return true;
}

export function normalizePlaylistName(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function resolveAssetUrl(value = '', locationHref = typeof window !== 'undefined' ? window.location.href : '') {
  if (!value || typeof value !== 'string') return value;
  if (!value.startsWith('/')) return value;

  const normalized = value.replace(/^\/+/, '');
  const baseUrl = typeof locationHref === 'string' && locationHref ? locationHref : undefined;

  if (baseUrl) {
    try {
      const base = new URL(baseUrl);
      if (base.protocol === 'file:' || base.origin === 'null') {
        return new URL(normalized, baseUrl).toString();
      }
    } catch {
      // fall through to the web base path for non-standard environments
    }
  }

  const basePath = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/';
  return `${basePath}${normalized}`;
}

export function canDownloadFromOrigin(url = '', online = true, protocol = '') {
  if (!url || typeof url !== 'string') return false;

  const safeUrl = url.trim();
  if (!safeUrl || safeUrl.startsWith('blob:')) return false;

  const isLocalAsset = safeUrl.startsWith('/') || safeUrl.startsWith('./') || safeUrl.startsWith('../') || safeUrl.startsWith('file:');
  const isRemoteAsset = safeUrl.startsWith('http://') || safeUrl.startsWith('https://');

  if (isLocalAsset) return true;
  if (!online) return false;
  return isRemoteAsset;
}

export function canCacheDownloadedAsset(url = '', protocol = '') {
  if (!url || typeof url !== 'string') return false;
  return protocol !== 'file:' && !url.trim().startsWith('file:');
}
