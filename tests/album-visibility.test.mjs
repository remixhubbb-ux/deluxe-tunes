import assert from 'node:assert/strict';
import { filterVisibleAlbums, isVisibleAlbum } from '../src/appLogic.js';

const allowedTitles = [
  'Formula OneDa',
  'WILDCHILD',
  "You'll Be Alright, Kid",
  'Overcome',
  'Visitor',
  'Visitor (Deluxe)'
];

const albums = [
  ...allowedTitles.map((title, index) => ({ id: `album-${index}`, title })),
  { id: 'unwanted', title: 'The Visitor' },
  { id: 'also-unwanted', title: 'Another Album' }
];

for (const title of allowedTitles) {
  assert.equal(isVisibleAlbum(title), true, `${title} should remain visible`);
}

assert.equal(isVisibleAlbum('visitor'), true, 'Visitor should remain distinct from Visitor (Deluxe)');
assert.equal(isVisibleAlbum('Visitor (Deluxe)'), true, 'Visitor (Deluxe) should remain distinct from Visitor');
assert.equal(isVisibleAlbum('The Visitor'), false, 'The Visitor should not be visible');
assert.equal(isVisibleAlbum('visitor deluxe'), false, 'A differently spaced title should not be visible');
assert.deepEqual(
  filterVisibleAlbums(albums).map(album => album.id),
  allowedTitles.map((title, index) => `album-${index}`),
  'only the requested album titles should remain visible'
);

console.log('album visibility regression check passed');
