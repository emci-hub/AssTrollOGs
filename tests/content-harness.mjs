/**
 * Content harness — regression checks for the variety/humor system.
 *
 * Run from the repo root:
 *   node --loader ./tests/loader.mjs tests/content-harness.mjs
 *
 * Covers: per-account salt divergence, per-account determinism, trait-key
 * coverage of every variant table, template-token hygiene, humor-level and
 * mood gating of joke kickers, trivia round rotation, WYR signal validity,
 * milestone label/toast coverage, migrateGameData backfill, and a 30-day
 * repeat-rate simulation of the daily glance.
 */

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

// ── Environment mocks ─────────────────────────────────────────────────────────
global.window = {
  AppState: { vibeSeed: '10000001', saveCode: 'VIBE-AAAA-1111', gameData: null, userProfile: {}, partnerProfile: null, soloMode: true },
  addEventListener: () => {}
};
global.document = { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [] };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { defaultGameData, migrateGameData, checkMilestones, MILESTONE_LABELS } = await import('../src/state.js');
const composer = await import('../src/composer.js');
const bank = await import('../src/content-bank.js');
const jokes = await import('../src/jokes.js');
const { insights } = await import('../src/insights.js');
const { __wyrInternals } = await import('../src/games/wyr.js');
const { __triviaInternals } = await import('../src/games/trivia.js');

window.AppState.gameData = migrateGameData(defaultGameData());

const PROFILE = {
  name: 'Alex Rivera', location: 'Calgary', mbti: 'INFP',
  attachmentStyle: 'anxious', conflictStyle: 'avoiding',
  loveLanguage: 'words', expressionStyle: 'reflective', relationshipStatus: 'committed'
};
const PARTNER = {
  name: 'Jordan Lee', mbti: 'ESTJ',
  attachmentStyle: 'avoidant', conflictStyle: 'collaborative',
  loveLanguage: 'time', expressionStyle: 'direct'
};
const DATE = new Date('2026-07-15T14:00:00');

function glanceText(offset = 0, partner = null) {
  const g = insights.generateDayAtAGlance({ user: PROFILE, partner }, window.AppState.gameData, DATE, offset);
  return `${g.headline}||${g.body}`;
}

// ── 1. Account salt: identical profiles on two accounts diverge ──────────────
console.log('1. Account-salt divergence');
{
  window.AppState.vibeSeed = '10000001'; window.AppState.saveCode = 'VIBE-AAAA-1111';
  const a = [0, 1, 2, 3, 4].map(o => glanceText(o)).join('\n');
  const aBlueprint = insights.generateBlueprint({ user: PROFILE, partner: null }, window.AppState.gameData, 0);
  window.AppState.vibeSeed = '20000002'; window.AppState.saveCode = 'VIBE-BBBB-2222';
  const b = [0, 1, 2, 3, 4].map(o => glanceText(o)).join('\n');
  const bBlueprint = insights.generateBlueprint({ user: PROFILE, partner: null }, window.AppState.gameData, 0);
  check('same profile, different account => different glance content', a !== b);
  check('same profile, different account => different blueprint', aBlueprint !== bBlueprint);
}

// ── 2. Determinism within an account ─────────────────────────────────────────
console.log('2. Per-account determinism');
{
  window.AppState.vibeSeed = '10000001'; window.AppState.saveCode = 'VIBE-AAAA-1111';
  check('same inputs => identical glance', glanceText(3) === glanceText(3));
  const d1 = insights.generateDeepInsight('decoder', { user: PROFILE, partner: PARTNER }, window.AppState.gameData, DATE, 2);
  const d2 = insights.generateDeepInsight('decoder', { user: PROFILE, partner: PARTNER }, window.AppState.gameData, DATE, 2);
  check('same inputs => identical decoder read', d1.body === d2.body);
}

