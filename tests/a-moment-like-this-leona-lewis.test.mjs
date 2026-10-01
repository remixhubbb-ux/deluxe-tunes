import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'main.jsx'), 'utf8');
const songId = 'a-moment-like-this-leona-lewis';
const matches = parseBundledSongCatalog(source).filter(song => song.id === songId);

assert.equal(matches.length, 1, 'A Moment Like This should appear exactly once in DEMOS');
assert.deepEqual(matches[0], {
  id: songId,
  title: 'A Moment Like This',
  artist: 'Leona Lewis',
  artwork: '/images/a-moment-like-this-leona-lewis.png',
});
assert.match(source, /id:"a-moment-like-this-leona-lewis"[^\n]*album:""[^\n]*length:257\.36[^\n]*plays:55397940/, 'the song should be listed under Leona Lewis’s songs with the supplied plays and correct length');
assert.match(source, /file:"\/audio\/a moment like this - leona lewis\.mp3"/);
assert.equal(existsSync(join(root, 'public', 'audio', 'a moment like this - leona lewis.mp3')), true, 'the referenced MP3 should exist');
assert.equal(existsSync(join(root, 'public', 'images', 'a-moment-like-this-leona-lewis.png')), true, 'the cover art should exist');

const lyricsStart = source.indexOf(`LYRICS["${songId}"] = [`);
assert.notEqual(lyricsStart, -1, 'synced lyrics should be registered');
const lyricsEnd = source.indexOf('\n];', lyricsStart);
assert.notEqual(lyricsEnd, -1, 'the lyrics array should close');
const lyricsBlock = source.slice(lyricsStart, lyricsEnd);
const rows = [...lyricsBlock.matchAll(/\[(\d+\.\d+),"([^"]*)"\]/g)];
assert.equal(rows.length, 39, 'all supplied lyric timestamps, including pause rows, should be retained');
assert.equal(rows[0][1], '0.04');
assert.equal(rows.at(-1)[1], '243.11');
const timestamps = rows.map(([, time]) => Number(time));
assert.deepEqual(timestamps, [...timestamps].sort((a, b) => a - b), 'lyrics should be in playback timestamp order');
assert.match(lyricsBlock, /What if I told you it was all meant to be/);
assert.match(lyricsBlock, /Some people wait a lifetime for a moment like this/);

console.log('A Moment Like This catalogue, media, play count, and synced lyrics checks passed');
