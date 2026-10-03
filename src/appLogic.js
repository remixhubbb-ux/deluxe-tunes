export function getEffectivePlayCount(song = {}, stats = {}, livePlays = {}) {
  return Number(song?.plays || 0) + Number(stats?.[song?.id]?.plays || 0) + Number(livePlays?.[song?.id] || 0);
}

export function getUserPlayCount(song = {}, stats = {}) {
  const count = Number(stats?.[song?.id]?.plays || 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
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
