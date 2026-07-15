/**
 * Global application state and game data persistence.
 * All modules access state via window.AppState — no imports needed for state itself.
 *
 * gameData schema:
 *   trivia.categoryAccuracy  — per-category hit/miss: { mbti, loveLanguage, attachment, conflict, expression }
 *   wyr.history              — array of { questionIndex, choice, textChosen } (last 20)
 *   wyr.preferences          — trait map: { adventurous, planner, deep, structured, homebody, verbal }
 *   bingo.checkedCells       — array of label strings the user checked
 *   streak.current           — days in a row the app was opened
 *   streak.lastOpenDate      — ISO date string of last open
 *   streak.longest           — all-time best streak
 *   milestones               — array of earned milestone ids
 *   petGrowthLog             — { [gameId]: 'YYYY-MM-DD' } tracks last day each game awarded pet growth
 *                              (also reused for friend visits, keyed `friend_<id>`)
 *   friends                  — [{ id, name, addedAt, profile: {...same shape as partnerProfile...}, streak }]
 *   pet.friends              — { [friendId]: CouplePetData } — one companion pet per friendship
 */

import { hydrateDashboardViews } from './dashboard.js';
import { cloudSave } from './supabase.js';

export const SCHEMA_VERSION = 3;

// ─── Local-time date helpers ─────────────────────────────────────────────────
// All "what day is it" logic uses the user's local calendar day, not UTC —
// otherwise streaks, mood resets, and daily pet caps roll over mid-evening
// for anyone west of Greenwich.

/** Local calendar date as 'YYYY-MM-DD'. Pass a Date to convert a timestamp. */
export function todayLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True if the given ISO timestamp falls on the user's local today. */
export function isToday(isoTimestamp) {
  if (!isoTimestamp) return false;
  const d = new Date(isoTimestamp);
  return !isNaN(d) && todayLocal(d) === todayLocal();
}

/** Whole days between two 'YYYY-MM-DD' strings (b - a). */
export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function defaultGameData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    trivia: {
      correct: 0,
      total: 0,
      lastPlayed: null,
      categoryAccuracy: {
        mbti: { correct: 0, total: 0 },
        loveLanguage: { correct: 0, total: 0 },
        attachment: { correct: 0, total: 0 },
        conflict: { correct: 0, total: 0 },
        expression: { correct: 0, total: 0 }
      }
    },
    // Real dyadic data from pass-the-phone rounds (WYR Guess & Reveal +
    // Daily Duo). guesses/correctGuesses only count actual guess rounds.
    duo: { rounds: 0, guesses: 0, correctGuesses: 0, lastPlayed: null, history: [] },
    // Daily Duo (partner) / Daily Reflection (solo) — one question a day.
    dailyq: { answered: 0, lastAnswered: null, lastPlayed: null },
    reflection: { entries: [], lastAnswered: null },
    // Weekly Check-In ritual — appreciation/friction/experiment (partner)
    // or win/struggle/intention (solo). Last 12 entries kept.
    checkin: { entries: [], lastCheckin: null, lastPlayed: null },
    wyr: {
      answered: 0,
      lastPlayed: null,
      history: [],
      preferences: {
        adventurous: 0,
        homebody: 0,
        planner: 0,
        spontaneous: 0,
        deep: 0,
        lighthearted: 0,
        independent: 0,
        connected: 0
      }
    },
    bingo: {
      checked: 0,
      lastPlayed: null,
      checkedCells: []
    },
    sparks: {
      checkedItems: [],
      lastPlayed: null
    },
    streak: {
      current: 0,
      lastOpenDate: null,
      longest: 0,
      lastResetDate: null
    },
    milestones: [],
    pet: { user: null, partner: null, couple: null, friends: {} },
    mood: { today: null, lastChecked: null, streak: 0, history: [] },
    quicktakes: { sessionCount: 0, lastPlayed: null },
    petGrowthLog: {},
    // Friends list — each entry is a lightweight, locally-entered snapshot
    // of someone else's profile (same shape as partnerProfile), not a live
    // synced account. `streak` tracks consecutive days you've visited that
    // specific friend's profile (drives their companion pet's growth).
    friends: []
  };
}

/**
 * Migrates old game data to current schema, adding missing fields gracefully.
 */
