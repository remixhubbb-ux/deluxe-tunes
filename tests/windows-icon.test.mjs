import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const icon = readFileSync(join(root, 'public', 'logo.ico'));
const imageCount = icon.readUInt16LE(4);
const dimensions = [];

assert.equal(icon.readUInt16LE(0), 0, 'ICO reserved header field should be zero');
assert.equal(icon.readUInt16LE(2), 1, 'ICO resource type should be icon');
assert.ok(imageCount >= 6, 'Windows icon should contain multiple resolutions for taskbar, shortcuts, and installer');

for (let index = 0; index < imageCount; index++) {
  const entryOffset = 6 + index * 16;
  dimensions.push(icon[entryOffset] || 256);
  const imageOffset = icon.readUInt32LE(entryOffset + 12);
  const imageLength = icon.readUInt32LE(entryOffset + 8);
  assert.ok(imageOffset + imageLength <= icon.length, 'every ICO image resource should fit in the file');
  assert.deepEqual([...icon.subarray(imageOffset, imageOffset + 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'each icon size should contain a valid PNG image');
}

for (const size of [16, 24, 32, 48, 64, 128, 256]) {
  assert.ok(dimensions.includes(size), `Windows icon should include a ${size}px resource`);
}

console.log('Windows multi-resolution app icon checks passed');
