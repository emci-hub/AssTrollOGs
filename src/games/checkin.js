/**
 * Weekly Check-In — the one deliberately relationship-BUILDING ritual.
 *
 * Available once per 7 days. Three taps + an optional note:
 *   Partner: one appreciation → one small friction → one tiny experiment.
 *   Solo:    one win → one struggle → one intention for the week.
 *
 * Entries (last 12) are stored in gd.checkin.entries; last week's experiment
 * or intention is echoed at the start of the next check-in ("how did it
 * go?"), and the Growth Compass + journey drawer read from the history.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday, todayLocal, daysBetween } from '../state.js';
import { awardPetGrowth } from '../pet.js';

// ── Step content ──────────────────────────────────────────────────────────────

const PARTNER_STEPS = [
  {
    id: 'appreciation',
    title: 'One appreciation',
    prompt: 'This week, the thing I appreciated most about us was...',
    opts: [
      'How we handled something stressful',
      'A moment that made us laugh',
      'Something they did without being asked',
      'Just the steady, everyday stuff'
    ]
  },
  {
    id: 'friction',
    title: 'One small friction',
    prompt: 'The small thing worth naming (small — this is maintenance, not a trial):',
    optsByConflict: {
      collaborative: ['We over-discussed something minor', 'We ran out of talk-time for the big stuff', 'One of us carried more this week', 'Nothing real — smooth week'],
      compromising:  ['We settled something too fast', 'A trade from before feels uneven now', 'One of us carried more this week', 'Nothing real — smooth week'],
      accommodating: ['One of us said "fine" and didn\'t mean it', 'A preference got swallowed again', 'One of us carried more this week', 'Nothing real — smooth week'],
      avoiding:      ['A pause never got un-paused', 'Something\'s still hanging unresolved', 'One of us carried more this week', 'Nothing real — smooth week']
    }
  },
  {
    id: 'experiment',
    title: 'One tiny experiment',
    prompt: 'This week, we\'ll try...',
    opts: [
      'One real conversation, phones elsewhere',
      'One thing planned by whoever plans less',
      'Saying appreciations out loud, same day',
      'A 10-minute reset walk after tense moments'
    ]
  }
];

const SOLO_STEPS = [
  {
    id: 'win',
    title: 'One win',
    prompt: 'This week\'s quiet win was...',
    opts: [
      'I kept a boundary',
      'I did the hard thing first',
      'I asked for what I needed',
      'I showed up every day, even unglamorously'
    ]
  },
  {
    id: 'struggle',
    title: 'One struggle',
    prompt: 'The thing that actually cost me energy:',
    opts: [
      'Overthinking a conversation',
      'Saying yes when I meant no',
      'Comparing my inside to someone\'s outside',
      'Running on too little rest'
    ]
  },
  {
    id: 'intention',
    title: 'One intention',
    prompt: 'Next week, I want to...',
    opts: [
      'Protect one block of real rest',
      'Have the conversation I\'ve been drafting',
      'Do one thing purely because I enjoy it',
      'Let one thing be good enough'
    ]
  }
];

const CHECKIN_INTERVAL_DAYS = 7;

// ── State ─────────────────────────────────────────────────────────────────────

let _stepIndex = 0;
let _answers = [];

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function steps() {
  return isSolo() ? SOLO_STEPS : PARTNER_STEPS;
}

function stepOptions(step) {
  if (step.optsByConflict) {
    const style = window.AppState.userProfile?.conflictStyle || 'collaborative';
    return step.optsByConflict[style] || step.optsByConflict.collaborative;
  }
  return step.opts;
}

function daysUntilNext() {
  const last = window.AppState.gameData?.checkin?.lastCheckin;
  if (!last) return 0;
  const elapsed = daysBetween(last, todayLocal());
  return Math.max(0, CHECKIN_INTERVAL_DAYS - elapsed);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderArea() {
  const area = document.getElementById('checkin-area');
  if (!area) return;
  const gd = window.AppState.gameData;
  const entries = gd.checkin?.entries || [];
  const lastEntry = entries[entries.length - 1];
  const wait = daysUntilNext();

  if (wait > 0) {
    area.innerHTML = `
      <div style="text-align:center; padding:16px 0;">
        <div style="font-size:1.8rem; margin-bottom:8px;">🌱</div>
        <div style="font-size:0.85rem; font-weight:700; margin-bottom:8px;">Checked in for this week.</div>
        ${lastEntry ? `<div style="font-size:0.72rem; color:var(--text-secondary); line-height:1.55; max-width:280px; margin:0 auto 10px;">${isSolo() ? 'Your intention' : 'Your experiment'}: <strong>${lastEntry.answers[2]}</strong>${lastEntry.note ? `<br><em>"${lastEntry.note}"</em>` : ''}</div>` : ''}
        <div style="font-size:0.65rem; color:var(--text-muted);">Next check-in opens in ${wait} day${wait !== 1 ? 's' : ''}.</div>
      </div>
    `;
    return;
  }

  const stepList = steps();

  if (_stepIndex >= stepList.length) {
    // Optional note + finish
    area.innerHTML = `
      <div style="font-size:0.85rem; font-weight:700; margin-bottom:10px;">Anything worth writing down? <span style="font-weight:400; color:var(--text-muted); font-size:0.7rem;">(optional)</span></div>
      <textarea id="checkin-note" class="input-field" rows="2" maxlength="200" placeholder="One honest sentence..." style="width:100%; resize:none; margin-bottom:12px;"></textarea>
      <button class="btn" onclick="finishCheckin()">Finish Check-In</button>
    `;
    return;
  }

  const step = stepList[_stepIndex];
  const opts = stepOptions(step);
  // Echo last week's third answer at the start — the ritual remembers itself.
  const echo = _stepIndex === 0 && lastEntry
    ? `<div style="font-size:0.7rem; color:var(--text-muted); background:var(--bg-dark); border:1px solid var(--border-color); border-radius:8px; padding:8px 10px; margin-bottom:14px; line-height:1.45;">Last week you planned: <strong>${lastEntry.answers[2]}</strong> — how did it go? Keep it in mind as you answer.</div>`
    : '';

  area.innerHTML = `
    ${echo}
    <div style="display:flex; gap:4px; margin-bottom:12px;">
      ${stepList.map((_, i) => `<div style="flex:1; height:4px; border-radius:2px; background:${i <= _stepIndex ? 'var(--accent-primary)' : 'var(--border-color)'}"></div>`).join('')}
    </div>
    <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:var(--accent-primary); margin-bottom:4px;">${step.title}</div>
    <div style="font-size:0.9rem; font-weight:700; margin-bottom:14px; line-height:1.4;">${step.prompt}</div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${opts.map((o, i) => `<button class="choice-btn" style="text-align:left;" onclick="answerCheckinStep(${i})">${o}</button>`).join('')}
    </div>
  `;
}

function renderDrawer() {
  const solo = isSolo();
  const count = window.AppState.gameData?.checkin?.entries?.length || 0;
  return `
    <div class="subtitle">Rituals</div>
    <h2 style="margin-bottom:4px;">Weekly Check-In</h2>
    <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:14px;">${count} check-in${count !== 1 ? 's' : ''} so far</div>
    <p class="card-body" style="margin-bottom:16px;">${solo
      ? 'Three taps, once a week: a win, a struggle, an intention. Next week, it asks how the intention went.'
      : 'Three taps, once a week: an appreciation, a small friction, a tiny experiment. Next week, it asks how the experiment went.'}</p>
    <div id="checkin-area"></div>
  `;
}

export const checkinGame = {
  id: 'checkin',
  title: 'Weekly Check-In',
  renderDrawer,
  init: () => {
    _stepIndex = 0;
    _answers = [];
    renderArea();
  },
  bindWindow: () => {
    window.answerCheckinStep = (optIdx) => {
      const step = steps()[_stepIndex];
      if (!step) return;
      _answers.push(stepOptions(step)[optIdx]);
      _stepIndex++;
      renderArea();
    };

    window.finishCheckin = () => {
      const gd = window.AppState.gameData;
      const note = document.getElementById('checkin-note')?.value?.trim() || null;
      gd.checkin.entries.push({
        date: todayLocal(),
        mode: isSolo() ? 'solo' : 'partner',
        answers: _answers.slice(0, 3),
        note
      });
      if (gd.checkin.entries.length > 12) gd.checkin.entries.shift();
      gd.checkin.lastCheckin = todayLocal();
      gd.checkin.lastPlayed = new Date().toISOString();
      saveGameData();
      if (canAwardPetGrowthToday('checkin')) {
        recordPetGrowthToday('checkin');
        awardPetGrowth(1);
      }
      renderArea();
    };
  }
};