export function migrateGameData(gd) {
  if (!gd) return defaultGameData();

  // Add top-level missing keys
  const defaults = defaultGameData();
  Object.keys(defaults).forEach(key => {
    if (gd[key] === undefined) gd[key] = defaults[key];
  });

  // Migrate old trivia categoryAccuracy keys (attachmentStyle→attachment, conflictStyle→conflict, expressionStyle→expression)
  const ta = gd.trivia?.categoryAccuracy;
  if (ta) {
    if (ta.attachmentStyle && !ta.attachment) { ta.attachment = ta.attachmentStyle; delete ta.attachmentStyle; }
    if (ta.conflictStyle && !ta.conflict) { ta.conflict = ta.conflictStyle; delete ta.conflictStyle; }
    if (ta.expressionStyle && !ta.expression) { ta.expression = ta.expressionStyle; delete ta.expressionStyle; }
    // Ensure all keys exist
    ['mbti','loveLanguage','attachment','conflict','expression'].forEach(k => {
      if (!ta[k]) ta[k] = { correct: 0, total: 0 };
    });
  }

  // Ensure streak has lastResetDate
  if (gd.streak && gd.streak.lastResetDate === undefined) gd.streak.lastResetDate = null;

  // Ensure petGrowthLog exists
  if (!gd.petGrowthLog) gd.petGrowthLog = {};

  // Ensure mood history is array
  if (!Array.isArray(gd.mood?.history)) {
    if (gd.mood) gd.mood.history = [];
  }

  // Ensure quicktakes exists
  if (!gd.quicktakes) gd.quicktakes = { sessionCount: 0, lastPlayed: null };

  // Ensure sparks exists
  if (!gd.sparks) gd.sparks = { checkedItems: [], lastPlayed: null };

  // v3 additions (duo / dailyq / reflection / checkin) are backfilled by the
  // top-level defaults loop above; just harden their inner shapes.
  if (!Array.isArray(gd.duo?.history)) gd.duo.history = [];
  if (!Array.isArray(gd.reflection?.entries)) gd.reflection.entries = [];
  if (!Array.isArray(gd.checkin?.entries)) gd.checkin.entries = [];

  // Friends — additive, defensively backfilled like every prior addition.
  if (!Array.isArray(gd.friends)) gd.friends = [];
  gd.friends.forEach(f => {
    if (!f.streak) f.streak = { current: 0, lastVisit: null, longest: 0 };
  });
  if (!gd.pet) gd.pet = { user: null, partner: null, couple: null, friends: {} };
  if (!gd.pet.friends) gd.pet.friends = {};

  gd.schemaVersion = SCHEMA_VERSION;
  return gd;
}

window.AppState = {
  currentState: 'INIT',
  currentStep: 0,
  soloMode: false,
  userProfile: {},
  partnerProfile: null,
  vibeSeed: null,
  gameData: defaultGameData(),
  tempAnswers: {
    mbtiEOrI: 'E',
    mbtiSOrN: 'N',
    mbtiTOrF: 'F',
    mbtiJOrP: 'P',
    partnerMbtiEOrI: 'E',
    partnerMbtiSOrN: 'N',
    partnerMbtiTOrF: 'F',
    partnerMbtiJOrP: 'P'
  }
};

/**
 * Returns true if the given game can award pet growth today (hasn't already done so).
 */
export function canAwardPetGrowthToday(gameId) {
  const log = window.AppState.gameData.petGrowthLog || {};
  return log[gameId] !== todayLocal();
}

/**
 * Records that the given game awarded pet growth today.
 */
export function recordPetGrowthToday(gameId) {
  const gd = window.AppState.gameData;
  if (!gd.petGrowthLog) gd.petGrowthLog = {};
  gd.petGrowthLog[gameId] = todayLocal();
}

/**
 * Updates the streak counter based on today's date.
 */
export function updateStreak() {
  const gd = window.AppState.gameData;
  if (!gd.streak) gd.streak = { current: 0, lastOpenDate: null, longest: 0, lastResetDate: null };

  const today = todayLocal();
  const last = gd.streak.lastOpenDate;

  if (last === today) return;

  if (last) {
    const diffDays = daysBetween(last, today);
    if (diffDays === 1) {
      gd.streak.current += 1;
    } else if (diffDays > 1) {
      gd.streak.lastResetDate = today;
      gd.streak.current = 1;
    }
  } else {
    gd.streak.current = 1;
  }

  gd.streak.lastOpenDate = today;
  if (gd.streak.current > gd.streak.longest) gd.streak.longest = gd.streak.current;
}

