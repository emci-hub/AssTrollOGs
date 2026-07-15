/**
 * App entry point — imports all modules, sets up window bindings, and handles init.
 * This file should stay thin. Each concern lives in its own module:
 *   state.js          — global state + game data persistence
 *   profile-builder.js — onboarding wizard + profile finalization
 *   dashboard.js      — Day at a Glance + metrics hydration
 *   drawers.js        — overlay drawers (Deep Insights, Sandbox, Games)
 *   games/index.js    — game registry (add new games here)
 *   dev-tools.js      — developer panel + cache clearing
 *   insights.js       — centralized content engine
 *   engine.js         — math/seed calculations
 *   questions.js      — psych question + MBTI data
 */

import './state.js';
import { switchView, renderActiveStep, selectChoice, advanceStepDirect, startSoloMode, selectCardValue, registerFieldInput, validateStepAdvance, toggleMbtiView, selectDirectGridMbti, selectMbtiToggle, goBackStep,
         toggleSaveCodeEntry, formatSaveCodeInput, submitSaveCode } from './profile-builder.js';
import { hydrateDashboardViews, refreshDayAtAGlance, refreshSpotlight, refreshBlueprint, refreshSaveCodeDisplay, copySaveCode } from './dashboard.js';
import { openDrawer, closeDrawer, executeScenarioSimulation } from './drawers.js';
import { toggleDeveloperPanel, devJumpStep, devForceDashboard, syncDevInputs, clearProfileCache,
         devLogin, devLogout, devForceSolo, devForcePartner,
         devSimulateDayAdvance, devAwardPetGrowthManual, devUnlockAllMilestones,
         devExportProfile, devImportProfile, devRefreshInspector,
         devShowSaveCode, devForceCloudSync } from './dev-tools.js';
import { gameRegistry } from './games/index.js';
import { initPet, renderPetSection, refreshPetAffirmation } from './pet.js';
import { updateStreak, migrateGameData, todayLocal, persistGameData } from './state.js';
import { cloudLoad, cloudLoadByCode } from './supabase.js';
import { renderFriendsSection } from './friends.js';
import { applyStoredTheme } from './theme.js';

// Re-applies the saved theme (the inline boot script in index.html already
// did this before first paint to avoid a flash — this just keeps theme.js
// as the single source of truth once the rest of the app is running).
applyStoredTheme();

// Bind all game window handlers
gameRegistry.bindAll();

// ── PWA: cache-shell service worker (production only) ────────────────────────
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── Keyboard accessibility for card-style controls ───────────────────────────
// The app renders interactive divs via innerHTML everywhere, so focusability
// is patched in centrally: any re-render gets tabindex/role, and Enter/Space
// activates whatever card has focus.
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof HTMLElement &&
      e.target.matches('.interactive-card, .sparks-cell, [role="button"]:not(button)')) {
    e.preventDefault();
    e.target.click();
  }
});
new MutationObserver(() => {
  document.querySelectorAll('.interactive-card:not([tabindex]), .sparks-cell:not([tabindex])').forEach(el => {
    el.setAttribute('tabindex', '0');
    if (!el.getAttribute('role')) el.setAttribute('role', 'button');
  });
}).observe(document.documentElement, { childList: true, subtree: true });

// Freshness key for competing save packages. lastSavedAt is a full ISO
// timestamp; cachedDate (day-granularity) is the fallback for older saves.
function packageFreshness(pkg) {
  return pkg?.lastSavedAt || pkg?.cachedDate || '';
}

