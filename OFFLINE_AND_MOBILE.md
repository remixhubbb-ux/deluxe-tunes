# Offline and mobile support

Deluxe Tunes is local-first:
- Audio and artwork are bundled under `public/`.
- Likes, listening stats and local play counters use `localStorage`.
- The app no longer depends on the `/api/plays` network endpoint for playback or stats.
- A service worker caches the app shell/assets and locally serves cached audio when offline on supported browsers.
- Capacitor is configured for Android and iOS builds from the same `dist` output.

Build commands:
- `npm run build`
- `npm run preview`
- `npm run android:build`
- `npm run ios:build` (requires a macOS/Xcode environment for the native iOS build)

For the web/PWA, the app must be opened once while online so the service worker can install and cache resources; after that, previously loaded app resources and audio can work offline. Native Capacitor builds bundle the web app locally.
