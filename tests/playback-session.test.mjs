import assert from 'node:assert/strict';
import {
  getArtistPlaybackSequence,
  getNextArtistSong,
  getNextCatalogSong,
  getPreviousArtistSong,
  normalizePlaybackResumeState,
  removeOneQueuedSong
} from '../src/appLogic.js';

const songs = [
  { id: 'one', title: 'One', file: '/audio/one.mp3' },
  { id: 'two', title: 'Two', file: '/audio/two.mp3' },
  { id: 'three', title: 'Three', file: '/audio/three.mp3' },
  { id: 'four', title: 'Four', file: '/audio/four.mp3' }
];

const session = getArtistPlaybackSequence(songs);
assert.deepEqual(session.map(song => song.id), ['one', 'two', 'three', 'four']);
assert.equal(getNextArtistSong(session, 0)?.id, 'two');
assert.equal(getNextArtistSong(session, 3), null);
assert.equal(getPreviousArtistSong(session, 2)?.id, 'two');
assert.equal(getPreviousArtistSong(session, 0), null);
assert.equal(getNextCatalogSong(songs, 'one')?.id, 'two');
assert.equal(getNextCatalogSong(songs, 'four')?.id, 'one', 'normal playback should wrap to the first playable catalogue song');
assert.equal(getNextCatalogSong([{ id: 'missing', file: '' }], 'missing'), null);
assert.equal(getNextCatalogSong(songs, 'one', false, new Set(['two']))?.id, 'three');

const queue = [
  { id: 'one', title: 'One' },
  { id: 'one', title: 'One duplicate' },
  { id: 'two', title: 'Two' }
];
const removed = removeOneQueuedSong(queue, 'one');
assert.deepEqual(removed.map(song => song.title), ['One duplicate', 'Two']);
assert.deepEqual(removeOneQueuedSong(queue, 'missing'), queue);
assert.deepEqual(getArtistPlaybackSequence([
  { id: 'missing', title: 'Missing' },
  { id: 'playable', title: 'Playable', file: '/audio/playable.mp3' }
]).map(song => song.id), ['playable']);

const artistOnly = getArtistPlaybackSequence([
  { id: 'artist-one', title: 'Artist One', file: '/audio/artist-one.mp3' },
  { id: 'artist-two', title: 'Artist Two', file: '/audio/artist-two.mp3' }
]);
assert.deepEqual(artistOnly.map(song => song.id), ['artist-one', 'artist-two']);
assert.deepEqual(queue.map(song => song.id), ['one', 'one', 'two']);

const manualQueue = [
  { id: 'manual-one', title: 'Manual One', file: '/audio/manual-one.mp3' },
  { id: 'manual-two', title: 'Manual Two', file: '/audio/manual-two.mp3' }
];
assert.deepEqual(removeOneQueuedSong(manualQueue, 'manual-one'), [manualQueue[1]]);
assert.deepEqual(removeOneQueuedSong(manualQueue, 'manual-one'), [manualQueue[1]]);
assert.deepEqual(getNextArtistSong(artistOnly, 1), null);
assert.deepEqual(getPreviousArtistSong(artistOnly, 1), artistOnly[0]);

const validResume = normalizePlaybackResumeState({
  songId: 'one',
  position: 154,
  duration: 260,
  source: 'queue',
  sessionIndex: 1,
  updatedAt: 123
});
assert.deepEqual(validResume, {
  songId: 'one',
  position: 154,
  duration: 260,
  source: 'queue',
  sessionIndex: 1,
  updatedAt: 123
});
assert.equal(normalizePlaybackResumeState({ songId: 'one', position: 999, duration: 260, updatedAt: 1 }).position, 260);
assert.equal(normalizePlaybackResumeState({ songId: 'one', position: -1, duration: 260, updatedAt: 1 }), null);
assert.equal(normalizePlaybackResumeState({ songId: '', position: 10, duration: 260, updatedAt: 1 }), null);
assert.equal(normalizePlaybackResumeState({ songId: 'one', position: Infinity, duration: 260, updatedAt: 1 }), null);

console.log('playback session regression checks passed');
