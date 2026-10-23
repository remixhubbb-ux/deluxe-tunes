import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  FRIENDS_SCHEMA_SQL,
  FRIENDS_DESKTOP_ORIGIN,
  FRIENDS_NATIVE_ORIGINS,
  getFriendsAllowedOrigins,
  FriendsService,
  getFriendsCookieName,
  getFriendsCookieOptions,
  isAccountRecordAdmin,
  isValidAdminPanelCode,
} from '../server/friendsService.mjs';

const userId = '9d22bc92-60ae-4dd2-87de-33fd33a4bedd';
const otherUserId = '44ea664e-b694-4d73-84b1-3610f30f037d';
const testPassword = 'correct-horse-battery-staple';

function makeAuthPool({loginRow = null, rateLimitAttempts = 1, duplicateAccount = false} = {}) {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({sql, values});
      if (sql.includes('INSERT INTO app_auth_rate_limits')) {
        return {rowCount: 1, rows: [{attempts: rateLimitAttempts}]};
      }
      return {rowCount: 1, rows: []};
    },
    release() {},
  };
  return {
    calls,
    pool: {
      async connect() { return client; },
      async query(sql, values = []) {
        calls.push({sql, values});
        if (sql.includes('INSERT INTO app_users')) {
          if (duplicateAccount) {
            const error = new Error('duplicate');
            error.code = '23505';
            throw error;
          }
          return {
            rowCount: 1,
            rows: [{
              id: userId,
              email: values[1],
              username: values[2],
              username_tag: values[3],
              display_name: values[4],
              bio: '',
              avatar_url: null,
              email_verified: false,
              password_hash: values[5],
              is_guest: sql.includes('TRUE, FALSE'),
              share_listening: false,
              share_streak: false,
              share_online_status: false,
              current_streak: 0,
            }],
          };
        }
        if (sql.includes('FROM app_users') && sql.includes('password_hash')) {
          return {rowCount: loginRow ? 1 : 0, rows: loginRow ? [loginRow] : []};
        }
        return {rowCount: 1, rows: []};
      },
    },
  };
}

test('Friends migrations preserve existing data while adding password authentication', () => {
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS app_users/);
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS app_auth_sessions/);
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS app_password_reset_tokens/);
  assert.match(FRIENDS_SCHEMA_SQL, /token_hash TEXT PRIMARY KEY/);
  assert.match(FRIENDS_SCHEMA_SQL, /app_password_reset_tokens_user_idx/);
  assert.match(FRIENDS_SCHEMA_SQL, /ADD COLUMN IF NOT EXISTS password_hash TEXT/);
  assert.match(FRIENDS_SCHEMA_SQL, /ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(FRIENDS_SCHEMA_SQL, /ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS app_auth_rate_limits/);
  assert.doesNotMatch(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS app_auth_challenges/);
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS friend_requests/);
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS friendships/);
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS user_blocks/);
  assert.match(FRIENDS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS admin_token_grants/);
  assert.match(FRIENDS_SCHEMA_SQL, /token_amount INTEGER NOT NULL CHECK \(token_amount = 5000\)/);
  assert.match(FRIENDS_SCHEMA_SQL, /ADD COLUMN IF NOT EXISTS share_online_status BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(FRIENDS_SCHEMA_SQL, /ADD COLUMN IF NOT EXISTS username_tag TEXT/);
  assert.match(FRIENDS_SCHEMA_SQL, /ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''/);
  assert.match(FRIENDS_SCHEMA_SQL, /app_users_username_tag_idx/);
  assert.match(FRIENDS_SCHEMA_SQL, /username_tag = RIGHT/);
  assert.match(FRIENDS_SCHEMA_SQL, /REFERENCES app_users\(id\) ON DELETE CASCADE/);
  assert.match(FRIENDS_SCHEMA_SQL, /friend_requests_pending_pair_idx/);
  assert.doesNotMatch(FRIENDS_SCHEMA_SQL, /\b(DROP TABLE|TRUNCATE|DELETE FROM app_users|DELETE FROM friendships)\b/i);
});

