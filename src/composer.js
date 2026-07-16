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

import { todayLocal } from './state.js';
import {
  KICKERS_PLAYFUL, KICKERS_DARK,
  PET_KICKERS_PLAYFUL, PET_KICKERS_DARK,
  RARE_LINES
} from './jokes.js';

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

/**
 * Integer avalanche finalizer (Murmur3-style). combineSeeds() is a plain SUM
 * of hashes/numbers — great for cycling through a pool by +1 per tap (that's
 * intentional, guarantees no immediate repeat), but terrible for a coin-flip:
 * adding a small incrementing counter (a refresh tap, a day-index delta)
 * barely moves the sum, so `sum % 100 < chance` gives the SAME answer for
 * many consecutive taps/days in a row — a joke either shows on every single
 * refresh or never once in a session, instead of ~30% independently each
 * time. Piping the sum through this finalizer scatters a 1-unit input change
 * across all output bits, so probability rolls behave like independent
 * rolls instead of a slow-moving streak.
 */
function mixInt(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = n ^ (n >>> 16);
  return n >>> 0;
}

/** True with probability `pctChance` (0-100), independently per distinct seed. */
export function rollChance(pctChance, ...seedParts) {
  return mixInt(combineSeeds(...seedParts)) % 100 < pctChance;
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

// ── Humor system ─────────────────────────────────────────────────────────────
// Three levels, persisted in gd.settings.humorLevel (cloud-synced like all
// gameData): 'chill' (sincere only), 'playful' (light jokes, the default),
// 'unhinged' (dark jokes unlocked). Dark humor is additionally suppressed on
// low/tense mood days — the pet doesn't do existential bits at someone
// having a hard day.

export const HUMOR_LEVELS = [
  { id: 'chill',    label: 'Chill',    desc: 'Sincere only — no jokes' },
  { id: 'playful',  label: 'Playful',  desc: 'Light jokes sprinkled in' },
  { id: 'unhinged', label: 'Unhinged', desc: 'Playful plus the dark stuff' }
];

export function humorLevel() {
  return window.AppState?.gameData?.settings?.humorLevel || 'playful';
}

export function setHumorLevel(level) {
  const gd = window.AppState?.gameData;
  if (!gd) return;
  if (!gd.settings) gd.settings = {};
  gd.settings.humorLevel = HUMOR_LEVELS.some(l => l.id === level) ? level : 'playful';
}

export function darkHumorOK() {
  if (humorLevel() !== 'unhinged') return false;
  const mood = window.AppState?.gameData?.mood?.today;
  return mood !== 'low' && mood !== 'tense';
}

/**
 * Maybe returns a joke one-liner to append to a message. Deterministic per
 * seed parts, so a given surface's message is stable within a day/offset and
 * only some messages carry a kicker (~30% playful, ~45% unhinged) — jokes
 * stay seasoning, not the meal.
 *
 * kind: 'general' ({name}/{partner} tokens allowed — caller runs
 * fillTemplate) or 'pet' ({pet} token — caller replaces it).
 */
export function kickerFor(kind, ...seedParts) {
  const level = humorLevel();
  if (level === 'chill') return null;
  const chance = level === 'unhinged' ? 45 : 30;
  if (!rollChance(chance, kind, ...seedParts)) return null;
  const seed = combineSeeds(kind, ...seedParts);
  const useDark = darkHumorOK() && rollChance(43, kind, ...seedParts, 'dark-roll');
  const pool = kind === 'pet'
    ? (useDark ? PET_KICKERS_DARK : PET_KICKERS_PLAYFUL)
    : (useDark ? KICKERS_DARK : KICKERS_PLAYFUL);
  return pickFrom(pool, seed, 'kick');
}

/**
 * ~1-in-50 local days (per account, per surface) a rare collectible line
 * appears — the shiny-pet pattern applied to messages. Deterministic for
 * the whole day; suppressed entirely at the 'chill' humor level.
 */
export function maybeRareLine(...seedParts) {
  if (humorLevel() === 'chill') return null;
  if (!rollChance(2, accountSalt(), todayLocal(), ...seedParts)) return null;
  const seed = combineSeeds(accountSalt(), todayLocal(), ...seedParts);
  return pickFrom(RARE_LINES, seed, 'rare');
}

// ── Tough-love lines ─────────────────────────────────────────────────────────
// A blunter, critical counterweight to the app's default warm/affirming
// voice — NOT a joke (shows at every humor level, including 'chill'), just
// the other half of an honest read. Suppressed on low/tense mood days, same
// as dark humor, so it doesn't pile on someone having a hard day.

export function toughLineOK() {
  const mood = window.AppState?.gameData?.mood?.today;
  return mood !== 'low' && mood !== 'tense';
}

/**
 * Maybe returns a tough-love line (~25% of the time, independent of the
 * joke system). Pass `force: true` (the "Straight Talk" button) to guarantee
 * one regardless of the roll — still suppressed on low/tense mood days,
 * since forcing critique on a bad day isn't what that button is for.
 */
export function maybeToughLine(pool, force, ...seedParts) {
  if (!toughLineOK()) return null;
  if (!force && !rollChance(25, 'tough', ...seedParts)) return null;
  return pickFrom(pool, ...seedParts, 'tough-pick');
}