// Init: restore cached profile or show onboarding
window.addEventListener('DOMContentLoaded', async () => {
  let cachedPackage = null;

  // Try to load from localStorage first (fast)
  const localRaw = localStorage.getItem('persistent_profile_data');
  if (localRaw) {
    try { cachedPackage = JSON.parse(localRaw); } catch (_) {}
  }

  // Newest-wins across three sources: local, this device's cloud row, and —
  // when a save code exists — the newest row from ANY device sharing that
  // code. The last one is what keeps two devices on one code in sync.
  try {
    const storedCodeEarly = localStorage.getItem('vibeSaveCode');
    const [cloudData, codeResult] = await Promise.all([
      cloudLoad(),
      storedCodeEarly ? cloudLoadByCode(storedCodeEarly) : Promise.resolve(null)
    ]);
    const candidates = [cloudData, codeResult?.profileData]
      .filter(p => p && p.userProfile);
    for (const candidate of candidates) {
      if (!cachedPackage || packageFreshness(candidate) > packageFreshness(cachedPackage)) {
        cachedPackage = candidate;
      }
    }
    if (cachedPackage && localRaw !== JSON.stringify(cachedPackage)) {
      localStorage.setItem('persistent_profile_data', JSON.stringify(cachedPackage));
    }
  } catch (_) {}

  if (cachedPackage) {
    const currentCalendarDay = todayLocal();

    window.AppState.userProfile = cachedPackage.userProfile;
    window.AppState.partnerProfile = cachedPackage.partnerProfile;
    window.AppState.vibeSeed = cachedPackage.vibeSeed;
    window.AppState.tempAnswers = cachedPackage.tempAnswers || {};
    window.AppState.currentStep = cachedPackage.currentStep || 0;
    if (cachedPackage.gameData) window.AppState.gameData = migrateGameData(cachedPackage.gameData);
    if (cachedPackage.soloMode !== undefined) window.AppState.soloMode = cachedPackage.soloMode;

    // Reset today's mood if it was checked on a previous day
    const gd = window.AppState.gameData;
    if (gd.mood?.lastChecked && gd.mood.lastChecked !== todayLocal()) {
      gd.mood.today = null;
    }

    const devUNameEl = document.getElementById('dev-u-name');
    const devLocEl = document.getElementById('dev-loc');

    if (devUNameEl) devUNameEl.value = cachedPackage.userProfile?.name || '';
    if (devLocEl) devLocEl.value = cachedPackage.userProfile?.location || '';

    // Run the streak update BEFORE persisting, so on the first open of a new
    // local day the streak bump (and the mood reset above) survive even if
    // the user closes the app without playing anything. persistGameData also
    // syncs the rollover to the cloud; on a same-day reopen nothing changed,
    // so nothing is written.
    updateStreak();
    if (cachedPackage.cachedDate !== currentCalendarDay) {
      persistGameData();
    }

    hydrateDashboardViews(cachedPackage);
    switchView('daily-screen');
    initPet();
    renderFriendsSection();

    // Restore save code from localStorage into AppState
    const storedCode = localStorage.getItem('vibeSaveCode');
    if (storedCode) {
      window.AppState.saveCode = storedCode;
      refreshSaveCodeDisplay();
    }
  } else {
    switchView('profile-screen');
    renderActiveStep();
  }
});

// Explicit Global Window Bindings for Inline HTML listeners
window.selectChoice = selectChoice;
window.advanceStepDirect = advanceStepDirect;
window.startSoloMode = startSoloMode;
window.selectCardValue = selectCardValue;
window.registerFieldInput = registerFieldInput;
window.validateStepAdvance = validateStepAdvance;
window.toggleMbtiView = toggleMbtiView;
window.selectDirectGridMbti = selectDirectGridMbti;
window.selectMbtiToggle = selectMbtiToggle;
window.goBackStep = goBackStep;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.toggleDeveloperPanel = toggleDeveloperPanel;
window.devJumpStep = devJumpStep;
window.devForceDashboard = devForceDashboard;
window.syncDevInputs = syncDevInputs;
window.clearProfileCache = clearProfileCache;
window.devLogin = devLogin;
window.devLogout = devLogout;
window.devForceSolo = devForceSolo;
window.devForcePartner = devForcePartner;
window.devSimulateDayAdvance = devSimulateDayAdvance;
window.devAwardPetGrowthManual = devAwardPetGrowthManual;
window.devUnlockAllMilestones = devUnlockAllMilestones;
window.devExportProfile = devExportProfile;
window.devImportProfile = devImportProfile;
window.devRefreshInspector = devRefreshInspector;
window.executeScenarioSimulation = executeScenarioSimulation;
window.refreshDayAtAGlance = refreshDayAtAGlance;
window.refreshSpotlight = refreshSpotlight;
window.refreshBlueprint = refreshBlueprint;
window.refreshPetAffirmation = refreshPetAffirmation;
window.refreshSaveCodeDisplay = refreshSaveCodeDisplay;
window.copySaveCode = copySaveCode;
window.openPetDrawer = () => openDrawer('pet');
window._renderPetSection = renderPetSection;
window.initPet = initPet;
window._renderFriendsSection = renderFriendsSection;
window.toggleSaveCodeEntry = toggleSaveCodeEntry;
window.formatSaveCodeInput = formatSaveCodeInput;
window.submitSaveCode = submitSaveCode;
window.devShowSaveCode = devShowSaveCode;
window.devForceCloudSync = devForceCloudSync;
window.migrateGameData = migrateGameData;
window.updateStreak = updateStreak;

window.loadSavedProfile = () => {
  const raw = localStorage.getItem('persistent_profile_data');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    window.AppState.userProfile = parsed.userProfile;
    window.AppState.partnerProfile = parsed.partnerProfile;
    window.AppState.vibeSeed = parsed.vibeSeed;
    window.AppState.tempAnswers = parsed.tempAnswers || {};
    window.AppState.soloMode = parsed.soloMode || false;
    if (parsed.gameData) window.AppState.gameData = migrateGameData(parsed.gameData);

    // Reset today's mood if it was checked on a previous day
    const gd = window.AppState.gameData;
    if (gd.mood?.lastChecked && gd.mood.lastChecked !== todayLocal()) {
      gd.mood.today = null;
    }

    updateStreak();
    hydrateDashboardViews(parsed);
    switchView('daily-screen');
    initPet();
    renderFriendsSection();

    const storedCode = localStorage.getItem('vibeSaveCode');
    if (storedCode) {
      window.AppState.saveCode = storedCode;
      refreshSaveCodeDisplay();
    }
  } catch (_) {}
};
