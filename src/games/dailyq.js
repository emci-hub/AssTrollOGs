/**
 * Daily Duo (partner) / Daily Reflection (solo) — one question per day.
 *
 * Partner mode: both people answer the SAME question via pass-the-phone,
 * then a reveal shows where they matched or differed, with a one-line
 * insight. Feeds gd.duo.history (typed 'dailyq') — real dyadic data.
 *
 * Solo mode: one deeper self-question a day with tap options. Answers are
 * stored in gd.reflection.entries (last 30) and echoed later by the journey
 * drawer and Growth Compass — the app remembers what you said.
 *
 * Replaces the old Vibe Match memory game, which produced no insight.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday, todayLocal } from '../state.js';
import { awardPetGrowth } from '../pet.js';

// ── Question banks ────────────────────────────────────────────────────────────

const DUO_QUESTIONS = [
  { q: "Perfect Friday night?", opts: ["Out somewhere new", "Favorite spot, favorite order", "Couch, blanket, screen", "Friends over"] },
  { q: "Which do we need more of?", opts: ["Adventures", "Lazy mornings", "Real conversations", "Silly fun"] },
  { q: "What's the most underrated part of us?", opts: ["Our humor", "How we recover from tension", "The quiet time", "How we split the load"] },
  { q: "Money unexpectedly appears. First instinct?", opts: ["Trip", "Save it", "Fix/upgrade the home", "One great dinner"] },
  { q: "What recharges us as a couple?", opts: ["Time away together", "Time at home together", "Time apart, then reunion", "Doing something hard together"] },
  { q: "Our best conversations happen...", opts: ["Late at night", "On walks or drives", "Over food", "Randomly mid-chaos"] },
  { q: "The thing we should celebrate more:", opts: ["Small daily wins", "How far we've come", "Each other's solo wins", "Just making it through weeks"] },
  { q: "A skill we should learn together:", opts: ["Cooking something real", "A sport or activity", "A language", "Something artistic"] },
  { q: "When one of us has a bad day, the best medicine is...", opts: ["Talking it out", "Distraction and laughs", "Quiet company", "Food, obviously"] },
  { q: "Our ideal vacation is...", opts: ["Itinerary and landmarks", "Beach and nothing", "Somewhere nobody speaks our language", "Cabin, no signal"] },
  { q: "What would surprise people about us?", opts: ["How much we laugh", "How different we are", "How alike we are", "How boring we happily are"] },
  { q: "The chore split is...", opts: ["Fair, honestly", "Slightly lopsided", "Chaos but it works", "We should talk about it"] },
  { q: "In five years, the thing I most want us to have is...", opts: ["A place that feels ours", "Stories worth retelling", "A calmer rhythm", "A bigger table of people we love"] },
  { q: "What do we avoid talking about?", opts: ["Money", "Family stuff", "The future", "Nothing, really"] },
  { q: "Our love story genre is...", opts: ["Slow-burn romance", "Buddy comedy", "Adventure film", "Cozy documentary"] },
  { q: "The best gift we could give each other this month:", opts: ["A full free day", "An honest conversation", "A surprise", "Taking something off the other's plate"] },
  { q: "When we're 80, we'll be the couple that...", opts: ["Still flirts", "Still argues about directions", "Has the best stories", "Naps together aggressively"] },
  { q: "What's our current season?", opts: ["Building", "Coasting", "Weathering", "Blooming"] },
  { q: "Which compliment lands hardest?", opts: ["You make my life easier", "You make my life bigger", "I trust you completely", "You still surprise me"] },
  { q: "The ritual we should protect at all costs:", opts: ["The check-in text", "The shared meal", "The show we watch together", "The goodnight routine"] },
  { q: "New people we meet probably think...", opts: ["We're opposites", "We're a matched set", "We have an inside joke going", "One of us is the calm one"] },
  { q: "What deserves a redo?", opts: ["Our last argument", "Our last vacation", "Our last lazy Sunday", "Our first date, but with what we know now"] },
  { q: "The household's real boss is...", opts: ["Me", "Them", "The pet/plants", "The calendar"] },
  { q: "The next hard thing we should do on purpose:", opts: ["A real budget talk", "A trip with no plan", "A week of no screens at dinner", "Asking each other better questions"] },
  { q: "What did this week actually need?", opts: ["More sleep", "More us-time", "More alone-time", "More fun, less admin"] },
  { q: "If our relationship had a motto:", opts: ["Figure it out together", "Keep it light", "Slow and steady", "Why not?"] },
  { q: "The thing I'd brag about us:", opts: ["We actually listen", "We laugh a lot", "We show up", "We keep choosing this"] },
  { q: "Where are we most in sync?", opts: ["Food decisions", "Humor", "Values", "Energy levels"] },
  { q: "Where are we most out of sync?", opts: ["Sleep schedules", "Social battery", "Tidiness", "Planning styles"] },
  { q: "What should tonight look like?", opts: ["Early night", "Something spontaneous", "Proper conversation", "Total silliness"] },
  { q: "Tonight's dinner decision process will be...", opts: ["Decided in ten seconds", "A respectful negotiation", "The usual place, obviously", "Chaos, then leftovers"] },
  { q: "Who texts back faster?", opts: ["Me", "Them", "Whoever's less busy", "Neither — we're a mystery"] },
  { q: "Our most-used form of communication is...", opts: ["Memes", "Voice notes", "Actual conversations", "A look across the room"] },
  { q: "If we started a small business together, it would be...", opts: ["A café", "Something outdoorsy", "A very niche online store", "Doomed but fun"] },
  { q: "The thing we're weirdly competitive about:", opts: ["Games", "Directions", "Being right", "Who's more tired"] },
  { q: "Our fridge says the most about...", opts: ["Our ambitions", "Our realities", "One of us specifically", "A household in transition"] },
  { q: "Which fictional couple are we closest to?", opts: ["The bickering best friends", "The slow burn", "The chaotic duo", "The quietly solid ones"] },
  { q: "What would our reality show be called?", opts: ["Keeping Up With The Couch", "Two People, One Blanket", "As Seen On The Group Chat", "The Quiet Life (Extended Cut)"] },
  { q: "The next thing we should learn about each other:", opts: ["A childhood story", "A current worry", "A secret ambition", "An unpopular opinion"] },
  { q: "Who's the morning person here?", opts: ["Me, obnoxiously", "Them, obnoxiously", "Neither — mornings are the enemy", "Both, disgustingly"] }
];

const REFLECTION_QUESTIONS = [
  { q: "What did you handle better this week than you would have a year ago?", opts: ["A hard conversation", "My own spiraling", "Saying no", "Letting something go"] },
  { q: "What's quietly draining you right now?", opts: ["An obligation I resent", "A conversation I'm avoiding", "My own standards", "Too little rest"] },
  { q: "What do you want more of in your life?", opts: ["Depth", "Fun", "Calm", "Momentum"] },
  { q: "Which compliment is hardest for you to accept?", opts: ["You're talented", "You're kind", "You're enough", "You make things better"] },
  { q: "What are you pretending not to know?", opts: ["What I actually want", "That something needs to end", "That I need help", "Honestly — nothing right now"] },
  { q: "Your energy today is mostly going to...", opts: ["Things I chose", "Things I inherited", "Other people's priorities", "Recovering"] },
  { q: "What would this week's you tell last month's you?", opts: ["It worked out", "You worried about the wrong thing", "You were right to be careful", "Start sooner"] },
  { q: "The boundary you most need right now is with...", opts: ["Work", "A specific person", "My phone", "My own expectations"] },
  { q: "When did you last feel fully yourself?", opts: ["This week", "With a certain person", "Doing a certain thing", "It's been a while"] },
  { q: "What's the kindest thing you did recently that nobody saw?", opts: ["Helped quietly", "Held my tongue", "Forgave something", "Showed up when it was hard"] },
  { q: "What are you building right now?", opts: ["A skill", "A relationship", "A habit", "A way out of something"] },
  { q: "The feeling you've been avoiding lately is...", opts: ["Disappointment", "Anger", "Grief", "Hope, weirdly"] },
  { q: "What deserves more credit in your life?", opts: ["My consistency", "My taste", "My resilience", "The people around me"] },
  { q: "If rest was productive, what would you do tonight?", opts: ["Sleep early, no guilt", "Something creative and useless", "A long walk", "Absolutely nothing"] },
  { q: "What's one thing you know about yourself that took years to learn?", opts: ["What I need to recharge", "What I look like when I'm not okay", "What I'm actually good at", "What I'll never enjoy"] },
  { q: "The next uncomfortable-but-good move for you is...", opts: ["Asking for something", "Ending something", "Starting something", "Admitting something"] },
  { q: "Who gets your most patient self?", opts: ["Strangers", "The people closest to me", "Coworkers", "Honestly, my phone"] },
  { q: "What's your relationship with your own mistakes lately?", opts: ["Learning from them", "Relitigating them nightly", "Ignoring them", "Finally forgiving a big one"] },
  { q: "This season of your life is about...", opts: ["Growth", "Repair", "Proof", "Rest"] },
  { q: "What small thing consistently makes your day better?", opts: ["The first quiet coffee/tea", "A specific person's messages", "Movement", "Crossing something off"] },
  { q: "What did you say yes to recently that you should have declined?", opts: ["A social thing", "Extra work", "A favor", "Nothing — I've been good"] },
  { q: "What are you better at than you were six months ago?", opts: ["Boundaries", "Patience", "My actual craft", "Resting without guilt"] },
  { q: "Which recurring thought deserves to be retired?", opts: ["The 3am replay", "The comparison one", "The 'what if I'd...' one", "The imposter one"] },
  { q: "A completely free day tomorrow — what happens?", opts: ["Absolutely nothing, luxuriously", "The hobby I keep postponing", "Seeing someone I miss", "Getting ahead so next week hurts less"] },
  { q: "The last time you surprised yourself was...", opts: ["Handling something hard", "Saying no", "Saying yes", "Can't remember — overdue"] },
  { q: "What's currently taking more energy than it gives back?", opts: ["A person", "A habit", "A commitment", "My phone"] },
  { q: "If your mood this week were weather, it'd be...", opts: ["Mostly sunny", "Fog, lifting", "Scattered storms", "One long overcast Tuesday"] },
  { q: "What would your younger self love about your life now?", opts: ["The freedom", "The people", "The stuff I get to do", "That I turned out kind"] },
  { q: "The bravest text you could send today is...", opts: ["An apology", "An invitation", "An honest answer", "A 'thinking of you'"] },
  { q: "What do you need to hear right now?", opts: ["You're doing enough", "It's okay to rest", "Take the swing", "This part passes"] }
];

// ── Daily selection ───────────────────────────────────────────────────────────

function dayNumber() {
  return Math.floor(Date.now() / 86400000);
}

function todaysQuestion(bank) {
  const seedNum = parseInt(window.AppState.vibeSeed) || 0;
  return bank[(dayNumber() + seedNum) % bank.length];
}

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function partnerName() {
  return window.AppState.partnerProfile?.name || 'your partner';
}

function answeredToday() {
  return window.AppState.gameData?.dailyq?.lastAnswered === todayLocal();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

let _duoPhase = 'user';   // 'user' → 'handoff' → 'partner' → done
let _userAnswer = null;

function optionButtons(opts, handler) {
  return opts.map((o, i) => `<button class="choice-btn" style="text-align:left;" onclick="${handler}(${i})">${o}</button>`).join('');
}

function renderArea() {
  const area = document.getElementById('dailyq-area');
  if (!area) return;
  const gd = window.AppState.gameData;
  const uName = window.AppState.userProfile?.name || 'You';

  if (answeredToday()) {
    // Show today's result state
    const last = isSolo()
      ? gd.reflection?.entries?.[gd.reflection.entries.length - 1]
      : gd.duo?.history?.filter(h => h.type === 'dailyq').pop();
    area.innerHTML = `
      <div style="text-align:center; padding:16px 0;">
        <div style="font-size:1.8rem; margin-bottom:8px;">✅</div>
        <div style="font-size:0.85rem; font-weight:700; margin-bottom:8px;">Today's question is done.</div>
        ${last ? `<div style="font-size:0.72rem; color:var(--text-secondary); line-height:1.5; max-width:280px; margin:0 auto 8px;">"${last.question || last.q}"<br>${isSolo()
          ? `You said: <strong>${last.answer}</strong>`
          : `${uName}: <strong>${last.a}</strong> · ${partnerName()}: <strong>${last.b}</strong> ${last.match ? '— matched!' : '— different takes.'}`}</div>` : ''}
        <div style="font-size:0.65rem; color:var(--text-muted);">A new one lands tomorrow.</div>
      </div>
    `;
    return;
  }

  if (isSolo()) {
    const q = todaysQuestion(REFLECTION_QUESTIONS);
    area.innerHTML = `
      <div style="font-size:0.95rem; font-weight:700; margin-bottom:16px; line-height:1.4;">${q.q}</div>
      <div style="display:flex; flex-direction:column; gap:10px;">${optionButtons(q.opts, 'answerDailyReflection')}</div>
    `;
    return;
  }

  // Partner mode — pass the phone
  const q = todaysQuestion(DUO_QUESTIONS);
  if (_duoPhase === 'user') {
    area.innerHTML = `
      <div style="font-size:0.7rem; color:var(--accent-primary); font-weight:700; text-transform:uppercase; margin-bottom:6px;">${uName} answers first</div>
      <div style="font-size:0.95rem; font-weight:700; margin-bottom:16px; line-height:1.4;">${q.q}</div>
      <div style="display:flex; flex-direction:column; gap:10px;">${optionButtons(q.opts, 'answerDailyDuo')}</div>
    `;
  } else if (_duoPhase === 'handoff') {
    area.innerHTML = `
      <div style="text-align:center; padding:14px 0;">
        <div style="font-size:2rem; margin-bottom:8px;">🤝</div>
        <div style="font-size:0.9rem; font-weight:700; margin-bottom:6px;">Hand the phone to ${partnerName()}</div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:16px;">Same question, no peeking at ${uName}'s answer.</div>
        <button class="btn" onclick="dailyDuoPartnerReady()">I'm ${partnerName()} — show me</button>
      </div>
    `;
  } else if (_duoPhase === 'partner') {
    area.innerHTML = `
      <div style="font-size:0.7rem; color:var(--success-color); font-weight:700; text-transform:uppercase; margin-bottom:6px;">${partnerName()}'s turn</div>
      <div style="font-size:0.95rem; font-weight:700; margin-bottom:16px; line-height:1.4;">${q.q}</div>
      <div style="display:flex; flex-direction:column; gap:10px;">${optionButtons(q.opts, 'answerDailyDuo')}</div>
    `;
  }
}

function completeDay() {
  const gd = window.AppState.gameData;
  gd.dailyq.answered = (gd.dailyq.answered || 0) + 1;
  gd.dailyq.lastAnswered = todayLocal();
  gd.dailyq.lastPlayed = new Date().toISOString();
  saveGameData();
  if (canAwardPetGrowthToday('dailyq')) {
    recordPetGrowthToday('dailyq');
    awardPetGrowth(1);
  }
}

function renderDrawer() {
  const solo = isSolo();
  const answered = window.AppState.gameData?.dailyq?.answered || 0;
  return `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:4px;">${solo ? 'Daily Reflection' : 'Daily Duo'}</h2>
    <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:14px;">${answered} answered so far</div>
    <p class="card-body" style="margin-bottom:16px;">${solo
      ? 'One deeper question a day. Your answers build a record your future self gets to argue with.'
      : `One question a day, both of you answer, then compare. Matches are fun — differences are the interesting part.`}</p>
    <div id="dailyq-area"></div>
  `;
}

export const dailyqGame = {
  id: 'dailyq',
  title: 'Daily Duo',
  renderDrawer,
  init: () => {
    _duoPhase = 'user';
    _userAnswer = null;
    renderArea();
  },
  bindWindow: () => {
    window.answerDailyReflection = (optIdx) => {
      const q = todaysQuestion(REFLECTION_QUESTIONS);
      const gd = window.AppState.gameData;
      gd.reflection.entries.push({ date: todayLocal(), question: q.q, answer: q.opts[optIdx] });
      if (gd.reflection.entries.length > 30) gd.reflection.entries.shift();
      gd.reflection.lastAnswered = todayLocal();
      completeDay();
      renderArea();
    };

    window.answerDailyDuo = (optIdx) => {
      const q = todaysQuestion(DUO_QUESTIONS);
      if (_duoPhase === 'user') {
        _userAnswer = q.opts[optIdx];
        _duoPhase = 'handoff';
        renderArea();
      } else if (_duoPhase === 'partner') {
        const partnerAnswer = q.opts[optIdx];
        const gd = window.AppState.gameData;
        const match = partnerAnswer === _userAnswer;
        gd.duo.history.push({ type: 'dailyq', question: q.q, a: _userAnswer, b: partnerAnswer, match });
        if (gd.duo.history.length > 30) gd.duo.history.shift();
        gd.duo.lastPlayed = new Date().toISOString();
        completeDay();
        renderArea();
      }
    };

    window.dailyDuoPartnerReady = () => {
      _duoPhase = 'partner';
      renderArea();
    };
  }
};
