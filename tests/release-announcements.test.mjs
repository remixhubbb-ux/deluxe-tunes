import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildReleaseWebhookPayload,
  createReleaseCataloguePoller,
  createReleaseAnnouncementService,
  fetchReleaseCatalog,
  getWebhookRetryDelayMs,
  MAX_WEBHOOK_ATTEMPTS,
  normalizeReleaseSong,
  parseBundledSongCatalog,
  sendDiscordReleaseWebhookTest,
} from '../releaseAnnouncements.mjs';

const bundledCatalogue = parseBundledSongCatalog(readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8'));
assert.ok(bundledCatalogue.length > 50, 'the parser should read the full bundled catalogue from its source of truth');
assert.deepEqual(bundledCatalogue[0], {
  id: 'clash-dave-stormzy',
  title: 'Clash',
  artist: 'Dave x Stormzy',
  artwork: '/images/clash-dave-stormzy.png',
});
assert.ok(bundledCatalogue.some(song => song.id === 'sprinter-dave-central-cee'), 'generated catalogue source should retain Sprinter');
assert.deepEqual(Object.keys(bundledCatalogue[0]).sort(), ['artist', 'artwork', 'id', 'title'], 'catalogue schema should remain unchanged');

function createMemoryStore(now = () => Date.now()) {
  const songs = new Map();
  let initialized = false;
  return {
    songs,
    async initializeBaseline(catalogue, announceIds = new Set()) {
      if (initialized) return false;
      initialized = true;
      for (const song of catalogue) if (!announceIds.has(song.id)) songs.set(song.id, { ...song, status: 'baseline' });
      return true;
    },
    async claimBaseline(song) {
      const previous = songs.get(song.id);
      if (!previous || previous.status !== 'baseline') return false;
      const attemptCount = (previous.attemptCount || 0) + 1;
      songs.set(song.id, { ...previous, ...song, status: 'sending', attemptCount });
      return { attemptCount };
    },
    async claim(song, currentTime = now()) {
      const previous = songs.get(song.id);
      if (previous && (previous.status !== 'failed' || (previous.nextAttemptAt ?? 0) > currentTime || previous.attemptCount >= MAX_WEBHOOK_ATTEMPTS)) return false;
      const attemptCount = (previous?.attemptCount || 0) + 1;
      songs.set(song.id, { ...previous, ...song, status: 'sending', attemptCount, nextAttemptAt: null });
      return { attemptCount };
    },
    async markSent(id, details = {}) { Object.assign(songs.get(id), details, { status: 'sent' }); },
    async markRetryable(id, details = {}) { Object.assign(songs.get(id), details, { status: 'failed' }); },
    async markRejected(id, details = {}) { Object.assign(songs.get(id), details, { status: 'rejected' }); },
    async markUncertain(id, details = {}) { Object.assign(songs.get(id), details, { status: 'uncertain' }); },
  };
}

const appLinkBase = 'https://deluxetunesapp.pages.dev';
const existingCatalogue = [
  { id: 'catalogue-track', title: 'Existing Song', artist: 'Existing Artist', artwork: '/images/existing.png' },
];
const store = createMemoryStore();
const requests = [];
const fetchImpl = async (url, options) => {
  requests.push({ url, options, body: JSON.parse(options.body) });
  return { ok: true, status: 204 };
};
const service = createReleaseAnnouncementService({
  store,
  webhookUrl: 'https://discord.example/webhook/secret-token',
  appLinkBase,
  fetchImpl,
});

const baselineResult = await service.announceCatalog(existingCatalogue);
assert.equal(baselineResult.baseline, true, 'the existing catalogue should be recorded as a quiet baseline');
assert.equal(requests.length, 0, 'baseline catalog entries must not be announced');

const addedSong = {
  id: 'future-release-2026',
  title: 'Future Release',
  artist: 'New Artist',
  artwork: '/images/future-release.png',
};
const nextCatalogue = [...existingCatalogue, addedSong];
const firstNewReleaseService = createReleaseAnnouncementService({
  store,
  webhookUrl: 'https://discord.example/webhook/secret-token',
  appLinkBase,
  fetchImpl,
});
assert.equal((await firstNewReleaseService.announceCatalog(nextCatalogue)).announced, 1);
assert.equal((await service.announceCatalog(nextCatalogue)).announced, 0);
assert.equal(requests.length, 1, 'a repeated sync or backend service restart must not duplicate the announcement');
assert.equal(requests[0].url, 'https://discord.example/webhook/secret-token', 'the backend should deliver directly to its configured webhook');
assert.equal(requests[0].body.embeds[0].title, '🎵 Future Release');
assert.match(requests[0].body.embeds[0].description, /New Artist/);
assert.equal(requests[0].body.embeds[0].author.name, 'DELUXE TUNES  •  NEW RELEASE');
assert.equal(requests[0].body.embeds[0].image.url, 'https://deluxetunesapp.pages.dev/images/future-release.png');
assert.equal('thumbnail' in requests[0].body.embeds[0], false, 'large album artwork should use Discord image rendering, not a tiny thumbnail');
assert.equal(requests[0].body.embeds[0].url, 'https://deluxetunesapp.pages.dev/');
assert.match(requests[0].body.embeds[0].description, /\[▶ Open in Deluxe Tunes\]\(https:\/\/deluxetunesapp\.pages\.dev\/\)/);
assert.doesNotMatch(JSON.stringify(requests[0].body), /\?song=/, 'announcement payload must not link to a song-specific query URL');
assert.equal(requests[0].body.embeds[0].footer.text, 'DELUXE TUNES  •  FRESH MUSIC');
assert.deepEqual(requests[0].body.allowed_mentions, { parse: [] });
assert.equal(JSON.stringify(await service.announceCatalog(nextCatalogue)).includes('secret-token'), false, 'service results must not expose the webhook URL');

const backfillStore = createMemoryStore();
const backfillPosts = [];
const backfillService = createReleaseAnnouncementService({
  store: backfillStore,
  webhookUrl: 'https://discord.example/webhook/not-real',
  appLinkBase,
  fetchImpl: async (_url, options) => { backfillPosts.push(JSON.parse(options.body)); return { ok: true, status: 204 }; },
});
const previouslyBaselined = [existingCatalogue[0], addedSong];
assert.equal((await backfillService.announceCatalog(previouslyBaselined)).baseline, true);
assert.equal(backfillPosts.length, 0, 'baseline-only initialization remains silent without explicit IDs');
const targetedResult = await backfillService.announceCatalog(previouslyBaselined, { announceBaselineIds: [addedSong.id] });
assert.equal(targetedResult.announced, 1, 'an explicit ID may be safely promoted from baseline to announced');
assert.equal(backfillPosts.length, 1);
assert.equal(backfillPosts[0].embeds[0].title, '🎵 Future Release');
assert.equal((await backfillService.announceCatalog(previouslyBaselined, { announceBaselineIds: [addedSong.id] })).announced, 0);
assert.equal(backfillPosts.length, 1, 'targeted baseline promotion must remain one-time across future scans');

const noArtwork = normalizeReleaseSong({ id: 'plain-track', title: 'Plain Track', artist: 'Artist' }, appLinkBase);
assert.equal(noArtwork.artwork, null);
assert.equal('thumbnail' in buildReleaseWebhookPayload(noArtwork).embeds[0], false, 'artwork should be omitted when unavailable');
assert.equal('image' in buildReleaseWebhookPayload(noArtwork).embeds[0], false, 'embed image should be omitted when artwork is unavailable');
assert.equal(normalizeReleaseSong({ id: 'bad/id', title: 'Invalid', artist: 'Artist' }, appLinkBase), null);

let testWebhookCallCount = 0;
let testWebhookRequest;
const testWebhookResult = await sendDiscordReleaseWebhookTest({
  webhookUrl: 'https://discord.com/api/webhooks/123456/test-token',
  fetchImpl: async (url, options) => {
    testWebhookCallCount++;
    testWebhookRequest = { url: String(url), options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ id: 'test-message', channel_id: 'test-channel', guild_id: 'test-guild' }) };
  },
});
assert.equal(testWebhookCallCount, 1, 'test mode must send exactly one message');
assert.equal(new URL(testWebhookRequest.url).searchParams.get('wait'), 'true');
assert.match(testWebhookRequest.body.content, /TEST — NOT A RELEASE ANNOUNCEMENT/);
assert.match(testWebhookRequest.body.content, /No catalogue or release baseline was changed/);
assert.deepEqual(testWebhookResult, { messageId: 'test-message', channelId: 'test-channel', guildId: 'test-guild' });
await assert.rejects(
  sendDiscordReleaseWebhookTest({ webhookUrl: 'https://example.com/api/webhooks/123/token', fetchImpl: async () => { throw new Error('should not post'); } }),
  /HTTPS Discord webhook URL/,
);
await assert.rejects(sendDiscordReleaseWebhookTest({ webhookUrl: '' }), /not configured/);

