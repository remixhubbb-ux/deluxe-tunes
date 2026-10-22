# Deluxe Tunes

Deluxe Tunes is a polished local-first music player with a bundled media library, Spotify and Discord account connection, desktop/mobile packaging, and a persistent listening experience.

Current release: 8.1.8

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

The production OAuth flow uses the Render HTTPS backend:

- `https://deluxe-tunes-api.onrender.com/api/spotify/callback`
- `https://deluxe-tunes-api.onrender.com/api/discord/callback`

The desktop app opens the provider login using the user’s default browser, then completes the callback and posts the result back to the app. This avoids hard-coding a localhost dependency into the packaged desktop build.

The Vite production build reads `.env.production`, which sets both `VITE_API_BASE_URL` and `VITE_FRIENDS_API_BASE_URL` to `https://deluxe-tunes-api.onrender.com`. Hosted builds also reject localhost API overrides; localhost remains available for local development.

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
# Configure this on the backend only; never use a VITE_ prefix or add it to frontend config.
DISCORD_NEW_RELEASE_WEBHOOK_URL=
APP_LINK_BASE=https://deluxetunesapp.pages.dev
```

In production, set the same variables to the live HTTPS values instead of localhost.

## Friends accounts

Friends uses the same PostgreSQL-backed Deluxe Tunes account session as the rest of the app; a server-backed sign-in grants Friends access without another login, and signing out revokes that session. Passwords are hashed with bcrypt; the server issues 30-day `HttpOnly` session cookies and rate-limits login attempts to 10 per identity and 30 per source IP per 15-minute window, and registration to 3 per email and 5 per source IP per window. Friend usernames are shown as a unique `name#1234` handle; new suffixes are assigned by the server, and friend search requires the complete handle. Email verification is not configured: new accounts are explicitly marked unverified, and the app does not claim otherwise. Configure a mail provider and implement verified-address confirmation before relying on email verification for account recovery.

The Friends API requires PostgreSQL through `DATABASE_URL`. On server startup it applies additive, idempotent migrations for user credentials, hashed sessions, authentication rate limits, four-digit username suffixes, profile bios, friend requests, friendships, blocks, and opt-in listening activity. Existing user rows, sessions, friendship records, and local browser accounts are not deleted or merged. Existing server usernames retain their base name and receive a stable four-digit suffix. Old provider-created accounts without a password cannot sign in with the new flow; only link/set a password for those accounts after independently verifying ownership, or users can register a separate account. The migration also adds an opt-in online-status preference to existing Friends profiles; it defaults to disabled.

For an existing provider-created account, do not create another row or attach a password based only on knowledge of its email address. A database administrator must first verify ownership through a trusted out-of-band process, then set a bcrypt password hash on that existing `app_users.id` using a parameterized update and the account holder's chosen password. Keep the user ID, email, friendships, requests, and blocks unchanged; set `email_verified` only after actually verifying the address. If no trusted verification process is available, the account must remain unlinked and the user can register a separate account.

Set `ALLOWED_APP_ORIGINS` on the backend to a comma-separated list of exact frontend origins. The confirmed production frontend origin, `https://deluxetunesapp.pages.dev`, and the Electron desktop origin, `deluxetunes://app`, are allowed by default; local Vite origins are allowed outside production. When explicitly set, `ALLOWED_APP_ORIGINS` replaces the default web origin list, while the desktop origin remains allowed. Credentialed Friends requests do not use wildcard CORS. The Friends frontend API defaults to `https://deluxe-tunes-api.onrender.com` on hosted sites (including Pages preview domains) and `http://localhost:8787` on localhost; configure `VITE_FRIENDS_API_BASE_URL` if the API is hosted elsewhere.

### Cloudflare Pages and Render deployment

For the Cloudflare Pages project, use the repository root as the build directory, `npm run build` as the build command, and `dist` as the output directory. `.env.production` supplies the API URLs at build time; optionally set the same two `VITE_*_API_BASE_URL` variables in the Pages production environment to `https://deluxe-tunes-api.onrender.com`. Rebuild and redeploy Pages after changing either value.

The Render web service must deploy this repository and use `npm ci` for its build command and `npm start` for its start command. Set `NODE_ENV=production`, `APP_ORIGIN=https://deluxetunesapp.pages.dev`, `OAUTH_BASE_URL=https://deluxe-tunes-api.onrender.com`, `ALLOWED_APP_ORIGINS=https://deluxetunesapp.pages.dev`, and `DATABASE_URL` to the existing Render PostgreSQL database's **Internal Database URL**. Do not create a second database or replace the current database URL. Render supplies `PORT`; the server binds to it. Set the Render health check path to `/api/health`.

