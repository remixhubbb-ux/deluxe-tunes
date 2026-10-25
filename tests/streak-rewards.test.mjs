import assert from 'node:assert/strict';
import {
  claimStreakRewards,
  getActiveStreakDays,
  getAvailableRewardCount,
  reconcileStreakRewards,
  STREAK_REWARD_MILESTONES,
} from '../src/streakRewards.js';
import { addCalendarDays } from '../src/streakLogic.js';

const today = new Date(2026, 9, 21);
const todayKey = '2026-10-21';
const makeStreak = (length) => {
  const lastActiveDay = todayKey;
  const days = Array.from({ length }, (_, index) => addCalendarDays(lastActiveDay, index - length + 1));
  return { current: length, longest: length, lastActiveDay, days };
};

const sixteenDayStreak = makeStreak(16);
assert.equal(getActiveStreakDays(sixteenDayStreak, today).length, 16, 'current streak length should use consecutive local calendar dates');
const firstDayRewards = reconcileStreakRewards(
  { balance: 0, rewards: { daily: [], milestones: [] } },
  makeStreak(1),
  today,
  () => 0.5,
);
assert.deepEqual(firstDayRewards.rewards.daily, [], 'the streak starting day should not create a daily reward');
let rolls = 0;
const earnedStore = reconcileStreakRewards(
  { balance: 0, rewards: { daily: [], milestones: [] } },
  sixteenDayStreak,
  today,
  () => { rolls += 1; return 0.999; },
);
assert.equal(earnedStore.rewards.daily.length, 15, 'a 16-day streak should create 15 daily rewards');
assert.ok(earnedStore.rewards.daily.every((reward) => reward.tokens === 7), 'daily reward amounts should be between 3 and 7');
assert.equal(rolls, 15, 'each earned daily reward amount should be generated once');
assert.equal(getAvailableRewardCount(earnedStore.rewards), 15, 'all generated daily rewards should be claimable');

const reloadedStore = reconcileStreakRewards(earnedStore, sixteenDayStreak, today, () => {
  throw new Error('reload must not reroll saved daily rewards');
});
assert.strictEqual(reloadedStore, earnedStore, 'reloading should preserve saved reward amounts');

const oneDailyReward = earnedStore.rewards.daily[0];
const claimedSingle = claimStreakRewards(earnedStore, oneDailyReward.id);
assert.equal(claimedSingle.tokensEarned, oneDailyReward.tokens, 'individual claim should grant only the selected reward');
assert.equal(claimedSingle.store.balance, oneDailyReward.tokens, 'individual claim should update the shared token balance');
const persistedSingle = JSON.parse(JSON.stringify(claimedSingle.store));
assert.equal(persistedSingle.rewards.daily[0].status, 'claimed', 'claimed state should survive persistence and reload');
assert.equal(claimStreakRewards(persistedSingle, oneDailyReward.id).tokensEarned, 0, 'a persisted claim must not be duplicated');

const claimedAll = claimStreakRewards(earnedStore, earnedStore.rewards.daily.map((reward) => reward.id));
assert.equal(claimedAll.tokensEarned, 105, 'Claim All should grant the sum of all available rewards');
assert.equal(claimedAll.store.balance, 105, 'claimed rewards should update the shared balance');
assert.ok(claimedAll.store.rewards.daily.every((reward) => reward.status === 'claimed'), 'Claim All should mark every reward claimed');
const duplicateClaim = claimStreakRewards(claimedAll.store, earnedStore.rewards.daily.map((reward) => reward.id));
assert.equal(duplicateClaim.tokensEarned, 0, 'already claimed rewards must not be claimed twice');
assert.strictEqual(duplicateClaim.store, claimedAll.store, 'duplicate claims must not change persisted state');

const milestoneStore = reconcileStreakRewards(
  { balance: 0, rewards: { daily: [], milestones: [] } },
  makeStreak(30),
  today,
  () => 0,
);
const beforeMilestone = reconcileStreakRewards(
  { balance: 0, rewards: { daily: [], milestones: [] } },
  makeStreak(29),
  today,
  () => 0,
);
assert.deepEqual(beforeMilestone.rewards.milestones, [], 'milestones should remain locked until their exact streak requirement is reached');
assert.equal(milestoneStore.rewards.milestones.length, 1, 'the 30-day milestone should unlock at day 30');
assert.deepEqual(milestoneStore.rewards.milestones[0], {
  id: 'milestone:30', days: 30, tokens: 100, status: 'available',
}, 'milestone should be stored as a claimable one-time reward');
assert.strictEqual(reconcileStreakRewards(milestoneStore, makeStreak(30), today), milestoneStore, 'reconciling a reached milestone should not create duplicate bonuses');
assert.ok(STREAK_REWARD_MILESTONES.some(({ days }) => days === 60));
assert.ok(STREAK_REWARD_MILESTONES.some(({ days }) => days === 90));
assert.ok(STREAK_REWARD_MILESTONES.some(({ days }) => days === 100));
assert.ok(STREAK_REWARD_MILESTONES.some(({ days }) => days === 180));
assert.ok(STREAK_REWARD_MILESTONES.some(({ days }) => days === 365));
const claimedMilestone = claimStreakRewards(milestoneStore, 'milestone:30');
assert.equal(claimedMilestone.tokensEarned, 100, 'milestone claim should grant its bonus');
assert.equal(claimStreakRewards(claimedMilestone.store, 'milestone:30').tokensEarned, 0, 'milestone bonuses must not be claimable twice');

const missedDayStreak = {
  ...sixteenDayStreak,
  lastActiveDay: addCalendarDays(todayKey, -2),
};
const missedDayRewards = reconcileStreakRewards(
  { balance: 0, rewards: { daily: [], milestones: [] } },
  missedDayStreak,
  today,
  () => 0.5,
);
assert.deepEqual(missedDayRewards.rewards.daily, [], 'missed calendar days should not generate fresh rewards for an inactive streak');
const retainedRewards = reconcileStreakRewards(claimedAll.store, missedDayStreak, today, () => 0.5);
assert.equal(retainedRewards.rewards.daily.length, 15, 'earned rewards should remain claimable or recorded after a streak resets');

console.log('streak rewards checks passed');