test('guest profiles are created without account credentials and receive a long-lived private session', async () => {
  const {pool, calls} = makeAuthPool();
  const service = new FriendsService({pool});
  const result = await service.createGuest('127.0.0.1');
  const insert = calls.find(call => call.sql.includes('INSERT INTO app_users'));
  const session = calls.find(call => call.sql.includes('INSERT INTO app_auth_sessions'));

  assert.equal(result.user.isGuest, true);
  assert.equal(result.user.emailVerified, false);
  assert.match(result.user.username, /^listener_[a-f0-9]{10}#[0-9]{4}$/);
  assert.match(insert.values[1], /^guest-[0-9a-f-]+@guest\.deluxetunes\.invalid$/);
  assert.equal(insert.values[5], undefined);
  assert.match(insert.sql, /is_guest/);
  assert.equal(session.values[2], 365);
  assert.match(session.values[0], /^[a-f0-9]{64}$/);
  assert.notEqual(session.values[0], result.token);
});

test('guest profile creation is rate-limited per source IP', async () => {
  const {pool, calls} = makeAuthPool({rateLimitAttempts: 21});
  const service = new FriendsService({pool});
  await assert.rejects(service.createGuest('127.0.0.1'), error => error.status === 429);
  assert.equal(calls.some(call => call.sql.includes('INSERT INTO app_users')), false);
});

test('server sessions use HttpOnly cookies and production-only Secure attributes', () => {
  assert.equal(getFriendsCookieName(), 'dt_friends_session');
  assert.match(getFriendsCookieOptions(false), /HttpOnly/);
  assert.match(getFriendsCookieOptions(false), /SameSite=Lax/);
  assert.doesNotMatch(getFriendsCookieOptions(false), /Secure/);
  assert.match(getFriendsCookieOptions(true), /HttpOnly/);
  assert.match(getFriendsCookieOptions(true), /SameSite=None/);
  assert.match(getFriendsCookieOptions(true), /Secure/);
});

test('account-record admin access uses a case-insensitive private email allowlist and rejects guests', () => {
  assert.equal(isAccountRecordAdmin({email: 'Admin@Example.com', isGuest: false}, 'admin@example.com'), true);
  assert.equal(isAccountRecordAdmin({email: 'other@example.com', isGuest: false}, 'admin@example.com'), false);
  assert.equal(isAccountRecordAdmin({email: 'admin@example.com', isGuest: true}, 'admin@example.com'), false);
  assert.equal(isAccountRecordAdmin({email: 'admin@example.com', isGuest: false}, ''), false);
});

test('account-record lookup matches exact email or UUID and returns only basic fields', async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({sql, values});
      return {
        rowCount: 1,
        rows: [{
          id: userId,
          email: 'admin@example.com',
          username: 'developeraccount',
          username_tag: '1234',
          display_name: 'Developer',
          created_at: new Date('2025-01-01T00:00:00Z'),
          password_hash: 'must-not-be-returned',
          session_token: 'must-not-be-returned',
        }],
      };
    },
  };
  const service = new FriendsService({pool});
  const byEmail = await service.getAccountRecord(' ADMIN@example.com ');
  assert.deepEqual(calls[0].values, ['admin@example.com']);
  assert.match(calls[0].sql, /WHERE LOWER\(email\) = \$1 LIMIT 1/);
  assert.deepEqual(byEmail, {
    id: userId,
    email: 'admin@example.com',
    username: 'developeraccount#1234',
    displayName: 'Developer',
    createdAt: new Date('2025-01-01T00:00:00Z'),
  });

  await service.getAccountRecord(userId);
  assert.deepEqual(calls[1].values, [userId]);
  assert.match(calls[1].sql, /WHERE id = \$1 LIMIT 1/);
  await assert.rejects(service.getAccountRecord('developeraccount'), error => error.status === 400);
  assert.equal(calls.length, 2);
});

