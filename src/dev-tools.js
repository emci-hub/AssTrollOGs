/**
 * Developer console helpers.
 * Password-protected — session-scoped unlock via sessionStorage.
 * Password: Calgary1!
 */

import { engine } from './engine.js';
import { switchView, renderActiveStep } from './profile-builder.js';
import { hydrateDashboardViews } from './dashboard.js';
import { defaultGameData, saveGameData, updateStreak, migrateGameData, MILESTONE_LABELS, todayLocal } from './state.js';
import { initPet, awardPetGrowth } from './pet.js';
import { cloudSave } from './supabase.js';

const DEV_PASSWORD = 'Calgary1!';
let _devUnlocked = sessionStorage.getItem('dev_unlocked') === '1';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function toggleDeveloperPanel() {
  const panel = document.getElementById('dev-panel');
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    _renderPanelView();
  } else {
    panel.classList.add('hidden');
  }
}

function _renderPanelView() {
  const loginEl = document.getElementById('dev-login-screen');
  const toolsEl = document.getElementById('dev-tools-screen');
  if (!loginEl || !toolsEl) return;
  if (_devUnlocked) {
    loginEl.style.display = 'none';
    toolsEl.style.display = 'block';
    devRefreshInspector();
  } else {
    loginEl.style.display = 'flex';
    toolsEl.style.display = 'none';
    const errEl = document.getElementById('dev-login-error');
    if (errEl) errEl.style.display = 'none';
  }
}

export function devLogin() {
  const input = document.getElementById('dev-password-input');
  const errEl = document.getElementById('dev-login-error');
  if (!input) return;
  if (input.value === DEV_PASSWORD) {
    _devUnlocked = true;
    sessionStorage.setItem('dev_unlocked', '1');
    input.value = '';
    _renderPanelView();
  } else {
    if (errEl) {
      errEl.textContent = 'Incorrect password.';
      errEl.style.display = 'block';
    }
    input.value = '';
    input.focus();
  }
}

export function devLogout() {
  _devUnlocked = false;
  sessionStorage.removeItem('dev_unlocked');
  _renderPanelView();
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export function devJumpStep(index) {
  window.AppState.currentStep = index;
  switchView('profile-screen');
  renderActiveStep();
  toggleDeveloperPanel();
}

export function devForceDashboard() {
  window.AppState.userProfile = {
    name: "Alex Dev", location: "Loc", mbti: "INTJ",
    attachmentStyle: "secure", conflictStyle: "collaborative", loveLanguage: "words", expressionStyle: "direct",
    relationshipStatus: "committed"
  };
  window.AppState.partnerProfile = {
    name: "Sam Dev", mbti: "ENFP",
    attachmentStyle: "secure", conflictStyle: "collaborative", loveLanguage: "time", expressionStyle: "direct"
  };
  window.AppState.vibeSeed = 88888888;
  window.AppState.currentState = 'PHASE_3_DAILY';

  const storagePayload = {
    userProfile: window.AppState.userProfile,
    partnerProfile: window.AppState.partnerProfile,
    vibeSeed: window.AppState.vibeSeed,
    tempAnswers: window.AppState.tempAnswers,
    gameData: window.AppState.gameData,
    currentStep: 12,
    cachedDate: todayLocal(),
    lastSavedAt: new Date().toISOString()
  };

  localStorage.setItem('persistent_profile_data', JSON.stringify(storagePayload));
  hydrateDashboardViews(storagePayload);
  switchView('daily-screen');
  toggleDeveloperPanel();
}

// ─── Profile Modifiers ────────────────────────────────────────────────────────

export function syncDevInputs() {
  const devUNameEl = document.getElementById('dev-u-name');
  const devLocEl = document.getElementById('dev-loc');
  const devTimeEl = document.getElementById('dev-time');

  const uName = devUNameEl ? devUNameEl.value || 'Alex Dev' : 'Alex Dev';
  const locVal = devLocEl ? devLocEl.value || 'Loc' : 'Loc';
  const offset = devTimeEl ? devTimeEl.value || '0' : '0';

  const simulatedTimestamp = (Date.now() + parseInt(offset)).toString();
  const recalculatedSeed = engine.computeDeterministicSeed(uName, locVal, simulatedTimestamp);

  window.AppState.userProfile.name = uName;
  window.AppState.userProfile.location = locVal;
  window.AppState.vibeSeed = recalculatedSeed;

  const headerDisplay = document.getElementById('dynamic-header');
  if (headerDisplay) {
    const pName = window.AppState.partnerProfile?.name || 'Partner';
    headerDisplay.innerHTML = `<span><strong>${uName}</strong> + <strong>${pName}</strong></span> <span>VIBE ID: <strong>${recalculatedSeed}</strong></span>`;
  }

  const cachedPackage = localStorage.getItem('persistent_profile_data');
  if (cachedPackage) {
    const parsed = JSON.parse(cachedPackage);
    parsed.userProfile.name = uName;
    parsed.userProfile.location = locVal;
    parsed.vibeSeed = recalculatedSeed;
    localStorage.setItem('persistent_profile_data', JSON.stringify(parsed));
    hydrateDashboardViews(parsed);
  }
}

// ─── Mode Overrides ───────────────────────────────────────────────────────────

export function devForceSolo() {
  window.AppState.soloMode = true;
  window.AppState.partnerProfile = null;
  _persistAndRefresh();
  _flashBtn('dev-force-solo-btn', 'Solo Active');
}

export function devForcePartner() {
  window.AppState.soloMode = false;
  if (!window.AppState.partnerProfile?.name) {
    window.AppState.partnerProfile = {
      name: "Sam Dev", mbti: "ENFP",
      attachmentStyle: "anxious", conflictStyle: "accommodating", loveLanguage: "time", expressionStyle: "indirect"
    };
  }
  _persistAndRefresh();
  _flashBtn('dev-force-partner-btn', 'Partner Active');
}

function _persistAndRefresh() {
  const raw = localStorage.getItem('persistent_profile_data');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      parsed.soloMode = window.AppState.soloMode;
      parsed.partnerProfile = window.AppState.partnerProfile;
      localStorage.setItem('persistent_profile_data', JSON.stringify(parsed));
    } catch (_) {}
  }
  const payload = {
    userProfile: window.AppState.userProfile,
    partnerProfile: window.AppState.partnerProfile,
    vibeSeed: window.AppState.vibeSeed
  };
  hydrateDashboardViews(payload);
  initPet();
  devRefreshInspector();
}

