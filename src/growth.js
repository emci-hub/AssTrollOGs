/**
 * Growth Compass — the "where you're strong / where you're lacking" engine.
 *
 * Compact by default: one named strength + one growth edge on the dashboard
 * card, computed from profile traits AND actual behavior (mood trends, WYR
 * leans, trivia blind spots, duo agreement, streak consistency). Tapping the
 * card opens the full four-area breakdown drawer (connection, communication,
 * conflict, self-care) — depth on demand.
 */

import { GROWTH_AREAS } from './content-bank.js';
import { analyzeMoodTrend, analyzeWyrLean, getWeakestCategoryLabel } from './insights.js';

/**
 * Picks the single most relevant strength and growth edge for right now.
 * Candidates are ordered: live behavioral signals beat static trait reads,
 * so the compass shifts as the person's actual data shifts.
 */
export function computeGrowthCompass(profiles, gameData) {
  const user = profiles.user || {};
  const solo = !profiles.partner;
  const gd = gameData || {};
  const streak = gd.streak?.current || 0;
  const moodTrend = analyzeMoodTrend(gd.mood?.history);
  const wyrLean = analyzeWyrLean(gd.wyr?.preferences);
  const weakCat = getWeakestCategoryLabel(gd.trivia?.categoryAccuracy);
  const duo = gd.duo;
  const duoRate = duo && duo.guesses >= 5 ? duo.correctGuesses / duo.guesses : null;

  // ── Strength ──────────────────────────────────────────────────────────────
  let strength = null;
  if (duoRate !== null && duoRate >= 0.7) {
    strength = {
      title: 'Reading each other',
      body: `You've guessed ${profiles.partner?.name || 'your partner'}'s real answers right ${Math.round(duoRate * 100)}% of the time — that's genuine fluency, not luck.`
    };
  } else if (streak >= 5) {
    strength = {
      title: 'Consistency',
      body: `A ${streak}-day streak of showing up. Consistency is the trait every other kind of growth is built on — and you're demonstrating it.`
    };
  } else if (moodTrend?.trend === 'lifting') {
    strength = {
      title: 'Momentum',
      body: 'Your recent mood check-ins are trending brighter. Something you\'re doing is working — worth noticing what changed.'
    };
  } else if (wyrLean) {
    strength = {
      title: 'Self-clarity',
      body: `Your choices keep coming back ${wyrLean.label} — you know what you actually prefer, which is rarer than it sounds.`
    };
  } else if (!solo && user.loveLanguage && user.loveLanguage === profiles.partner?.loveLanguage) {
    strength = {
      title: 'Same love language',
      body: `You and ${profiles.partner?.name || 'your partner'} both feel loved the same way — the care you'd naturally give is the care they naturally want.`
    };
  } else {
    const STRENGTH_BY_ATTACH = {
      secure:   { title: 'Steady base', body: 'Your comfort with closeness is the quiet engine here — people can build on you.' },
      anxious:  { title: 'Emotional radar', body: 'You pick up shifts others walk straight past. Aimed with intention, that sensitivity is connection fuel.' },
      avoidant: { title: 'Self-sufficiency', body: 'You genuinely function well on your own — a foundation, as long as it doesn\'t become a wall.' },
      fearful:  { title: 'Hard-won awareness', body: 'You understand your own push-pull better than most people ever understand theirs. That awareness is the whole first half of the work.' }
    };
    strength = STRENGTH_BY_ATTACH[user.attachmentStyle] || STRENGTH_BY_ATTACH.secure;
  }

  // ── Growth edge ───────────────────────────────────────────────────────────
  let edge = null;
  if (moodTrend && (moodTrend.tenseStreak >= 3 || moodTrend.trend === 'dipping')) {
    edge = {
      title: 'Recovery',
      body: moodTrend.tenseStreak >= 3
        ? `${moodTrend.tenseStreak} tense-or-low days in a row. The data says this is a recovery week, not a push week.`
        : 'Your check-ins have been running heavier lately. Naming what\'s draining you is the first fix.',
      practice: 'Cancel or shrink one obligation this week and put rest in its slot.'
    };
  } else if (duoRate !== null && duoRate < 0.5 && duo.guesses >= 8) {
    edge = {
      title: 'Guessing, not knowing',
      body: `Your guesses about ${profiles.partner?.name || 'your partner'} land under half the time — you may be reading who you expect them to be, not who they are.`,
      practice: 'Ask them one real question this week whose answer you can\'t predict.'
    };
  } else if (weakCat) {
    edge = {
      title: `Blind spot: ${weakCat}`,
      body: solo
        ? `Your quiz answers wobble most around your ${weakCat} — the gap between how you act and how you think you act.`
        : `Quiz answers wobble most around ${weakCat} — the area where assumption is doing the most work for you two.`,
      practice: solo
        ? `Watch for one real moment this week where your ${weakCat} shows up, and note what you actually did.`
        : `Talk about one real ${weakCat} moment from this month — what each of you actually meant by it.`
    };
  } else {
    const conflictEntry = GROWTH_AREAS.conflict.entries[user.conflictStyle];
    const attachEdgeMap = {
      secure:   { title: 'Comfort check', body: 'Stability can drift into autopilot. Your edge is staying actively curious when nothing is wrong.', practice: 'Ask one question this week you\'d normally skip because things are fine.' },
      anxious:  { title: 'Sitting with quiet', body: 'Your edge is letting an unclear moment stay unclear without launching an investigation.', practice: 'Next ambiguous moment, wait a day before acting on the theory.' },
      avoidant: { title: 'Announced distance', body: 'Space works when it\'s named. Unnamed, it reads as exit.', practice: 'Next time you need room, say so plus a return time.' },
      fearful:  { title: 'Letting good be good', body: 'Your edge is receiving care without stress-testing it first.', practice: 'Accept one kind gesture this week at face value.' }
    };
    edge = conflictEntry && user.conflictStyle !== 'collaborative'
      ? { title: `Conflict: ${user.conflictStyle}`, body: conflictEntry.read, practice: conflictEntry.practice }
      : (attachEdgeMap[user.attachmentStyle] || attachEdgeMap.secure);
  }

  return { strength, edge };
}