test('desktop Friends requests use a dedicated non-opaque CORS origin', () => {
  assert.equal(FRIENDS_DESKTOP_ORIGIN, 'deluxetunes://app');
  assert.deepEqual(FRIENDS_NATIVE_ORIGINS, ['capacitor://localhost', 'https://localhost']);
});

test('explicit staging origins replace the production web origin while retaining desktop access', () => {
  const allowed = getFriendsAllowedOrigins({
    production: true,
    appOrigin: 'https://friends-preview.pages.dev',
    allowedOrigins: 'https://friends-preview.pages.dev',
  });
  assert.deepEqual([...allowed], ['https://friends-preview.pages.dev', FRIENDS_DESKTOP_ORIGIN, ...FRIENDS_NATIVE_ORIGINS]);
  assert.equal(allowed.has('https://deluxetunesapp.pages.dev'), false);
  assert.equal(allowed.has('https://attacker.example'), false);
  assert.equal(allowed.has('null'), false);
});

test('production defaults allow the production web origin and supported app origins', () => {
  const allowed = getFriendsAllowedOrigins({production: true});
  assert.deepEqual([...allowed], ['https://deluxetunesapp.pages.dev', FRIENDS_DESKTOP_ORIGIN, ...FRIENDS_NATIVE_ORIGINS]);
});

