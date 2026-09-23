# Deluxe Tunes Discord Authentication

The Connections tab now uses a real Discord OAuth2 authorization flow. Clicking **Connect Discord** opens Discord itself so the user must sign in and explicitly authorize Deluxe Tunes. Rich Presence is only sent after that authorization succeeds.

## Discord Developer Portal

1. Open your Deluxe Tunes Discord application.
2. In **OAuth2**, add this redirect URI for local testing:

```text
http://localhost:8787/api/discord/callback
```

3. For local PKCE testing without a backend secret, enable **Public Client** for the Discord application. Discord's OAuth flow supports a code verifier/challenge for public clients.
4. Copy the application's Client ID into `.env`:

```env
DISCORD_CLIENT_ID=your_discord_application_id
```

5. Leave `DISCORD_CLIENT_SECRET` blank when using Public Client + PKCE. If you instead use a confidential client, keep the secret server-side only:

```env
DISCORD_CLIENT_SECRET=your_server_only_secret
```

6. Keep the app and local server running:

```text
npm run server
npm run dev
```

Then open **Settings → Connections → Connect Discord**. Discord will ask the user to authenticate and authorize the connection.

## Rich Presence

Rich Presence still requires the Discord desktop client and the local `discord-rpc` bridge. OAuth authentication and Rich Presence are separate pieces: OAuth proves the user intentionally connected their Discord account; the local bridge sends the current playback activity to the Discord desktop client.
