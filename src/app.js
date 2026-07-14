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
         devRegenerateSaveCode, devVerifySaveCode } from './dev-tools.js';
import { gameRegistry } from './games/index.js';
import { initPet, renderPetSection, refreshPetAffirmation } from './pet.js';
import { updateStreak, migrateGameData } from './state.js';
import { cloudLoad } from './supabase.js';

// Bind all game window handlers
gameRegistry.bindAll();

// Init: restore cached profile or show onboarding
window.addEventListener('DOMContentLoaded', async () => {
  let cachedPackage = null;

  // Try to load from localStorage first (fast)
  const localRaw = localStorage.getItem('persistent_profile_data');
  if (localRaw) {
    try { cachedPackage = JSON.parse(localRaw); } catch (_) {}
  }

  // Try cloud load — use whichever is newer
  try {
    const cloudData = await cloudLoad();
    if (cloudData && cloudData.userProfile) {
      const localUpdated = cachedPackage?.cachedDate || '';
      const cloudUpdated = cloudData.cachedDate || '';
      if (!cachedPackage || cloudUpdated > localUpdated) {
        cachedPackage = cloudData;
        localStorage.setItem('persistent_profile_data', JSON.stringify(cloudData));
      }
    }
  } catch (_) {}

  if (cachedPackage) {
    const currentCalendarDay = new Date().toISOString().split('T')[0];

    window.AppState.userProfile = cachedPackage.userProfile;
    window.AppState.partnerProfile = cachedPackage.partnerProfile;
    window.AppState.vibeSeed = cachedPackage.vibeSeed;
    window.AppState.tempAnswers = cachedPackage.tempAnswers || {};
    window.AppState.currentStep = cachedPackage.currentStep || 0;
    if (cachedPackage.gameData) window.AppState.gameData = migrateGameData(cachedPackage.gameData);
    if (cachedPackage.soloMode !== undefined) window.AppState.soloMode = cachedPackage.soloMode;

    // Reset today's mood if it was checked on a previous day
    const gd = window.AppState.gameData;
    if (gd.mood?.lastChecked && gd.mood.lastChecked !== new Date().toISOString().split('T')[0]) {
      gd.mood.today = null;
    }

    const devUNameEl = document.getElementById('dev-u-name');
    const devLocEl = document.getElementById('dev-loc');

    if (devUNameEl) devUNameEl.value = cachedPackage.userProfile?.name || '';
    if (devLocEl) devLocEl.value = cachedPackage.userProfile?.location || '';

    if (cachedPackage.cachedDate !== currentCalendarDay) {
      cachedPackage.cachedDate = currentCalendarDay;
      localStorage.setItem('persistent_profile_data', JSON.stringify(cachedPackage));
    }

    updateStreak();
    hydrateDashboardViews(cachedPackage);
    switchView('daily-screen');
    initPet();

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
window.toggleSaveCodeEntry = toggleSaveCodeEntry;
window.formatSaveCodeInput = formatSaveCodeInput;
window.submitSaveCode = submitSaveCode;
window.devRegenerateSaveCode = devRegenerateSaveCode;
window.devVerifySaveCode = devVerifySaveCode;
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
    if (gd.mood?.lastChecked && gd.mood.lastChecked !== new Date().toISOString().split('T')[0]) {
      gd.mood.today = null;
    }

    updateStreak();
    hydrateDashboardViews(parsed);
    switchView('daily-screen');
    initPet();

    const storedCode = localStorage.getItem('vibeSaveCode');
    if (storedCode) {
      window.AppState.saveCode = storedCode;
      refreshSaveCodeDisplay();
    }
  } catch (_) {}
};