test('registration stores a bcrypt password hash, starts a session, and leaves email unverified', async () => {
  const {pool, calls} = makeAuthPool();
  const service = new FriendsService({pool});
  const result = await service.register({
    email: 'Listener@example.com',
    username: 'TuneListener',
    displayName: 'Tune Listener',
    password: testPassword,
  }, '127.0.0.1');

  assert.equal(result.user.id, userId);
  assert.match(result.user.username, /^tunelistener#[0-9]{4}$/);
  assert.equal(result.user.emailVerified, false);
  assert.equal(result.user.email, 'listener@example.com');
  assert.match(calls.find(call => call.sql.includes('INSERT INTO app_users')).values[5], /^\$2[aby]\$12\$/);
  assert.notEqual(calls.find(call => call.sql.includes('INSERT INTO app_users')).values[5], testPassword);
  const session = calls.find(call => call.sql.includes('INSERT INTO app_auth_sessions'));
  assert.match(session.values[0], /^[a-f0-9]{64}$/);
  assert.notEqual(session.values[0], result.token);
  assert.match(result.token, /^[A-Za-z0-9_-]{40,}$/);
});

test('registration rejects duplicate email or username without overwriting existing accounts', async () => {
  const {pool} = makeAuthPool({duplicateAccount: true});
  const service = new FriendsService({pool});
  await assert.rejects(
    service.register({
      email: 'listener@example.com',
      username: 'listener',
      username_tag: '1234',
      displayName: 'Listener',
      password: testPassword,
    }, '127.0.0.1'),
    error => error.status === 409 && /already in use/.test(error.message)
  );
});

test('registration validates email, username, and password before database access', async t => {
  const service = new FriendsService({pool: {async connect() { throw new Error('unexpected database access'); }}});
  await t.test('email', async () => assert.rejects(
    service.register({email: 'bad', username: 'listener', displayName: 'Listener', password: testPassword}, 'ip'),
    error => error.status === 400
  ));
  await t.test('username', async () => assert.rejects(
    service.register({email: 'listener@example.com', username: 'bad name', displayName: 'Listener', password: testPassword}, 'ip'),
    error => error.status === 400
  ));
  await t.test('password strength', async () => assert.rejects(
    service.register({email: 'listener@example.com', username: 'listener', displayName: 'Listener', password: 'short'}, 'ip'),
    error => error.status === 400
  ));
});

test('login accepts a username and verifies bcrypt before creating a session', async () => {
  const passwordHash = await bcrypt.hash(testPassword, 12);
  const {pool, calls} = makeAuthPool({
    loginRow: {
      id: userId,
      username: 'listener',
      display_name: 'Listener',
      avatar_url: null,
      email: 'listener@example.com',
      email_verified: false,
      password_hash: passwordHash,
      share_listening: false,
      share_streak: false,
      share_online_status: false,
      current_streak: 0,
    },
  });
  const service = new FriendsService({pool});
  const result = await service.signIn({identifier: 'Listener#1234', password: testPassword}, '127.0.0.1');
  assert.equal(result.user.id, userId);
  assert.equal(result.user.emailVerified, false);
  const emailLogin = await service.signIn({identifier: 'LISTENER@example.com', password: testPassword}, '127.0.0.2');
  assert.equal(emailLogin.user.id, userId);
  assert.ok(calls.some(call => call.sql.includes('INSERT INTO app_auth_sessions')));
  assert.ok(calls.some(call => call.sql.includes('FROM app_users') && call.values[1] === 'listener' && call.values[2] === '1234'));
  assert.ok(calls.some(call => call.sql.includes('FROM app_users') && call.values[0] === 'listener@example.com'));
});

test('login rejects invalid credentials and rate-limits repeated attempts', async t => {
  const validHash = await bcrypt.hash(testPassword, 12);
  const account = {
    id: userId,
    username: 'listener',
    username_tag: '1234',
    display_name: 'Listener',
    avatar_url: null,
    email_verified: false,
    password_hash: validHash,
  };
  await t.test('bad password', async () => {
    const {pool, calls} = makeAuthPool({loginRow: account});
    const service = new FriendsService({pool});
    await assert.rejects(
      service.signIn({identifier: 'listener#1234', password: 'incorrect-password'}, '127.0.0.1'),
      error => error.status === 401
    );
    assert.equal(calls.some(call => call.sql.includes('INSERT INTO app_auth_sessions')), false);
  });

  test('password reset issues only hashed expiring tokens for existing non-guest accounts', async t => {
    const email = 'existing@example.com';
    const account = {id: userId, email, is_guest: false};
    const calls = [];
    const tokens = new Map();
    let rateLimitAttempts = 1;
    const client = {
      async query(sql, values = []) {
        calls.push({sql, values});
        if (sql.includes('INSERT INTO app_auth_rate_limits')) return {rowCount: 1, rows: [{attempts: rateLimitAttempts}]};
        if (sql.includes('DELETE FROM app_password_reset_tokens WHERE user_id')) {
          for (const [tokenHash, row] of tokens) if (row.userId === values[0]) tokens.delete(tokenHash);
        } else if (sql.includes('INSERT INTO app_password_reset_tokens')) {
          tokens.set(values[0], {userId: values[1], expiresAt: Date.now() + 30 * 60_000});
        } else if (sql.includes('SELECT user_id FROM app_password_reset_tokens')) {
          const row = tokens.get(values[0]);
          return {rowCount: row && row.expiresAt > Date.now() ? 1 : 0, rows: row ? [{user_id: row.userId}] : []};
        } else if (sql.includes('UPDATE app_users SET password_hash')) {
          return {rowCount: values[0] === userId ? 1 : 0, rows: []};
        } else if (sql.includes('DELETE FROM app_password_reset_tokens WHERE token_hash')) {
          tokens.delete(values[0]);
        }
        return {rowCount: 1, rows: []};
      },
      release() {},
    };
    const pool = {
      async connect() { return client; },
      async query(sql, values = []) {
        calls.push({sql, values});
        if (sql.includes('SELECT id FROM app_users')) {
          return {rowCount: values[0] === email ? 1 : 0, rows: values[0] === email ? [{id: account.id}] : []};
        }
        return {rowCount: 1, rows: []};
      },
    };
    const service = new FriendsService({pool});

    const issued = await service.requestPasswordReset(email, '127.0.0.1');
    assert.equal(issued.email, email);
    assert.match(issued.token, /^[A-Za-z0-9_-]{43}$/);
    const inserted = calls.find(call => call.sql.includes('INSERT INTO app_password_reset_tokens'));
    assert.match(inserted.sql, /INTERVAL '30 minutes'/);
    assert.match(inserted.values[0], /^[a-f0-9]{64}$/);
    assert.notEqual(inserted.values[0], issued.token);
    assert.ok(calls.some(call =>
      call.sql.includes('SELECT id FROM app_users WHERE id = $1 FOR UPDATE') &&
      call.values[0] === userId
    ));
    assert.equal(tokens.size, 1);

    const resetTokenHash = inserted.values[0];
    await service.resetPassword(issued.token, 'a-new-secure-password');
    assert.ok(calls.some(call =>
      call.sql.includes('UPDATE app_users SET password_hash') &&
      call.values[0] === userId &&
      call.values[1] !== 'a-new-secure-password'
    ));
    assert.ok(calls.some(call => call.sql.includes('DELETE FROM app_auth_sessions WHERE user_id') && call.values[0] === userId));
    assert.equal(tokens.has(resetTokenHash), false);
    assert.equal(calls.some(call => /INSERT INTO app_users|DELETE FROM app_users|DELETE FROM friendships/.test(call.sql)), false);
    await assert.rejects(service.resetPassword(issued.token, 'another-new-password'), error => error.status === 400);

    await t.test('unknown emails create no reset token', async () => {
      const unknown = await service.requestPasswordReset('nobody@example.com', '127.0.0.1');
      assert.equal(unknown, null);
      assert.equal(tokens.size, 0);
    });

    await t.test('rate limits reset requests by IP and email', async () => {
      rateLimitAttempts = 4;
      await assert.rejects(service.requestPasswordReset(email, '127.0.0.2'), error => error.status === 429);
    });

    await t.test('expired reset token is rejected', async () => {
      rateLimitAttempts = 1;
      const expired = await service.requestPasswordReset(email, '127.0.0.3');
      const tokenHash = calls.findLast(call => call.sql.includes('INSERT INTO app_password_reset_tokens')).values[0];
      tokens.get(tokenHash).expiresAt = Date.now() - 1;
      await assert.rejects(service.resetPassword(expired.token, 'a-new-secure-password'), error => error.status === 400);
    });
  });
  await t.test('legacy account without a server password', async () => {
    const {pool, calls} = makeAuthPool({loginRow: {...account, password_hash: null}});
    const service = new FriendsService({pool});
    await assert.rejects(
      service.signIn({identifier: 'listener#1234', password: testPassword}, '127.0.0.1'),
      error => error.status === 401
    );
    assert.equal(calls.some(call => call.sql.includes('INSERT INTO app_auth_sessions')), false);
  });
  await t.test('rate limit', async () => {
    const {pool, calls} = makeAuthPool({rateLimitAttempts: 11, loginRow: account});
    const service = new FriendsService({pool});
    await assert.rejects(
      service.signIn({identifier: 'listener#1234', password: testPassword}, '127.0.0.1'),
      error => error.status === 429
    );
    assert.equal(calls.some(call => call.sql.includes('FROM app_users') && call.sql.includes('password_hash')), false);
  });
});

test('username search requires a complete tag and matches one exact account', async t => {
  const calls = [];
  const service = new FriendsService({
    pool: {
      async query(sql, values = []) {
        calls.push({sql, values});
        return {
          rowCount: 1,
          rows: [{
            id: otherUserId,
            username: 'listener',
            username_tag: '1234',
            display_name: 'Listener',
            bio: 'Into synth pop',
            avatar_url: null,
            is_friend: false,
            request_pending: false,
          }],
        };
      },
    },
  });

  await t.test('exact handle', async () => {
    const [match] = await service.searchUsers(userId, 'Listener#1234');
    assert.equal(match.username, 'listener#1234');
    assert.equal(match.bio, 'Into synth pop');
    assert.equal(calls.at(-1).values[1], 'listener');
    assert.equal(calls.at(-1).values[2], '1234');
  });
  await t.test('suffix is required', async () => {
    await assert.rejects(
      service.searchUsers(userId, 'listener'),
      error => error.status === 400 && /four-digit suffix/.test(error.message)
    );
  });
});

test('logout revokes the current session and expired sessions are rejected', async () => {
  const calls = [];
  const pool = {
    async query(sql, values = []) {
      calls.push({sql, values});
      if (sql.includes('FROM app_auth_sessions s')) return {rowCount: 0, rows: []};
      return {rowCount: 1, rows: []};
    },
  };
  const service = new FriendsService({pool});
  const token = 'one-time-session-token';
  assert.equal(await service.authenticate(token), null);
  await service.signOut(token);
  const revoke = calls.find(call => call.sql.includes('DELETE FROM app_auth_sessions WHERE token_hash'));
  assert.equal(revoke.values[0], crypto.createHash('sha256').update(token).digest('hex'));
});

test('each secure session resolves to its own server account', async () => {
  const accounts = new Map([
    [crypto.createHash('sha256').update('account-one-session').digest('hex'), {
      id: userId,
      email: 'one@example.com',
      username: 'accountone',
      display_name: 'Account One',
    }],
    [crypto.createHash('sha256').update('account-two-session').digest('hex'), {
      id: otherUserId,
      email: 'two@example.com',
      username: 'accounttwo',
      display_name: 'Account Two',
    }],
  ]);
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('FROM app_auth_sessions s')) {
        const account = accounts.get(values[0]);
        return {rowCount: account ? 1 : 0, rows: account ? [{
          ...account,
          email_verified: false,
          share_listening: false,
          share_streak: false,
          share_online_status: false,
          current_streak: 0,
        }] : []};
      }
      return {rowCount: 1, rows: []};
    },
  };
  const service = new FriendsService({pool});

  const firstSession = await service.authenticate('account-one-session');
  const secondSession = await service.authenticate('account-two-session');

  assert.equal(firstSession.id, userId);
  assert.equal(secondSession.id, otherUserId);
  assert.notEqual(firstSession.id, secondSession.id);
});

