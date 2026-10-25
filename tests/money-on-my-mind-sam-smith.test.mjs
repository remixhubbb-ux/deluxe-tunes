import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src', 'main.jsx'), 'utf8');
const song = parseBundledSongCatalog(source).find(item => item.id === 'money-on-my-mind-sam-smith');

assert.ok(song, 'Money On My Mind should be registered in the DEMOS catalogue');
assert.deepEqual(song, {
  id: 'money-on-my-mind-sam-smith',
  title: 'Money On My Mind',
  artist: 'Sam Smith',
  artwork: '/images/money-on-my-mind-sam-smith.png',
});
assert.match(source, /\{id:"money-on-my-mind-sam-smith"[^}]*length:194\.072381[^}]*plays:443492511\}/);
assert.match(source, /\{artistId:"sam-smith"[^}]*songId:"money-on-my-mind-sam-smith"/);
assert.match(source, /"money-on-my-mind-sam-smith":\s*\[\[0,\s*"You caught us, we're still working on getting lyrics for this one\."\]\]/);
assert.equal(fs.existsSync(path.join(root, 'public', 'audio', 'Money On My Mind - sam smith.mp3')), true, 'the referenced MP3 should exist');
assert.equal(fs.existsSync(path.join(root, 'public', 'images', 'money-on-my-mind-sam-smith.png')), true, 'the referenced artwork should exist');

console.log('Money On My Mind catalogue and media checks passed');
