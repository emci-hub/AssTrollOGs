/**
 * Personality Sparks (solo) / Couple's Hot Takes (partner)
 *
 * Solo mode:   9 reflective statements about yourself. Tap ones that feel true today.
 *              Checked items update the "sparks" profile signal used in Day at a Glance.
 *
 * Partner mode: 9 playful "hot take" statements about your relationship.
 *               Tap ones you agree with. Running score shows how in sync you are.
 *               Score feeds into the Connection metric.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';

// Solo: personality-anchored statements drawn from user profile values
function buildSoloCards(userProfile) {
  const attach = userProfile?.attachmentStyle || 'secure';
  const love = userProfile?.loveLanguage || 'words';
  const conflict = userProfile?.conflictStyle || 'collaborative';
  const expr = userProfile?.expressionStyle || 'direct';
  const mbti = userProfile?.mbti || '';
  const isIntrovert = mbti[0] === 'I';

  const anchored = [];

  if (attach === 'secure')   anchored.push('I feel comfortable asking for what I need', 'I trust people until they give me a reason not to');
  if (attach === 'anxious')  anchored.push('I notice when something feels off right away', 'I care a lot about how people feel around me');
  if (attach === 'avoidant') anchored.push('I recharge best when I have time to myself', 'I prefer showing care through actions more than words');
  if (attach === 'fearful')  anchored.push('I want close connections but take my time getting there', 'I think deeply before I trust someone fully');

  if (love === 'words')   anchored.push('A kind message can turn my whole day around');
  if (love === 'time')    anchored.push('Full attention from someone feels like a real gift');
  if (love === 'service') anchored.push('When someone helps me without being asked, I feel deeply seen');
  if (love === 'touch')   anchored.push('A good hug fixes more than people realize');
  if (love === 'gifts')   anchored.push('A small, thoughtful gesture means more than something expensive');

  if (conflict === 'collaborative') anchored.push('I like talking problems through until we both feel good');
  if (conflict === 'compromising')  anchored.push('I would rather find a middle ground fast than drag things out');
  if (conflict === 'accommodating') anchored.push('Keeping the peace matters a lot to me');
  if (conflict === 'avoiding')      anchored.push('I need a little space before I can talk about something hard');

  if (expr === 'direct')     anchored.push('I say what I mean — I think it saves everyone time');
  if (expr === 'indirect')   anchored.push('I drop hints because I want people to care enough to notice');
  if (expr === 'reflective') anchored.push('I take time to think before I say something important');
  if (expr === 'analytical') anchored.push('I feel better when I can break a problem into smaller parts');

  anchored.push(isIntrovert ? 'I love people, but I need alone time to feel like myself' : 'I get more energized the longer I spend with people I like');

  const extras = [
    'I overthink things sometimes, but it usually works out',
    'I notice little details that other people miss',
    'I laugh at myself pretty easily',
    'I genuinely enjoy helping people',
    'I have a playlist for every mood',
    'I am a better friend than I give myself credit for',
    'I feel things more deeply than I let on',
    'I am more patient than I used to be',
    'I like learning new things even when they are hard'
  ];

  const combined = [...new Set([...anchored, ...extras])];
  return combined.sort(() => Math.random() - 0.5).slice(0, 9);
}

// Partner: playful statements about the relationship
function buildPartnerCards(userProfile, partnerProfile) {
  const userName = userProfile?.name || 'You';
  const partnerName = partnerProfile?.name || 'Your partner';
  const userLove = userProfile?.loveLanguage || 'words';
  const partnerLove = partnerProfile?.loveLanguage || 'time';
  const userConflict = userProfile?.conflictStyle || 'collaborative';
  const partnerConflict = partnerProfile?.conflictStyle || 'collaborative';

  const anchored = [];

  if (userLove === partnerLove) anchored.push(`You and ${partnerName} speak the same love language`);
  else anchored.push(`You and ${partnerName} show love differently, and that is actually interesting`);

  if (userConflict === 'avoiding' || partnerConflict === 'avoiding') anchored.push('A bit of space is sometimes the best fix');
  if (userConflict === 'collaborative' || partnerConflict === 'collaborative') anchored.push('You two usually talk things through and feel better after');

  anchored.push(
    `${partnerName} can make you laugh even on a bad day`,
    `You know each other's coffee order by heart`,
    `You have at least one inside joke nobody else gets`,
    'You are both funnier when you are together',
    'You two have opposite strengths that actually balance out',
    'The best parts of this connection are the small everyday things',
    'You are still figuring each other out and that is a good thing',
    'You both show up differently, but you both show up',
    'This relationship has taught you something about yourself'
  );

  const combined = [...new Set(anchored)];
  return combined.sort(() => Math.random() - 0.5).slice(0, 9);
}

let sparksChecked = new Set();
let hotTakesAgreed = new Set();
let totalCards = 9;

function initSolo() {
  sparksChecked = new Set(window.AppState.gameData?.sparks?.checkedItems || []);
  const cards = buildSoloCards(window.AppState.userProfile);
  renderSoloGrid(cards);
}

function renderSoloGrid(cards) {
  const grid = document.getElementById('sparks-grid');
  if (!grid) return;
  grid.innerHTML = cards.map((card, i) => {
    const checked = sparksChecked.has(card);
    return `<div class="sparks-cell ${checked ? 'checked' : ''}" data-label="${card.replace(/"/g,'&quot;')}" onclick="toggleSparksCell(this)">${card}</div>`;
  }).join('');
  updateSparksCount();
}

function toggleSparksCell(el) {
  el.classList.toggle('checked');
  const label = el.dataset.label;
  if (el.classList.contains('checked')) sparksChecked.add(label);
  else sparksChecked.delete(label);

  const gd = window.AppState.gameData;
  if (!gd.sparks) gd.sparks = { checkedItems: [], lastPlayed: null };
  gd.sparks.checkedItems = [...sparksChecked];
  gd.sparks.lastPlayed = new Date().toISOString();

  // Also mirror into bingo for backwards-compat with metrics/insights
  gd.bingo.checkedCells = [...sparksChecked];
  gd.bingo.checked = sparksChecked.size;
  gd.bingo.lastPlayed = gd.sparks.lastPlayed;

  saveGameData();
  updateSparksCount();

  // Award pet growth when the full board is checked
  if (sparksChecked.size >= totalCards && canAwardPetGrowthToday('sparks')) {
    recordPetGrowthToday('sparks');
    awardPetGrowth(1);
  }
}

function updateSparksCount() {
  const countEl = document.getElementById('sparks-count');
  if (countEl) countEl.innerText = `${sparksChecked.size} of ${totalCards} resonate`;
}

function initPartner() {
  hotTakesAgreed = new Set();
  const cards = buildPartnerCards(window.AppState.userProfile, window.AppState.partnerProfile);
  window._hotTakeCards = cards;
  totalCards = cards.length;
  renderHotTakesGrid(cards);
}

function renderHotTakesGrid(cards) {
  const grid = document.getElementById('sparks-grid');
  if (!grid) return;
  grid.innerHTML = cards.map((card, i) => {
    return `<div class="sparks-cell" data-label="${card.replace(/"/g,'&quot;')}" onclick="toggleHotTake(this)">${card}</div>`;
  }).join('');
  updateHotTakeScore();
}

function toggleHotTake(el) {
  el.classList.toggle('checked');
  const label = el.dataset.label;
  if (el.classList.contains('checked')) hotTakesAgreed.add(label);
  else hotTakesAgreed.delete(label);

  const gd = window.AppState.gameData;
  // Mirror into bingo for metrics
  gd.bingo.checkedCells = [...hotTakesAgreed];
  gd.bingo.checked = hotTakesAgreed.size;
  gd.bingo.lastPlayed = new Date().toISOString();
  saveGameData();
  updateHotTakeScore();

  if (hotTakesAgreed.size >= totalCards && canAwardPetGrowthToday('sparks')) {
    recordPetGrowthToday('sparks');
    awardPetGrowth(1);
  }
}

function updateHotTakeScore() {
  const scoreEl = document.getElementById('sparks-count');
  if (!scoreEl) return;
  const agreed = hotTakesAgreed.size;
  const pct = Math.round((agreed / totalCards) * 100);
  let label = agreed === 0 ? 'Tap what feels true' : agreed <= 3 ? `${agreed} agreed — just getting started` : agreed <= 6 ? `${agreed} agreed — you know each other well` : `${agreed} agreed — this connection is real`;
  scoreEl.innerText = label;
}

export const sparksGame = {
  id: 'bingo',
  title: 'Personality Sparks',
  renderDrawer: () => {
    const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
    const pName = window.AppState.partnerProfile?.name || 'your partner';
    if (solo) {
      return `
        <div class="subtitle">The Sandbox</div>
        <h2 style="margin-bottom:4px;">Personality Sparks</h2>
        <p class="card-body" style="margin-bottom:4px; color:var(--text-muted); font-size:0.75rem;" id="sparks-count">Loading...</p>
        <p class="card-body" style="margin-bottom:16px;">Tap the ones that feel true for you today. Cards update each time.</p>
        <div id="sparks-grid" class="sparks-grid"></div>
        <button class="btn btn-outline" style="margin-top:14px;" onclick="reshuffleSparks()">New Cards</button>
      `;
    } else {
      return `
        <div class="subtitle">The Sandbox</div>
        <h2 style="margin-bottom:4px;">Couple's Hot Takes</h2>
        <p class="card-body" style="margin-bottom:4px; color:var(--text-muted); font-size:0.75rem;" id="sparks-count">Tap what feels true</p>
        <p class="card-body" style="margin-bottom:16px;">Tap the statements that feel true about you and ${pName}. See your score at the end.</p>
        <div id="sparks-grid" class="sparks-grid"></div>
        <button class="btn btn-outline" style="margin-top:14px;" onclick="reshuffleSparks()">New Round</button>
      `;
    }
  },
  init: () => {
    const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
    if (solo) initSolo();
    else initPartner();
  },
  bindWindow: () => {
    window.toggleBingoCell = toggleSparksCell; // legacy compat
    window.toggleSparksCell = toggleSparksCell;
    window.toggleHotTake = toggleHotTake;
    window.reshuffleSparks = () => {
      const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
      sparksChecked = new Set();
      hotTakesAgreed = new Set();
      if (solo) initSolo();
      else initPartner();
    };
  }
};
