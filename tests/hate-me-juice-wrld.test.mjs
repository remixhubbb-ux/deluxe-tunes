import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'main.jsx'), 'utf8');
const songId = 'hate-me-ellie-goulding-juice-wrld';
const matches = parseBundledSongCatalog(source).filter(song => song.id === songId);

assert.equal(matches.length, 1, 'Hate Me should be registered exactly once in DEMOS');
assert.deepEqual(matches[0], {
  id: songId,
  title: 'Hate Me',
  artist: 'Ellie Goulding x Juice WRLD',
  artwork: '/images/hate-me-juice-wrld-ellie-goulding.png',
});
assert.equal(existsSync(join(root, 'public', 'audio', 'Hate Me - Ellie Goulding, Juice WRLD.mp3')), true, 'the referenced MP3 should exist');
assert.equal(existsSync(join(root, 'public', 'images', 'hate-me-juice-wrld-ellie-goulding.png')), true, 'the referenced artwork should exist');

const lyricsStart = source.indexOf(`LYRICS["${songId}"] = [`);
assert.notEqual(lyricsStart, -1, 'synced lyrics should be registered for Hate Me');
const lyricsEnd = source.indexOf('\n];', lyricsStart);
assert.notEqual(lyricsEnd, -1, 'Hate Me lyrics should form a closed array');
const lyricRows = [...source.slice(lyricsStart, lyricsEnd).matchAll(/\[(\d+\.\d+),"([^"]*)"\]/g)];
assert.ok(lyricRows.length >= 50, 'the supplied lyrics should be timestamped throughout the track');
assert.equal(lyricRows[0][1], '0.17', 'the initial lyric timestamp should be preserved');
assert.equal(lyricRows.at(-1)[1], '177.63', 'the final lyric timestamp should be preserved');
assert.match(source.slice(lyricsStart, lyricsEnd), /Hate me, hate me, still tryna replace me/);

console.log('Hate Me catalogue, assets, and synced lyrics checks passed');