/**
 * Renders the compact dashboard card into #growth-compass-section.
 * Called from hydrateDashboardViews on every re-render.
 */
export function renderGrowthCard(profiles, gameData) {
  const el = document.getElementById('growth-compass-section');
  if (!el) return;
  const { strength, edge } = computeGrowthCompass(profiles, gameData);

  el.innerHTML = `
    <div class="card interactive-card" onclick="openDrawer('growth')" role="button" tabindex="0">
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--success-color); margin-bottom:3px;">Strength · ${strength.title}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.45;">${strength.body}</div>
        </div>
        <div style="border-top:1px solid var(--border-color); padding-top:10px;">
          <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent-secondary); margin-bottom:3px;">Growth edge · ${edge.title}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.45;">${edge.body}</div>
        </div>
        <div style="font-size:0.65rem; color:var(--text-muted); text-align:right;">Tap for the full breakdown →</div>
      </div>
    </div>
  `;
}

/**
 * Full four-area breakdown for the drawer: per-area read keyed by the trait
 * that best predicts the pattern there, plus one concrete practice each,
 * with live data notes where the games have produced any.
 */
export function renderGrowthDrawer() {
  const profiles = { user: window.AppState.userProfile, partner: window.AppState.partnerProfile };
  const solo = window.AppState.soloMode || !profiles.partner;
  const gd = window.AppState.gameData;
  const user = profiles.user || {};
  const { strength, edge } = computeGrowthCompass(profiles, gd);

  const dataNotes = {
    connection: null,
    communication: null,
    conflict: null,
    selfcare: null
  };
  const weakCat = getWeakestCategoryLabel(gd.trivia?.categoryAccuracy);
  if (weakCat === 'closeness style') dataNotes.connection = 'Your quiz answers wobble most here.';
  if (weakCat === 'expression style') dataNotes.communication = 'Your quiz answers wobble most here.';
  if (weakCat === 'conflict style') dataNotes.conflict = 'Your quiz answers wobble most here.';
  const moodTrend = analyzeMoodTrend(gd.mood?.history);
  if (moodTrend?.tenseStreak >= 2) dataNotes.selfcare = `${moodTrend.tenseStreak} heavier days in a row in your mood log.`;
  const duo = gd.duo;
  if (!solo && duo?.guesses >= 5) {
    dataNotes.connection = `You read ${profiles.partner?.name || 'your partner'} right ${Math.round((duo.correctGuesses / duo.guesses) * 100)}% of the time so far.`;
  }

  const areaCards = Object.entries(GROWTH_AREAS).map(([areaId, area]) => {
    const traitValue = user[area.keyed];
    const entry = area.entries[traitValue] || Object.values(area.entries)[0];
    const note = dataNotes[areaId];
    return `
      <div class="card" style="margin-bottom:10px;">
        <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent-primary); margin-bottom:6px;">${area.title}</div>
        <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5; margin-bottom:8px;">${entry.read}</div>
        ${note ? `<div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:8px;">📊 ${note}</div>` : ''}
        <div style="font-size:0.72rem; color:var(--success-color); background:rgba(78,180,120,0.08); border-radius:8px; padding:8px 10px; line-height:1.4;"><strong>Try:</strong> ${entry.practice}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="subtitle">Growth Compass</div>
    <h2 style="margin-bottom:4px;">Where You Stand</h2>
    <p class="card-body" style="margin-bottom:14px; color:var(--text-muted);">${solo ? 'Your strengths and growth edges, from your profile and how you actually play.' : 'Strengths and growth edges for you two, from your profiles and real activity.'}</p>
    <div class="card" style="margin-bottom:14px; border-color:rgba(78,180,120,0.35);">
      <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:var(--success-color); margin-bottom:4px;">Right now, your strength</div>
      <div style="font-size:0.85rem; font-weight:700; margin-bottom:4px;">${strength.title}</div>
      <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.5;">${strength.body}</div>
    </div>
    <div class="card" style="margin-bottom:16px; border-color:rgba(129,140,248,0.35);">
      <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:var(--accent-secondary); margin-bottom:4px;">Right now, your edge</div>
      <div style="font-size:0.85rem; font-weight:700; margin-bottom:4px;">${edge.title}</div>
      <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.5; margin-bottom:${edge.practice ? '8px' : '0'};">${edge.body}</div>
      ${edge.practice ? `<div style="font-size:0.72rem; color:var(--accent-primary); background:rgba(129,140,248,0.08); border-radius:8px; padding:8px 10px;"><strong>Try:</strong> ${edge.practice}</div>` : ''}
    </div>
    <div class="section-title" style="margin-top:0;">The Four Areas</div>
    ${areaCards}
  `;
}
