/**
 * Dashboard hydration — renders Day at a Glance, spotlight lists, metrics bar,
 * streak badge, milestone callout, and WYR personality trait pill.
 *
 * Data flows:
 *   insights.js  → Day at a Glance (freshness pool picks the variant)
 *   insights.js  → Spotlight DO/DON'T lists (behavioral nudges from WYR + trivia misses)
 *   insights.js  → Blueprint (streak + game insights)
 *   engine.js    → Live metrics bar (moves with trivia/memory/wyr/bingo/streak/milestones)
 *   state.js     → Streak counter + milestone array → badge + callout
 */

import { engine } from './engine.js';
import { insights } from './insights.js';
import { renderGrowthCard } from './growth.js';
import { updateStreak, checkMilestones, MILESTONE_LABELS } from './state.js';

let _fortuneOffset = 0;
let _focusOffset = 0;
let _blueprintOffset = 0;

export function hydrateDashboardViews(data) {
  if (!data) return;

  const profiles = {
    user: data.userProfile || window.AppState.userProfile,
    partner: data.partnerProfile || window.AppState.partnerProfile
  };
  const solo = window.AppState.soloMode || !profiles.partner;
  const gameData = window.AppState.gameData;
  const now = new Date();

  updateStreak();
  const newMilestones = checkMilestones();

  const liveMetrics = engine.calculateLiveMetrics(window.AppState.vibeSeed, gameData);

  const glance = insights.generateDayAtAGlance(profiles, gameData, now, _fortuneOffset);
  const spotlight = insights.generateSpotlightLists(profiles, gameData, now, _focusOffset);
  const blueprint = insights.generateBlueprint(profiles, gameData, _blueprintOffset);

  // ── Day at a Glance ──────────────────────────────────────────────────────
  const dailyHeadlineEl = document.getElementById('daily-headline');
  const dailyTextEl = document.getElementById('daily-text');
  if (dailyHeadlineEl) dailyHeadlineEl.innerText = glance.headline;
  if (dailyTextEl) dailyTextEl.innerText = glance.body;

  // ── Spotlight panels ─────────────────────────────────────────────────────
  const userDosEl = document.getElementById('user-dos');
  const userDontsEl = document.getElementById('user-donts');
  const partnerDosEl = document.getElementById('partner-dos');
  const partnerDontsEl = document.getElementById('partner-donts');
  const partnerPanelEl = document.getElementById('partner-spotlight-panel');
  const spotlightGridEl = document.getElementById('spotlight-grid');

  if (userDosEl) userDosEl.innerHTML = spotlight.userDos.map(d => `<li>${d}</li>`).join('');
  if (userDontsEl) userDontsEl.innerHTML = spotlight.userDonts.map(d => `<li>${d}</li>`).join('');

  if (solo) {
    if (partnerPanelEl) partnerPanelEl.style.display = 'none';
    if (spotlightGridEl) spotlightGridEl.style.gridTemplateColumns = '1fr';
  } else {
    if (partnerDosEl) partnerDosEl.innerHTML = spotlight.partnerDos.map(d => `<li>${d}</li>`).join('');
    if (partnerDontsEl) partnerDontsEl.innerHTML = spotlight.partnerDonts.map(d => `<li>${d}</li>`).join('');
    if (partnerPanelEl) partnerPanelEl.style.display = '';
    if (spotlightGridEl) spotlightGridEl.style.gridTemplateColumns = '1fr 1fr';
  }

  // ── Blueprint ────────────────────────────────────────────────────────────
  const blueprintEl = document.getElementById('synergy-card-blueprint');
  if (blueprintEl) blueprintEl.innerText = blueprint;
  const blueprintLabelEl = document.getElementById('blueprint-label');
  if (blueprintLabelEl) blueprintLabelEl.innerText = solo ? 'Your Blueprint' : 'Combined Blueprint';

  // ── Spotlight titles ─────────────────────────────────────────────────────
  const uName = profiles.user?.name || 'Your';
  const userSpotTitleEl = document.getElementById('spotlight-user-title');
  if (userSpotTitleEl) userSpotTitleEl.innerText = solo ? `${uName}'s Focus` : `${uName}`;
  if (!solo) {
    const partnerSpotTitleEl = document.getElementById('spotlight-partner-title');
    if (partnerSpotTitleEl) partnerSpotTitleEl.innerText = `${profiles.partner?.name || 'Partner'}`;
  }

  // ── Streak badge in header ────────────────────────────────────────────────
  const headerEl = document.getElementById('dynamic-header');
  if (headerEl) {
    const streak = gameData.streak?.current || 0;
    const streakBadge = streak >= 2
      ? `<span class="streak-badge">${streak} day streak</span>`
      : '';
    const seedDisplay = window.AppState.vibeSeed || '—';
    if (solo || !profiles.partner) {
      headerEl.innerHTML = `<span><strong>${uName}</strong>${streakBadge}</span><span class="vibe-id-tag">VIBE ID: <strong>${seedDisplay}</strong></span>`;
    } else {
      const pName = profiles.partner?.name || 'Partner';
      headerEl.innerHTML = `<span><strong>${uName}</strong> + <strong>${pName}</strong>${streakBadge}</span><span class="vibe-id-tag">VIBE ID: <strong>${seedDisplay}</strong></span>`;
    }
  }

  // ── WYR personality trait pill on Day at a Glance card ───────────────────
  const wyrPrefs = gameData.wyr?.preferences;
  const wyrLabel = wyrPrefs ? engine.deriveWyrPersonalityLabel(wyrPrefs) : null;
  const wyrPillEl = document.getElementById('wyr-personality-pill');
  if (wyrPillEl) {
    wyrPillEl.innerText = wyrLabel || '';
    wyrPillEl.style.display = wyrLabel ? 'inline-block' : 'none';
  }

  // ── Milestone callout ─────────────────────────────────────────────────────
  const milestoneEl = document.getElementById('milestone-callout');
  if (milestoneEl) {
    const allMilestones = gameData.milestones || [];
    if (allMilestones.length > 0) {
      const latest = allMilestones[allMilestones.length - 1];
      const label = MILESTONE_LABELS[latest] || latest;
      const isNew = newMilestones.includes(latest);
      milestoneEl.innerHTML = `
        <div class="milestone-inner ${isNew ? 'milestone-new' : ''}">
          <span class="milestone-label">${isNew ? 'NEW — ' : ''}${label}</span>
          <span class="milestone-count">${allMilestones.length} milestone${allMilestones.length !== 1 ? 's' : ''} earned</span>
        </div>`;
      milestoneEl.style.display = '';
    } else {
      milestoneEl.style.display = 'none';
    }
  }

  // ── Growth Compass ───────────────────────────────────────────────────────
  renderGrowthCard(profiles, gameData);

  // ── Solo/duo adaptive sections ───────────────────────────────────────────
  hydrateSandboxSection(solo, profiles.user?.name || 'You');
  hydrateDeepInsightCards(solo, profiles.partner?.name || 'your partner');
  hydrateGamesSection(solo);

  // ── Metrics progress ─────────────────────────────────────────────────────
  hydrateMetricsProgress(liveMetrics, gameData, solo, profiles.user);

  // ── Live metrics bar ─────────────────────────────────────────────────────
  const metricsOutputEl = document.getElementById('metrics-output');
  if (metricsOutputEl) {
    const frozen = engine.calculateModuloWeights(window.AppState.vibeSeed);
    const m = liveMetrics;

    const deltaStr = (delta) => {
      if (delta === 0) return '';
      return delta > 0
        ? `<span style="color:var(--success-color); font-size:0.65rem; margin-left:4px;">▲+${delta}</span>`
        : `<span style="color:var(--danger-color); font-size:0.65rem; margin-left:4px;">▼${delta}</span>`;
    };

    const gameInsights = insights.generateGameDerivedInsights(gameData, solo);

    metricsOutputEl.innerHTML = `
      <div class="metric-row">
        <span class="metric-name">${solo ? 'Self Score' : 'Connection'}</span>
        <div class="metric-bar-track">
          <div class="metric-bar-fill" style="width:${m.compatibilityWeight}%; background:var(--accent-primary);"></div>
        </div>
        <span class="metric-value" style="color:var(--accent-primary);">${m.compatibilityWeight}%${deltaStr(m.deltas.compat)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-name">Rhythm</span>
        <div class="metric-bar-track">
          <div class="metric-bar-fill" style="width:${m.synchronyFactor}%; background:var(--success-color);"></div>
        </div>
        <span class="metric-value" style="color:var(--success-color);">${m.synchronyFactor}%${deltaStr(m.deltas.sync)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-name">Clarity</span>
        <div class="metric-bar-track">
          <div class="metric-bar-fill" style="width:${m.alignmentVector}%; background:var(--accent-secondary);"></div>
        </div>
        <span class="metric-value" style="color:var(--accent-secondary);">${m.alignmentVector}%${deltaStr(m.deltas.align)}</span>
      </div>
      <div style="font-size:0.65rem; color:var(--text-muted); margin-top:10px; padding-top:8px; border-top:1px solid var(--border-color);">
        Scores go up as you play games and check in daily.
      </div>
      ${gameInsights.length > 0 ? `<div style="margin-top:8px; font-size:0.75rem; color:var(--text-secondary); line-height:1.5;">${gameInsights.join('<br>')}</div>` : ''}
    `;
  }

  refreshSaveCodeDisplay();
}

