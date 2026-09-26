import assert from 'node:assert/strict';
import { calculateTasteProfile, canDownloadFromOrigin, isRemoteAuthAvailable, normalizePlaylistName, resolveAssetUrl } from '../src/appLogic.js';

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
assert.ok(profile.length >= 4, 'taste profile should include multiple genres');
assert.equal(profile[0].genre, 'Pop', 'largest play-weighted genre should be Pop');
assert.ok(profile[0].share > 40, 'Pop should be the largest share based on actual play activity');
assert.ok(Math.abs(profile.reduce((sum, item) => sum + item.share, 0) - 100) < 0.01, 'shares should sum to 100%');

const freshProfile = calculateTasteProfile([
  { id: 'pop-1', genre: 'Pop', plays: 400000 },
  { id: 'hiphop-1', genre: 'Hip Hop', plays: 500000 },
], {}, {});
assert.ok(freshProfile.length >= 2, 'fresh profiles should still include genres');
assert.ok(freshProfile.every((item) => item.share === 0), 'new installs should start with neutral 0% Taste DNA until listening builds up');

assert.equal(canDownloadFromOrigin('/audio/test.mp3', true, 'file:'), true, 'desktop builds should permit downloads when the PC has internet access');
assert.equal(canDownloadFromOrigin('/audio/test.mp3', false, 'file:'), true, 'bundled local app music should remain available even when the device reports offline');
assert.equal(canDownloadFromOrigin('https://example.com/song.mp3', false, 'https:'), false, 'remote downloads should still be blocked when the network is genuinely unavailable');
assert.equal(isRemoteAuthAvailable('file://'), false, 'file-mode apps should not try remote auth');
assert.equal(normalizePlaylistName('  Night Drive  '), 'Night Drive', 'playlist names should be cleaned up');
assert.equal(resolveAssetUrl('/images/logo.png', 'file:///android_asset/public/index.html'), 'file:///android_asset/public/images/logo.png', 'file-mode app loads should resolve bundled assets relative to the app root');
assert.equal(resolveAssetUrl('/images/logo.png', 'http://localhost:5173/'), '/images/logo.png', 'web builds should keep root-relative asset URLs for regular hosting');

console.log('app fixes regression checks passed');