// ─── Game Controls ────────────────────────────────────────────────────────────

export function devSimulateDayAdvance() {
  const gd = window.AppState.gameData;

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return todayLocal(d);
  })();

  if (gd.streak?.lastOpenDate) gd.streak.lastOpenDate = yesterday;
  if (gd.mood?.lastChecked) gd.mood.lastChecked = yesterday;
  gd.mood.today = null;
  if (gd.dailyq?.lastAnswered) gd.dailyq.lastAnswered = yesterday;
  // Roll the weekly check-in gate back a day too so it can be tested
  if (gd.checkin?.lastCheckin) {
    const d = new Date(gd.checkin.lastCheckin);
    d.setDate(d.getDate() - 1);
    gd.checkin.lastCheckin = todayLocal(d);
  }

  // Reset daily growth caps to yesterday so games can award again today
  if (gd.petGrowthLog) {
    Object.keys(gd.petGrowthLog).forEach(k => { gd.petGrowthLog[k] = yesterday; });
  }

  updateStreak();
  initPet();
  saveGameData();
  devRefreshInspector();
  _flashBtn('dev-day-advance-btn', 'Day Advanced!');
}

export function devAwardPetGrowthManual() {
  const input = document.getElementById('dev-pet-pts');
  const n = parseInt(input?.value || '1', 10);
  if (isNaN(n) || n < 1) return;
  awardPetGrowth(n);
  devRefreshInspector();
  _flashBtn('dev-award-pet-btn', `+${n} Awarded`);
}

export function devUnlockAllMilestones() {
  const gd = window.AppState.gameData;
  const all = Object.keys(MILESTONE_LABELS);
  all.forEach(id => { if (!gd.milestones.includes(id)) gd.milestones.push(id); });
  saveGameData();
  devRefreshInspector();
  _flashBtn('dev-unlock-milestones-btn', 'All Unlocked!');
}

// ─── Data Tools ───────────────────────────────────────────────────────────────

export function devExportProfile() {
  const data = localStorage.getItem('persistent_profile_data') || '{}';
  navigator.clipboard.writeText(data).then(() => {
    _flashBtn('dev-export-btn', 'Copied!');
  }).catch(() => {
    const ta = document.getElementById('dev-import-json');
    if (ta) { ta.value = data; ta.select(); }
  });
}

export function devImportProfile() {
  const ta = document.getElementById('dev-import-json');
  if (!ta || !ta.value.trim()) return;
  const errEl = document.getElementById('dev-import-error');
  try {
    const parsed = JSON.parse(ta.value.trim());
    if (!parsed.userProfile) throw new Error('Missing userProfile key');

    window.AppState.userProfile = parsed.userProfile;
    window.AppState.partnerProfile = parsed.partnerProfile || null;
    window.AppState.vibeSeed = parsed.vibeSeed || null;
    window.AppState.tempAnswers = parsed.tempAnswers || {};
    window.AppState.soloMode = parsed.soloMode || false;
    if (parsed.gameData) window.AppState.gameData = migrateGameData(parsed.gameData);

    localStorage.setItem('persistent_profile_data', JSON.stringify(parsed));
    hydrateDashboardViews(parsed);
    initPet();
    ta.value = '';
    if (errEl) errEl.style.display = 'none';
    devRefreshInspector();
    _flashBtn('dev-import-btn', 'Loaded!');
  } catch (e) {
    if (errEl) {
      errEl.textContent = `Error: ${e.message}`;
      errEl.style.display = 'block';
      setTimeout(() => { errEl.style.display = 'none'; }, 3000);
    }
  }
}

