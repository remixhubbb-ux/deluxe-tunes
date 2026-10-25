# Deluxe Tunes — Account & Discord Integration

## Account

<<<<<<< Updated upstream
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

=======
Friends can be used without signing in. On first use, the server silently creates a guest profile and the app stores its private session in an HttpOnly cookie. This guest identity is unique to that browser or app installation; clearing site/app data loses access to it, and it cannot be recovered or synchronized as the same identity to another device. People on web, desktop, and mobile can still add one another as friends using their displayed handles. An existing server account is used automatically if already signed in, but it is optional.

- New account passwords are bcrypt-hashed on the server and never stored in plaintext.
- Authenticated account sessions use HttpOnly cookies and expire after 30 days; guest Friends sessions use HttpOnly cookies with a one-year lifetime. Production cookies are Secure, SameSite=None, and Partitioned so supported browsers can persist sessions across app restarts without sharing them across sites.
- Guest Friends profiles do not require an email address or password and are kept separate from device-only player profiles.
- Existing device-only accounts and their local playlists, settings, Tune Tokens, streaks, and other data are not uploaded or merged into a guest profile.
- The account/settings panel is opened from the top-right profile avatar.
- Signing out returns to the account gate after the backend confirms session revocation. If the backend is unreachable, the app remains signed in and asks the user to retry.

Email verification for new server registrations is not configured, so those accounts remain explicitly unverified. Password reset separately verifies control of the account email through a single-use reset link that expires after 30 minutes.

Resetting a password updates the existing account row and preserves Friends and linked records. A successful reset invalidates outstanding reset links and all existing server sessions for that account; sign in again with the new password. Reset requests return the same response whether or not the email is registered.

Friends guest profiles require the backend `DATABASE_URL` to point to PostgreSQL. The server applies the additive, idempotent Friends/auth schema migrations at startup. For production, set `ALLOWED_APP_ORIGINS` to the exact frontend origin; an explicit list replaces the default web origin, while `deluxetunes://app`, `capacitor://localhost`, and `https://localhost` remain allowed for the Electron and Capacitor apps. Set `VITE_FRIENDS_API_BASE_URL` to the public backend URL when it differs from the default. No Google OAuth configuration is required for Friends.

Password-reset email is sent through SMTP from the backend. Set `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` as private backend environment variables; `SMTP_PORT` defaults to `587`, and `SMTP_SECURE=true` enables implicit TLS (normally port `465`). Set `PASSWORD_RESET_FROM` to an authorized sender and `PASSWORD_RESET_BASE_URL` to the exact frontend origin. Reset links open `/app.html` and carry the token in the URL fragment, so browsers do not send it in HTTP requests or referrer headers. Never place SMTP credentials in Cloudflare Pages, `VITE_*` variables, client code, or source control. For local development, use a local mail sink such as Mailpit and `http://localhost:5173`, then test with a disposable account and isolated database. Do not use production credentials or data during local testing.

The private account-record lookup is available at `/app.html?admin=account-records` but has no public navigation link. It requires an authenticated, non-guest server account whose email exactly matches one of the comma-separated `ACCOUNT_RECORD_ADMIN_EMAILS` values configured only in the backend environment. Lookups require one exact account email or UUID, are rate-limited, and return only account ID, email, username, display name, and creation time. Passwords, hashes, sessions, and reset tokens are never returned. Leave the setting empty to disable the tool; never put administrator emails in `VITE_*` frontend variables.

The Redeem page currently accepts code `69358` for 1,000 Tune Tokens once per local device. Balances and redemption history are stored locally, not validated by the backend; this is a local feature and not a secure, globally limited promotion.

The Redeem page opens the private admin panel only after both server-side admin-email allowlisting (`ACCOUNT_RECORD_ADMIN_EMAILS`) and verification of `ADMIN_PANEL_ACCESS_CODE`. Configure the eight-digit code only as a private backend environment secret; do not place it in source control or frontend variables. The panel acts only on the signed-in admin's own account: each press adds a persistent 5,000-token grant, or adds the chosen number of days to their current streak. Token grant records persist on the backend and are applied to each signed-in device's local balance; token balances remain local to each device. Streak additions are capped at the app's supported total of 100,000 days.

For the current Cloudflare Pages/Render deployment, the production API URL is `https://deluxe-tunes-api.onrender.com` and the frontend origin is `https://deluxetunesapp.pages.dev`. `.env.production` sets the Vite API variables to the Render URL, and hosted clients ignore localhost overrides. Render must run `npm ci` / `npm start`, set `NODE_ENV=production`, `APP_ORIGIN=https://deluxetunesapp.pages.dev`, `OAUTH_BASE_URL=https://deluxe-tunes-api.onrender.com`, `ALLOWED_APP_ORIGINS=https://deluxetunesapp.pages.dev`, and use its existing PostgreSQL **Internal Database URL** as `DATABASE_URL`. Configure its health-check path as `/api/health`; it confirms that the server process is responding, not that PostgreSQL or Friends data is ready. Render's service and database environment must be checked manually, and Pages must be rebuilt after environment changes.

>>>>>>> Stashed changes
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
