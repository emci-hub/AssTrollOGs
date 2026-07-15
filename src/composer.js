/**
 * Composer — the app's shared variety engine.
 *
 * Two jobs:
 *
 * 1. ACCOUNT SALT. Every deterministic content pick in the app used to be
 *    seeded purely from profile answers, so two accounts created with the
 *    same name/city/traits (very common when someone recreates an account,
 *    or two people genuinely overlap) landed on literally identical content.
 *    accountSalt() blends in the vibeSeed (minted with an onboarding
 *    timestamp — unique per account) and the save code (random) so identical
 *    onboarding answers still diverge, while everything stays deterministic
 *    WITHIN an account: same person, same day, same message.
 *
 * 2. VARIANT PICKING. Content tables used to hold one string per trait key,
 *    which repeats verbatim forever. Tables now hold arrays of variants;
 *    pickVariant() selects one deterministically from any mix of seed parts
 *    (numbers or strings — strings are hashed). Callers pass a distinct
 *    surface tag ('glance', 'decoder', ...) so two surfaces sharing a table
 *    naturally land on different variants instead of echoing each other on
 *    the same day.
 */

export function hashStr(str) {
  let hash = 5381;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Per-account entropy. Returns 0 mid-onboarding (no seed/code yet), which
 * leaves legacy behavior unchanged for any pre-profile render.
 */
export function accountSalt() {
  const seed = window.AppState?.vibeSeed || '';
  let code = window.AppState?.saveCode || '';
  if (!code) {
    try { code = localStorage.getItem('vibeSaveCode') || ''; } catch (_) { code = ''; }
  }
  if (!seed && !code) return 0;
  return hashStr(`${seed}|${code}`);
}

/** Folds any mix of numbers/strings into one non-negative integer. */
export function combineSeeds(...parts) {
  let acc = 0;
  for (const p of parts) {
    acc = (acc + (typeof p === 'number' ? Math.abs(p | 0) : hashStr(p))) | 0;
  }
  return Math.abs(acc);
}

/** Deterministic pick from a plain array. Returns null for empty pools. */
export function pickFrom(pool, ...seedParts) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  return pool[combineSeeds(...seedParts) % pool.length];
}

/**
 * Backwards-tolerant variant pick: entry may be a plain string (legacy
 * single-variant tables) or an array of variants. Callers never need to know
 * which shape the bank currently has.
 */
export function pickVariant(entry, ...seedParts) {
  if (entry == null) return null;
  if (Array.isArray(entry)) return pickFrom(entry, ...seedParts);
  return entry;
}
