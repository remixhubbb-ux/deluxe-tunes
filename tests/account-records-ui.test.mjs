import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('account record page is separate, server-authenticated, and performs explicit lookups only',()=>{
  assert.match(app,/get\("admin"\)==="account-records"/);
  assert.match(app,/api\/admin\/account-records\/access/);
  assert.match(app,/api\/admin\/account-records\?lookup=/);
  assert.match(app,/serverOnly/);
  assert.match(app,/Exact account email or account ID/);
  assert.match(server,/isAccountRecordAdmin\(user\)/);
  assert.match(server,/account-record-lookup:ip:/);
  assert.match(server,/account-record-lookup:admin:/);
});

test('Redeem is above Contact support and routes admin codes through server verification',()=>{
  const redeemLink=app.indexOf('>Redeem</span>');
  const contactLink=app.indexOf('>Contact support</span>');
  assert.ok(redeemLink>=0&&contactLink>redeemLink);
  assert.match(app,/function RedeemPage\(\{onRedeem,onApplyAdminGrant,onSetAdminStreak\}\)/);
  assert.match(app,/pattern="\(\[0-9\]\{5\}\|\[0-9\]\{8\}\)"/);
  assert.match(app,/This code has already been redeemed on this device/);
  assert.match(app,/RedeemPage onRedeem=\{redeemCode\}/);
  assert.match(app,/api\/admin\/panel\/access/);
  assert.match(app,/function AdminPanel\(\{code,onApplyGrant,onSetStreak,onClose\}\)/);
  assert.match(app,/Add 5K Tune Tokens/);
  assert.match(app,/Add custom streak days/);
  assert.match(app,/api\/admin\/me\/tokens/);
  assert.match(app,/api\/admin\/me\/streak/);
  assert.doesNotMatch(app,/api\/admin\/accounts\/\$\{encodeURIComponent\(account\.id\)\}/);
  assert.doesNotMatch(app,/Find account by exact email or account ID/);
  assert.match(app,/There is no per-press limit/);
  assert.match(server,/isValidAdminPanelCode\(code\)/);
  assert.match(server,/isAccountRecordAdmin\(user\)/);
  assert.match(styles, /\.sideFooterLink/);
  assert.match(styles,/\.adminPanelOverlay/);
});