test('friend requests are created between the authenticated sender and the selected account', async () => {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({sql, values});
      if (sql.includes('SELECT id FROM app_users WHERE id = $1')) {
        return {rowCount: 1, rows: [{id: otherUserId}]};
      }
      if (sql.includes('SELECT id, username FROM app_users WHERE id IN')) {
        return {rowCount: 2, rows: [{id: userId, username: 'sender'}, {id: otherUserId, username: 'recipient'}]};
      }
      if (sql.includes('INSERT INTO friend_requests')) {
        return {rowCount: 1, rows: [{id: '4ec11394-5a13-4c52-935f-6a833e7922ad', created_at: new Date()}]};
      }
      return {rowCount: 0, rows: []};
    },
    release() {},
  };
  const service = new FriendsService({pool: {async connect() { return client; }}});

  const request = await service.sendRequest(userId, otherUserId);
  const insert = calls.find(call => call.sql.includes('INSERT INTO friend_requests'));
  assert.equal(request.id, '4ec11394-5a13-4c52-935f-6a833e7922ad');
  assert.equal(insert.values[1], userId);
  assert.equal(insert.values[2], otherUserId);
});

test('the authenticated recipient can accept a request and create one friendship', async () => {
  const calls = [];
  const requestId = '4ec11394-5a13-4c52-935f-6a833e7922ad';
  const client = {
    async query(sql, values = []) {
      calls.push({sql, values});
      if (sql.includes('SELECT id, sender_id, recipient_id FROM friend_requests')) {
        return {rowCount: 1, rows: [{id: requestId, sender_id: otherUserId, recipient_id: userId}]};
      }
      return {rowCount: 0, rows: []};
    },
    release() {},
  };
  const service = new FriendsService({pool: {async connect() { return client; }}});

  const result = await service.respondToRequest(userId, requestId, 'accept');
  const friendship = calls.find(call => call.sql.includes('INSERT INTO friendships'));
  const requestUpdate = calls.find(call => call.sql.includes('UPDATE friend_requests'));

  assert.deepEqual(result, {ok: true, status: 'accepted'});
  assert.deepEqual(friendship.values, [userId, otherUserId].sort());
  assert.equal(requestUpdate.values[0], requestId);
  assert.equal(requestUpdate.values[1], 'accepted');
});

