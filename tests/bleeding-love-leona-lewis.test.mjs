import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'main.jsx'), 'utf8');
const songId = 'bleeding-love-leona-lewis';
const matches = parseBundledSongCatalog(source).filter(song => song.id === songId);

assert.equal(matches.length, 1, 'Bleeding Love should be registered exactly once in DEMOS');
assert.deepEqual(matches[0], {
  id: songId,
  title: 'Bleeding Love',
  artist: 'Leona Lewis',
  artwork: '/images/bleeding-love-leona-lewis.png',
});
assert.match(source, /id:"bleeding-love-leona-lewis",title:"Bleeding Love",artist:"Leona Lewis",album:""[^\n]*plays:1199105814/, 'Bleeding Love should appear in Leona Lewis’s songs with the supplied play count');
assert.match(source, /file:"\/audio\/Bleeding Love - leona lewis\.mp3"/);
assert.equal(existsSync(join(root, 'public', 'audio', 'Bleeding Love - leona lewis.mp3')), true, 'the referenced MP3 should exist');
assert.equal(existsSync(join(root, 'public', 'images', 'bleeding-love-leona-lewis.png')), true, 'the cover artwork should exist');

const lyricsStart = source.indexOf(`LYRICS["${songId}"] = [`);
assert.notEqual(lyricsStart, -1, 'Bleeding Love should have synced lyrics registered');
const lyricsEnd = source.indexOf('\n];', lyricsStart);
assert.notEqual(lyricsEnd, -1, 'Bleeding Love lyrics should form a closed array');
const lyricsBlock = source.slice(lyricsStart, lyricsEnd);
const lyricRows = [...lyricsBlock.matchAll(/\[(\d+\.\d+),"([^"]*)"\]/g)];
assert.ok(lyricRows.length >= 60, 'the supplied song lyrics should be registered throughout the track');
assert.equal(lyricRows[0][1], '19.16', 'the first supplied timestamp should be preserved');
assert.equal(lyricRows.at(-1)[1], '247.12', 'the final supplied timestamp should be preserved');
const timestamps = lyricRows.map(([, time]) => Number(time));
assert.deepEqual(timestamps, [...timestamps].sort((a, b) => a - b), 'lyrics should be in timestamp order for synchronized playback');
assert.match(lyricsBlock, /Closed off from love, I didn't need the pain/);
assert.match(lyricsBlock, /Keep, keep bleeding love/);
assert.match(lyricsBlock, /I'll be wearing these scars for everyone to see/);

console.log('Bleeding Love catalogue, assets, play count, and synced lyrics checks passed');
