import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'main.jsx'), 'utf8');
const songId = 'run-leona-lewis';
const songs = parseBundledSongCatalog(source).filter(song => song.id === songId);

assert.equal(songs.length, 1, 'Run should be registered exactly once in DEMOS');
assert.deepEqual(songs[0], {
  id: songId,
  title: 'Run',
  artist: 'Leona Lewis',
  artwork: '/images/run-leona-lewis.png',
});
assert.match(source, /file:"\/audio\/Run - leona lewis\.mp3"/, 'Run should reference its bundled MP3');
assert.equal(existsSync(join(root, 'public', 'audio', 'Run - leona lewis.mp3')), true, 'the referenced MP3 should exist');
assert.equal(existsSync(join(root, 'public', 'images', 'run-leona-lewis.png')), true, 'the referenced cover artwork should exist');
assert.match(source, /id:"run-leona-lewis",title:"Run",artist:"Leona Lewis",album:""/, 'Run should be an artist song, not assigned to a release album');
assert.match(source, /id:"run-leona-lewis"[^\n]*plays:145327397/, 'Run should use the supplied play count');
assert.doesNotMatch(source, /id:"run-leona-lewis-single"/, 'Run should not have a separate single release entry');
assert.match(source, /artistId:"leona-lewis"[^\n]*songId:"run-leona-lewis"/, 'Leona Lewis artist profile should feature Run');

const lyricsStart = source.indexOf(`LYRICS["${songId}"] = [`);
assert.notEqual(lyricsStart, -1, 'Run should have synced lyrics registered');
const lyricsEnd = source.indexOf('\n];', lyricsStart);
assert.notEqual(lyricsEnd, -1, 'Run lyrics should form a closed array');
const lyricsBlock = source.slice(lyricsStart, lyricsEnd);
const lyricRows = [...lyricsBlock.matchAll(/\[(\d+\.\d+),"([^"]*)"\]/g)];
assert.equal(lyricRows.length, 44, 'all supplied lyric timestamps, including pauses, should be preserved');
assert.equal(lyricRows[0][1], '12.44', 'the first supplied timestamp should be preserved');
assert.equal(lyricRows.at(-1)[1], '270.23', 'the final supplied timestamp should be preserved');
assert.match(lyricsBlock, /Light up, light up/);
assert.match(lyricsBlock, /I'll be right beside you, dear/);

console.log('Run by Leona Lewis catalogue, assets, profile, and synced lyrics checks passed');
