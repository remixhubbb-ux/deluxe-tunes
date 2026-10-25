import assert from 'node:assert/strict';
import { buildArtistSearchCatalog, calculateTasteProfile, canCacheDownloadedAsset, canDownloadFromOrigin, getUserPlayCount, isRemoteAuthAvailable, normalizePlaylistName, resolveAssetUrl } from '../src/appLogic.js';

const songs = [
  { id: 'pop-1', genre: 'Pop', plays: 240000 },
  { id: 'pop-2', genre: 'Pop', plays: 160000 },
  { id: 'uk-1', genre: 'UK Rap', plays: 120000 },
  { id: 'electro-1', genre: 'Electronic', plays: 60000 },
  { id: 'rap-1', genre: 'Rap', plays: 30000 },
];

const stats = {
  'pop-1': { plays: 20 },
  'uk-1': { plays: 18 },
  'electro-1': { plays: 10 },
  'rap-1': { plays: 5 },
};

const livePlays = {
  'pop-2': 5,
  'uk-1': 3,
};

const profile = calculateTasteProfile(songs, stats, livePlays);
assert.equal(profile.length, 4, 'taste profile should include every genre with real listens');
assert.equal(profile[0].genre, 'Pop', 'largest play-weighted genre should be Pop');
assert.ok(profile[0].share > 35, 'Pop should be the largest share based on recorded play activity');
assert.ok(Math.abs(profile.reduce((sum, item) => sum + item.share, 0) - 100) < 0.01, 'shares should sum to 100%');
assert.equal(getUserPlayCount(songs[0], stats), 20, 'user top-track counts must ignore catalogue popularity');
assert.equal(getUserPlayCount(songs[1], stats), 0, 'live popularity counts must not be treated as the user’s plays');

const freshProfile = calculateTasteProfile([
  { id: 'pop-1', genre: 'Pop', plays: 400000 },
  { id: 'hiphop-1', genre: 'Hip Hop', plays: 500000 },
], {}, {});
assert.deepEqual(freshProfile, [], 'new installs should not show invented Taste DNA before any listening');

assert.equal(canDownloadFromOrigin('/audio/test.mp3', true, 'file:'), true, 'desktop builds should permit downloads when the PC has internet access');
assert.equal(canDownloadFromOrigin('/audio/test.mp3', false, 'file:'), true, 'bundled local app music should remain available even when the device reports offline');
assert.equal(canDownloadFromOrigin('https://example.com/song.mp3', false, 'https:'), false, 'remote downloads should still be blocked when the network is genuinely unavailable');
assert.equal(canCacheDownloadedAsset('/audio/test.mp3', 'file:'), false, 'bundled desktop audio should not be fetched into Cache Storage');
assert.equal(canCacheDownloadedAsset('file:///app/audio/test.mp3', 'file:'), false, 'file-based audio should skip unsupported Cache Storage fetches');
assert.equal(canCacheDownloadedAsset('/audio/test.mp3', 'https:'), true, 'web downloads should continue to be cached for offline playback');
assert.equal(isRemoteAuthAvailable('file://'), false, 'file-mode apps should not try remote auth');
assert.equal(normalizePlaylistName('  Night Drive  '), 'Night Drive', 'playlist names should be cleaned up');
assert.equal(resolveAssetUrl('/images/logo.png', 'file:///android_asset/public/index.html'), 'file:///android_asset/public/images/logo.png', 'file-mode app loads should resolve bundled assets relative to the app root');
assert.equal(resolveAssetUrl('/images/logo.png', 'http://localhost:5173/'), '/images/logo.png', 'web builds should keep root-relative asset URLs for regular hosting');

const artistCatalog = buildArtistSearchCatalog([
  { name: 'Sienna Spiro', artistId: 'sienna-spiro' },
  { name: 'Aitch', artistId: 'aitch' },
  { name: 'AJ Tracey', artistId: 'aj-tracey' },
  { name: 'Dave', artistId: 'dave' },
  { name: 'Ed Sheeran', artistId: 'ed-sheeran' },
  { name: 'Tay Keith', artistId: 'tay-keith' },
  { name: 'Alexandra Burke', artistId: 'alexandra-burke' },
  { name: 'Leona Lewis', artistId: 'leona-lewis' },
  { name: 'Stormzy', artistId: 'stormzy' },
  { name: 'OneDa', artistId: 'oneda' },
  { name: 'Vibe Chemistry', artistId: 'vibe-chemistry' },
  { name: 'Alex Warren', artistId: 'alex-warren' },
  { name: 'Sam Smith', artistId: 'sam-smith', image: '/images/artist-sam-smith.png', accent: 'violet', monthlyListeners: 54200000 },
  { name: 'Chri$tian Gate$', artistId: 'christian-gates' },
  { name: 'D-Block Europe', artistId: 'd-block-europe' },
  { name: 'ArrDee', artistId: 'arrdee' },
  { name: 'Bella Kay', artistId: 'bella-kay' },
], [
  { id: 'perfect-ed-sheeran', artist: 'Ed Sheeran', artwork: '/images/perfect-ed-sheeran.png' },
  { id: 'rain-aitch-aj-tracey', artist: 'Aitch x AJ Tracey ft. Tay Keith', featuredArtists: ['Aitch', 'AJ Tracey', 'Tay Keith'], artwork: '/images/rain-aitch-aj-tracey.png' },
]);
assert.equal(artistCatalog.length, 17, 'the artist search list should include exactly the 17 core artists');
assert.ok(artistCatalog.some(artist => artist.name === 'Sienna Spiro'), 'the curated core artist list should include Sienna Spiro');
assert.ok(artistCatalog.some(artist => artist.name === 'Ed Sheeran'), 'the curated core artist list should include Ed Sheeran');
assert.ok(artistCatalog.some(artist => artist.name === 'Bella Kay'), 'the curated core artist list should include Bella Kay');
assert.deepEqual(
  artistCatalog.find(artist => artist.name === 'Sam Smith'),
  {
    artistId: 'sam-smith',
    name: 'Sam Smith',
    meta: 'Sam Smith',
    image: '/images/artist-sam-smith.png',
    songId: null,
    accent: 'violet',
    verifiedBy: 'Spotify',
    monthlyListeners: 54200000,
  },
  'Sam Smith should appear in artist search with the supplied image and listener count',
);
assert.ok(!artistCatalog.some(artist => artist.name === 'Aitch x AJ Tracey ft. Tay Keith'), 'collab artist strings should not be included in the artist search roster');
assert.ok(!artistCatalog.some(artist => artist.name === 'Ed Sheeran x Other Artist'), 'non-core collab names should not appear in the artist roster');

console.log('app fixes regression checks passed');