/**
 * Checks and awards milestones. Returns array of newly earned milestone ids.
 */
export function checkMilestones() {
  const gd = window.AppState.gameData;
  if (!gd.milestones) gd.milestones = [];
  const earned = gd.milestones;
  const newlyEarned = [];

  const MILESTONE_CHECKS = [
    { id: 'trivia_first',      check: () => gd.trivia.total >= 5 },
    { id: 'trivia_perfect',    check: () => gd.trivia.total >= 10 && gd.trivia.correct === gd.trivia.total },
    { id: 'trivia_master',     check: () => gd.trivia.total >= 15 && (gd.trivia.correct / gd.trivia.total) >= 0.8 },
    { id: 'wyr_5',             check: () => gd.wyr.answered >= 5 },
    { id: 'wyr_10',            check: () => gd.wyr.answered >= 10 },
    { id: 'wyr_25',            check: () => gd.wyr.answered >= 25 },
    // memory_first / memory_sharp: game removed — labels kept so users who
    // already earned them keep their badges, but they can no longer trigger.
    { id: 'dailyq_first',      check: () => (gd.dailyq?.answered || 0) >= 1 },
    { id: 'dailyq_7',          check: () => (gd.dailyq?.answered || 0) >= 7 },
    { id: 'duo_reader',        check: () => (gd.duo?.guesses || 0) >= 10 && (gd.duo.correctGuesses / gd.duo.guesses) >= 0.7 },
    { id: 'checkin_first',     check: () => (gd.checkin?.entries?.length || 0) >= 1 },
    { id: 'checkin_4',         check: () => (gd.checkin?.entries?.length || 0) >= 4 },
    { id: 'bingo_3',           check: () => gd.bingo.checked >= 3 },
    { id: 'bingo_row',         check: () => gd.bingo.checked >= 9 },
    { id: 'streak_3',          check: () => gd.streak.current >= 3 },
    { id: 'streak_7',          check: () => gd.streak.current >= 7 },
    { id: 'mood_first',        check: () => (gd.mood?.history?.length || 0) >= 1 },
    { id: 'mood_consistent',   check: () => (gd.mood?.streak || 0) >= 5 },
    { id: 'quicktakes_first',  check: () => (gd.quicktakes?.sessionCount || 0) >= 1 },
    { id: 'quicktakes_pattern',check: () => (gd.quicktakes?.sessionCount || 0) >= 5 },
    { id: 'pet_baby',          check: () => gd.pet?.user?.totalDays >= 4 },
    { id: 'pet_adult',         check: () => gd.pet?.user?.totalDays >= 20 },
    { id: 'pet_legendary',     check: () => gd.pet?.user?.totalDays >= 40 },
    { id: 'pet_couple_shiny',  check: () => gd.pet?.couple?.stage >= 5 },
    { id: 'friend_first',      check: () => (gd.friends?.length || 0) >= 1 },
    { id: 'friend_circle',     check: () => (gd.friends?.length || 0) >= 5 },
    { id: 'friend_bond',       check: () => Object.values(gd.pet?.friends || {}).some(p => (p?.stage || 0) >= 5) },
    { id: 'friend_streak_7',   check: () => (gd.friends || []).some(f => (f.streak?.current || 0) >= 7) }
  ];

  MILESTONE_CHECKS.forEach(m => {
    if (!earned.includes(m.id) && m.check()) {
      earned.push(m.id);
      newlyEarned.push(m.id);
    }
  });

  return newlyEarned;
}

export const MILESTONE_LABELS = {
  trivia_first:       'First Quiz Complete',
  trivia_perfect:     'Perfect Score',
  trivia_master:      'Trivia Master',
  wyr_5:              '5 Dilemmas Explored',
  wyr_10:             '10 Dilemmas Explored',
  wyr_25:             'Dilemma Veteran',
  memory_first:       'First Memory Win',
  memory_sharp:       'Sharp Memory',
  dailyq_first:       'First Daily Question',
  dailyq_7:           'A Week of Questions',
  duo_reader:         'Mind Reader',
  checkin_first:      'First Check-In',
  checkin_4:          'Monthly Ritual',
  bingo_3:            'Strength Spotter',
  bingo_row:          'Full Board',
  streak_3:           '3-Day Streak',
  streak_7:           '7-Day Streak',
  mood_first:         'First Mood Check',
  mood_consistent:    'Consistent Checker',
  quicktakes_first:   'Quick Taker',
  quicktakes_pattern: 'Pattern Finder',
  pet_baby:           'Baby Steps',
  pet_adult:          'Growing Up',
  pet_legendary:      'Legendary Bond',
  pet_couple_shiny:   'Shiny Bond',
  friend_first:       'Made a Friend',
  friend_circle:      'Friend Circle',
  friend_bond:        'Friendship Legend',
  friend_streak_7:    'Ride or Die'
};

