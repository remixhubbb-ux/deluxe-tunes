import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBundledSongCatalog } from '../releaseAnnouncements.mjs';

const source = readFileSync(join(process.cwd(), 'src', 'main.jsx'), 'utf8');
const catalogue = parseBundledSongCatalog(source);
const expected = [
  ['rmb-aitch', 'RMB (Ring My Bell)', 57978848],
  ['bamba-bia-aitch', 'Bamba (feat. Aitch & BIA)', 271283812],
  ['rain-aitch-aj-tracey', 'Rain', 268890712],
  ['ufo-d-block-europe-aitch', 'UFO', 128096554],
  ['psycho-aitch', 'PSYCHO', 139683941],
  ['rmb-polish-remix-aitch', 'RMB (Ring My Bell) - Polish Remix', 2706202],
  ['baby-aitch-ashanti', 'Baby (feat. Ashanti)', 141559390],
  ['raving-in-the-studio-aitch', 'Raving In The Studio', 33006204],
  ['keisha-becky-remix-aitch', 'Keisha & Becky - Remix', 197623950],
  ['rmb-german-remix-aitch', 'RMB (Ring My Bell) - German Remix', 788797],
  ['my-g-aitch-ed-sheeran', 'My G', 40944952],
];

for (const [id, title, plays] of expected) {
  const song = catalogue.find(item => item.id === id);
  assert.ok(song, `${title} should be in the catalogue`);
  assert.equal(song.title, title);
  const row = source.split(/\r?\n/).find(line => line.includes(id));
  assert.ok(row, `${title} should have a song definition`);
  assert.match(row, new RegExp(`plays"?:${plays}`), `${title} should retain the screenshot play count`);
  if (id === 'bamba-bia-aitch') assert.match(row, /artist:"Luciano, Aitch, BIA"/);
  if (id === 'psycho-aitch') assert.match(row, /artist:"Aitch, Anne-Marie"/);
  if (id === 'raving-in-the-studio-aitch') assert.match(row, /artist:"Aitch, Bou"/);
  if (id === 'keisha-becky-remix-aitch') assert.match(row, /artist:"Russ Millions, Tion Wayne, Aitch, Swarmz, Sav'o, JAY1"/);
  if (id === 'my-g-aitch-ed-sheeran') assert.match(row, /artist:"Aitch, Ed Sheeran"/);
}

const orderStart = source.indexOf('const aitchSongOrder=[');
const orderEnd = source.indexOf('];', orderStart);
const aitchOrder = [...source.slice(orderStart, orderEnd).matchAll(/"([a-z0-9-]+)"/g)].map(match => match[1]);
assert.deepEqual(aitchOrder, expected.map(([id]) => id), 'Aitch popular tracks should preserve the screenshot order');

const placeholderRows = expected.filter(([id]) => id !== 'rain-aitch-aj-tracey' && id !== 'ufo-d-block-europe-aitch');
for (const [id] of placeholderRows) {
  if (id === 'rmb-aitch' || id === 'bamba-bia-aitch' || id === 'psycho-aitch' || id === 'rmb-polish-remix-aitch' || id === 'baby-aitch-ashanti' || id === 'raving-in-the-studio-aitch' || id === 'keisha-becky-remix-aitch' || id === 'rmb-german-remix-aitch' || id === 'my-g-aitch-ed-sheeran') continue;
  const row = source.match(new RegExp(`\\{id:"${id}"[^}]*\\}`))?.[0];
  assert.ok(row?.includes('file:""'), `${id} should remain a no-audio placeholder until its MP3 is added`);
}

