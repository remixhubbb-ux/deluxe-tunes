# Deluxe Tunes testing

## Normal app (full Deluxe Tunes interface)

```bash
npm install
npm run dev
```

For a native build:

```bash
npm run android:build
# then: npx cap open android

npm run ios:build
# then: npx cap open ios
```

## Coming Soon store build

The Coming Soon screen is now an environment-controlled mode. It does **not** replace the app during normal development.

```bash
npm run build:coming-soon
```

Then sync the native projects:

```bash
npm run android:coming-soon
npm run ios:coming-soon
```

To return to the normal app, use `npm run build` / `npm run android:build` / `npm run ios:build`.

## Gmail contact

The Email Deluxe Tunes button is a bottom-left Gmail Compose link with `deluxe.tuness@gmail.com` pre-filled.
