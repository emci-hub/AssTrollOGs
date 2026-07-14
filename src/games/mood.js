/**
 * Daily Mood Check — one-tap mood tracker.
 * Pick how you feel today. Gets a personalized one-line response.
 * Can only check in once per day. Awards pet growth on first check-in.
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';

const MOODS = [
  { id: 'glowing',  label: 'Glowing',   icon: '☀️', color: '#f5c842' },
  { id: 'curious',  label: 'Curious',   icon: '🔍', color: '#5eabd4' },
  { id: 'chill',    label: 'Chill',     icon: '🌊', color: '#6abe8a' },
  { id: 'tense',    label: 'Tense',     icon: '⚡', color: '#f0a055' },
  { id: 'low',      label: 'Low',       icon: '🌧', color: '#8899aa' },
  { id: 'fired',    label: 'Fired Up',  icon: '🔥', color: '#e85555' }
];

const RESPONSES = {
  secure: {
    glowing: "That steady glow is your natural state. Stay in it.",
    curious: "Your curiosity always leads somewhere interesting. Follow it.",
    chill: "That calm is a superpower. Hold it gently today.",
    tense: "Notice the tension without fighting it — it passes.",
    low: "Low days happen to grounded people too. Rest is valid.",
    fired: "Channel that fire into something real today."
  },
  anxious: {
    glowing: "You earned this brightness — let yourself feel it.",
    curious: "That wondering mind is one of your best qualities.",
    chill: "This calm is yours. Don't question it, just breathe.",
    tense: "Your nervous system is trying to protect you. Thank it, then relax.",
    low: "Being drained doesn't mean something's wrong. You're just human.",
    fired: "Big energy from a big heart. Point it somewhere that matters."
  },
  avoidant: {
    glowing: "Quiet joy still counts. Let it.",
    curious: "Curiosity looks good on someone who takes things slowly.",
    chill: "This is your natural rhythm. Enjoy the stillness.",
    tense: "You don't have to name the tension. Just notice it.",
    low: "Solo recharge incoming. That's not avoidance — that's wisdom.",
    fired: "Rare but real. This energy is worth protecting."
  },
  fearful: {
    glowing: "Something good is here. Stay with it.",
    curious: "Wondering is the first brave thing. Keep going.",
    chill: "Safety found you today. Let yourself rest in it.",
    tense: "The alarm isn't always real. Check before reacting.",
    low: "Low doesn't mean broken. It means you're feeling.",
    fired: "That spark is yours — no one can take it."
  }
};

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function renderMoodGrid(checkedToday, currentMood) {
  if (checkedToday) {
    const mood = MOODS.find(m => m.id === currentMood) || MOODS[0];
    const attach = window.AppState.userProfile?.attachmentStyle || 'secure';
    const response = RESPONSES[attach]?.[currentMood] || '';
    return `
      <div style="text-align:center; padding:20px 0;">
        <div style="font-size:2.2rem; margin-bottom:8px;">${mood.icon}</div>
        <div style="font-size:1rem; font-weight:700; color:${mood.color}; margin-bottom:12px;">${mood.label}</div>
        <div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.55; font-style:italic; max-width:260px; margin:0 auto;">"${response}"</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:16px;">Come back tomorrow for your next check-in.</div>
      </div>
    `;
  }

  return `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:4px;">
      ${MOODS.map(m => `
        <button class="mood-btn" onclick="selectMood('${m.id}')" style="border-color:${m.color}20;">
          <span style="font-size:1.6rem; display:block; margin-bottom:4px;">${m.icon}</span>
          <span style="font-size:0.7rem; font-weight:700; color:var(--text-secondary);">${m.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderDrawer() {
  const gd = window.AppState.gameData;
  const today = getTodayKey();
  const checkedToday = gd?.mood?.lastChecked === today;
  const currentMood = gd?.mood?.today || null;
  const streak = gd?.mood?.streak || 0;

  return `
    <div class="subtitle">Games</div>
    <h2 style="margin-bottom:4px;">Daily Mood Check</h2>
    <p class="card-body" style="margin-bottom:16px; color:var(--text-muted);">How are you feeling today? One tap. Completely honest.</p>
    ${streak > 1 ? `<div style="font-size:0.7rem; color:var(--accent-primary); background:rgba(129,140,248,0.1); border-radius:20px; padding:3px 10px; display:inline-block; margin-bottom:14px;">${streak}-day check-in streak</div>` : ''}
    <div id="mood-content">
      ${renderMoodGrid(checkedToday, currentMood)}
    </div>
  `;
}

export const moodGame = {
  id: 'mood',
  title: 'Mood Check',
  renderDrawer,
  init: () => {},
  bindWindow: () => {
    window.selectMood = (moodId) => {
      const gd = window.AppState.gameData;
      const today = getTodayKey();
      if (!gd.mood) gd.mood = { today: null, lastChecked: null, streak: 0, history: [] };

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (gd.mood.lastChecked === yesterday) {
        gd.mood.streak = (gd.mood.streak || 0) + 1;
      } else if (gd.mood.lastChecked !== today) {
        gd.mood.streak = 1;
      }

      gd.mood.today = moodId;
      gd.mood.lastChecked = today;
      gd.mood.history = [...(gd.mood.history || []).slice(-29), { date: today, mood: moodId }];

      saveGameData();
      if (canAwardPetGrowthToday('mood')) {
        recordPetGrowthToday('mood');
        awardPetGrowth(1);
      }

      // Animate the update
      const attach = window.AppState.userProfile?.attachmentStyle || 'secure';
      const mood = MOODS.find(m => m.id === moodId);
      const response = RESPONSES[attach]?.[moodId] || '';
      const content = document.getElementById('mood-content');
      if (content) {
        content.style.opacity = '0';
        content.style.transition = 'opacity 0.15s';
        setTimeout(() => {
          content.innerHTML = `
            <div style="text-align:center; padding:20px 0;">
              <div style="font-size:2.2rem; margin-bottom:8px;">${mood.icon}</div>
              <div style="font-size:1rem; font-weight:700; color:${mood.color}; margin-bottom:12px;">${mood.label}</div>
              <div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.55; font-style:italic; max-width:260px; margin:0 auto;">"${response}"</div>
              <div style="font-size:0.65rem; color:var(--text-muted); margin-top:16px;">Your companion grew a little today.</div>
            </div>
          `;
          content.style.opacity = '1';
        }, 150);
      }
    };
  }
};
