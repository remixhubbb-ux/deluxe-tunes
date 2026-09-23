import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src', 'main.jsx'), 'utf8');

assert.match(
  source,
  /dangerous-state-of-mind-christian-gates[\s\S]*file:"\/audio\/Dangerous State Of Mind - Chri\$tian Gate\$\.mp3"/,
  'dangerous state of mind should have the mp3 mapped in the catalog'
);

assert.match(
  source,
  /dangerous-state-of-mind-christian-gates[\s\S]*artwork:"\/images\/dangerous-state-of-mind-christian-gate\.png"/,
  'dangerous state of mind should have the artwork mapped in the catalog'
);

assert.match(
  source,
  /"dangerous-state-of-mind-christian-gates": \[/,
  'dangerous state of mind should have lyrics in the lyrics map'
);

console.log('christian gates data checks passed');
