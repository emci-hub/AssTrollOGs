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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