test('the authenticated recipient can decline a request without creating a friendship', async () => {
  const calls = [];
  const requestId = '4ec11394-5a13-4c52-935f-6a833e7922ad';
  const client = {
    async query(sql, values = []) {
      calls.push({sql, values});
      if (sql.includes('SELECT id, sender_id, recipient_id FROM friend_requests')) {
        return {rowCount: 1, rows: [{id: requestId, sender_id: otherUserId, recipient_id: userId}]};
      }
      return {rowCount: 1, rows: []};
    },
    release() {},
  };
  const service = new FriendsService({pool: {async connect() { return client; }}});

  const result = await service.respondToRequest(userId, requestId, 'decline');
  const requestUpdate = calls.find(call => call.sql.includes('UPDATE friend_requests'));

  assert.deepEqual(result, {ok: true, status: 'declined'});
  assert.equal(requestUpdate.values[0], requestId);
  assert.equal(requestUpdate.values[1], 'declined');
  assert.equal(calls.some(call => call.sql.includes('INSERT INTO friendships')), false);
  assert.equal(calls.some(call => call.sql === 'COMMIT'), true);
});

test('profile usernames are validated before any database mutation', async () => {
  const pool = {
    async connect() { throw new Error('database must not be used for invalid usernames'); },
  };
  const service = new FriendsService({pool});
  await assert.rejects(
    service.updateProfile(userId, {
      username: 'bad name',
      bio: '',
      displayName: 'Listener',
      shareListening: false,
      shareStreak: false,
    }),
    error => error.status === 400 && /four-digit suffix/.test(error.message)
  );
});

