import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

test('Friends screen is not exposed through app navigation or rendering',()=>{
  assert.doesNotMatch(app,/import\s+FriendsPage\b/);
  assert.doesNotMatch(app,/\["friends","Friends"/);
  assert.doesNotMatch(app,/page==="friends"\s*&&\s*<FriendsPage/);
});
