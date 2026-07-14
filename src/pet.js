/**
 * Virtual Pet module.
 *
 * Solo:    one pet, grows 2x faster (each daily visit = 2 growth points).
 * Partner: user pet + partner pet (each 1x) + an independently-growing couple pet.
 *
 * Names are generated from the person's actual name + their attachment style
 * so every pet is unique to that specific user. Appearance (color/ear shape/
 * pattern) is derived deterministically from the profile — never persisted,
 * always recomputed at render time.
 */

import { saveGameData, todayLocal, isToday } from './state.js';

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

// ─── Deterministic per-person visuals ──────────────────────────────────────────
// Color, ear shape, and pattern are derived from the profile every render —
// never persisted. This is a pet-local seed (name+location+mbti+attachment),
// deliberately separate from engine.computeDeterministicSeed()/AppState.vibeSeed,
// which is timestamp-based, shared at the couple level, and coupled to unrelated
// compatibility-score logic.

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function computePetSeed(profile) {
  const name = (profile?.name || '').trim().toLowerCase();
  const location = (profile?.location || '').trim().toLowerCase();
  const mbti = (profile?.mbti || '').toUpperCase();
  const attach = profile?.attachmentStyle || '';
  return hashString(`${name}|${location}|${mbti}|${attach}`);
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Attachment style still governs the palette's qualitative "mood" (S/L ranges
// + a hue-shift bias) but no longer pins every user of that style to one hex.
const ATTACHMENT_PALETTE_MOOD = {
  secure:   { sBody: 58, lBody: 62, sEye: 62, lEye: 38, sCheek: 55, lCheek: 82, hueShift: 0   },
  anxious:  { sBody: 78, lBody: 58, sEye: 75, lEye: 34, sCheek: 70, lCheek: 85, hueShift: 0   },
  avoidant: { sBody: 38, lBody: 52, sEye: 42, lEye: 32, sCheek: 34, lCheek: 78, hueShift: 40  },
  fearful:  { sBody: 68, lBody: 40, sEye: 60, lEye: 24, sCheek: 55, lCheek: 68, hueShift: -20 }
};

function deriveColors(profile) {
  const seed = computePetSeed(profile);
  const mood = ATTACHMENT_PALETTE_MOOD[profile?.attachmentStyle] || ATTACHMENT_PALETTE_MOOD.secure;
  const hue = ((seed % 360) + mood.hueShift + 360) % 360;
  const jitter = (Math.floor(seed / 360) % 11) - 5;
  return {
    body: hslToHex(hue, mood.sBody, clamp(mood.lBody + jitter, 20, 85)),
    eye: hslToHex(hue, mood.sEye, clamp(mood.lEye + jitter, 15, 55)),
    cheek: hslToHex(hue, mood.sCheek, clamp(mood.lCheek + jitter, 60, 92))
  };
}

function earShapeVariant(profile) {
  return (profile?.mbti || '')[0] === 'E' ? 'pointed' : 'round';
}

const PATTERN_BY_LOVE_LANGUAGE = {
  words: 'sparkle',
  gifts: 'sparkle',
  time: 'band',
  service: 'stripes',
  touch: 'spots'
};

function patternType(profile) {
  return PATTERN_BY_LOVE_LANGUAGE[profile?.loveLanguage] || 'none';
}

function derivePetVisuals(profile) {
  return {
    colors: deriveColors(profile),
    earShape: earShapeVariant(profile),
    pattern: patternType(profile)
  };
}

// ─── Stages ───────────────────────────────────────────────────────────────────
// Solo pets grow at 2 pts/day so they hit these thresholds faster.
// Partner pets grow at 1 pt/day. The couple pet grows independently (see below).

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

// Body silhouette actually changes shape per stage (not just overall size).
const STAGE_SHAPE = {
  1: { ryMul: .96, earMul: .82, limbs: false, aura: false },
  2: { ryMul: .90, earMul: 1.00, limbs: true,  aura: false },
  3: { ryMul: .87, earMul: 1.05, limbs: true,  aura: false },
  4: { ryMul: .83, earMul: 1.10, limbs: true,  aura: false },
  5: { ryMul: .90, earMul: 1.15, limbs: true,  aura: true  }
};

// ─── Affirmations + Warnings ──────────────────────────────────────────────────

const AFFIRMATIONS = {
  secure: [
    "You bring steadiness to every room you walk into. That matters.",
    "Your calm presence is more powerful than you realize.",
    "You know how to hold space without losing yourself. That's rare.",
    "Balanced energy is a superpower. You have it naturally.",
    "People feel safe around you. Lean into that today.",
    "Your emotional intelligence runs deeper than you give yourself credit for.",
    "Being consistent is quietly heroic. You show up and that's everything.",
    "You don't need to perform confidence — you just have it.",
    "The way you de-escalate a room without even trying is a quiet superpower.",
    "Steadiness isn't glamorous, but it's the thing everyone secretly relies on you for."
  ],
  anxious: [
    "Your sensitivity is not a flaw — it's how you experience life more fully.",
    "The care you pour into others deserves to come back to you today.",
    "You feel things deeply because you love deeply. That's a beautiful thing.",
    "Your heart is one of your best features. Let it lead today.",
    "You notice things others miss. That awareness is your strength.",
    "You are more resilient than the worry tells you.",
    "Feeling deeply means caring fully. The world needs more of that.",
    "Caring this much isn't too much — it's just a lot, and that's allowed.",
    "The people who matter to you know it, even on days you doubt it.",
    "Your intuition about people is sharper than you give it credit for."
  ],
  avoidant: [
    "Your independence is built on quiet strength. Own it.",
    "You recharge solo and emerge sharper. That's wisdom, not withdrawal.",
    "Not everyone needs to be let in. Your discernment is healthy.",
    "Your boundaries are clear and that clarity is something to be proud of.",
    "Solitude isn't loneliness when you use it well. You do.",
    "There is real power in needing less than others expect.",
    "Your self-sufficiency is a foundation, not a wall.",
    "You don't owe anyone constant access to you to prove you care.",
    "Quiet loyalty still counts as loyalty, even when it's never loud about it.",
    "Your calm exterior is doing more emotional labor than people realize."
  ],
  fearful: [
    "Every step forward counts, even the small hesitant ones.",
    "You are allowed to want closeness. It doesn't have to be all or nothing.",
    "Choosing to show up today was already brave.",
    "The fact that you feel both things at once makes you deeply human.",
    "You've survived every difficult moment so far. Today is no different.",
    "Trust can be built slowly, on your terms. That's allowed.",
    "Your self-awareness is a form of strength most people never develop.",
    "Wanting both closeness and safety at the same time isn't a flaw — it's just complicated, and that's okay.",
    "You keep choosing to try, even when it would be easier not to. That's real.",
    "The walls you've built made sense once. You get to decide what stays."
  ]
};

const WARNINGS = {
  secure: [
    "Watch out: comfort can become complacency. Check in actively today.",
    "Heads up: sometimes stability needs a little shaking up to stay fresh.",
    "Notice if you've been assuming things are fine without actually asking.",
    "Your calm might read as indifference to someone who needs reassurance.",
    "Balance is great — make sure you're not just avoiding the hard stuff.",
    "Check in: are you giving others the security you give yourself?",
    "Being easygoing doesn't mean you have to agree with everything today.",
    "Steady doesn't mean silent — say something if it's actually bothering you.",
    "Don't let 'it's fine' become your default answer when it isn't."
  ],
  anxious: [
    "Watch out: your brain might be writing stories that aren't true today.",
    "Pause before sending that message. Give it 10 minutes first.",
    "Notice if you're seeking reassurance more than you need to right now.",
    "That quiet feeling might just be quiet — not a sign something's wrong.",
    "Your worry is protective, but it can block the good stuff. Let it rest.",
    "Check in: are you deciding from fear or from what you actually want?",
    "A slow reply doesn't automatically mean something's wrong.",
    "Notice if you're rehearsing worst-case scenarios instead of just asking.",
    "Reassurance feels good, but it isn't a substitute for trusting what you already know."
  ],
  avoidant: [
    "Watch out: distance can feel like protection but sometimes it's just distance.",
    "Someone might need you today more than you realize. Check in.",
    "Notice if 'I need space' is becoming a habit instead of a need.",
    "Not every emotional moment requires a retreat. You can stay.",
    "Disconnecting to recharge is healthy. Disconnecting to avoid is different.",
    "Check in: is there a conversation you've been postponing that matters?",
    "Silence can read as anger even when you don't mean it that way.",
    "Notice if 'I'm fine' is doing a lot of heavy lifting today.",
    "Independence is great until it starts keeping people at arm's length by default."
  ],
  fearful: [
    "Watch out for pushing someone away just as they're getting close.",
    "The urge to self-sabotage is loudest just before things get good.",
    "Notice if you're testing people in ways they don't know about.",
    "Not everyone will leave. Some are staying — let them.",
    "Check in: is fear of being hurt stopping you from being happy right now?",
    "Your defenses are smart. But sometimes the threat isn't real.",
    "Testing someone's patience isn't the same as trusting it.",
    "Notice if you're bracing for an ending that hasn't actually started.",
    "Mixed signals confuse people even when your intentions are clear to you."
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

function deriveCoupleVisuals(userVisuals, partnerVisuals) {
  return {
    colors: blendColors(userVisuals.colors, partnerVisuals.colors),
    earShape: (userVisuals.earShape === 'pointed' || partnerVisuals.earShape === 'pointed') ? 'pointed' : 'round',
    pattern: 'none',
    shinyColors: { a: userVisuals.colors, b: partnerVisuals.colors }
  };
}

// ─── SVG body parts ────────────────────────────────────────────────────────────

function earsSvg(shape, earFill, cheekColor, cx, cy, r, earMul = 1) {
  const ex1 = cx - r * .62, ex2 = cx + r * .62;
  const ey = cy - r * .74;
  const rx = r * .2 * earMul, ry = r * .3 * earMul;
  const irx = r * .1 * earMul, iry = r * .17 * earMul;
  if (shape === 'pointed') {
    return `
      <polygon points="${ex1-rx},${ey+ry} ${ex1},${ey-ry} ${ex1+rx},${ey+ry}" fill="${earFill}"/>
      <polygon points="${ex2-rx},${ey+ry} ${ex2},${ey-ry} ${ex2+rx},${ey+ry}" fill="${earFill}"/>
      <polygon points="${ex1-irx},${ey+iry} ${ex1},${ey-iry*.4} ${ex1+irx},${ey+iry}" fill="${cheekColor}" opacity=".7"/>
      <polygon points="${ex2-irx},${ey+iry} ${ex2},${ey-iry*.4} ${ex2+irx},${ey+iry}" fill="${cheekColor}" opacity=".7"/>
    `;
  }
  return `
    <ellipse cx="${ex1}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${earFill}"/>
    <ellipse cx="${ex2}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${earFill}"/>
    <ellipse cx="${ex1}" cy="${ey}" rx="${irx}" ry="${iry}" fill="${cheekColor}" opacity=".7"/>
    <ellipse cx="${ex2}" cy="${ey}" rx="${irx}" ry="${iry}" fill="${cheekColor}" opacity=".7"/>
  `;
}

function limbsSvg(colors, cx, cy, r) {
  const fy = cy + r * .82;
  return `
    <ellipse cx="${cx-r*.32}" cy="${fy}" rx="${r*.14}" ry="${r*.09}" fill="${colors.body}"/>
    <ellipse cx="${cx+r*.32}" cy="${fy}" rx="${r*.14}" ry="${r*.09}" fill="${colors.body}"/>
  `;
}

function auraSvg(colors, cx, cy, r) {
  return `
    <ellipse cx="${cx}" cy="${cy}" rx="${r*1.45}" ry="${r*1.3}" fill="${colors.body}" opacity=".14"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${r*1.2}" ry="${r*1.08}" fill="${colors.cheek}" opacity=".18"/>
  `;
}

function patternOverlaySvg(pattern, colors, cx, cy, r, ry, gid) {
  if (pattern === 'none') return '';
  const clipId = `clip_${gid}`;
  let marks = '';
  if (pattern === 'spots') {
    const spots = [
      { dx: -.42, dy: -.1, s: .12 }, { dx: .1, dy: .3, s: .09 },
      { dx: .4, dy: -.2, s: .1 }, { dx: -.1, dy: -.4, s: .08 }
    ];
    marks = spots.map(p => `<circle cx="${cx+r*p.dx}" cy="${cy+ry*p.dy}" r="${r*p.s}" fill="${colors.eye}" opacity=".22"/>`).join('');
  } else if (pattern === 'stripes') {
    marks = [-.5, -.15, .2, .55].map(dx =>
      `<rect x="${cx+r*dx}" y="${cy-ry}" width="${r*.13}" height="${ry*2}" fill="${colors.eye}" opacity=".18" transform="rotate(18 ${cx+r*dx} ${cy})"/>`
    ).join('');
  } else if (pattern === 'band') {
    marks = `<rect x="${cx-r}" y="${cy-ry*.12}" width="${r*2}" height="${ry*.3}" fill="${colors.eye}" opacity=".22"/>`;
  } else if (pattern === 'sparkle') {
    const sparks = [{ dx: -.3, dy: -.25 }, { dx: .32, dy: -.1 }, { dx: 0, dy: .35 }];
    marks = sparks.map(p => {
      const x = cx + r * p.dx, y = cy + ry * p.dy, s = r * .07;
      return `<path d="M ${x} ${y-s} L ${x+s*.3} ${y-s*.3} L ${x+s} ${y} L ${x+s*.3} ${y+s*.3} L ${x} ${y+s} L ${x-s*.3} ${y+s*.3} L ${x-s} ${y} L ${x-s*.3} ${y-s*.3} Z" fill="${colors.cheek}" opacity=".55"/>`;
    }).join('');
  }
  return `
    <clipPath id="${clipId}"><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${ry}"/></clipPath>
    <g clip-path="url(#${clipId})">${marks}</g>
  `;
}

function shinySparkleSvg(cx, cy, r) {
  const pts = [
    { dx: -0.7, dy: -0.55, s: 0.09 }, { dx: 0.72, dy: -0.4, s: 0.07 },
    { dx: -0.5, dy: 0.5,  s: 0.06 }, { dx: 0.55, dy: 0.62, s: 0.08 },
    { dx: 0,    dy: -1.0, s: 0.1 }
  ];
  return pts.map(p => {
    const x = cx + r * p.dx, y = cy + r * p.dy, s = r * p.s;
    return `<path d="M ${x} ${y-s} L ${x+s*.28} ${y-s*.28} L ${x+s} ${y} L ${x+s*.28} ${y+s*.28} L ${x} ${y+s} L ${x-s*.28} ${y+s*.28} L ${x-s} ${y} L ${x-s*.28} ${y-s*.28} Z" fill="#ffffff" opacity=".85"/>`;
  }).join('');
}

// ─── SVG accessories ──────────────────────────────────────────────────────────

function accessorySvg(stage, milestones, colors, cx, cy, r, isSolo = false) {
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

    // legendary weapon — solo mode only
    if (isSolo) {
      const wx = cx - r * .86;
      parts.push(`
        <rect x="${wx-r*.05}" y="${cy-r*.62}" width="${r*.1}" height="${r*.62}" fill="#c8d0da"/>
        <polygon points="${wx-r*.05},${cy-r*.62} ${wx},${cy-r*.78} ${wx+r*.05},${cy-r*.62}" fill="#e8edf2"/>
        <rect x="${wx-r*.14}" y="${cy-r*.02}" width="${r*.28}" height="${r*.08}" rx="${r*.02}" fill="${colors.eye}"/>
        <rect x="${wx-r*.04}" y="${cy+r*.06}" width="${r*.08}" height="${r*.16}" fill="#7a5230"/>
        <circle cx="${wx}" cy="${cy+r*.24}" r="${r*.05}" fill="#f5c842"/>
      `);
    }
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

function buildPetSvg(visuals, stage, mood, size, milestones = [], isCouple = false, isSolo = false) {
  const { colors, earShape, pattern } = visuals;
  const s = size;
  const r = s * .38;
  const cx = s / 2;
  const cy = s * .54;
  const shape = STAGE_SHAPE[stage] || STAGE_SHAPE[1];
  const ry = r * shape.ryMul;
  const gid = `pg_${Math.round(r)}_${stage}${isCouple ? 'c' : ''}`;
  const shiny = isCouple && stage >= 5;

  const mouth =
    mood === 'excited' ? `M ${cx-r*.28} ${cy+r*.3} Q ${cx} ${cy+r*.56} ${cx+r*.28} ${cy+r*.3}` :
    mood === 'proud'   ? `M ${cx-r*.22} ${cy+r*.28} Q ${cx} ${cy+r*.47} ${cx+r*.22} ${cy+r*.28}` :
    mood === 'curious' ? `M ${cx-r*.15} ${cy+r*.32} Q ${cx+r*.1} ${cy+r*.44} ${cx+r*.16} ${cy+r*.3}` :
                         `M ${cx-r*.2} ${cy+r*.3} Q ${cx} ${cy+r*.44} ${cx+r*.2} ${cy+r*.3}`;

  const earFill = isCouple ? colors.cheek : colors.body;
  const ears = earsSvg(earShape, earFill, colors.cheek, cx, cy, r, shape.earMul);
  const limbs = shape.limbs ? limbsSvg(colors, cx, cy, r) : '';
  const aura = shape.aura ? auraSvg(colors, cx, cy, r) : '';
  const pat = patternOverlaySvg(pattern, colors, cx, cy, r, ry, gid);
  const sparkle = shiny ? shinySparkleSvg(cx, cy, r) : '';

  const coupleHeart = isCouple ? `
    <path d="M ${cx} ${cy+r*.36} C ${cx-r*.18} ${cy+r*.19} ${cx-r*.33} ${cy+r*.31} ${cx} ${cy+r*.53} C ${cx+r*.33} ${cy+r*.31} ${cx+r*.18} ${cy+r*.19} ${cx} ${cy+r*.36} Z" fill="${colors.eye}" opacity=".5"/>
  ` : '';

  const accessories = accessorySvg(stage, milestones, colors, cx, cy, r, isSolo);

  const { a, b } = visuals.shinyColors || { a: colors, b: colors };
  const gradientDef = shiny
    ? `<linearGradient id="${gid}" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stop-color="${a.cheek}"/>
        <stop offset="35%" stop-color="${a.body}"/>
        <stop offset="50%" stop-color="#ffffff" stop-opacity=".55"/>
        <stop offset="65%" stop-color="${b.body}"/>
        <stop offset="100%" stop-color="${b.cheek}"/>
      </linearGradient>`
    : `<radialGradient id="${gid}" cx="38%" cy="32%">
        <stop offset="0%" stop-color="${colors.cheek}" stop-opacity=".7"/>
        <stop offset="100%" stop-color="${colors.body}"/>
      </radialGradient>`;

  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <defs>${gradientDef}</defs>
    ${aura}${accessories}${limbs}${ears}
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${ry}" fill="url(#${gid})"/>
    ${pat}
    <ellipse cx="${cx-r*.43}" cy="${cy+r*.19}" rx="${r*.23}" ry="${r*.15}" fill="${colors.cheek}" opacity=".48"/>
    <ellipse cx="${cx+r*.43}" cy="${cy+r*.19}" rx="${r*.23}" ry="${r*.15}" fill="${colors.cheek}" opacity=".48"/>
    <circle cx="${cx-r*.3}" cy="${cy-r*.14}" r="${r*.14}" fill="${colors.eye}"/>
    <circle cx="${cx+r*.3}" cy="${cy-r*.14}" r="${r*.14}" fill="${colors.eye}"/>
    <circle cx="${cx-r*.26}" cy="${cy-r*.18}" r="${r*.055}" fill="white" opacity=".85"/>
    <circle cx="${cx+r*.26}" cy="${cy-r*.18}" r="${r*.055}" fill="white" opacity=".85"/>
    <path d="${mouth}" stroke="${colors.eye}" stroke-width="${r*.07}" fill="none" stroke-linecap="round"/>
    ${coupleHeart}
    ${sparkle}
  </svg>`;
}

// ─── Affirmation picker ───────────────────────────────────────────────────────
// Shuffle-bag rotation: each pool is shuffled once, handed out in order, then
// reshuffled (never repeating the immediately-preceding item) — avoids both
// near-term repeats and the old mechanical "every 3rd click is a warning"
// pattern from a pure offset % length.

let _affirmOffset = 0;
const _shuffleBags = {};

function _shuffledIndices(len) {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function _drawFromBag(bagId, poolLength) {
  if (poolLength <= 0) return 0;
  let bag = _shuffleBags[bagId];
  if (!bag || bag.pos >= bag.order.length) {
    const order = _shuffledIndices(poolLength);
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

// Memoized by offset so incidental re-renders (any saveGameData() call, not
// just an explicit "New Message" tap) don't silently swap the visible text.
let _lastAffirmOffset = -1;
let _lastAffirmResult = null;

function pickAffirmation(attach, gameData, offset) {
  if (offset === _lastAffirmOffset && _lastAffirmResult) return _lastAffirmResult;
  const streak = gameData?.streak?.current || 0;
  const isWarning = streak === 0 ? Math.random() < 0.4 : Math.random() < 0.22;
  const pool = isWarning ? (WARNINGS[attach] || WARNINGS.secure) : (AFFIRMATIONS[attach] || AFFIRMATIONS.secure);
  const idx = _drawFromBag(`${attach}_${isWarning ? 'warn' : 'affirm'}`, pool.length);
  _lastAffirmOffset = offset;
  _lastAffirmResult = { text: pool[idx], isWarning };
  return _lastAffirmResult;
}

// ─── Pet reaction picker ──────────────────────────────────────────────────────
// Reacts to something that actually happened today (mood check, a game
// played, a streak just extended) instead of always pulling a generic pool
// line — falls back to pickAffirmation() when nothing notable happened.

function pickPetReaction(gameData) {
  const gd = gameData || {};
  const today = todayLocal();

  if (gd.mood?.lastChecked === today && gd.mood?.today) {
    const MOOD_REACTIONS = {
      glowing: "noticed you're glowing today and has been doing a happy little wiggle about it.",
      curious: "picked up on your curious mood and has been extra alert all day.",
      chill: "matched your chill energy and has been lazing around contentedly.",
      tense: "sensed the tension today and has been sticking close by.",
      low: "noticed today's a low one and is staying extra close.",
      fired: "caught your fired-up energy and has been bouncing off the walls."
    };
    const line = MOOD_REACTIONS[gd.mood.today];
    if (line) return line;
  }

  const gamesPlayedToday = ['trivia', 'wyr', 'bingo', 'quicktakes', 'dailyq', 'checkin']
    .some(g => isToday(gd[g]?.lastPlayed));
  if (gamesPlayedToday) return "did a little victory lap after watching you play today.";

  if (gd.streak?.lastOpenDate === today && (gd.streak?.current || 0) >= 3) {
    return `is proud of the ${gd.streak.current}-day streak you're on.`;
  }

  return null;
}

// ─── Pet data helpers ─────────────────────────────────────────────────────────

function makePetData(profile) {
  return { name: generatePetName(profile), totalDays: 0, lastSeen: null, stage: 1, mood: 'happy' };
}

function makeCouplePetData() {
  return { totalDays: 0, lastSeen: null, stage: 1, mood: 'happy' };
}

function tickPet(petData, profile, isSolo, gameData) {
  const today = todayLocal();
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

function tickCouplePet(petData, gameData) {
  const today = todayLocal();
  if (petData.lastSeen !== today) {
    petData.totalDays += 1;
    petData.lastSeen = today;
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
      partner: null,
      couple: null
    };
  }
  if (!gd.pet) gd.pet = { user: null, partner: null, couple: null };
  if (!gd.pet.user) gd.pet.user = null;
  if (gd.pet.couple === undefined) gd.pet.couple = null;
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

    if (!gd.pet.couple) gd.pet.couple = makeCouplePetData();
    gd.pet.couple = tickCouplePet(gd.pet.couple, gd);
  } else {
    gd.pet.partner = null;
    gd.pet.couple = null;
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
  const userVisuals = derivePetVisuals(window.AppState.userProfile || {});
  const userStageInfo = getStage(userPet.totalDays);
  const userSvg = buildPetSvg(userVisuals, userPet.stage, userPet.mood, userStageInfo.size, milestones, false, solo);

  // A fresh session opens with a contextual reaction to what actually
  // happened today (if anything did); tapping "New Message" moves past it
  // into the regular rotating pool.
  const petReaction = _affirmOffset === 0 ? pickPetReaction(gd) : null;
  let affirmText, isWarning, affirmLabel;
  if (petReaction) {
    affirmText = `${userPet.name} ${petReaction}`;
    isWarning = false;
    affirmLabel = `From ${userPet.name}`;
  } else {
    const picked = pickAffirmation(userAttach, gd, _affirmOffset);
    affirmText = picked.text;
    isWarning = picked.isWarning;
    // Labeled with the actual name in partner mode so it's unambiguous
    // whose message this is, since it's shown once beneath both pet cards.
    const uName = window.AppState.userProfile?.name;
    affirmLabel = isWarning
      ? (solo ? 'Watch out for' : `A heads-up for ${uName || 'you'}`)
      : (solo ? 'Today for you' : `Today for ${uName || 'you'}`);
  }
  const affirmColor = isWarning ? '#f0a055' : 'var(--success-color)';
  const affirmBg = isWarning ? 'rgba(240,160,85,0.08)' : 'rgba(78,180,120,0.08)';
  const affirmIcon = isWarning ? '!' : '✦';

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
  const partnerVisuals = derivePetVisuals(window.AppState.partnerProfile || {});
  const partnerStageInfo = getStage(partnerPet.totalDays);
  const partnerSvg = buildPetSvg(partnerVisuals, partnerPet.stage, partnerPet.mood, partnerStageInfo.size, milestones, false, solo);

  // Couple pet — grows independently, tracked in gd.pet.couple
  const couplePet = gd.pet.couple || makeCouplePetData();
  const coupleVisuals = deriveCoupleVisuals(userVisuals, partnerVisuals);
  const coupleAttachKey = `${userAttach}_${partnerAttach}`;
  const coupleMsg = COUPLE_MESSAGES[coupleAttachKey] || "Two unique energies building something only you two can.";
  const coupleName = generateMergedName(
    window.AppState.userProfile?.name || '',
    window.AppState.partnerProfile?.name || ''
  );
  const coupleStageInfo = getStage(couplePet.totalDays);
  const coupleShiny = couplePet.stage >= 5;
  const coupleSvg = buildPetSvg(coupleVisuals, couplePet.stage, couplePet.mood, coupleStageInfo.size, milestones, true, false);

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
            <div style="font-size:0.6rem; color:var(--text-muted); margin-top:4px;">${coupleShiny ? '✦ Shiny Legendary' : coupleStageInfo.label} · grows with both · Day ${couplePet.totalDays}</div>
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
  if (gd.pet?.couple) {
    gd.pet.couple.totalDays = (gd.pet.couple.totalDays || 0) + points;
    gd.pet.couple.stage = getStage(gd.pet.couple.totalDays).stage;
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

  const visuals = derivePetVisuals(window.AppState.userProfile || {});
  const milestones = gd?.milestones || [];
  const stageInfo = getStage(userPet.totalDays);
  const nextStage = STAGES.find(s => s.minDays > userPet.totalDays);
  const solo = window.AppState.soloMode || !window.AppState.partnerProfile?.name;
  const svg = buildPetSvg(visuals, userPet.stage, userPet.mood, 90, milestones, false, solo);

  const stageBar = STAGES.map(s => {
    const cls = s.stage === userPet.stage ? 'active' : s.stage < userPet.stage ? 'past' : '';
    return `<div class="pet-stage-pip ${cls}"><div class="pip-dot"></div><div class="pip-label">${s.label}</div></div>`;
  }).join('');

  const unlocked = [];
  if (userPet.stage >= 2) unlocked.push('Bow Tie');
  if (userPet.stage >= 3) unlocked.push('Cape');
  if (userPet.stage >= 4) unlocked.push('Glasses');
  if (userPet.stage >= 5) unlocked.push('Crown');
  if (userPet.stage >= 5 && solo) unlocked.push('Legendary Weapon');
  if (milestones.includes('trivia_master')) unlocked.push('Diploma');
  if (milestones.includes('streak_7')) unlocked.push('Halo');
  if (milestones.includes('memory_sharp') && userPet.stage < 4) unlocked.push('Crystal');

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