/**
 * Updates the Save Code card on the dashboard with the current code from AppState/localStorage.
 */
export function refreshSaveCodeDisplay() {
  const el = document.getElementById('save-code-value');
  const copyBtn = document.getElementById('save-code-copy-btn');
  if (!el) return;
  const code = window.AppState?.saveCode || localStorage.getItem('vibeSaveCode') || null;
  if (code) {
    el.textContent = code;
    if (copyBtn) copyBtn.style.display = 'inline-block';
  } else {
    el.textContent = 'Generating...';
    if (copyBtn) copyBtn.style.display = 'none';
  }
}

export function copySaveCode() {
  const code = window.AppState?.saveCode || localStorage.getItem('vibeSaveCode');
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('save-code-copy-btn');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  }).catch(() => {});
}

/**
 * Swaps the three sandbox cards between solo and duo variants.
 * Called every time the dashboard is hydrated so it always reflects current mode.
 */
function hydrateSandboxSection(solo, uName) {
  const sandboxEl = document.getElementById('sandbox-section');
  if (!sandboxEl) return;

  if (solo) {
    sandboxEl.innerHTML = `
      <div class="card interactive-card" onclick="openDrawer('duo')">
        <div class="card-title">Vibe Name Generator</div>
        <div class="card-body">Auto-generates a personal identity tag from your name — your solo signature.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('bingo')">
        <div class="card-title">Personality Sparks</div>
        <div class="card-body">Tap the statements that feel true for you today. Cards refresh each time you play.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('chronicles')">
        <div class="card-title">Solo Chronicles</div>
        <div class="card-body">A playful simulation showing how your personality handles funny, everyday scenarios on your own.</div>
      </div>
    `;
  } else {
    sandboxEl.innerHTML = `
      <div class="card interactive-card" onclick="openDrawer('duo')">
        <div class="card-title">The Duo Generator</div>
        <div class="card-body">Algorithmically blending your names into a fun, celebrity-style ship name.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('bingo')">
        <div class="card-title">Couple's Hot Takes</div>
        <div class="card-body">Tap the statements that feel true about you and your partner. See how in sync you are.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('chronicles')">
        <div class="card-title">Teamwork Chronicles</div>
        <div class="card-body">A playful simulation showing how your personality traits team up to handle funny, everyday scenarios.</div>
      </div>
    `;
  }
}

