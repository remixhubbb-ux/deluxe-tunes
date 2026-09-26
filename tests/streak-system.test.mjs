import assert from 'node:assert/strict';
import {
  computeCurrentStreak,
  diffCalendarDays,
  normalizeStreakState,
  updateStreakForListen,
} from '../src/streakLogic.js';

assert.equal(diffCalendarDays('2026-09-28', '2026-09-27'), 1, 'calendar day gaps should be counted as one day');
assert.equal(diffCalendarDays('2026-03-01', '2026-02-28'), 1, 'month boundaries should count as one day');
assert.equal(computeCurrentStreak(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-05']), 1, 'non-consecutive listening days should not form a full streak');
assert.equal(computeCurrentStreak(['2026-09-03', '2026-09-04', '2026-09-05']), 3, 'consecutive listening days should count as a streak');

const resetResult = updateStreakForListen({
  current: 18,
  longest: 42,
  lastActiveDay: '2026-09-25',
  days: ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-25'],
  history: [42, 31, 17],
  milestonesReached: [3, 7, 14, 30],
}, new Date(2026, 8, 27));
assert.equal(resetResult.state.current, 1, 'a missed calendar day should reset the current streak');
assert.equal(resetResult.state.longest, 42, 'the longest streak should remain unchanged after a reset');
assert.deepEqual(resetResult.triggeredMilestones, [], 'a reset should not trigger a milestone celebration');

const milestoneResult = updateStreakForListen({
  current: 6,
  longest: 6,
  lastActiveDay: '2026-09-06',
  days: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'],
  history: [],
  milestonesReached: [3],
}, new Date(2026, 8, 7));
assert.equal(milestoneResult.state.current, 7, 'a 7-day streak should advance the current streak count');
assert.deepEqual(milestoneResult.triggeredMilestones, [7], 'hitting a milestone should report it once');

const normalized = normalizeStreakState({
  current: 0,
  longest: 0,
  lastActiveDay: null,
  days: ['2026-09-01', '2026-09-02', '2026-09-02', '2026-09-03'],
  history: [42, 31, 17],
  milestonesReached: [3, 7],
});
assert.equal(normalized.current, 3, 'missing current state should be rebuilt from the actual day history');
assert.deepEqual(normalized.days, ['2026-09-01', '2026-09-02', '2026-09-03'], 'duplicate days should be deduplicated');

console.log('streak system checks passed');
