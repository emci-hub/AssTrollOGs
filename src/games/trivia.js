/**
 * Trivia game — tests how well you know your partner (duo) or yourself (solo).
 * Questions are simple and scenario-based — no technical terms or codes.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';
import { accountSalt, pickFrom, kickerFor } from '../composer.js';

/**
 * Scenario bank: each category holds multiple scenario VARIANTS, each with
 * solo and partner phrasings. A round takes one variant per category, chosen
 * by rounds-played + account salt, so consecutive rounds (and different
 * accounts) get different scenarios instead of the same 5 questions forever.
 */
const TRIVIA_BANK = [
  {
    category: 'attachment',
    variants: [
      {
        solo: { question: "After a long, draining week, you most likely want to...", hint: "What actually recharges you and makes you feel better?" },
        partner: { question: "After a long, draining week, your partner most likely wants to...", hint: "Think about how they recharge and what makes them feel safe" },
        soloOptions: [
          { text: "Talk to someone close and feel connected", value: 'anxious' },
          { text: "Be alone for a bit to reset", value: 'avoidant' },
          { text: "Spend relaxed time with someone you trust", value: 'secure' },
          { text: "Be around people but not get too deep into it", value: 'fearful' }
        ],
        partnerOptions: [
          { text: "Talk it through and connect with you", value: 'anxious' },
          { text: "Have some alone time to decompress", value: 'avoidant' },
          { text: "Spend cozy time together without pressure", value: 'secure' },
          { text: "Be close but keep things light and easy", value: 'fearful' }
        ]
      },
      {
        solo: { question: "You get big, unexpected good news. Your first instinct?", hint: "Where does good news go first?" },
        partner: { question: "Your partner gets big, unexpected good news. Their first instinct?", hint: "Where does their good news go first?" },
        soloOptions: [
          { text: "Tell someone immediately — it's not real until it's shared", value: 'anxious' },
          { text: "Savor it privately for a while first", value: 'avoidant' },
          { text: "Share it naturally next time you talk to someone", value: 'secure' },
          { text: "Get excited, but brace a little in case it falls through", value: 'fearful' }
        ],
        partnerOptions: [
          { text: "Call you immediately — it's not real until it's shared", value: 'anxious' },
          { text: "Savor it privately before telling anyone", value: 'avoidant' },
          { text: "Share it naturally next time you talk", value: 'secure' },
          { text: "Get excited but brace a little in case it falls through", value: 'fearful' }
        ]
      },
      {
        solo: { question: "A close friend hasn't replied in two days. You...", hint: "What does silence do to you?" },
        partner: { question: "When someone your partner cares about goes quiet for a couple of days, they...", hint: "What does silence do to them?" },
        soloOptions: [
          { text: "Wonder if something's wrong between you", value: 'anxious' },
          { text: "Barely register it — people get busy", value: 'avoidant' },
          { text: "Assume they're busy and follow up casually", value: 'secure' },
          { text: "Notice it, but wait for them to reach out first", value: 'fearful' }
        ],
        partnerOptions: [
          { text: "Wonder if something's wrong between them", value: 'anxious' },
          { text: "Barely register it — people get busy", value: 'avoidant' },
          { text: "Assume they're busy and follow up casually", value: 'secure' },
          { text: "Notice it, but wait for the other person to reach out", value: 'fearful' }
        ]
      }
    ]
  },
  {
    category: 'loveLanguage',
    variants: [
      {
        solo: { question: "When you want to show someone you care, you usually...", hint: "What comes most naturally when you're trying to be kind?" },
        partner: { question: "When your partner wants to show they care, they usually...", hint: "How do they most naturally express love?" },
        soloOptions: [
          { text: "Tell them how much they mean to you", value: 'words' },
          { text: "Make time to be fully present with them", value: 'time' },
          { text: "Do something helpful without them asking", value: 'service' },
          { text: "Give them a hug or sit close to them", value: 'touch' },
          { text: "Pick up something you know they'd love", value: 'gifts' }
        ],
        partnerOptions: [
          { text: "Say something kind or send a sweet message", value: 'words' },
          { text: "Put their phone down and give you full attention", value: 'time' },
          { text: "Do something helpful without being asked", value: 'service' },
          { text: "Reach for your hand or give you a hug", value: 'touch' },
          { text: "Surprise you with a small thoughtful gift", value: 'gifts' }
        ]
      },
      {
        solo: { question: "You've had a genuinely rough day. The best possible surprise is...", hint: "What actually helps when you're low?" },
        partner: { question: "Your partner's had a genuinely rough day. The surprise that would land best?", hint: "What actually helps them when they're low?" },
        soloOptions: [
          { text: "A long message saying exactly why you matter", value: 'words' },
          { text: "Someone dropping everything to just be with you", value: 'time' },
          { text: "Finding the annoying task already handled", value: 'service' },
          { text: "A long hug, no questions asked", value: 'touch' },
          { text: "A little something picked up because it was SO you", value: 'gifts' }
        ],
        partnerOptions: [
          { text: "A long message saying exactly why they matter", value: 'words' },
          { text: "You dropping everything to just be with them", value: 'time' },
          { text: "Finding the annoying task already handled", value: 'service' },
          { text: "A long hug, no questions asked", value: 'touch' },
          { text: "A little something you picked up because it was SO them", value: 'gifts' }
        ]
      },
      {
        solo: { question: "Which compliment sticks with you for weeks?", hint: "Not the nicest one — the one that lingers" },
        partner: { question: "Which compliment would stick with your partner for weeks?", hint: "Not the nicest one — the one that lingers" },
        soloOptions: [
          { text: "Something specific someone said about who you are", value: 'words' },
          { text: "'I always feel better after time with you'", value: 'time' },
          { text: "'You make everyone's life easier'", value: 'service' },
          { text: "'I feel at home around you'", value: 'touch' },
          { text: "Someone remembering a tiny detail you mentioned once", value: 'gifts' }
        ],
        partnerOptions: [
          { text: "Something specific about who they are", value: 'words' },
          { text: "'I always feel better after time with you'", value: 'time' },
          { text: "'You make everyone's life easier'", value: 'service' },
          { text: "'I feel at home around you'", value: 'touch' },
          { text: "You remembering a tiny detail they mentioned once", value: 'gifts' }
        ]
      }
    ]
  },
  {
    category: 'conflict',
    variants: [
      {
        solo: { question: "When you're in a disagreement with someone, you tend to...", hint: "What's your natural reaction when things get tense?" },
        partner: { question: "When you two hit a disagreement, your partner tends to...", hint: "What's their natural reaction when things get tense?" },
        soloOptions: [
          { text: "Stay in it until you both find a real solution", value: 'collaborative' },
          { text: "Find a middle ground quickly so things can move on", value: 'compromising' },
          { text: "Go along with what they want to keep things smooth", value: 'accommodating' },
          { text: "Step back and come back when things are calmer", value: 'avoiding' }
        ],
        partnerOptions: [
          { text: "Want to talk it through until you both find a solution", value: 'collaborative' },
          { text: "Look for a quick middle ground so you can move on", value: 'compromising' },
          { text: "Go along with what you want to keep the peace", value: 'accommodating' },
          { text: "Need a little space before they can talk about it", value: 'avoiding' }
        ]
      },
      {
        solo: { question: "Mid-argument, the other person raises their voice. You...", hint: "The heat-of-the-moment reflex, not the ideal" },
        partner: { question: "Mid-disagreement, things get heated. Your partner usually...", hint: "The heat-of-the-moment reflex, not the ideal" },
        soloOptions: [
          { text: "Slow it down and steer back to the actual issue", value: 'collaborative' },
          { text: "Look for the fastest fair way to cool it off", value: 'compromising' },
          { text: "Back off to keep it from escalating", value: 'accommodating' },
          { text: "End the conversation and revisit it later", value: 'avoiding' }
        ],
        partnerOptions: [
          { text: "Slows it down and steers back to the actual issue", value: 'collaborative' },
          { text: "Looks for the fastest fair way to cool it off", value: 'compromising' },
          { text: "Backs off to keep it from escalating", value: 'accommodating' },
          { text: "Ends the conversation and revisits it later", value: 'avoiding' }
        ]
      },
      {
        solo: { question: "After a disagreement ends, you usually...", hint: "The part after the part everyone talks about" },
        partner: { question: "After a disagreement ends, your partner usually...", hint: "The part after the part everyone talks about" },
        soloOptions: [
          { text: "Debrief it — what happened, what to do differently", value: 'collaborative' },
          { text: "Consider it closed once the deal is made", value: 'compromising' },
          { text: "Double-check the other person still feels okay", value: 'accommodating' },
          { text: "Need some alone time before things feel normal", value: 'avoiding' }
        ],
        partnerOptions: [
          { text: "Debriefs it — what happened, what to do differently", value: 'collaborative' },
          { text: "Considers it closed once the deal is made", value: 'compromising' },
          { text: "Double-checks you still feel okay", value: 'accommodating' },
          { text: "Needs some alone time before things feel normal", value: 'avoiding' }
        ]
      }
    ]
  },
  {
    category: 'expression',
    variants: [
      {
        solo: { question: "When you need something from someone, you usually...", hint: "How do you communicate what you want or need?" },
        partner: { question: "When your partner needs something from you, they usually...", hint: "How do they communicate what they want or need?" },
        soloOptions: [
          { text: "Just say it clearly and directly", value: 'direct' },
          { text: "Drop hints and hope they pick up on it", value: 'indirect' },
          { text: "Think it through before bringing it up", value: 'reflective' },
          { text: "Explain the logic step by step", value: 'analytical' }
        ],
        partnerOptions: [
          { text: "Just say it directly — no guessing needed", value: 'direct' },
          { text: "Drop hints and hope you pick up on it", value: 'indirect' },
          { text: "Think it over before bringing it up calmly", value: 'reflective' },
          { text: "Break it down logically and explain step by step", value: 'analytical' }
        ]
      },
      {
        solo: { question: "Something's been quietly bothering you for days. What happens next?", hint: "The realistic version, not the aspirational one" },
        partner: { question: "Something's been quietly bothering your partner for days. What happens next?", hint: "The realistic version, not the aspirational one" },
        soloOptions: [
          { text: "It gets said, plainly, usually within a day", value: 'direct' },
          { text: "It leaks out in hints until someone asks", value: 'indirect' },
          { text: "It gets thought all the way through, then raised calmly", value: 'reflective' },
          { text: "It gets organized into points before it gets shared", value: 'analytical' }
        ],
        partnerOptions: [
          { text: "They say it plainly, usually within a day", value: 'direct' },
          { text: "It leaks out in hints until you ask", value: 'indirect' },
          { text: "They think it all the way through, then raise it calmly", value: 'reflective' },
          { text: "It arrives organized into points, possibly numbered", value: 'analytical' }
        ]
      },
      {
        solo: { question: "Someone asks what you want for your birthday. You...", hint: "Be honest" },
        partner: { question: "You ask your partner what they want for their birthday. They...", hint: "Be honest" },
        soloOptions: [
          { text: "Tell them the exact thing", value: 'direct' },
          { text: "Say 'oh, anything!' and hope they caught the hints", value: 'indirect' },
          { text: "Ask for a bit of time to actually think about it", value: 'reflective' },
          { text: "Send a ranked list, possibly with links", value: 'analytical' }
        ],
        partnerOptions: [
          { text: "Tell you the exact thing", value: 'direct' },
          { text: "Say 'oh, anything!' and hope you caught the hints", value: 'indirect' },
          { text: "Ask for a bit of time to actually think about it", value: 'reflective' },
          { text: "Send a ranked list, possibly with links", value: 'analytical' }
        ]
      }
    ]
  },
  {
    category: 'mbti',
    variants: [
      {
        solo: { question: "In social situations, you tend to...", hint: "Think about how you get your energy" },
        partner: { question: "In social situations, your partner tends to...", hint: "Think about how they get their energy" },
        soloOptions: [
          { text: "Get more energized as the event goes on", value: 'extravert' },
          { text: "Enjoy it but feel drained by the end", value: 'introvert' }
        ],
        partnerOptions: [
          { text: "Light up and get more energized as the night goes on", value: 'extravert' },
          { text: "Enjoy it but need quiet time to recover after", value: 'introvert' }
        ]
      },
      {
        solo: { question: "Your ideal weekend has...", hint: "The honest default, not the Instagram version" },
        partner: { question: "Your partner's ideal weekend has...", hint: "Their honest default, not the Instagram version" },
        soloOptions: [
          { text: "Plans with people — the more spontaneous the better", value: 'extravert' },
          { text: "Big stretches of gloriously unscheduled alone time", value: 'introvert' }
        ],
        partnerOptions: [
          { text: "Plans with people — the more spontaneous the better", value: 'extravert' },
          { text: "Big stretches of gloriously unscheduled alone time", value: 'introvert' }
        ]
      },
      {
        solo: { question: "After three social events in one week, you feel...", hint: "Week four of the social calendar" },
        partner: { question: "After three social events in one week, your partner feels...", hint: "Week four of their social calendar" },
        soloOptions: [
          { text: "Warmed up — who's hosting the fourth?", value: 'extravert' },
          { text: "Completely spent — the calendar is now closed", value: 'introvert' }
        ],
        partnerOptions: [
          { text: "Warmed up — who's hosting the fourth?", value: 'extravert' },
          { text: "Completely spent — their calendar is now closed", value: 'introvert' }
        ]
      }
    ]
  }
];