const rmbRow = source.match(/\{id:"rmb-aitch"[^}]*\}/)?.[0];
assert.ok(rmbRow?.includes('file:"/audio/RMB (Ring My Bell) - aitch.mp3"'));
assert.ok(rmbRow?.includes('artwork:"/images/rmb-(ring-my-bell)-aitch.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'RMB (Ring My Bell) - aitch.mp3')), true, 'RMB audio file should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'rmb-(ring-my-bell)-aitch.png')), true, 'RMB artwork should exist');
const bambaRow = source.match(/\{id:"bamba-bia-aitch"[^}]*\}/)?.[0];
assert.ok(bambaRow?.includes('file:"/audio/Bamba (feat. Aitch & BIA).mp3"'));
assert.ok(bambaRow?.includes('artwork:"/images/bamba-luciano-aitch-bia.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'Bamba (feat. Aitch & BIA).mp3')), true, 'Bamba audio file should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'bamba-luciano-aitch-bia.png')), true, 'Bamba artwork should exist');
const psychoRow = source.match(/\{id:"psycho-aitch"[^}]*\}/)?.[0];
assert.ok(psychoRow?.includes('file:"/audio/PSYCHO - aitch, anne-marie.mp3"'));
assert.ok(psychoRow?.includes('artwork:"/images/psycho-aitch-anne-marie.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'PSYCHO - aitch, anne-marie.mp3')), true, 'PSYCHO audio file should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'psycho-aitch-anne-marie.png')), true, 'PSYCHO artwork should exist');
const polishRemixRow = source.match(/\{id:"rmb-polish-remix-aitch"[^}]*\}/)?.[0];
assert.ok(polishRemixRow?.includes('file:"/audio/RMB (Ring My Bell) [Polish Remix] - aitch.mp3"'));
assert.ok(polishRemixRow?.includes('artwork:"/images/rmb-(ring-my-bell)-polish-remix-aitch.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'RMB (Ring My Bell) [Polish Remix] - aitch.mp3')), true, 'Polish remix audio should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'rmb-(ring-my-bell)-polish-remix-aitch.png')), true, 'Polish remix artwork should exist');
const babyRow = source.match(/\{id:"baby-aitch-ashanti"[^}]*\}/)?.[0];
assert.ok(babyRow?.includes('file:"/audio/Baby (feat. Ashanti) - aitch, ashanti.mp3"'));
assert.ok(babyRow?.includes('artwork:"/images/baby-aitch-ashanti.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'Baby (feat. Ashanti) - aitch, ashanti.mp3')), true, 'Baby audio should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'baby-aitch-ashanti.png')), true, 'Baby artwork should exist');
const ravingRow = source.match(/\{id:"raving-in-the-studio-aitch"[^}]*\}/)?.[0];
assert.ok(ravingRow?.includes('file:"/audio/Raving In The Studio - aitch, bou.mp3"'));
assert.ok(ravingRow?.includes('artwork:"/images/raving-in-the-studio-aitch-bou.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'Raving In The Studio - aitch, bou.mp3')), true, 'Raving In The Studio audio should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'raving-in-the-studio-aitch-bou.png')), true, 'Raving In The Studio artwork should exist');
const keishaBeckyRow = source.match(/\{id:"keisha-becky-remix-aitch"[^}]*\}/)?.[0];
assert.ok(keishaBeckyRow?.includes('artist:"Russ Millions, Tion Wayne, Aitch, Swarmz, Sav\'o, JAY1"'));
assert.ok(keishaBeckyRow?.includes('file:"/audio/Russ x Tion Wayne Keisha Becky Remix ft Aitch JAY1 Sav O Swarmz.mp3"'));
assert.ok(keishaBeckyRow?.includes('artwork:"/images/keisha-becky-aitch.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'Russ x Tion Wayne Keisha Becky Remix ft Aitch JAY1 Sav O Swarmz.mp3')), true, 'Keisha & Becky audio should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'keisha-becky-aitch.png')), true, 'Keisha & Becky artwork should exist');
const germanRemixRow = source.match(/\{id:"rmb-german-remix-aitch"[^}]*\}/)?.[0];
assert.ok(germanRemixRow?.includes('file:"/audio/RMB (Ring My Bell) - German Remix - aitch.mp3"'));
assert.ok(germanRemixRow?.includes('artwork:"/images/rmb (ring my bell) [german remix] - aitch.jpg"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'RMB (Ring My Bell) - German Remix - aitch.mp3')), true, 'German remix audio should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'rmb (ring my bell) [german remix] - aitch.jpg')), true, 'German remix artwork should exist');
const myGRow = source.match(/\{id:"my-g-aitch-ed-sheeran"[^}]*\}/)?.[0];
assert.ok(myGRow?.includes('file:"/audio/My G - aitch, ed sheeran.mp3"'));
assert.ok(myGRow?.includes('artwork:"/images/my-g-aitch-ed-sheeran.png"'));
assert.equal(existsSync(join(process.cwd(), 'public', 'audio', 'My G - aitch, ed sheeran.mp3')), true, 'My G audio should exist');
assert.equal(existsSync(join(process.cwd(), 'public', 'images', 'my-g-aitch-ed-sheeran.png')), true, 'My G artwork should exist');