/**
 * The permanent save code, wherever it currently lives. AppState is only
 * populated after startup restore, so fall back to localStorage — otherwise
 * an early save uploads a cloud row without its cross-device lookup key.
 */
export function getActiveSaveCode() {
  return window.AppState.saveCode || localStorage.getItem('vibeSaveCode') || null;
}

/**
 * Builds a complete storage package from live AppState — the same shape
 * finalizeEngineData() writes at onboarding completion.
 */
export function buildStoragePayload() {
  return {
    userProfile: window.AppState.userProfile,
    partnerProfile: window.AppState.partnerProfile,
    soloMode: window.AppState.soloMode,
    vibeSeed: window.AppState.vibeSeed,
    tempAnswers: window.AppState.tempAnswers,
    gameData: window.AppState.gameData,
    currentStep: window.AppState.currentStep,
    cachedDate: todayLocal(),
    lastSavedAt: new Date().toISOString()
  };
}

// ─── Debounced cloud sync ────────────────────────────────────────────────────
// Gameplay saves fire on every tap (each trivia answer, each mood check).
// localStorage is written immediately every time — it's the source of truth —
// but the Supabase upsert is debounced so a burst of taps becomes one request.
// The pending payload is flushed when the tab hides so the last burst isn't
// dropped on app switch / close.

const CLOUD_SYNC_DEBOUNCE_MS = 2000;
let _cloudSyncTimer = null;
let _pendingCloudPayload = null;

function scheduleCloudSave(payload) {
  _pendingCloudPayload = payload;
  if (_cloudSyncTimer) clearTimeout(_cloudSyncTimer);
  _cloudSyncTimer = setTimeout(flushCloudSave, CLOUD_SYNC_DEBOUNCE_MS);
}

/** Sends any pending debounced cloud save immediately. Safe to call anytime. */
export function flushCloudSave() {
  if (_cloudSyncTimer) { clearTimeout(_cloudSyncTimer); _cloudSyncTimer = null; }
  if (!_pendingCloudPayload) return;
  const payload = _pendingCloudPayload;
  _pendingCloudPayload = null;
  cloudSave(payload, getActiveSaveCode());
}

if (typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', flushCloudSave);
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushCloudSave();
  });
}

/**
 * Persists the current profile package to localStorage and schedules a cloud
 * sync. No re-rendering — saveGameData() is the render-triggering wrapper.
 *
 * Normally patches gameData into the existing cached package; if that package
 * is missing or corrupt (cleared/damaged localStorage) it rebuilds a full one
 * from AppState instead of silently dropping the save. Returns false only
 * when there is no profile to save yet (mid-onboarding).
 */
export function persistGameData() {
  let parsed = null;
  const cachedPackage = localStorage.getItem('persistent_profile_data');
  if (cachedPackage) {
    try { parsed = JSON.parse(cachedPackage); } catch (_) {}
  }
  if (parsed) {
    parsed.gameData = window.AppState.gameData;
    parsed.cachedDate = todayLocal();
    parsed.lastSavedAt = new Date().toISOString();
  } else {
    if (!window.AppState.userProfile?.name) return false;
    parsed = buildStoragePayload();
  }
  localStorage.setItem('persistent_profile_data', JSON.stringify(parsed));
  scheduleCloudSave(parsed);
  return true;
}

/**
 * Persists game data to localStorage (and cloud) and refreshes the dashboard.
 */
export function saveGameData() {
  checkMilestones();
  persistGameData();
  hydrateDashboardViews({
    userProfile: window.AppState.userProfile,
    partnerProfile: window.AppState.partnerProfile,
    vibeSeed: window.AppState.vibeSeed
  });
  if (typeof window._renderPetSection === 'function') window._renderPetSection();
  if (typeof window._renderFriendsSection === 'function') window._renderFriendsSection();
}
