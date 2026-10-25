export const TUNE_TOKEN_REDEMPTION_CODES = Object.freeze({
  "69358": 1000,
});

export function redeemTuneTokenCode(store, rawCode) {
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!/^\d{5}$/.test(code) || !Object.hasOwn(TUNE_TOKEN_REDEMPTION_CODES, code)) {
    return {status: "invalid", tokens: 0};
  }

  const redeemedCodes = new Set(
    Array.isArray(store?.redeemedCodes)
      ? store.redeemedCodes.filter(value => typeof value === "string")
      : []
  );
  if (redeemedCodes.has(code)) return {status: "already-redeemed", tokens: 0};

  const balance = Number.isFinite(store?.balance)
    ? Math.max(0, Math.floor(store.balance))
    : 0;
  const tokens = TUNE_TOKEN_REDEMPTION_CODES[code];
  redeemedCodes.add(code);

  return {
    status: "redeemed",
    tokens,
    store: {
      ...store,
      balance: balance + tokens,
      redeemedCodes: [...redeemedCodes],
    },
  };
}

export function applyAdminTokenGrants(store, grants) {
  const applied = new Set(
    Array.isArray(store?.appliedAdminGrantIds)
      ? store.appliedAdminGrantIds.filter(value => typeof value === "string")
      : []
  );
  const balance = Number.isFinite(store?.balance)
    ? Math.max(0, Math.floor(store.balance))
    : 0;
  let nextBalance = balance;
  for (const grant of Array.isArray(grants) ? grants : []) {
    if (typeof grant?.id !== "string" || !grant.id || applied.has(grant.id) ||
        Number(grant.tokens) !== 5000) continue;
    applied.add(grant.id);
    nextBalance += 5000;
  }
  return {
    ...store,
    balance: nextBalance,
    appliedAdminGrantIds: [...applied],
  };
}
