/**
 * Mathematical calculations, bitwise hashing, and dynamic weights engine.
 *
 * calculateLiveMetrics() is the key new function — it replaces the frozen
 * modulo-seed calculation with a live score derived from actual game behavior:
 *
 *   compatibilityWeight  = seed base (70) + knowledge bonus (0-15: real duo guess accuracy when available, else trivia accuracy) + streak bonus (0-5) + wyr bonus (0-10)
 *   synchronyFactor      = seed base (80) + daily-question participation bonus (0-10) + wyr answered bonus (0-7)
 *   alignmentVector      = seed base (90) + bingo identity bonus (0-5) + milestone bonus (0-5)
 *
 * All metrics are capped at their respective ceilings (100, 97, 100) and
 * increase visibly as the user plays more games.
 */
// ── Duo name pair concepts ────────────────────────────────────────────────────
// Iconic two-halves-of-one-whole pairings for the Duo Generator. Each concept
// is tagged with the personality AXIS it's meant to illustrate — not just
// flavor text, the axis picks which real trait comparison generateDuoName()
// uses to explain WHY that concept fits this specific couple (see
// REASON_BUILDERS below). `axis: 'energy'` concepts also use MBTI E/I to
// decide which partner gets which half (extrovert gets the bright one);
// everything else is a neutral pairing assigned by a stable per-couple hash
// tiebreak, so the SAME concept always assigns the same way on reroll.
const PAIR_CONCEPTS = [
  // energy — MBTI E/I (outward spark vs. quiet depth)
  { a: 'Sun', b: 'Moon', axis: 'energy' },
  { a: 'Fire', b: 'Ice', axis: 'energy' },
  { a: 'Thunder', b: 'Lightning', axis: 'energy' },
  { a: 'Day', b: 'Night', axis: 'energy' },
  { a: 'Spark', b: 'Calm', axis: 'energy' },
  { a: 'Storm', b: 'Stillness', axis: 'energy' },
  { a: 'Dawn', b: 'Dusk', axis: 'energy' },
  // attachment — closeness/security dynamics
  { a: 'Yin', b: 'Yang', axis: 'attachment' },
  { a: 'Anchor', b: 'Sail', axis: 'attachment' },
  { a: 'Root', b: 'Wing', axis: 'attachment' },
  { a: 'Harbor', b: 'Horizon', axis: 'attachment' },
  // conflict — how friction gets handled
  { a: 'Salt', b: 'Pepper', axis: 'conflict' },
  { a: 'Thunder', b: 'Rain', axis: 'conflict' },
  { a: 'Give', b: 'Take', axis: 'conflict' },
  // loveLanguage — how care actually gets felt
  { a: 'Peanut Butter', b: 'Jelly', axis: 'loveLanguage' },
  { a: 'Bread', b: 'Butter', axis: 'loveLanguage' },
  { a: 'Milk', b: 'Cookies', axis: 'loveLanguage' },
  { a: 'Coffee', b: 'Cream', axis: 'loveLanguage' },
  { a: 'Honey', b: 'Tea', axis: 'loveLanguage' },
  // expression — how the point actually gets across
  { a: 'Needle', b: 'Thread', axis: 'expression' },
  { a: 'Ketchup', b: 'Mustard', axis: 'expression' },
  { a: 'Rhythm', b: 'Blues', axis: 'expression' },
  // mbtiJP — MBTI J/P (locked-in plan vs. room to improvise)
  { a: 'Blueprint', b: 'Wanderer', axis: 'mbtiJP' },
  { a: 'Map', b: 'Compass', axis: 'mbtiJP' },
  // general — no single trait explains it, they just work
  { a: 'Odds', b: 'Ends', axis: 'general' },
  { a: 'Left Sock', b: 'Right Sock', axis: 'general' },
  { a: 'North', b: 'South', axis: 'general' },
];

