import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export const FRIENDS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY,
    google_sub TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    username TEXT,
    username_tag TEXT,
    display_name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    password_hash TEXT,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    share_listening BOOLEAN NOT NULL DEFAULT FALSE,
    share_streak BOOLEAN NOT NULL DEFAULT FALSE,
    share_online_status BOOLEAN NOT NULL DEFAULT FALSE,
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE app_users ALTER COLUMN google_sub DROP NOT NULL;
  ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE app_users ADD COLUMN IF NOT EXISTS username_tag TEXT;
  ALTER TABLE app_users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
  ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS share_online_status BOOLEAN NOT NULL DEFAULT FALSE;
  UPDATE app_users
  SET username_tag = RIGHT('0000' || (ABS(hashtext(id::text)::bigint) % 10000)::text, 4)
  WHERE username IS NOT NULL AND (username_tag IS NULL OR username_tag !~ '^[0-9]{4}$');
  DROP INDEX IF EXISTS app_users_username_lower_idx;
  CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_tag_idx
    ON app_users (LOWER(username), username_tag) WHERE username IS NOT NULL;
  CREATE TABLE IF NOT EXISTS app_auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS app_auth_sessions_user_idx ON app_auth_sessions(user_id);
  CREATE TABLE IF NOT EXISTS app_password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS app_password_reset_tokens_user_idx
    ON app_password_reset_tokens(user_id);
  CREATE TABLE IF NOT EXISTS app_auth_rate_limits (
    key_hash TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (sender_id <> recipient_id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_pair_idx
    ON friend_requests (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id))
    WHERE status = 'pending';
  CREATE INDEX IF NOT EXISTS friend_requests_recipient_idx
    ON friend_requests(recipient_id, status, created_at DESC);
  CREATE TABLE IF NOT EXISTS friendships (
    user_low UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    user_high UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_low, user_high),
    CHECK (user_low < user_high)
  );
  CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
  );
  CREATE TABLE IF NOT EXISTS listening_activity (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    song_id TEXT,
    playing BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS admin_token_grants (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_amount INTEGER NOT NULL CHECK (token_amount = 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS admin_token_grants_recipient_idx
    ON admin_token_grants(recipient_id, created_at);
`;

export const FRIENDS_DESKTOP_ORIGIN = 'deluxetunes://app';
export const FRIENDS_NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost'];

export function getFriendsAllowedOrigins({production, appOrigin, allowedOrigins} = {}) {
  const configuredOrigins = String(allowedOrigins || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return new Set([
    ...(configuredOrigins.length ? configuredOrigins : ['https://deluxetunesapp.pages.dev']),
    FRIENDS_DESKTOP_ORIGIN,
    ...FRIENDS_NATIVE_ORIGINS,
    ...(appOrigin && (!production || appOrigin.startsWith('https://')) ? [appOrigin] : []),
    ...(!production ? ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'] : []),
  ]);
}

const SESSION_COOKIE = 'dt_friends_session';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const safeName = (name, fallback = 'Deluxe Listener') => {
  const value = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 48);
  return value || fallback;
};
const parseUsername = value => {
  const match = String(value || '').trim().toLowerCase().match(/^([a-z0-9_]{3,20})(?:#([0-9]{4}))?$/);
  return match ? {name: match[1], tag: match[2] || null} : null;
};
const formatUsername = row => row.username
  ? `${row.username}#${String(row.username_tag || '').padStart(4, '0')}`
  : '';
const safeBio = value => (value === undefined || value === null)
  ? ''
  : typeof value === 'string' && value.length <= 160
  ? value.trim().replace(/\s+/g, ' ')
  : null;
const safeEmail = value => typeof value === 'string' && value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const safePassword = value => typeof value === 'string' &&
  Buffer.byteLength(value, 'utf8') >= 12 && Buffer.byteLength(value, 'utf8') <= 72;
const isUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
const orderedPair = (left, right) => left < right ? [left, right] : [right, left];
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);

export function getFriendsCookieName() {
  return SESSION_COOKIE;
}

export function getFriendsCookieOptions(production) {
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=' + (production ? 'None' : 'Lax'),
    ...(production ? ['Secure', 'Partitioned'] : []),
  ].join('; ');
}

export function isAccountRecordAdmin(user, configuredEmails = process.env.ACCOUNT_RECORD_ADMIN_EMAILS) {
  if (!user || user.isGuest || typeof user.email !== 'string') return false;
  const allowedEmails = new Set(
    String(configuredEmails || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  );
  return allowedEmails.has(user.email.trim().toLowerCase());
}

export function isValidAdminPanelCode(provided, configured = process.env.ADMIN_PANEL_ACCESS_CODE) {
  if (typeof provided !== 'string' || typeof configured !== 'string') return false;
  const candidate = provided.trim();
  const expected = configured.trim();
  if (!/^\d{8}$/.test(candidate) || !/^\d{8}$/.test(expected)) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export class FriendsService {
  constructor({pool}) {
    this.pool = pool;
  }

  async enforceAuthRateLimit(keys) {
    const client = await this.pool.connect();
    let blocked = false;
    try {
      await client.query('BEGIN');
      for (const {value, limit} of keys) {
        const result = await client.query(
          `INSERT INTO app_auth_rate_limits (key_hash, attempts, window_started_at)
           VALUES ($1, 1, NOW())
           ON CONFLICT (key_hash) DO UPDATE SET
             attempts = CASE
               WHEN app_auth_rate_limits.window_started_at <= NOW() - INTERVAL '15 minutes' THEN 1
               ELSE app_auth_rate_limits.attempts + 1
             END,
             window_started_at = CASE
               WHEN app_auth_rate_limits.window_started_at <= NOW() - INTERVAL '15 minutes' THEN NOW()
               ELSE app_auth_rate_limits.window_started_at
             END
           RETURNING attempts`,
          [hash(value)]
        );
        if (Number(result.rows[0]?.attempts) > limit) blocked = true;
      }
      await client.query(
        `DELETE FROM app_auth_rate_limits
         WHERE window_started_at <= NOW() - INTERVAL '1 day'`
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (blocked) {
      const error = new Error('Too many account attempts. Please wait 15 minutes and try again.');
      error.status = 429;
      throw error;
    }
  }

  async createSession(userId, lifetimeDays = 30) {
    const token = crypto.randomBytes(32).toString('base64url');
    await this.pool.query('DELETE FROM app_auth_sessions WHERE expires_at <= NOW()');
    await this.pool.query(
      `INSERT INTO app_auth_sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day'))`,
      [hash(token), userId, lifetimeDays]
    );
    return token;
  }

  async createGuest(ipAddress) {
    await this.enforceAuthRateLimit([{value: `guest:ip:${ipAddress}`, limit: 20}]);
    let result;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const id = crypto.randomUUID();
      const username = `listener_${crypto.randomBytes(5).toString('hex')}`;
      const usernameTag = String(crypto.randomInt(0, 10_000)).padStart(4, '0');
      const email = `guest-${id}@guest.deluxetunes.invalid`;
      try {
        result = await this.pool.query(
          `INSERT INTO app_users
             (id, email, username, username_tag, display_name, is_guest, email_verified)
           VALUES ($1, $2, $3, $4, $5, TRUE, FALSE)
           RETURNING id, email, username, username_tag, display_name, bio, avatar_url, email_verified,
                     is_guest, share_listening, share_streak, share_online_status, current_streak`,
          [id, email, username, usernameTag, `Listener ${username.slice(-4)}`]
        );
        break;
      } catch (error) {
        if (error?.code !== '23505') throw error;
      }
    }
    if (!result) {
      const error = new Error('Could not create a guest Friends profile. Please try again.');
      error.status = 503;
      throw error;
    }
    const user = this.publicUser(result.rows[0]);
    return {user, token: await this.createSession(user.id, 365)};
  }

  async register({email, username, displayName, password}, ipAddress) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const parsedUsername = parseUsername(username);
    const name = safeName(displayName || parsedUsername?.name, '');
    if (!safeEmail(normalizedEmail)) {
      const error = new Error('Enter a valid email address.');
      error.status = 400;
      throw error;
    }
    if (!parsedUsername) {
      const error = new Error('Usernames must be 3–20 letters, numbers, or underscores, optionally followed by # and four digits.');
      error.status = 400;
      throw error;
    }
    if (!name) {
      const error = new Error('Enter a display name.');
      error.status = 400;
      throw error;
    }
    if (!safePassword(password)) {
      const error = new Error('Use a password that is at least 12 characters and no more than 72 bytes.');
      error.status = 400;
      throw error;
    }

    await this.enforceAuthRateLimit([
      {value: `register:ip:${ipAddress}`, limit: 5},
      {value: `register:email:${normalizedEmail}`, limit: 3},
    ]);
    const passwordHash = await bcrypt.hash(password, 12);
    let result;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const usernameTag = parsedUsername.tag || String(crypto.randomInt(0, 10_000)).padStart(4, '0');
      try {
        result = await this.pool.query(
          `INSERT INTO app_users
             (id, email, username, username_tag, display_name, password_hash, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, FALSE)
           RETURNING id, email, username, username_tag, display_name, bio, avatar_url, email_verified,
                     is_guest, share_listening, share_streak, share_online_status, current_streak`,
          [crypto.randomUUID(), normalizedEmail, parsedUsername.name, usernameTag, name, passwordHash]
        );
        break;
      } catch (error) {
        if (error?.code !== '23505') throw error;
        if (error.constraint === 'app_users_username_tag_idx' && !parsedUsername.tag) continue;
        const conflict = new Error('That email or username is already in use.');
        conflict.status = 409;
        throw conflict;
      }
    }
    if (!result) {
      const conflict = new Error('Could not assign a unique four-digit username suffix. Please try again.');
      conflict.status = 409;
      throw conflict;
    }
    const user = this.publicUser(result.rows[0]);
    return {user, token: await this.createSession(user.id)};
  }

  async signIn({identifier, password}, ipAddress) {
    const normalizedIdentifier = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    const parsedUsername = parseUsername(normalizedIdentifier);
    if (!normalizedIdentifier || normalizedIdentifier.length > 254 ||
        (!safeEmail(normalizedIdentifier) && !parsedUsername?.tag) ||
        typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      const error = new Error('Enter a valid email or username and password.');
      error.status = 400;
      throw error;
    }
    await this.enforceAuthRateLimit([
      {value: `login:ip:${ipAddress}`, limit: 30},
      {value: `login:identity:${normalizedIdentifier}`, limit: 10},
    ]);
    const result = await this.pool.query(
      `SELECT id, email, username, username_tag, display_name, bio, avatar_url, email_verified, password_hash, is_guest,
              share_listening, share_streak, share_online_status, current_streak
       FROM app_users
       WHERE LOWER(email) = $1 OR (LOWER(username) = $2 AND username_tag = $3)
       LIMIT 1`,
      [normalizedIdentifier, parsedUsername?.name || '', parsedUsername?.tag || '']
    );
    const row = result.rows[0];
    const validPassword = await bcrypt.compare(password, row?.password_hash || DUMMY_PASSWORD_HASH);
    if (!row?.password_hash || !validPassword) {
      const error = new Error('The email/username or password is incorrect.');
      error.status = 401;
      throw error;
    }
    const user = this.publicUser(row);
    return {user, token: await this.createSession(user.id)};
  }

  async requestPasswordReset(email, ipAddress) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!safeEmail(normalizedEmail)) {
      const error = new Error('Enter a valid email address.');
      error.status = 400;
      throw error;
    }

    await this.enforceAuthRateLimit([
      {value: `password-reset:ip:${ipAddress}`, limit: 10},
      {value: `password-reset:email:${normalizedEmail}`, limit: 3},
    ]);

    const account = await this.pool.query(
      `SELECT id FROM app_users
       WHERE LOWER(email) = $1 AND is_guest = FALSE
       LIMIT 1`,
      [normalizedEmail]
    );
    if (!account.rowCount) return null;

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hash(token);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const lockedAccount = await client.query(
        'SELECT id FROM app_users WHERE id = $1 FOR UPDATE',
        [account.rows[0].id]
      );
      if (!lockedAccount.rowCount) {
        await client.query('COMMIT');
        return null;
      }
      await client.query('DELETE FROM app_password_reset_tokens WHERE user_id = $1', [account.rows[0].id]);
      await client.query(
        `INSERT INTO app_password_reset_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [tokenHash, account.rows[0].id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return {email: normalizedEmail, token};
  }

  async resetPassword(token, password, ipAddress = 'unknown') {
    await this.enforceAuthRateLimit([
      {value: `password-reset-confirm:ip:${ipAddress}`, limit: 20},
    ]);
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      const error = new Error('This password-reset link is invalid or has expired.');
      error.status = 400;
      throw error;
    }
    if (!safePassword(password)) {
      const error = new Error('Use a password that is at least 12 characters and no more than 72 bytes.');
      error.status = 400;
      throw error;
    }

    const tokenHash = hash(token);
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reset = await client.query(
        `SELECT user_id FROM app_password_reset_tokens
         WHERE token_hash = $1 AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash]
      );
      if (!reset.rowCount) {
        const error = new Error('This password-reset link is invalid or has expired.');
        error.status = 400;
        throw error;
      }

      const userId = reset.rows[0].user_id;
      const updated = await client.query(
        'UPDATE app_users SET password_hash = $2 WHERE id = $1 AND is_guest = FALSE',
        [userId, passwordHash]
      );
      if (!updated.rowCount) {
        const error = new Error('This password-reset link is invalid or has expired.');
        error.status = 400;
        throw error;
      }
      await client.query('DELETE FROM app_password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      await client.query('DELETE FROM app_auth_sessions WHERE user_id = $1', [userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return {ok: true};
  }

  async authenticate(token) {
    if (!token || token.length > 200) return null;
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.username, u.username_tag, u.display_name, u.bio, u.avatar_url, u.email_verified, u.is_guest, u.share_listening,
              u.share_streak, u.share_online_status, u.current_streak
       FROM app_auth_sessions s
       JOIN app_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [hash(token)]
    );
    if (!result.rowCount) return null;
    await this.pool.query('UPDATE app_users SET last_seen_at = NOW() WHERE id = $1', [result.rows[0].id]);
    return this.publicUser(result.rows[0]);
  }

  async signOut(token) {
    if (token) await this.pool.query('DELETE FROM app_auth_sessions WHERE token_hash = $1', [hash(token)]);
  }

  publicUser(row) {
    return {
      id: row.id,
      email: row.email,
      username: formatUsername(row),
      displayName: row.display_name,
      bio: row.bio || '',
      avatar: row.avatar_url || '',
      isGuest: Boolean(row.is_guest),
      emailVerified: Boolean(row.email_verified),
      shareListening: Boolean(row.share_listening),
      shareStreak: Boolean(row.share_streak),
      shareOnlineStatus: Boolean(row.share_online_status),
      currentStreak: Number(row.current_streak) || 0,
      needsProfile: !row.username,
    };
  }

  async getMe(userId) {
    const result = await this.pool.query(
      `SELECT id, email, username, username_tag, display_name, bio, avatar_url, email_verified, is_guest, share_listening, share_streak,
              share_online_status, current_streak
       FROM app_users WHERE id = $1`,
      [userId]
    );
    return this.publicUser(result.rows[0]);
  }

  async getAccountRecord(lookup) {
    const value = typeof lookup === 'string' ? lookup.trim() : '';
    const byId = isUuid(value);
    const byEmail = safeEmail(value);
    if (!byId && !byEmail) {
      const error = new Error('Enter an exact account email address or account ID.');
      error.status = 400;
      throw error;
    }
    const result = await this.pool.query(
      byId
        ? `SELECT id, email, username, username_tag, display_name, created_at
           FROM app_users WHERE id = $1 LIMIT 1`
        : `SELECT id, email, username, username_tag, display_name, created_at
           FROM app_users WHERE LOWER(email) = $1 LIMIT 1`,
      [value.toLowerCase()]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      username: formatUsername(row) || null,
      displayName: row.display_name,
      createdAt: row.created_at,
    };
  }

  async grantAdminTokens(adminId) {
    if (!isUuid(adminId)) {
      const error = new Error('A valid signed-in admin account is required.');
      error.status = 400;
      throw error;
    }
    const result = await this.pool.query(
      `INSERT INTO admin_token_grants (id, recipient_id, admin_id, token_amount)
       SELECT $1, admin.id, $2, 5000
       FROM app_users AS admin
       WHERE admin.id = $2 AND admin.is_guest = FALSE
       RETURNING id, token_amount, created_at`,
      [crypto.randomUUID(), adminId]
    );
    if (!result.rowCount) {
      const error = new Error('The selected account was not found.');
      error.status = 404;
      throw error;
    }
    const grant = result.rows[0];
    return {id: grant.id, tokens: Number(grant.token_amount), createdAt: grant.created_at};
  }

  async getAdminTokenGrants(userId) {
    const result = await this.pool.query(
      `SELECT id, token_amount, created_at
       FROM admin_token_grants
       WHERE recipient_id = $1
       ORDER BY created_at, id`,
      [userId]
    );
    return result.rows.map(grant => ({
      id: grant.id,
      tokens: Number(grant.token_amount),
      createdAt: grant.created_at,
    }));
  }

  async addAdminStreak(userId, days) {
    if (!isUuid(userId) || !Number.isSafeInteger(days) || days < 1 || days > 100_000) {
      const error = new Error('Choose between 1 and 100,000 whole days to add.');
      error.status = 400;
      throw error;
    }
    const result = await this.pool.query(
      `UPDATE app_users
       SET current_streak = LEAST(100000, current_streak + $2), last_seen_at = NOW()
       WHERE id = $1 AND is_guest = FALSE
       RETURNING id, current_streak`,
      [userId, days]
    );
    if (!result.rowCount) {
      const error = new Error('The signed-in admin account was not found.');
      error.status = 404;
      throw error;
    }
    return {userId: result.rows[0].id, currentStreak: Number(result.rows[0].current_streak)};
  }

  async updateProfile(userId, body) {
    const parsedUsername = parseUsername(body?.username);
    const displayName = safeName(body?.displayName, '');
    const bio = safeBio(body?.bio);
    if (!parsedUsername?.tag) {
      const error = new Error('Enter a username with a four-digit suffix, such as Listener#1234.');
      error.status = 400;
      throw error;
    }
    if (bio === null) {
      const error = new Error('Your bio must be 160 characters or fewer.');
      error.status = 400;
      throw error;
    }
    if (!displayName) {
      const error = new Error('Enter a display name.');
      error.status = 400;
      throw error;
    }
    if (typeof body.shareListening !== 'boolean' || typeof body.shareStreak !== 'boolean' ||
        typeof body.shareOnlineStatus !== 'boolean') {
      const error = new Error('Choose whether to share listening activity, your streak, and online status.');
      error.status = 400;
      throw error;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE app_users
         SET username = $2, username_tag = $3, display_name = $4, bio = $5,
             share_listening = $6, share_streak = $7, share_online_status = $8, last_seen_at = NOW()
         WHERE id = $1
         RETURNING id, email, username, username_tag, display_name, bio, avatar_url, email_verified, is_guest, share_listening, share_streak,
                   share_online_status, current_streak`,
        [userId, parsedUsername.name, parsedUsername.tag, displayName, bio, body.shareListening, body.shareStreak, body.shareOnlineStatus]
      );
      if (!result.rowCount) {
        const error = new Error('Your account could not be found.');
        error.status = 404;
        throw error;
      }
      if (!body.shareListening) {
        await client.query('DELETE FROM listening_activity WHERE user_id = $1', [userId]);
      }
      await client.query('COMMIT');
      return this.publicUser(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error?.code === '23505') {
        const conflict = new Error('That username is already taken.');
        conflict.status = 409;
        throw conflict;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async setPresence(userId, body) {
    const streak = Number(body?.currentStreak);
    if (!Number.isSafeInteger(streak) || streak < 0 || streak > 100_000) {
      const error = new Error('The current streak must be a non-negative whole number.');
      error.status = 400;
      throw error;
    }
    const songId = typeof body?.songId === 'string' && /^[a-zA-Z0-9._-]{1,120}$/.test(body.songId) ? body.songId : null;
    const playing = body?.playing === true && Boolean(songId);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query(
        `UPDATE app_users SET current_streak = $2, last_seen_at = NOW()
         WHERE id = $1 RETURNING share_listening`,
        [userId, streak]
      );
      if (!user.rowCount) {
        const error = new Error('Your account could not be found.');
        error.status = 404;
        throw error;
      }
      if (user.rows[0].share_listening && songId) {
        await client.query(
          `INSERT INTO listening_activity (user_id, song_id, playing, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id) DO UPDATE
           SET song_id = EXCLUDED.song_id, playing = EXCLUDED.playing, updated_at = NOW()`,
          [userId, songId, playing]
        );
      } else {
        await client.query('DELETE FROM listening_activity WHERE user_id = $1', [userId]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return {ok: true};
  }

  async searchUsers(userId, query) {
    const normalized = parseUsername(query);
    if (!normalized?.tag) {
      const error = new Error('Enter a username with a four-digit suffix, such as Listener#1234.');
      error.status = 400;
      throw error;
    }
    const result = await this.pool.query(
      `SELECT u.id, u.username, u.username_tag, u.display_name, u.bio, u.avatar_url,
              EXISTS (
                SELECT 1 FROM friendships f
                WHERE (f.user_low = $1 AND f.user_high = u.id)
                   OR (f.user_high = $1 AND f.user_low = u.id)
              ) AS is_friend,
              EXISTS (
                SELECT 1 FROM friend_requests r
                WHERE r.status = 'pending' AND (
                  (r.sender_id = $1 AND r.recipient_id = u.id)
                  OR (r.sender_id = u.id AND r.recipient_id = $1)
                )
              ) AS request_pending
       FROM app_users u
       WHERE u.id <> $1 AND u.username IS NOT NULL
         AND LOWER(u.username) = $2 AND u.username_tag = $3
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks b
           WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
              OR (b.blocker_id = u.id AND b.blocked_id = $1)
         )
       ORDER BY LOWER(u.username) LIMIT 10`,
      [userId, normalized.name, normalized.tag]
    );
    return result.rows.map(row => ({
      id: row.id,
      username: formatUsername(row),
      displayName: row.display_name,
      bio: row.bio || '',
      avatar: row.avatar_url || '',
      isFriend: row.is_friend,
      requestPending: row.request_pending,
    }));
  }

  async listFriends(userId) {
    const result = await this.pool.query(
      `SELECT u.id, u.username, u.username_tag, u.display_name, u.bio, u.avatar_url, u.share_listening,
              u.share_streak, u.share_online_status, u.current_streak, u.last_seen_at,
              a.song_id, a.playing, a.updated_at AS activity_updated_at
       FROM friendships f
       JOIN app_users u ON u.id = CASE WHEN f.user_low = $1 THEN f.user_high ELSE f.user_low END
       LEFT JOIN listening_activity a
         ON a.user_id = u.id AND u.share_listening = TRUE
        AND a.updated_at > NOW() - INTERVAL '5 minutes'
       WHERE f.user_low = $1 OR f.user_high = $1
       ORDER BY LOWER(u.display_name)`,
      [userId]
    );
    return result.rows.map(row => this.friendCard(row));
  }

  friendCard(row) {
    return {
      id: row.id,
      username: formatUsername(row),
      displayName: row.display_name,
      bio: row.bio || '',
      avatar: row.avatar_url || '',
      online: row.share_online_status
        ? new Date(row.last_seen_at).getTime() > Date.now() - 90_000
        : null,
      currentStreak: row.share_streak ? Number(row.current_streak) || 0 : null,
      activity: row.share_listening && row.song_id ? {
        songId: row.song_id,
        playing: Boolean(row.playing),
        updatedAt: row.activity_updated_at,
      } : null,
    };
  }

  async listRequests(userId) {
    const result = await this.pool.query(
      `SELECT r.id, r.sender_id, r.recipient_id, r.created_at,
              u.username, u.username_tag, u.display_name, u.bio, u.avatar_url
       FROM friend_requests r
       JOIN app_users u ON u.id = CASE WHEN r.sender_id = $1 THEN r.recipient_id ELSE r.sender_id END
       WHERE r.status = 'pending' AND (r.sender_id = $1 OR r.recipient_id = $1)
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return result.rows.map(row => ({
      id: row.id,
      direction: row.sender_id === userId ? 'outgoing' : 'incoming',
      user: {id: row.sender_id === userId ? row.recipient_id : row.sender_id, username: formatUsername(row), displayName: row.display_name, bio: row.bio || '', avatar: row.avatar_url || ''},
      createdAt: row.created_at,
    }));
  }

  async sendRequest(userId, targetId) {
    if (!isUuid(targetId) || targetId === userId) {
      const error = new Error('Choose another user to send a friend request.');
      error.status = 400;
      throw error;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const target = await client.query('SELECT id FROM app_users WHERE id = $1', [targetId]);
      if (!target.rowCount) {
        const error = new Error('That user could not be found.');
        error.status = 404;
        throw error;
      }
      const users = await client.query(
        'SELECT id, username FROM app_users WHERE id IN ($1, $2) ORDER BY id FOR UPDATE',
        [userId, targetId]
      );
      if (users.rowCount !== 2 || users.rows.some(user => !user.username)) {
        const error = new Error('Both users need a Friends profile before sending a request.');
        error.status = 409;
        throw error;
      }
      const blocked = await client.query(
        `SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
        [userId, targetId]
      );
      if (blocked.rowCount) {
        const error = new Error('A friend request cannot be sent between these users.');
        error.status = 403;
        throw error;
      }
      const friends = await client.query(
        'SELECT 1 FROM friendships WHERE user_low = LEAST($1::uuid, $2::uuid) AND user_high = GREATEST($1::uuid, $2::uuid)',
        [userId, targetId]
      );
      if (friends.rowCount) {
        const error = new Error('You are already friends.');
        error.status = 409;
        throw error;
      }
      const pending = await client.query(
        `SELECT sender_id, recipient_id FROM friend_requests
         WHERE status = 'pending' AND
           ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))`,
        [userId, targetId]
      );
      if (pending.rowCount) {
        const error = new Error(pending.rows[0].recipient_id === userId ? 'This person has already sent you a request.' : 'A request is already pending.');
        error.status = 409;
        throw error;
      }
      const request = await client.query(
        `INSERT INTO friend_requests (id, sender_id, recipient_id)
         VALUES ($1, $2, $3) RETURNING id, created_at`,
        [crypto.randomUUID(), userId, targetId]
      );
      await client.query('COMMIT');
      return {id: request.rows[0].id, createdAt: request.rows[0].created_at};
    } catch (error) {
      await client.query('ROLLBACK');
      if (error?.code === '23505') {
        const conflict = new Error('A friend request is already pending.');
        conflict.status = 409;
        throw conflict;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async respondToRequest(userId, requestId, action) {
    if (!isUuid(requestId) || !['accept', 'decline', 'cancel'].includes(action)) {
      const error = new Error('That friend request action is invalid.');
      error.status = 400;
      throw error;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const initial = await client.query(
        'SELECT id, sender_id, recipient_id FROM friend_requests WHERE id = $1 AND status = $2',
        [requestId, 'pending']
      );
      const initialRequest = initial.rows[0];
      if (!initialRequest || (action === 'cancel' ? initialRequest.sender_id !== userId : initialRequest.recipient_id !== userId)) {
        const error = new Error('That pending request is unavailable.');
        error.status = 404;
        throw error;
      }
      await client.query(
        'SELECT id FROM app_users WHERE id IN ($1, $2) ORDER BY id FOR UPDATE',
        [initialRequest.sender_id, initialRequest.recipient_id]
      );
      const locked = await client.query(
        'SELECT id, sender_id, recipient_id FROM friend_requests WHERE id = $1 AND status = $2 FOR UPDATE',
        [requestId, 'pending']
      );
      const request = locked.rows[0];
      if (!request || (action === 'cancel' ? request.sender_id !== userId : request.recipient_id !== userId)) {
        const error = new Error('That pending request is unavailable.');
        error.status = 404;
        throw error;
      }
      if (action === 'accept') {
        const blocked = await client.query(
          `SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
          [userId, request.sender_id]
        );
        if (blocked.rowCount) {
          const error = new Error('This request cannot be accepted while either user is blocked.');
          error.status = 403;
          throw error;
        }
        const [low, high] = orderedPair(userId, request.sender_id);
        await client.query(
          'INSERT INTO friendships (user_low, user_high) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [low, high]
        );
      }
      const status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
      await client.query(
        'UPDATE friend_requests SET status = $2, updated_at = NOW() WHERE id = $1',
        [requestId, status]
      );
      await client.query('COMMIT');
      return {ok: true, status};
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeFriend(userId, targetId) {
    if (!isUuid(targetId)) {
      const error = new Error('That friend could not be found.');
      error.status = 400;
      throw error;
    }
    const [low, high] = orderedPair(userId, targetId);
    const result = await this.pool.query(
      'DELETE FROM friendships WHERE user_low = $1 AND user_high = $2 RETURNING user_low',
      [low, high]
    );
    if (!result.rowCount) {
      const error = new Error('That friendship does not exist.');
      error.status = 404;
      throw error;
    }
    return {ok: true};
  }

  async listBlocks(userId) {
    const result = await this.pool.query(
      `SELECT u.id, u.username, u.username_tag, u.display_name, u.bio, u.avatar_url
       FROM user_blocks b JOIN app_users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY LOWER(u.display_name)`,
      [userId]
    );
    return result.rows.map(row => ({id: row.id, username: formatUsername(row), displayName: row.display_name, avatar: row.avatar_url || ''}));
  }

  async blockUser(userId, targetId) {
    if (!isUuid(targetId) || targetId === userId) {
      const error = new Error('Choose another user to block.');
      error.status = 400;
      throw error;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const target = await client.query('SELECT id FROM app_users WHERE id = $1', [targetId]);
      if (!target.rowCount) {
        const error = new Error('That user could not be found.');
        error.status = 404;
        throw error;
      }
      await client.query(
        'SELECT id FROM app_users WHERE id IN ($1, $2) ORDER BY id FOR UPDATE',
        [userId, targetId]
      );
      await client.query(
        'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, targetId]
      );
      const [low, high] = orderedPair(userId, targetId);
      await client.query('DELETE FROM friendships WHERE user_low = $1 AND user_high = $2', [low, high]);
      await client.query(
        `UPDATE friend_requests SET status = 'cancelled', updated_at = NOW()
         WHERE status = 'pending' AND
          ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))`,
        [userId, targetId]
      );
      await client.query('COMMIT');
      return {ok: true};
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async unblockUser(userId, targetId) {
    if (!isUuid(targetId)) {
      const error = new Error('That user could not be found.');
      error.status = 400;
      throw error;
    }
    const result = await this.pool.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 RETURNING blocker_id',
      [userId, targetId]
    );
    if (!result.rowCount) {
      const error = new Error('That block does not exist.');
      error.status = 404;
      throw error;
    }
    return {ok: true};
  }

  async getFriendProfile(userId, targetId) {
    if (!isUuid(targetId)) {
      const error = new Error('That profile could not be found.');
      error.status = 404;
      throw error;
    }
    const result = await this.pool.query(
      `SELECT u.id, u.username, u.username_tag, u.display_name, u.bio, u.avatar_url, u.share_listening,
              u.share_streak, u.share_online_status, u.current_streak, u.last_seen_at,
              a.song_id, a.playing, a.updated_at AS activity_updated_at,
              (u.id = $1) AS is_self,
              EXISTS (
                SELECT 1 FROM friendships f
                WHERE (f.user_low = $1 AND f.user_high = u.id)
                   OR (f.user_high = $1 AND f.user_low = u.id)
              ) AS is_friend,
              EXISTS (
                SELECT 1 FROM user_blocks b
                WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
                   OR (b.blocker_id = u.id AND b.blocked_id = $1)
              ) AS is_blocked
       FROM app_users u
       LEFT JOIN listening_activity a ON a.user_id = u.id
        AND u.share_listening = TRUE AND a.updated_at > NOW() - INTERVAL '5 minutes'
       WHERE u.id = $2`,
      [userId, targetId]
    );
    const row = result.rows[0];
    if (!row || (!row.is_self && (!row.is_friend || row.is_blocked))) {
      const error = new Error('That profile is not available.');
      error.status = 404;
      throw error;
    }
    return {
      id: row.id,
      username: formatUsername(row),
      displayName: row.display_name,
      bio: row.bio || '',
      avatar: row.avatar_url || '',
      online: row.share_online_status
        ? new Date(row.last_seen_at).getTime() > Date.now() - 90_000
        : null,
      currentStreak: row.share_streak ? Number(row.current_streak) || 0 : null,
      activity: row.share_listening && row.song_id ? {songId: row.song_id, playing: Boolean(row.playing), updatedAt: row.activity_updated_at} : null,
    };
  }
}