assert.equal(getWebhookRetryDelayMs(1), 60_000, 'first transient failure should back off for one minute');
assert.equal(getWebhookRetryDelayMs(3), 4 * 60_000, 'transient retries should use exponential backoff');
assert.equal(getWebhookRetryDelayMs(9), 60 * 60_000, 'retry delay should be capped at one hour');
assert.equal(getWebhookRetryDelayMs(9, 2 * 60 * 60_000), 2 * 60 * 60_000, 'a longer Discord Retry-After deadline should be honored');

let fakeNow = 0;
const retryStore = createMemoryStore(() => fakeNow);
const retryRequests = [];
const retryService = createReleaseAnnouncementService({
  store: retryStore,
  webhookUrl: 'https://discord.example/webhook/not-real',
  appLinkBase,
  now: () => fakeNow,
  fetchImpl: async () => {
    retryRequests.push(fakeNow);
    return retryRequests.length === 1
      ? { ok: false, status: 503, headers: { get: () => null } }
      : { ok: true, status: 204 };
  },
});
await retryService.announceCatalog(existingCatalogue);
assert.equal((await retryService.announceCatalog(nextCatalogue)).announced, 0, 'a rejected delivery should be scheduled for retry');
assert.equal(retryRequests.length, 1);
assert.equal((await retryService.announceCatalog(nextCatalogue)).announced, 0, 'a retry should not run before its backoff deadline');
assert.equal(retryRequests.length, 1);
fakeNow = 60_000;
assert.equal((await retryService.announceCatalog(nextCatalogue)).announced, 1, 'a transient failure should retry successfully when due');
assert.equal(retryRequests.length, 2);
assert.equal((await retryService.announceCatalog(nextCatalogue)).announced, 0, 'successful retry should be deduplicated on later scans');

