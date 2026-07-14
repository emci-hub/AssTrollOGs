/**
 * Virtual Pet module.
 *
 * Solo:    one pet, grows 2x faster (each daily visit = 2 growth points).
 * Partner: user pet + partner pet (each 1x) + merged couple pet.
 *
 * Names are generated from the person's actual name + their attachment style
 * so every pet is unique to that specific user.
 */

import { saveGameData } from './state.js';

// ─── Name generation ──────────────────────────────────────────────────────────

const NAME_SUFFIXES = {
  secure:   ['lo', 'la', 'ki', 'sol', 'nu', 'ko', 'eli'],
  anxious:  ['chi', 'pi', 'bi', 'moo', 'bo', 'yuki', 'chan'],
  avoidant: ['ash', 'fen', 'el', 'en', 'is', 're', 'stone'],
  fearful:  ['zig', 'ix', 'dusk', 'echo', 'nx', 'skye', 'zz']
};

function generatePetName(profile) {
  const name = ((profile?.name) || 'Friend').trim();
  const attach = profile?.attachmentStyle || 'secure';
  const suffixes = NAME_SUFFIXES[attach] || NAME_SUFFIXES.secure;
  const seed = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const prefix = name.slice(0, Math.min(3, name.length));
  const suffix = suffixes[seed % suffixes.length];
  const raw = prefix + suffix;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function generateMergedName(userName, partnerName) {
  const u = (userName || 'Al').trim();
  const p = (partnerName || 'Pa').trim();
  // First 3 chars of user's real name + first 2 of partner's real name
  const uPart = u.slice(0, 3);
  const pPart = p.slice(0, 2);
  const raw = uPart + pPart;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const PET_COLORS = {
  secure:   { body: '#5eabd4', eye: '#1a6b9a', cheek: '#a8d8f0' },
  anxious:  { body: '#c084e8', eye: '#7c3aad', cheek: '#e8c4f8' },
  avoidant: { body: '#6abe8a', eye: '#2d7a4f', cheek: '#b4e4c4' },
  fearful:  { body: '#f0a055', eye: '#b85c10', cheek: '#ffd4a8' }
};

// ─── Stages ───────────────────────────────────────────────────────────────────
// Solo pets grow at 2 pts/day so they hit these thresholds faster.
// Partner pets grow at 1 pt/day.

const STAGES = [
  { stage: 1, minDays: 0,  label: 'Newborn',   size: 56 },
  { stage: 2, minDays: 4,  label: 'Baby',       size: 64 },
  { stage: 3, minDays: 10, label: 'Growing',    size: 72 },
  { stage: 4, minDays: 20, label: 'Adult',      size: 80 },
  { stage: 5, minDays: 40, label: 'Legendary',  size: 88 }
];

function getStage(totalDays) {
  let s = STAGES[0];
  for (const st of STAGES) { if (totalDays >= st.minDays) s = st; }
  return s;
}

// ─── Affirmations + Warnings ──────────────────────────────────────────────────

const AFFIRMATIONS = {
  secure: [
    "You bring steadiness to every room you walk into. That matters.",
    "Your calm presence is more powerful than you realize.",
    "You know how to hold space without losing yourself. That's rare.",
    "Balanced energy is a superpower. You have it naturally.",
    "People feel safe around you. Lean into that today.",
    "Your emotional intelligence runs deeper than you give yourself credit for.",
    "Being consistent is quietly heroic. You show up and that's everything."
  ],
  anxious: [
    "Your sensitivity is not a flaw — it's how you experience life more fully.",
    "The care you pour into others deserves to come back to you today.",
    "You feel things deeply because you love deeply. That's a beautiful thing.",
    "Your heart is one of your best features. Let it lead today.",
    "You notice things others miss. That awareness is your strength.",
    "You are more resilient than the worry tells you.",
    "Feeling deeply means caring fully. The world needs more of that."
  ],
  avoidant: [
    "Your independence is built on quiet strength. Own it.",
    "You recharge solo and emerge sharper. That's wisdom, not withdrawal.",
    "Not everyone needs to be let in. Your discernment is healthy.",
    "Your boundaries are clear and that clarity is something to be proud of.",
    "Solitude isn't loneliness when you use it well. You do.",
    "There is real power in needing less than others expect.",
    "Your self-sufficiency is a foundation, not a wall."
  ],
  fearful: [
    "Every step forward counts, even the small hesitant ones.",
    "You are allowed to want closeness. It doesn't have to be all or nothing.",
    "Choosing to show up today was already brave.",
    "The fact that you feel both things at once makes you deeply human.",
    "You've survived every difficult moment so far. Today is no different.",
    "Trust can be built slowly, on your terms. That's allowed.",
    "Your self-awareness is a form of strength most people never develop."
  ]
};

const WARNINGS = {
  secure: [
    "Watch out: comfort can become complacency. Check in actively today.",
    "Heads up: sometimes stability needs a little shaking up to stay fresh.",
    "Notice if you've been assuming things are fine without actually asking.",
    "Your calm might read as indifference to someone who needs reassurance.",
    "Balance is great — make sure you're not just avoiding the hard stuff.",
    "Check in: are you giving others the security you give yourself?"
  ],
  anxious: [
    "Watch out: your brain might be writing stories that aren't true today.",
    "Pause before sending that message. Give it 10 minutes first.",
    "Notice if you're seeking reassurance more than you need to right now.",
    "That quiet feeling might just be quiet — not a sign something's wrong.",
    "Your worry is protective, but it can block the good stuff. Let it rest.",
    "Check in: are you deciding from fear or from what you actually want?"
  ],
  avoidant: [
    "Watch out: distance can feel like protection but sometimes it's just distance.",
    "Someone might need you today more than you realize. Check in.",
    "Notice if 'I need space' is becoming a habit instead of a need.",
    "Not every emotional moment requires a retreat. You can stay.",
    "Disconnecting to recharge is healthy. Disconnecting to avoid is different.",
    "Check in: is there a conversation you've been postponing that matters?"
  ],
  fearful: [
    "Watch out for pushing someone away just as they're getting close.",
    "The urge to self-sabotage is loudest just before things get good.",
    "Notice if you're testing people in ways they don't know about.",
    "Not everyone will leave. Some are staying — let them.",
    "Check in: is fear of being hurt stopping you from being happy right now?",
    "Your defenses are smart. But sometimes the threat isn't real."
  ]
};

const COUPLE_MESSAGES = {
  'secure_secure':    "Two grounded people building something real. Rare and powerful.",
  'secure_anxious':   "Stability meets depth. One anchors, one deepens. Together: unshakeable.",
  'secure_avoidant':  "Patience and space. This pair grows by giving each other room.",
  'secure_fearful':   "One steady hand for someone learning to reach out. Beautiful dynamic.",
  'anxious_secure':   "Your depth is held safely here. That is everything.",
  'anxious_anxious':  "Two big hearts who just get it. Keep choosing each other.",
  'anxious_avoidant': "Fire and cool air. Opposites that teach each other something irreplaceable.",
  'anxious_fearful':  "Both brave in different ways. The vulnerability here runs deep.",
  'avoidant_secure':  "Freedom with a soft landing. What healthy independence looks like.",
  'avoidant_anxious': "Intensity finds calm here, and calm finds life. Perfect balance.",
  'avoidant_avoidant':"Two people who respect each other's space absolutely. Quietly powerful.",
  'avoidant_fearful': "Two careful hearts moving at their own pace. Extraordinary patience.",
  'fearful_secure':   "One learning to trust, one showing up consistently. This is healing.",
  'fearful_anxious':  "Vulnerability all the way down. Terrifying and incredibly real.",
  'fearful_avoidant': "The push-pull that creates the most honest dynamic of all.",
  'fearful_fearful':  "Two people brave enough to try anyway. That courage is remarkable."
};

// ─── Mood ─────────────────────────────────────────────────────────────────────

function deriveMood(gameData) {
  // Mirror the mood check result when available
  const moodToday = gameData?.mood?.today;
  if (moodToday) {
    const MAP = { glowing: 'excited', curious: 'curious', chill: 'happy', fired: 'excited', tense: 'curious', low: 'happy' };
    if (MAP[moodToday]) return MAP[moodToday];
  }
  const streak = gameData?.streak?.current || 0;
  const milestones = (gameData?.milestones || []).length;
  const triviaCorrect = gameData?.trivia?.correct || 0;
  const triviaTotal = gameData?.trivia?.total || 1;
  const wyrAnswered = gameData?.wyr?.answered || 0;
  if (milestones > 0 && streak >= 3) return 'excited';
  if (triviaTotal >= 5 && triviaCorrect / triviaTotal >= 0.8) return 'proud';
  if (wyrAnswered >= 5) return 'curious';
  return 'happy';
}

// ─── Color blending ───────────────────────────────────────────────────────────

function hexBlend(h1, h2) {
  const p = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = p(h1); const [r2,g2,b2] = p(h2);
  const rr = Math.round((r1+r2)/2).toString(16).padStart(2,'0');
  const gg = Math.round((g1+g2)/2).toString(16).padStart(2,'0');
  const bb = Math.round((b1+b2)/2).toString(16).padStart(2,'0');
  return `#${rr}${gg}${bb}`;
}

function blendColors(c1, c2) {
  return { body: hexBlend(c1.body, c2.body), eye: hexBlend(c1.eye, c2.eye), cheek: hexBlend(c1.cheek, c2.cheek) };
}

// ─── SVG accessories ──────────────────────────────────────────────────────────

function accessorySvg(stage, milestones, colors, cx, cy, r) {
  const parts = [];

  if (stage >= 2) {
    // bow tie at neck
    const bx = cx, by = cy + r * 0.64;
    parts.push(`
      <polygon points="${bx-r*.19},${by-r*.1} ${bx},${by} ${bx-r*.19},${by+r*.1}" fill="${colors.eye}" opacity=".75"/>
      <polygon points="${bx+r*.19},${by-r*.1} ${bx},${by} ${bx+r*.19},${by+r*.1}" fill="${colors.eye}" opacity=".75"/>
      <circle cx="${bx}" cy="${by}" r="${r*.06}" fill="${colors.cheek}"/>
    `);
  }

  if (stage >= 3) {
    // cape wings behind body
    parts.push(`
      <path d="M ${cx-r*.84} ${cy+r*.1} Q ${cx-r*1.22} ${cy+r*.6} ${cx-r*.56} ${cy+r*.8}" stroke="${colors.eye}" stroke-width="${r*.09}" fill="${colors.body}" opacity=".4"/>
      <path d="M ${cx+r*.84} ${cy+r*.1} Q ${cx+r*1.22} ${cy+r*.6} ${cx+r*.56} ${cy+r*.8}" stroke="${colors.eye}" stroke-width="${r*.09}" fill="${colors.body}" opacity=".4"/>
    `);
  }

  if (stage >= 4) {
    // round glasses
    const gy = cy - r * .14;
    parts.push(`
      <circle cx="${cx-r*.3}" cy="${gy}" r="${r*.17}" stroke="${colors.eye}" stroke-width="${r*.06}" fill="none" opacity=".7"/>
      <circle cx="${cx+r*.3}" cy="${gy}" r="${r*.17}" stroke="${colors.eye}" stroke-width="${r*.06}" fill="none" opacity=".7"/>
      <line x1="${cx-r*.13}" y1="${gy}" x2="${cx+r*.13}" y2="${gy}" stroke="${colors.eye}" stroke-width="${r*.05}" opacity=".7"/>
    `);
  }

  if (stage >= 5) {
    // crown with gems
    parts.push(`
      <polygon points="${cx-r*.32},${cy-r*1.06} ${cx-r*.16},${cy-r*1.3} ${cx},${cy-r*1.14} ${cx+r*.16},${cy-r*1.3} ${cx+r*.32},${cy-r*1.06}" fill="#f5c842"/>
      <circle cx="${cx-r*.16}" cy="${cy-r*1.3}" r="${r*.065}" fill="#e84040"/>
      <circle cx="${cx}" cy="${cy-r*1.14}" r="${r*.065}" fill="#40b0e8"/>
      <circle cx="${cx+r*.16}" cy="${cy-r*1.3}" r="${r*.065}" fill="#e84040"/>
    `);
  }

  // Milestone bonuses
  if (milestones.includes('trivia_master')) {
    parts.push(`
      <rect x="${cx+r*.76}" y="${cy-r*.06}" width="${r*.3}" height="${r*.24}" rx="${r*.05}" fill="#f5c842" opacity=".9"/>
      <line x1="${cx+r*.82}" y1="${cy+r*.06}" x2="${cx+r*1.0}" y2="${cy+r*.06}" stroke="${colors.eye}" stroke-width="${r*.04}" opacity=".7"/>
      <line x1="${cx+r*.82}" y1="${cy+r*.13}" x2="${cx+r*1.0}" y2="${cy+r*.13}" stroke="${colors.eye}" stroke-width="${r*.04}" opacity=".7"/>
    `);
  }

  if (milestones.includes('streak_7')) {
    parts.push(`<ellipse cx="${cx}" cy="${cy-r*1.1}" rx="${r*.42}" ry="${r*.09}" stroke="#f5c842" stroke-width="${r*.07}" fill="none" opacity=".85"/>`);
  }

  if (milestones.includes('memory_sharp') && stage < 4) {
    parts.push(`<polygon points="${cx+r*.68},${cy-r*.56} ${cx+r*.8},${cy-r*.7} ${cx+r*.92},${cy-r*.56} ${cx+r*.8},${cy-r*.38}" fill="${colors.cheek}" stroke="${colors.eye}" stroke-width="${r*.04}" opacity=".9"/>`);
  }

  return parts.join('');
}

// ─── SVG builder ─────────────────────────────────────────────────────────────

function buildPetSvg(colors, stage, mood, size, milestones = [], isCouple = false) {
  const s = size;
  const r = s * .38;
  const cx = s / 2;
  const cy = s * .54;
  const gid = `pg_${Math.round(r)}_${stage}`;

  const mouth =
    mood === 'excited' ? `M ${cx-r*.28} ${cy+r*.3} Q ${cx} ${cy+r*.56} ${cx+r*.28} ${cy+r*.3}` :
    mood === 'proud'   ? `M ${cx-r*.22} ${cy+r*.28} Q ${cx} ${cy+r*.47} ${cx+r*.22} ${cy+r*.28}` :
    mood === 'curious' ? `M ${cx-r*.15} ${cy+r*.32} Q ${cx+r*.1} ${cy+r*.44} ${cx+r*.16} ${cy+r*.3}` :
                         `M ${cx-r*.2} ${cy+r*.3} Q ${cx} ${cy+r*.44} ${cx+r*.2} ${cy+r*.3}`;

  const earFill = isCouple ? colors.cheek : colors.body;
  const ears = `
    <ellipse cx="${cx-r*.62}" cy="${cy-r*.74}" rx="${r*.2}" ry="${r*.3}" fill="${earFill}"/>
    <ellipse cx="${cx+r*.62}" cy="${cy-r*.74}" rx="${r*.2}" ry="${r*.3}" fill="${earFill}"/>
    <ellipse cx="${cx-r*.62}" cy="${cy-r*.74}" rx="${r*.1}" ry="${r*.17}" fill="${colors.cheek}" opacity=".7"/>
    <ellipse cx="${cx+r*.62}" cy="${cy-r*.74}" rx="${r*.1}" ry="${r*.17}" fill="${colors.cheek}" opacity=".7"/>
  `;

  const coupleHeart = isCouple ? `
    <path d="M ${cx} ${cy+r*.36} C ${cx-r*.18} ${cy+r*.19} ${cx-r*.33} ${cy+r*.31} ${cx} ${cy+r*.53} C ${cx+r*.33} ${cy+r*.31} ${cx+r*.18} ${cy+r*.19} ${cx} ${cy+r*.36} Z" fill="${colors.eye}" opacity=".5"/>
  ` : '';

  const accessories = accessorySvg(stage, milestones, colors, cx, cy, r);

  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <defs>
      <radialGradient id="${gid}" cx="38%" cy="32%">
        <stop offset="0%" stop-color="${colors.cheek}" stop-opacity=".7"/>
        <stop offset="100%" stop-color="${colors.body}"/>
      </radialGradient>
    </defs>
    ${accessories}${ears}
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r*.9}" fill="url(#${gid})"/>
    <ellipse cx="${cx-r*.43}" cy="${cy+r*.19}" rx="${r*.23}" ry="${r*.15}" fill="${colors.cheek}" opacity=".48"/>
    <ellipse cx="${cx+r*.43}" cy="${cy+r*.19}" rx="${r*.23}" ry="${r*.15}" fill="${colors.cheek}" opacity=".48"/>
    <circle cx="${cx-r*.3}" cy="${cy-r*.14}" r="${r*.14}" fill="${colors.eye}"/>
    <circle cx="${cx+r*.3}" cy="${cy-r*.14}" r="${r*.14}" fill="${colors.eye}"/>
    <circle cx="${cx-r*.26}" cy="${cy-r*.18}" r="${r*.055}" fill="white" opacity=".85"/>
    <circle cx="${cx+r*.26}" cy="${cy-r*.18}" r="${r*.055}" fill="white" opacity=".85"/>
    <path d="${mouth}" stroke="${colors.eye}" stroke-width="${r*.07}" fill="none" stroke-linecap="round"/>
    ${coupleHeart}
  </svg>`;
}

// ─── Affirmation picker ───────────────────────────────────────────────────────

let _affirmOffset = 0;

function pickAffirmation(attach, gameData, offset) {
  const streak = gameData?.streak?.current || 0;
  const pool = (offset % 3 === 2 || (streak === 0 && offset % 2 === 1))
    ? WARNINGS[attach] || WARNINGS.secure
    : AFFIRMATIONS[attach] || AFFIRMATIONS.secure;
  const isWarning = pool === (WARNINGS[attach] || WARNINGS.secure);
  const idx = (offset + (streak)) % pool.length;
  return { text: pool[idx], isWarning };
}

// ─── Pet data helpers ─────────────────────────────────────────────────────────

function makePetData(profile) {
  return { name: generatePetName(profile), totalDays: 0, lastSeen: null, stage: 1, mood: 'happy' };
}

function tickPet(petData, profile, isSolo, gameData) {
  const today = new Date().toISOString().split('T')[0];
  if (petData.lastSeen !== today) {
    if (petData.lastSeen) {
      // Solo grows 2x — each visit = 2 growth points
      petData.totalDays += isSolo ? 2 : 1;
    } else {
      petData.totalDays = isSolo ? 2 : 1;
    }
    petData.lastSeen = today;
    // Re-generate name if profile changed (name update)
    const expectedName = generatePetName(profile);
    if (!petData.name || petData._baseProfile !== (profile?.name + profile?.attachmentStyle)) {
      petData.name = expectedName;
      petData._baseProfile = (profile?.name || '') + (profile?.attachmentStyle || '');
    }
  }
  petData.mood = deriveMood(gameData);
  petData.stage = getStage(petData.totalDays).stage;
  return petData;
}

// ─── Migrate old flat structure ───────────────────────────────────────────────

function migratePetData(gd) {
  // Old structure had gd.pet.name as a string directly
  if (gd.pet && typeof gd.pet.name === 'string') {
    const old = gd.pet;
    gd.pet = {
      user: { name: old.name, totalDays: old.totalDays || 0, lastSeen: old.lastSeen || null, stage: old.stage || 1, mood: old.mood || 'happy' },
      partner: null
    };
  }
  if (!gd.pet) gd.pet = { user: null, partner: null };
  if (!gd.pet.user) gd.pet.user = null;
}

// ─── Init (called on app load) ────────────────────────────────────────────────

export function initPet() {
  const gd = window.AppState.gameData;
  migratePetData(gd);

  const solo = window.AppState.soloMode || !window.AppState.partnerProfile?.name;
  const userProfile = window.AppState.userProfile || {};
  const partnerProfile = window.AppState.partnerProfile || {};

  if (!gd.pet.user) gd.pet.user = makePetData(userProfile);
  gd.pet.user = tickPet(gd.pet.user, userProfile, solo, gd);

  if (!solo) {
    if (!gd.pet.partner) gd.pet.partner = makePetData(partnerProfile);
    gd.pet.partner = tickPet(gd.pet.partner, partnerProfile, false, gd);
  } else {
    gd.pet.partner = null;
  }

  saveGameData();
}

// ─── Section renderer ─────────────────────────────────────────────────────────

export function renderPetSection() {
  const container = document.getElementById('pet-section');
  if (!container) return;

  const gd = window.AppState.gameData;
  migratePetData(gd);

  const titleEl = document.getElementById('pet-section-title');
  const solo = window.AppState.soloMode || !window.AppState.partnerProfile?.name;
  const milestones = gd.milestones || [];

  if (!gd.pet?.user) return;

  const userPet = gd.pet.user;
  const userAttach = window.AppState.userProfile?.attachmentStyle || 'secure';
  const userColors = PET_COLORS[userAttach] || PET_COLORS.secure;
  const userStageInfo = getStage(userPet.totalDays);
  const userSvg = buildPetSvg(userColors, userPet.stage, userPet.mood, userStageInfo.size, milestones);

  const { text: affirmText, isWarning } = pickAffirmation(userAttach, gd, _affirmOffset);
  const affirmColor = isWarning ? '#f0a055' : 'var(--success-color)';
  const affirmBg = isWarning ? 'rgba(240,160,85,0.08)' : 'rgba(78,180,120,0.08)';
  const affirmIcon = isWarning ? '!' : '✦';
  const affirmLabel = isWarning ? 'Watch out for' : 'Today for you';

  const nextStage = STAGES.find(s => s.minDays > userPet.totalDays);
  const daysToNext = nextStage ? nextStage.minDays - userPet.totalDays : 0;

  if (solo) {
    if (titleEl) titleEl.textContent = 'Your Companion';
    container.innerHTML = `
      <div class="pet-section-card">
        <div class="pet-card-inner" onclick="openPetDrawer()" title="Meet ${userPet.name}" style="cursor:pointer;">
          <div class="pet-float-anim">${userSvg}</div>
          <div style="text-align:center;">
            <div class="pet-name-tag-lg">${userPet.name}</div>
            <div class="pet-stage-badge">${userStageInfo.label} · Day ${userPet.totalDays}</div>
          </div>
        </div>
        <div class="pet-affirmation-block" style="border-color:${affirmColor}; background:${affirmBg};">
          <div style="font-size:0.65rem; font-weight:700; color:${affirmColor}; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:5px;">${affirmIcon} ${affirmLabel}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">${affirmText}</div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-size:0.65rem; color:var(--text-muted);">${nextStage ? `${daysToNext} pts to ${nextStage.label}` : 'Fully evolved!'}</span>
          <button class="btn btn-outline" style="font-size:0.65rem; padding:4px 10px;" onclick="refreshPetAffirmation()">New Message</button>
        </div>
      </div>
    `;
    return;
  }

  // ── Partner mode ──────────────────────────────────────────────────────────
  if (titleEl) titleEl.textContent = 'Your Companions';

  const partnerPet = gd.pet.partner;
  if (!partnerPet) {
    // partner pet not initialized yet — just show user pet
    container.innerHTML = `<div class="pet-section-card"><div class="pet-card-inner">${userSvg}<div class="pet-name-tag-lg">${userPet.name}</div></div></div>`;
    return;
  }

  const partnerAttach = window.AppState.partnerProfile?.attachmentStyle || 'secure';
  const partnerColors = PET_COLORS[partnerAttach] || PET_COLORS.secure;
  const partnerStageInfo = getStage(partnerPet.totalDays);
  const partnerSvg = buildPetSvg(partnerColors, partnerPet.stage, partnerPet.mood, partnerStageInfo.size, milestones);

  // Couple pet
  const coupleColors = blendColors(userColors, partnerColors);
  const coupleAttachKey = `${userAttach}_${partnerAttach}`;
  const coupleMsg = COUPLE_MESSAGES[coupleAttachKey] || "Two unique energies building something only you two can.";
  const coupleName = generateMergedName(
    window.AppState.userProfile?.name || '',
    window.AppState.partnerProfile?.name || ''
  );
  const coupleStage = Math.min(userPet.stage, partnerPet.stage); // couple stage = slower of the two
  const coupleMood = (userPet.mood === 'excited' || partnerPet.mood === 'excited') ? 'excited' : userPet.mood;
  const coupleTotalDays = Math.min(userPet.totalDays, partnerPet.totalDays);
  const coupleStageInfo = getStage(coupleTotalDays);
  const coupleSvg = buildPetSvg(coupleColors, coupleStage, coupleMood, coupleStageInfo.size, milestones, true);

  container.innerHTML = `
    <div class="pet-section-card">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
        <div class="pet-card-mini" onclick="openPetDrawer()" title="Your pet" style="cursor:pointer;">
          <div class="pet-float-anim">${userSvg}</div>
          <div class="pet-name-tag-lg">${userPet.name}</div>
          <div class="pet-stage-badge">${userStageInfo.label} · Day ${userPet.totalDays}</div>
        </div>
        <div class="pet-card-mini" onclick="openPetDrawer()" title="${partnerPet.name}" style="cursor:pointer;">
          <div class="pet-float-anim">${partnerSvg}</div>
          <div class="pet-name-tag-lg">${partnerPet.name}</div>
          <div class="pet-stage-badge">${partnerStageInfo.label} · Day ${partnerPet.totalDays}</div>
        </div>
      </div>

      <div class="couple-pet-row">
        <div class="couple-pet-label">Combined Pet</div>
        <div style="display:flex; align-items:center; gap:14px; padding:10px 0 6px;">
          <div class="pet-float-anim" style="animation-duration:3.4s;">${coupleSvg}</div>
          <div style="flex:1;">
            <div style="font-size:0.92rem; font-weight:700; color:var(--text-primary); margin-bottom:5px;">${coupleName}</div>
            <div style="font-size:0.73rem; font-style:italic; color:var(--text-secondary); line-height:1.5;">"${coupleMsg}"</div>
            <div style="font-size:0.6rem; color:var(--text-muted); margin-top:4px;">${coupleStageInfo.label} · grows with both</div>
          </div>
        </div>
      </div>

      <div class="pet-affirmation-block" style="border-color:${affirmColor}; background:${affirmBg};">
        <div style="font-size:0.65rem; font-weight:700; color:${affirmColor}; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:5px;">${affirmIcon} ${affirmLabel}</div>
        <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">${affirmText}</div>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:10px;">
        <button class="btn btn-outline" style="font-size:0.65rem; padding:4px 10px;" onclick="refreshPetAffirmation()">New Message</button>
      </div>
    </div>
  `;
}

// ─── Award bonus pet growth from games ───────────────────────────────────────

export function awardPetGrowth(points = 1) {
  const gd = window.AppState.gameData;
  migratePetData(gd);
  if (gd.pet?.user) {
    gd.pet.user.totalDays = (gd.pet.user.totalDays || 0) + points;
    gd.pet.user.stage = getStage(gd.pet.user.totalDays).stage;
  }
  if (gd.pet?.partner) {
    gd.pet.partner.totalDays = (gd.pet.partner.totalDays || 0) + points;
    gd.pet.partner.stage = getStage(gd.pet.partner.totalDays).stage;
  }
  saveGameData();
}

// ─── Refresh affirmation ──────────────────────────────────────────────────────

export function refreshPetAffirmation() {
  _affirmOffset++;
  const container = document.getElementById('pet-section');
  if (!container) return;
  container.style.opacity = '0';
  container.style.transition = 'opacity 0.15s';
  setTimeout(() => {
    renderPetSection();
    container.style.opacity = '1';
  }, 150);
}

// ─── Pet drawer (tap to open full info) ──────────────────────────────────────

export function renderPetDrawer() {
  const gd = window.AppState.gameData;
  migratePetData(gd);

  const userPet = gd?.pet?.user;
  if (!userPet) return '<div class="card-body">Come back tomorrow to meet your pet!</div>';

  const attach = window.AppState.userProfile?.attachmentStyle || 'secure';
  const colors = PET_COLORS[attach] || PET_COLORS.secure;
  const milestones = gd?.milestones || [];
  const stageInfo = getStage(userPet.totalDays);
  const nextStage = STAGES.find(s => s.minDays > userPet.totalDays);
  const svg = buildPetSvg(colors, userPet.stage, userPet.mood, 90, milestones);

  const stageBar = STAGES.map(s => {
    const cls = s.stage === userPet.stage ? 'active' : s.stage < userPet.stage ? 'past' : '';
    return `<div class="pet-stage-pip ${cls}"><div class="pip-dot"></div><div class="pip-label">${s.label}</div></div>`;
  }).join('');

  const unlocked = [];
  if (userPet.stage >= 2) unlocked.push('Bow Tie');
  if (userPet.stage >= 3) unlocked.push('Cape');
  if (userPet.stage >= 4) unlocked.push('Glasses');
  if (userPet.stage >= 5) unlocked.push('Crown');
  if (milestones.includes('trivia_master')) unlocked.push('Diploma');
  if (milestones.includes('streak_7')) unlocked.push('Halo');
  if (milestones.includes('memory_sharp') && userPet.stage < 4) unlocked.push('Crystal');

  const solo = window.AppState.soloMode || !window.AppState.partnerProfile?.name;

  return `
    <div class="subtitle">Your Companion</div>
    <h2 style="margin-bottom:4px;">${userPet.name}</h2>
    <p class="card-body" style="color:var(--text-muted); margin-bottom:20px;">${stageInfo.label} · Day ${userPet.totalDays}${solo ? ' · Solo (grows 2x)' : ''}</p>
    <div style="display:flex; flex-direction:column; align-items:center; gap:16px; margin-bottom:24px;">
      <div class="pet-full-display"><div class="pet-float-anim">${svg}</div></div>
    </div>
    <div class="pet-stage-track">${stageBar}</div>
    ${nextStage
      ? `<div style="text-align:center; font-size:0.72rem; color:var(--text-muted); margin-top:12px;">${nextStage.minDays - userPet.totalDays} more pts to <strong style="color:var(--accent-primary);">${nextStage.label}</strong></div>`
      : `<div style="text-align:center; font-size:0.72rem; color:var(--accent-primary); margin-top:12px; font-weight:700;">Fully evolved. Legendary status.</div>`}
    ${unlocked.length > 0 ? `
    <div class="card" style="margin-top:16px; background:var(--bg-dark);">
      <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Unlocked items</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        ${unlocked.map(a => `<span style="font-size:0.7rem; background:rgba(129,140,248,0.12); border:1px solid var(--border-color); border-radius:20px; padding:3px 10px; color:var(--accent-primary);">${a}</span>`).join('')}
      </div>
    </div>` : ''}
    <div class="card" style="margin-top:12px; background:var(--bg-dark);">
      <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">How ${userPet.name} grows</div>
      <ul class="bullet-list dos">
        <li>Open the app each day${solo ? ' — solo pets earn 2 pts per visit' : ''}</li>
        <li>Earn milestones to unlock accessories</li>
        <li>Get a 7-day streak to unlock the halo</li>
        <li>Reach Day ${STAGES[4].minDays} to hit Legendary</li>
      </ul>
    </div>
  `;
}
