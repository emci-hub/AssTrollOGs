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
  CHRONICLE_SCENARIOS, MBTI_FRAGMENTS,
  COMBO_INSIGHTS, ATTACHMENT_PAIRINGS, CONFLICT_PAIRINGS, CONFLICT_SOLO
} from './content-bank.js';
import { engine } from './engine.js';

export function getTimePeriod(hour) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 22) return 'evening';
  return 'night';
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

// Assembles a short MBTI-flavored line from the small fragment bank in
// content-bank.js — combinatorial variety from a cheap pool instead of
// needing a full pool per type.
function assembleMbtiFlavor(mbti, offset) {
  if (!mbti || mbti.length !== 4) return null;
  const pickFragment = (letter, salt) => {
    const pool = MBTI_FRAGMENTS[letter];
    if (!pool || pool.length === 0) return null;
    return pool[Math.abs((offset || 0) + salt) % pool.length];
  };
  const first = pickFragment(mbti[0], 0);
  const last = pickFragment(mbti[3], 5);
  if (!first || !last) return null;
  return `Classic ${mbti} energy: ${first}, and ${last}.`;
}

// ── Template interpolation ────────────────────────────────────────────────────
// Pool entries may embed {name}, {partner}, {mbti}, {streak}, {city} tokens so
// real data lives INSIDE sentences instead of being bolted on after. Strings
// without tokens pass through untouched.

export function fillTemplate(str, ctx) {
  if (!str || str.indexOf('{') === -1) return str;
  return str
    .replace(/\{name\}/g, ctx.name || 'friend')
    .replace(/\{partner\}/g, ctx.partner || 'your partner')
    .replace(/\{mbti\}/g, ctx.mbti || 'your type')
    .replace(/\{streak\}/g, String(ctx.streak ?? 0))
    .replace(/\{city\}/g, ctx.city || 'your corner of the world');
}

function templateCtx(profiles, gameData) {
  return {
    name: profiles.user?.name,
    partner: profiles.partner?.name,
    mbti: profiles.user?.mbti,
    streak: gameData?.streak?.current || 0,
    city: profiles.user?.location
  };
}

// ── Behavioral trend analysis ─────────────────────────────────────────────────
// The 30-day mood history and WYR preference counts are stored anyway —
// these turn them into the most personal content the app can produce.

const MOOD_SCORE = { glowing: 2, fired: 2, curious: 1, chill: 1, tense: -1, low: -2 };

export function analyzeMoodTrend(history) {
  const h = (history || []).slice(-7);
  if (h.length < 3) return null;

  const counts = {};
  h.forEach(e => { counts[e.mood] = (counts[e.mood] || 0) + 1; });
  const dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  let tenseStreak = 0;
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].mood === 'tense' || h[i].mood === 'low') tenseStreak++;
    else break;
  }

  const score = e => MOOD_SCORE[e.mood] ?? 0;
  const recent = h.slice(-3);
  const earlier = h.slice(0, Math.min(3, h.length - 3) || 1);
  const avg = arr => arr.reduce((s, e) => s + score(e), 0) / arr.length;
  const diff = avg(recent) - avg(earlier);
  const trend = diff >= 1 ? 'lifting' : diff <= -1 ? 'dipping' : 'steady';

  return { dominantMood, tenseStreak, trend, count: h.length };
}

export function analyzeWyrLean(preferences) {
  if (!preferences) return null;
  const pairs = [
    { a: 'adventurous', b: 'homebody', labelA: 'adventure-seeking', labelB: 'home-loving' },
    { a: 'planner', b: 'spontaneous', labelA: 'planning-ahead', labelB: 'spontaneous' },
    { a: 'deep', b: 'lighthearted', labelA: 'depth-first', labelB: 'lighthearted' },
    { a: 'connected', b: 'independent', labelA: 'connection-driven', labelB: 'independence-driven' }
  ];
  let best = null;
  pairs.forEach(p => {
    const a = preferences[p.a] || 0;
    const b = preferences[p.b] || 0;
    const margin = Math.abs(a - b);
    if (a + b >= 3 && margin >= 2 && (!best || margin > best.margin)) {
      best = { label: a >= b ? p.labelA : p.labelB, margin, total: a + b };
    }
  });
  return best;
}

