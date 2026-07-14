/**
 * Centralized Insights Engine
 *
 * Pulls from content-bank.js for large rotating content pools.
 * All content is personalized by profile values + game behavior.
 * Nothing is static — every section has a pool of 5-20 variants.
 */

import {
  SOLO_HEADLINES, PARTNER_HEADLINES,
  DAILY_BODIES_SOLO, DAILY_BODIES_PARTNER,
  SPOTLIGHT_DOS, SPOTLIGHT_DONTS,
  FOCUS_TIPS_SOLO, FOCUS_TIPS_PARTNER,
  BLUEPRINT_SOLO, BLUEPRINT_PARTNER,
  DEEP_GROOVE_SOLO, DEEP_GROOVE_PARTNER,
  DEEP_JOURNEY_SOLO, DEEP_JOURNEY_PARTNER,
  DEEP_DECODER_SOLO, DEEP_DECODER_PARTNER,
  DEEP_VIBE_SOLO, DEEP_VIBE_PARTNER,
  CHRONICLE_SCENARIOS
} from './content-bank.js';
import { engine } from './engine.js';

export function getTimePeriod(hour) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 22) return 'evening';
  return 'night';
}

export function getTimeGreeting(period) {
  return { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Late night' }[period] || 'Hello';
}

export function getTimeTheme(period) {
  return ({
    morning:   { focus: 'set intentions for the day', energy: 'fresh and forward-looking', action: 'start the day with a clear goal' },
    afternoon: { focus: 'stay grounded through the busy stretch', energy: 'productive and steady', action: 'take a mindful pause to check in' },
    evening:   { focus: 'decompress and reflect', energy: 'warm and reflective', action: 'note one highlight from your day' },
    night:     { focus: 'reflect before rest', energy: 'quiet and introspective', action: 'express one thing you appreciated today' }
  })[period] || { focus: 'be present', energy: 'balanced', action: 'take a moment for yourself' };
}

export function getDayTheme(dayIndex) {
  return ['a restful, recharging energy', 'a fresh-start momentum', 'a steady midweek rhythm',
    'a deep-work focus', 'a forward-looking anticipation', 'a playful, adventurous spirit',
    'a slow, cozy togetherness'][dayIndex] || 'a balanced energy';
}

export function getMbtiPairing(userMbti, partnerMbti) {
  if (!userMbti || !partnerMbti) return 'Your personalities bring a unique blend of strengths to this connection.';
  const ei = userMbti[0];
  const pei = partnerMbti[0];
  if (ei !== pei) return 'One of you draws energy from people, the other from quiet — that balance works really well.';
  return 'You both recharge the same way, which means you rarely have to explain why you need what you need.';
}

function getMbtiSelf(mbti) {
  if (!mbti) return 'You have a unique way of seeing and processing the world.';
  const isIntrovert = mbti[0] === 'I';
  const isSensor = mbti[1] === 'S';
  const energy = isIntrovert
    ? 'You recharge best in quieter moments and tend to think things through carefully.'
    : 'You bring energy to every room and tend to think out loud as you go.';
  const process = isSensor ? 'You trust what you can see and feel.' : 'You love big ideas and imagining what could be.';
  return `${energy} ${process}`;
}

function getWeakestCategoryLabel(categoryAccuracy) {
  if (!categoryAccuracy) return null;
  let worst = null, worstRate = 1;
  Object.entries(categoryAccuracy).forEach(([key, val]) => {
    if (val.total > 0 && val.correct / val.total < worstRate) {
      worstRate = val.correct / val.total;
      worst = key;
    }
  });
  const labels = {
    mbti: 'personality style', loveLanguage: 'love language',
    attachment: 'closeness style', conflict: 'conflict style', expression: 'expression style'
  };
  return worst ? labels[worst] : null;
}

function getMilestoneLabel(id) {
  return ({
    trivia_first: 'First Quiz', trivia_perfect: 'Perfect Score', trivia_master: 'Trivia Master',
    wyr_5: '5 Dilemmas', wyr_10: '10 Dilemmas', wyr_25: 'Dilemma Veteran',
    memory_first: 'First Memory Win', memory_sharp: 'Sharp Memory',
    bingo_3: 'Strength Spotter', bingo_row: 'Full Board',
    streak_3: '3-Day Streak', streak_7: '7-Day Streak',
    mood_first: 'First Mood Check', mood_consistent: 'Consistent Checker',
    quicktakes_first: 'Quick Taker', quicktakes_pattern: 'Pattern Finder',
    pet_baby: 'Baby Steps', pet_adult: 'Growing Up', pet_legendary: 'Legendary Bond'
  })[id] || id;
}

function getGameInsights(gameData, solo) {
  const result = [];
  const t = gameData?.trivia;
  const m = gameData?.memory;
  const w = gameData?.wyr;
  const b = gameData?.bingo;
  if (t && t.total > 0) {
    const acc = Math.round((t.correct / t.total) * 100);
    if (solo) result.push(acc >= 80 ? `Your quiz score of ${acc}% shows real self-knowledge.` : `Your quiz score of ${acc}% — there are some interesting things still to discover.`);
    else result.push(acc >= 80 ? `Your trivia score of ${acc}% shows you know your partner well.` : `Your trivia score of ${acc}% — more to explore together.`);
  }
  if (m && m.bestMoves !== null && m.bestMoves <= 8) result.push(`You completed Vibe Match in just ${m.bestMoves} moves — that's sharp.`);
  if (w && w.answered >= 5) result.push(`You've explored ${w.answered} Would You Rather dilemmas — your personality picture is coming into focus.`);
  if (b && b.checkedCells.length > 0) result.push(solo ? `You identified with ${b.checkedCells.length} personality sparks.` : `You two agreed on ${b.checkedCells.length} hot takes.`);
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const insights = {
  getTimePeriod,
  getTimeGreeting,
  getTimeTheme,
  getDayTheme,
  getMbtiPairing,

  generateDayAtAGlance(profiles, gameData, date, fortuneOffset) {
    const hour = date.getHours();
    const period = getTimePeriod(hour);
    const dayIndex = date.getDay();
    const solo = !profiles.partner;
    const gd = gameData || {};
    const attach = profiles.user?.attachmentStyle || 'secure';
    const uName = profiles.user?.name || 'You';

    // Rotate headline from bank
    const headlines = solo ? SOLO_HEADLINES : PARTNER_HEADLINES;
    const baseKey = (dayIndex * 4 + Math.floor(hour / 6) + Math.floor(gd.trivia?.total || 0) + Math.floor(gd.wyr?.answered || 0));
    const headlineIdx = (baseKey + (fortuneOffset || 0)) % headlines.length;
    const headline = headlines[headlineIdx];

    // Rotate body from attachment-keyed bank
    const bodies = solo ? DAILY_BODIES_SOLO : DAILY_BODIES_PARTNER;
    const bodyPool = bodies[attach] || bodies.secure;
    const bodyIdx = (baseKey + (fortuneOffset || 0) + 2) % bodyPool.length;
    const body = bodyPool[bodyIdx];

    // Append game insight if available
    const gameHints = getGameInsights(gd, solo);
    const finalBody = gameHints.length > 0 && (fortuneOffset || 0) % 3 === 2
      ? `${body} ${gameHints[0]}`
      : body;

    // Append mood-aware note when mood has been checked today
    const moodToday = gd.mood?.today;
    const MOOD_NOTES = {
      glowing: 'Something in you is lit up today — lean into it.',
      curious: 'That curious energy today is worth following.',
      chill:   'Today feels calm. Use that stillness well.',
      tense:   'Notice the tension — it often points to something important.',
      low:     'Low days are still valid days. Be gentle with yourself.',
      fired:   'You brought real fire today — channel it somewhere that counts.'
    };
    const moodNote = moodToday ? MOOD_NOTES[moodToday] : null;
    const withMood = moodNote ? `${finalBody} ${moodNote}` : finalBody;

    return { headline, body: withMood };
  },

  generateSpotlightLists(profiles, gameData, date, focusOffset) {
    const user = profiles.user || {};
    const solo = !profiles.partner;
    const gd = gameData || {};
    const wyrPrefs = gd.wyr?.preferences || {};
    const weakCat = getWeakestCategoryLabel(gd.trivia?.categoryAccuracy);
    const offset = focusOffset || 0;
    const relStatus = user.relationshipStatus || 'early';

    // Relationship-status bonus tip
    const REL_BONUS = {
      early:        'Stay curious about each other — you\'re still learning the best parts.',
      committed:    'Deepen what\'s already working — depth beats novelty at this stage.',
      cohabitating: 'Protect small daily rituals — they hold more than big gestures do.',
      longdistance: 'Quality over quantity — make your time together fully intentional.'
    };
    const relTip = REL_BONUS[relStatus] || REL_BONUS.early;

    // Pick DO tips from love-language bank
    const lovePool = SPOTLIGHT_DOS[user.loveLanguage] || SPOTLIGHT_DOS.words;
    const doIdx1 = offset % lovePool.length;
    const doIdx2 = (offset + 3) % lovePool.length;
    const userDos = [lovePool[doIdx1]];
    if (doIdx2 !== doIdx1) userDos.push(lovePool[doIdx2]);

    // Pick a bonus tip from solo/partner pool + relationship status tip
    const bonusPool = solo ? FOCUS_TIPS_SOLO : FOCUS_TIPS_PARTNER;
    userDos.push(bonusPool[offset % bonusPool.length]);
    if (offset % 4 === 0) userDos.push(relTip);

    // DON'T tips from expression bank
    const dontPool = SPOTLIGHT_DONTS[user.expressionStyle] || SPOTLIGHT_DONTS.direct;
    const userDonts = [dontPool[offset % dontPool.length]];
    if (weakCat) userDonts.push(`Take time to explore your ${weakCat} — there's more to discover there.`);
    else userDonts.push('Assume you already know everything — curiosity is the better move.');

    // WYR behavioral nudge
    if ((wyrPrefs.adventurous || 0) >= (wyrPrefs.homebody || 0) + 2) {
      userDos.push('Channel that adventurous energy into one spontaneous moment today.');
    } else if ((wyrPrefs.homebody || 0) >= (wyrPrefs.adventurous || 0) + 2) {
      userDos.push('Honor your need for calm — protect the downtime intentionally.');
    }

    if (solo) return { userDos, userDonts, partnerDos: [], partnerDonts: [] };

    const partner = profiles.partner || {};
    const partnerLovePool = SPOTLIGHT_DOS[partner.loveLanguage] || SPOTLIGHT_DOS.time;
    const pDoIdx = (offset + 1) % partnerLovePool.length;
    const partnerDos = [partnerLovePool[pDoIdx], bonusPool[(offset + 4) % bonusPool.length]];

    const partnerDontPool = SPOTLIGHT_DONTS[partner.expressionStyle] || SPOTLIGHT_DONTS.direct;
    const partnerDonts = [partnerDontPool[(offset + 2) % partnerDontPool.length], 'Forget to acknowledge the small efforts — they add up.'];

    if (weakCat) partnerDos.push(`Tell your partner more about your ${weakCat} — they want to understand.`);

    return { userDos, userDonts, partnerDos, partnerDonts };
  },

  generateBlueprint(profiles, gameData, blueprintOffset) {
    const user = profiles.user || {};
    const solo = !profiles.partner;
    const gd = gameData || {};
    const streak = gd.streak?.current || 0;
    const gameHints = getGameInsights(gd, solo);
    const offset = blueprintOffset || 0;

    const pool = solo ? BLUEPRINT_SOLO : BLUEPRINT_PARTNER;
    let blueprint = pool[offset % pool.length];

    if (streak >= 3) blueprint += ` Your ${streak}-day streak is a real signal of that.`;
    if (gameHints.length > 0) blueprint += ` ${gameHints[offset % gameHints.length] || gameHints[0]}`;

    return blueprint;
  },

  generateDeepInsight(type, profiles, gameData, date, insightOffset) {
    const user = profiles.user || {};
    const solo = !profiles.partner;
    const period = getTimePeriod(date.getHours());
    const timeTheme = getTimeTheme(period);
    const gd = gameData || {};
    const offset = insightOffset || 0;
    const gameHints = getGameInsights(gd, solo);
    const weakCat = getWeakestCategoryLabel(gd.trivia?.categoryAccuracy);

    switch (type) {
      case 'groove': {
        const pool = solo ? DEEP_GROOVE_SOLO : DEEP_GROOVE_PARTNER;
        const picked = pool[offset % pool.length];
        let body = picked.body;
        if (gameHints[0]) body += ` ${gameHints[0]}`;
        if (weakCat) body += ` Your quiz results suggest ${weakCat} is worth exploring deeper.`;
        return {
          title: picked.headline,
          headline: picked.headline,
          body,
          pool: pool.map(p => ({ headline: p.headline, body: p.body }))
        };
      }
      case 'journey': {
        const pool = solo ? DEEP_JOURNEY_SOLO : DEEP_JOURNEY_PARTNER;
        const picked = pool[offset % pool.length];
        let body = picked.body;
        const streak = gd.streak?.current || 0;
        if (streak >= 3) body += ` Your ${streak}-day streak shows the kind of consistency that compounds.`;
        if (gameHints[1]) body += ` ${gameHints[1]}`;
        return {
          title: picked.headline,
          headline: picked.headline,
          body,
          pool: pool.map(p => ({ headline: p.headline, body: p.body }))
        };
      }
      case 'decoder': {
        const pool = solo ? DEEP_DECODER_SOLO : DEEP_DECODER_PARTNER;
        const picked = pool[offset % pool.length];
        let body = picked.body;
        const doPool = SPOTLIGHT_DOS[user.loveLanguage] || SPOTLIGHT_DOS.words;
        body += ` Practical tip: ${doPool[offset % doPool.length]}`;
        return {
          title: picked.headline,
          headline: picked.headline,
          body,
          pool: pool.map(p => ({ headline: p.headline, body: p.body }))
        };
      }
      case 'vibe': {
        const pool = solo ? DEEP_VIBE_SOLO : DEEP_VIBE_PARTNER;
        const picked = pool[offset % pool.length];
        const metrics = engine.calculateLiveMetrics(window.AppState?.vibeSeed, gd);
        const wyrLabel = engine.deriveWyrPersonalityLabel(gd.wyr?.preferences);
        const mbtiNote = solo
          ? getMbtiSelf(user.mbti)
          : getMbtiPairing(user.mbti, profiles.partner?.mbti);
        let body = picked.body;
        body += ` ${mbtiNote}`;
        if (wyrLabel) body += ` Your choices reveal a ${wyrLabel.toLowerCase()} streak.`;
        body += ` Scores: ${solo ? 'Self' : 'Connection'} ${metrics.compatibilityWeight}%, Rhythm ${metrics.synchronyFactor}%.`;
        return {
          title: picked.headline,
          headline: picked.headline,
          body,
          pool: pool.map(p => ({ headline: p.headline, body: p.body }))
        };
      }
      default: return { title: '', headline: '', body: '', pool: [] };
    }
  },

  generateChronicleScenario(profiles) {
    const user = profiles.user || {};
    const partner = profiles.partner;
    const s = CHRONICLE_SCENARIOS[Math.floor(Math.random() * CHRONICLE_SCENARIOS.length)];
    return {
      task: s.task,
      userRole: s.userRole,
      partnerRole: partner ? s.partnerRole : null,
      userName: user.name || 'You',
      partnerName: partner?.name || 'Your partner',
      userMbti: user.mbti || 'INFP',
      partnerMbti: partner?.mbti || 'ENFP'
    };
  },

  generateGameDerivedInsights(gameData, solo) {
    return getGameInsights(gameData || {}, solo);
  }
};
