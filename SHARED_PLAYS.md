# Universal play counts

The Formula OneDa album now uses a shared play counter. Every successful press of Play on a track increments the central count, and the album page reads that shared count.

## Run locally
Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm run dev
```

Vite proxies `/api/plays` to the shared counter on port 8787.

## Put it online
Run `node server.mjs` on one persistent server/VM and set:
```env
VITE_PLAYS_API_URL=https://YOUR-DOMAIN.example/api/plays
```

For Capacitor builds, rebuild after setting that environment variable so every app installation talks to the same API.

The included server stores counts in `data/plays.json`. That is suitable for one persistent server. If you later run multiple server instances, move the same two operations to a shared database (Postgres/Redis/etc.) so all instances see the same counters.
