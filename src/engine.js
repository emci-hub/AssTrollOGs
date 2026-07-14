/**
 * Mathematical calculations, bitwise hashing, and dynamic weights engine.
 *
 * calculateLiveMetrics() is the key new function — it replaces the frozen
 * modulo-seed calculation with a live score derived from actual game behavior:
 *
 *   compatibilityWeight  = seed base (70) + trivia accuracy bonus (0-15) + streak bonus (0-5) + wyr bonus (0-10)
 *   synchronyFactor      = seed base (80) + memory sharpness bonus (0-10) + wyr answered bonus (0-7)
 *   alignmentVector      = seed base (90) + bingo identity bonus (0-5) + milestone bonus (0-5)
 *
 * All metrics are capped at their respective ceilings (100, 97, 100) and
 * increase visibly as the user plays more games.
 */
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
    const triviaBase = 70 + (seed % 7); // 70-76 base
    const triviaBonus = gd.trivia && gd.trivia.total > 0
      ? Math.round((gd.trivia.correct / gd.trivia.total) * 15)
      : 0;
    const streakBonus = gd.streak ? Math.min(gd.streak.current * 1, 5) : 0;
    const wyrCompatBonus = gd.wyr ? Math.min(Math.floor(gd.wyr.answered / 3), 10) : 0;
    const compatibilityWeight = Math.min(triviaBase + triviaBonus + streakBonus + wyrCompatBonus, 100);

    // --- Synchrony Factor (80-97 Hz) ---
    const syncBase = 80 + (seed % 5); // 80-84 base
    const memoryBonus = gd.memory && gd.memory.bestMoves !== null
      ? Math.max(0, 10 - Math.floor(gd.memory.bestMoves / 2))
      : 0;
    const wyrSyncBonus = gd.wyr ? Math.min(Math.floor(gd.wyr.answered / 2), 7) : 0;
    const synchronyFactor = Math.min(syncBase + memoryBonus + wyrSyncBonus, 97);

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

  generateDuoName(uName, pName, rollIndex) {
    const a = uName.trim();
    const b = pName.trim();
    if (!a || !b) return 'DREAMTEAM';

    const firstNames = [a.split(' ')[0], b.split(' ')[0]];
    const u = firstNames[0];
    const p = firstNames[1];

    const candidates = [];

    // Strategy 1: First half of A + second half of B
    candidates.push(u.slice(0, Math.ceil(u.length / 2)) + p.slice(Math.floor(p.length / 2)));

    // Strategy 2: First half of B + second half of A
    candidates.push(p.slice(0, Math.ceil(p.length / 2)) + u.slice(Math.floor(u.length / 2)));

    // Strategy 3: First 3 letters of A + last 3 letters of B (if long enough)
    if (u.length >= 3 && p.length >= 3) {
      candidates.push(u.slice(0, 3) + p.slice(-3));
    }

    // Strategy 4: First name + last 2 of partner's last name (or whole short name)
    const bLast = b.includes(' ') ? b.split(' ').pop() : b;
    candidates.push(u.slice(0, Math.ceil(u.length / 2)) + bLast.slice(-Math.min(3, bLast.length)));

    // Strategy 5: Reversed first halves
    candidates.push(p.slice(0, Math.ceil(p.length / 2)) + u.slice(0, Math.ceil(u.length / 2)));

    // Strategy 6: Alternating letters
    let alt = '';
    for (let i = 0; i < Math.max(u.length, p.length); i++) {
      if (i < u.length) alt += u[i];
      if (i < p.length) alt += p[i];
    }
    candidates.push(alt.slice(0, 7));

    const vowels = /[aeiou]/i;
    const valid = candidates.filter(c => c.length >= 3 && vowels.test(c));
    const roll = (rollIndex || 0) % Math.max(valid.length, 1);
    const sorted = valid.sort((x, y) => y.length - x.length);
    const best = sorted[roll] || candidates[0];

    return best.toUpperCase();
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
