/**
 * Called It — lock in a prediction about your week, come back later to see
 * if you called it. The app's only anticipation loop: it deliberately gives
 * you a reason to come back in a few days.
 *
 * One active prediction at a time. It becomes resolvable after 3 local
 * days; resolution is self-reported (Yes / No), updates a lifetime score,
 * and immediately offers the next prediction.
 */

import { saveGameData, todayLocal, daysBetween, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';
import { accountSalt, pickFrom, kickerFor } from '../composer.js';

const RESOLVE_AFTER_DAYS = 3;

const PARTNER_PREDICTIONS = [
  { q: "Who texts first tomorrow morning?", opts: ["Me", "Them"] },
  { q: "Will you two actually do the thing you said you'd do this week?", opts: ["Yes, watch us", "It will be rescheduled"] },
  { q: "Who falls asleep first tonight?", opts: ["Me", "Them"] },
  { q: "Will this week include a takeout order?", opts: ["Obviously", "We will resist"] },
  { q: "Who says 'we should leave earlier next time' this week?", opts: ["Me", "Them"] },
  { q: "Will the show you're watching get finished this week?", opts: ["Finale by Sunday", "Still 3 episodes left"] },
  { q: "Who wins the next 'where should we eat' negotiation?", opts: ["Me", "Them"] },
  { q: "Will one of you quote a meme in a serious moment this week?", opts: ["100% guaranteed", "We are adults"] },
  { q: "Who loses their keys/phone/wallet first this week?", opts: ["Me", "Them"] },
  { q: "Will the laundry reach the drawer stage this week?", opts: ["Full completion", "Chair purgatory"] },
  { q: "Who initiates the next hug?", opts: ["Me", "Them"] },
  { q: "Will you learn one genuinely new thing about each other this week?", opts: ["Yes", "We are fully documented"] },
];

const SOLO_PREDICTIONS = [
  { q: "Will you actually do the thing you've been postponing this week?", opts: ["This is the week", "It's decorative at this point"] },
  { q: "Will your screen time go down this week?", opts: ["Down, on purpose", "Up, mysteriously"] },
  { q: "Will you cook more than you order this week?", opts: ["Chef mode", "The apps know my name"] },
  { q: "Will you be early to the next thing you're dreading?", opts: ["Early and smug", "Precisely on time (late)"] },
  { q: "Will the gym/walk/workout happen 3+ times this week?", opts: ["Athlete behavior", "The couch also counts"] },
  { q: "Will you text back the person you've been meaning to text?", opts: ["This week, for real", "They know I love them"] },
  { q: "Will you go to bed before midnight most nights this week?", opts: ["Reformed", "The night is my inheritance"] },
  { q: "Will you finish the book/show/project you're mid-way through?", opts: ["Finishing it", "Starting a new one instead"] },
  { q: "Will you say no to something you don't want to do?", opts: ["A firm, kind no", "A yes I'll regret"] },
  { q: "Will next week's you thank this week's you?", opts: ["Yes — gifts incoming", "There will be notes"] },
  { q: "Will the weird noise in your home get investigated this week?", opts: ["Solved", "It's part of the family now"] },
  { q: "Will you drink actual water like a hydrated legend?", opts: ["Aggressively hydrated", "Coffee is basically rain"] },
];

const RIGHT_LINES = [
  "CALLED IT. Add prophet to the résumé.",
  "Correct. You know this life suspiciously well.",
  "Called it clean. The universe is taking notes on you for once.",
];

const WRONG_LINES = [
  "Missed it — the plot twisted. Respect to the plot.",
  "Wrong, but boldly wrong, which is the best kind.",
  "The future declined to cooperate. It does that.",
];

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function getState() {
  const gd = window.AppState.gameData;
  if (!gd.calledit) gd.calledit = { active: null, made: 0, right: 0, lastPlayed: null };
  return gd.calledit;
}

function pickPrediction() {
  const ci = getState();
  const pool = isSolo() ? SOLO_PREDICTIONS : PARTNER_PREDICTIONS;
  return pool[(ci.made + accountSalt()) % pool.length];
}

function daysUntilResolvable(active) {
  const elapsed = daysBetween(active.date, todayLocal());
  return Math.max(0, RESOLVE_AFTER_DAYS - elapsed);
}

function render() {
  const area = document.getElementById('calledit-area');
  if (!area) return;
  const ci = getState();

  if (ci.active) {
    const waitDays = daysUntilResolvable(ci.active);
    if (waitDays > 0) {
      area.innerHTML = `
        <div class="card" style="text-align:center;">
          <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">Prediction locked in</div>
          <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">${ci.active.q}</div>
          <div style="font-size:0.78rem; color:var(--accent-primary); font-weight:700; margin-bottom:10px;">Your call: ${ci.active.pick}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">Resolves in ${waitDays} day${waitDays !== 1 ? 's' : ''}. The future is cooking. No refunds.</div>
        </div>
      `;
    } else {
      area.innerHTML = `
        <div class="card" style="text-align:center;">
          <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">Moment of truth</div>
          <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">${ci.active.q}</div>
          <div style="font-size:0.78rem; color:var(--accent-primary); font-weight:700; margin-bottom:14px;">You called: ${ci.active.pick}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:10px;">So... did it happen?</div>
          <div style="display:flex; gap:10px; justify-content:center;">
            <button class="choice-btn" style="flex:1;" onclick="resolveCalledIt(true)">Called it ✅</button>
            <button class="choice-btn" style="flex:1;" onclick="resolveCalledIt(false)">Missed it ❌</button>
          </div>
        </div>
      `;
    }
    return;
  }

  // No active prediction — offer one.
  const p = pickPrediction();
  window._calledItCurrent = p;
  const score = ci.made > 0 ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:10px;">Track record: ${ci.right}/${ci.made} called.</div>` : '';
  area.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">This week's prediction</div>
      ${score}
      <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:14px;">${p.q}</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${p.opts.map(o => `<button class="choice-btn" style="text-align:left;" onclick="makeCalledItPick('${o.replace(/'/g, "\\'")}')">${o}</button>`).join('')}
      </div>
    </div>
  `;
}

function makePick(pick) {
  const ci = getState();
  const p = window._calledItCurrent;
  if (!p || ci.active) return;
  ci.active = { date: todayLocal(), q: p.q, pick };
  ci.lastPlayed = new Date().toISOString();
  saveGameData();
  render();
}

function resolve(wasRight) {
  const ci = getState();
  if (!ci.active) return;
  ci.made += 1;
  if (wasRight) ci.right += 1;
  ci.active = null;
  ci.lastPlayed = new Date().toISOString();
  saveGameData();
  if (canAwardPetGrowthToday('calledit')) {
    recordPetGrowthToday('calledit');
    awardPetGrowth(1);
  }

  const area = document.getElementById('calledit-area');
  if (!area) return;
  let line = pickFrom(wasRight ? RIGHT_LINES : WRONG_LINES, ci.made, accountSalt());
  const kicker = kickerFor('general', ci.made, 'calledit-resolve');
  if (kicker) line += ` ${kicker}`;
  area.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:2rem; margin-bottom:8px;">${wasRight ? '🔮' : '🙈'}</div>
      <div style="font-size:0.85rem; color:var(--text-primary); line-height:1.6; margin-bottom:8px;">${line}</div>
      <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:14px;">Track record: ${ci.right}/${ci.made} called.</div>
      <button class="btn" onclick="newCalledItPrediction()">Make the next call</button>
    </div>
  `;
}

export const calledItGame = {
  id: 'calledit',
  title: 'Called It',
  renderDrawer: () => {
    const solo = isSolo();
    return `
      <div class="subtitle">Games</div>
      <h2 style="margin-bottom:4px;">Called It</h2>
      <p class="card-body" style="margin-bottom:16px;">${solo
        ? 'Lock in one prediction about your week. Come back in a few days to face the results. The future keeps receipts.'
        : 'Lock in one prediction about the two of you this week. Come back in a few days to see who actually knows this relationship.'}</p>
      <div id="calledit-area"></div>
    `;
  },
  init: render,
  bindWindow: () => {
    window.makeCalledItPick = makePick;
    window.resolveCalledIt = resolve;
    window.newCalledItPrediction = render;
  }
};
