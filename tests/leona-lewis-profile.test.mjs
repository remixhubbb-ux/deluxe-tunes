import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'main.jsx'), 'utf8');
const artistsBlock = source.match(/const ARTISTS=\[([\s\S]*?)\]\.map\(artist=>/);
assert.ok(artistsBlock, 'the artist directory should be registered');

const leonaProfiles = [...artistsBlock[1].matchAll(/\{[^{}]*artistId:"leona-lewis"[^{}]*\}/g)];
assert.equal(leonaProfiles.length, 1, 'Leona Lewis should appear exactly once in the artist directory');
assert.match(leonaProfiles[0][0], /name:"Leona Lewis"/);
assert.match(leonaProfiles[0][0], /image:"\/images\/artist-leona-lewis\.png"/);
assert.equal(existsSync(join(root, 'public', 'images', 'artist-leona-lewis.png')), true, 'Leona Lewis profile artwork should exist');

console.log('Leona Lewis artist profile and artwork checks passed');
