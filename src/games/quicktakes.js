/**
 * Quick Takes — 3 rapid personality questions per session.
 * Each round picks 3 questions from a pool of 25+.
 * Answers update behavioral preferences and award pet growth.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';

const QUESTIONS = [
  { q: "Morning energy or night energy?",        a: "Morning person",    b: "Night owl",        sig: { a: { planner: 1 }, b: { spontaneous: 1 } } },
  { q: "Make the plan or go with the flow?",      a: "Make a plan",      b: "See what happens",  sig: { a: { planner: 1 }, b: { spontaneous: 1 } } },
  { q: "Big group energy or small circle vibes?", a: "Big group",         b: "Small circle",     sig: { a: { adventurous: 1 }, b: { homebody: 1 } } },
  { q: "Talk it out or think it over first?",     a: "Talk it out now",  b: "Think it over",    sig: { a: { connected: 1 }, b: { independent: 1 } } },
  { q: "Surprise plans or a locked-in schedule?", a: "Surprise me",      b: "Locked in",        sig: { a: { spontaneous: 1 }, b: { planner: 1 } } },
  { q: "Deep one-hour convo or fun quick chat?",  a: "Deep convo",       b: "Quick catch-up",   sig: { a: { deep: 1 }, b: { lighthearted: 1 } } },
  { q: "Stay home weekend or adventure weekend?", a: "Stay home",        b: "Go exploring",     sig: { a: { homebody: 1 }, b: { adventurous: 1 } } },
  { q: "Express feelings right away or later?",   a: "Right away",       b: "When I'm ready",   sig: { a: { connected: 1 }, b: { independent: 1 } } },
  { q: "Laugh it off or take it seriously?",      a: "Laugh it off",     b: "Take it seriously",sig: { a: { lighthearted: 1 }, b: { deep: 1 } } },
  { q: "Texting or a quick phone call?",          a: "Texting",          b: "Just call",        sig: { a: { independent: 1 }, b: { connected: 1 } } },
  { q: "Plan the trip or book last minute?",      a: "Plan everything",  b: "Last minute",      sig: { a: { planner: 1 }, b: { spontaneous: 1 } } },
  { q: "Know the ending or be surprised?",        a: "Know the ending",  b: "Total surprise",   sig: { a: { planner: 1 }, b: { spontaneous: 1 } } },
  { q: "City energy or nature calm?",             a: "City energy",      b: "Nature calm",      sig: { a: { adventurous: 1 }, b: { homebody: 1 } } },
  { q: "Solve it alone or solve it together?",    a: "Solve alone",      b: "Together",         sig: { a: { independent: 1 }, b: { connected: 1 } } },
  { q: "Fast decision or slow deliberate choice?",a: "Fast decision",    b: "Slow and sure",    sig: { a: { spontaneous: 1 }, b: { planner: 1 } } },
  { q: "Keep it light or go deep?",               a: "Keep it light",    b: "Go deep",          sig: { a: { lighthearted: 1 }, b: { deep: 1 } } },
  { q: "Comfort food or try something new?",      a: "Comfort food",     b: "Try something new",sig: { a: { homebody: 1 }, b: { adventurous: 1 } } },
  { q: "Busy social calendar or free evenings?",  a: "Packed calendar",  b: "Free evenings",    sig: { a: { adventurous: 1 }, b: { homebody: 1 } } },
  { q: "Share everything or keep some mystery?",  a: "Share everything", b: "Keep some mystery",sig: { a: { connected: 1 }, b: { independent: 1 } } },
  { q: "Feelings first or facts first?",          a: "Feelings first",   b: "Facts first",      sig: { a: { deep: 1 }, b: { lighthearted: 1 } } },
  { q: "Road trip or flight?",                    a: "Road trip",        b: "Direct flight",    sig: { a: { adventurous: 1 }, b: { planner: 1 } } },
  { q: "Night in with a show or night out?",      a: "Night in",         b: "Night out",        sig: { a: { homebody: 1 }, b: { adventurous: 1 } } },
  { q: "Check in daily or catch up weekly?",      a: "Check in daily",   b: "Catch up weekly",  sig: { a: { connected: 1 }, b: { independent: 1 } } },
  { q: "Get it done early or under pressure?",    a: "Early bird",       b: "Under pressure",   sig: { a: { planner: 1 }, b: { spontaneous: 1 } } },
  { q: "Hype song or chill playlist?",            a: "Hype song",        b: "Chill playlist",   sig: { a: { adventurous: 1 }, b: { homebody: 1 } } }
];

const VIBE_LABELS = {
  planner:      { label: 'Planner',      color: '#5eabd4' },
  spontaneous:  { label: 'Spontaneous',  color: '#f0a055' },
  adventurous:  { label: 'Adventurous',  color: '#e85555' },
  homebody:     { label: 'Homebody',     color: '#6abe8a' },
  deep:         { label: 'Deep Thinker', color: '#c084e8' },
  lighthearted: { label: 'Lighthearted', color: '#f5c842' },
  connected:    { label: 'Connected',    color: '#5eabd4' },
  independent:  { label: 'Independent',  color: '#6abe8a' }
};

let _sessionQuestions = [];
let _sessionAnswers = [];
let _sessionIndex = 0;
const ROUND_SIZE = 3;

function pickSessionQuestions(gameData) {
  // Rotate through the pool so questions vary each session
  const sessions = gameData?.quicktakes?.sessionCount || 0;
  const offset = (sessions * ROUND_SIZE) % QUESTIONS.length;
  const result = [];
  for (let i = 0; i < ROUND_SIZE; i++) {
    result.push(QUESTIONS[(offset + i) % QUESTIONS.length]);
  }
  return result;
}

function renderQuestion(qIndex) {
  const q = _sessionQuestions[qIndex];
  if (!q) return '';
  return `
    <div id="qt-question-area">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Question ${qIndex + 1} of ${ROUND_SIZE}</div>
        <div style="display:flex; gap:4px;">
          ${Array.from({ length: ROUND_SIZE }, (_, i) =>
            `<div style="width:20px; height:4px; border-radius:2px; background:${i <= qIndex ? 'var(--accent-primary)' : 'var(--border-color)'}"></div>`
          ).join('')}
        </div>
      </div>
      <div style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:20px; line-height:1.4;">${q.q}</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="qt-choice-btn" onclick="answerQuickTake('a')" style="text-align:left; padding:14px 16px;">
          <span style="font-size:0.85rem; font-weight:600;">${q.a}</span>
        </button>
        <button class="qt-choice-btn" onclick="answerQuickTake('b')" style="text-align:left; padding:14px 16px;">
          <span style="font-size:0.85rem; font-weight:600;">${q.b}</span>
        </button>
      </div>
    </div>
  `;
}

function renderResults() {
  // Tally signals from answers
  const scores = {};
  _sessionAnswers.forEach((answer, i) => {
    const sig = _sessionQuestions[i]?.sig?.[answer] || {};
    Object.entries(sig).forEach(([k, v]) => { scores[k] = (scores[k] || 0) + v; });
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const vibeChips = sorted.map(([key]) => {
    const vl = VIBE_LABELS[key];
    return vl ? `<span style="font-size:0.8rem; font-weight:700; color:${vl.color}; background:${vl.color}18; border:1px solid ${vl.color}40; border-radius:20px; padding:4px 14px;">${vl.label}</span>` : '';
  }).join('');

  return `
    <div style="text-align:center; padding:16px 0;">
      <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">Your vibe today</div>
      <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:8px; margin-bottom:18px;">${vibeChips || '<span style="color:var(--text-muted)">Balanced</span>'}</div>
      <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5; margin-bottom:20px;">Your answers are shaping your profile over time. Each session adds to your unique personality map.</div>
      <button class="btn btn-outline" style="font-size:0.75rem;" onclick="startQuickTakes()">Play Again</button>
    </div>
  `;
}

function renderDrawer() {
  return `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:4px;">Quick Takes</h2>
    <p class="card-body" style="margin-bottom:16px; color:var(--text-muted);">3 fast questions. Tap your gut reaction. No overthinking.</p>
    <div id="quicktakes-area">
      <div style="text-align:center; padding:20px 0;">
        <button class="btn" onclick="startQuickTakes()">Start Round</button>
      </div>
    </div>
  `;
}

export const quickTakesGame = {
  id: 'quicktakes',
  title: 'Quick Takes',
  renderDrawer,
  init: () => {},
  bindWindow: () => {
    window.startQuickTakes = () => {
      const gd = window.AppState.gameData;
      _sessionQuestions = pickSessionQuestions(gd);
      _sessionAnswers = [];
      _sessionIndex = 0;
      const area = document.getElementById('quicktakes-area');
      if (area) area.innerHTML = renderQuestion(0);
    };

    window.answerQuickTake = (choice) => {
      _sessionAnswers.push(choice);

      // Update gameData wyr-style preferences
      const gd = window.AppState.gameData;
      const sig = _sessionQuestions[_sessionIndex]?.sig?.[choice] || {};
      if (!gd.wyr) gd.wyr = { answered: 0, preferences: {}, history: [], lastPlayed: null };
      Object.entries(sig).forEach(([k, v]) => {
        gd.wyr.preferences[k] = (gd.wyr.preferences[k] || 0) + v;
      });
      gd.wyr.answered = (gd.wyr.answered || 0) + 1;
      gd.wyr.lastPlayed = new Date().toISOString();

      _sessionIndex++;

      const area = document.getElementById('quicktakes-area');
      if (!area) return;

      if (_sessionIndex < ROUND_SIZE) {
        area.style.opacity = '0';
        area.style.transition = 'opacity 0.12s';
        setTimeout(() => {
          area.innerHTML = renderQuestion(_sessionIndex);
          area.style.opacity = '1';
        }, 120);
      } else {
        // Session complete
        if (!gd.quicktakes) gd.quicktakes = { sessionCount: 0, lastPlayed: null };
        gd.quicktakes.sessionCount = (gd.quicktakes.sessionCount || 0) + 1;
        gd.quicktakes.lastPlayed = new Date().toISOString();
        saveGameData();
        if (canAwardPetGrowthToday('quicktakes')) {
          recordPetGrowthToday('quicktakes');
          awardPetGrowth(1);
        }

        area.style.opacity = '0';
        area.style.transition = 'opacity 0.15s';
        setTimeout(() => {
          area.innerHTML = renderResults();
          area.style.opacity = '1';
        }, 150);
      }
    };
  }
};
