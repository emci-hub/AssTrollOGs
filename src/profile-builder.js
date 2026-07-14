/**
 * Profile builder wizard — onboarding steps, MBTI toggles, validation, and finalization.
 * To edit the profile build flow, this is the only file you need.
 */

import { PSYCH_QUESTIONS, MBTI_TYPES } from './questions.js';
import { engine } from './engine.js';
import { hydrateDashboardViews } from './dashboard.js';
import { generateSaveCode, verifySaveCode } from './save-code.js';
import { cloudSave, cloudLoadByCode } from './supabase.js';

let activeMbtiTab = "toggle";
let activePartnerMbtiTab = "toggle";

export function switchView(screenId) {
  const screens = ['profile-screen', 'daily-screen'];
  screens.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      if (id === screenId) element.classList.remove('hidden');
      else element.classList.add('hidden');
    }
  });

  const headerDisplay = document.getElementById('dynamic-header');
  if (headerDisplay) {
    if (screenId === 'daily-screen') {
      const uName = window.AppState.userProfile.name || 'User';
      const seed = window.AppState.vibeSeed || '00000000';
      if (window.AppState.soloMode || !window.AppState.partnerProfile) {
        headerDisplay.innerHTML = `<span><strong>${uName}</strong></span> <span>VIBE ID: <strong>${seed}</strong></span>`;
      } else {
        const pName = window.AppState.partnerProfile.name || 'Partner';
        headerDisplay.innerHTML = `<span><strong>${uName}</strong> + <strong>${pName}</strong></span> <span>VIBE ID: <strong>${seed}</strong></span>`;
      }
      window.AppState.currentState = 'PHASE_3_DAILY';
    } else {
      headerDisplay.innerHTML = `<span>Unified Interface State</span> <span>VIBE ID: <strong>INIT</strong></span>`;
      window.AppState.currentState = 'PHASE_1';
    }
  }
}

function renderBackButton(targetStep) {
  return `<button class="btn btn-outline" style="margin-top:8px; margin-bottom:0;" onclick="goBackStep(${targetStep})">Back</button>`;
}

export function goBackStep(targetStep) {
  if (targetStep === 0) window.AppState.soloMode = false;
  window.AppState.currentStep = targetStep;
  renderActiveStep();
}

