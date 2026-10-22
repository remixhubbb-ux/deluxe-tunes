import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const homepage = readFileSync(join(root, 'index.html'), 'utf8');
const appShell = readFileSync(join(root, 'app.html'), 'utf8');
const viteConfig = readFileSync(join(root, 'vite.config.js'), 'utf8');
const serviceWorker = readFileSync(join(root, 'public', 'sw.js'), 'utf8');
const capacitorConfig = readFileSync(join(root, 'capacitor.config.ts'), 'utf8');
const electronMain = readFileSync(join(root, 'electron', 'main.cjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const server = readFileSync(join(root, 'server.mjs'), 'utf8');
const webManifest = readFileSync(join(root, 'public', 'manifest.webmanifest'), 'utf8');

assert.match(homepage, /href="deluxe-tunes-logo\.png"/, 'restored homepage should use the ZIP logo');
assert.match(homepage, /href="style\.css"/, 'restored homepage should use the ZIP stylesheet');
assert.match(homepage, /id="androidDownload"[^>]+deluxetunes\.apk/, 'Android APK download link should remain in the homepage');
assert.match(homepage, /id="windowsDownload"[^>]+Deluxe-Tunes-Setup-v8\.1\.7\.exe/, 'Windows installer download link should target the 8.1.7 installer');
assert.doesNotMatch(homepage, /src="\/src\/main\.jsx"/, 'the public homepage must not mount the preview React app');
assert.match(appShell, /src="\/src\/main\.jsx"/, 'the React app remains available as a separate entry');
assert.match(viteConfig, /fileName: 'song-catalog\.json'/, 'Vite must continue generating the live catalogue asset');
assert.match(electronMain, /protocol\.registerSchemesAsPrivileged/, 'Electron should register its secure app scheme');
assert.match(electronMain, /protocol\.handle\(APP_SCHEME/, 'Electron should serve app assets through its custom scheme');
assert.match(electronMain, /window\.loadURL\(`\$\{APP_SCHEME\}:\/\/app\/app\.html`\)/, 'Electron should open the React player entry on its dedicated origin');
assert.match(electronMain, /DELUXE_TUNES_DATA_DIR:\s*path\.join\(app\.getPath\('userData'\)/, 'desktop server data should live in the per-user directory');
assert.match(server, /process\.env\.DELUXE_TUNES_DATA_DIR/, 'the local server should support the desktop data directory');
assert.ok(packageJson.build.files.includes('server/**/*'), 'the packaged app should include its server implementation');
assert.ok(!packageJson.build.files.includes('data/**/*'), 'the packaged app must not include local user data or auth sessions');
assert.match(electronMain, /path\.join\(__dirname, '\.\.', 'dist', 'logo\.ico'\)/, 'Electron should use the packaged ICO for the window and taskbar icon');
assert.match(capacitorConfig, /appStartPath:\s*"\/app\.html"/, 'Capacitor should launch the React player entry');
assert.match(webManifest, /"start_url":"\/app\.html"/, 'PWA installs should launch the React player entry');
assert.match(serviceWorker, /"\/app\.html"/, 'offline app shell should include the React player entry');
assert.match(serviceWorker, /if \(request\.mode === "navigate"\) \{\s*event\.respondWith\(networkFirst\(request\)\)/,
  'navigation should refresh from network first to avoid serving a stale preview as the public homepage');
for (const asset of ['style.css', 'deluxe-tunes-logo.png']) {
  assert.equal(existsSync(join(root, asset)), true, `restored homepage asset ${asset} should exist`);
}

console.log('download homepage source and deployment entries checks passed');
