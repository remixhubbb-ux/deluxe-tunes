import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const serviceWorker = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

assert.match(serviceWorker, /const CACHE_NAME = "deluxe-tunes-offline-v2"/, 'the updated service worker should evict the previous cache containing bad HTML audio entries');
assert.match(serviceWorker, /if \(full && !isAudioResponse\(full\)\)\s*\{\s*await cache\.delete\(key\);\s*full = null;/, 'cached non-audio responses should be removed before playback');
assert.match(serviceWorker, /if \(!response\.ok \|\| !isAudioResponse\(response\)\) return response;/, 'HTML fallbacks should never be cached as audio');

console.log('audio cache recovery checks passed');