const TREND_NOTES = {
  lifting: "Your last few check-ins have been trending brighter — whatever changed recently, it's working.",
  dipping: "Your recent check-ins have been running heavier than usual. Worth naming what's been draining you lately."
};

function moodTrendNote(gameData) {
  const trend = analyzeMoodTrend(gameData?.mood?.history);
  if (!trend) return null;
  if (trend.tenseStreak >= 3) {
    return `That's ${trend.tenseStreak} tense-or-low days in a row — your pattern says protect some recovery time, don't push harder.`;
  }
  return TREND_NOTES[trend.trend] || null;
}

// Conflict pairings are written order-neutral and keyed by the sorted pair.
function getConflictPairing(styleA, styleB) {
  if (!styleA || !styleB) return null;
  return CONFLICT_PAIRINGS[[styleA, styleB].sort().join('|')] || null;
}

function hashContentString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Per-profile seed so two different people never coincidentally land on the
// exact same rotating content just because they share one trait and check
// the app around the same time — blends several trait fields together, so
// variety multiplies combinatorially instead of being keyed off one field.
function computeContentSeed(profile) {
  if (!profile) return 0;
  const parts = [
    (profile.name || '').trim().toLowerCase(),
    (profile.location || '').trim().toLowerCase(),
    (profile.mbti || '').toUpperCase(),
    profile.attachmentStyle || '',
    profile.loveLanguage || '',
    profile.expressionStyle || ''
  ];
  return hashContentString(parts.join('|'));
}

// For content that's meant to represent "the two of you" jointly (Blueprint,
// deep-insight drawers) rather than either person individually — combines
// both seeds so different couples diverge, even if they share one member.
function computeCoupleSeed(userProfile, partnerProfile) {
  return computeContentSeed(userProfile) ^ computeContentSeed(partnerProfile);
}

export function getWeakestCategoryLabel(categoryAccuracy) {
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
    dailyq_first: 'First Daily Question', dailyq_7: 'A Week of Questions',
    duo_reader: 'Mind Reader', checkin_first: 'First Check-In', checkin_4: 'Monthly Ritual',
    bingo_3: 'Strength Spotter', bingo_row: 'Full Board',
    streak_3: '3-Day Streak', streak_7: '7-Day Streak',
    mood_first: 'First Mood Check', mood_consistent: 'Consistent Checker',
    quicktakes_first: 'Quick Taker', quicktakes_pattern: 'Pattern Finder',
    pet_baby: 'Baby Steps', pet_adult: 'Growing Up', pet_legendary: 'Legendary Bond',
    pet_couple_shiny: 'Shiny Bond',
    friend_first: 'Made a Friend', friend_circle: 'Friend Circle',
    friend_bond: 'Friendship Legend', friend_streak_7: 'Ride or Die'
  })[id] || id;
}

