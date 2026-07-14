/**
 * Would You Rather game.
 * Light, fun, low-stakes questions that still reveal personality preferences.
 * Every answer updates the preference map and flows into Day at a Glance.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';
import { engine } from '../engine.js';

const WYR_QUESTIONS = [
  {
    a: "Start every morning with a big breakfast",
    b: "Start every morning with a long sleep-in",
    signals: { a: { planner: 1 }, b: { spontaneous: 1 } }
  },
  {
    a: "Have a pet that could talk",
    b: "Have a pet that could understand everything you say",
    signals: { a: { lighthearted: 1 }, b: { deep: 1 } }
  },
  {
    a: "Always know what's for dinner tonight",
    b: "Always be surprised at dinner",
    signals: { a: { planner: 1 }, b: { spontaneous: 1 } }
  },
  {
    a: "Never have to do dishes again",
    b: "Never have to do laundry again",
    signals: { a: { connected: 1 }, b: { independent: 1 } }
  },
  {
    a: "Go on a spontaneous road trip this weekend",
    b: "Have a perfect cozy night in this weekend",
    signals: { a: { adventurous: 1 }, b: { homebody: 1 } }
  },
  {
    a: "Always have the best playlist ready",
    b: "Always have the best snacks ready",
    signals: { a: { adventurous: 1 }, b: { homebody: 1 } }
  },
  {
    a: "Have a group chat that's always fun",
    b: "Have one person you can call about anything",
    signals: { a: { connected: 1 }, b: { deep: 1 } }
  },
  {
    a: "Live in the city and never drive",
    b: "Live in nature with a fast car",
    signals: { a: { connected: 1 }, b: { independent: 1 } }
  },
  {
    a: "Always be 10 minutes early",
    b: "Always be exactly on time",
    signals: { a: { planner: 1 }, b: { spontaneous: 1 } }
  },
  {
    a: "Have a job you love but barely pays",
    b: "Have a well-paying job you don't hate",
    signals: { a: { deep: 1 }, b: { lighthearted: 1 } }
  },
  {
    a: "Win a free trip anywhere in the world",
    b: "Win a fully-stocked home makeover",
    signals: { a: { adventurous: 1 }, b: { homebody: 1 } }
  },
  {
    a: "Have a surprise birthday party thrown for you",
    b: "Plan your own perfect birthday dinner",
    signals: { a: { connected: 1 }, b: { planner: 1 } }
  },
  {
    a: "Be able to pause time whenever you want",
    b: "Be able to rewind time once a week",
    signals: { a: { independent: 1 }, b: { planner: 1 } }
  },
  {
    a: "Only eat food you love for a month",
    b: "Try a new food every single day for a month",
    signals: { a: { homebody: 1 }, b: { adventurous: 1 } }
  },
  {
    a: "Have a text conversation that goes on forever",
    b: "Have a 2-hour phone call that fixes everything",
    signals: { a: { connected: 1 }, b: { deep: 1 } }
  },
  {
    a: "Always have a good comeback in arguments",
    b: "Always be the one who ends arguments with a hug",
    signals: { a: { independent: 1 }, b: { connected: 1 } }
  },
  {
    a: "Know every word to your favorite song",
    b: "Write a song that becomes someone's favorite",
    signals: { a: { lighthearted: 1 }, b: { deep: 1 } }
  },
  {
    a: "Have a 5-year plan that always works out",
    b: "See where life takes you and love the ride",
    signals: { a: { planner: 1 }, b: { spontaneous: 1 } }
  },
  {
    a: "Be the person who always brings people together",
    b: "Be the person who always knows what someone needs",
    signals: { a: { connected: 1 }, b: { deep: 1 } }
  },
  {
    a: "Have a dog who's obsessed with you",
    b: "Have a cat who occasionally chooses you",
    signals: { a: { connected: 1 }, b: { independent: 1 } }
  }
];

let currentQuestion = null;
let shownIndices = [];

function init() {
  shownIndices = [];
  load();
}

function load() {
  // Avoid repeating recent questions
  if (shownIndices.length >= WYR_QUESTIONS.length) shownIndices = [];
  let qIndex;
  do { qIndex = Math.floor(Math.random() * WYR_QUESTIONS.length); }
  while (shownIndices.includes(qIndex) && shownIndices.length < WYR_QUESTIONS.length);
  shownIndices.push(qIndex);
  currentQuestion = { ...WYR_QUESTIONS[qIndex], index: qIndex };

  const qEl = document.getElementById('wyr-question');
  const choicesEl = document.getElementById('wyr-choices');
  const countEl = document.getElementById('wyr-answered-count');
  const traitEl = document.getElementById('wyr-trait-label');

  if (!qEl || !choicesEl) return;

  const prefs = window.AppState.gameData?.wyr?.preferences;
  const traitLabel = engine.deriveWyrPersonalityLabel(prefs);

  qEl.innerText = 'Would you rather...';
  choicesEl.innerHTML = `
    <button class="choice-btn" style="text-align:left;" onclick="selectWYR('a')">${currentQuestion.a}</button>
    <button class="choice-btn" style="text-align:left;" onclick="selectWYR('b')">${currentQuestion.b}</button>
  `;

  if (countEl) countEl.innerText = `${window.AppState.gameData?.wyr?.answered || 0} answered`;
  if (traitEl) {
    traitEl.innerText = traitLabel || '';
    traitEl.style.display = traitLabel ? '' : 'none';
  }
}

function select(choice) {
  if (!currentQuestion) return;
  const choicesEl = document.getElementById('wyr-choices');
  if (!choicesEl) return;

  const buttons = choicesEl.querySelectorAll('button');
  buttons.forEach(btn => { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.6'; });
  if (choice === 'a') buttons[0].style.opacity = '1';
  else buttons[1].style.opacity = '1';
  if (choice === 'a') buttons[0].style.borderColor = 'var(--accent-primary)';
  else buttons[1].style.borderColor = 'var(--accent-primary)';

  const gd = window.AppState.gameData;
  gd.wyr.answered += 1;
  gd.wyr.lastPlayed = new Date().toISOString();

  const signals = currentQuestion.signals[choice] || {};
  gd.wyr.history.push({ questionIndex: currentQuestion.index, choice, textChosen: choice === 'a' ? currentQuestion.a : currentQuestion.b });
  if (gd.wyr.history.length > 20) gd.wyr.history.shift();

  Object.entries(signals).forEach(([trait, delta]) => {
    if (gd.wyr.preferences[trait] !== undefined) gd.wyr.preferences[trait] += delta;
  });

  saveGameData();

  // Award pet growth every 5th answer (once per day via cap)
  if (gd.wyr.answered % 5 === 0 && canAwardPetGrowthToday('wyr')) {
    recordPetGrowthToday('wyr');
    awardPetGrowth(1);
  }

  const countEl = document.getElementById('wyr-answered-count');
  const traitEl = document.getElementById('wyr-trait-label');
  if (countEl) countEl.innerText = `${gd.wyr.answered} answered`;
  const newLabel = engine.deriveWyrPersonalityLabel(gd.wyr.preferences);
  if (traitEl) { traitEl.innerText = newLabel || ''; traitEl.style.display = newLabel ? '' : 'none'; }

  // Show next button after a short delay
  setTimeout(() => {
    const nextBtn = document.getElementById('wyr-next-btn');
    if (nextBtn) nextBtn.style.display = '';
  }, 700);
}

export const wyrGame = {
  id: 'wouldyou',
  title: 'Would You Rather',
  renderDrawer: () => {
    const answered = window.AppState?.gameData?.wyr?.answered || 0;
    const prefs = window.AppState?.gameData?.wyr?.preferences;
    const traitLabel = engine.deriveWyrPersonalityLabel(prefs) || '';
    return `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:4px;">Would You Rather</h2>
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap;">
      <span id="wyr-answered-count" style="font-size:0.7rem; color:var(--text-muted);">${answered} answered</span>
      <span id="wyr-trait-label" style="font-size:0.7rem; color:var(--accent-primary); background:rgba(129,140,248,0.12); padding:2px 8px; border-radius:20px; display:${traitLabel ? '' : 'none'};">${traitLabel}</span>
    </div>
    <p class="card-body" style="margin-bottom:16px;">Fun, light dilemmas. Every answer helps build your personality picture.</p>
    <div id="wyr-game-area">
      <div id="wyr-question" style="text-align:center; font-size:0.95rem; font-weight:700; margin-bottom:20px; color:var(--text-primary);"></div>
      <div style="display:flex; flex-direction:column; gap:10px;" id="wyr-choices"></div>
      <button id="wyr-next-btn" class="btn btn-outline" style="margin-top:16px; display:none;" onclick="loadWouldYouRather()">Next Question</button>
    </div>
  `;
  },
  init,
  bindWindow: () => {
    window.loadWouldYouRather = load;
    window.selectWYR = select;
  }
};
