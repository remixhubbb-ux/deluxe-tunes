# Deluxe Tunes 5.0

A Spotify-inspired personal music player built with React + Vite. It is intentionally its own design, while keeping familiar streaming-app patterns.

## Included real track
- **You Stole The Show — SIENNA SPIRO** (MP3, bundled in `public/audio/`)

The six original Deluxe Tunes demo tracks are also bundled as WAV files.

## Run it
```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Windows download

The GitHub Actions workflow builds a Windows installer and attaches it to a GitHub release whenever a version tag is pushed:

```bash
git tag v8.1.0
git push origin v8.1.0
```

Set this Cloudflare Pages environment variable to the repository's stable latest-release URL, then redeploy the site:

```text
VITE_WINDOWS_DOWNLOAD_URL=https://github.com/remixhubbb-ux/deluxe-tunes/releases/latest/download/Deluxe-Tunes-Setup.exe
```

The public preview will then show a **Download for Windows** button. Android and iOS builds use their existing scripts and are not changed by this workflow.

## Production check
```bash
npm run build
npm run preview
```

## Features
- Real browser audio playback
- Play/pause, previous/next, shuffle and repeat
- Seek bar and volume control
- Automatic next track
- Search
- Liked Songs
- Local audio import
- Listening stats stored locally
- Responsive desktop/mobile layout
- Keyboard shortcuts: Space, Left Arrow, Right Arrow

## Note
The supplied MP3 is included locally for this project and is only played by the browser from the local project files.


### Featured artwork
The bundled “You Stole The Show” track uses `public/images/sienna-spiro-you-stole-the-show.png` as its cover artwork.


### Latest bundled track
- The Visitor — SIENNA SPIRO
- Artwork: `public/images/the-visitor-sienna-spiro.png`
- Audio: `public/audio/the-visitor-sienna-spiro.mp4` (229.07s)


## Recent changes
- Removed Midnight Drive, Neon Skies, Golden Hour, Ocean Lights, After Hours, and Electric Pulse.
- The Visitor now uses karaoke-style synced lyrics with automatic active-line scrolling/highlighting based on playback time.
- No lyrics editor/upload UI is included.