// ── 3. Trait-key coverage of every variant table ─────────────────────────────
console.log('3. Table coverage');
{
  const ATTACH = ['secure', 'anxious', 'avoidant', 'fearful'];
  const LOVE = ['words', 'time', 'service', 'touch', 'gifts'];
  const CONFLICT = ['collaborative', 'compromising', 'accommodating', 'avoiding'];
  const EXPR = ['direct', 'indirect', 'reflective', 'analytical'];
  const validPool = e => Array.isArray(e) && e.length >= 2 && e.every(s => typeof s === 'string' && s.length > 10);

  check('COMBO_INSIGHTS covers 4x5 with variant arrays',
    ATTACH.every(a => LOVE.every(l => validPool(bank.COMBO_INSIGHTS[`${a}_${l}`]))));
  check('ATTACHMENT_PAIRINGS covers 4x4 with variant arrays',
    ATTACH.every(a => ATTACH.every(b => validPool(bank.ATTACHMENT_PAIRINGS[`${a}_${b}`]))));
  check('CONFLICT_PAIRINGS covers all sorted pairs with variant arrays',
    CONFLICT.every(a => CONFLICT.every(b => validPool(bank.CONFLICT_PAIRINGS[[a, b].sort().join('|')]))));
  check('CONFLICT_SOLO covers all styles with variant arrays',
    CONFLICT.every(c => validPool(bank.CONFLICT_SOLO[c])));
  check('FRIEND_ATTACHMENT_PAIRINGS covers 4x4 with variant arrays',
    ATTACH.every(a => ATTACH.every(b => validPool(bank.FRIEND_ATTACHMENT_PAIRINGS[`${a}_${b}`]))));
  check('FRIEND_CONFLICT_PAIRINGS covers all sorted pairs with variant arrays',
    CONFLICT.every(a => CONFLICT.every(b => validPool(bank.FRIEND_CONFLICT_PAIRINGS[[a, b].sort().join('|')]))));
  check('FRIEND_OF_DAY_TIPS covers all love languages with variant arrays',
    LOVE.every(l => validPool(bank.FRIEND_OF_DAY_TIPS[l])));
  check('FRIEND_ICEBREAKERS covers all expression styles',
    EXPR.every(e => validPool(bank.FRIEND_ICEBREAKERS[e])));
  check('FRIEND_MESSAGES covers all love languages',
    LOVE.every(l => validPool(bank.FRIEND_MESSAGES[l])));
}

// ── 4. Template-token hygiene ─────────────────────────────────────────────────
console.log('4. Token hygiene');
{
  const leftover = /\{(name|partner|mbti|streak|city)\}/;
  let dirty = 0;
  for (let o = 0; o < 40; o++) {
    if (leftover.test(glanceText(o, PARTNER))) dirty++;
    if (leftover.test(insights.generateBlueprint({ user: PROFILE, partner: PARTNER }, window.AppState.gameData, o))) dirty++;
    for (const type of ['groove', 'journey', 'decoder', 'vibe']) {
      const d = insights.generateDeepInsight(type, { user: PROFILE, partner: PARTNER }, window.AppState.gameData, DATE, o);
      if (leftover.test(d.body) || leftover.test(d.headline)) dirty++;
    }
  }
  check('no unfilled {tokens} across 240 composed messages', dirty === 0);
  check('general kicker banks use only known tokens',
    [...jokes.KICKERS_PLAYFUL, ...jokes.KICKERS_DARK].every(k => !/\{(?!name|partner|mbti|streak|city)\w+\}/.test(k)));
  check('pet kicker banks use only the {pet} token',
    [...jokes.PET_KICKERS_PLAYFUL, ...jokes.PET_KICKERS_DARK].every(k => !/\{(?!pet)\w+\}/.test(k)));
}

// ── 5. Humor gating ───────────────────────────────────────────────────────────
console.log('5. Humor gating');
{
  const gd = window.AppState.gameData;
  const allKickers = [...jokes.KICKERS_PLAYFUL, ...jokes.KICKERS_DARK];
  const containsAny = (text, pool) => pool.some(k => text.includes(k.replace(/\{name\}/g, PROFILE.name).replace(/\{partner\}/g, '').slice(0, 30)));

  gd.settings.humorLevel = 'chill';
  let chillHits = 0;
  for (let o = 0; o < 100; o++) if (containsAny(glanceText(o), allKickers)) chillHits++;
  check('chill level => zero kickers in 100 glances', chillHits === 0);

  gd.settings.humorLevel = 'unhinged';
  gd.mood.today = 'low';
  let darkOnLow = 0;
  for (let o = 0; o < 200; o++) if (containsAny(glanceText(o), jokes.KICKERS_DARK)) darkOnLow++;
  check('unhinged + low mood => zero DARK kickers in 200 glances', darkOnLow === 0);

  gd.mood.today = 'glowing';
  let darkOnGood = 0, playfulSeen = 0;
  for (let o = 0; o < 200; o++) {
    const t = glanceText(o);
    if (containsAny(t, jokes.KICKERS_DARK)) darkOnGood++;
    if (containsAny(t, jokes.KICKERS_PLAYFUL)) playfulSeen++;
  }
  check('unhinged + good mood => dark kickers appear', darkOnGood > 0);
  check('playful kickers appear too', playfulSeen > 0);
  gd.mood.today = null;
  gd.settings.humorLevel = 'playful';
}

