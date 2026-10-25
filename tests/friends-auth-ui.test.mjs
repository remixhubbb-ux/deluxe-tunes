import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const friendsPage=readFileSync(new URL('../src/FriendsPage.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('Friends silently provisions a guest identity instead of requiring account sign-in',()=>{
  for(const source of [friendsPage,app]){
    assert.doesNotMatch(source,/This device account needs a one-time secure server connection/);
    assert.doesNotMatch(source,/Connect this device account/);
    assert.doesNotMatch(source,/Friends appear here after sign-in/);
    assert.doesNotMatch(source,/Connect a secure Deluxe Tunes (server )?account/);
    assert.doesNotMatch(source,/connectDeviceAccountToServer|verifyDeviceAccountPassword|FriendsAccountLinkForm/);
  }

  assert.doesNotMatch(app,/COMING_SOON|<ComingSoon\s*\/>/);
  assert.match(friendsPage,/friendsApi\("\/api\/auth\/guest"/);
  assert.match(friendsPage,/Your private guest profile is created automatically—no sign-in needed/);
  assert.match(friendsPage,/provisionError\.code==="FRIENDS_API_UNREACHABLE"/);
  assert.match(friendsPage,/The Friends server needs an update before guest profiles can connect/);
  assert.match(friendsPage,/Friends is temporarily unavailable\. Please try again later/);
  assert.match(friendsPage,/Friends couldn't be reached\. Check your connection and try again/);
  assert.match(friendsPage,/friendsAccessError/);
  assert.doesNotMatch(friendsPage,/authError\|\|error/);
  assert.match(app,/Continue without signing in/);
  assert.match(app,/provider:"device-only"/);
  assert.match(server,/pathname==='\/api\/auth\/guest'&&req\.method==='POST'/);
  assert.match(server,/friendsService\.createGuest\(friendsClientAddress\(req\)\)/);
  assert.match(server,/Max-Age=31536000/);
  assert.ok(server.indexOf("if(!origin||!FRIENDS_ALLOWED_ORIGINS.has(origin))")<
    server.indexOf("pathname==='/api/auth/guest'"),'guest provisioning must keep the Friends origin check');
});
