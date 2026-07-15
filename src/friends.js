/**
 * Friends feature.
 *
 * A friend is a lightweight, locally-entered snapshot of someone else's
 * profile (same shape as partnerProfile) — not a live synced account. You
 * can add any number of friends. Each friendship gets its own evolving
 * companion pet (reusing the exact Chimera-rendering system built for the
 * couple pet — no new visual code needed) that grows when you actually
 * visit that friend's profile, not on a timer, since there's no shared
 * gameplay with a friend the way there is with a partner.
 *
 * This is your own private read on someone else — never shared with them,
 * not diagnostic, just for fun.
 */

import { saveGameData, todayLocal, canAwardPetGrowthToday, recordPetGrowthToday } from './state.js';
import {
  derivePetVisuals, deriveCoupleVisuals, buildPetSvg, getStage,
  ascensionTier, makeCouplePetData, bumpFriendPetGrowth, miniAvatarSvg
} from './pet.js';
import {
  FRIEND_ATTACHMENT_PAIRINGS, FRIEND_CONFLICT_PAIRINGS, friendPairKey, getFriendshipTitlePool,
  FRIEND_ICEBREAKERS, FRIEND_JOKES, FRIEND_MESSAGES, FRIEND_OF_DAY_TIPS
} from './content-bank.js';
import { PSYCH_QUESTIONS, MBTI_TYPES } from './questions.js';

// ─── Hashing (module-local DJB2, same pattern used in pet.js/insights.js —
// deliberately separate rather than shared, matching this codebase's own
// precedent for per-module seeding) ─────────────────────────────────────────

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fillFriendTemplate(str, friendName) {
  return (str || '').replace(/\{friend\}/g, friendName || 'them');
}

// ─── Shuffle-bag refresh (same technique as pet.js's pickAffirmation —
// never immediately repeats, in-memory only, nothing persisted) ────────────

