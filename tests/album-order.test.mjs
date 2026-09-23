import assert from 'node:assert/strict';

const songs = [
  { id: 'b', album: 'Visitor (Deluxe)', title: 'B' },
  { id: 'a', album: 'Visitor (Deluxe)', title: 'A' },
  { id: 'c', album: 'Visitor (Deluxe)', title: 'C' },
];

const albums = [
  { type: 'album', title: 'Visitor (Deluxe)', trackIds: ['a', 'b', 'c'] },
];

const orderedAlbumSongs = (album, songList) => {
  const idMap = new Map(songList.map(song => [song.id, song]));
  return (album.trackIds || []).map(id => idMap.get(id)).filter(Boolean);
};

const albumRecords = albums
  .filter(album => album.type !== 'single')
  .map(album => ({ ...album, songs: orderedAlbumSongs(album, songs) }));

assert.deepEqual(
  albumRecords[0].songs.map(song => song.id),
  ['a', 'b', 'c'],
  'custom album songs should follow the album trackIds order, not the source song list order'
);

console.log('album ordering regression check passed');
