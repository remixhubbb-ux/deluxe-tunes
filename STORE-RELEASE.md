# Deluxe Tunes — store release setup

This project is prepared as a Capacitor app wrapper around the existing Vite/React Deluxe Tunes project. The launch screen currently shows **Coming Soon**. The full player code remains in `src/main.jsx` and can be re-enabled by changing `COMING_SOON` to `false`.

## Build

1. Install Node.js and the project dependencies: `npm install`
2. Build the web app: `npm run build`
3. Add native platforms: `npx cap add android` and `npx cap add ios`
4. Sync: `npx cap sync`
5. Open Android Studio with `npm run cap:android` or Xcode with `npm run cap:ios`.

## Store strategy

For Google Play, use Play Console **pre-registration** if you want the public listing to show before launch. Google says pre-registration lets users view the listing and register before the app is released.

For Apple, use App Store Connect **pre-order** with a future release date. Apple supports pre-orders for unreleased apps and displays the expected release date on the product page.

## Important

You still need your own Apple Developer and Google Play developer accounts, app signing, store screenshots, privacy information, content declarations/ratings, and final review approval.
