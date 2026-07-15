/**
 * Would You Rather.
 *
 * Solo mode: light dilemmas — every answer updates the preference map and
 * flows into Day at a Glance (unchanged classic flow).
 *
 * Partner mode: Guess & Reveal, pass-the-phone. The primary user guesses
 * which option their partner would pick, hands the phone over, the partner
 * answers for real, then the match is revealed. Guess accuracy is REAL
 * dyadic data (gd.duo) and feeds the Connection metric; preferences are
 * updated from the partner's actual answer — their signal, not a proxy.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';
import { engine } from '../engine.js';
import { WYR_BONUS_QUESTIONS } from '../content-bank.js';
import { humorLevel } from '../composer.js';

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
  },
  {
    a: "Have every red light turn green for you",
    b: "Always find a parking spot instantly",
    signals: { a: { spontaneous: 1 }, b: { planner: 1 } }
  },
  {
    a: "Be able to fall asleep instantly",
    b: "Need only four hours of sleep, ever",
    signals: { a: { homebody: 1 }, b: { adventurous: 1 } }
  },
  {
    a: "Never lose your keys again",
    b: "Never lose your train of thought again",
    signals: { a: { planner: 1 }, b: { deep: 1 } }
  },
  {
    a: "Always know the perfect gift",
    b: "Always know the perfect thing to say",
    signals: { a: { planner: 1 }, b: { connected: 1 } }
  },
  {
    a: "Relive your best day once a year",
    b: "Preview one future day once a year",
    signals: { a: { lighthearted: 1 }, b: { planner: 1 } }
  },
  {
    a: "Host the party everyone remembers",
    b: "Be the guest everyone hopes shows up",
    signals: { a: { connected: 1 }, b: { independent: 1 } }
  },
  {
    a: "Have a personal chef",
    b: "Have a personal driver",
    signals: { a: { homebody: 1 }, b: { adventurous: 1 } }
  },
  {
    a: "Be able to talk to animals",
    b: "Speak every human language",
    signals: { a: { lighthearted: 1 }, b: { connected: 1 } }
  },
  {
    a: "Win every board game night forever",
    b: "Never hit traffic again",
    signals: { a: { lighthearted: 1 }, b: { planner: 1 } }
  },
  {
    a: "Get one completely honest answer from anyone",
    b: "Get one perfect do-over every month",
    signals: { a: { deep: 1 }, b: { spontaneous: 1 } }
  },
  {
    a: "Live one year in a foreign city",
    b: "Take twelve perfect weekend trips",
    signals: { a: { adventurous: 1 }, b: { planner: 1 } }
  },
  {
    a: "Have your plants gossip about you approvingly",
    b: "Have your mirror hype you up every morning",
    signals: { a: { homebody: 1 }, b: { lighthearted: 1 } }
  }
];

// ── Cursed Edition ────────────────────────────────────────────────────────────
// Dark-humor dilemmas, mixed into the pool ONLY at the 'unhinged' humor
// level (an explicit opt-in in Profile Settings). Same rule as everything
// else: every question still declares real preference signals, so even the
// cursed picks feed gd.wyr.preferences honestly.
const CURSED_WYR_QUESTIONS = [
  {
    a: "Know exactly how every argument will end",
    b: "Never remember any argument at all",
    signals: { a: { planner: 1 }, b: { lighthearted: 1 } }
  },
  {
    a: "Read the group chat's unfiltered opinion of you",
    b: "Have everyone see your search history",
    signals: { a: { deep: 1 }, b: { spontaneous: 1 } }
  },
  {
    a: "Attend your own funeral (great turnout)",
    b: "Read the eulogy drafts (heavily edited)",
    signals: { a: { connected: 1 }, b: { deep: 1 } }
  },
  {
    a: "Fight one horse-sized duck",
    b: "Fight a hundred duck-sized horses",
    signals: { a: { independent: 1 }, b: { connected: 1 } }
  },
  {
    a: "Know the exact number of Mondays you have left",
    b: "Know the date of the world's last pizza",
    signals: { a: { planner: 1 }, b: { lighthearted: 1 } }
  },
  {
    a: "Have your browser history read at family dinner",
    b: "Have your DMs projected at your wedding",
    signals: { a: { homebody: 1 }, b: { connected: 1 } }
  },
  {
    a: "Hear your pet's honest review of you",
    b: "Hear your neighbors' honest review of you",
    signals: { a: { deep: 1 }, b: { connected: 1 } }
  },
  {
    a: "Be haunted by one very polite ghost",
    b: "Politely haunt someone of your choosing, later",
    signals: { a: { homebody: 1 }, b: { adventurous: 1 } }
  },
  {
    a: "Know every time someone screenshots your texts",
    b: "Never find out who has you muted",
    signals: { a: { deep: 1 }, b: { lighthearted: 1 } }
  },
  {
    a: "Age only when you complain",
    b: "Age only when you lie",
    signals: { a: { lighthearted: 1 }, b: { deep: 1 } }
  },
  {
    a: "Have your last words be a typo",
    b: "Have your last words be a pun",
    signals: { a: { spontaneous: 1 }, b: { lighthearted: 1 } }
  },
  {
    a: "Restart this year with all your memories",
    b: "Skip to next year with none of it remembered",
    signals: { a: { planner: 1 }, b: { spontaneous: 1 } }
  }
];

// Bonus pool merged in from the content bank (previously written but never
// wired). Cursed questions are appended AFTER the base pool at pick time so
// base question indexes stay stable if the humor level changes mid-session.
const ALL_QUESTIONS = [...WYR_QUESTIONS, ...WYR_BONUS_QUESTIONS];

function activePool() {
  return humorLevel() === 'unhinged'
    ? [...ALL_QUESTIONS, ...CURSED_WYR_QUESTIONS]
    : ALL_QUESTIONS;
}

let currentQuestion = null;
let shownIndices = [];
// Partner-mode Guess & Reveal state
let _phase = 'guess';   // 'guess' → 'handoff' → 'answer' → 'reveal'
let _guess = null;

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function partnerName() {
  return window.AppState.partnerProfile?.name || 'your partner';
}

function init() {
  shownIndices = [];
  load();
}

function pickQuestion() {
  const pool = activePool();
  if (shownIndices.length >= pool.length) shownIndices = [];
  let qIndex;
  do { qIndex = Math.floor(Math.random() * pool.length); }
  while (shownIndices.includes(qIndex) && shownIndices.length < pool.length);
  shownIndices.push(qIndex);
  currentQuestion = { ...pool[qIndex], index: qIndex };
}

function refreshHeaderStats() {
  const countEl = document.getElementById('wyr-answered-count');
  const traitEl = document.getElementById('wyr-trait-label');
  const gd = window.AppState.gameData;
  if (countEl) countEl.innerText = `${gd?.wyr?.answered || 0} answered`;
  const label = engine.deriveWyrPersonalityLabel(gd?.wyr?.preferences);
  if (traitEl) {
    traitEl.innerText = label || '';
    traitEl.style.display = label ? '' : 'none';
  }
  const agreeEl = document.getElementById('wyr-agree-label');
  const duo = gd?.duo;
  if (agreeEl && duo?.guesses >= 5) {
    agreeEl.innerText = `${Math.round((duo.correctGuesses / duo.guesses) * 100)}% guessed right`;
    agreeEl.style.display = '';
  }
}

function load() {
  pickQuestion();
  _phase = 'guess';
  _guess = null;

  const qEl = document.getElementById('wyr-question');
  const choicesEl = document.getElementById('wyr-choices');
  if (!qEl || !choicesEl) return;

  const nextBtn = document.getElementById('wyr-next-btn');
  if (nextBtn) nextBtn.style.display = 'none';

  if (isSolo()) {
    qEl.innerText = 'Would you rather...';
    choicesEl.innerHTML = `
      <button class="choice-btn" style="text-align:left;" onclick="selectWYR('a')">${currentQuestion.a}</button>
      <button class="choice-btn" style="text-align:left;" onclick="selectWYR('b')">${currentQuestion.b}</button>
    `;
  } else {
    qEl.innerHTML = `<span style="color:var(--accent-primary);">Your guess:</span> which would ${partnerName()} pick?`;
    choicesEl.innerHTML = `
      <button class="choice-btn" style="text-align:left;" onclick="selectWYR('a')">${currentQuestion.a}</button>
      <button class="choice-btn" style="text-align:left;" onclick="selectWYR('b')">${currentQuestion.b}</button>
    `;
  }
  refreshHeaderStats();
}

// ── Solo flow (classic) ───────────────────────────────────────────────────────

function answerSolo(choice) {
  const choicesEl = document.getElementById('wyr-choices');
  if (!choicesEl) return;
  const buttons = choicesEl.querySelectorAll('button');
  buttons.forEach(btn => { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.6'; });
  const picked = choice === 'a' ? buttons[0] : buttons[1];
  if (picked) { picked.style.opacity = '1'; picked.style.borderColor = 'var(--accent-primary)'; }

  recordAnswer(choice);
  showNextButton();
}

// ── Partner flow (Guess & Reveal) ─────────────────────────────────────────────

function handoffScreen() {
  const qEl = document.getElementById('wyr-question');
  const choicesEl = document.getElementById('wyr-choices');
  if (!qEl || !choicesEl) return;
  qEl.innerText = '';
  choicesEl.innerHTML = `
    <div style="text-align:center; padding:14px 0;">
      <div style="font-size:2rem; margin-bottom:8px;">🤝</div>
      <div style="font-size:0.9rem; font-weight:700; margin-bottom:6px;">Hand the phone to ${partnerName()}</div>
      <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:16px;">No peeking at the guess — answer honestly.</div>
      <button class="btn" onclick="wyrPartnerReady()">I'm ${partnerName()} — show me</button>
    </div>
  `;
}

function partnerAnswerScreen() {
  _phase = 'answer';
  const qEl = document.getElementById('wyr-question');
  const choicesEl = document.getElementById('wyr-choices');
  if (!qEl || !choicesEl) return;
  qEl.innerHTML = `${partnerName()}, would you rather...`;
  choicesEl.innerHTML = `
    <button class="choice-btn" style="text-align:left;" onclick="selectWYR('a')">${currentQuestion.a}</button>
    <button class="choice-btn" style="text-align:left;" onclick="selectWYR('b')">${currentQuestion.b}</button>
  `;
}

function revealScreen(guess, answer) {
  _phase = 'reveal';
  const match = guess === answer;
  const qEl = document.getElementById('wyr-question');
  const choicesEl = document.getElementById('wyr-choices');
  if (!qEl || !choicesEl) return;

  const answerText = answer === 'a' ? currentQuestion.a : currentQuestion.b;
  const guessText = guess === 'a' ? currentQuestion.a : currentQuestion.b;
  const gd = window.AppState.gameData;
  const rate = gd.duo.guesses > 0 ? Math.round((gd.duo.correctGuesses / gd.duo.guesses) * 100) : 0;

  qEl.innerText = '';
  choicesEl.innerHTML = `
    <div style="text-align:center; padding:10px 0;">
      <div style="font-size:2rem; margin-bottom:8px;">${match ? '🎯' : '🔍'}</div>
      <div style="font-size:0.95rem; font-weight:700; color:${match ? 'var(--success-color)' : 'var(--accent-secondary)'}; margin-bottom:10px;">
        ${match ? 'Called it!' : 'Missed it — and learned something.'}
      </div>
      <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.6; margin-bottom:8px;">
        ${partnerName()} picked: <strong>${answerText}</strong><br>
        The guess was: <strong>${guessText}</strong>
      </div>
      <div style="font-size:0.68rem; color:var(--text-muted);">
        ${match
          ? `That's real fluency — you're reading ${partnerName()} right ${rate}% of the time.`
          : `The misses are the good part: that's a real difference you just discovered. (${rate}% guessed right so far.)`}
      </div>
    </div>
  `;
  showNextButton();
}

function showNextButton() {
  setTimeout(() => {
    const nextBtn = document.getElementById('wyr-next-btn');
    if (nextBtn) nextBtn.style.display = '';
  }, 500);
}

// ── Shared data recording ─────────────────────────────────────────────────────

// Records the REAL answer (the user's in solo, the partner's in duo mode)
// into preferences + history, handles pet growth via the daily cap.
function recordAnswer(choice, guess = null) {
  const gd = window.AppState.gameData;
  gd.wyr.answered += 1;
  gd.wyr.lastPlayed = new Date().toISOString();

  const signals = currentQuestion.signals[choice] || {};
  gd.wyr.history.push({ questionIndex: currentQuestion.index, choice, textChosen: choice === 'a' ? currentQuestion.a : currentQuestion.b });
  if (gd.wyr.history.length > 20) gd.wyr.history.shift();

  Object.entries(signals).forEach(([trait, delta]) => {
    if (gd.wyr.preferences[trait] !== undefined) gd.wyr.preferences[trait] += delta;
  });

  if (guess !== null) {
    gd.duo.rounds += 1;
    gd.duo.guesses += 1;
    if (guess === choice) gd.duo.correctGuesses += 1;
    gd.duo.lastPlayed = new Date().toISOString();
    gd.duo.history.push({ type: 'wyr', q: `${currentQuestion.a} / ${currentQuestion.b}`, guess, answer: choice, match: guess === choice });
    if (gd.duo.history.length > 30) gd.duo.history.shift();
  }

  saveGameData();

  // Award pet growth every 5th answer (once per day via cap)
  if (gd.wyr.answered % 5 === 0 && canAwardPetGrowthToday('wyr')) {
    recordPetGrowthToday('wyr');
    awardPetGrowth(1);
  }

  refreshHeaderStats();
}

function select(choice) {
  if (!currentQuestion) return;

  if (isSolo()) {
    answerSolo(choice);
    return;
  }

  if (_phase === 'guess') {
    _guess = choice;
    _phase = 'handoff';
    handoffScreen();
  } else if (_phase === 'answer') {
    recordAnswer(choice, _guess);
    revealScreen(_guess, choice);
  }
}

export const wyrGame = {
  id: 'wouldyou',
  title: 'Would You Rather',
  renderDrawer: () => {
    const answered = window.AppState?.gameData?.wyr?.answered || 0;
    const prefs = window.AppState?.gameData?.wyr?.preferences;
    const duo = window.AppState?.gameData?.duo;
    const traitLabel = engine.deriveWyrPersonalityLabel(prefs) || '';
    const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
    const pName = window.AppState.partnerProfile?.name || 'your partner';
    const agree = duo?.guesses >= 5 ? `${Math.round((duo.correctGuesses / duo.guesses) * 100)}% guessed right` : '';
    return `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:4px;">${solo ? 'Would You Rather' : 'Guess & Reveal'}</h2>
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap;">
      <span id="wyr-answered-count" style="font-size:0.7rem; color:var(--text-muted);">${answered} answered</span>
      <span id="wyr-trait-label" style="font-size:0.7rem; color:var(--accent-primary); background:rgba(129,140,248,0.12); padding:2px 8px; border-radius:20px; display:${traitLabel ? '' : 'none'};">${traitLabel}</span>
      <span id="wyr-agree-label" style="font-size:0.7rem; color:var(--success-color); background:rgba(78,180,120,0.12); padding:2px 8px; border-radius:20px; display:${agree ? '' : 'none'};">${agree}</span>
    </div>
    <p class="card-body" style="margin-bottom:16px;">${solo
      ? 'Fun, light dilemmas. Every answer helps build your personality picture.'
      : `Guess what ${pName} would pick, then hand the phone over for their real answer. The hits show your fluency — the misses show you something new.`}</p>
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
    window.wyrPartnerReady = partnerAnswerScreen;
  }
};
