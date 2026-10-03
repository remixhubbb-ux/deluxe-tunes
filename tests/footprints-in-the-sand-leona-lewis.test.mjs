import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'main.jsx'), 'utf8');
const songId = 'footprints-in-the-sand-leona-lewis';
const songs = parseBundledSongCatalog(source).filter(song => song.id === songId);

assert.equal(songs.length, 1, 'Footprints in the Sand should be registered exactly once in DEMOS');
assert.deepEqual(songs[0], {
  id: songId,
  title: 'Footprints in the Sand',
  artist: 'Leona Lewis',
  artwork: '/images/footprints-in-the-sand-leona-lewis.png',
});
assert.match(source, /file:"\/audio\/footprints in the sand - leona lewis\.mp3"/, 'Footprints in the Sand should reference its bundled MP3');
assert.equal(existsSync(join(root, 'public', 'audio', 'footprints in the sand - leona lewis.mp3')), true, 'the referenced MP3 should exist');
assert.equal(existsSync(join(root, 'public', 'images', 'footprints-in-the-sand-leona-lewis.png')), true, 'the referenced cover artwork should exist');
assert.match(source, /id:"footprints-in-the-sand-leona-lewis",title:"Footprints in the Sand",artist:"Leona Lewis",album:""/, 'Footprints in the Sand should be an artist song, not assigned to a release album');
assert.match(source, /id:"footprints-in-the-sand-leona-lewis"[^\n]*plays:\d+/, 'Footprints in the Sand should include a play count');
assert.match(source, /artistId:"leona-lewis"[^\n]*songId:"footprints-in-the-sand-leona-lewis"/, 'Leona Lewis artist profile should feature Footprints in the Sand');

const lyricsStart = source.indexOf(`LYRICS["${songId}"] = [`);
assert.notEqual(lyricsStart, -1, 'Footprints in the Sand should have synced lyrics registered');
const lyricsEnd = source.indexOf('\n];', lyricsStart);
assert.notEqual(lyricsEnd, -1, 'Footprints in the Sand lyrics should form a closed array');
const lyricsBlock = source.slice(lyricsStart, lyricsEnd);
assert.match(lyricsBlock, /\[\d+\.\d+,"[^"]+"\]/, 'The lyric entry should include at least one timestamped text row');

console.log('Footprints in the Sand catalogue, media, profile, and synced lyrics checks passed');