For staging, create a separate Render web service from `fix/friends-api-deployment` at `https://deluxe-tunes-api-staging.onrender.com` and a separate staging-only PostgreSQL database. Never point staging at the production database. Use `npm ci` / `npm start`, `NODE_ENV=production`, `OAUTH_BASE_URL=https://deluxe-tunes-api-staging.onrender.com`, the staging database's Internal Database URL for `DATABASE_URL`, and the exact Pages preview origin for both `APP_ORIGIN` and `ALLOWED_APP_ORIGINS`. The explicit staging origin list prevents the production website from accessing the staging API; the dedicated desktop origin remains allowed. Set the health check path to `/api/health`; create test accounts only after confirming this service is connected to the staging database.

The server applies the additive, idempotent schema migrations during startup. `/api/health` returns only readiness state (HTTP 200 when PostgreSQL and Friends initialization are ready, HTTP 503 otherwise); it never returns credentials or user data. After deploying, confirm `https://deluxe-tunes-api.onrender.com/api/health` returns HTTP 200, and that an unauthenticated request to `/api/auth/me` returns HTTP 401. Confirm `OPTIONS` requests with both `Origin: https://deluxetunesapp.pages.dev` and `Origin: deluxetunes://app` receive that exact `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true`. A 404 means the Render service is not running this backend revision: verify its repository, production branch, root directory, build/start commands, then redeploy. Do not consider Friends live until the backend health/CORS checks and two-account request/accept flow work against the production database.

Production sessions use `HttpOnly; Secure; SameSite=None` cookies because the Pages frontend and Render API are on separate sites. Some browsers block third-party cookies even with these attributes; if that prevents sign-in, deploy the frontend and API under the same site or proxy the API through a same-site origin. Do not replace the cookie with a token stored in local storage.

Online status is shown to friends only when the user explicitly enables **Share my online status** in their Friends profile; the default is off. A device-only account has no server-verifiable login session, so its owner must explicitly connect it once from the app by verifying the existing device password and creating or signing into its server identity. This does not upload, copy, or merge local playlists, Tune Tokens, streaks, settings, or other data. A browser-local account or username is never accepted by the Friends API as proof of identity. After the server session is established, Friends uses it automatically across navigation and app restarts; logging out revokes it.

## Backend details

`server.mjs` is the backend used for OAuth, session persistence, token exchange, and play stats. It:

- binds to `HOST` and `PORT` using `server.listen(PORT, HOST)`
- uses PostgreSQL via `pg` when `DATABASE_URL` is configured
- falls back to local JSON files in `data/` when a database is not configured
- handles Spotify and Discord PKCE flows
- exposes status endpoints for auth state
- stores play statistics and user session data in a persistent backend
- sends new-song Discord announcements from the backend using `DISCORD_NEW_RELEASE_WEBHOOK_URL`
- publishes a generated `song-catalog.json` manifest from the frontend build and polls it from the backend at startup and every 60 seconds; it silently records the first catalogue as the baseline and announces later song IDs once

For Render, set `DISCORD_NEW_RELEASE_WEBHOOK_URL` as a secret environment variable on the backend service (not in Vite, `VITE_*`, or frontend settings). Keep `DATABASE_URL` configured to a persistent PostgreSQL database: production announcement delivery is disabled without it because Render's instance filesystem is ephemeral. Set `APP_LINK_BASE` if the public app URL differs from the default; set `RELEASE_CATALOG_URL` only if its generated manifest is hosted elsewhere. Song links use `/?song=<song-id>` and open the matching track in the app. Adding a future bundled release to `DEMOS` and deploying the frontend publishes the updated manifest; the already-running backend detects it on its next poll (within about 60 seconds), without a Render backend restart. Spotify playlist imports are user-library additions, not release announcements.

If a release was already captured in the silent baseline and needs a one-time announcement, temporarily set the Render backend variable `DISCORD_RELEASE_ANNOUNCE_BASELINE_IDS` to its exact song ID (comma-separated for multiple IDs), for example `sprinter-dave-central-cee`. The next scan attempts only the explicitly selected baseline IDs; PostgreSQL atomically claims each, so a successful one is not repeated on later scans or restarts. Remove the variable after the scan/message. Keep the baseline table intact; do not delete/reset it.

### Test the Discord webhook locally on Windows

1. In the VS Code PowerShell terminal, create your local environment file from the safe template: `Copy-Item .env.example .env`.
2. Open `.env` in VS Code and paste your webhook URL after `DISCORD_NEW_RELEASE_WEBHOOK_URL=`. Do not put the secret in a `VITE_` variable, source file, or chat. `.env` is excluded by `.gitignore`.
3. Run `npm run test:discord-release-webhook` from the project folder.

This sends exactly one clearly labelled test message. The test command does not initialize PostgreSQL, scan or modify the release baseline, or start the server. On success, the response reports the message and destination channel IDs. Check that message in Discord and confirm the channel ID corresponds to `#new-song-releases`; the webhook response alone does not resolve channel names.

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

The current package version is `8.1.7`.