// Short, plain-language labels for the "why" sentences below — separate,
// intentionally lighter-weight set from content-bank.js's labels since this
// is a fun one-liner, not a full insight.
const ATTACH_WHY_LABEL = {
  secure: 'steady and comfortable with closeness', anxious: 'deeply attuned and quick to notice shifts',
  avoidant: 'independent and recharges solo', fearful: 'careful — wants closeness but paces it'
};
const CONFLICT_WHY_LABEL = {
  collaborative: 'talks it through until it’s actually resolved', compromising: 'looks for a fast, fair middle ground',
  accommodating: 'smooths it over to keep the peace', avoiding: 'needs a beat before engaging'
};
const LOVE_WHY_LABEL = {
  words: 'kind words', time: 'undivided time', service: 'helpful actions', touch: 'physical closeness', gifts: 'thoughtful little things'
};
const EXPR_WHY_LABEL = {
  direct: 'says it straight, no guessing required', indirect: 'reads the room and drops hints',
  reflective: 'thinks it through before speaking', analytical: 'breaks it down logically'
};

// One reason-builder per axis — takes the actual trait VALUES for both
// people AND the concept itself, so the sentence names the concept's own
// words (Sun/Moon, Fire/Ice, ...). Without referencing the concept, every
// concept sharing an axis (7 concepts share 'energy' alone) produced the
// exact same sentence, so rerolling within one axis looked like "nothing
// changed" even though the pairing label above it did. userHalf/partnerHalf
// are the SAME values already assigned to the display, so directional axes
// (energy, mbtiJP) never contradict what's shown. Falls back to a light,
// still-true line when a trait is missing (solo callers, incomplete data).
const REASON_BUILDERS = {
  energy(concept, u, p, uFirst, pFirst, userHalf) {
    const uJ = u?.mbti?.[0], pJ = p?.mbti?.[0];
    if (!uJ || !pJ) return `Two energies that balance without needing to match — that's the ${concept.a} & ${concept.b} of it.`;
    if (uJ !== pJ) {
      const brightFirst = userHalf === concept.a ? uFirst : pFirst;
      const calmFirst = userHalf === concept.a ? pFirst : uFirst;
      return `${brightFirst} is pure ${concept.a} energy — outward, first through the door. ${calmFirst} is pure ${concept.b} energy — steady, quieter, still lighting things up. That push and pull is the whole pairing.`;
    }
    const sharedLabel = uJ === 'E' ? 'feed off a room the same way' : 'recharge in the quiet the same way';
    return `You both ${sharedLabel} — this ${concept.a} & ${concept.b} pairing isn't about opposites, it's one frequency turned up in two people.`;
  },
  attachment(concept, u, p, uFirst, pFirst) {
    const uA = u?.attachmentStyle, pA = p?.attachmentStyle;
    if (!uA || !pA) return `A ${concept.a} & ${concept.b} kind of dynamic — built on how you each show up for closeness.`;
    if (uA === pA) return `You're both ${ATTACH_WHY_LABEL[uA]} — like ${concept.a} & ${concept.b}, matching instincts around closeness, doubled.`;
    return `${uFirst} is ${ATTACH_WHY_LABEL[uA]}; ${pFirst} is ${ATTACH_WHY_LABEL[pA]} — that's your ${concept.a} & ${concept.b}: different instincts that end up covering each other.`;
  },
  conflict(concept, u, p, uFirst, pFirst) {
    const uC = u?.conflictStyle, pC = p?.conflictStyle;
    if (!uC || !pC) return `${concept.a} & ${concept.b} — built from how you each handle friction.`;
    if (uC === pC) return `You both ${CONFLICT_WHY_LABEL[uC]} — same instinct under pressure, just the two of you. That's ${concept.a} & ${concept.b}, doubled down.`;
    return `${uFirst} ${CONFLICT_WHY_LABEL[uC]}; ${pFirst} ${CONFLICT_WHY_LABEL[pC]} — your ${concept.a} & ${concept.b}: different approaches, same goal.`;
  },
  loveLanguage(concept, u, p, uFirst, pFirst) {
    const uL = u?.loveLanguage, pL = p?.loveLanguage;
    if (!uL || !pL) return `${concept.a} & ${concept.b} — two different ways of showing up for each other.`;
    if (uL === pL) return `You both feel most loved through ${LOVE_WHY_LABEL[uL]} — no translation needed, just ${concept.a} & ${concept.b} in perfect sync.`;
    return `${uFirst} feels loved through ${LOVE_WHY_LABEL[uL]}; ${pFirst} through ${LOVE_WHY_LABEL[pL]} — your ${concept.a} & ${concept.b}: different recipes, same result.`;
  },
  expression(concept, u, p, uFirst, pFirst) {
    const uE = u?.expressionStyle, pE = p?.expressionStyle;
    if (!uE || !pE) return `${concept.a} & ${concept.b} — two different ways of getting the point across.`;
    if (uE === pE) return `You both communicate the same way — ${EXPR_WHY_LABEL[uE]}. This ${concept.a} & ${concept.b} pairing isn't about contrast, it's about being unmistakably in sync.`;
    return `${uFirst} ${EXPR_WHY_LABEL[uE]}; ${pFirst} ${EXPR_WHY_LABEL[pE]} — that's your ${concept.a} & ${concept.b}.`;
  },
  mbtiJP(concept, u, p, uFirst, pFirst, userHalf) {
    const uJP = u?.mbti?.[3], pJP = p?.mbti?.[3];
    if (!uJP || !pJP) return `${concept.a} & ${concept.b} — one plans it, one lets it happen, either way it gets there.`;
    if (uJP === pJP) {
      const shared = uJP === 'J' ? 'like a plan and actually stick to it' : 'keep things flexible and improvise well together';
      return `You both ${shared} — ${concept.a} & ${concept.b}, same instinct, doubled.`;
    }
    const plannerFirst = userHalf === concept.a ? uFirst : pFirst;
    const freeFirst = userHalf === concept.a ? pFirst : uFirst;
    return `${plannerFirst} is the ${concept.a} — likes the plan locked in. ${freeFirst} is the ${concept.b} — likes room to improvise. Structure and spontaneity, working it out together.`;
  },
  general(concept) {
    return `${concept.a} & ${concept.b}. Some pairings don’t need a bigger reason than that.`;
  }
};

