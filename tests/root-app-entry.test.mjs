import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const appSource=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

test('the website root opens the full Deluxe Tunes app instead of the public preview screen',()=>{
  assert.match(appSource,/createRoot\(document\.getElementById\("root"\)\)\.render\(<App\/>\);/);
  assert.doesNotMatch(appSource,/render\([^;]*DevelopmentPreview/s);
});
