import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'main.jsx'), 'utf8');
const songId = 'you-are-the-reason-duet-leona-lewis-calum-scott';
const songs = parseBundledSongCatalog(source).filter(song => song.id === songId);

assert.equal(songs.length, 1, 'the duet should be registered exactly once in DEMOS');
assert.deepEqual(songs[0], {
  id: songId,
  title: 'You Are the Reason (Duet Version)',
  artist: 'Leona Lewis x Calum Scott',
  artwork: '/images/you-are-the-reason-duet-leona-lewis-calum-scott.png',
});
assert.match(source, new RegExp(`id:"${songId}"[^\\n]*album:""[^\\n]*plays:336448124`), 'the duet should be in Leona Lewis’s songs with the supplied play count');
assert.match(source, /file:"\/audio\/You Are The Reason - Duet Version - leona lewis, calum scott\.mp3"/);
assert.equal(existsSync(join(root, 'public', 'audio', 'You Are The Reason - Duet Version - leona lewis, calum scott.mp3')), true, 'the duet MP3 should exist');
assert.equal(existsSync(join(root, 'public', 'images', 'you-are-the-reason-duet-leona-lewis-calum-scott.png')), true, 'the duet cover should exist');

const lyricsStart = source.indexOf(`LYRICS["${songId}"] = [`);
assert.notEqual(lyricsStart, -1, 'the duet should have synced lyrics registered');
const lyricsEnd = source.indexOf('\n];', lyricsStart);
assert.notEqual(lyricsEnd, -1, 'the duet lyric array should close');
const lyricsBlock = source.slice(lyricsStart, lyricsEnd);
const rows = [...lyricsBlock.matchAll(/\[(\d+\.\d+),"([^"]*)"\]/g)];
assert.equal(rows.length, 43, 'all supplied lyric timestamps, including the pause, should be included');
assert.equal(rows[0][1], '3.66', 'the first supplied timestamp should be preserved');
assert.equal(rows.at(-1)[1], '179.19', 'the final supplied timestamp should be preserved');
const times = rows.map(([, timestamp]) => Number(timestamp));
assert.deepEqual(times, [...times].sort((a, b) => a - b), 'duet lyrics should be in timestamp order');
assert.match(lyricsBlock, /There goes my heart beating/);
assert.match(lyricsBlock, /I don't wanna hide no more/);
assert.match(lyricsBlock, /That you are the reason/);

console.log('You Are the Reason duet catalogue, assets, plays, and synced lyrics checks passed');