// ── 6. Trivia rotation + WYR signal validity ─────────────────────────────────
console.log('6. Game pools');
{
  const gd = window.AppState.gameData;
  gd.trivia.total = 0;
  const r1 = __triviaInternals.buildRound(true, gd).map(q => q.question).join('|');
  gd.trivia.total = 5;
  const r2 = __triviaInternals.buildRound(true, gd).map(q => q.question).join('|');
  check('consecutive trivia rounds use different scenarios', r1 !== r2);
  gd.trivia.total = 0;

  window.AppState.vibeSeed = '10000001';
  const a1 = __triviaInternals.buildRound(true, gd).map(q => q.question).join('|');
  window.AppState.vibeSeed = '99990000';
  const a2 = __triviaInternals.buildRound(true, gd).map(q => q.question).join('|');
  check('different accounts open on different trivia scenarios', a1 !== a2);
  window.AppState.vibeSeed = '10000001';

  check('every trivia variant has both solo and partner phrasings + options',
    __triviaInternals.TRIVIA_BANK.every(cat => cat.variants.every(v =>
      v.solo?.question && v.partner?.question && v.soloOptions?.length >= 2 && v.partnerOptions?.length >= 2 &&
      v.soloOptions.length === v.partnerOptions.length)));

  const PREF_KEYS = ['adventurous', 'homebody', 'planner', 'spontaneous', 'deep', 'lighthearted', 'independent', 'connected'];
  const validSignals = q => q.signals && ['a', 'b'].every(side =>
    q.signals[side] && Object.keys(q.signals[side]).every(k => PREF_KEYS.includes(k)));
  check('all base WYR questions declare valid signals', __wyrInternals.WYR_QUESTIONS.every(validSignals));
  check('all CURSED WYR questions declare valid signals', __wyrInternals.CURSED_WYR_QUESTIONS.every(validSignals));
  check('all WYR bonus questions declare valid signals', bank.WYR_BONUS_QUESTIONS.every(validSignals));

  gd.settings.humorLevel = 'playful';
  const baseLen = __wyrInternals.activePool().length;
  gd.settings.humorLevel = 'unhinged';
  const unhingedLen = __wyrInternals.activePool().length;
  check('cursed pack only joins the pool at unhinged', unhingedLen === baseLen + __wyrInternals.CURSED_WYR_QUESTIONS.length);
  gd.settings.humorLevel = 'playful';
}

// ── 7. Milestones: every id has a label in both maps + backfill ──────────────
console.log('7. Milestones + migration');
{
  const gd = migrateGameData(defaultGameData());
  window.AppState.gameData = gd;
  gd.redflag.boardsCompleted = 1;
  gd.pettycourt.cases = 10;
  gd.calledit.made = 1; gd.calledit.right = 5;
  gd.capsule.entries = [{ sealedAt: '2026-06-01', unlockDate: '2026-07-01', text: 'hello', opened: true }];
  const earned = checkMilestones();
  const newIds = ['redflag_board', 'pettycourt_first', 'pettycourt_docket', 'calledit_first', 'calledit_prophet', 'capsule_first', 'capsule_open'];
  check('all new-game milestones fire', newIds.every(id => earned.includes(id)));
  check('all new-game milestones have MILESTONE_LABELS entries', newIds.every(id => MILESTONE_LABELS[id]));
  check('all new-game milestones have toast lines', newIds.every(id => jokes.MILESTONE_TOASTS[id]?.length > 0));

  const old = JSON.parse(JSON.stringify(defaultGameData()));
  delete old.redflag; delete old.pettycourt; delete old.calledit; delete old.capsule; delete old.settings; delete old.petq;
  const migrated = migrateGameData(old);
  check('migrateGameData backfills all new fields',
    !!migrated.redflag && !!migrated.pettycourt && !!migrated.calledit && !!migrated.capsule && !!migrated.petq &&
    migrated.settings?.humorLevel === 'playful');
  window.AppState.gameData = migrateGameData(defaultGameData());
}