// ─── State Inspector ──────────────────────────────────────────────────────────

export function devRefreshInspector() {
  const el = document.getElementById('dev-state-output');
  if (!el) return;
  const gd = window.AppState.gameData;
  const up = window.AppState.userProfile;
  const pp = window.AppState.partnerProfile;
  const today = todayLocal();

  const lines = [
    `Mode:        ${window.AppState.soloMode ? 'Solo' : 'Partner'}`,
    `User:        ${up?.name || '—'} (${up?.mbti || '?'} / ${up?.attachmentStyle || '?'})`,
    `Partner:     ${pp?.name || '—'}`,
    `Save Code:   ${window.AppState.saveCode || localStorage.getItem('vibeSaveCode') || '—'}`,
    ``,
    `Streak:      ${gd.streak?.current || 0} days (best: ${gd.streak?.longest || 0})`,
    `Last open:   ${gd.streak?.lastOpenDate || '—'}`,
    ``,
    `Pet days:    ${gd.pet?.user?.totalDays || 0} (stage ${gd.pet?.user?.stage || 1})`,
    `Pet mood:    ${gd.pet?.user?.mood || '—'}`,
    ``,
    `Mood today:  ${gd.mood?.today || 'not checked'}`,
    `Mood streak: ${gd.mood?.streak || 0} days`,
    ``,
    `Trivia:      ${gd.trivia?.correct || 0}/${gd.trivia?.total || 0} correct`,
    `WYR:         ${gd.wyr?.answered || 0} answered`,
    `Duo guesses: ${gd.duo?.correctGuesses || 0}/${gd.duo?.guesses || 0} right`,
    `Daily Q:     ${gd.dailyq?.answered || 0} answered`,
    `Check-ins:   ${gd.checkin?.entries?.length || 0} done`,
    `QuickTakes:  ${gd.quicktakes?.sessionCount || 0} sessions`,
    ``,
    `Milestones:  ${(gd.milestones || []).length} / ${Object.keys(MILESTONE_LABELS).length}`,
    `             ${(gd.milestones || []).join(', ') || 'none'}`,
    ``,
    `Growth log:  ${Object.entries(gd.petGrowthLog || {}).map(([k, v]) => `${k}=${v === today ? 'today' : v}`).join(', ') || 'empty'}`
  ];

  el.textContent = lines.join('\n');
}

// ─── Cache Clear ──────────────────────────────────────────────────────────────

export function clearProfileCache() {
  localStorage.removeItem('persistent_profile_data');
  window.AppState.tempAnswers = {
    mbtiEOrI: 'E', mbtiSOrN: 'N', mbtiTOrF: 'F', mbtiJOrP: 'P',
    partnerMbtiEOrI: 'E', partnerMbtiSOrN: 'N', partnerMbtiTOrF: 'F', partnerMbtiJOrP: 'P'
  };
  window.AppState.currentStep = 0;
  window.AppState.userProfile = {};
  window.AppState.partnerProfile = null;
  window.AppState.vibeSeed = null;
  window.AppState.soloMode = false;
  window.AppState.gameData = defaultGameData();

  switchView('profile-screen');
  renderActiveStep();
}

// ─── Save Code Tools ──────────────────────────────────────────────────────────
// The code is a permanent random key, never regenerated — dev tools can only
// display it and force a cloud re-sync under it.

export function devShowSaveCode() {
  const el = document.getElementById('dev-savecode-status');
  const code = window.AppState.saveCode || localStorage.getItem('vibeSaveCode');
  if (el) {
    el.textContent = code ? `Code: ${code}` : 'No code yet — finish onboarding first.';
    el.style.color = code ? 'var(--success-color)' : '#f87171';
  }
}

export function devForceCloudSync() {
  const el = document.getElementById('dev-savecode-status');
  const raw = localStorage.getItem('persistent_profile_data');
  if (!raw) {
    if (el) { el.textContent = 'No profile saved yet.'; el.style.color = '#f87171'; }
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    parsed.lastSavedAt = new Date().toISOString();
    localStorage.setItem('persistent_profile_data', JSON.stringify(parsed));
    const code = window.AppState.saveCode || localStorage.getItem('vibeSaveCode');
    cloudSave(parsed, code);
    if (el) { el.textContent = `Synced${code ? ` under ${code}` : ''}.`; el.style.color = 'var(--success-color)'; }
  } catch (e) {
    if (el) { el.textContent = `Error: ${e.message}`; el.style.color = '#f87171'; }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _flashBtn(id, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = label;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
}