/**
 * Updates the Games section cards to use solo or duo language.
 */
function hydrateGamesSection(solo) {
  // Update the static trivia card title/body based on mode
  // The cards are static HTML so we target by section title sibling
  const gamesSectionEl = document.querySelector('.section-title + .card[onclick*="trivia"]') ||
    [...document.querySelectorAll('.card.interactive-card')].find(el => el.getAttribute('onclick')?.includes("'trivia'"));
  if (gamesSectionEl) {
    const titleEl = gamesSectionEl.querySelector('.card-title');
    const bodyEl = gamesSectionEl.querySelector('.card-body');
    if (titleEl) titleEl.textContent = solo ? 'Self-Knowledge Trivia' : 'Partner Trivia';
    if (bodyEl) bodyEl.textContent = solo ? 'Test how well you know yourself with a fun quiz about your own personality profile.' : 'Test how well you know each other with a fun quiz about your partner.';
  }

  // Daily Question card swaps between Reflection (solo) and Duo (partner)
  const dailyqCard = document.getElementById('dailyq-card');
  if (dailyqCard) {
    const titleEl = dailyqCard.querySelector('.card-title');
    const bodyEl = dailyqCard.querySelector('.card-body');
    if (titleEl) titleEl.textContent = solo ? 'Daily Reflection' : 'Daily Duo';
    if (bodyEl) bodyEl.textContent = solo
      ? 'One deeper question a day. Builds a record your future self gets to argue with.'
      : 'One question a day — you both answer, then compare. The differences are the interesting part.';
  }

  // Would You Rather card reflects Guess & Reveal in partner mode
  const wyrCard = [...document.querySelectorAll('.card.interactive-card')].find(el => el.getAttribute('onclick')?.includes("'wouldyou'"));
  if (wyrCard) {
    const titleEl = wyrCard.querySelector('.card-title');
    const bodyEl = wyrCard.querySelector('.card-body');
    if (titleEl) titleEl.textContent = solo ? 'Would You Rather' : 'Guess & Reveal';
    if (bodyEl) bodyEl.textContent = solo
      ? 'Playful dilemmas that reveal your real preferences and build your personality profile over time.'
      : 'Guess your partner\'s pick, hand the phone over, see their real answer. Your hit rate is real data.';
  }
}