let rateLimitNow = 0;
const rateLimitStore = createMemoryStore(() => rateLimitNow);
let rateLimitAttempts = 0;
const rateLimitService = createReleaseAnnouncementService({
  store: rateLimitStore,
  webhookUrl: 'https://discord.example/webhook/not-real',
  appLinkBase,
  now: () => rateLimitNow,
  fetchImpl: async () => {
    rateLimitAttempts++;
    return rateLimitAttempts === 1
      ? { ok: false, status: 429, headers: { get: () => null }, json: async () => ({ retry_after: 90 }) }
      : { ok: true, status: 204 };
  },
});
await rateLimitService.announceCatalog(existingCatalogue);
await rateLimitService.announceCatalog(nextCatalogue);
rateLimitNow = 89_999;
await rateLimitService.announceCatalog(nextCatalogue);
assert.equal(rateLimitAttempts, 1, '429 retry_after must be honored');
rateLimitNow = 90_000;
assert.equal((await rateLimitService.announceCatalog(nextCatalogue)).announced, 1);
assert.equal(rateLimitAttempts, 2);

const sharedStore = createMemoryStore();
let concurrentPosts = 0;
const concurrentServiceOptions = {
  store: sharedStore,
  webhookUrl: 'https://discord.example/webhook/not-real',
  appLinkBase,
  fetchImpl: async () => { concurrentPosts++; return { ok: true, status: 204 }; },
};
const instanceA = createReleaseAnnouncementService(concurrentServiceOptions);
const instanceB = createReleaseAnnouncementService(concurrentServiceOptions);
await instanceA.announceCatalog(existingCatalogue);
await Promise.all([
  instanceA.announceCatalog(nextCatalogue),
  instanceB.announceCatalog(nextCatalogue),
]);
assert.equal(concurrentPosts, 1, 'shared persistent claims should prevent duplicate posts from concurrent backend instances');

