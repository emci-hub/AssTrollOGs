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
 */

import { hydrateDashboardViews } from './dashboard.js';
import { cloudSave } from './supabase.js';

export const SCHEMA_VERSION = 2;

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
    memory: { completed: 0, bestMoves: null, lastPlayed: null },
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
    pet: { user: null, partner: null, couple: null },
    mood: { today: null, lastChecked: null, streak: 0, history: [] },
    quicktakes: { sessionCount: 0, lastPlayed: null },
    petGrowthLog: {}
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
    { id: 'memory_first',      check: () => gd.memory.completed >= 1 },
    { id: 'memory_sharp',      check: () => gd.memory.bestMoves !== null && gd.memory.bestMoves <= 8 },
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
    { id: 'pet_couple_shiny',  check: () => gd.pet?.couple?.stage >= 5 }
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
  pet_couple_shiny:   'Shiny Bond'
};

/**
 * Persists game data to localStorage (and cloud) and refreshes the dashboard.
 */
export function saveGameData() {
  checkMilestones();
  const cachedPackage = localStorage.getItem('persistent_profile_data');
  if (cachedPackage) {
    try {
      const parsed = JSON.parse(cachedPackage);
      parsed.gameData = window.AppState.gameData;
      parsed.lastSavedAt = new Date().toISOString();
      const json = JSON.stringify(parsed);
      localStorage.setItem('persistent_profile_data', json);
      cloudSave(parsed, window.AppState.saveCode);
    } catch (_) {}
  }
  hydrateDashboardViews({
    userProfile: window.AppState.userProfile,
    partnerProfile: window.AppState.partnerProfile,
    vibeSeed: window.AppState.vibeSeed
  });
  if (typeof window._renderPetSection === 'function') window._renderPetSection();
}
