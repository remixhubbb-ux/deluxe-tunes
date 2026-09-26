export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 180, 365];

export function getLocalDateKey(date = new Date()) {
  const next = new Date(date);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateFromKey(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function addCalendarDays(value, offset) {
  const base = toDateFromKey(value);
  if (!base) return value;
  base.setDate(base.getDate() + offset);
  return getLocalDateKey(base);
}

export function diffCalendarDays(a, b) {
  const left = toDateFromKey(a);
  const right = toDateFromKey(b);
  if (!left || !right) return 0;
  const aUtc = Date.UTC(left.getFullYear(), left.getMonth(), left.getDate());
  const bUtc = Date.UTC(right.getFullYear(), right.getMonth(), right.getDate());
  return Math.round((aUtc - bUtc) / 86400000);
}

function sortedUniqueDays(days = []) {
  return [...new Set((Array.isArray(days) ? days : []).filter(Boolean).map(String))].sort();
}

export function computeCurrentStreak(dayKeys = []) {
  const uniqueDays = sortedUniqueDays(dayKeys);
  if (!uniqueDays.length) return 0;

  let cursor = uniqueDays[uniqueDays.length - 1];
  let streak = 0;
  const daySet = new Set(uniqueDays);

  while (daySet.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }

  return streak;
}

export function normalizeStreakState(raw = {}) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const days = sortedUniqueDays(safe.days);
  const history = Array.isArray(safe.history)
    ? safe.history.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
    : [];
  const milestonesReached = Array.isArray(safe.milestonesReached)
    ? safe.milestonesReached.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
    : [];

  const lastActiveDay = typeof safe.lastActiveDay === 'string' && days.includes(safe.lastActiveDay)
    ? safe.lastActiveDay
    : (days.length ? days[days.length - 1] : null);

  const derivedCurrent = computeCurrentStreak(days);
  const hasCurrent = safe.current !== undefined && safe.current !== null && safe.current !== '';
  const current = hasCurrent && Number(safe.current) > 0 ? Number(safe.current) : derivedCurrent;
  const longest = Number.isFinite(Number(safe.longest)) && Number(safe.longest) > 0 ? Number(safe.longest) : Math.max(current, 0);

  return {
    current: Math.max(0, current),
    longest: Math.max(0, longest),
    lastActiveDay,
    days,
    history: history.slice(0, 8),
    milestonesReached: [...new Set(milestonesReached)].sort((a, b) => a - b),
  };
}

export function getStreakMilestoneInfo(current = 0) {
  const nextMilestone = STREAK_MILESTONES.find((value) => value > current);
  if (!nextMilestone) {
    return { milestone: STREAK_MILESTONES[STREAK_MILESTONES.length - 1], remaining: 0, reached: true };
  }
  return { milestone: nextMilestone, remaining: Math.max(0, nextMilestone - current), reached: false };
}

export function updateStreakForListen(prevState = {}, listenDate = new Date()) {
  const base = normalizeStreakState(prevState);
  const todayKey = getLocalDateKey(listenDate);

  if (base.lastActiveDay === todayKey || base.days.includes(todayKey)) {
    const nextCurrent = Math.max(base.current || 0, computeCurrentStreak(base.days));
    const nextState = {
      ...base,
      current: nextCurrent,
      longest: Math.max(base.longest || 0, nextCurrent),
      lastActiveDay: base.lastActiveDay || todayKey,
    };
    return { state: nextState, triggeredMilestones: [] };
  }

  let current = 1;
  let history = [...base.history];

  if (base.lastActiveDay) {
    const gap = diffCalendarDays(todayKey, base.lastActiveDay);
    if (gap === 0) {
      return { state: base, triggeredMilestones: [] };
    }
    if (gap === 1) {
      current = Math.max(1, (Number(base.current) || 0) + 1);
    } else if (gap > 1) {
      const priorCurrent = Math.max(0, Number(base.current) || 0);
      if (priorCurrent > 0) {
        history = [priorCurrent, ...history.filter((item) => item !== priorCurrent)].slice(0, 8);
      }
      current = 1;
    } else {
      return { state: base, triggeredMilestones: [] };
    }
  } else if (base.days.length) {
    const computed = computeCurrentStreak(base.days);
    current = computed > 0 ? computed : 1;
  }

  const nextDays = sortedUniqueDays([...base.days, todayKey]);
  const nextCurrent = Math.max(1, current);
  const nextLongest = Math.max(base.longest || 0, nextCurrent);
  const triggeredMilestones = STREAK_MILESTONES.filter((milestone) => nextCurrent >= milestone && !(base.milestonesReached || []).includes(milestone));
  const milestonesReached = [...new Set([...(base.milestonesReached || []), ...STREAK_MILESTONES.filter((milestone) => nextCurrent >= milestone)])].sort((a, b) => a - b);

  return {
    state: {
      ...base,
      current: nextCurrent,
      longest: nextLongest,
      lastActiveDay: todayKey,
      days: nextDays,
      history,
      milestonesReached,
    },
    triggeredMilestones,
  };
}
