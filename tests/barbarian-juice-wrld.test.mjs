import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

assert.match(source, /id:\s*["']barbarian-juice-wrld["']/m, 'barbarian track should be registered in the catalog');
assert.match(source, /["']barbarian-juice-wrld["']\s*:\s*\[/m, 'barbarian lyrics should be registered');

console.log('barbarian track registration check passed');
