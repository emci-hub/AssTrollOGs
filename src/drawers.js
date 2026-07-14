/**
 * Overlay drawers — Deep Insights, Sandbox, and Games drawers.
 * Games init is dispatched through the games registry.
 * Adapts content for solo mode (no partner).
 */

import { engine } from './engine.js';
import { insights } from './insights.js';
import { gameRegistry } from './games/index.js';
import { hydrateDashboardViews } from './dashboard.js';
import { renderPetDrawer } from './pet.js';

let _insightOffsets = { groove: 0, journey: 0, decoder: 0, vibe: 0 };

function renderInsightDrawer(type, solo) {
  const profiles = { user: window.AppState.userProfile, partner: window.AppState.partnerProfile };
  const gameData = window.AppState.gameData;
  const now = new Date();
  const offset = _insightOffsets[type] || 0;
  const insight = insights.generateDeepInsight(type, profiles, gameData, now, offset);

  const SUBTITLES = {
    groove: solo ? 'How you communicate' : 'How you two communicate',
    journey: solo ? 'Your personal growth' : 'Your path together',
    decoder: solo ? 'What makes you feel seen' : 'What makes each of you feel seen',
    vibe:    solo ? 'Your personality snapshot' : 'Your connection snapshot'
  };
  const ICONS = { groove: '💬', journey: '🗺', decoder: '💛', vibe: '✨' };

  const pool = insight.pool || [];
  const hasMore = pool.length > 1;

  return `
    <div class="subtitle">Deep Insights</div>
    <h2 style="margin-bottom:4px;">${insight.headline || insight.title}</h2>
    <p class="card-body" style="margin-bottom:14px; color:var(--text-muted);">${SUBTITLES[type]}</p>
    <div class="card" style="margin-bottom:14px; border-color:rgba(129,140,248,0.25);">
      <p class="card-body" style="line-height:1.6;">${insight.body}</p>
    </div>
    ${hasMore ? `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <span style="font-size:0.65rem; color:var(--text-muted);">${(offset % pool.length) + 1} of ${pool.length} reads</span>
      <button class="btn btn-outline" style="font-size:0.7rem; padding:5px 12px;" onclick="cycleInsight('${type}')">Next Read</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${pool.filter((_, i) => i !== (offset % pool.length)).slice(0, 2).map((p, i) => `
        <div class="card interactive-card" style="opacity:0.7;" onclick="jumpInsight('${type}', ${pool.indexOf(p)})">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary); margin-bottom:2px;">${p.headline}</div>
          <div style="font-size:0.65rem; color:var(--text-muted); line-height:1.3;">${p.body.slice(0, 80)}...</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;
}

export function openDrawer(type) {
  const drawer = document.getElementById('detail-drawer');
  const drawerContent = document.getElementById('drawer-dynamic-content');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer || !drawerContent) return;

  const uName = window.AppState.userProfile?.name || 'User';
  const pName = window.AppState.partnerProfile?.name || 'Partner';
  const profiles = { user: window.AppState.userProfile, partner: window.AppState.partnerProfile };
  const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
  const gameData = window.AppState.gameData;
  const now = new Date();

  let payloadHtml = '';

  switch (type) {
    case 'groove':
    case 'journey':
    case 'decoder':
    case 'vibe': {
      payloadHtml = renderInsightDrawer(type, solo);
      break;
    }
    case 'duo': {
      if (solo) {
        const vibeName = engine.generateSoloVibeName(uName, window.AppState.userProfile, 0);
        const soloTaglines = [
          "Your energy in one word.", "This is your signature.", "What the universe calls you.",
          "Your vibe, certified.", "100% you.", "The name the room remembers."
        ];
        const tagline = soloTaglines[(uName.length + vibeName.length) % soloTaglines.length];
        payloadHtml = `
          <div class="subtitle">The Sandbox</div>
          <h2 style="margin-bottom:12px;">Your Vibe Name</h2>
          <p class="card-body" style="margin-bottom:16px;">A fun name built from your personality — yours and yours alone.</p>
          <div class="sandbox-interactive-container" style="flex-direction:column; gap:8px;">
            <div class="ship-name-tag" id="vibe-name-display">${vibeName}</div>
            <div id="vibe-name-tagline" style="font-size:0.75rem; color:var(--text-muted); text-align:center;">${tagline}</div>
          </div>
          <button class="btn btn-outline" style="margin-top:14px;" onclick="rerollVibeName()">Try Another</button>
        `;
      } else {
        const mergedName = engine.generateDuoName(uName, pName, 0);
        const duoTaglines = [
          "The internet would ship this.", "A duo for the ages.", "Celebrity couple energy.",
          "Iconic. No notes.", "This name hits different.", "The collab everyone needed."
        ];
        const tagline = duoTaglines[(uName.length + pName.length) % duoTaglines.length];
        payloadHtml = `
          <div class="subtitle">The Sandbox</div>
          <h2 style="margin-bottom:12px;">Your Ship Name</h2>
          <p class="card-body" style="margin-bottom:16px;">Your names, blended into one unforgettable duo name.</p>
          <div class="sandbox-interactive-container" style="flex-direction:column; gap:8px;">
            <div class="ship-name-tag" id="vibe-name-display">${mergedName}</div>
            <div id="vibe-name-tagline" style="font-size:0.75rem; color:var(--text-muted); text-align:center;">${tagline}</div>
          </div>
          <button class="btn btn-outline" style="margin-top:14px;" onclick="rerollVibeName()">Try Another</button>
        `;
      }
      break;
    }
    case 'bingo': {
      const game = gameRegistry.get('bingo');
      if (game) payloadHtml = game.renderDrawer();
      break;
    }
    case 'chronicles': {
      const scenario = insights.generateChronicleScenario(profiles);
      window._currentScenario = scenario;
      const title = solo ? 'Solo Chronicles' : 'Teamwork Chronicles';
      const intro = solo
        ? 'Pick a scenario and see how your personality handles it. Hit Run to play it out.'
        : 'Pick a scenario and see how you two team up. Different every time.';
      payloadHtml = `
        <div class="subtitle">The Sandbox</div>
        <h2 style="margin-bottom:4px;">${title}</h2>
        <p class="card-body" style="margin-bottom:14px; color:var(--text-muted);">${intro}</p>
        <div class="card" style="margin-bottom:14px; border-color:rgba(129,140,248,0.25);">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">Today's Scenario</div>
          <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:12px;">${scenario.task.charAt(0).toUpperCase() + scenario.task.slice(1)}</div>
          <div style="display:flex; flex-direction:column; gap:6px; font-size:0.75rem; color:var(--text-secondary);">
            <div><strong style="color:var(--accent-primary);">${scenario.userName}</strong> — ${scenario.userRole}</div>
            ${scenario.partnerRole ? `<div><strong style="color:var(--success-color);">${scenario.partnerName}</strong> — ${scenario.partnerRole}</div>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn" style="flex:1; padding:12px;" onclick="runChronicleSimulation()">Run It</button>
          <button class="btn btn-outline" style="padding:12px;" onclick="newChronicleScenario()">New Scenario</button>
        </div>
        <div class="chronicle-console" id="simulation-console" style="margin-top:14px; display:none;"></div>
      `;
      break;
    }
    case 'selfcheck': {
      const attach = window.AppState.userProfile?.attachmentStyle || 'secure';
      const expr = window.AppState.userProfile?.expressionStyle || 'direct';
      const ATTACH_MOODS = {
        secure:   ['Calm and open', 'Grounded and present', 'Warm and steady'],
        anxious:  ['A little on edge', 'Seeking some reassurance', 'Emotionally alert'],
        avoidant: ['Needing some space', 'Quietly self-contained', 'Processing on my own'],
        fearful:  ['Cautiously hopeful', 'Balancing distance and closeness', 'Carefully reflective']
      };
      const EXPR_ACTIONS = {
        direct:     'Say exactly one thing you need out loud today.',
        indirect:   'Write down what you really want — then say it.',
        reflective: 'Take 5 quiet minutes to journal one thing on your mind.',
        analytical: 'Break one challenge into three smaller, doable steps.'
      };
      const moods = ATTACH_MOODS[attach] || ATTACH_MOODS.secure;
      const action = EXPR_ACTIONS[expr] || EXPR_ACTIONS.direct;
      payloadHtml = `
        <div class="subtitle">The Sandbox</div>
        <h2 style="margin-bottom:4px;">Energy Check-In</h2>
        <p class="card-body" style="margin-bottom:16px; color:var(--text-muted);">Quick vibe check — where are you at right now?</p>
        <div class="card" style="margin-bottom:12px;">
          <div class="card-title" style="margin-bottom:10px;">I'm feeling...</div>
          <div style="display:flex; flex-direction:column; gap:8px;" id="selfcheck-options">
            ${moods.map(m => `<button class="choice-btn" style="text-align:left;" onclick="selectSelfCheckMood(this, '${m.replace(/'/g,"\\'")}', \`${action}\`)">${m}</button>`).join('')}
            <button class="choice-btn" style="text-align:left;" onclick="selectSelfCheckMood(this, 'Something else entirely', \`${action}\`)">Something else entirely</button>
          </div>
        </div>
        <div id="selfcheck-result" style="display:none;" class="card"></div>
      `;
      break;
    }
    case 'profile-settings': {
      const u = window.AppState.userProfile || {};
      const ATTACH_LABELS = { secure: 'Comfortable with closeness', anxious: 'Needs reassurance', avoidant: 'Values independence', fearful: 'Cautiously open' };
      const CONFLICT_LABELS = { collaborative: 'Talks it through', compromising: 'Finds middle ground', accommodating: 'Keeps the peace', avoiding: 'Needs space first' };
      const LOVE_LABELS = { words: 'Kind words', time: 'Quality time', service: 'Helpful actions', touch: 'Physical closeness', gifts: 'Thoughtful gifts' };
      const EXPR_LABELS = { direct: 'Says it directly', indirect: 'Drops hints', reflective: 'Thinks first', analytical: 'Breaks it down' };

      function makeSelect(id, opts, labels, current, label) {
        const options = opts.map(o => `<option value="${o}" ${current === o ? 'selected' : ''}>${labels[o] || o}</option>`).join('');
        return `<div class="input-group" style="margin-bottom:10px;">
          <label style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; display:block; margin-bottom:4px;">${label}</label>
          <select id="ps-${id}" class="input-field" style="cursor:pointer;">${options}</select>
        </div>`;
      }

      payloadHtml = `
        <div class="subtitle">Profile Settings</div>
        <h2 style="margin-bottom:12px;">Edit Your Profile</h2>
        <p class="card-body" style="margin-bottom:16px;">Changes apply right away and stay saved.</p>
        <div class="card" style="margin-bottom:12px;">
          <div class="card-title" style="margin-bottom:10px;">Your Info</div>
          <div class="input-group" style="margin-bottom:10px;">
            <label style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; display:block; margin-bottom:4px;">Your Name</label>
            <input type="text" id="ps-name" class="input-field" value="${u.name || ''}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; display:block; margin-bottom:4px;">Location</label>
            <input type="text" id="ps-location" class="input-field" value="${u.location || ''}">
          </div>
        </div>
        <div class="card" style="margin-bottom:12px;">
          <div class="card-title" style="margin-bottom:10px;">Your Style</div>
          ${makeSelect('attach', ['secure','anxious','avoidant','fearful'], ATTACH_LABELS, u.attachmentStyle, 'How you are with closeness')}
          ${makeSelect('conflict', ['collaborative','compromising','accommodating','avoiding'], CONFLICT_LABELS, u.conflictStyle, 'How you handle disagreements')}
          ${makeSelect('love', ['words','time','service','touch','gifts'], LOVE_LABELS, u.loveLanguage, 'How you feel most loved')}
          ${makeSelect('expr', ['direct','indirect','reflective','analytical'], EXPR_LABELS, u.expressionStyle, 'How you communicate')}
        </div>
        <button class="btn" onclick="saveProfileSettings()">Save Changes</button>
        <div id="ps-saved-msg" style="display:none; text-align:center; color:var(--success-color); font-size:0.8rem; font-weight:700; margin-top:10px;">Profile updated!</div>
      `;
      break;
    }
    case 'pet': {
      payloadHtml = renderPetDrawer();
      break;
    }
    default: {
      const game = gameRegistry.get(type);
      if (game) payloadHtml = game.renderDrawer();
      break;
    }
  }

  drawerContent.innerHTML = payloadHtml;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');

  const game = gameRegistry.get(type);
  if (game && game.init) game.init();
}

export function closeDrawer() {
  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

export function executeScenarioSimulation(uName, pName, mbti, task, userRole, partnerRole) {
  const consoleBox = document.getElementById('simulation-console');
  if (!consoleBox) return;

  consoleBox.style.display = '';
  consoleBox.innerHTML = '';

  const SOLO_RESULTS = [
    'Handled it. That\'s the energy.',
    'Nailed it solo. No notes.',
    'Done and done. You made it look easy.',
    'Completely pulled it off on your own.',
    'That\'s what self-reliance looks like.',
  ];
  const DUO_RESULTS = [
    'Total success. You two made it look effortless.',
    'Absolutely nailed it together.',
    'That\'s the power of a great team.',
    'Flawless execution. Nobody does it like you two.',
    'Complete win. You complemented each other perfectly.',
  ];

  const steps = [];
  steps.push({ delay: 0, text: `<span style="color:var(--text-muted);">Scenario: <em>${task}...</em></span>` });
  if (partnerRole) {
    steps.push({ delay: 600, text: `<strong style="color:var(--accent-primary);">${uName}</strong> jumps in — ${userRole}...` });
    steps.push({ delay: 1200, text: `<strong style="color:var(--success-color);">${pName}</strong> steps up — ${partnerRole}...` });
    const result = DUO_RESULTS[Math.floor(Math.random() * DUO_RESULTS.length)];
    steps.push({ delay: 2000, text: `<br><strong style="color:var(--success-color); font-size:0.9rem;">${result}</strong>` });
  } else {
    steps.push({ delay: 600, text: `<strong style="color:var(--accent-primary);">${uName}</strong> takes on the challenge — ${userRole}...` });
    const result = SOLO_RESULTS[Math.floor(Math.random() * SOLO_RESULTS.length)];
    steps.push({ delay: 1400, text: `<br><strong style="color:var(--success-color); font-size:0.9rem;">${result}</strong>` });
  }
  steps.push({ delay: steps[steps.length - 1].delay + 600, text: '<br><button class="btn btn-outline" style="margin-top:8px; font-size:0.75rem;" onclick="newChronicleScenario()">Try Another Scenario</button>' });

  steps.forEach(({ delay, text }) => {
    setTimeout(() => { consoleBox.innerHTML += text + '<br>'; }, delay);
  });
}

window.runChronicleSimulation = function() {
  const scenario = window._currentScenario;
  if (!scenario) return;
  const btn = document.querySelector('[onclick="runChronicleSimulation()"]');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  executeScenarioSimulation(
    scenario.userName, scenario.partnerName, scenario.userMbti,
    scenario.task, scenario.userRole, scenario.partnerRole
  );
};

window.newChronicleScenario = function() {
  const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
  openDrawer('chronicles');
};

window.cycleInsight = function(type) {
  _insightOffsets[type] = (_insightOffsets[type] || 0) + 1;
  const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
  const drawerContent = document.getElementById('drawer-dynamic-content');
  if (!drawerContent) return;
  drawerContent.style.opacity = '0';
  drawerContent.style.transition = 'opacity 0.15s';
  setTimeout(() => {
    drawerContent.innerHTML = renderInsightDrawer(type, solo);
    drawerContent.style.opacity = '1';
  }, 150);
};

window.jumpInsight = function(type, idx) {
  _insightOffsets[type] = idx;
  const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
  const drawerContent = document.getElementById('drawer-dynamic-content');
  if (!drawerContent) return;
  drawerContent.style.opacity = '0';
  drawerContent.style.transition = 'opacity 0.15s';
  setTimeout(() => {
    drawerContent.innerHTML = renderInsightDrawer(type, solo);
    drawerContent.style.opacity = '1';
  }, 150);
};

window.selectSelfCheckMood = function(btn, mood, action) {
  const options = document.getElementById('selfcheck-options');
  if (options) {
    options.querySelectorAll('button').forEach(b => { b.style.pointerEvents = 'none'; b.style.opacity = '0.5'; });
    btn.style.opacity = '1';
    btn.style.borderColor = 'var(--accent-primary)';
    btn.style.color = 'var(--accent-primary)';
  }
  const result = document.getElementById('selfcheck-result');
  if (result) {
    result.style.display = '';
    const attach = window.AppState.userProfile?.attachmentStyle || 'secure';
    const ATTACH_CONTEXT = {
      secure: 'That feeling makes sense — you\'re naturally self-aware about your emotional state.',
      anxious: 'Your sensitivity makes you one of the first to notice emotional shifts. That\'s a strength.',
      avoidant: 'You\'re good at naming where you\'re at, even when you keep it private.',
      fearful: 'Noticing this is already a step forward. You\'re more self-aware than you give yourself credit for.'
    };
    result.innerHTML = `
      <div style="font-size:0.8rem; font-weight:700; color:var(--success-color); margin-bottom:8px;">Noted: ${mood}</div>
      <div class="card-body" style="margin-bottom:10px;">${ATTACH_CONTEXT[attach] || ATTACH_CONTEXT.secure}</div>
      <div style="font-size:0.75rem; color:var(--accent-primary); font-weight:700; background:rgba(129,140,248,0.08); border-radius:8px; padding:10px;">One thing to do today: ${action}</div>
    `;
  }
};

let _vibeNameRollIndex = 0;

window.rerollVibeName = function() {
  _vibeNameRollIndex++;
  const uName = window.AppState.userProfile?.name || 'User';
  const pName = window.AppState.partnerProfile?.name || 'Partner';
  const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
  const display = document.getElementById('vibe-name-display');
  const taglineEl = document.getElementById('vibe-name-tagline');
  if (!display) return;

  if (solo) {
    const newName = engine.generateSoloVibeName(uName, window.AppState.userProfile, _vibeNameRollIndex);
    display.textContent = newName;
    const soloTaglines = [
      "Your energy in one word.", "This is your signature.", "What the universe calls you.",
      "Your vibe, certified.", "100% you.", "The name the room remembers."
    ];
    if (taglineEl) taglineEl.textContent = soloTaglines[_vibeNameRollIndex % soloTaglines.length];
  } else {
    const newName = engine.generateDuoName(uName, pName, _vibeNameRollIndex);
    display.textContent = newName;
    const duoTaglines = [
      "The internet would ship this.", "A duo for the ages.", "Celebrity couple energy.",
      "Iconic. No notes.", "This name hits different.", "The collab everyone needed."
    ];
    if (taglineEl) taglineEl.textContent = duoTaglines[_vibeNameRollIndex % duoTaglines.length];
  }

  display.style.transform = 'scale(1.06)';
  setTimeout(() => { display.style.transform = ''; }, 200);
};

window.saveProfileSettings = function() {
  const name = document.getElementById('ps-name')?.value?.trim();
  const location = document.getElementById('ps-location')?.value?.trim();
  const attach = document.getElementById('ps-attach')?.value;
  const conflict = document.getElementById('ps-conflict')?.value;
  const love = document.getElementById('ps-love')?.value;
  const expr = document.getElementById('ps-expr')?.value;

  if (!name || !location) return;

  window.AppState.userProfile.name = name;
  window.AppState.userProfile.location = location;
  if (attach) window.AppState.userProfile.attachmentStyle = attach;
  if (conflict) window.AppState.userProfile.conflictStyle = conflict;
  if (love) window.AppState.userProfile.loveLanguage = love;
  if (expr) window.AppState.userProfile.expressionStyle = expr;

  const cachedPackage = localStorage.getItem('persistent_profile_data');
  if (cachedPackage) {
    const parsed = JSON.parse(cachedPackage);
    parsed.userProfile = window.AppState.userProfile;
    if (parsed.tempAnswers) {
      parsed.tempAnswers.userName = name;
      parsed.tempAnswers.location = location;
      if (attach) parsed.tempAnswers.attachment = attach;
      if (conflict) parsed.tempAnswers.conflict = conflict;
      if (love) parsed.tempAnswers.loveLanguage = love;
      if (expr) parsed.tempAnswers.expression = expr;
    }
    localStorage.setItem('persistent_profile_data', JSON.stringify(parsed));
  }

  hydrateDashboardViews({
    userProfile: window.AppState.userProfile,
    partnerProfile: window.AppState.partnerProfile,
    vibeSeed: window.AppState.vibeSeed
  });
  if (typeof window.initPet === 'function') window.initPet();
  const msg = document.getElementById('ps-saved-msg');
  if (msg) {
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
  }
};

