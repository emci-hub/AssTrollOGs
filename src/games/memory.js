/**
 * Memory match game — cards are personalized to the user's actual profile traits.
 * Instead of generic labels, cards reflect your MBTI letters, love language,
 * attachment style, and conflict style so each game feels specific to you.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';

let memoryState = { cards: [], flipped: [], moves: 0, matches: 0, lock: false };

function buildPersonalizedTraits() {
  const user = window.AppState?.userProfile || {};
  const mbti = user.mbti || 'INFP';
  const isIntrovert = mbti[0] === 'I';
  const isSensor = mbti[1] === 'S';
  const isThinker = mbti[2] === 'T';
  const isJudger = mbti[3] === 'J';

  const LOVE_LABELS = { words: 'Words', time: 'Time', service: 'Service', touch: 'Touch', gifts: 'Gifts' };
  const ATTACH_LABELS = { secure: 'Secure', anxious: 'Caring', avoidant: 'Independent', fearful: 'Careful' };
  const CONFLICT_LABELS = { collaborative: 'Team Up', compromising: 'Middle Ground', accommodating: 'Keep Peace', avoiding: 'Space First' };
  const EXPR_LABELS = { direct: 'Direct', indirect: 'Subtle', reflective: 'Thoughtful', analytical: 'Logical' };

  const traitPool = [
    { label: isIntrovert ? 'Recharges alone' : 'Energized by people', emoji: isIntrovert ? 'Quiet' : 'Social' },
    { label: isSensor ? 'Trusts facts' : 'Loves big ideas', emoji: isSensor ? 'Facts' : 'Ideas' },
    { label: isThinker ? 'Thinks it through' : 'Feels it out', emoji: isThinker ? 'Logic' : 'Heart' },
    { label: isJudger ? 'Likes a plan' : 'Stays flexible', emoji: isJudger ? 'Plan' : 'Flex' },
    { label: LOVE_LABELS[user.loveLanguage] || 'Kind Words', emoji: LOVE_LABELS[user.loveLanguage] || 'Words' },
    { label: ATTACH_LABELS[user.attachmentStyle] || 'Secure', emoji: ATTACH_LABELS[user.attachmentStyle] || 'Secure' }
  ];
  return traitPool;
}

function init() {
  const traits = buildPersonalizedTraits();
  const pairs = [...traits, ...traits].map((t, i) => ({ ...t, id: i }));
  memoryState = {
    cards: pairs.sort(() => Math.random() - 0.5),
    flipped: [],
    moves: 0,
    matches: 0,
    lock: false
  };
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('memory-grid');
  const movesEl = document.getElementById('memory-moves');
  const matchesEl = document.getElementById('memory-matches');
  if (!grid) return;

  grid.innerHTML = memoryState.cards.map((card, i) =>
    `<div class="memory-card ${card.matched ? 'matched' : ''}" data-index="${i}" onclick="flipMemoryCard(${i})">
      <div class="memory-card-inner ${card.flipped || card.matched ? 'flipped' : ''}">
        <div class="memory-card-front">?</div>
        <div class="memory-card-back" style="font-size:0.55rem; font-weight:700; text-align:center; padding:2px;">${card.emoji}</div>
      </div>
    </div>`
  ).join('');

  if (movesEl) movesEl.innerText = memoryState.moves;
  if (matchesEl) matchesEl.innerText = memoryState.matches;
}

function flipCard(index) {
  if (memoryState.lock) return;
  const card = memoryState.cards[index];
  if (card.flipped || card.matched) return;

  card.flipped = true;
  memoryState.flipped.push(index);
  renderGrid();

  if (memoryState.flipped.length === 2) {
    memoryState.moves++;
    memoryState.lock = true;
    const [a, b] = memoryState.flipped;
    const cardA = memoryState.cards[a];
    const cardB = memoryState.cards[b];

    if (cardA.label === cardB.label) {
      cardA.matched = true;
      cardB.matched = true;
      memoryState.matches++;
      memoryState.flipped = [];
      memoryState.lock = false;
      renderGrid();
      if (memoryState.matches === 6) {
        const gd = window.AppState.gameData;
        gd.memory.completed += 1;
        if (gd.memory.bestMoves === null || memoryState.moves < gd.memory.bestMoves) {
          gd.memory.bestMoves = memoryState.moves;
        }
        gd.memory.lastPlayed = new Date().toISOString();
        saveGameData();
        if (canAwardPetGrowthToday('memory')) {
          recordPetGrowthToday('memory');
          awardPetGrowth(1);
        }
        setTimeout(() => {
          const grid = document.getElementById('memory-grid');
          if (grid) grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; font-weight:700; color:var(--success-color);">You won in ${memoryState.moves} moves!${gd.memory.bestMoves === memoryState.moves ? ' New best!' : ''}</div>`;
        }, 500);
      }
    } else {
      setTimeout(() => {
        cardA.flipped = false;
        cardB.flipped = false;
        memoryState.flipped = [];
        memoryState.lock = false;
        renderGrid();
      }, 900);
    }
  }
}

export const memoryGame = {
  id: 'memory',
  title: 'Vibe Match',
  renderDrawer: () => {
    const user = window.AppState?.userProfile || {};
    const best = window.AppState?.gameData?.memory?.bestMoves;
    return `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:4px;">Vibe Match</h2>
    <p class="card-body" style="margin-bottom:14px; color:var(--text-muted);">Flip cards to find matching pairs. Every card is a trait from your personality — no two games are the same.</p>
    <div id="memory-game-area">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="display:flex; gap:12px; font-size:0.8rem; color:var(--text-secondary);">
          <span>Moves: <strong id="memory-moves" style="color:var(--text-primary);">0</strong></span>
          <span>Pairs: <strong id="memory-matches" style="color:var(--text-primary);">0</strong>/6</span>
        </div>
        ${best ? `<span style="font-size:0.65rem; color:var(--accent-primary); background:rgba(129,140,248,0.12); padding:2px 8px; border-radius:20px;">Best: ${best} moves</span>` : ''}
      </div>
      <div id="memory-grid" class="memory-grid"></div>
      <button class="btn btn-outline" style="margin-top:14px;" onclick="initMemoryGame()">New Game</button>
    </div>
  `},
  init,
  bindWindow: () => {
    window.initMemoryGame = init;
    window.flipMemoryCard = flipCard;
  }
};