// ── 8. 30-day repeat-rate simulation ─────────────────────────────────────────
console.log('8. Repeat-rate simulation');
{
  const bodies = new Set();
  for (let day = 0; day < 30; day++) {
    const date = new Date(2026, 6, 1 + day, 14, 0, 0);
    const g = insights.generateDayAtAGlance({ user: PROFILE, partner: null }, window.AppState.gameData, date, 0);
    bodies.add(g.body);
  }
  check(`30 simulated days => ≥20 unique glance bodies (got ${bodies.size})`, bodies.size >= 20);
}

// ── 9. Probability-roll fix: no more all-or-nothing streaks ─────────────────
console.log('9. rollChance streak fix');
{
  const gd = window.AppState.gameData;
  gd.settings.humorLevel = 'playful';
  gd.mood.today = null;
  window.AppState.vibeSeed = '10000001'; window.AppState.saveCode = 'VIBE-AAAA-1111';
  let hits = 0;
  for (let o = 0; o < 60; o++) if (composer.kickerFor('general', o, 'streak-test') !== null) hits++;
  check(`kicker hit-rate over 60 consecutive taps lands near 30% (got ${hits}/60, not 0 or 60)`, hits > 5 && hits < 55);

  // Same check across many DIFFERENT accounts (previously ~20% saw jokes on
  // every glance and ~70% saw none, in a short session).
  let allHit = 0, noneHit = 0;
  for (let acct = 0; acct < 50; acct++) {
    window.AppState.vibeSeed = String(10000000 + acct * 137);
    let h = 0;
    for (let o = 0; o < 10; o++) if (composer.kickerFor('general', o, 'acct-test') !== null) h++;
    if (h === 10) allHit++;
    if (h === 0) noneHit++;
  }
  check(`no account sees a joke on all 10 of its first 10 taps (got ${allHit}/50 accounts)`, allHit === 0);
  check(`no account sees zero jokes across 10 taps (got ${noneHit}/50 accounts)`, noneHit === 0);
  window.AppState.vibeSeed = '10000001'; window.AppState.saveCode = 'VIBE-AAAA-1111';
}

// ── 10. Tough-love lines: rate + force + mood suppression ────────────────────
console.log('10. Tough-love lines');
{
  const gd = window.AppState.gameData;
  gd.mood.today = null;
  let toughCount = 0;
  for (let o = 0; o < 200; o++) {
    const g = insights.generateDayAtAGlance({ user: PROFILE, partner: null }, gd, DATE, o);
    if (bank && jokes.TOUGH_LOVE_LINES.some(l => g.body.includes(l))) toughCount++;
  }
  check(`tough-love line appears roughly 10-45% of the time unforced (got ${toughCount}/200)`, toughCount > 20 && toughCount < 90);

  const forced = insights.generateDayAtAGlance({ user: PROFILE, partner: null }, gd, DATE, 5, { forceTough: true });
  check('forceTough guarantees a tough-love line', jokes.TOUGH_LOVE_LINES.some(l => forced.body.includes(l)));

  gd.mood.today = 'low';
  const forcedOnLowMood = insights.generateDayAtAGlance({ user: PROFILE, partner: null }, gd, DATE, 5, { forceTough: true });
  check('forceTough is still suppressed on a low mood day', !jokes.TOUGH_LOVE_LINES.some(l => forcedOnLowMood.body.includes(l)));
  gd.mood.today = null;
}

