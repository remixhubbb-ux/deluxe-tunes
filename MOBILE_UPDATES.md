# Mobile/Desktop update

The app uses the same React source for web/desktop and Capacitor Android. The Android shell is synced from `dist` with `npx cap sync android`.

This build includes:
- Dave as an artist profile, linked to Thiago Silva.
- Thiago Silva synced lyrics.
- Lyrics button available in the mobile mini-player and the full Lyrics page.
- Artist cards are navigation-only; song rows inside artist profiles retain playback controls.
- Your Library remains the library container with Playlists, Podcasts, Albums, Artists and Downloads.

Build both web and Android with:

```bash
npm install
npm run build
npx cap sync android
```
