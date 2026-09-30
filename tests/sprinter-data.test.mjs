import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src', 'main.jsx'), 'utf8');
const sprinter = parseBundledSongCatalog(source).find(song => song.id === 'sprinter-dave-central-cee');

assert.ok(sprinter, 'Sprinter should be registered in the DEMOS catalogue');
assert.deepEqual(sprinter, {
  id: 'sprinter-dave-central-cee',
  title: 'Sprinter',
  artist: 'Dave x Central Cee',
  artwork: '/images/sprinter-central-cee-dave.png',
});
assert.equal(fs.existsSync(path.join(root, 'public', 'audio', 'Sprinter - Central Cee, Dave.mp3')), true, 'the referenced MP3 should exist');
assert.equal(fs.existsSync(path.join(root, 'public', 'images', 'sprinter-central-cee-dave.png')), true, 'the referenced artwork should exist');

const lyricsStart = source.indexOf('LYRICS["sprinter-dave-central-cee"] = [');
assert.notEqual(lyricsStart, -1, 'Sprinter should have synced lyrics registered');
const lyricsEnd = source.indexOf('\n];', lyricsStart);
assert.notEqual(lyricsEnd, -1, 'Sprinter lyrics should have a closed array');
const lyricsBlock = source.slice(lyricsStart, lyricsEnd);
const lyricRows = [...lyricsBlock.matchAll(/\[(\d+\.\d+),"([^"]*)"\]/g)];
assert.ok(lyricRows.length >= 65, 'the provided lyrics should be timestamped throughout the song');
assert.equal(lyricRows[0][1], '7.71', 'the first supplied timestamp should be preserved');
assert.equal(lyricRows.at(-1)[1], '217.90', 'the last supplied timestamp should be preserved');
assert.match(lyricsBlock, /The mandem too inconsiderate/);
assert.match(lyricsBlock, /Dave's inside/);

console.log('Sprinter catalogue, media, and lyrics checks passed');