export function renderActiveStep() {
  const stepIndex = window.AppState.currentStep;
  const container = document.getElementById('quiz-step-container');
  const warning = document.getElementById('validation-warning');

  if (warning) warning.classList.add('hidden');
  if (!container) return;

  let html = "";

  if (stepIndex === 0) {
    const hasSavedProfile = !!localStorage.getItem('persistent_profile_data');
    const continueBtn = hasSavedProfile ? `
      <button class="choice-btn" onclick="loadSavedProfile()">
        <span style="display:block; font-weight:700;">Continue Where You Left Off</span>
        <span class="choice-btn-subtitle">Reload your saved profile and return to your dashboard.</span>
      </button>
    ` : '';
    html = `
      <header>
        <div class="subtitle">Welcome</div>
        <h1>Let's Get Started</h1>
      </header>
      <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
        ${continueBtn}
        <button class="choice-btn" onclick="advanceStepDirect(1)">
          <span style="display:block; font-weight:700;">Start Fresh — With Partner</span>
          <span class="choice-btn-subtitle">Build profiles for you and your partner to unlock alignment insights.</span>
        </button>
        <button class="choice-btn" onclick="startSoloMode()">
          <span style="display:block; font-weight:700;">Solo Journey</span>
          <span class="choice-btn-subtitle">Build your personal profile without a partner. Same insights, focused on you.</span>
        </button>
        <div class="save-code-restore-panel">
          <button class="choice-btn save-code-restore-toggle" onclick="toggleSaveCodeEntry()" id="save-code-toggle-btn">
            <span style="display:block; font-weight:700;">Restore from Save Code</span>
            <span class="choice-btn-subtitle">Have a VIBE-XXXX-XXXX code from another device? Enter it here.</span>
          </button>
          <div id="save-code-entry-panel" style="display:none; margin-top:10px;">
            <div class="input-group" style="margin-bottom:8px;">
              <label style="font-size:0.7rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Your Save Code</label>
              <input type="text" id="save-code-input" class="input-field save-code-input-field"
                placeholder="VIBE-XXXX-XXXX"
                maxlength="14"
                oninput="formatSaveCodeInput(this)"
                onkeydown="if(event.key==='Enter') submitSaveCode()">
            </div>
            <div id="save-code-error" style="display:none; font-size:0.7rem; color:#f87171; margin-bottom:8px; font-family:monospace;"></div>
            <button class="btn" id="save-code-submit-btn" onclick="submitSaveCode()">Load Save</button>
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
    return;
  }

  if (stepIndex === 1) {
    const uName = window.AppState.tempAnswers['userName'] || '';
    const pName = window.AppState.tempAnswers['partnerName'] || '';
    const loc = window.AppState.tempAnswers['location'] || '';
    const partnerField = window.AppState.soloMode ? '' : `
      <div class="input-group">
        <label for="partnerName">Your partner's name</label>
        <input type="text" id="partnerName" class="input-field" placeholder="e.g. Jordan" value="${pName}" oninput="registerFieldInput('partnerName', this.value)">
      </div>
    `;
    const soloBadge = window.AppState.soloMode ? `<div style="font-size:0.7rem; color:var(--accent-primary); font-weight:700; margin-bottom:8px;">SOLO JOURNEY MODE</div>` : '';
    html = `
      <header>
        <div class="subtitle">Step 0.5</div>
        <h1>Onboarding Identifiers</h1>
      </header>
      ${soloBadge}
      <div class="card">
        <div class="input-group">
          <label for="userName">Your full name</label>
          <input type="text" id="userName" class="input-field" placeholder="e.g. Alex Rivera" value="${uName}" oninput="registerFieldInput('userName', this.value)">
        </div>
        ${partnerField}
        <div class="input-group">
          <label for="location">Your city or region</label>
          <input type="text" id="location" class="input-field" placeholder="e.g. New York, LA, London" value="${loc}" oninput="registerFieldInput('location', this.value)">
        </div>
      </div>
      <button class="btn" onclick="validateStepAdvance()">Continue</button>
      ${renderBackButton(0)}
    `;
    container.innerHTML = html;
    return;
  }

  if (stepIndex >= 2 && stepIndex <= 6) {
    const questionIndex = stepIndex - 2;
    const question = PSYCH_QUESTIONS[questionIndex];
    html = renderPsychQuestionBlock(question, false);
    container.innerHTML = html;
    return;
  }

  if (!window.AppState.soloMode && stepIndex >= 7 && stepIndex <= 11) {
    const questionIndex = stepIndex - 7;
    const question = PSYCH_QUESTIONS[questionIndex];
    html = renderPsychQuestionBlock(question, true);
    container.innerHTML = html;
    return;
  }

  if (stepIndex === 12 || (window.AppState.soloMode && stepIndex === 7)) {
    const isSelected = window.AppState.tempAnswers['relationshipStatus'] || '';
    const soloLabel = window.AppState.soloMode ? 'Your Life Stage' : 'Relationship Status Alignment';
    const soloSub = window.AppState.soloMode ? 'Step 6' : 'Step 8';
    const backTarget = window.AppState.soloMode ? 6 : 11;
    html = `
      <header>
        <div class="subtitle">${soloSub}</div>
        <h1>${soloLabel}</h1>
      </header>
      <div class="card">
        <p class="card-body" style="margin-bottom: 12px;">Select the dynamic alignment state that represents your setup:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${renderStatusCard('Early Stages', 'early', 'Exploring dynamics and initial compatibility variables.', isSelected)}
          ${renderStatusCard('Committed Alignment', 'committed', 'Sustained, structured commitments and shared objectives.', isSelected)}
          ${renderStatusCard('Co-Habitating / Married', 'cohabitating', 'Unified residential planning and daily tactical tasks.', isSelected)}
          ${renderStatusCard('Long Distance', 'longdistance', 'Geographically distributed operations and remote variables.', isSelected)}
        </div>
      </div>
      <button class="btn" onclick="validateStepAdvance()">Complete Configuration</button>
      ${renderBackButton(backTarget)}
    `;
    container.innerHTML = html;
    return;
  }
}

function renderPsychQuestionBlock(q, isPartner) {
  if (!q) return "";
  const pName = window.AppState.tempAnswers['partnerName'] || 'Partner';
  const rawTitle = isPartner ? `Partner's ${q.title}` : q.title;
  const title = rawTitle.replace("Your", `${pName}'s`).replace("Partner's", `${pName}'s`);

  let questionText = q.question;
  if (isPartner) {
    questionText = questionText.replace("your", `${pName}'s`).replace("You", pName).replace("you", pName);
  }

  const stepDisplayLabel = isPartner ? `7.${window.AppState.currentStep - 6}` : (window.AppState.currentStep - 1).toString();

  let html = `
    <header>
      <div class="subtitle">Step ${stepDisplayLabel}</div>
      <h1>${title}</h1>
    </header>
    <div class="card">
      <p class="card-body" style="margin-bottom: 14px;">${questionText}</p>
  `;

  if (q.type === 'mbti') {
    const activeTab = isPartner ? activePartnerMbtiTab : activeMbtiTab;
    const prefix = isPartner ? "partnerMbti" : "mbti";

    html += `
      <div class="mbti-tab-nav">
        <div class="mbti-tab ${activeTab === 'toggle' ? 'active' : ''}" onclick="toggleMbtiView('${prefix}', 'toggle')">4-Part Toggle</div>
        <div class="mbti-tab ${activeTab === 'grid' ? 'active' : ''}" onclick="toggleMbtiView('${prefix}', 'grid')">16-Type Grid</div>
      </div>
    `;

    if (activeTab === 'toggle') {
      html += `
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${renderMbtiToggleRow('Energy Type', 'E', 'Extraversion', 'I', 'Introversion', prefix + 'EOrI')}
          ${renderMbtiToggleRow('Sensing Method', 'S', 'Sensing', 'N', 'Intuition', prefix + 'SOrN')}
          ${renderMbtiToggleRow('Decision Priority', 'T', 'Thinking', 'F', 'Feeling', prefix + 'TOrF')}
          ${renderMbtiToggleRow('Operational Layout', 'J', 'Judging', 'P', 'Perceiving', prefix + 'JOrP')}
        </div>
      `;
    } else {
      html += `<div class="mbti-grid">`;
      const currentSelectedMbti = getAssembledMbti(prefix);
      MBTI_TYPES.forEach(type => {
        html += `<button class="mbti-grid-btn ${currentSelectedMbti === type ? 'active' : ''}" onclick="selectDirectGridMbti('${prefix}', '${type}')">${type}</button>`;
      });
      html += `</div>`;
    }
  } else {
    const targetKey = isPartner ? `partner_${q.key}` : q.key;
    const isSelected = window.AppState.tempAnswers[targetKey] || '';

    html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    q.choices.forEach(choice => {
      const selected = isSelected === choice.value;
      let descText = choice.desc;
      if (isPartner) {
        descText = descText.replace(/your/g, `${pName}'s`).replace(/you /g, `${pName} `).replace(/You /g, `${pName} `);
      }
      html += `
        <div class="card interactive-card ${selected ? 'selected' : ''}" style="margin-bottom: 0; padding: 12px 16px; border-color: ${selected ? 'var(--accent-primary)' : 'var(--border-color)'};" onclick="selectCardValue('${targetKey}', '${choice.value}')">
          <div style="font-size: 0.85rem; font-weight: 700; color: ${selected ? 'var(--accent-primary)' : 'var(--text-primary)'};">${choice.label}</div>
          <div style="font-size: 0.725rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.35;">${descText}</div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  const backTarget = isPartner
    ? (window.AppState.currentStep === 7 ? 6 : window.AppState.currentStep - 1)
    : (window.AppState.currentStep === 2 ? 1 : window.AppState.currentStep - 1);
  html += `<button class="btn" style="margin-top: auto;" onclick="validateStepAdvance()">Continue</button>`;
  html += renderBackButton(backTarget);
  return html;
}

function renderMbtiToggleRow(label, v1, l1, v2, l2, key) {
  const currentSelected = window.AppState.tempAnswers[key] || v1;
  return `
    <div class="toggle-row">
      <div class="toggle-label">${label}</div>
      <div class="toggle-buttons">
        <button class="toggle-btn ${currentSelected === v1 ? 'active' : ''}" onclick="selectMbtiToggle('${key}', '${v1}')">${v1}</button>
        <button class="toggle-btn ${currentSelected === v2 ? 'active' : ''}" onclick="selectMbtiToggle('${key}', '${v2}')">${v2}</button>
      </div>
    </div>
  `;
}

function renderStatusCard(title, val, desc, activeVal) {
  const selected = activeVal === val;
  return `
    <div class="card interactive-card ${selected ? 'selected' : ''}" style="margin-bottom:0; padding: 12px 16px; border-color: ${selected ? 'var(--accent-primary)' : 'var(--border-color)'};" onclick="selectCardValue('relationshipStatus', '${val}')">
      <div style="font-size: 0.85rem; font-weight: 700; color: ${selected ? 'var(--accent-primary)' : 'var(--text-primary)'};">${title}</div>
      <div style="font-size: 0.725rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.35;">${desc}</div>
    </div>
  `;
}

export function selectMbtiToggle(key, val) {
  window.AppState.tempAnswers[key] = val;
  renderActiveStep();
}

export function selectDirectGridMbti(prefix, val) {
  window.AppState.tempAnswers[prefix + 'EOrI'] = val[0];
  window.AppState.tempAnswers[prefix + 'SOrN'] = val[1];
  window.AppState.tempAnswers[prefix + 'TOrF'] = val[2];
  window.AppState.tempAnswers[prefix + 'JOrP'] = val[3];
  renderActiveStep();
}

export function toggleMbtiView(prefix, view) {
  if (prefix === 'mbti') activeMbtiTab = view;
  else activePartnerMbtiTab = view;
  renderActiveStep();
}

export function getAssembledMbti(prefix) {
  return [
    window.AppState.tempAnswers[prefix + 'EOrI'] || 'E',
    window.AppState.tempAnswers[prefix + 'SOrN'] || 'N',
    window.AppState.tempAnswers[prefix + 'TOrF'] || 'F',
    window.AppState.tempAnswers[prefix + 'JOrP'] || 'P'
  ].join('');
}

export function registerFieldInput(id, val) {
  window.AppState.tempAnswers[id] = val;
  const warning = document.getElementById('validation-warning');
  if (warning) warning.classList.add('hidden');
}

export function selectCardValue(field, val) {
  window.AppState.tempAnswers[field] = val;
  renderActiveStep();
}

export function advanceStepDirect(target) {
  window.AppState.currentStep = target;
  renderActiveStep();
}

export function startSoloMode() {
  window.AppState.soloMode = true;
  window.AppState.currentStep = 1;
  renderActiveStep();
}

export function selectChoice(stepId, val) {
  window.AppState.tempAnswers[stepId] = val;
  renderActiveStep();
}

export function validateStepAdvance() {
  const stepIndex = window.AppState.currentStep;
  const warning = document.getElementById('validation-warning');
  let isValid = true;

  if (stepIndex === 1) {
    const uName = window.AppState.tempAnswers['userName'];
    const loc = window.AppState.tempAnswers['location'];
    if (!uName || !loc || uName.trim() === '' || loc.trim() === '') {
      isValid = false;
    }
    if (isValid && !window.AppState.soloMode) {
      const pName = window.AppState.tempAnswers['partnerName'];
      if (!pName || pName.trim() === '') isValid = false;
    }
  } else if (stepIndex >= 3 && stepIndex <= 6) {
    const q = PSYCH_QUESTIONS[stepIndex - 2];
    if (!window.AppState.tempAnswers[q.key]) isValid = false;
  } else if (!window.AppState.soloMode && stepIndex >= 8 && stepIndex <= 11) {
    const q = PSYCH_QUESTIONS[stepIndex - 7];
    if (!window.AppState.tempAnswers[`partner_${q.key}`]) isValid = false;
  } else if (stepIndex === 12 || (window.AppState.soloMode && stepIndex === 7)) {
    if (!window.AppState.tempAnswers['relationshipStatus']) isValid = false;
  }

  if (!isValid) {
    if (warning) warning.classList.remove('hidden');
    return;
  }

  if (window.AppState.soloMode) {
    if (stepIndex < 7) {
      window.AppState.currentStep++;
      renderActiveStep();
    } else {
      finalizeEngineData();
    }
  } else {
    if (stepIndex < 12) {
      window.AppState.currentStep++;
      renderActiveStep();
    } else {
      finalizeEngineData();
    }
  }
}

export function finalizeEngineData() {
  const timestampInstance = new Date();
  const msString = timestampInstance.getTime().toString();

  const uName = window.AppState.tempAnswers['userName'] || 'User';
  const pName = window.AppState.tempAnswers['partnerName'] || 'Partner';
  const locVal = window.AppState.tempAnswers['location'] || 'Local';

  const calculatedSeed = engine.computeDeterministicSeed(uName, locVal, msString);
  window.AppState.vibeSeed = calculatedSeed;

  window.AppState.userProfile = {
    name: uName,
    location: locVal,
    mbti: getAssembledMbti('mbti'),
    attachmentStyle: window.AppState.tempAnswers['attachment'],
    conflictStyle: window.AppState.tempAnswers['conflict'],
    loveLanguage: window.AppState.tempAnswers['loveLanguage'],
    expressionStyle: window.AppState.tempAnswers['expression'],
    relationshipStatus: window.AppState.tempAnswers['relationshipStatus'] || 'early'
  };

  if (window.AppState.soloMode) {
    window.AppState.partnerProfile = null;
  } else {
    window.AppState.partnerProfile = {
      name: pName,
      mbti: getAssembledMbti('partnerMbti'),
      attachmentStyle: window.AppState.tempAnswers['partner_attachment'],
      conflictStyle: window.AppState.tempAnswers['partner_conflict'],
      loveLanguage: window.AppState.tempAnswers['partner_loveLanguage'],
      expressionStyle: window.AppState.tempAnswers['partner_expression']
    };
  }

  const cacheKeyDate = timestampInstance.toISOString().split('T')[0];

  const storagePayload = {
    userProfile: window.AppState.userProfile,
    partnerProfile: window.AppState.partnerProfile,
    soloMode: window.AppState.soloMode,
    vibeSeed: window.AppState.vibeSeed,
    tempAnswers: window.AppState.tempAnswers,
    gameData: window.AppState.gameData,
    currentStep: window.AppState.currentStep,
    cachedDate: cacheKeyDate
  };

  localStorage.setItem('persistent_profile_data', JSON.stringify(storagePayload));

  // Generate save code immediately on first profile creation
  generateSaveCode(storagePayload).then(code => {
    localStorage.setItem('vibeSaveCode', code);
    window.AppState.saveCode = code;
    cloudSave(storagePayload, code);
    if (typeof window.refreshSaveCodeDisplay === 'function') window.refreshSaveCodeDisplay();
  }).catch(() => cloudSave(storagePayload));

  hydrateDashboardViews(storagePayload);
  switchView('daily-screen');
  if (typeof window.initPet === 'function') window.initPet();
}

// ─── Save Code UI helpers (called from inline onclick in Step 0) ──────────────

export function toggleSaveCodeEntry() {
  const panel = document.getElementById('save-code-entry-panel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none';
  panel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    const input = document.getElementById('save-code-input');
    if (input) input.focus();
  }
}

export function formatSaveCodeInput(input) {
  let val = input.value.toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (val.startsWith('VIBE')) val = val.slice(4);
  val = val.slice(0, 8);
  let formatted = 'VIBE';
  if (val.length > 0) formatted += '-' + val.slice(0, 4);
  if (val.length > 4) formatted += '-' + val.slice(4, 8);
  input.value = formatted;
}

export async function submitSaveCode() {
  const input = document.getElementById('save-code-input');
  const errEl = document.getElementById('save-code-error');
  const btn = document.getElementById('save-code-submit-btn');
  if (!input) return;

  const code = input.value.trim();
  if (!code || code.replace(/[-\s]/g, '').length < 8) {
    if (errEl) { errEl.textContent = 'Enter a complete VIBE-XXXX-XXXX code.'; errEl.style.display = 'block'; }
    return;
  }

  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }
  if (errEl) errEl.style.display = 'none';

  try {
    const result = await cloudLoadByCode(code);

    if (!result || !result.profileData) {
      throw new Error('No save found for that code.');
    }

    const valid = await verifySaveCode(code, result.profileData);
    if (!valid) {
      throw new Error('Code does not match the stored profile. Double-check and try again.');
    }

    const parsed = result.profileData;
    window.AppState.userProfile = parsed.userProfile;
    window.AppState.partnerProfile = parsed.partnerProfile || null;
    window.AppState.vibeSeed = parsed.vibeSeed;
    window.AppState.tempAnswers = parsed.tempAnswers || {};
    window.AppState.soloMode = parsed.soloMode || false;
    if (parsed.gameData && typeof window.migrateGameData === 'function') {
      window.AppState.gameData = window.migrateGameData(parsed.gameData);
    } else if (parsed.gameData) {
      window.AppState.gameData = parsed.gameData;
    }

    // Reset stale mood
    const gd = window.AppState.gameData;
    if (gd.mood?.lastChecked && gd.mood.lastChecked !== new Date().toISOString().split('T')[0]) {
      gd.mood.today = null;
    }

    // Store the code and device mapping locally
    const codeFormatted = result.saveCode || code;
    localStorage.setItem('persistent_profile_data', JSON.stringify(parsed));
    localStorage.setItem('vibeSaveCode', codeFormatted);
    window.AppState.saveCode = codeFormatted;

    // Upsert this device's own row, tagged with the shared save code (fire-and-forget)
    cloudSave(parsed, codeFormatted);

    if (typeof window.updateStreak === 'function') window.updateStreak();
    hydrateDashboardViews(parsed);
    switchView('daily-screen');
    if (typeof window.initPet === 'function') window.initPet();

  } catch (e) {
    if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
    if (btn) { btn.textContent = 'Load Save'; btn.disabled = false; }
  }
}