/**
 * Renders the Metrics Progress section showing trajectory and archetype direction.
 */
function hydrateMetricsProgress(liveMetrics, gameData, solo, userProfile) {
  const el = document.getElementById('metrics-progress-section');
  if (!el) return;

  const compat = liveMetrics.compatibilityWeight;
  const sync = liveMetrics.synchronyFactor;
  const align = liveMetrics.alignmentVector;
  const avg = Math.round((compat + sync + align) / 3);

  // Derive trajectory label from metrics and game data
  const wyrPrefs = gameData.wyr?.preferences || {};
  const mbti = userProfile?.mbti || '';
  const attach = userProfile?.attachmentStyle || '';

  let archetypeLabel = '';
  let archetypeDesc = '';
  let archetypeColor = 'var(--accent-primary)';

  if (avg >= 95) {
    archetypeLabel = 'Peak Resonance';
    archetypeDesc = solo ? 'You are operating at peak self-alignment. Your self-awareness, consistency, and depth are all firing together.' : 'Your connection is at its peak — deep alignment across communication, emotional attunement, and shared purpose.';
    archetypeColor = 'var(--success-color)';
  } else if (avg >= 88) {
    archetypeLabel = solo ? 'Flourishing Self' : 'Deep Alignment';
    archetypeDesc = solo ? 'Strong self-awareness with growing intentionality. Keep building on your consistency.' : 'Strong foundation with growing synergy. You understand each other deeply and are building momentum.';
    archetypeColor = 'var(--success-color)';
  } else if (avg >= 82) {
    archetypeLabel = solo ? 'Growing Clarity' : 'Building Sync';
    archetypeDesc = solo ? 'Your self-knowledge is expanding. Play more games and reflect to deepen your personal insights.' : 'Your connection is developing well. More shared experiences will accelerate your alignment.';
    archetypeColor = 'var(--accent-primary)';
  } else {
    archetypeLabel = solo ? 'Early Discovery' : 'Foundation Phase';
    archetypeDesc = solo ? 'You\'re just getting started on your self-discovery journey. Keep engaging to unlock deeper insights.' : 'Every connection starts here. Play games together and check in daily to grow your metrics.';
    archetypeColor = 'var(--accent-primary)';
  }

  // Show what's changing
  const deltas = liveMetrics.deltas;
  const movingUp = Object.values(deltas).some(d => d > 0);
  const movingDown = Object.values(deltas).every(d => d <= 0);

  let momentumText = '';
  if (movingUp) {
    const topMetric = deltas.compat >= deltas.sync && deltas.compat >= deltas.align ? 'Compatibility' :
      deltas.sync >= deltas.align ? 'Synchrony' : 'Alignment';
    momentumText = `<span style="color:var(--success-color); font-size:0.7rem; font-weight:700;">Trending up — ${topMetric} leading the way.</span>`;
  } else if (movingDown) {
    momentumText = `<span style="color:var(--text-muted); font-size:0.7rem;">Metrics are at baseline. Play games to grow them.</span>`;
  } else {
    momentumText = `<span style="color:var(--text-secondary); font-size:0.7rem;">Metrics are stable.</span>`;
  }

  // Trait-based next milestone hint
  let nextHint = '';
  const wyrAnswered = gameData.wyr?.answered || 0;
  const triviaTotal = gameData.trivia?.total || 0;
  const dailyqAnswered = gameData.dailyq?.answered || 0;
  const checkins = gameData.checkin?.entries?.length || 0;

  if (wyrAnswered < 5) nextHint = solo ? 'Answer 5 Would You Rather questions to unlock your personality trait badge.' : 'Play 5 Guess & Reveal rounds to start your real compatibility read.';
  else if (dailyqAnswered < 1) nextHint = solo ? 'Answer your first Daily Reflection to start your record.' : 'Answer your first Daily Duo question together.';
  else if (triviaTotal < 5) nextHint = solo ? 'Complete 5 trivia questions to sharpen your self-knowledge score.' : 'Complete 5 trivia questions to grow your Compatibility score.';
  else if (checkins < 1) nextHint = 'Do your first Weekly Check-In — three taps, once a week.';
  else if ((gameData.streak?.current || 0) < 3) nextHint = 'Open the app 3 days in a row to earn a streak bonus and unlock the 3-Day Streak milestone.';
  else nextHint = 'Keep exploring — deeper engagement unlocks new insight layers.';

  el.innerHTML = `
    <div class="section-title">Metrics Progress</div>
    <div class="card" style="border-color:rgba(129,140,248,0.2);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px;">Current Archetype</div>
          <div style="font-size:1rem; font-weight:700; color:${archetypeColor};">${archetypeLabel}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px;">Overall Score</div>
          <div style="font-size:1rem; font-weight:700; color:${archetypeColor}; font-family:monospace;">${avg}%</div>
        </div>
      </div>
      <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.45; margin-bottom:10px;">${archetypeDesc}</p>
      <div style="padding-top:8px; border-top:1px solid var(--border-color); display:flex; flex-direction:column; gap:6px;">
        ${momentumText}
        <span style="font-size:0.7rem; color:var(--text-muted); line-height:1.4;">Next: ${nextHint}</span>
      </div>
    </div>
  `;
}
function hydrateDeepInsightCards(solo, partnerName) {
  const el = document.getElementById('deep-insights-section');
  if (!el) return;

  if (solo) {
    el.innerHTML = `
      <div class="card interactive-card" onclick="openDrawer('groove')">
        <div class="card-title" style="font-size: 0.85rem;">Your Communication Style</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">Understanding how you naturally express yourself and where to grow.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('journey')">
        <div class="card-title" style="font-size: 0.85rem;">Your Journey Ahead</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">A positive look at your personal growth, strengths, and future potential.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('decoder')">
        <div class="card-title" style="font-size: 0.85rem;">Your Love Language</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">Actionable tips for how to give and receive love in the way that lands deepest for you.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('vibe')">
        <div class="card-title" style="font-size: 0.85rem;">My Vibe Check</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">A quick read on your personality profile, current energy, and what the day calls for.</div>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="card interactive-card" onclick="openDrawer('groove')">
        <div class="card-title" style="font-size: 0.85rem;">The Communication Groove</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">Understanding your unique communication styles and how to find a smooth groove together.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('journey')">
        <div class="card-title" style="font-size: 0.85rem;">The Journey Ahead</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">A positive look at your long-term alignment, shared strengths, and future potential.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('decoder')">
        <div class="card-title" style="font-size: 0.85rem;">The Love Language Decoder</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">Fun, actionable tips on how to support one another and make each other feel incredibly seen.</div>
      </div>
      <div class="card interactive-card" onclick="openDrawer('vibe')">
        <div class="card-title" style="font-size: 0.85rem;">Our Vibe Check</div>
        <div style="font-size: 0.725rem; color: var(--text-secondary); line-height: 1.35;">A quick, playful read on how your personality profiles blend beautifully right now.</div>
      </div>
    `;
  }
}