// ── 11. Duo name: real pair concepts, deterministic, trait-informed ─────────
console.log('11. Duo name pair concepts');
{
  const { engine } = await import('../src/engine.js');
  const d1 = engine.generateDuoName('Alex Rivera', 'Sam Lee', 3, { mbti: 'ENFP' }, { mbti: 'INTJ' });
  const d2 = engine.generateDuoName('Alex Rivera', 'Sam Lee', 3, { mbti: 'ENFP' }, { mbti: 'INTJ' });
  check('duo name is a real pair concept, not a letter mashup', /&/.test(d1.label) && d1.userHalf !== d1.partnerHalf);
  check('duo name is deterministic for the same inputs', d1.label === d2.label && d1.line === d2.line);
  check('extrovert gets the bright half on an energy concept when found', d1.label !== 'Sun & Moon' || d1.userHalf === 'Sun');
  check('duo name includes a non-empty "why" reason', typeof d1.why === 'string' && d1.why.length > 10);
  let distinctConcepts = new Set();
  for (let i = 0; i < 27; i++) distinctConcepts.add(engine.generateDuoName('Alex', 'Sam', i).label);
  check('rerolling cycles through many distinct concepts (27-concept bank)', distinctConcepts.size >= 20);

  // The "why" must actually reflect real trait differences, not be generic
  // filler — same profiles except one differing trait should read differently.
  const baseUser = { mbti: 'INFP', attachmentStyle: 'anxious', conflictStyle: 'avoiding', loveLanguage: 'words', expressionStyle: 'reflective' };
  const basePartner = { mbti: 'ESTJ', attachmentStyle: 'avoidant', conflictStyle: 'collaborative', loveLanguage: 'time', expressionStyle: 'direct' };
  const attachConcept = engine.generateDuoName('Alex', 'Sam', PAIR_INDEX_BY_LABEL('Yin & Yang'), baseUser, basePartner);
  check('attachment-axis why references each person\'s actual attachment style',
    attachConcept.why.includes('deeply attuned') && attachConcept.why.includes('recharges solo'));
  const loveConcept = engine.generateDuoName('Alex', 'Sam', PAIR_INDEX_BY_LABEL('Peanut Butter & Jelly'), baseUser, basePartner);
  check('loveLanguage-axis why references each person\'s actual love language',
    loveConcept.why.includes('kind words') && loveConcept.why.includes('undivided time'));

  // Regression: "Try Another" felt like it did nothing because the why-text
  // only depended on the AXIS, not the specific concept — 7 concepts share
  // 'energy' alone, so consecutive rerolls within that group showed the
  // exact same sentence. Every same-axis concept must now read differently.
  const energyLabels = ['Sun & Moon', 'Fire & Ice', 'Thunder & Lightning', 'Day & Night', 'Spark & Calm', 'Storm & Stillness', 'Dawn & Dusk'];
  const energyWhys = new Set(energyLabels.map(l => engine.generateDuoName('Alex', 'Sam', PAIR_INDEX_BY_LABEL(l), baseUser, basePartner).why));
  check('all 7 energy-axis concepts produce distinct why-text for the same couple', energyWhys.size === energyLabels.length);

  const generalLabels = ['Odds & Ends', 'Left Sock & Right Sock', 'North & South'];
  const generalWhys = new Set(generalLabels.map(l => engine.generateDuoName('Alex', 'Sam', PAIR_INDEX_BY_LABEL(l), baseUser, basePartner).why));
  check('all 3 general-axis concepts produce distinct why-text', generalWhys.size === generalLabels.length);

  // mbtiJP half-assignment must match what the "why" text claims.
  const jpUser = { mbti: 'ISTJ' }, jpPartner = { mbti: 'ESFP' };
  const jpConcept = engine.generateDuoName('Alex', 'Sam', PAIR_INDEX_BY_LABEL('Blueprint & Wanderer'), jpUser, jpPartner);
  check('mbtiJP why-text names the same person as the Judger that the display assigns to "Blueprint"',
    (jpConcept.userHalf === 'Blueprint' && jpConcept.why.startsWith('Alex is the Blueprint')) ||
    (jpConcept.userHalf === 'Wanderer' && jpConcept.why.startsWith('Sam is the Blueprint')));

  function PAIR_INDEX_BY_LABEL(label) {
    for (let i = 0; i < 27; i++) if (engine.generateDuoName('Alex', 'Sam', i).label === label) return i;
    return 0;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
