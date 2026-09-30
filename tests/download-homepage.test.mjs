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
const webManifest = readFileSync(join(root, 'public', 'manifest.webmanifest'), 'utf8');

assert.match(homepage, /href="deluxe-tunes-logo\.png"/, 'restored homepage should use the ZIP logo');
assert.match(homepage, /href="style\.css"/, 'restored homepage should use the ZIP stylesheet');
assert.match(homepage, /id="androidDownload"[^>]+deluxetunes\.apk/, 'Android APK download link should remain in the homepage');
assert.match(homepage, /id="windowsDownload"[^>]+Deluxe-Tunes-Setup\.exe/, 'Windows installer download link should remain in the homepage');
assert.doesNotMatch(homepage, /src="\/src\/main\.jsx"/, 'the public homepage must not mount the preview React app');
assert.match(appShell, /src="\/src\/main\.jsx"/, 'the React app remains available as a separate entry');
assert.match(viteConfig, /fileName: 'song-catalog\.json'/, 'Vite must continue generating the live catalogue asset');
assert.match(electronMain, /dist', 'app\.html'/, 'Electron should open the React player entry');
assert.match(capacitorConfig, /appStartPath:\s*"\/app\.html"/, 'Capacitor should launch the React player entry');
assert.match(webManifest, /"start_url":"\/app\.html"/, 'PWA installs should launch the React player entry');
assert.match(serviceWorker, /"\/app\.html"/, 'offline app shell should include the React player entry');
assert.match(serviceWorker, /if \(request\.mode === "navigate"\) \{\s*event\.respondWith\(networkFirst\(request\)\)/,
  'navigation should refresh from network first to avoid serving a stale preview as the public homepage');
for (const asset of ['style.css', 'deluxe-tunes-logo.png']) {
  assert.equal(existsSync(join(root, asset)), true, `restored homepage asset ${asset} should exist`);
}

console.log('download homepage source and deployment entries checks passed');
