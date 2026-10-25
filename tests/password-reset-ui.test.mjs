import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const mailer=readFileSync(new URL('../server/passwordResetEmail.mjs',import.meta.url),'utf8');

test('sign-in screen provides private password reset request and confirmation flows',()=>{
  assert.match(app,/>Forgot password\?</);
  assert.match(app,/\/api\/auth\/password-reset\/request/);
  assert.match(app,/\/api\/auth\/password-reset\/confirm/);
  assert.match(app,/resetToken/);
  assert.match(app,/Confirm new password/);
  assert.match(app,/If an account exists for that email, a password reset link will be sent/);
  assert.match(mailer,/resetUrl\.pathname = '\/app\.html'/);
  assert.match(server,/pathname==='\/api\/auth\/password-reset\/request'&&req\.method==='POST'/);
  assert.match(server,/pathname==='\/api\/auth\/password-reset\/confirm'&&req\.method==='POST'/);
  assert.match(server,/return friendsJson\(req,res,200,\{message:'If an account exists for that email, a password reset link will be sent\.'\}\)/);
  assert.match(server,/console\.error\('\[Password reset\] Email delivery failed\.'\)/);
});
