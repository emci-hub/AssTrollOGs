/**
 * Time Capsule — write one line to future-you (or future-us), sealed for
 * 30 days. Unlockable capsules open with a little ceremony; the Journey
 * drawer gets an echo when one is waiting.
 *
 * gd.capsule.entries: [{ sealedAt, unlockDate, text, opened }] (last 12).
 */

import { saveGameData, todayLocal, daysBetween, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';
import { pickFrom, accountSalt, kickerFor } from '../composer.js';

const LOCK_DAYS = 30;
const MAX_ENTRIES = 12;
const MAX_LEN = 240;

const SEAL_LINES = [
  "Sealed. See you in 30 days. I will not read it. I absolutely cannot promise the pet won't.",
  "Locked away. Future-you just gained an inheritance.",
  "Sealed tight. Time will do the rest — it's weirdly reliable like that.",
];

const OPEN_LINES = [
  "A message from a previous you. They were really counting on you to read this.",
  "Thirty days traveled. Zero postage. Here's what past-you wanted to say:",
  "Delivered across a whole month. Past-you had something to tell you:",
];

function getState() {
  const gd = window.AppState.gameData;
  if (!gd.capsule) gd.capsule = { entries: [], lastPlayed: null };
  return gd.capsule;
}

/** Oldest capsule that's past its unlock date and not yet opened, if any. */
export function readyCapsule(gameData) {
  const entries = gameData?.capsule?.entries || [];
  return entries.find(e => !e.opened && daysBetween(e.unlockDate, todayLocal()) >= 0) || null;
}

function render() {
  const area = document.getElementById('capsule-area');
  if (!area) return;
  const cap = getState();
  const ready = readyCapsule(window.AppState.gameData);
  const sealed = cap.entries.filter(e => !e.opened && e !== ready);
  const openedCount = cap.entries.filter(e => e.opened).length;

  const readyBlock = ready ? `
    <div class="card" style="margin-bottom:12px; text-align:center; border-color:var(--accent-primary);">
      <div style="font-size:2rem; margin-bottom:6px;">📬</div>
      <div style="font-size:0.8rem; font-weight:700; color:var(--accent-primary); margin-bottom:8px;">A capsule from ${ready.sealedAt} is ready.</div>
      <button class="btn" onclick="openCapsule()">Open it</button>
    </div>` : '';

  const sealedBlock = sealed.length > 0 ? `
    <div class="card" style="margin-bottom:12px;">
      <div class="card-title" style="margin-bottom:8px;">Sealed capsules</div>
      ${sealed.map(e => {
        const wait = Math.max(0, LOCK_DAYS - daysBetween(e.sealedAt, todayLocal()));
        return `<div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-secondary); padding:4px 0;">
          <span>Sealed ${e.sealedAt}</span><span style="color:var(--text-muted);">${wait} day${wait !== 1 ? 's' : ''} left</span>
        </div>`;
      }).join('')}
    </div>` : '';

  area.innerHTML = `
    ${readyBlock}
    ${sealedBlock}
    <div class="card">
      <div class="card-title" style="margin-bottom:8px;">Write to future you</div>
      <p class="card-body" style="margin-bottom:10px; font-size:0.72rem;">One honest line. It unlocks in ${LOCK_DAYS} days. ${openedCount > 0 ? `You've opened ${openedCount} so far.` : ''}</p>
      <textarea id="capsule-text" class="input-field" maxlength="${MAX_LEN}" rows="3" placeholder="Dear future me..." style="resize:none; margin-bottom:10px;"></textarea>
      <button class="btn" onclick="sealCapsule()">Seal it for ${LOCK_DAYS} days</button>
      <div id="capsule-msg" style="display:none; text-align:center; font-size:0.75rem; color:var(--success-color); margin-top:10px;"></div>
    </div>
  `;
}

function seal() {
  const input = document.getElementById('capsule-text');
  const text = input?.value?.trim();
  if (!text) return;
  const cap = getState();

  const today = todayLocal();
  const unlock = new Date();
  unlock.setDate(unlock.getDate() + LOCK_DAYS);
  cap.entries.push({ sealedAt: today, unlockDate: todayLocal(unlock), text, opened: false });
  if (cap.entries.length > MAX_ENTRIES) cap.entries.shift();
  cap.lastPlayed = new Date().toISOString();
  saveGameData();
  if (canAwardPetGrowthToday('capsule')) {
    recordPetGrowthToday('capsule');
    awardPetGrowth(1);
  }

  render();
  const msgHost = document.getElementById('capsule-msg');
  if (msgHost) {
    let line = pickFrom(SEAL_LINES, cap.entries.length, accountSalt());
    const kicker = kickerFor('general', cap.entries.length, 'capsule-seal');
    if (kicker) line += ` ${kicker}`;
    msgHost.textContent = line;
    msgHost.style.display = 'block';
  }
}

function open() {
  const cap = getState();
  const ready = readyCapsule(window.AppState.gameData);
  if (!ready) return;
  ready.opened = true;
  ready.openedAt = todayLocal();
  cap.lastPlayed = new Date().toISOString();
  saveGameData();

  const area = document.getElementById('capsule-area');
  if (!area) return;
  const intro = pickFrom(OPEN_LINES, cap.entries.length, accountSalt(), ready.sealedAt);
  area.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:2rem; margin-bottom:8px;">💌</div>
      <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:10px;">${intro}</div>
      <div style="font-size:0.9rem; color:var(--text-primary); line-height:1.6; font-style:italic; margin-bottom:6px;">"${ready.text}"</div>
      <div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:14px;">— you, on ${ready.sealedAt}</div>
      <button class="btn btn-outline" onclick="backToCapsules()">Back</button>
    </div>
  `;
}

export const capsuleGame = {
  id: 'capsule',
  title: 'Time Capsule',
  renderDrawer: () => `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:4px;">Time Capsule</h2>
    <p class="card-body" style="margin-bottom:16px;">Write one line to the you of next month. Seal it. Forget it. Get ambushed by your own feelings in 30 days.</p>
    <div id="capsule-area"></div>
  `,
  init: render,
  bindWindow: () => {
    window.sealCapsule = seal;
    window.openCapsule = open;
    window.backToCapsules = render;
  }
};
