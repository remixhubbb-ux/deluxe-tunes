import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src', 'main.jsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const backdropsBlock = source.match(/const LYRICS_BACKDROPS=\[([\s\S]*?)\];/);
assert.ok(backdropsBlock, 'lyrics should have a curated backdrop list');

const backdrops = [...backdropsBlock[1].matchAll(/\{id:"([^"]+)",label:"([^"]+)",image:assetUrl\("\/images\/([^"]+)"\)\}/g)];
assert.deepEqual(backdrops.map(([, id, label]) => [id, label]), [
  ['mount-back', 'Frostpeak'],
  ['deluxe-tunes-lyrics-backdrop', 'Emberglow'],
  ['deluxe-tunes-lyrics-backdrop-2', 'Starfall'],
  ['deluxe-tunes-lyrics-backdrop-3', 'Goldencrest'],
  ['deluxe-tunes-lyrics-backdrop-4', 'Pink Horizon'],
  ['deluxe-tunes-lyrics-backdrop-6', 'Cloudtop Sunset'],
  ['deluxe-tunes-lyrics-backdrop-7', 'Ocean Glow'],
]);
for (const [, , , filename] of backdrops) {
  assert.equal(fs.existsSync(path.join(root, 'public', 'images', filename)), true, `${filename} should exist`);
}

assert.match(source, /function StorePage\(/);
assert.match(source, /LYRICS_BACKDROPS\.map\(backdrop=>/);
assert.match(source, /price=\{backdrop\.id==="mount-back"\?0:15\}/);
assert.match(source, /ownedBackdrops\.includes\(backdrop\.id\)/);
assert.doesNotMatch(source, /lyricsBackdropControls|lyricsBackdropButton|lyricsBackdropPicker/);
assert.doesNotMatch(styles, /lyricsBackdropControls|lyricsBackdropButton|lyricsBackdropPicker|lyricsTextColorOptions|lyricsBackdropGrid/);
assert.match(source, /lyricsBackdrop:"dt8_lyrics_backdrop"/);
assert.match(source, /STORAGE_KEYS\.lyricsBackdrop,JSON\.stringify\(lyricsBackdrop\)/);
assert.match(source, /store:"dt9_store"/);
assert.match(source, /balance:Number\.isFinite\(balance\)\?Math\.max\(0,Math\.floor\(balance\)\):0/);
assert.match(source, /ownedBackdrops:\[\.\.\.new Set\(\["mount-back",\.\.\.ownedBackdrops\]\)\]/);
assert.match(source, /ownedColors:\[\.\.\.new Set\(\["white",\.\.\.ownedColors\]\)\]/);
assert.match(source, /previous\.balance<price/);
assert.match(source, /balance:previous\.balance-price/);
assert.match(source, /Tune Tokens and purchases are stored on this device/);
assert.match(styles, /\.storeItemCard/);

const colorsBlock = source.match(/const LYRICS_TEXT_COLORS=\[([\s\S]*?)\];/);
assert.ok(colorsBlock, 'lyrics should offer a curated text color list');
const colors = [...colorsBlock[1].matchAll(/\{id:"([^"]+)",label:"([^"]+)",value:"([^"]+)"\}/g)];
assert.deepEqual(colors.map(([, id, label]) => [id, label]), [
  ['white', 'White'],
  ['red', 'Red'],
  ['blue', 'Blue'],
  ['green', 'Green'],
  ['black', 'Black'],
  ['gold', 'Yellow'],
]);
assert.match(source, /safeJSON\(STORAGE_KEYS\.lyricsTextColor,"white"\)/);
assert.match(source, /STORAGE_KEYS\.lyricsTextColor,JSON\.stringify\(lyricsTextColor\)/);
assert.match(source, /price=\{color\.id==="white"\?0:5\}/);
assert.match(source, /ownedColors\.includes\(color\.id\)/);
assert.match(source, /"--lyrics-text-color":selectedTextColor\.value/);
assert.match(styles, /--lyrics-text-color,#fff/);
assert.match(source, /selectedTextColor\.id==="black"\?" blackLyricsText":""/);
assert.match(styles, /\.blackLyricsText \.lyricsOnlyView \.lyricLine[^{}]*\{color:#000;-webkit-text-stroke:0 transparent\}/);

console.log('Lyrics Store customisation, ownership, persistence, and image checks passed');