// Builds a 5-question round: one scenario variant per category, rotated by
// rounds-played + account salt so back-to-back rounds differ, and two fresh
// accounts with identical profiles don't open on the same scenarios.
function buildRound(solo, gameData) {
  const roundsPlayed = Math.floor((gameData?.trivia?.total || 0) / TRIVIA_BANK.length);
  return TRIVIA_BANK.map((cat, i) => {
    const variant = cat.variants[(roundsPlayed + accountSalt() + i) % cat.variants.length];
    const phrasing = solo ? variant.solo : variant.partner;
    return {
      question: phrasing.question,
      hint: phrasing.hint,
      category: cat.category,
      options: solo ? variant.soloOptions : variant.partnerOptions
    };
  });
}

// Tiered end-of-round messages — variant pools instead of one fixed string,
// with an optional joke kicker on top (humor-level gated in composer).
const RESULT_POOLS = {
  solo: {
    perfect: [
      "Perfect score. You know yourself scarily well — the call is coming from inside the house.",
      "Flawless. Your self-awareness could get a job as a mirror.",
      "5/5. Either you know yourself completely or you've made peace with the chaos. Both count.",
    ],
    high: [
      "Solid self-knowledge, with a couple of plot twists left to enjoy.",
      "Mostly right about yourself — the misses are where the interesting stuff lives.",
      "Good instincts. The ones you missed? Homework, but the fun kind.",
    ],
    low: [
      "Some surprises in there — turns out you're more mysterious than advertised.",
      "You just got out-trivia'd by your own personality. Iconic, honestly.",
      "Good news: you contain multitudes. Other news: the multitudes surprised you.",
    ],
  },
  partner: {
    perfect: [
      "Perfect. You know them better than their search history does.",
      "5/5 — certified fluent in your partner.",
      "Flawless read. They should be slightly concerned and very flattered.",
    ],
    high: [
      "You know them well — the misses are conversation starters, not verdicts.",
      "Strong showing. A couple of gaps worth poking at over dinner.",
      "Good instincts about them. The wrong answers are the fun follow-up questions.",
    ],
    low: [
      "Plenty left to learn — which is honestly the best possible news for date night.",
      "They've still got mysteries. Collecting them is the whole game.",
      "A rough round, a great excuse to ask better questions.",
    ],
  },
};

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
let roundQuestions = [];

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function init() {
  triviaIndex = 0;
  triviaScore = 0;
  roundQuestions = buildRound(isSolo(), window.AppState.gameData);
  renderQuestion();
}

function renderQuestion() {
  const container = document.getElementById('trivia-question-container');
  const scoreEl = document.getElementById('trivia-score');
  if (!container) return;

  const solo = isSolo();
  const questions = roundQuestions;

  if (triviaIndex >= questions.length) {
    const accuracy = Math.round((triviaScore / questions.length) * 100);
    const tier = accuracy === 100 ? 'perfect' : accuracy >= 60 ? 'high' : 'low';
    const pool = RESULT_POOLS[solo ? 'solo' : 'partner'][tier];
    const total = window.AppState.gameData?.trivia?.total || 0;
    let completeMsg = pickFrom(pool, total, accountSalt(), 'trivia-result');
    const kicker = kickerFor('general', total, accuracy, 'trivia-result');
    if (kicker) completeMsg += ` ${kicker}`;
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

  // Award pet growth on round completion
  const isLastQuestion = (triviaIndex + 1) >= roundQuestions.length;
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
