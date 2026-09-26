# Deluxe Tunes

Deluxe Tunes is a polished local-first music player with a bundled media library, Spotify and Discord account connection, desktop/mobile packaging, and a persistent listening experience.

Current release: 8.1.6

## What the app includes

- Full music library browsing with album and artist views
- Real bundled audio playback from files under `public/audio/`
- Search, filtering, playlists, queue management, and playback controls
- Synced lyrics for many bundled tracks
- Listening stats and play tracking
- Daily listening streak tracking and milestone notifications
- Spotify and Discord OAuth sign-in via the user’s default browser
- Windows desktop app packaging with Electron and installer generation
- Android/iOS Capacitor app support
- Local-first behavior with production API fallback for OAuth and shared backend functions

## Current catalog

The app ships with a curated, real bundled catalog rather than a single demo track. It includes music from artists such as:

- SIENNA SPIRO
- Alex Warren
- OneDa
- Chri$tian Gate$
- Dave
- ArrDee
- Aitch x AJ Tracey
- Bella Kay
- Alexandra Burke
- and other artists represented in the bundled collection

Representative albums and songs in the current project include:

- `You Stole The Show`
- `The Visitor`
- `WILDCHILD`
- `Formula OneDa`
- `WHEN I WAKE UP`
- `Rain`
- `Flowers (Say My Name)`
- `Eternity`
- `BAD`

Artwork and audio assets are bundled under `public/images/` and `public/audio/`.

## Local development

Install dependencies:

```bash
npm install
```

Start the frontend in development mode:

```bash
npm run dev
```

Start the backend OAuth/session server locally if you want to test the auth flow in a local environment:

```bash
npm run server
```

The backend listens on `PORT` and defaults to `http://localhost:8787` unless overridden. In development, the app still uses localhost where appropriate. In production, it prefers the hosted HTTPS API instead of a local desktop origin.

## Production architecture

This project is designed to work in both local dev and production deployment:

- Frontend: React + Vite
- Desktop shell: Electron
- Mobile shells: Capacitor Android/iOS
- Hosted backend: Node.js server in `server.mjs`
- Database: PostgreSQL when `DATABASE_URL` is set, with JSON file fallback used for local/offline scenarios

The production OAuth flow uses a real HTTPS backend, for example:

- `https://deluxe-tunes-api.onrender.com/api/spotify/callback`
- `https://deluxe-tunes-api.onrender.com/api/discord/callback`

The desktop app opens the provider login using the user’s default browser, then completes the callback and posts the result back to the app. This avoids hard-coding a localhost dependency into the packaged desktop build.

## Environment variables

Create a local `.env` file for local development. Example values look like this (do not commit secrets):

```env
PORT=8787
HOST=0.0.0.0
DATABASE_URL=postgresql://user:password@host:5432/dbname
APP_ORIGIN=http://localhost:8787
OAUTH_BASE_URL=http://localhost:8787
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8787/api/spotify/callback
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:8787/api/discord/callback
```

In production, set the same variables to the live HTTPS values instead of localhost.

## Backend details

`server.mjs` is the backend used for OAuth, session persistence, token exchange, and play stats. It:

- binds to `HOST` and `PORT` using `server.listen(PORT, HOST)`
- uses PostgreSQL via `pg` when `DATABASE_URL` is configured
- falls back to local JSON files in `data/` when a database is not configured
- handles Spotify and Discord PKCE flows
- exposes status endpoints for auth state
- stores play statistics and user session data in a persistent backend

## Build and release commands

### Production frontend build

```bash
npm run build
```

### Preview built frontend

```bash
npm run preview
```

### Windows desktop release

```bash
npm run desktop:dist
```

This produces the Windows installer in `release/Deluxe-Tunes-Setup.exe`.

### Android build

```bash
npm run android:apk
```

Or bundle Android release:

```bash
npm run android:aab
```

### iOS build

```bash
npm run ios:build
```

## Notes

- The app is intentionally local-first but includes real external OAuth integrations for Spotify and Discord.
- Discord Rich Presence is handled in the desktop Electron shell, not in the hosted backend.
- The project does not rely on a local Vite dev server for production authentication.
- The packaged desktop app is expected to work as a real installed app, not only via `npm run dev`.
- The repository intentionally keeps secrets in local environment variables rather than in source control.

## Version

The current package version is `8.1.6`.