const uncertainStore = createMemoryStore();
let uncertainPosts = 0;
const uncertainService = createReleaseAnnouncementService({
  store: uncertainStore,
  webhookUrl: 'https://discord.example/webhook/not-real',
  appLinkBase,
  fetchImpl: async () => { uncertainPosts++; throw new Error('simulated timeout'); },
});
await uncertainService.announceCatalog(existingCatalogue);
await uncertainService.announceCatalog(nextCatalogue);
await uncertainService.announceCatalog(nextCatalogue);
assert.equal(uncertainPosts, 1, 'ambiguous transport failures should not be retried and risk a duplicate');
assert.equal(uncertainStore.songs.get(addedSong.id).status, 'uncertain');

let intervalCallback;
let intervalDelay;
let clearedInterval = false;
const runtimeStore = createMemoryStore();
const runtimeRequests = [];
const runtimeService = createReleaseAnnouncementService({
  store: runtimeStore,
  webhookUrl: 'https://discord.example/webhook/not-real',
  appLinkBase,
  fetchImpl: async (_url, options) => {
    runtimeRequests.push(JSON.parse(options.body));
    return { ok: true, status: 204 };
  },
});
const mutableCatalogue = [...existingCatalogue];
const manifestRequests = [];
let manifestClock = 0;
const poller = createReleaseCataloguePoller({
  intervalMs: 30_000,
  scan: async () => runtimeService.announceCatalog(await fetchReleaseCatalog(
    'https://deluxetunesapp.pages.dev/song-catalog.json',
    {
      now: () => ++manifestClock,
      fetchImpl: async (url, options) => {
        manifestRequests.push({ url: String(url), options });
        return { ok: true, json: async () => ({ songs: mutableCatalogue }) };
      },
    },
  )),
  setIntervalImpl(callback, delay) {
    intervalCallback = callback;
    intervalDelay = delay;
    return { unref() {} };
  },
  clearIntervalImpl() { clearedInterval = true; },
});
poller.start();
assert.equal(intervalDelay, 30_000);
await poller.scan();
mutableCatalogue.push(addedSong);
await intervalCallback();
assert.equal(runtimeRequests.length, 1, 'a running poll should detect a song added after the silent baseline');
assert.match(manifestRequests[0].url, /_scan=1$/);
assert.match(manifestRequests[1].url, /_scan=2$/, 'each poll should bypass intermediate catalogue caches');
assert.equal(manifestRequests[0].options.cache, 'no-store');
await intervalCallback();
assert.equal(runtimeRequests.length, 1, 'later polls must not announce the same song twice');
await poller.stop();
assert.equal(clearedInterval, true, 'poller shutdown should clear its interval');

let finishOverlappingScan;
let overlappingScanCount = 0;
const overlappingPoller = createReleaseCataloguePoller({
  scan: () => {
    overlappingScanCount++;
    return new Promise(resolve => { finishOverlappingScan = resolve; });
  },
});
const firstScan = overlappingPoller.scan();
const overlappingScan = overlappingPoller.scan();
assert.equal(firstScan, overlappingScan, 'overlapping scan requests should share one in-flight scan');
await Promise.resolve();
assert.equal(overlappingScanCount, 1);
let stopCompleted = false;
const stopPromise = overlappingPoller.stop().then(() => { stopCompleted = true; });
await Promise.resolve();
assert.equal(stopCompleted, false, 'shutdown should await an active catalogue scan');
finishOverlappingScan();
await stopPromise;
assert.equal(stopCompleted, true);

console.log('release announcement checks passed');
