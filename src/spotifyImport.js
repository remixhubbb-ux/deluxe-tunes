function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSpotifyMatchText(value) {
  return readText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:feat\.?|featuring|ft\.?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getArtistNames(track) {
  if (Array.isArray(track?.artists)) {
    return track.artists.map(artist => readText(artist?.name)).filter(Boolean).join(" ");
  }
  return readText(track?.artist || track?.artists);
}

export function extractSpotifyTrackFromEntry(entry) {
  const track = entry?.item || entry?.track || entry;
  return track?.type === "track" || track?.id ? track : null;
}

export function matchSpotifyTrackToCatalog(track, catalogue = []) {
  const title = normalizeSpotifyMatchText(track?.title || track?.name);
  const artist = normalizeSpotifyMatchText(getArtistNames(track));
  const album = normalizeSpotifyMatchText(track?.album || track?.album?.name);
  if (!title || !artist) return null;

  return catalogue.find(song => {
    if (normalizeSpotifyMatchText(song?.title || song?.name) !== title) return false;
    const catalogArtist = normalizeSpotifyMatchText(song?.artist || getArtistNames(song));
    if (!catalogArtist || !artist.includes(catalogArtist)) return false;
    const catalogAlbum = normalizeSpotifyMatchText(song?.album || song?.album?.name);
    return !album || !catalogAlbum || album === catalogAlbum;
  }) || null;
}