const rmbLyricsStart = source.indexOf('LYRICS["rmb-aitch"] = [');
const rmbLyricsEnd = source.indexOf('\n];', rmbLyricsStart);
assert.notEqual(rmbLyricsStart, -1, 'RMB should have synced lyrics registered');
assert.notEqual(rmbLyricsEnd, -1, 'RMB lyrics should form a closed array');
const rmbLyricRows = [...source.slice(rmbLyricsStart, rmbLyricsEnd).matchAll(/\[(\d+\.\d+),/g)];
assert.equal(rmbLyricRows.length, 63, 'all provided RMB lyric timestamps should be registered');
assert.equal(rmbLyricRows[0][1], '0.33');
assert.equal(rmbLyricRows.at(-1)[1], '163.94');
const bambaLyricsStart = source.indexOf('LYRICS["bamba-bia-aitch"] = [');
const bambaLyricsEnd = source.indexOf('\n];', bambaLyricsStart);
assert.notEqual(bambaLyricsStart, -1, 'Bamba should have synced lyrics registered');
assert.notEqual(bambaLyricsEnd, -1, 'Bamba lyrics should form a closed array');
const bambaLyricRows = [...source.slice(bambaLyricsStart, bambaLyricsEnd).matchAll(/\[(\d+\.\d+),/g)];
assert.ok(bambaLyricRows.length >= 80, 'Bamba lyrics should include the supplied timestamped lines');
assert.equal(bambaLyricRows[0][1], '7.01');
assert.equal(bambaLyricRows.at(-1)[1], '200.41');
const psychoLyricsStart = source.indexOf('LYRICS["psycho-aitch"] = [');
const psychoLyricsEnd = source.indexOf('\n];', psychoLyricsStart);
assert.notEqual(psychoLyricsStart, -1, 'PSYCHO should have synced lyrics registered');
assert.notEqual(psychoLyricsEnd, -1, 'PSYCHO lyrics should form a closed array');
const psychoLyricRows = [...source.slice(psychoLyricsStart, psychoLyricsEnd).matchAll(/\[(\d+\.\d+),/g)];
assert.equal(psychoLyricRows.length, 47, 'all supplied PSYCHO timestamps should be registered');
assert.equal(psychoLyricRows[0][1], '6.83');
assert.equal(psychoLyricRows.at(-1)[1], '159.78');
assert.match(source, /LYRICS\["rmb-polish-remix-aitch"\] = \[\[0,"You caught us, we're still working on getting lyrics for this one\."\]\]/);
assert.match(source, /LYRICS\["rmb-german-remix-aitch"\] = \[\[0,"You caught us, we're still working on getting lyrics for this one\."\]\]/);
assert.match(source, /LYRICS\["raving-in-the-studio-aitch"\] = \[\[0,"You caught us, we're still working on getting lyrics for this one\."\]\]/);
assert.match(source, /LYRICS\["keisha-becky-remix-aitch"\] = \[\[0,"You caught us, we're still working on getting lyrics for this one\."\]\]/);
const babyLyricsStart = source.indexOf('LYRICS["baby-aitch-ashanti"] = [');
const babyLyricsEnd = source.indexOf('\n];', babyLyricsStart);
assert.notEqual(babyLyricsStart, -1, 'Baby should have synced lyrics registered');
assert.notEqual(babyLyricsEnd, -1, 'Baby lyrics should form a closed array');
const babyLyricRows = [...source.slice(babyLyricsStart, babyLyricsEnd).matchAll(/\[(\d+\.\d+),/g)];
assert.equal(babyLyricRows.length, 80, 'all supplied Baby lyric timestamps should be registered');
assert.equal(babyLyricRows[0][1], '1.52');
assert.equal(babyLyricRows.at(-1)[1], '173.26');
const myGLyricsStart = source.indexOf('LYRICS["my-g-aitch-ed-sheeran"] = [');
const myGLyricsEnd = source.indexOf('\n];', myGLyricsStart);
assert.notEqual(myGLyricsStart, -1, 'My G should have synced lyrics registered');
assert.notEqual(myGLyricsEnd, -1, 'My G lyrics should form a closed array');
const myGLyricRows = [...source.slice(myGLyricsStart, myGLyricsEnd).matchAll(/\[(\d+\.\d+),/g)];
assert.equal(myGLyricRows.length, 78, 'all supplied My G lyric timestamps should be registered');
assert.equal(myGLyricRows[0][1], '2.45');
assert.equal(myGLyricRows.at(-1)[1], '191.71');
assert.match(source.slice(myGLyricsStart, myGLyricsEnd), /No other name for you/);
assert.match(source.slice(myGLyricsStart, myGLyricsEnd), /From now and till forever, you were always my G/);

console.log('Aitch popular tracks and order checks passed');
