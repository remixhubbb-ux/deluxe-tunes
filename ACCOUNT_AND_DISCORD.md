# Deluxe Tunes — Account & Discord Integration

## Account

The current build adds a first-launch account gate for both desktop and mobile.

- Email + password account creation/login is local-first and works offline.
- Nickname and profile picture are saved to the local device account.
- The account/settings panel is opened from the top-right profile avatar.
- Signing out returns to the account gate.

This is a local/offline account system, not a cloud identity service. For production multi-device accounts, replace the local account store with a real authentication backend.

## Google sign-in

The UI includes **Continue with Google** using Google's Identity Services. Set:

`VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`

in the deployment environment and configure the matching authorised origins in Google Cloud. The browser needs internet access when Google sign-in is used. A production implementation should verify the Google credential on a server before creating a cloud session.

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
