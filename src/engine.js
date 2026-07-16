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
// Iconic two-halves-of-one-whole pairings for the Duo Generator. `energy: true`
// marks concepts with a bright/quiet semantic so MBTI E/I can inform which
// partner gets which half; everything else is a neutral pairing assigned by
// a stable per-couple hash tiebreak in generateDuoName().
const PAIR_CONCEPTS = [
  { a: 'Sun', b: 'Moon', energy: true },
  { a: 'Fire', b: 'Ice', energy: true },
  { a: 'Thunder', b: 'Lightning', energy: true },
  { a: 'Day', b: 'Night', energy: true },
  { a: 'Spark', b: 'Calm', energy: true },
  { a: 'Storm', b: 'Stillness', energy: true },
  { a: 'Dawn', b: 'Dusk', energy: true },
  { a: 'Salt', b: 'Pepper' },
  { a: 'Peanut Butter', b: 'Jelly' },
  { a: 'Bread', b: 'Butter' },
  { a: 'Milk', b: 'Cookies' },
  { a: 'Coffee', b: 'Cream' },
  { a: 'Ketchup', b: 'Mustard' },
  { a: 'Yin', b: 'Yang' },
  { a: 'North', b: 'South' },
  { a: 'Needle', b: 'Thread' },
  { a: 'Rhythm', b: 'Blues' },
  { a: 'Odds', b: 'Ends' },
];

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
   * `energy: true` concepts have a bright/quiet semantic (one half reads as
   * outward, one as calm) and get assigned by MBTI E/I when both profiles
   * have one; everything else falls back to a stable per-couple hash
   * tiebreak so the assignment doesn't flip on every reroll of the SAME
   * concept. Returns a display object, not a mashed string.
   */
  generateDuoName(uName, pName, rollIndex, userProfile, partnerProfile) {
    const a = (uName || '').trim() || 'You';
    const b = (pName || '').trim() || 'Partner';
    const uFirst = a.split(' ')[0];
    const pFirst = b.split(' ')[0];

    const idx = Math.abs(rollIndex || 0) % PAIR_CONCEPTS.length;
    const concept = PAIR_CONCEPTS[idx];

    const uMbti = userProfile?.mbti;
    const pMbti = partnerProfile?.mbti;
    let userHalf = concept.a;
    let partnerHalf = concept.b;

    if (concept.energy && uMbti && pMbti && uMbti[0] !== pMbti[0]) {
      // Different energy types on an energy-flavored concept: extrovert
      // gets the bright/outward half, introvert gets the calm/quiet half.
      const userIsExtrovert = uMbti[0] === 'E';
      userHalf = userIsExtrovert ? concept.a : concept.b;
      partnerHalf = userIsExtrovert ? concept.b : concept.a;
    } else {
      // Neutral concept, or both share an energy type — stable per-couple
      // tiebreak (same names + same concept always assigns the same way).
      let hash = 5381;
      const key = `${a}|${b}|${concept.a}`.toLowerCase();
      for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash) + key.charCodeAt(i);
      if (Math.abs(hash) % 2 === 1) { userHalf = concept.b; partnerHalf = concept.a; }
    }

    return {
      label: `${concept.a} & ${concept.b}`,
      userHalf,
      partnerHalf,
      line: `${uFirst} is the ${userHalf} to ${pFirst}'s ${partnerHalf}.`
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