export const engine = {
  computeDeterministicSeed(uName, loc, timestamp) {
    const seedPayload = `${uName.trim().toLowerCase()}-${loc.trim().toLowerCase()}-${timestamp}`;
    let hash = 5381;
    for (let i = 0; i < seedPayload.length; i++) {
      hash = ((hash << 5) + hash) + seedPayload.charCodeAt(i);
      hash |= 0;
    }
    const absoluteHash = Math.abs(hash);
    return 10000000 + (absoluteHash % 90000000);
  },

  /**
   * Legacy frozen calculation — kept for reference display in dev tools.
   */
  calculateModuloWeights(seedString) {
    const seed = parseInt(seedString) || 12345678;
    return {
      compatibilityWeight: (seed % 31) + 70,
      synchronyFactor: (seed % 17) + 80,
      alignmentVector: (seed % 11) + 90
    };
  },

  /**
   * Live behavioral metrics — derived from actual game data.
   * This is what the dashboard and Vibe Check drawer now display.
   */
  calculateLiveMetrics(seedString, gameData) {
    const seed = parseInt(seedString) || 12345678;
    const gd = gameData || {};

    // --- Compatibility Weight (70-100) ---
    // Once Guess & Reveal has real data (5+ guesses), the main bonus comes
    // from ACTUAL guess accuracy about the partner — honest dyadic signal —
    // instead of solo trivia accuracy.
    const triviaBase = 70 + (seed % 7); // 70-76 base
    const duoRate = gd.duo && gd.duo.guesses >= 5 ? gd.duo.correctGuesses / gd.duo.guesses : null;
    const knowledgeBonus = duoRate !== null
      ? Math.round(duoRate * 15)
      : (gd.trivia && gd.trivia.total > 0 ? Math.round((gd.trivia.correct / gd.trivia.total) * 15) : 0);
    const streakBonus = gd.streak ? Math.min(gd.streak.current * 1, 5) : 0;
    const wyrCompatBonus = gd.wyr ? Math.min(Math.floor(gd.wyr.answered / 3), 10) : 0;
    const compatibilityWeight = Math.min(triviaBase + knowledgeBonus + streakBonus + wyrCompatBonus, 100);

    // --- Synchrony Factor (80-97 Hz) ---
    const syncBase = 80 + (seed % 5); // 80-84 base
    const dailyBonus = Math.min(gd.dailyq?.answered || 0, 10);
    const wyrSyncBonus = gd.wyr ? Math.min(Math.floor(gd.wyr.answered / 2), 7) : 0;
    const synchronyFactor = Math.min(syncBase + dailyBonus + wyrSyncBonus, 97);

    // --- Alignment Vector (90-100) ---
    const alignBase = 90 + (seed % 3); // 90-92 base
    const bingoBonus = gd.bingo ? Math.min(Math.floor(gd.bingo.checked / 2), 5) : 0;
    const milestoneBonus = gd.milestones ? Math.min(Math.floor(gd.milestones.length / 2), 5) : 0;
    const alignmentVector = Math.min(alignBase + bingoBonus + milestoneBonus, 100);

    // Deltas vs frozen baseline (for the "change" indicator)
    const frozen = this.calculateModuloWeights(seedString);
    return {
      compatibilityWeight,
      synchronyFactor,
      alignmentVector,
      deltas: {
        compat: compatibilityWeight - frozen.compatibilityWeight,
        sync: synchronyFactor - frozen.synchronyFactor,
        align: alignmentVector - frozen.alignmentVector
      }
    };
  },

  /**
   * Duo name — a thematic pair concept (Sun & Moon, Salt & Pepper, ...)
   * instead of mashing letters from both names into a fake portmanteau.
   * Each concept is tagged with a personality AXIS (energy/attachment/
   * conflict/loveLanguage/expression/mbtiJP/general) that both picks the
   * half-assignment rule and drives a "why" sentence built from the two
   * people's ACTUAL trait values (see REASON_BUILDERS) — not filler text.
   * `axis: 'energy'` concepts assign by MBTI E/I (extrovert gets the bright/
   * outward half) and `axis: 'mbtiJP'` concepts assign by MBTI J/P (Judger
   * gets the locked-in-plan half) when both profiles have that letter and
   * differ; everything else falls back to a stable per-couple hash tiebreak
   * so the assignment doesn't flip on every reroll of the SAME concept.
   * Returns a display object, not a mashed string.
   */
  generateDuoName(uName, pName, rollIndex, userProfile, partnerProfile) {
    const a = (uName || '').trim() || 'You';
    const b = (pName || '').trim() || 'Partner';
    const uFirst = a.split(' ')[0];
    const pFirst = b.split(' ')[0];
    const u = userProfile || {};
    const p = partnerProfile || {};

    const idx = Math.abs(rollIndex || 0) % PAIR_CONCEPTS.length;
    const concept = PAIR_CONCEPTS[idx];

    const uMbti = u.mbti;
    const pMbti = p.mbti;
    let userHalf = concept.a;
    let partnerHalf = concept.b;

    if (concept.axis === 'energy' && uMbti && pMbti && uMbti[0] !== pMbti[0]) {
      // Different energy types on an energy-flavored concept: extrovert
      // gets the bright/outward half, introvert gets the calm/quiet half.
      const userIsExtrovert = uMbti[0] === 'E';
      userHalf = userIsExtrovert ? concept.a : concept.b;
      partnerHalf = userIsExtrovert ? concept.b : concept.a;
    } else if (concept.axis === 'mbtiJP' && uMbti?.[3] && pMbti?.[3] && uMbti[3] !== pMbti[3]) {
      // Different J/P on a plan-vs-improvise concept: the Judger (plans,
      // decides) gets the "locked-in" half, the Perceiver gets the free one.
      const userIsJudger = uMbti[3] === 'J';
      userHalf = userIsJudger ? concept.a : concept.b;
      partnerHalf = userIsJudger ? concept.b : concept.a;
    } else {
      // Neutral concept, or both share the relevant trait — stable
      // per-couple tiebreak (same names + same concept always assigns the
      // same way, so it doesn't flip on every reroll of the SAME concept).
      let hash = 5381;
      const key = `${a}|${b}|${concept.a}`.toLowerCase();
      for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash) + key.charCodeAt(i);
      if (Math.abs(hash) % 2 === 1) { userHalf = concept.b; partnerHalf = concept.a; }
    }

    // The reason always names the concept itself (not just the axis), so
    // rerolling within one axis (e.g. 7 different 'energy' concepts) still
    // reads as a different message each time instead of repeating verbatim.
    // userHalf is passed through so directional axes never contradict what's
    // actually displayed above.
    const reasonFn = REASON_BUILDERS[concept.axis] || REASON_BUILDERS.general;
    const why = reasonFn(concept, u, p, uFirst, pFirst, userHalf, partnerHalf);

    return {
      label: `${concept.a} & ${concept.b}`,
      userHalf,
      partnerHalf,
      line: `${uFirst} is the ${userHalf} to ${pFirst}'s ${partnerHalf}.`,
      why
    };
  },

  generateSoloVibeName(uName, userProfile, rollIndex) {
    const first = (uName || 'You').split(' ')[0];
    const attach = userProfile?.attachmentStyle || 'secure';
    const love = userProfile?.loveLanguage || 'words';
    const expr = userProfile?.expressionStyle || 'direct';
    const mbti = userProfile?.mbti || 'ENFP';
    const isIntrovert = mbti[0] === 'I';

    // Curated natural-sounding name fragments keyed by trait
    const ATTACH_WORDS = { secure: ['Soleil', 'Cove', 'Haven', 'Ember'], anxious: ['Nova', 'Wren', 'Ripple', 'Lune'], avoidant: ['Ash', 'Sage', 'Flint', 'Reed'], fearful: ['Skye', 'Echo', 'Dusk', 'Zara'] };
    const LOVE_WORDS   = { words: ['Verse', 'Story', 'Lyric', 'Echo'], time: ['Flow', 'Drift', 'Tidal', 'Aeon'], service: ['Spark', 'Forge', 'Craft', 'Bloom'], touch: ['Glow', 'Pulse', 'Wave', 'Warm'], gifts: ['Gem', 'Lux', 'Halo', 'Shine'] };
    const ENERGY_WORD  = isIntrovert ? ['Mist', 'Isle', 'Calm', 'Still'] : ['Blaze', 'Tide', 'Rush', 'Solar'];

    const aPool = ATTACH_WORDS[attach] || ATTACH_WORDS.secure;
    const lPool = LOVE_WORDS[love] || LOVE_WORDS.words;
    const ePool = ENERGY_WORD;
    const firstShort = first.slice(0, Math.min(4, first.length));

    // Six distinct name styles — all feel like real names/handles
    const combos = [
      `${firstShort} ${aPool[0]}`,
      `${aPool[1]} ${lPool[0]}`,
      `${firstShort} ${lPool[1]}`,
      `${ePool[0]} ${aPool[2]}`,
      `${aPool[3]} ${ePool[1]}`,
      `${firstShort} ${ePool[2]}`
    ];

    const roll = (rollIndex || 0) % combos.length;
    // Title-case each word
    return combos[roll].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  },

  /**
   * Derives a human-readable personality trait label from WYR preference scores.
   * Returns the top 1-2 traits as a short phrase.
   */
  deriveWyrPersonalityLabel(preferences) {
    if (!preferences) return null;
    const pairs = [
      { key: 'adventurous', opposite: 'homebody', labelA: 'Adventurous', labelB: 'Homebody' },
      { key: 'planner', opposite: 'spontaneous', labelA: 'Planner', labelB: 'Spontaneous' },
      { key: 'deep', opposite: 'lighthearted', labelA: 'Deep Thinker', labelB: 'Lighthearted' },
      { key: 'connected', opposite: 'independent', labelA: 'Connected', labelB: 'Independent' }
    ];
    const labels = [];
    pairs.forEach(p => {
      const a = preferences[p.key] || 0;
      const b = preferences[p.opposite] || 0;
      if (a + b >= 2) {
        labels.push(a >= b ? p.labelA : p.labelB);
      }
    });
    return labels.slice(0, 2).join(' · ') || null;
  }
};