function getGameInsights(gameData, solo) {
  const result = [];
  const t = gameData?.trivia;
  const w = gameData?.wyr;
  const b = gameData?.bingo;
  const duo = gameData?.duo;
  const dq = gameData?.dailyq;
  const ci = gameData?.checkin;
  if (!solo && duo && duo.guesses >= 5) {
    const rate = Math.round((duo.correctGuesses / duo.guesses) * 100);
    result.push(rate >= 70
      ? `You've read your partner right ${rate}% of the time in Guess & Reveal — real fluency.`
      : `Your Guess & Reveal hit rate is ${rate}% — every miss is a real difference you've now seen.`);
  }
  if (t && t.total > 0) {
    const acc = Math.round((t.correct / t.total) * 100);
    if (solo) result.push(acc >= 80 ? `Your quiz score of ${acc}% shows real self-knowledge.` : `Your quiz score of ${acc}% — there are some interesting things still to discover.`);
    else result.push(acc >= 80 ? `Your trivia score of ${acc}% shows you know your partner well.` : `Your trivia score of ${acc}% — more to explore together.`);
  }
  if (dq && dq.answered >= 3) result.push(`${dq.answered} daily questions answered — the record is building.`);
  if (ci && ci.entries?.length >= 2) result.push(`${ci.entries.length} weekly check-ins done — that's a real ritual now.`);
  if (w && w.answered >= 5) result.push(`You've explored ${w.answered} Would You Rather dilemmas — your personality picture is coming into focus.`);
  if (b && b.checkedCells.length > 0) result.push(solo ? `You identified with ${b.checkedCells.length} personality sparks.` : `You two agreed on ${b.checkedCells.length} hot takes.`);
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const insights = {
  getTimePeriod,
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
    // Per-person seed so two brand-new accounts (same attachment style,
    // checking in around the same hour) don't converge on identical content.
    const seed = computeContentSeed(profiles.user);

    // Rotate headline from bank
    const headlines = solo ? SOLO_HEADLINES : PARTNER_HEADLINES;
    const baseKey = (dayIndex * 4 + Math.floor(hour / 6) + Math.floor(gd.trivia?.total || 0) + Math.floor(gd.wyr?.answered || 0));
    const headlineIdx = (baseKey + seed + (fortuneOffset || 0)) % headlines.length;
    const headline = headlines[headlineIdx];

    // Rotate body: generic attachment pool, the attachment×love-language combo
    // insight, and (partner mode) the couple's actual attachment-pairing
    // dynamic take turns — so the daily read regularly reflects trait
    // INTERSECTIONS, not just one trait at a time.
    const bodies = solo ? DAILY_BODIES_SOLO : DAILY_BODIES_PARTNER;
    const bodyPool = bodies[attach] || bodies.secure;
    const rotation = (baseKey + seed + (fortuneOffset || 0)) % (solo ? 3 : 4);
    let body;
    const comboLine = COMBO_INSIGHTS[`${attach}_${profiles.user?.loveLanguage}`];
    const pairingLine = !solo
      ? ATTACHMENT_PAIRINGS[`${attach}_${profiles.partner?.attachmentStyle}`]
      : null;
    if (rotation === 1 && comboLine) {
      body = comboLine;
    } else if (rotation === 3 && pairingLine) {
      body = pairingLine;
    } else {
      const bodyIdx = (baseKey + seed + (fortuneOffset || 0) + 2) % bodyPool.length;
      body = bodyPool[bodyIdx];
    }

    // Append game insight if available
    const gameHints = getGameInsights(gd, solo);
    const finalBody = gameHints.length > 0 && (fortuneOffset || 0) % 3 === 2
      ? `${body} ${gameHints[0]}`
      : body;

    // Append mood-aware note when mood has been checked today — named when
    // we actually have a real name, generic fallback otherwise.
    const moodToday = gd.mood?.today;
    const rawName = profiles.user?.name;
    const MOOD_NOTES = rawName ? {
      glowing: `Something in you is lit up today, ${rawName} — lean into it.`,
      curious: `That curious energy today is worth following, ${rawName}.`,
      chill:   `Today feels calm, ${rawName}. Use that stillness well.`,
      tense:   `Notice the tension, ${rawName} — it often points to something important.`,
      low:     `Low days are still valid days, ${rawName}. Be gentle with yourself.`,
      fired:   `You brought real fire today, ${rawName} — channel it somewhere that counts.`
    } : {
      glowing: 'Something in you is lit up today — lean into it.',
      curious: 'That curious energy today is worth following.',
      chill:   'Today feels calm. Use that stillness well.',
      tense:   'Notice the tension — it often points to something important.',
      low:     'Low days are still valid days. Be gentle with yourself.',
      fired:   'You brought real fire today — channel it somewhere that counts.'
    };
    const moodNote = moodToday ? MOOD_NOTES[moodToday] : null;
    let composed = moodNote ? `${finalBody} ${moodNote}` : finalBody;

    // Mood TREND note — reflects the stored 7-day pattern, not just today.
    const trendNote = (fortuneOffset || 0) % 2 === 1 ? moodTrendNote(gd) : null;
    if (trendNote) composed += ` ${trendNote}`;

    // Occasionally sprinkle in an MBTI-flavored line for extra personality
    const mbtiFlavor = (fortuneOffset || 0) % 4 === 3 ? assembleMbtiFlavor(profiles.user?.mbti, seed + (fortuneOffset || 0)) : null;
    if (mbtiFlavor) composed += ` ${mbtiFlavor}`;

    // Time-of-day theme line — morning reads differently from late night.
    if ((fortuneOffset || 0) % 4 === 1) {
      const theme = getTimeTheme(period);
      composed += ` A good ${period} move: ${theme.action}.`;
    }

    // Occasionally cross-pollinate with a concrete, actionable tip pulled
    // from the Spotlight pool — free extra variety since it reuses existing
    // content, and makes the message feel like real advice, not just a quote.
    if ((fortuneOffset || 0) % 5 === 4) {
      const tipPool = SPOTLIGHT_DOS[profiles.user?.loveLanguage] || SPOTLIGHT_DOS.words;
      const tip = tipPool[(seed + (fortuneOffset || 0)) % tipPool.length];
      if (tip) composed += ` Try this: ${tip}`;
    }

    const ctx = templateCtx(profiles, gd);
    return { headline: fillTemplate(headline, ctx), body: fillTemplate(composed, ctx) };
  },

  generateSpotlightLists(profiles, gameData, date, focusOffset) {
    const user = profiles.user || {};
    const solo = !profiles.partner;
    const gd = gameData || {};
    const wyrPrefs = gd.wyr?.preferences || {};
    const weakCat = getWeakestCategoryLabel(gd.trivia?.categoryAccuracy);
    const offset = focusOffset || 0;
    const seed = computeContentSeed(user);
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
    const doIdx1 = (offset + seed) % lovePool.length;
    const doIdx2 = (offset + seed + 3) % lovePool.length;
    const userDos = [lovePool[doIdx1]];
    if (doIdx2 !== doIdx1) userDos.push(lovePool[doIdx2]);

    // Pick a bonus tip from solo/partner pool + relationship status tip
    const bonusPool = solo ? FOCUS_TIPS_SOLO : FOCUS_TIPS_PARTNER;
    userDos.push(bonusPool[(offset + seed) % bonusPool.length]);
    if ((offset + seed) % 4 === 0) userDos.push(relTip);

    // DON'T tips from expression bank
    const dontPool = SPOTLIGHT_DONTS[user.expressionStyle] || SPOTLIGHT_DONTS.direct;
    const userDonts = [dontPool[(offset + seed) % dontPool.length]];
    // weakCat comes from a single shared trivia stat, not a per-person one —
    // frame it as joint so it doesn't read as an individual callout.
    if (weakCat) userDonts.push(solo ? `Take time to explore your ${weakCat} — there's more to discover there.` : `You two could dig into your ${weakCat} together — there's more to discover there.`);
    else userDonts.push('Assume you already know everything — curiosity is the better move.');

    // WYR behavioral nudge
    if ((wyrPrefs.adventurous || 0) >= (wyrPrefs.homebody || 0) + 2) {
      userDos.push('Channel that adventurous energy into one spontaneous moment today.');
    } else if ((wyrPrefs.homebody || 0) >= (wyrPrefs.adventurous || 0) + 2) {
      userDos.push('Honor your need for calm — protect the downtime intentionally.');
    }

    if (solo) return { userDos, userDonts, partnerDos: [], partnerDonts: [] };

    const partner = profiles.partner || {};
    const partnerSeed = computeContentSeed(partner);
    const partnerLovePool = SPOTLIGHT_DOS[partner.loveLanguage] || SPOTLIGHT_DOS.time;
    const pDoIdx = (offset + partnerSeed + 1) % partnerLovePool.length;
    const partnerDos = [partnerLovePool[pDoIdx], bonusPool[(offset + partnerSeed + 4) % bonusPool.length]];

    const partnerDontPool = SPOTLIGHT_DONTS[partner.expressionStyle] || SPOTLIGHT_DONTS.direct;
    const partnerDonts = [partnerDontPool[(offset + partnerSeed + 2) % partnerDontPool.length], 'Forget to acknowledge the small efforts — they add up.'];

    // weakCat is already surfaced once (in userDonts, framed as joint) —
    // it used to also show up here re-attributed to the partner individually,
    // which is the same shared stat presented as two different people's data.

    return { userDos, userDonts, partnerDos, partnerDonts };
  },

  generateBlueprint(profiles, gameData, blueprintOffset) {
    const user = profiles.user || {};
    const solo = !profiles.partner;
    const gd = gameData || {};
    const streak = gd.streak?.current || 0;
    const gameHints = getGameInsights(gd, solo);
    const offset = blueprintOffset || 0;
    // Blueprint is about "the two of you" jointly in partner mode, so it
    // gets a combined couple seed rather than just the primary user's.
    const seed = solo ? computeContentSeed(user) : computeCoupleSeed(user, profiles.partner);

    const pool = solo ? BLUEPRINT_SOLO : BLUEPRINT_PARTNER;
    let blueprint = pool[(offset + seed) % pool.length];

    if (streak >= 3) blueprint += ` Your ${streak}-day streak is a real signal of that.`;
    if (gameHints.length > 0) blueprint += ` ${gameHints[offset % gameHints.length] || gameHints[0]}`;

    // Occasionally sprinkle in an MBTI-flavored line so the "generic" pool
    // text still ties back to something specific about this actual person.
    if ((offset + seed) % 3 === 1) {
      const mbtiFlavor = assembleMbtiFlavor(user.mbti, offset + seed);
      if (mbtiFlavor) blueprint += ` ${mbtiFlavor}`;
    }

    return fillTemplate(blueprint, templateCtx(profiles, gd));
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
    // Deep-insight drawers are about "the two of you" jointly in partner
    // mode, same reasoning as the Blueprint's couple seed.
    const seed = solo ? computeContentSeed(user) : computeCoupleSeed(user, profiles.partner);

    let result;
    switch (type) {
      case 'groove': {
        const pool = solo ? DEEP_GROOVE_SOLO : DEEP_GROOVE_PARTNER;
        const picked = pool[(offset + seed) % pool.length];
        let body = picked.body;
        // Conflict style finally drives content — this drawer is the natural
        // home for it: the couple's pairing dynamic, or the solo read.
        if (solo) {
          const conflictLine = CONFLICT_SOLO[user.conflictStyle];
          if (conflictLine) body += ` ${conflictLine}`;
        } else {
          const pairing = getConflictPairing(user.conflictStyle, profiles.partner?.conflictStyle);
          if (pairing) body += ` ${pairing}`;
        }
        if (gameHints[0]) body += ` ${gameHints[0]}`;
        if (weakCat) body += ` Your quiz results suggest ${weakCat} is worth exploring deeper.`;
        result = { picked, body, pool };
        break;
      }
      case 'journey': {
        const pool = solo ? DEEP_JOURNEY_SOLO : DEEP_JOURNEY_PARTNER;
        const picked = pool[(offset + seed) % pool.length];
        let body = picked.body;
        const streak = gd.streak?.current || 0;
        if (streak >= 3) body += ` Your ${streak}-day streak shows the kind of consistency that compounds.`;
        const trendNote = moodTrendNote(gd);
        if (trendNote) body += ` ${trendNote}`;
        // Echo the latest Daily Reflection answer when one exists — the
        // journey drawer is where past-self meets present-self.
        const lastReflection = gd.reflection?.entries?.[gd.reflection.entries.length - 1];
        if (lastReflection?.answer) {
          body += ` Recently you reflected: "${lastReflection.answer}" — worth checking whether that still holds.`;
        }
        if (gameHints[1]) body += ` ${gameHints[1]}`;
        result = { picked, body, pool };
        break;
      }
      case 'decoder': {
        const pool = solo ? DEEP_DECODER_SOLO : DEEP_DECODER_PARTNER;
        const picked = pool[(offset + seed) % pool.length];
        let body = picked.body;
        const userSeed = computeContentSeed(user);
        const userDoPool = SPOTLIGHT_DOS[user.loveLanguage] || SPOTLIGHT_DOS.words;
        if (solo) {
          // Attachment × love-language combo — how this person's closeness
          // style and care language interact, not either trait alone.
          const comboLine = COMBO_INSIGHTS[`${user.attachmentStyle}_${user.loveLanguage}`];
          if (comboLine) body += ` ${comboLine}`;
          body += ` Practical tip: ${userDoPool[(offset + userSeed) % userDoPool.length]}`;
        } else {
          // Reflects BOTH partners' love languages. Each side uses its own
          // person's seed, since this tip is specifically about them.
          const partner = profiles.partner || {};
          const partnerSeed = computeContentSeed(partner);
          const partnerDoPool = SPOTLIGHT_DOS[partner.loveLanguage] || SPOTLIGHT_DOS.time;
          const uName = user.name || 'you';
          const pName = partner.name || 'your partner';
          body += ` For ${uName}: ${userDoPool[(offset + userSeed) % userDoPool.length]} For ${pName}: ${partnerDoPool[(offset + partnerSeed + 1) % partnerDoPool.length]}`;
        }
        result = { picked, body, pool };
        break;
      }
      case 'vibe': {
        const pool = solo ? DEEP_VIBE_SOLO : DEEP_VIBE_PARTNER;
        const picked = pool[(offset + seed) % pool.length];
        const metrics = engine.calculateLiveMetrics(window.AppState?.vibeSeed, gd);
        const wyrLabel = engine.deriveWyrPersonalityLabel(gd.wyr?.preferences);
        const mbtiNote = solo
          ? getMbtiSelf(user.mbti)
          : getMbtiPairing(user.mbti, profiles.partner?.mbti);
        let body = picked.body;
        body += ` ${mbtiNote}`;
        if (!solo) {
          // The couple's actual attachment dynamic, not just MBTI first letters.
          const pairing = ATTACHMENT_PAIRINGS[`${user.attachmentStyle}_${profiles.partner?.attachmentStyle}`];
          if (pairing) body += ` ${pairing}`;
        }
        if (wyrLabel) body += ` Your choices reveal a ${wyrLabel.toLowerCase()} streak.`;
        body += ` Scores: ${solo ? 'Self' : 'Connection'} ${metrics.compatibilityWeight}%, Rhythm ${metrics.synchronyFactor}%.`;
        result = { picked, body, pool };
        break;
      }
      default: return { title: '', headline: '', body: '', pool: [] };
    }

    const ctx = templateCtx(profiles, gd);
    return {
      title: fillTemplate(result.picked.headline, ctx),
      headline: fillTemplate(result.picked.headline, ctx),
      body: fillTemplate(result.body, ctx),
      pool: result.pool.map(p => ({ headline: fillTemplate(p.headline, ctx), body: fillTemplate(p.body, ctx) }))
    };
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