const _shuffleBags = {};
function shuffledIndices(len) {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function drawFromBag(bagId, poolLength) {
  if (poolLength <= 0) return 0;
  let bag = _shuffleBags[bagId];
  if (!bag || bag.pos >= bag.order.length) {
    const order = shuffledIndices(poolLength);
    if (bag && order.length > 1 && order[0] === bag.order[bag.order.length - 1]) {
      [order[0], order[1]] = [order[1], order[0]];
    }
    bag = { order, pos: 0 };
    _shuffleBags[bagId] = bag;
  }
  const idx = bag.order[bag.pos];
  bag.pos++;
  return idx;
}

// Memoized by key so incidental re-renders (opening the same profile twice)
// don't silently reroll the displayed text — only an explicit refresh does.
const _lastPicks = {};
function memoizedPick(key, forceRefresh, pickFn) {
  if (!forceRefresh && _lastPicks[key] !== undefined) return _lastPicks[key];
  const val = pickFn();
  _lastPicks[key] = val;
  return val;
}

// ─── Vibe score ─────────────────────────────────────────────────────────────
// Deterministic (no date/randomness involved) so the same pair always shows
// the same score — a scannable number for the list, not a serious metric.

export function computeFriendVibeScore(userProfile, friendProfile) {
  const seed = hashString([
    userProfile?.name, userProfile?.mbti, userProfile?.attachmentStyle,
    friendProfile?.name, friendProfile?.mbti, friendProfile?.attachmentStyle
  ].map(v => (v || '').toString().toLowerCase()).join('|'));
  return 40 + (seed % 61); // 40-100 — always reads as a decent vibe, never a harsh low score
}

// Returns a full tier object (not just a label) so the score can pop
// visually — different tiers get different colors/emoji, which reads as
// more varied than the raw number alone even when two scores are close.
export function vibeScoreTag(score) {
  if (score >= 90) return { label: 'Rare Match', emoji: '🔥', color: 'var(--warning-color)' };
  if (score >= 75) return { label: 'Strong Bond', emoji: '💫', color: 'var(--accent-primary)' };
  if (score >= 60) return { label: 'Good Vibe', emoji: '✨', color: 'var(--success-color)' };
  return { label: 'Still Discovering', emoji: '🌱', color: 'var(--text-muted)' };
}

// ─── Friendship title (refreshable) ────────────────────────────────────────

export function pickFriendshipTitle(userAttach, friendAttach, friendId, forceRefresh = false) {
  return memoizedPick(`title_${friendId}`, forceRefresh, () => {
    const pool = getFriendshipTitlePool(userAttach, friendAttach);
    const idx = drawFromBag(`title_${friendId}`, pool.length);
    return pool[idx];
  });
}

// ─── Pairing insight (attachment + conflict, platonic tone) ────────────────

export function getFriendPairingInsight(userProfile, friendProfile) {
  const attachKey = `${userProfile?.attachmentStyle || 'secure'}_${friendProfile?.attachmentStyle || 'secure'}`;
  const attachLine = FRIEND_ATTACHMENT_PAIRINGS[attachKey];
  const conflictLine = FRIEND_CONFLICT_PAIRINGS[friendPairKey(userProfile?.conflictStyle, friendProfile?.conflictStyle)];
  return {
    attachment: fillFriendTemplate(attachLine, friendProfile?.name),
    conflict: fillFriendTemplate(conflictLine, friendProfile?.name)
  };
}

// ─── Lite growth blurb ──────────────────────────────────────────────────────
// Static-trait-only (no gameplay signals — there's no shared game history
// with a friend the way there is with a partner's Growth Compass).

const FRIEND_STRENGTH_BY_ATTACH = {
  secure:   { title: 'Steady presence', body: 'You bring a calm, reliable energy to this friendship — the kind people quietly build routines around.' },
  anxious:  { title: 'You notice things', body: "You pick up on shifts in this friendship that most people would miss entirely. That's real attentiveness." },
  avoidant: { title: 'Easy company', body: "You don't smother this friendship, which makes it easy for {friend} to just be around you without pressure." },
  fearful:  { title: 'Careful investment', body: "You don't let people in easily, which means the friendships you do keep mean something real." }
};

export function getFriendGrowthBlurb(userProfile, friendProfile) {
  if (userProfile?.loveLanguage && userProfile.loveLanguage === friendProfile?.loveLanguage) {
    return {
      title: 'Same love language',
      body: fillFriendTemplate("You and {friend} feel cared for the same way — the effort you'd naturally put in is exactly what lands for them.", friendProfile?.name)
    };
  }
  const entry = FRIEND_STRENGTH_BY_ATTACH[userProfile?.attachmentStyle] || FRIEND_STRENGTH_BY_ATTACH.secure;
  return { title: entry.title, body: fillFriendTemplate(entry.body, friendProfile?.name) };
}

// ─── Icebreaker / joke / send-this message ─────────────────────────────────

export function pickIcebreaker(friendProfile, friendId, forceRefresh = false) {
  return memoizedPick(`icebreaker_${friendId}`, forceRefresh, () => {
    const pool = FRIEND_ICEBREAKERS[friendProfile?.expressionStyle] || FRIEND_ICEBREAKERS.direct;
    const idx = drawFromBag(`icebreaker_${friendId}`, pool.length);
    return fillFriendTemplate(pool[idx], friendProfile?.name);
  });
}

export function pickJoke(friendId, forceRefresh = false) {
  return memoizedPick(`joke_${friendId}`, forceRefresh, () => {
    const idx = drawFromBag(`joke_${friendId}`, FRIEND_JOKES.length);
    return FRIEND_JOKES[idx];
  });
}

export function pickSendMessage(friendProfile, friendId, forceRefresh = false) {
  return memoizedPick(`message_${friendId}`, forceRefresh, () => {
    const pool = FRIEND_MESSAGES[friendProfile?.loveLanguage] || FRIEND_MESSAGES.words;
    const idx = drawFromBag(`message_${friendId}`, pool.length);
    return fillFriendTemplate(pool[idx], friendProfile?.name);
  });
}

// ─── Friend of the Day ──────────────────────────────────────────────────────
// Deterministic daily pick (hash of today's local date), same pattern as
// pet.js's computeLuckyNumber — changes once a day, nothing persisted.

export function getFriendOfTheDay(friends) {
  if (!friends || friends.length === 0) return null;
  const seed = hashString(todayLocal());
  const friend = friends[seed % friends.length];
  const tip = fillFriendTemplate(FRIEND_OF_DAY_TIPS[friend.profile?.loveLanguage] || FRIEND_OF_DAY_TIPS.words, friend.name);
  return { friend, tip };
}

// ─── Cross-friendship pattern insight ──────────────────────────────────────

export function computeFriendPatternInsight(friends) {
  if (!friends || friends.length < 3) return null;
  const counts = {};
  friends.forEach(f => {
    const a = f.profile?.attachmentStyle;
    if (a) counts[a] = (counts[a] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [topAttach, topCount] = sorted[0];
  if (topCount / friends.length < 0.5) return null;

  const PATTERN_LINES = {
    secure:   'you tend to gravitate toward steady, low-drama people — a good sign for your own stability.',
    anxious:  'you clearly value people who feel things out loud and stay in close touch.',
    avoidant: 'you seem to click with people who value their own space — comfortable-distance friendships suit you.',
    fearful:  "you've built a circle of people who take closeness carefully — maybe that's exactly the pace you need too."
  };
  return `${topCount} of your ${friends.length} friends are ${topAttach} — ${PATTERN_LINES[topAttach] || 'a real pattern worth noticing.'}`;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

function genId() {
  return 'f_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function addFriend(name, profile) {
  const gd = window.AppState.gameData;
  if (!Array.isArray(gd.friends)) gd.friends = [];
  const id = genId();
  gd.friends.push({ id, name, profile, addedAt: new Date().toISOString(), streak: { current: 0, lastVisit: null, longest: 0 } });
  saveGameData();
  return id;
}

export function updateFriend(id, profile, name) {
  const gd = window.AppState.gameData;
  const f = (gd.friends || []).find(fr => fr.id === id);
  if (!f) return;
  f.profile = profile;
  if (name) f.name = name;
  saveGameData();
}

export function removeFriend(id) {
  const gd = window.AppState.gameData;
  gd.friends = (gd.friends || []).filter(f => f.id !== id);
  if (gd.pet?.friends) delete gd.pet.friends[id];
  saveGameData();
}

/** Records a visit: updates the per-friendship streak and grows that
 * friendship's companion pet, capped once per local day (same
 * canAwardPetGrowthToday/recordPetGrowthToday pattern every other growth
 * source in this app uses). */
export function visitFriend(id) {
  const gd = window.AppState.gameData;
  const f = (gd.friends || []).find(fr => fr.id === id);
  if (!f) return;
  const today = todayLocal();
  if (!f.streak) f.streak = { current: 0, lastVisit: null, longest: 0 };
  if (f.streak.lastVisit !== today) {
    const yesterday = todayLocal(new Date(Date.now() - 86400000));
    f.streak.current = f.streak.lastVisit === yesterday ? f.streak.current + 1 : 1;
    f.streak.lastVisit = today;
    if (f.streak.current > f.streak.longest) f.streak.longest = f.streak.current;
  }
  if (!gd.pet) gd.pet = { user: null, partner: null, couple: null, friends: {} };
  if (!gd.pet.friends) gd.pet.friends = {};
  if (!gd.pet.friends[id]) gd.pet.friends[id] = makeCouplePetData();
  if (canAwardPetGrowthToday(`friend_${id}`)) {
    recordPetGrowthToday(`friend_${id}`);
    bumpFriendPetGrowth(gd.pet.friends[id], 1, gd);
  }
  saveGameData();
}

// ─── Rendering: dashboard section ───────────────────────────────────────────

export function renderFriendsSection() {
  const container = document.getElementById('friends-section');
  if (!container) return;
  const gd = window.AppState.gameData;
  const friends = gd.friends || [];

  if (friends.length === 0) {
    container.innerHTML = `
      <div class="card interactive-card" onclick="openFriendsList()">
        <div class="card-title">Add your first friend</div>
        <div class="card-body">Log a friend's traits and see what your friendship looks like — plus a companion pet that grows every time you check in on them.</div>
      </div>
    `;
    return;
  }

  const fotd = getFriendOfTheDay(friends);
  const previewAvatars = friends.slice(-6).reverse().map(f => `
    <div class="friend-avatar-chip" onclick="openFriendProfile('${f.id}')" title="${f.name}" role="button" tabindex="0">
      ${miniAvatarSvg(f.profile, 40)}
      <div class="friend-avatar-chip-name">${f.name}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <div class="friend-avatar-row">${previewAvatars}</div>
      ${fotd ? `
        <div class="friend-of-day-row" onclick="openFriendProfile('${fotd.friend.id}')" role="button" tabindex="0" style="border-left:3px solid ${derivePetVisuals(fotd.friend.profile).colors.body}; padding-left:10px;">
          <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:var(--accent-primary); margin-bottom:3px;">✦ Friend of the Day</div>
          <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.4;"><strong style="color:var(--text-primary);">${fotd.friend.name}</strong> — ${fotd.tip}</div>
        </div>
      ` : ''}
      <button class="btn btn-outline" style="width:100%; margin-top:10px; font-size:0.75rem;" onclick="openFriendsList()">See All Friends (${friends.length})</button>
    </div>
  `;
}

// ─── Rendering: friends-list drawer ─────────────────────────────────────────

function renderFriendsListDrawer() {
  const gd = window.AppState.gameData;
  const friends = gd.friends || [];
  const userProfile = window.AppState.userProfile || {};
  const patternInsight = computeFriendPatternInsight(friends);

  const rows = friends.map(f => {
    const score = computeFriendVibeScore(userProfile, f.profile);
    const tier = vibeScoreTag(score);
    const petData = gd.pet?.friends?.[f.id];
    const stageLabel = petData ? getStage(petData.totalDays).label : 'New friendship';
    const accentColor = derivePetVisuals(f.profile).colors.body;
    return `
      <div class="friend-list-row" onclick="openFriendProfile('${f.id}')" role="button" tabindex="0" style="border-left-color:${accentColor};">
        ${miniAvatarSvg(f.profile, 44)}
        <div style="flex:1; min-width:0;">
          <div class="friend-list-row-name">${f.name}</div>
          <div class="friend-list-row-meta">${stageLabel} · ${tier.emoji} ${tier.label}</div>
        </div>
        <div>
          <div class="friend-vibe-score" style="color:${tier.color};">${score}%</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="subtitle">Friends</div>
    <h2 style="margin-bottom:4px;">Your Circle</h2>
    <p class="card-body" style="margin-bottom:14px; color:var(--text-muted);">${friends.length === 0 ? "Add someone to see what your friendship looks like." : `${friends.length} friend${friends.length === 1 ? '' : 's'} logged.`}</p>
    ${patternInsight ? `
    <div class="card" style="margin-bottom:14px; border-color:rgba(129,140,248,0.25);">
      <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--accent-primary); margin-bottom:4px;">Across your friends</div>
      <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5;">${patternInsight}</div>
    </div>` : ''}
    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">${rows}</div>
    <button class="btn" onclick="startAddFriend()">+ Add a Friend</button>
  `;
}

// ─── Rendering: friend-profile drawer ───────────────────────────────────────

function renderFriendProfileDrawer(id) {
  const gd = window.AppState.gameData;
  const friend = (gd.friends || []).find(f => f.id === id);
  if (!friend) return '<div class="card-body">This friend could not be found.</div>';
  const userProfile = window.AppState.userProfile || {};

  if (!gd.pet) gd.pet = { user: null, partner: null, couple: null, friends: {} };
  if (!gd.pet.friends) gd.pet.friends = {};
  if (!gd.pet.friends[id]) gd.pet.friends[id] = makeCouplePetData();
  const petData = gd.pet.friends[id];

  const userVisuals = derivePetVisuals(userProfile);
  const friendVisuals = derivePetVisuals(friend.profile);
  const coupleVisuals = deriveCoupleVisuals(userVisuals, friendVisuals);
  const stageInfo = getStage(petData.totalDays);
  const tier = ascensionTier(petData.totalDays);
  const svg = buildPetSvg(coupleVisuals, petData.stage, petData.mood, stageInfo.size, gd.milestones || [], true, false, tier);

  const title = pickFriendshipTitle(userProfile.attachmentStyle, friend.profile.attachmentStyle, id);
  const pairing = getFriendPairingInsight(userProfile, friend.profile);
  const growthBlurb = getFriendGrowthBlurb(userProfile, friend.profile);
  const icebreaker = pickIcebreaker(friend.profile, id);
  const joke = pickJoke(id);
  const message = pickSendMessage(friend.profile, id);
  const streak = friend.streak?.current || 0;

  return `
    <div class="subtitle">Friends</div>
    <button class="btn-icon" style="margin-bottom:12px;" onclick="openFriendsList()">← Back to list</button>
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:4px;">
      <h2 style="margin-bottom:0;" id="friendship-title-${id}">${title}</h2>
      <button class="btn-icon" onclick="refreshFriendshipTitle('${id}')" title="New title">↻</button>
    </div>
    <p class="card-body" style="margin-bottom:14px; color:var(--text-muted);">You &amp; ${friend.name}</p>
    <div style="display:flex; flex-direction:column; align-items:center; gap:8px; margin-bottom:16px;">
      <div class="pet-float-anim">${svg}</div>
      <div class="pet-stage-badge">${stageInfo.label}${tier > 0 ? ` · Ascended ${tier}` : ''} · Day ${petData.totalDays}</div>
      ${streak > 1 ? `<div style="font-size:0.65rem; color:var(--accent-primary); font-weight:700;">🔥 ${streak}-day check-in streak</div>` : ''}
    </div>

    <div class="card" style="margin-bottom:12px; border-color:rgba(129,140,248,0.3);">
      <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--accent-primary); margin-bottom:8px;">🤝 The Dynamic</div>
      <div style="font-size:0.68rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:2px;">How you connect</div>
      <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5; margin-bottom:10px;">${pairing.attachment}</div>
      <div style="font-size:0.68rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:2px;">When it gets bumpy</div>
      <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5;">${pairing.conflict}</div>
    </div>

    <div class="card" style="margin-bottom:12px; border-color:rgba(78,180,120,0.3);">
      <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--success-color); margin-bottom:6px;">🌱 ${growthBlurb.title}</div>
      <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5;">${growthBlurb.body}</div>
    </div>

    <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--warning-color); margin-bottom:8px;">🎉 Fun Zone</div>
    <div class="friend-fun-zone">
      <div class="friend-fun-row">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary);">💬 Icebreaker</div>
          <button class="btn-icon" onclick="refreshFriendIcebreaker('${id}')">↻</button>
        </div>
        <div id="icebreaker-${id}" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5;">${icebreaker}</div>
      </div>
      <div class="friend-fun-row">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary);">😄 Just for fun</div>
          <button class="btn-icon" onclick="refreshFriendJoke('${id}')">↻</button>
        </div>
        <div id="joke-${id}" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5; font-style:italic;">${joke}</div>
      </div>
      <div class="friend-fun-row">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary);">💌 Send this</div>
          <button class="btn-icon" onclick="refreshFriendMessage('${id}')">↻</button>
        </div>
        <div id="message-${id}" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5; margin-bottom:8px;">"${message}"</div>
        <button class="btn btn-outline" style="font-size:0.7rem; margin-top:0;" id="copy-message-btn-${id}" onclick="copyFriendMessage('${id}')">Copy</button>
      </div>
    </div>

    <div style="display:flex; gap:8px; margin-top:4px;">
      <button class="btn btn-outline" style="flex:1; font-size:0.72rem; margin-top:0;" onclick="startEditFriend('${id}')">Edit Answers</button>
      <button class="btn btn-outline" style="flex:1; font-size:0.72rem; margin-top:0; color:var(--danger-color); border-color:var(--danger-color);" onclick="confirmRemoveFriend('${id}')">Remove</button>
    </div>
  `;
}

// ─── Add / edit flow (standalone quiz reusing PSYCH_QUESTIONS) ─────────────
// Self-contained state machine — deliberately doesn't touch profile-
// builder.js's onboarding step machinery, since that's tied to the big
// wizard's own AppState.currentStep and would be fragile to reuse here.

let _addFriendState = null;

function renderAddFriendStep() {
  const drawerContent = document.getElementById('drawer-dynamic-content');
  if (!drawerContent) return;
  const st = _addFriendState;
  if (!st) return;

  if (st.step === -1) {
    drawerContent.innerHTML = `
      <div class="subtitle">Friends</div>
      <h2 style="margin-bottom:12px;">${st.mode === 'edit' ? 'Edit' : 'Add a'} Friend</h2>
      <p class="card-body" style="margin-bottom:16px; color:var(--text-muted);">This is your own read on them, just for fun — not diagnostic, and never shared with them.</p>
      <div class="input-group" style="margin-bottom:16px;">
        <label style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; display:block; margin-bottom:4px;">Their name</label>
        <input type="text" id="friend-name-input" class="input-field" value="${st.name || ''}" placeholder="Friend's name">
      </div>
      <button class="btn" onclick="advanceAddFriendName()">Next</button>
      <button class="btn btn-outline" style="margin-top:8px;" onclick="openFriendsList()">Cancel</button>
    `;
    return;
  }

  if (st.step >= PSYCH_QUESTIONS.length) {
    finishAddFriendFlow();
    return;
  }

  const q = PSYCH_QUESTIONS[st.step];
  let bodyHtml;
  if (q.type === 'mbti') {
    bodyHtml = `
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:6px;">
        ${MBTI_TYPES.map(t => `<button class="choice-btn" style="padding:10px 4px; font-size:0.72rem; text-align:center; ${st.answers.mbti === t ? 'border-color:var(--accent-primary); color:var(--accent-primary);' : ''}" onclick="selectAddFriendAnswer('mbti','${t}')">${t}</button>`).join('')}
      </div>
    `;
  } else {
    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${q.choices.map(c => `
          <button class="choice-btn" style="text-align:left; ${st.answers[q.key] === c.value ? 'border-color:var(--accent-primary); color:var(--accent-primary);' : ''}" onclick="selectAddFriendAnswer('${q.key}','${c.value}')">
            <strong>${c.label}</strong>
            <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px; font-weight:400;">${c.desc}</div>
          </button>
        `).join('')}
      </div>
    `;
  }

  drawerContent.innerHTML = `
    <div class="subtitle">Friends · ${st.name}</div>
    <h2 style="margin-bottom:4px;">${q.title}</h2>
    <p class="card-body" style="margin-bottom:14px; color:var(--text-muted);">${q.question}</p>
    ${bodyHtml}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
      <button class="btn-icon" onclick="goBackAddFriendStep()">← Back</button>
      <span style="font-size:0.65rem; color:var(--text-muted);">${st.step + 1} of ${PSYCH_QUESTIONS.length}</span>
    </div>
  `;
}

function finishAddFriendFlow() {
  const st = _addFriendState;
  if (!st) return;
  const profile = {
    mbti: st.answers.mbti,
    attachmentStyle: st.answers.attachment,
    conflictStyle: st.answers.conflict,
    loveLanguage: st.answers.loveLanguage,
    expressionStyle: st.answers.expression
  };
  let id;
  if (st.mode === 'edit') {
    updateFriend(st.editId, profile, st.name);
    id = st.editId;
  } else {
    id = addFriend(st.name, profile);
  }
  _addFriendState = null;
  window.openFriendProfile(id);
}

function startAddFriendFlow(editId) {
  const gd = window.AppState.gameData;
  if (editId) {
    const f = (gd.friends || []).find(fr => fr.id === editId);
    if (!f) return;
    _addFriendState = {
      mode: 'edit', editId, name: f.name, step: -1,
      answers: {
        mbti: f.profile?.mbti,
        attachment: f.profile?.attachmentStyle,
        conflict: f.profile?.conflictStyle,
        loveLanguage: f.profile?.loveLanguage,
        expression: f.profile?.expressionStyle
      }
    };
  } else {
    _addFriendState = { mode: 'add', name: '', step: -1, answers: {} };
  }
  renderAddFriendStep();
}

// ─── Window bindings ────────────────────────────────────────────────────────
// Assigned at module scope (not behind a bindWindow() call) so importing
// this module once from app.js is enough — matches drawers.js's convention.

function openDrawerShell(html) {
  const drawer = document.getElementById('detail-drawer');
  const drawerContent = document.getElementById('drawer-dynamic-content');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer || !drawerContent) return;
  drawerContent.innerHTML = html;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}

window.openFriendsList = function() {
  openDrawerShell(renderFriendsListDrawer());
};

window.openFriendProfile = function(id) {
  visitFriend(id);
  openDrawerShell(renderFriendProfileDrawer(id));
};

window.startAddFriend = function() { startAddFriendFlow(null); };
window.startEditFriend = function(id) { startAddFriendFlow(id); };

window.advanceAddFriendName = function() {
  const input = document.getElementById('friend-name-input');
  const name = input?.value?.trim();
  if (!name) { input?.focus(); return; }
  _addFriendState.name = name;
  _addFriendState.step = 0;
  renderAddFriendStep();
};

window.selectAddFriendAnswer = function(key, value) {
  _addFriendState.answers[key] = value;
  _addFriendState.step += 1;
  renderAddFriendStep();
};

window.goBackAddFriendStep = function() {
  _addFriendState.step = _addFriendState.step <= 0 ? -1 : _addFriendState.step - 1;
  renderAddFriendStep();
};

window.confirmRemoveFriend = function(id) {
  if (!confirm('Remove this friend? This cannot be undone.')) return;
  removeFriend(id);
  window.openFriendsList();
};

window.refreshFriendshipTitle = function(id) {
  const gd = window.AppState.gameData;
  const friend = (gd.friends || []).find(f => f.id === id);
  if (!friend) return;
  const userProfile = window.AppState.userProfile || {};
  const title = pickFriendshipTitle(userProfile.attachmentStyle, friend.profile.attachmentStyle, id, true);
  const el = document.getElementById(`friendship-title-${id}`);
  if (el) el.textContent = title;
};

window.refreshFriendIcebreaker = function(id) {
  const gd = window.AppState.gameData;
  const friend = (gd.friends || []).find(f => f.id === id);
  if (!friend) return;
  const el = document.getElementById(`icebreaker-${id}`);
  if (el) el.textContent = pickIcebreaker(friend.profile, id, true);
};

window.refreshFriendJoke = function(id) {
  const el = document.getElementById(`joke-${id}`);
  if (el) el.textContent = pickJoke(id, true);
};

window.refreshFriendMessage = function(id) {
  const gd = window.AppState.gameData;
  const friend = (gd.friends || []).find(f => f.id === id);
  if (!friend) return;
  const el = document.getElementById(`message-${id}`);
  if (el) el.textContent = `"${pickSendMessage(friend.profile, id, true)}"`;
};

window.copyFriendMessage = function(id) {
  const el = document.getElementById(`message-${id}`);
  const text = el?.textContent?.replace(/^"|"$/g, '');
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(`copy-message-btn-${id}`);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  }).catch(() => {});
};
