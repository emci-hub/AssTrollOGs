/**
 * Red Flag Bingo — a playful self-roast board.
 *
 * Solo mode:    9 relatable "red flags" about yourself. Tap the ones you're
 *               guilty of. Full board = certified self-aware.
 * Partner mode: 9 flags about the two of you as a household. Tap the true ones.
 *
 * Reuses the sparks-grid/sparks-cell CSS from Personality Sparks. The board
 * is a deterministic seeded shuffle (boards completed + account salt), so
 * "New Board" actually rotates through the pool instead of random-repeating,
 * and two fresh accounts don't open on identical boards.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';
import { accountSalt, hashStr, kickerFor } from '../composer.js';

const SOLO_FLAGS = [
  "Has said 'I'm not mad' while visibly mad",
  "Apologizes to furniture after bumping into it",
  "Replies 'omw' from bed",
  "Has a favorite mug and will wait for it to be clean",
  "Says 'we should hang out soon' with zero follow-through",
  "Leaves one bite of food so it's 'not finished'",
  "Checks the fridge again in case new food appeared",
  "Has 74 unread messages and full anxiety about all of them",
  "Rehearses arguments in the shower against people who aren't there",
  "Says 'sorry, I was just about to reply' (a lie)",
  "Keeps the box 'in case it needs to go back' (it never goes back)",
  "Has a chair that is not for sitting, it is for clothes",
  "Googles the menu and still panics when asked to order",
  "Cancels plans and feels immediate euphoria",
  "Watches a new show only after five people insist, then makes it a personality",
  "Sets 9 alarms and negotiates with all of them",
  "Says 'I'm leaving in 5 minutes' on a purely spiritual level",
  "Screenshots things and never looks at them again",
  "Would rather drive 20 minutes than make a 2-minute phone call",
  "Has one password and it knows too much",
  "Opens the group chat, reads everything, contributes nothing",
  "Restarts the whole song after missing the good part",
  "Buys books faster than any human could read them",
  "Takes 'how are you?' literally about once a month",
  "Puts something somewhere 'so I won't forget it' and never sees it again",
];

const PARTNER_FLAGS = [
  "One of you narrates the GPS's job to the driver",
  "You've argued about the correct way to load the dishwasher",
  "'Where do you want to eat?' has ruined at least one evening",
  "One of you steals the blanket and has never once admitted it",
  "You have a show neither of you is allowed to watch alone",
  "One of you says 'we're leaving' and then starts a new task",
  "The thermostat is a demilitarized zone",
  "You've had a whole conversation in looks at a party",
  "One of you repeats the other's joke louder and gets the laugh",
  "There's a 'your side' of the bed and it is constitutional law",
  "One of you reads the reviews, the other reads the vibes",
  "You've kept a terrible object because the other one won it/found it",
  "Someone's phone brightness is a recurring debate",
  "One of you claims to be 'almost ready' from a completely unready state",
  "You have at least one recurring fake argument you both enjoy",
  "One of you checks the door is locked; the other checks the other checked",
  "Leftovers have been claimed with legal-level seriousness",
  "One of you 'doesn't want fries' and then eats the fries",
  "You've both pretended to know a person neither of you remembers",
  "The last photo of you two together is from an event neither can name",
];

let checked = new Set();
const BOARD_SIZE = 9;

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function boardsCompleted() {
  return window.AppState.gameData?.redflag?.boardsCompleted || 0;
}

// Deterministic board: stable within a board number, rotates when a board
// completes, differs per account.
function buildBoard(solo) {
  const pool = solo ? SOLO_FLAGS : PARTNER_FLAGS;
  const seed = accountSalt() + boardsCompleted() * 7919;
  return pool
    .map(item => ({ item, key: hashStr(`${item}|${seed}`) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, BOARD_SIZE)
    .map(e => e.item);
}

function scoreLabel(n) {
  if (n === 0) return 'Tap your crimes. We know they\'re in there.';
  if (n <= 3) return `${n} flags — practically a saint. Suspicious, honestly.`;
  if (n <= 6) return `${n} flags — comfortably human.`;
  if (n < BOARD_SIZE) return `${n} flags — the self-awareness is ESCALATING.`;
  return `${BOARD_SIZE}/9 — full board. Certified Self-Aware. Wear it proudly.`;
}

function render() {
  const grid = document.getElementById('redflag-grid');
  if (!grid) return;
  const cards = buildBoard(isSolo());
  grid.innerHTML = cards.map(card => {
    const isChecked = checked.has(card);
    return `<div class="sparks-cell ${isChecked ? 'checked' : ''}" data-label="${card.replace(/"/g, '&quot;')}" onclick="toggleRedFlag(this)">🚩 ${card}</div>`;
  }).join('');
  updateCount();
}

function updateCount() {
  const el = document.getElementById('redflag-count');
  if (el) el.innerText = scoreLabel(checked.size);
}

function toggle(el) {
  el.classList.toggle('checked');
  const label = el.dataset.label;
  if (el.classList.contains('checked')) checked.add(label);
  else checked.delete(label);

  const gd = window.AppState.gameData;
  if (!gd.redflag) gd.redflag = { checkedCells: [], lastPlayed: null, boardsCompleted: 0 };
  gd.redflag.checkedCells = [...checked];
  gd.redflag.lastPlayed = new Date().toISOString();

  if (checked.size >= BOARD_SIZE) {
    gd.redflag.boardsCompleted = (gd.redflag.boardsCompleted || 0) + 1;
    if (canAwardPetGrowthToday('redflags')) {
      recordPetGrowthToday('redflags');
      awardPetGrowth(1);
    }
  }
  saveGameData();
  updateCount();
}

export const redflagGame = {
  id: 'redflags',
  title: 'Red Flag Bingo',
  renderDrawer: () => {
    const solo = isSolo();
    const pName = window.AppState.partnerProfile?.name || 'your partner';
    const kicker = kickerFor('general', boardsCompleted(), 'redflag-intro');
    return `
      <div class="subtitle">The Sandbox</div>
      <h2 style="margin-bottom:4px;">Red Flag Bingo</h2>
      <p class="card-body" style="margin-bottom:4px; color:var(--text-muted); font-size:0.75rem;" id="redflag-count">Loading...</p>
      <p class="card-body" style="margin-bottom:16px;">${solo
        ? 'Tap the ones you\'re guilty of. This is a safe space. The flags already know.'
        : `Tap the ones that are true about you and ${pName}. Statistically, most of them.`}${kicker ? ` ${kicker}` : ''}</p>
      <div id="redflag-grid" class="sparks-grid"></div>
      <button class="btn btn-outline" style="margin-top:14px;" onclick="newRedFlagBoard()">New Board</button>
    `;
  },
  init: () => {
    checked = new Set(window.AppState.gameData?.redflag?.checkedCells || []);
    render();
  },
  bindWindow: () => {
    window.toggleRedFlag = toggle;
    window.newRedFlagBoard = () => {
      checked = new Set();
      const gd = window.AppState.gameData;
      if (!gd.redflag) gd.redflag = { checkedCells: [], lastPlayed: null, boardsCompleted: 0 };
      // A manual reshuffle also advances the board number so the next board
      // is a different deterministic slice, not the same one re-dealt.
      gd.redflag.boardsCompleted = (gd.redflag.boardsCompleted || 0) + 1;
      gd.redflag.checkedCells = [];
      saveGameData();
      render();
    };
  }
};