function fadeUpdate(el, newText) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.2s';
  setTimeout(() => { el.innerText = newText; el.style.opacity = '1'; }, 200);
}

function fadeUpdateHtml(el, newHtml) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.2s';
  setTimeout(() => { el.innerHTML = newHtml; el.style.opacity = '1'; }, 200);
}

export function refreshDayAtAGlance() {
  _fortuneOffset++;
  const profiles = { user: window.AppState.userProfile, partner: window.AppState.partnerProfile };
  const glance = insights.generateDayAtAGlance(profiles, window.AppState.gameData, new Date(), _fortuneOffset);
  fadeUpdate(document.getElementById('daily-headline'), glance.headline);
  fadeUpdate(document.getElementById('daily-text'), glance.body);
}

export function refreshSpotlight() {
  _focusOffset++;
  const profiles = { user: window.AppState.userProfile, partner: window.AppState.partnerProfile };
  const solo = window.AppState.soloMode || !profiles.partner;
  const spotlight = insights.generateSpotlightLists(profiles, window.AppState.gameData, new Date(), _focusOffset);
  fadeUpdateHtml(document.getElementById('user-dos'), spotlight.userDos.map(d => `<li>${d}</li>`).join(''));
  fadeUpdateHtml(document.getElementById('user-donts'), spotlight.userDonts.map(d => `<li>${d}</li>`).join(''));
  if (!solo) {
    fadeUpdateHtml(document.getElementById('partner-dos'), spotlight.partnerDos.map(d => `<li>${d}</li>`).join(''));
    fadeUpdateHtml(document.getElementById('partner-donts'), spotlight.partnerDonts.map(d => `<li>${d}</li>`).join(''));
  }
}

export function refreshBlueprint() {
  _blueprintOffset++;
  const profiles = { user: window.AppState.userProfile, partner: window.AppState.partnerProfile };
  const blueprint = insights.generateBlueprint(profiles, window.AppState.gameData, _blueprintOffset);
  fadeUpdate(document.getElementById('synergy-card-blueprint'), blueprint);
}