test('profile updates preserve the full username suffix and save the public bio', async () => {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({sql, values});
      if (sql.includes('UPDATE app_users')) {
        return {
          rowCount: 1,
          rows: [{
            id: userId,
            email: 'listener@example.com',
            username: values[1],
            username_tag: values[2],
            display_name: values[3],
            bio: values[4],
            email_verified: false,
            share_listening: values[5],
            share_streak: values[6],
            share_online_status: values[7],
            current_streak: 0,
          }],
        };
      }
      return {rowCount: 1, rows: []};
    },
    release() {},
  };
  const service = new FriendsService({pool: {async connect() { return client; }}});
  const user = await service.updateProfile(userId, {
    username: 'listener#2048',
    displayName: 'Listener',
    bio: '  Synth   pop fan  ',
    shareListening: false,
    shareStreak: false,
    shareOnlineStatus: true,
  });
  const update = calls.find(call => call.sql.includes('UPDATE app_users'));

  assert.equal(user.username, 'listener#2048');
  assert.equal(user.bio, 'Synth pop fan');
  assert.equal(update.values[1], 'listener');
  assert.equal(update.values[2], '2048');
  assert.equal(update.values[4], 'Synth pop fan');
});

test('a request sender cannot accept the request on the recipient’s behalf', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('SELECT id, sender_id, recipient_id FROM friend_requests')) {
        return {
          rowCount: 1,
          rows: [{
            id: '4ec11394-5a13-4c52-935f-6a833e7922ad',
            sender_id: userId,
            recipient_id: '44ea664e-b694-4d73-84b1-3610f30f037d',
          }],
        };
      }
      return {rowCount: 1, rows: []};
    },
    release() {},
  };
  const service = new FriendsService({
    pool: {async connect() { return client; }},
  });

  await assert.rejects(
    service.respondToRequest(userId, '4ec11394-5a13-4c52-935f-6a833e7922ad', 'accept'),
    error => error.status === 404
  );
  assert.equal(calls.some(sql => sql.includes('INSERT INTO friendships')), false);
  assert.equal(calls.some(sql => sql.includes('UPDATE friend_requests')), false);
});

