# Deluxe Tunes — Account & Discord Integration

## Account

Deluxe Tunes and Friends use the same server-backed email/username and password session. When that session is active, Friends opens without a second login. Signing out revokes the server session.

- New account passwords are bcrypt-hashed on the server and never stored in plaintext.
- Server sessions use HttpOnly cookies and expire after 30 days.
- Existing device-only accounts and their local data are preserved and are not automatically merged or copied to server accounts.
- A device-only account must be explicitly connected once by verifying its existing device password and creating or signing into a server identity. This is an opt-in link and does not transfer its local playlists, settings, Tune Tokens, streaks, or other data.
- A device-local account or username by itself is not authentication proof to the Friends backend.
- A legacy device-only password hash is upgraded to salted bcrypt after the existing account holder successfully signs in.
- The account/settings panel is opened from the top-right profile avatar.
- Signing out returns to the account gate after the backend confirms session revocation. If the backend is unreachable, the app remains signed in and asks the user to retry.

Email verification is not configured, so new server accounts remain explicitly unverified. Configure an email delivery provider and verified-address workflow before relying on email verification for account recovery.

Friends access requires the backend `DATABASE_URL` to point to PostgreSQL. The server applies the additive, idempotent Friends/auth schema migrations at startup. For production, set `ALLOWED_APP_ORIGINS` to the exact frontend origin; an explicit list replaces the default web origin, and the Electron desktop app uses the dedicated `deluxetunes://app` origin, which remains allowed. Set `VITE_FRIENDS_API_BASE_URL` to the public backend URL when it differs from the default. No Google OAuth configuration is required for Friends.

For the current Cloudflare Pages/Render deployment, the production API URL is `https://deluxe-tunes-api.onrender.com` and the frontend origin is `https://deluxetunesapp.pages.dev`. `.env.production` sets the Vite API variables to the Render URL, and hosted clients ignore localhost overrides. Render must run `npm ci` / `npm start`, set `NODE_ENV=production`, `APP_ORIGIN=https://deluxetunesapp.pages.dev`, `OAUTH_BASE_URL=https://deluxe-tunes-api.onrender.com`, `ALLOWED_APP_ORIGINS=https://deluxetunesapp.pages.dev`, and use its existing PostgreSQL **Internal Database URL** as `DATABASE_URL`. Configure its health-check path as `/api/health`; it reports ready only after PostgreSQL and Friends initialization succeed. Render's service and database environment must be checked manually, and Pages must be rebuilt after environment changes.

Friends usernames are displayed as `name#1234`. The backend assigns the four-digit suffix at account registration, stores it alongside the existing username, and requires the complete handle for exact search. Existing server usernames retain their name and get a stable suffix when the additive schema migration runs. Short profile bios are optional and are visible only through the Friends profile/list endpoints.

## Discord Rich Presence

The Connections tab includes a Discord Rich Presence switch. A normal browser page cannot directly open Discord's local Rich Presence IPC socket. The app therefore exposes an optional desktop bridge hook:

`window.DeluxeTunesDiscord.setPresence(payload)`

When a supported native desktop bridge injects that API, Deluxe Tunes sends the current track, artist and playback state whenever the connection is enabled. This is the intended path for showing:

**Listening to [song] on Deluxe Tunes**

The mobile UI keeps the connection setting ready, but actual Discord Rich Presence on Android/iOS requires a native Discord integration rather than ordinary browser JavaScript.

### Local Discord testing

For desktop testing on the same computer as Discord:

1. Create a Discord Developer Application and use its Application ID as `DISCORD_CLIENT_ID`.
2. Put it in `.env`.
3. Run `npm install`.
4. Run `npm run server` in one terminal.
5. Run `npm run dev` in another.
6. Turn on **Settings → Connections → Discord Rich Presence**.

The local server uses Discord IPC to update the desktop Discord client. This requires the Discord desktop app to be running. It is not a cloud/hosted Discord connection.
