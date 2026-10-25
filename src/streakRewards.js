import { addCalendarDays, diffCalendarDays, getLocalDateKey } from "./streakLogic.js";

export const STREAK_REWARD_MILESTONES = [
  { days: 30, tokens: 100 },
  { days: 60, tokens: 200 },
  { days: 90, tokens: 300 },
  { days: 100, tokens: 500 },
  { days: 180, tokens: 1000 },
  { days: 365, tokens: 2500 },
  { days: 500, tokens: 4000 },
  { days: 730, tokens: 6000 },
];

export function getActiveStreakDays(streak = {}, today = new Date()) {
  const days = new Set(Array.isArray(streak.days) ? streak.days : []);
  const lastActiveDay = streak.lastActiveDay || [...days].sort().at(-1);
  if (!lastActiveDay || !days.has(lastActiveDay)) return [];
  const gap = diffCalendarDays(getLocalDateKey(today), lastActiveDay);
  if (gap < 0 || gap > 1) return [];

  const activeDays = [];
  let cursor = lastActiveDay;
  while (days.has(cursor)) {
    activeDays.push(cursor);
    cursor = addCalendarDays(cursor, -1);
  }
  return activeDays.reverse();
}

function normalizeRewardEntries(entries, allowedIds) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  return entries.filter((entry) => {
    if (
      !entry ||
      !allowedIds(entry.id) ||
      seen.has(entry.id) ||
      !Number.isInteger(entry.tokens) ||
      entry.tokens <= 0 ||
      (entry.status !== "available" && entry.status !== "claimed")
    ) return false;
    seen.add(entry.id);
    return true;
  });
}

export function reconcileStreakRewards(store = {}, streak = {}, today = new Date(), random = Math.random) {
  const rewards = store.rewards && typeof store.rewards === "object" ? store.rewards : {};
  const daily = normalizeRewardEntries(rewards.daily, (id) => typeof id === "string" && /^daily:\d{4}-\d{2}-\d{2}$/.test(id));
  const milestones = normalizeRewardEntries(rewards.milestones, (id) => typeof id === "string" && /^milestone:\d+$/.test(id));
  const dailyIds = new Set(daily.map((reward) => reward.id));
  const milestoneIds = new Set(milestones.map((reward) => reward.id));

  getActiveStreakDays(streak, today).forEach((date, index) => {
    const streakDay = index + 1;
    const id = `daily:${date}`;
    if (streakDay < 2 || dailyIds.has(id)) return;
    const roll = Number(random());
    const tokens = 3 + Math.min(4, Math.max(0, Math.floor((Number.isFinite(roll) ? roll : 0) * 5)));
    daily.push({ id, date, streakDay, tokens, status: "available" });
    dailyIds.add(id);
  });

  const activeDayCount = getActiveStreakDays(streak, today).length;
  STREAK_REWARD_MILESTONES.forEach(({ days, tokens }) => {
    const id = `milestone:${days}`;
    if (activeDayCount < days || milestoneIds.has(id)) return;
    milestones.push({ id, days, tokens, status: "available" });
    milestoneIds.add(id);
  });

  if (store.rewards?.daily === daily && store.rewards?.milestones === milestones) return store;
  const existingDaily = rewards.daily || [];
  const existingMilestones = rewards.milestones || [];
  if (daily.length === existingDaily.length && milestones.length === existingMilestones.length) return store;
  return { ...store, rewards: { ...rewards, daily, milestones } };
}

export function getAvailableRewardCount(rewards = {}) {
  const daily = Array.isArray(rewards.daily) ? rewards.daily : [];
  const milestones = Array.isArray(rewards.milestones) ? rewards.milestones : [];
  return [...daily, ...milestones].filter((reward) => reward?.status === "available").length;
}

export function claimStreakRewards(store = {}, rewardIds) {
  const ids = new Set(Array.isArray(rewardIds) ? rewardIds : [rewardIds]);
  const claimedIds = new Set();
  let tokensEarned = 0;
  const rewards = store.rewards || { daily: [], milestones: [] };
  const claim = (list = []) => list.map((reward) => {
    if (reward?.status !== "available" || !ids.has(reward.id) || claimedIds.has(reward.id)) return reward;
    claimedIds.add(reward.id);
    tokensEarned += reward.tokens;
    return { ...reward, status: "claimed" };
  });
  const daily = claim(rewards.daily);
  const milestones = claim(rewards.milestones);
  if (!tokensEarned) return { store, tokensEarned: 0 };
  return {
    store: {
      ...store,
      balance: Math.max(0, Math.floor(Number(store.balance) || 0)) + tokensEarned,
      rewards: { ...rewards, daily, milestones },
    },
    tokensEarned,
  };
}
