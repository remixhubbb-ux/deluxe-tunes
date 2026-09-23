# Deluxe Tunes — Experience Refresh

This build adds the requested product pass across the core player, library, discovery and personalisation surfaces.

## Included

- Home redesign: Jump Back In, Made For You / Daily Mixes, followed-artist releases, Recently Added, Recommended Albums, plus listening stats.
- Full-screen Now Playing with large artwork, synced lyrics, queue preview and Focus Mode.
- Queue drawer with play, remove, clear and reorder controls.
- Search recents plus Songs / Artists filters. Search remains prefix-based and albums are not searchable.
- Liked Songs count and sorting by Date Added, Title, Artist and Album.
- Playlist creation UI and dedicated Downloads library section.
- Artist Follow controls and artist profiles with popular tracks and latest releases.
- Auto Day/Night appearance based on device local time, plus Always Day / Always Night overrides.
- Mini visualizer, album-art accent gradients, hover depth and subtle page transitions.
- Album-art swipe gestures for previous/next and long-press queue access in the full player.
- Smooth crossfade-style transition when moving between tracks.
- Focus Mode and sleep timer with a short volume fade before stopping.
- Taste DNA, weekly listening recap, digital collection shelf and social feature entry points.
- All preference/state data stays local in localStorage.

## Build note

The source package does not include `node_modules`. Run `npm install` and then `npm run build` on a development machine before release. The editing environment could not perform a fresh dependency install because the required npm tarballs were not cached, so this exact post-refresh build was not production-build-verified here.