test('listening activity is omitted when a friend has not opted in', async () => {
  let friendQuery = '';
  const service = new FriendsService({
    pool: {
      async query(sql) {
        friendQuery = sql;
        return {
          rowCount: 1,
          rows: [{
            id: userId,
            username: 'listener',
            display_name: 'Listener',
            avatar_url: null,
            share_listening: false,
            share_streak: false,
            share_online_status: false,
            current_streak: 9,
            last_seen_at: new Date(),
            song_id: 'private-track',
            playing: true,
          }],
        };
      },
    },
  });

  const [friend] = await service.listFriends('44ea664e-b694-4d73-84b1-3610f30f037d');
  assert.match(friendQuery, /a\.user_id = u\.id AND u\.share_listening = TRUE/);
  assert.equal(friend.activity, null);
  assert.equal(friend.currentStreak, null);
  assert.equal(friend.online, null);
  assert.equal('email' in friend, false);
});

test('online status is shared only when the profile owner opts in', async () => {
  const service = new FriendsService({
    pool: {
      async query() {
        return {
          rowCount: 1,
          rows: [{
            id: userId,
            username: 'listener',
            display_name: 'Listener',
            avatar_url: null,
            share_listening: false,
            share_streak: false,
            share_online_status: false,
            current_streak: 0,
            last_seen_at: new Date(),
            is_self: false,
            is_friend: true,
            is_blocked: false,
          }],
        };
      },
    },
  });

  const profile = await service.getFriendProfile('44ea664e-b694-4d73-84b1-3610f30f037d', userId);
  assert.equal(profile.online, null);
});

test('online status is returned when the profile owner opts in', () => {
  const service = new FriendsService({pool: {}});
  const friend = service.friendCard({
    id: userId,
    username: 'listener',
    display_name: 'Listener',
    share_online_status: true,
    share_streak: false,
    share_listening: false,
    last_seen_at: new Date(),
  });
  assert.equal(friend.online, true);
});

test('admin panel code validation compares only a configured eight-digit server value',()=>{
  assert.equal(isValidAdminPanelCode('12345678','12345678'),true);
  assert.equal(isValidAdminPanelCode('12345678','87654321'),false);
  assert.equal(isValidAdminPanelCode('1234567','12345678'),false);
  assert.equal(isValidAdminPanelCode('123456789','12345678'),false);
  assert.equal(isValidAdminPanelCode('12345678',''),false);
});

test('admin token grants always credit the signed-in admin account by 5,000',async()=>{
  const queryCalls=[];
  const service=new FriendsService({pool:{async query(sql,values){
    queryCalls.push({sql,values});
    return {rowCount:1,rows:[{id:'grant-id',token_amount:5000,created_at:'now'}]};
  }}});
  const grant=await service.grantAdminTokens(userId);
  await service.grantAdminTokens(userId);
  assert.deepEqual(grant,{id:'grant-id',tokens:5000,createdAt:'now'});
  assert.equal(queryCalls.length,2);
  for(const call of queryCalls){
    assert.match(call.sql,/admin\.id, \$2, 5000/);
    assert.match(call.sql,/admin\.id = \$2 AND admin\.is_guest = FALSE/);
    assert.equal(call.values[1],userId);
  }
  assert.notEqual(queryCalls[0].values[0],queryCalls[1].values[0]);
  await assert.rejects(()=>service.grantAdminTokens('bad-id'),{status:400});
});

test('admin streak additions are repeatable and only modify the signed-in admin account',async()=>{
  let queryCall;
  const service=new FriendsService({pool:{async query(sql,values){
    queryCall={sql,values};
    return {rowCount:1,rows:[{id:userId,current_streak:12+values[1]}]};
  }}});
  const result=await service.addAdminStreak(userId,7);
  assert.deepEqual(result,{userId,currentStreak:19});
  assert.match(queryCall.sql,/current_streak = LEAST\(100000, current_streak \+ \$2\)/);
  assert.match(queryCall.sql,/WHERE id = \$1 AND is_guest = FALSE/);
  assert.deepEqual(queryCall.values,[userId,7]);
  await assert.rejects(()=>service.addAdminStreak(userId,0),{status:400});
  await assert.rejects(()=>service.addAdminStreak(userId,1.5),{status:400});
});
