# Deluxe Tunes UI update

Applied to the shared web source and the bundled Android web assets:

- Added a **Playlists** navigation tab (desktop sidebar and mobile bottom navigation).
- Removed the old **Your Collection** sidebar section.
- The Playlists page contains the existing **Liked Songs** playlist.
- Removed play buttons from artist cards in the **Artists** tab. Play controls remain on songs inside artist profiles.
- The same responsive source is used for desktop and mobile.

For a fresh Android sync from source:

```bash
npm install
npm run android:build
npx cap open android
```
