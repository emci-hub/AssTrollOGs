/**
 * Trivia game — tests how well you know your partner (duo) or yourself (solo).
 * Questions are simple and scenario-based — no technical terms or codes.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';

// Simple, behavior-based questions for duo mode (about partner)
const PARTNER_TRIVIA_QUESTIONS = [
  {
    question: "After a long, draining week, your partner most likely wants to...",
    category: 'attachment',
    hint: "Think about how they recharge and what makes them feel safe",
    options: [
      { text: "Talk it through and connect with you", value: 'anxious' },
      { text: "Have some alone time to decompress", value: 'avoidant' },
      { text: "Spend cozy time together without pressure", value: 'secure' },
      { text: "Be close but keep things light and easy", value: 'fearful' }
    ]
  },
  {
    question: "When your partner wants to show they care, they usually...",
    category: 'loveLanguage',
    hint: "How do they most naturally express love?",
    options: [
      { text: "Say something kind or send a sweet message", value: 'words' },
      { text: "Put their phone down and give you full attention", value: 'time' },
      { text: "Do something helpful without being asked", value: 'service' },
      { text: "Reach for your hand or give you a hug", value: 'touch' },
      { text: "Surprise you with a small thoughtful gift", value: 'gifts' }
    ]
  },
  {
    question: "When you two hit a disagreement, your partner tends to...",
    category: 'conflict',
    hint: "What's their natural reaction when things get tense?",
    options: [
      { text: "Want to talk it through until you both find a solution", value: 'collaborative' },
      { text: "Look for a quick middle ground so you can move on", value: 'compromising' },
      { text: "Go along with what you want to keep the peace", value: 'accommodating' },
      { text: "Need a little space before they can talk about it", value: 'avoiding' }
    ]
  },
  {
    question: "When your partner needs something from you, they usually...",
    category: 'expression',
    hint: "How do they communicate what they want or need?",
    options: [
      { text: "Just say it directly — no guessing needed", value: 'direct' },
      { text: "Drop hints and hope you pick up on it", value: 'indirect' },
      { text: "Think it over before bringing it up calmly", value: 'reflective' },
      { text: "Break it down logically and explain step by step", value: 'analytical' }
    ]
  },
  {
    question: "In social situations, your partner tends to...",
    category: 'mbti',
    hint: "Think about how they get their energy",
    options: [
      { text: "Light up and get more energized as the night goes on", value: 'extravert' },
      { text: "Enjoy it but need quiet time to recover after", value: 'introvert' }
    ],
    isBinary: true
  }
];

// Simple self-knowledge questions for solo mode
const SOLO_TRIVIA_QUESTIONS = [
  {
    question: "After a long, draining week, you most likely want to...",
    category: 'attachment',
    hint: "What actually recharges you and makes you feel better?",
    options: [
      { text: "Talk to someone close and feel connected", value: 'anxious' },
      { text: "Be alone for a bit to reset", value: 'avoidant' },
      { text: "Spend relaxed time with someone you trust", value: 'secure' },
      { text: "Be around people but not get too deep into it", value: 'fearful' }
    ]
  },
  {
    question: "When you want to show someone you care, you usually...",
    category: 'loveLanguage',
    hint: "What comes most naturally when you're trying to be kind?",
    options: [
      { text: "Tell them how much they mean to you", value: 'words' },
      { text: "Make time to be fully present with them", value: 'time' },
      { text: "Do something helpful without them asking", value: 'service' },
      { text: "Give them a hug or sit close to them", value: 'touch' },
      { text: "Pick up something you know they'd love", value: 'gifts' }
    ]
  },
  {
    question: "When you're in a disagreement with someone, you tend to...",
    category: 'conflict',
    hint: "What's your natural reaction when things get tense?",
    options: [
      { text: "Stay in it until you both find a real solution", value: 'collaborative' },
      { text: "Find a middle ground quickly so things can move on", value: 'compromising' },
      { text: "Go along with what they want to keep things smooth", value: 'accommodating' },
      { text: "Step back and come back when things are calmer", value: 'avoiding' }
    ]
  },
  {
    question: "When you need something from someone, you usually...",
    category: 'expression',
    hint: "How do you communicate what you want or need?",
    options: [
      { text: "Just say it clearly and directly", value: 'direct' },
      { text: "Drop hints and hope they pick up on it", value: 'indirect' },
      { text: "Think it through before bringing it up", value: 'reflective' },
      { text: "Explain the logic step by step", value: 'analytical' }
    ]
  },
  {
    question: "In social situations, you tend to...",
    category: 'mbti',
    hint: "Think about how you get your energy",
    options: [
      { text: "Get more energized as the event goes on", value: 'extravert' },
      { text: "Enjoy it but feel drained by the end", value: 'introvert' }
    ],
    isBinary: true
  }
];

// Map profile values to readable display labels
const VALUE_DISPLAY = {
  anxious: 'Seeks connection', avoidant: 'Needs space', secure: 'Balanced closeness', fearful: 'Cautiously open',
  words: 'Kind words', time: 'Quality time', service: 'Helpful actions', touch: 'Physical closeness', gifts: 'Thoughtful gifts',
  collaborative: 'Talk it through', compromising: 'Find middle ground', accommodating: 'Keep the peace', avoiding: 'Take space first',
  direct: 'Says it directly', indirect: 'Drops hints', reflective: 'Thinks first', analytical: 'Breaks it down',
  extravert: 'Gets energy from people', introvert: 'Recharges alone'
};

// Map MBTI extravert/introvert back to profile mbti value for comparison
function getCorrectMbtiValue(mbti) {
  if (!mbti) return 'introvert';
  return mbti[0] === 'E' ? 'extravert' : 'introvert';
}

let triviaIndex = 0;
let triviaScore = 0;

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function init() {
  triviaIndex = 0;
  triviaScore = 0;
  renderQuestion();
}

function renderQuestion() {
  const container = document.getElementById('trivia-question-container');
  const scoreEl = document.getElementById('trivia-score');
  if (!container) return;

  const solo = isSolo();
  const questions = solo ? SOLO_TRIVIA_QUESTIONS : PARTNER_TRIVIA_QUESTIONS;

  if (triviaIndex >= questions.length) {
    const accuracy = Math.round((triviaScore / questions.length) * 100);
    const completeMsg = solo
      ? (accuracy >= 80 ? 'You know yourself really well!' : accuracy >= 60 ? 'Solid self-awareness — a few things worth reflecting on.' : 'Interesting! Some surprising things to discover about yourself.')
      : (accuracy >= 80 ? 'You know your partner really well!' : accuracy >= 60 ? 'Good instincts — a few things worth exploring together.' : 'Great opportunity to learn more about each other!');
    container.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <div style="font-size:1.1rem; font-weight:700; margin-bottom:8px;">Done!</div>
        <div style="font-size:2rem; font-weight:700; color:var(--accent-primary); margin-bottom:4px;">${triviaScore}/${questions.length}</div>
        <p class="card-body">${completeMsg}</p>
        <button class="btn" style="margin-top:16px; padding:10px;" onclick="initTriviaGame()">Play Again</button>
      </div>`;
    if (scoreEl) scoreEl.innerText = '';
    return;
  }

  const q = questions[triviaIndex];
  const sourceProfile = solo ? (window.AppState.userProfile || {}) : (window.AppState.partnerProfile || {});

  let correctValue;
  if (q.category === 'mbti') {
    correctValue = getCorrectMbtiValue(sourceProfile.mbti);
  } else {
    correctValue = sourceProfile[q.category] || q.options[0].value;
  }

  // Shuffle options
  const shuffled = [...q.options].sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:6px;">Question ${triviaIndex + 1} of ${questions.length}</div>
    <div style="font-size:0.9rem; font-weight:700; margin-bottom:6px; color:var(--text-primary);">${q.question}</div>
    <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:14px; font-style:italic;">${q.hint}</div>
    <div style="display:flex; flex-direction:column; gap:8px;" id="trivia-options">
      ${shuffled.map(opt => `<button class="choice-btn" style="text-align:left; padding:10px 14px;" onclick="answerTrivia('${opt.value}', '${correctValue}', '${q.category}')">${opt.text}</button>`).join('')}
    </div>
  `;
  if (scoreEl) scoreEl.innerText = `Score: ${triviaScore}`;
}

function answer(selected, correct, category) {
  const container = document.getElementById('trivia-options');
  if (container) {
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.style.pointerEvents = 'none';
      const val = btn.getAttribute('onclick').match(/answerTrivia\('([^']+)'/)?.[1];
      if (val === correct) btn.style.borderColor = 'var(--success-color)';
      else if (val === selected) btn.style.borderColor = 'var(--danger-color)';
    });
  }
  const isCorrect = selected === correct;
  if (isCorrect) triviaScore++;

  const gd = window.AppState.gameData;
  gd.trivia.correct += isCorrect ? 1 : 0;
  gd.trivia.total += 1;
  gd.trivia.lastPlayed = new Date().toISOString();

  if (category && gd.trivia.categoryAccuracy[category]) {
    gd.trivia.categoryAccuracy[category].total += 1;
    gd.trivia.categoryAccuracy[category].correct += isCorrect ? 1 : 0;
  }

  saveGameData();

  const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
  const questions = solo ? SOLO_TRIVIA_QUESTIONS : PARTNER_TRIVIA_QUESTIONS;
  // Award pet growth on round completion
  const isLastQuestion = (triviaIndex + 1) >= questions.length;
  if (isLastQuestion && canAwardPetGrowthToday('trivia')) {
    recordPetGrowthToday('trivia');
    awardPetGrowth(1);
  }

  setTimeout(() => { triviaIndex++; renderQuestion(); }, 1200);
}

export const triviaGame = {
  id: 'trivia',
  title: 'Trivia',
  renderDrawer: () => {
    const solo = window.AppState.soloMode || !window.AppState.partnerProfile;
    const pName = window.AppState.partnerProfile?.name || 'your partner';
    return `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:12px;">${solo ? 'Know Yourself' : `Know ${pName}`}</h2>
    <p class="card-body" style="margin-bottom:16px;">${solo ? 'Simple questions about how you actually behave. No right or wrong — just self-discovery.' : `Simple questions about how ${pName} actually behaves. See how well you know them.`}</p>
    <div id="trivia-game-area">
      <div id="trivia-question-container"></div>
      <div id="trivia-score" style="margin-top:16px; font-weight:700; color:var(--accent-primary);"></div>
    </div>
  `;
  },
  init,
  bindWindow: () => {
    window.initTriviaGame = init;
    window.answerTrivia = answer;
  }
};
