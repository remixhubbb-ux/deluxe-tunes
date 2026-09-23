import assert from 'node:assert/strict';
import { normalizeSpotifyMatchText, matchSpotifyTrackToCatalog, extractSpotifyTrackFromEntry } from '../src/spotifyImport.js';

assert.equal(normalizeSpotifyMatchText("Aitch x AJ Tracey ft. Tay Keith"), "aitch x aj tracey tay keith");
assert.equal(normalizeSpotifyMatchText("OneDa feat. Renee Stormz"), "oneda renee stormz");
assert.equal(normalizeSpotifyMatchText("You Stole The Show"), "you stole the show");

const catalogue = [
  { id: 'let-me-in', title: 'Let Me In', artist: 'OneDa', album: 'Formula OneDa' },
  { id: 'major-pay', title: 'Major Pay', artist: 'OneDa, Renee Stormz', album: 'Formula OneDa' },
  { id: 'rain', title: 'Rain', artist: 'Aitch x AJ Tracey', album: 'Rain' },
];

assert.equal(matchSpotifyTrackToCatalog({ title: 'Let Me In', artist: 'OneDa', album: 'Formula OneDa' }, catalogue)?.id, 'let-me-in');
assert.equal(matchSpotifyTrackToCatalog({ title: 'Major Pay', artist: 'OneDa feat. Renee Stormz', album: 'Formula OneDa' }, catalogue)?.id, 'major-pay');
assert.equal(matchSpotifyTrackToCatalog({ title: 'Rain', artist: 'Aitch x AJ Tracey ft. Tay Keith', album: 'Rain' }, catalogue)?.id, 'rain');

const spotifyEntry = {
  added_at: '2026-08-17T15:03:14Z',
  item: {
    id: 'track-123',
    name: 'I Don\'t Want to Miss a Thing',
    type: 'track',
    explicit: false,
    duration_ms: 298760,
    album: { name: 'Armageddon - The Album', images: [{ url: 'https://example.com/album.jpg' }] },
    artists: [{ name: 'Aerosmith' }],
  }
};

const extracted = extractSpotifyTrackFromEntry(spotifyEntry);
assert.equal(extracted?.id, 'track-123');
assert.equal(extracted?.name, 'I Don\'t Want to Miss a Thing');
assert.equal(extracted?.artists?.[0]?.name, 'Aerosmith');

console.log('spotify import tests passed');
