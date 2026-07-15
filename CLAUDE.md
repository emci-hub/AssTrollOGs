# CLAUDE.md — Project Reference

**Start every session by reading this file first.** Update it whenever changes are made.

---

## What This Is

A mobile-first personality + relationship dashboard (430px max-width app container). Users build a personality profile during onboarding; the dashboard then surfaces daily insights, games, a virtual pet companion, and live behavioral metrics. Works in solo mode (self-discovery) or partner mode (relationship alignment).

**Stack:** Vanilla JS ES modules, Vite bundler, Supabase (no auth, device UUID as key, reads via SECURITY DEFINER RPCs only), localStorage as primary persistence. PWA (manifest + minimal cache-shell service worker in `public/`).

**Date rule:** ALL "what day is it" logic uses `todayLocal()` / `isToday()` / `daysBetween()` from `state.js` — never `toISOString().split('T')[0]` (UTC rolls the day over mid-evening for anyone west of Greenwich).

---

## File Map

| File | Purpose |
|---|---|
| `index.html` | Single page shell. All screens live here. Dev panel (gear icon) top-right. |
| `styles.css` | All styles. CSS variables in `:root`. Key classes: `.screen`, `.card`, `.choice-btn`, `.sparks-cell`, `.mood-btn`, `.qt-choice-btn`, `.memory-card` |
| `src/app.js` | Entry point. Imports all modules, binds window globals, handles init (cloud+local load, profile restore). |
| `src/state.js` | `window.AppState`, `defaultGameData()`, `migrateGameData()`, `saveGameData()`, `updateStreak()`, `checkMilestones()`, `canAwardPetGrowthToday()`, `recordPetGrowthToday()`, local-date helpers `todayLocal()`/`isToday()`/`daysBetween()`. `SCHEMA_VERSION = 3`. |
| `src/supabase.js` | Supabase client singleton, `getDeviceId()`, `cloudSave()`, `cloudLoad()`, `cloudLoadByCode()`. No auth — device UUID key. Reads go through RPCs (`get_session_by_device` / `get_session_by_code`); the table has NO open SELECT policy. |
| `src/save-code.js` | Save code system. `generateSaveCode()` (random, `crypto.getRandomValues`), `formatCode()`, `stripFormatting()`. The code is a PERMANENT opaque key minted once at onboarding — never regenerated, never derived from profile data. Pure cloud lookup key for cross-device restore + ongoing sync. |
| `src/growth.js` | Growth Compass. `computeGrowthCompass()` (one strength + one growth edge; live signals — duo accuracy, streaks, mood trends, trivia blind spots — beat static trait reads), `renderGrowthCard()` (dashboard), `renderGrowthDrawer()` (four-area breakdown: connection/communication/conflict/self-care from `GROWTH_AREAS`). |
| `src/profile-builder.js` | Onboarding wizard (steps 0–12 for partner, 0–7 for solo). `finalizeEngineData()` writes `userProfile` + `partnerProfile`. Labels use plain language ("Your full name", "Your city or region"). |
| `src/dashboard.js` | `hydrateDashboardViews()` — main render entry. Updates header, metrics bar, spotlight tips, Day at a Glance, games section titles. |
| `src/drawers.js` | All overlay drawers (insight types, sandbox, games, profile settings, pet). `openDrawer(type)` / `closeDrawer()`. `window.saveProfileSettings` writes to correct tempAnswers keys: `attachment`, `conflict`, `expression`. |
| `src/engine.js` | `computeDeterministicSeed()`, `calculateLiveMetrics()`, `generateDuoName()`, `generateSoloVibeName()` (returns "Alex Soleil" style), `deriveWyrPersonalityLabel()`. |
| `src/insights.js` | `insights.generateDeepInsight(type, profiles, gameData, now, offset)` — content for groove/journey/decoder/vibe drawers. `generateChronicleScenario()`. `assembleMbtiFlavor()`. `fillTemplate()` interpolates `{name}`/`{partner}`/`{mbti}`/`{streak}`/`{city}` tokens inside pool sentences. `analyzeMoodTrend()`/`analyzeWyrLean()` turn stored history into trend content. Daily glance rotates in `COMBO_INSIGHTS` + `ATTACHMENT_PAIRINGS`; groove wires conflict styles; decoder covers both love languages; journey echoes reflections + mood trends. |
| `src/content-bank.js` | Large arrays of insight content indexed by profile keys. Trait-combination banks: `COMBO_INSIGHTS` (attachment×loveLanguage), `ATTACHMENT_PAIRINGS` (4×4, keyed `user_partner`, order matters), `CONFLICT_PAIRINGS` (keyed by SORTED pair `a|b`, order-neutral text), `CONFLICT_SOLO`, `GROWTH_AREAS`. Plus `MBTI_FRAGMENTS`. Pool strings may contain `{name}`-style tokens (filled by `insights.fillTemplate`). |
| `src/questions.js` | `PSYCH_QUESTIONS` array (5 questions: loveLanguage, attachment, conflict, expression, mbti). `MBTI_TYPES` array. Question/title/desc copy is plain and warm — `value` fields are lookup keys used throughout the app and must never change. |
| `src/pet.js` | `initPet()`, `renderPetSection()`, `awardPetGrowth(n)`, `renderPetDrawer()`, `refreshPetAffirmation()`. SVG-based virtual pets built around a **species archetype system**: MBTI's 4 Keirsey temperament groups pick a body archetype (`construct`/`wisp`/`guardian`/`flit`, via `speciesArchetype()`), attachment style picks a silhouette sub-variant (`bodyVariant()`) — 16 distinct-looking pets total. Each archetype has its own per-stage feature builder (`archetypeFeaturesSvg()` dispatching to `constructFeaturesSvg`/`wispFeaturesSvg`/`guardianFeaturesSvg`/`flitFeaturesSvg`) driven by `ARCHETYPE_STAGE_SHAPE`, so evolution is a real structural change per stage, not a size multiplier. 3 stackable pattern layers (`patternA`=loveLanguage, `patternB`=expressionStyle, `edgeTreatment`=conflictStyle). Item slots: head ladder (bow tie→glasses→crown, stage-gated), weapon (`weaponSvg()`, keyed to loveLanguage, available to solo **and** partner at stage 5, solo gets an exclusive "enchanted" tier), back/cape (only for archetypes without a natural back feature). Aura is a shape family keyed to attachment style (`auraShapeSvg()`), fading in from stage 3. `computeLuckyNumber()` is a deterministic per-day badge that also seeds aura particle/ring counts. Past Legendary (day 40), `ascensionTier()`/`ascensionFinish()` give uncapped post-cap growth via a looping prestige-color rotation (bronze→...→prism); the couple pet's aura rings reflect `max()` of both individuals' ascension tiers (fusion). `isRareFinish()` gives a small permanent per-profile chance of a two-tone "shiny" palette. Couple pet (`gd.pet.couple`) is a **Chimera** — user's archetype as the primary body plus one accent feature borrowed from the partner's archetype family — with independent persisted growth. Mood synced from `gd.mood.today` for individuals; couple pet uses `deriveCoupleMood()` (reads real Check-In recency / duo guess accuracy first). `computeBondLevel()` tracks breadth of games played (derived, not persisted); `computeQuirkOfDay()` and `derivePetIdentity()` give small deterministic daily/permanent character flavor. `pickPetReaction()` reacts to today's actual mood/game/streak/quirk activity before falling back to `pickAffirmation()`'s shuffle-bag-rotated pool; partner-mode affirmation label names the actual person it's about. Exports `__internals` (test-only) for a Node-based visual QA harness that rasterizes SVGs via `sharp` without a browser. |
| `src/dev-tools.js` | Dev panel: jump steps, force dashboard, clear cache. |
| `src/games/index.js` | Game registry. `gameRegistry.get(id)` / `gameRegistry.bindAll()`. All games registered here. |
| `src/games/trivia.js` | 5-question quiz (solo self-knowledge or partner trivia). Awards pet growth on round complete (daily cap). |
| `src/games/wyr.js` | Would You Rather (solo) / **Guess & Reveal** (partner, pass-the-phone: user guesses partner's pick → handoff → partner answers for real → reveal). Guess accuracy fills `gd.duo`; preferences update from the partner's ACTUAL answer. Question pool = local bank + `WYR_BONUS_QUESTIONS`. Pet growth every 5th answer (daily cap). |
| `src/games/dailyq.js` | Daily Duo (partner, both answer the same question + compare) / Daily Reflection (solo, one deeper question a day → `gd.reflection.entries`, echoed by journey drawer + Growth Compass). One per local day. Pet growth daily cap id `dailyq`. Replaced the old Vibe Match memory game. |
| `src/games/checkin.js` | Weekly Check-In ritual (once per 7 days): appreciation/friction/experiment (partner, friction options keyed to conflict style) or win/struggle/intention (solo) + optional note. Last week's third answer echoed at the next check-in. `gd.checkin.entries` (last 12). |
| `src/games/bingo.js` | Personality Sparks (solo) / Couple's Hot Takes (partner). Awards pet growth on full board (9 cells, daily cap). |
| `src/games/mood.js` | Daily Mood Check. One tap per day. Updates `gd.mood.today` (affects pet facial expression). Awards pet growth (daily cap). |
| `src/games/quicktakes.js` | 3-question rapid-fire round. Updates `wyr.preferences`. Awards pet growth per session (daily cap). |

**Dev Panel:** Click the gear icon (top-right) → password `Calgary1!` → unlocks for the browser session (sessionStorage, resets on tab close). Tools: navigation shortcuts, profile modifiers, mode override (solo/partner), day-advance simulation, pet growth award, unlock all milestones, profile export/import, live state inspector.

---

## AppState Shape

```js
window.AppState = {
  currentState: 'INIT' | 'PHASE_1' | 'PHASE_3_DAILY',
  currentStep: 0,         // onboarding step index
  soloMode: false,
  userProfile: {
    name, location, mbti,            // e.g. "INFP"
    attachmentStyle,                 // secure|anxious|avoidant|fearful
    conflictStyle,                   // collaborative|compromising|accommodating|avoiding
    loveLanguage,                    // words|time|service|touch|gifts
    expressionStyle,                 // direct|indirect|reflective|analytical
    relationshipStatus               // early|committed|cohabitating|longdistance
  },
  partnerProfile: { same minus location } | null,
  vibeSeed: '12345678',   // deterministic 8-digit number
  gameData: { ... },      // see schema below
  tempAnswers: { ... }    // raw onboarding input keyed by field id
}
```

## gameData Schema (SCHEMA_VERSION = 3)

```js
{
  schemaVersion: 3,
  trivia:     { correct, total, lastPlayed, categoryAccuracy: { mbti, loveLanguage, attachment, conflict, expression } },
  memory:     { completed, bestMoves, lastPlayed },   // legacy — game removed, key kept for old saves
  duo:        { rounds, guesses, correctGuesses, lastPlayed, history: [{type:'wyr'|'dailyq', ...}] },  // real dyadic data
  dailyq:     { answered, lastAnswered /* local date */, lastPlayed },
  reflection: { entries: [{date, question, answer}] /* last 30 */, lastAnswered },
  checkin:    { entries: [{date, mode, answers:[a,b,c], note}] /* last 12 */, lastCheckin /* local date */, lastPlayed },
  wyr:        { answered, lastPlayed, history: [{questionIndex, choice, textChosen}], preferences: {adventurous, homebody, planner, spontaneous, deep, lighthearted, independent, connected} },
  bingo:      { checked, lastPlayed, checkedCells: [] },
  sparks:     { checkedItems: [], lastPlayed },
  streak:     { current, lastOpenDate, longest, lastResetDate },
  milestones: [],        // string ids
  pet:        { user: PetData, partner: PetData | null, couple: CouplePetData | null },
  mood:       { today, lastChecked, streak, history: [{date, mood}] },
  quicktakes: { sessionCount, lastPlayed },
  petGrowthLog: { [gameId]: 'YYYY-MM-DD' }    // daily cap per game
}
```

**PetData:** `{ name, totalDays, lastSeen, stage: 1–5, mood, _baseProfile }`

**CouplePetData:** `{ totalDays, lastSeen, stage: 1–5, mood }` — no `name`; the couple's display name is always derived on the fly via `generateMergedName()`, never persisted. Only exists (non-null) in partner mode.

**Pet stages:** 0d=Newborn, 4d=Baby, 10d=Growing, 20d=Adult, 40d=Legendary. Past Legendary, growth doesn't cap — see **Ascension** below.

**Species archetypes:** `speciesArchetype(profile)` derives one of 4 body families from MBTI's Keirsey temperament groups (already exhaustive over all 16 types, no new profile field): NT→**Construct** (crystalline/angular — antennae, floating shards, shoulder plates), NF→**Wisp** (soft/flowing — a flame-tuft head, trailing tendrils, no limbs), SJ→**Guardian** (sturdy beast — round ears, paws, tail, mane), SP→**Flit** (small/winged — feather tufts, wing pairs, talons, tail streamers). `bodyVariant(profile)` then applies an attachment-style sub-variant (size/spikiness/asymmetry) on top — 4×4 = 16 distinct-looking pets. Each archetype's features scale up through real per-stage structural changes (`ARCHETYPE_STAGE_SHAPE`), not a uniform size multiplier — e.g. Construct gains one antenna per stage then floating orbiting shards at Legendary; Flit gains a second wing pair at Legendary.

**Pet appearance:** Color is a per-person hue (hashed from name/location/mbti/attachmentStyle) plus an attachment-style "mood" (S/L range + hue-shift bias), not a fixed palette — still via `derivePetVisuals()`, never persisted. Three **stackable pattern layers** render together (not just one): `patternA` (loveLanguage: spots/stripes/band/sparkle/none), `patternB` (expressionStyle: chevrons/freckles/rings/grid/none), and `edgeTreatment` (conflictStyle: glow-edge/dashed-outline/soft-outline/none, an outline treatment on the body's own rim rather than an interior mark) — 5×4×4 = 80 combinations.

**Item slots:** Head ladder unlocks purely by stage (bow tie→glasses→crown, unchanged). **Weapon** (`weaponSvg()`) is keyed to loveLanguage (5 icons: tome+quill/treasure+gem/hammer/shield/hourglass) and available at stage 5 to **both** solo and partner pets — solo gets an exclusive glowing "enchanted" tier (brighter metal/gem colors + glow ring) so the old solo-only perk still feels special. **Back/cape** only renders for Construct/Guardian, which don't have a natural back feature of their own (Wisp's tendrils and Flit's wings already occupy that visual space).

**Aura shapes:** `auraShapeSvg()` — a shape family keyed to attachment style, not an on/off glow: secure=steady double glow, anxious=flickering multi-ring (ring count varies with lucky number), avoidant=a detached ring of orbiting particles with a visible gap from the body, fearful=an asymmetric dashed/offset ring. Fades in faintly at stage 3, strengthens at stage 4, full intensity at stage 5 (`auraIntensityForStage()`).

**Lucky number:** `computeLuckyNumber(profile)` — deterministic per-person, per-day (pet seed + `todayLocal()` hash, same pattern as the rest of the file). Not persisted; recomputes naturally as the local day rolls over. Feeds the avoidant/anxious aura's particle/ring counts and is shown as a small badge in the pet drawer.

**Ascension (post-Legendary):** `ascensionTier(totalDays)` — every +25 days past day 40 is another uncapped tier. `ascensionFinish(tier)` maps it to a small looping prestige-color rotation (bronze→silver→gold→platinum→diamond→prism, then loops with an extra aura ring per lap via `ascensionRingsSvg()`) — the tier number climbs forever without needing infinite unique art. **Couple-pet fusion:** the couple pet's ring count is driven by `max(own ascension, user ascension, partner ascension)`, so an individual ascending alone still visibly changes the shared couple pet.

**Rare finish:** `isRareFinish(profile)` — a small permanent per-profile chance (~1/20, deterministic from the pet's own seed) of a two-tone shiny gradient + sparkle (reuses the couple pet's shiny-gradient renderer) instead of the normal solid palette. The Pokémon-shiny pattern; shown as a "✦ Rare Finish" badge in the drawer.

**Bond, quirks, identity:** `computeBondLevel()` counts how many of the 7 games have ever been played (derived from existing `gameData`, not a new field) — a second progress axis alongside Stage that rewards variety over raw visit count. `computeQuirkOfDay()` gives a ~1-in-3-day deterministic character flourish surfaced through the pet-reaction affirmation slot. `derivePetIdentity()` gives a few small deterministic "facts" (favorite color/quirk/favorite activity) shown in an "About" card in the drawer, so the pet reads as a character with its own tiny profile rather than a stat block.

**Pet growth sources:**
- Daily visit: +2 (solo), +1 (partner), +1 (couple pet, partner mode only)
- Each game win/completion: +1 (daily cap via `petGrowthLog`) — applies to user, partner, *and* couple pet simultaneously; no per-game code needed for the couple pet, it rides the same `awardPetGrowth()` call
- Games with daily cap: `trivia`, `wyr`, `sparks`, `mood`, `quicktakes`, `dailyq`, `checkin`

**Couple pet — Chimera, independent growth + shiny:** Unlike the two individual pets, `gd.pet.couple` is NOT derived as `min(userStage, partnerStage)` — it has its own persisted `totalDays`/`stage`, ticked once per day in partner mode (`tickCouplePet()`) and bumped by every `awardPetGrowth()` call. It can lag or lead the two individual pets. Visually it's a **Chimera**: the user's own archetype as the primary body, plus one accent feature borrowed from the partner's archetype family (`deriveCoupleVisuals()`'s `secondaryArchetype`) — a genuine hybrid silhouette, not just an averaged color. Once it independently reaches stage 5, it renders "shiny legendary": a 5-stop gradient blending both partners' actual hues (instead of the flat averaged blend used at stages 1-4) plus a static sparkle overlay, and earns the `pet_couple_shiny` milestone.

**Pet mood:** individuals derive from `gd.mood.today` (glowing→excited, curious→curious, chill/low→happy, fired→excited, tense→curious), falling back to game-based derivation if no mood check. The couple pet uses `deriveCoupleMood()` instead — it checks real relationship signals first (a Weekly Check-In within the last 3 days → excited; ≥5 duo guesses with ≥70% accuracy → proud, <40% → curious) before falling back to the same generic derivation, so it reads as responding to the relationship itself rather than just leveling up in parallel with it.

---

## Key Patterns

**Adding a new game:**
1. Create `src/games/mygame.js` exporting `{ id, title, renderDrawer, init, bindWindow }`
2. Import and register in `src/games/index.js`
3. Add a card to `index.html` with `onclick="openDrawer('mygame')"`
4. Import `canAwardPetGrowthToday`, `recordPetGrowthToday` from `state.js` and `awardPetGrowth` from `pet.js` for growth awards

**Saving game data:** Always call `saveGameData()` from `state.js` after mutating `window.AppState.gameData`. This persists to localStorage, syncs to cloud (fire-and-forget), re-hydrates dashboard, and re-renders pet section.

**Daily growth cap:** Before calling `awardPetGrowth`, check `canAwardPetGrowthToday(gameId)` and call `recordPetGrowthToday(gameId)`. Use a consistent `gameId` string per game.

**Inline onclick handlers:** All game functions must be bound to `window.*` in the game's `bindWindow()` method. No event delegation.

**Profile keys:** `tempAnswers` keys during onboarding: `attachment`, `conflict`, `expression`, `loveLanguage` (no `Style` suffix). `userProfile` keys: `attachmentStyle`, `conflictStyle`, `expressionStyle`, `loveLanguage`. The mapping happens in `finalizeEngineData()`.

**Solo vs partner mode:** Check `window.AppState.soloMode || !window.AppState.partnerProfile` everywhere. Partner panel in spotlight grid is hidden via `#partner-spotlight-panel display:none` when solo.

---

## Supabase

- **Table:** `user_sessions` — columns: `id` (uuid PK), `device_id` (text, UNIQUE index — required by the upsert's `onConflict:'device_id'`), `profile_data` (jsonb), `schema_version` (int), `updated_at` (timestamptz), `save_code` (text, nullable, plain index — a code can be shared across multiple device rows)
- **RLS:** writes open (insert/update `WITH CHECK (true)` — device_id is the opaque access key). **Reads are NOT open**: no SELECT policy; lookups go through `SECURITY DEFINER` RPCs `get_session_by_device(p_device_id)` and `get_session_by_code(p_code)` which return only the single row matching the exact key. No DELETE policy (app never deletes).
- **Strategy:** localStorage is always source of truth locally, but startup is newest-wins across THREE sources: local, this device's cloud row, and the newest row sharing the save code (that last one is what keeps two devices in sync). Freshness compares `lastSavedAt` (full ISO timestamp, stamped by every save path); `cachedDate` remains day-granular for streak logic only.
- **Device ID:** Random UUID stored in `localStorage['vibeDeviceId']`, generated once.
- **Save code:** A PERMANENT random 8-char base32 key (`VIBE-XXXX-XXXX`), minted once at onboarding completion via `crypto.getRandomValues` — never regenerated, not derived from anything. Profile edits cloud-sync under the same code. Restore = `cloudLoadByCode()` → newest row. There is no hash verification (the old hash check was circular); "row found" is the verification.
- **Migrations must be applied to the Supabase project** before shipping client changes that depend on them — the RPC-based reads fail against a DB without `20260714210000_lockdown_reads_and_fix_upsert.sql`.

---

## Milestone IDs

`trivia_first`, `trivia_perfect` (≥10 total, 100%), `trivia_master` (≥15, ≥80%), `wyr_5`, `wyr_10`, `wyr_25`, `dailyq_first`, `dailyq_7`, `duo_reader` (≥10 guesses, ≥70% right), `checkin_first`, `checkin_4`, `bingo_3`, `bingo_row`, `streak_3`, `streak_7`, `mood_first`, `mood_consistent` (5-day mood streak), `quicktakes_first`, `quicktakes_pattern` (5 sessions), `pet_baby` (4d), `pet_adult` (20d), `pet_legendary` (40d), `pet_couple_shiny` (couple pet independently ≥40d, partner mode only). Legacy (labels kept, checks removed with the memory game): `memory_first`, `memory_sharp`.

New milestone IDs must be added in **three** places or the label silently regresses to the raw id: `MILESTONE_CHECKS` (state.js), `MILESTONE_LABELS` (state.js), and `getMilestoneLabel()` (insights.js) — a separate hardcoded map. This has bitten the codebase before (see Known Bugs).

---

## Data Flow Map

This maps how profile values and game results flow through the system. Use this to find where a field is read/written before touching it.

### Profile → Insights (personalization)
| Profile field | Where read | What it personalizes |
|---|---|---|
| `userProfile.attachmentStyle` | `insights.js` `generateDayAtAGlance`, `generateSpotlightLists` | daily body copy (keyed pool), spotlight DO tips |
| `userProfile.loveLanguage` | `insights.js` `generateSpotlightLists`, `generateDeepInsight('decoder')` | DO tip pool, love language drawer body |
| `userProfile.expressionStyle` | `insights.js` `generateSpotlightLists` | DON'T tip pool |
| `userProfile.relationshipStatus` | `insights.js` `generateSpotlightLists` | bonus relationship tip (every 4th offset) |
| `userProfile.mbti` | `insights.js` `generateDeepInsight('vibe')` | vibe drawer personality note |
| `userProfile.name` | `dashboard.js` `hydrateDashboardViews`, header | displayed name everywhere |
| `partnerProfile.*` | `insights.js` (partner branches), `dashboard.js` | partner spotlight tips, partner name in header |

### Game Results → Profile Personalization
| Game | Writes to | Affects |
|---|---|---|
| Trivia | `gd.trivia.categoryAccuracy[cat]` | `getWeakestCategoryLabel()` → spotlight DON'T tips, groove drawer, Growth Compass blind spot |
| WYR / Guess & Reveal | `gd.wyr.preferences` (from the REAL answerer) + `gd.duo` (guess accuracy) | `deriveWyrPersonalityLabel()` → pill + vibe drawer; duo accuracy → Connection metric, Growth Compass, game insights |
| Daily Duo / Reflection | `gd.duo.history` (partner) / `gd.reflection.entries` (solo) + `gd.dailyq` | journey drawer echo, Growth Compass, Synchrony metric participation bonus |
| Weekly Check-In | `gd.checkin.entries` | next check-in's echo, game insight sentences |
| Mood Check | `gd.mood.today` + `gd.mood.history` | Day at a Glance mood note + 7-day trend note (`analyzeMoodTrend`); pet expression; Growth Compass recovery edge |
| QuickTakes | `gd.wyr.preferences` + `gd.wyr.history` (same object, saves per answer) | same as WYR above |
| Bingo | `gd.bingo.checkedCells` | game insight sentences |
| All games | `gd.streak.current` | blueprint text, deep journey drawer, streak badge in header |

### Key naming: Three contexts for the same trait
```
tempAnswers['attachment']        ← short key (onboarding + profile settings save)
userProfile.attachmentStyle      ← long key (stored profile)
gd.trivia.categoryAccuracy.attachment ← short key (game data)
```
The mapping from short→long happens ONLY in `finalizeEngineData()` in `profile-builder.js`.
The inverse (long→short) is NEVER needed — reading insights always uses `userProfile.*` long keys.

### Pet growth pipeline
```
game completes
  → canAwardPetGrowthToday(gameId)  [state.js]
  → recordPetGrowthToday(gameId)    [state.js]
  → awardPetGrowth(1)               [pet.js]
  → bumps gd.pet.user, gd.pet.partner (if present), AND gd.pet.couple (if present) in parallel
  → pet.totalDays++ triggers stage upgrade
  → pet stage: 0d=Newborn, 4d=Baby, 10d=Growing, 20d=Adult, 40d=Legendary
```
Daily visit awards +2 (solo) or +1 (partner) automatically in `initPet()`; the couple pet also gets +1/day (partner mode only) via `tickCouplePet()`. The couple pet's stage is independent of the two individual pets' stages — it renders "shiny legendary" (gradient + sparkle) once its own `stage` hits 5, regardless of where the individual pets are.

---

## Known Bugs / Open Work

_Add confirmed bugs here with file:line. Mark [FIXED] when resolved._

| Status | Description | File |
|---|---|---|
| FIXED | The solo Legendary weapon (sword) was positioned at `cx - r*.86`, inside the body ellipse's own horizontal radius (`rx=r`) — for most of its length it was painted over by the body fill drawn afterward, leaving only a tiny sliver of the tip visible. Replaced with a weapon slot held at `cx - r*1.14` (outside `rx`), also extended to partner mode. | `pet.js` |
| FIXED | Guardian archetype's paws/mane-ruff and Flit archetype's legs used fixed `r`-relative offsets that assumed `ry≈r`; for archetypes with a notably smaller or larger `ry` than `r`, those features landed inside the body ellipse and were entirely hidden by the body fill. Repositioned relative to the actual `ry` at render time. | `pet.js` |
| FIXED | Trivia question category strings used `attachmentStyle` etc. instead of `attachment` | `trivia.js` |
| FIXED | `insights.js` `getWeakestCategoryLabel` had wrong key names — tips never surfaced | `insights.js` |
| FIXED | Dead import `pickByProfile` in `insights.js` | `insights.js` |
| FIXED | Vibe drawer used local `deriveWyrLabel` instead of `engine.deriveWyrPersonalityLabel` | `insights.js` |
| FIXED | `dashboard.js` had local duplicate `deriveWyrLabel` function | `dashboard.js` |
| FIXED | Stray `</div>` in partner branch of `hydrateSandboxSection` | `dashboard.js` |
| FIXED | `getMilestoneLabel` in `insights.js` missing new milestone IDs | `insights.js` |
| FIXED | `mood.today` not wired to Day at a Glance insight text | `insights.js` |
| FIXED | `relationshipStatus` not wired to spotlight tips | `insights.js` |
| FIXED | `getMbtiPairing`/`getMbtiSelf` not called in vibe drawer | `insights.js` |
| FIXED | Vibe drawer relied on `gd._cachedMetrics` fallback instead of live calculation | `insights.js` |
| FIXED | Step 0 welcome used `devForceDashboard()` (fake data) as user-facing button | `profile-builder.js` |
| FIXED | `awardPetGrowth` never called `saveGameData()` — pet growth evaporated on reload | `pet.js` |
| FIXED | `partnerProfile` initialized as `{}` (truthy) instead of `null` — broke solo/partner detection | `state.js`, `dev-tools.js` |
| FIXED | Stale `mood.today` from previous day shown all day — not reset at day boundary | `app.js` |
| FIXED | `initPet` double-rendered pet section (`saveGameData` + direct `renderPetSection` call) | `pet.js` |
| FIXED | `wyr.js` had local duplicate `deriveWyrLabel` — divergence risk | `wyr.js` |
| FIXED | Partner-mode bingo (`toggleHotTake`) never awarded pet growth on full board | `bingo.js` |
| FIXED | `quicktakes.js` incremented `wyr.answered` but never updated `wyr.lastPlayed` | `quicktakes.js` |
| FIXED | `dashboard.js` wrote `_cachedMetrics` into persisted game data (bloat) | `dashboard.js` |
| FIXED | Dead import `pickFromPool` in `insights.js` | `insights.js` |
| FIXED | Dev tool fake profiles missing `relationshipStatus` — relationship tip pool never tested | `dev-tools.js` |
| FIXED | `gameRegistry.bindAll()` never called — no game click handler was bound to `window.*`, every game unplayable | `app.js` |
| FIXED | `saveGameData()` regenerated the save code + cloud-synced on every gameplay action instead of only on identity changes | `state.js` |
| FIXED | `saveProfileSettings()` edited identity fields but never regenerated the save code or synced to cloud | `drawers.js` |
| FIXED | `cloudSave()` read `payload.schemaVersion` (doesn't exist) instead of `payload.gameData.schemaVersion` — `schema_version` column always wrote `1` | `supabase.js` |
| FIXED | Unique index on `save_code` broke second-device sync — upsert keyed by `device_id` collided with the constraint once a code was shared across devices | `supabase/migrations/`, `supabase.js` |

---

## Changelog

### 2026-07-15 — Pet Evolution Overhaul: Species Archetypes, Stackable Patterns, Ascension, Emotional Depth

Full creative overhaul of the virtual pet system across 7 phases, all in `src/pet.js` (plus `styles.css` sizing). No `SCHEMA_VERSION` bump — every addition is fully derived at render time from data already in `gameData`/the profile, the same guarantee every prior pet visual change made (see `migratePetData()`, unchanged).

**Phase 0 — Sizing.** Stage sizes bumped ~60-70% (56–88px → 76–140px); `.pet-full-display` bumped to 176px; fixed `renderPetDrawer()` to render at the actual stage size instead of a flat `90px` it had been silently ignoring.

**Phase 1 — Species archetypes.** `speciesArchetype()` derives one of 4 body families (Construct/Wisp/Guardian/Flit) from MBTI's 4 Keirsey temperament groups (exhaustive over all 16 types, no new field); `bodyVariant()` layers an attachment-style sub-variant on top (16 total). Each archetype gets its own per-stage feature builder (`ARCHETYPE_STAGE_SHAPE` + `archetypeFeaturesSvg()` dispatch) so evolution is a real structural change per stage. Couple pet becomes a **Chimera**: primary body from the user's archetype plus one accent feature borrowed from the partner's family. Added `__internals` export + a Node-based (no browser) visual QA harness using `sharp` to rasterize SVGs during development — caught and fixed two real hidden-geometry bugs (see Known Bugs) that predated this change.

**Phase 2 — Stackable patterns.** Split the old single loveLanguage-only pattern into 3 independent layers: `patternA` (loveLanguage, unchanged vocab), `patternB` (expressionStyle: chevrons/freckles/rings/grid, new), `edgeTreatment` (conflictStyle: glow-edge/dashed-outline/soft-outline, new — an outline treatment on the body's rim). 80 combinations instead of 5.

**Phase 3 — Item slots.** Weapon slot (`weaponSvg()`, keyed to loveLanguage) extended from solo-only to **both** solo and partner mode, with solo keeping an exclusive glowing "enchanted" tier. Cape now only renders for Construct/Guardian (archetypes without their own natural back feature) instead of unconditionally for every archetype.

**Phase 4 — Aura shapes + Lucky Number.** Aura became a shape family keyed to attachment style instead of one on/off glow, fading in from stage 3. `computeLuckyNumber()` — deterministic per-person-per-day, feeds the aura's particle/ring counts and shown in the drawer.

**Phase 5 — Ascension + rare finish.** Growth no longer caps at Legendary: `ascensionTier()` gives uncapped tiers every +25 days past day 40, each layering a looping prestige-color finish (`ascensionFinish()`). Couple-pet fusion: couple pet's ring count reflects `max()` of both individuals' ascension, so one partner ascending alone visibly changes the shared pet. `isRareFinish()` adds a small permanent per-profile "shiny" chance reusing the couple pet's existing gradient renderer.

**Phase 6 — Emotional depth.** `deriveCoupleMood()` reads real relationship signals (Check-In recency, duo guess accuracy) before falling back to generic thresholds. `computeBondLevel()` (breadth of games played, derived not persisted), `computeQuirkOfDay()` (small daily character flourish), `derivePetIdentity()` (favorite color/quirk/activity) — all surfaced in the drawer, all fully derived.

**Phase 7 — Regression pass.** Stress-tested all 16 archetype×attachment combos × 5 stages × several ascension tiers × both modes, plus edge-case profiles (empty/null/unusual-casing fields) and a determinism check (identical profile → identical output) — 1071 checks, 0 failures, 0 exceptions. `npm run build` verified clean after every phase.

### 2026-07-14 — Full Overhaul: Security, Sync, Personalization Depth, Real Partner Games (SCHEMA_VERSION 3)

Four-phase overhaul from the architecture review (all approved by owner; clean break allowed, Vibe Match replaced).

**Phase A — data foundation**
- `supabase/migrations/20260714210000_lockdown_reads_and_fix_upsert.sql`: dropped open SELECT/DELETE policies (anyone with the shipped anon key could enumerate every user's profile); reads now via `SECURITY DEFINER` RPCs keyed by exact device_id/save_code. Also deduped `device_id` and added the UNIQUE index that `cloudSave()`'s `onConflict:'device_id'` upsert always required — cloud saves had been silently failing without it.
- `save-code.js`: save code is now a permanent random key minted once (was: SHA-256 of identity fields, silently churning on every profile edit and stranding written-down codes). Circular `verifySaveCode` removed. Profile-settings saves no longer regenerate anything.
- `app.js` startup: newest-wins across local / device row / newest row sharing the save code, compared by new full-timestamp `lastSavedAt` — cross-device restore became continuous sync.
- `state.js`: `todayLocal()`/`isToday()`/`daysBetween()`; every date key (streaks, mood reset, pet caps, pet ticks) switched from UTC to local calendar day.

**Phase B — message engine (selects → computes)**
- `content-bank.js`: `COMBO_INSIGHTS` (attachment×loveLanguage), `ATTACHMENT_PAIRINGS` (4×4 ordered), `CONFLICT_PAIRINGS` (sorted-pair keyed, order-neutral), `CONFLICT_SOLO`, `GROWTH_AREAS`. Some pool strings now carry `{name}`/`{partner}` tokens. Dead `pickFromPool`/`pickByProfile` removed.
- `insights.js`: `fillTemplate()` applied at every generator's output; `analyzeMoodTrend()`/`analyzeWyrLean()` consume the previously-unread `mood.history` and preference counts; daily glance rotates combo + pairing bodies; groove finally uses BOTH partners' conflict styles; vibe adds the attachment pairing; journey echoes mood trends + Daily Reflections; time-of-day theme wired in (dead `getTimeGreeting` removed).
- New `growth.js` — Growth Compass card + drawer (see File Map).

**Phase C — games produce real data**
- `wyr.js` partner mode → Guess & Reveal (pass-the-phone). `gd.duo` guess accuracy is the app's first honest dyadic measurement; preferences update from the partner's actual answers.
- New `dailyq.js` (Daily Duo / Daily Reflection) replaces deleted `memory.js` (zero-insight filler). New `checkin.js` Weekly Check-In ritual — the one deliberately relationship-BUILDING mechanic.
- `engine.calculateLiveMetrics`: Connection bonus = real duo accuracy once ≥5 guesses (falls back to trivia); Synchrony memory bonus → daily-question participation.
- Chronicles (`drawers.js`) result lines scripted from both conflict styles instead of `Math.random`; unused `mbti` param dropped from `executeScenarioSimulation`.
- Wired long-dead content: `WYR_BONUS_QUESTIONS` into the WYR pool, `EXTRA_SPARKS_*` into bingo builders. `quicktakes.js` saves per answer + logs `wyr.history`.
- New milestones registered in all three places: `dailyq_first`, `dailyq_7`, `duo_reader`, `checkin_first`, `checkin_4`. Memory milestones = legacy labels only.

**Phase D — shell + hygiene**
- `index.html`: real title, "Getting Started" header fallback, jargon fallback tips replaced, PWA manifest/icon links, new game cards.
- `public/manifest.json` + `public/sw.js` (network-first cache shell, never touches Supabase requests) + `public/icon.svg`; SW registered from `app.js` (prod only).
- Keyboard a11y: MutationObserver stamps `tabindex`/`role=button` on card controls after every innerHTML render; global Enter/Space activation; `:focus-visible` outlines.
- `dist/` untracked + gitignored; `TEST-PUSH-CHECK.md` deleted.
- Verified end-to-end with a Playwright smoke run (solo onboarding → all drawers → all games → partner mode Guess & Reveal → reload persistence): 25/25 assertions, zero console errors.

### 2026-07-14 — Per-Profile Content Seeding (Fix Cross-User Collisions) + Bigger Knowledge Bank

**Problem:** every rotation formula in `insights.js` was keyed only by time (day/hour) and game progress, never by profile identity. A brand-new account has `trivia.total = 0` and `wyr.answered = 0`, so two different new users with the same attachment style, checking the app in the same hour, landed on the literal same headline/body/blueprint/spotlight-tip/deep-insight — the app looked identical for different people.

**insights.js**
- Added `computeContentSeed(profile)` — a local DJB2-style hash blending name/location/mbti/attachmentStyle/loveLanguage/expressionStyle into a stable per-person number (same pattern as `pet.js`'s `computePetSeed`, kept separate/local rather than shared, matching that module's own precedent). Folded into every pool-index calculation: `generateDayAtAGlance` (headline + body), `generateSpotlightLists` (dos/donts, using the user's own seed for their side and the partner's own seed for theirs), `generateBlueprint`, and `generateDeepInsight` (all four types).
- Added `computeCoupleSeed(userProfile, partnerProfile)` (XOR of both individual seeds) for content that represents "the two of you" jointly in partner mode (Blueprint, the four deep-insight drawers) — so different couples diverge even if they happen to share one member, while `decoder`'s per-person practical-tip picks still use each individual's own seed since that content is specifically about them.
- Verified: two profiles with identical traits/zero game progress now get different content; the same profile reliably reproduces the same content (deterministic per-identity, not random) — matches the intent that trait-tied content can legitimately recur for people sharing that trait, it's the coincidental cross-person collisions that were the bug.
- `generateDayAtAGlance` also occasionally cross-pollinates with a concrete Spotlight tip (`Try this: ...`) — free extra variety since it reuses existing content instead of needing new pool entries.

**content-bank.js**
- Expanded the thinnest pools: `DAILY_BODIES_SOLO`/`DAILY_BODIES_PARTNER` from 5 to 8 entries per attachment style; all four `DEEP_*_SOLO`/`DEEP_*_PARTNER` pools (groove/journey/decoder/vibe) from 5 to 7 entries each.

No `SCHEMA_VERSION` bump — content-selection-only change, no `gameData` shape changed.

### 2026-07-14 — Message/Insight Tone Rewrite + Attribution Fixes + Fun Additions

**questions.js**
- Rewrote every onboarding question's `title`/`question`/`desc` from stiff clinical/corporate phrasing ("Select or build the exact MBTI matrix configuration," "Tactile safety and grounding connection," "Processing variables offline") to plain, warm language. `value` fields (`secure`, `direct`, `words`, etc.) are unchanged — they're lookup keys used throughout `content-bank.js`, `pet.js`, milestone checks, and dev-tools.
- Renamed the MBTI question's title from "Your Personality Type" to "Personality Type" — the literal word "Your" was found to trigger a pre-existing, previously-dormant bug in `renderPsychQuestionBlock()` (`profile-builder.js`) that unconditionally does a `.replace("Your", ...)` on titles regardless of the `isPartner` flag. No original title contained "Your" so the bug never fired before. The `renderPsychQuestionBlock` bug itself is left as-is — that function's partner-branching is slated for a full rewrite when the deferred "solo-only onboarding" plan lands.

**profile-builder.js**
- Rewrote the 4 relationship-status card descriptions ("Exploring dynamics and initial compatibility variables," "Unified residential planning and daily tactical tasks," etc.) to plain language. `val` args (`early`, `committed`, `cohabitating`, `longdistance`) unchanged.
- Swapped the pre-onboarding header text "Unified Interface State" → "Getting Started", and the relationship-status submit button "Complete Configuration" → "Finish Up".

**content-bank.js**
- Removed a clinical citation line in `DEEP_DECODER_PARTNER` ("The research on relationships is pretty consistent...") — reworded without citing "the research."
- Expanded `SPOTLIGHT_DONTS` from 4 to 8 entries per expression style (was repeating within 4 views).
- Added `MBTI_FRAGMENTS` — a small per-letter phrase pool (8 letters × 3 fragments) assembled combinatorially by `insights.js`'s `assembleMbtiFlavor()`, giving MBTI-flavored variety without needing 16 separate full-type pools.

**insights.js**
- Fixed `generateDeepInsight('decoder')`: previously only ever referenced the primary user's `loveLanguage` even in partner mode, despite the drawer subtitle claiming to cover "what makes each of you feel seen." Now references both partners' love languages by name in partner mode.
- Fixed `generateSpotlightLists`'s `weakCat` handling: the weakest-trivia-category value comes from a single shared `gd.trivia.categoryAccuracy` object (not per-person data), but was previously surfaced twice — once phrased as the user's individual "don't" and again phrased as the partner's individual "do" — presenting one shared stat as if it were two people's separate data. Now surfaced once, explicitly framed as joint ("You two could dig into...").
- `generateDayAtAGlance`: mood-aware notes now interpolate the user's actual name when available (previously the `uName` variable was computed but never used — no body copy anywhere except `generateChronicleScenario` ever said the person's name). Added an occasional MBTI-flavored bonus line via `assembleMbtiFlavor()`.
- `generateBlueprint`: also gets an occasional MBTI-flavored line, since it was previously 100% generic pool content that never reflected anything specific about the person/couple.
- Day at a Glance / Blueprint rotation intentionally left on its existing deterministic date+behavior-driven formula (not converted to a shuffle-bag) — that's a different, purpose-built design (content evolves with the actual day/game-progress) from the "clicking a refresh button repeats within a few clicks" problem that motivated the pet.js shuffle-bag below.

**pet.js**
- Expanded `AFFIRMATIONS` (7→10 per style) and `WARNINGS` (6→9 per style) — was 52 total messages, repeating within about a week of daily use with a mechanical warning/affirmation flip every 3rd click.
- Replaced `pickAffirmation()`'s `(offset + streak) % pool.length` rotation with a shuffle-bag (`_drawFromBag`/`_shuffledIndices`) that never immediately repeats and drops the old mechanical 3-click pattern; pool selection (affirmation vs. warning) now uses weighted randomness instead of a fixed offset formula. Result is memoized per `_affirmOffset` value so incidental re-renders (any `saveGameData()` call, not just an explicit "New Message" tap) don't silently swap the visible text.
- Added `pickPetReaction(gameData)`: on the first affirmation view of a session, reacts to something that actually happened today (mood check, a game played, a streak just extended) instead of always pulling from the generic pool — falls back to `pickAffirmation()` once the user taps "New Message" or nothing notable happened today.
- Fixed the partner-mode "wrong person" pet complaint: the single shared affirmation block (sourced only from the primary user's `attachmentStyle`, generically labeled "Today for you") sits beneath both pet cards in partner mode with nothing tying it to either pet. The label now explicitly names who it's about (`Today for ${name}` / `From ${petName}` for reactions).

No `SCHEMA_VERSION` bump — all changes are content/rendering-level; no `gameData` shape changed.

### 2026-07-14 — Procedural Pet Evolution + Solo Weapon + Shiny Couple Pet

**pet.js**
- Pet appearance is no longer a fixed 4-color palette (`PET_COLORS`) keyed only to `attachmentStyle`. Replaced with `derivePetVisuals(profile)`: a deterministic per-person hue (hashed from name/location/mbti/attachmentStyle via a new pet-local `computePetSeed()`/`hashString()`, deliberately not reusing `engine.computeDeterministicSeed()`/`AppState.vibeSeed`) combined with an attachment-style "mood" (`ATTACHMENT_PALETTE_MOOD` — S/L ranges + hue-shift bias). MBTI E/I picks ear shape (`earShapeVariant`); `loveLanguage` picks a pattern overlay (`patternType` → spots/stripes/band/sparkle/none, drawn clipped to the body via `patternOverlaySvg`).
- Added `STAGE_SHAPE` table so all 5 growth stages change body proportions (`ryMul`), ear size (`earMul`), and add limbs (`limbsSvg`, stages 2+) and an aura glow (`auraSvg`, stage 5) — not just overall scale. `accessorySvg()` (bow tie/cape/glasses/crown/milestone extras) is unchanged and layers on top.
- `buildPetSvg()` signature changed from `(colors, stage, mood, size, ...)` to `(visuals, stage, mood, size, milestones, isCouple, isSolo)`.
- **Solo-only Legendary weapon**: at stage 5, a pet built with `isSolo: true` additionally renders a weapon accessory (blade/crossguard/grip/pommel) alongside the crown. Threaded from `renderPetSection()`/`renderPetDrawer()`'s existing `solo` flag — partner-mode individual pets never get it, even at stage 5.
- **Couple pet now independently persisted**: `gd.pet.couple` (`{ totalDays, lastSeen, stage, mood }`) replaces the old `Math.min(userStage, partnerStage)` derivation. New `makeCouplePetData()`/`tickCouplePet()` (+1/day, partner mode only) mirror the existing user/partner pattern; `awardPetGrowth()` now bumps `gd.pet.couple` alongside `user`/`partner` for free — no per-game code changes needed. The couple pet can lag or lead the two individual pets.
- **Shiny legendary**: once the couple pet's own `stage` reaches 5, `buildPetSvg()` swaps its flat `blendColors()` fill for a 5-stop gradient blending both partners' actual hues (`deriveCoupleVisuals()`'s new `shinyColors`) plus a static sparkle overlay (`shinySparkleSvg()`).
- `migratePetData()` now also defaults/backfills `gd.pet.couple`.

**state.js**
- `defaultGameData()`'s `pet` field now includes `couple: null`.
- New milestone `pet_couple_shiny` (couple pet independently reaches stage 5) added to `MILESTONE_CHECKS` and `MILESTONE_LABELS`.

**insights.js**
- `getMilestoneLabel()` — added `pet_couple_shiny: 'Shiny Bond'` (this map is separate from `state.js`'s `MILESTONE_LABELS`; missing an id here was a past bug, see Known Bugs).

No `SCHEMA_VERSION` bump — purely additive to `gameData.pet`, defensively backfilled by `migratePetData()` exactly like prior additions (`petGrowthLog`, `quicktakes`, `sparks`). Pet appearance was never persisted, so existing users simply see a different (more unique) pet on next render — no migration needed.

### 2026-07-14 — Save Code Feature Fix Pass

**app.js**
- Added the missing `gameRegistry.bindAll()` call — this had been dropped while wiring in the save-code feature, leaving every game's inline `onclick` handlers unbound (`ReferenceError` on any tap).

**state.js**
- `saveGameData()`: removed the `generateSaveCode()` call that ran on every gameplay save (trivia answer, mood tap, etc.). Now just calls `cloudSave(parsed, window.AppState.saveCode)` with the already-known code — the code is derived only from identity fields and doesn't need to change on gameplay.

**drawers.js**
- `saveProfileSettings()`: now regenerates the save code and cloud-syncs after identity fields (attachment/conflict/love language/expression) are edited — previously this path wrote straight to localStorage and never touched the code or cloud at all.

**supabase.js**
- `cloudSave()`: fixed `schema_version` to read `payload.gameData.schemaVersion` instead of the nonexistent `payload.schemaVersion` (was always writing `1`).
- `cloudLoadByCode()`: orders by `updated_at` descending and takes the first row instead of `.maybeSingle()`, since `save_code` is no longer unique across rows.

**supabase/migrations/**
- New migration drops the unique index on `user_sessions.save_code` and replaces it with a plain index — the unique constraint made second-device restore silently fail every subsequent sync (upsert is keyed by `device_id`, so two devices sharing a save code violated uniqueness).

**profile-builder.js**
- Corrected a misleading comment on the post-restore `cloudSave()` call (it upserts the current device's own row, not the original device's row).

**CLAUDE.md**
- Added `src/save-code.js` to the File Map, documented the `save_code` column and save-code regeneration policy under Supabase.

### 2026-07-13 — Bug Fix + Deduplication Pass

**trivia.js**
- Fixed all 6 question `category` strings: `attachmentStyle→attachment`, `conflictStyle→conflict`, `expressionStyle→expression`. Removed `CAT_MAP` workaround.

**insights.js**
- Removed dead import `pickByProfile`. Added `import { engine }`.
- Fixed `getWeakestCategoryLabel` key names.
- Added missing milestone IDs to `getMilestoneLabel`.
- Removed local `deriveWyrLabel` — now calls `engine.deriveWyrPersonalityLabel`.
- `generateDayAtAGlance`: wired `gd.mood.today` to append mood-aware note.
- `generateSpotlightLists`: wired `userProfile.relationshipStatus` to bonus tip pool.
- `generateDeepInsight('vibe')`: wired `getMbtiSelf`/`getMbtiPairing`, live metrics calculation.

**dashboard.js**
- Fixed stray `</div>` in partner branch of `hydrateSandboxSection`.
- Removed local `deriveWyrLabel` — now calls `engine.deriveWyrPersonalityLabel`.

**profile-builder.js**
- Step 0 welcome: replaced `devForceDashboard()` button with conditional "Continue Where You Left Off" (only shown if localStorage has saved profile). Removed dev jargon from step labels.

**app.js**
- Added `window.loadSavedProfile` binding to support the Continue button on step 0.

### 2026-07-13 — Full Robustness Pass

**State / Persistence**
- `state.js`: SCHEMA_VERSION bumped to 2. Added `migrateGameData()` for backward compat (renames `attachmentStyle→attachment` etc. in `categoryAccuracy`). Added `petGrowthLog` field. Added `canAwardPetGrowthToday()` / `recordPetGrowthToday()`. `saveGameData()` now calls `cloudSave()`. New milestones: mood_first, mood_consistent, quicktakes_first, quicktakes_pattern, pet_baby, pet_adult, pet_legendary. `trivia_perfect` now requires ≥10 total answers.
- `supabase.js`: Created — Supabase client singleton, device UUID, `cloudSave()`, `cloudLoad()`.
- `app.js`: Startup now async — tries cloud load and picks newer data between cloud and local. Calls `migrateGameData()` on restore.

**Profile Builder**
- `profile-builder.js`: Input labels changed to plain language ("Your full name", "Your city or region", "Your partner's name"). `finalizeEngineData()` now saves `relationshipStatus` to `userProfile`.

**Drawers**
- `drawers.js`: Fixed Profile Settings regression — `saveProfileSettings` now writes correct tempAnswers keys (`attachment`, `conflict`, `expression`). Added `window.initPet()` call after save so pet re-initializes with updated profile.

**Engine**
- `engine.js`: `generateSoloVibeName()` redesigned — now produces natural two-word names like "Alex Soleil", "Nova Verse" instead of jargon strings.

**Pet**
- `pet.js`: `deriveMood()` now reads `gd.mood.today` first (maps mood check results to pet expressions) before falling back to game-based derivation.

**Games — Daily Cap System**
- All games now use `canAwardPetGrowthToday(gameId)` / `recordPetGrowthToday(gameId)` before awarding growth.
- `mood.js`: Daily cap added.
- `quicktakes.js`: Daily cap added. Import updated.
- `memory.js`: Daily cap added.
- `wyr.js`: Added `awardPetGrowth(1)` every 5th answer (daily cap). Fixed two inert questions.
- `bingo.js`: Added `awardPetGrowth(1)` when full board (9 cells) checked (daily cap).
- `trivia.js`: Added `awardPetGrowth(1)` on round completion (daily cap).

### 2026-07-13 — Correctness and Data Integrity Pass

**pet.js**
- `awardPetGrowth()`: replaced `renderPetSection()` with `saveGameData()` — pet growth now persists across reloads.
- `initPet()`: removed redundant direct `renderPetSection()` call after `saveGameData()` (which already re-renders via `window._renderPetSection`).

**state.js**
- `partnerProfile` initial value changed from `{}` to `null` — fixes solo/partner detection everywhere on fresh load.

**dev-tools.js**
- `clearProfileCache()`: `partnerProfile` reset changed from `{}` to `null`.
- `syncDevInputs()`: added optional chain `partnerProfile?.name` to guard against null.
- `devForceDashboard()`: added `relationshipStatus: 'committed'` to fake user profile so relationship tip pool is testable.

**app.js**
- Both `DOMContentLoaded` restore path and `loadSavedProfile`: added day-boundary mood reset — if `gd.mood.lastChecked` is not today, `gd.mood.today` is cleared so stale mood never shows.

**bingo.js**
- `toggleHotTake()` (partner mode): added pet growth award on full board, mirroring solo `toggleSparksCell` behavior.

**quicktakes.js**
- `answerQuickTake()`: added `gd.wyr.lastPlayed = new Date().toISOString()` when updating `wyr.answered`.

**dashboard.js**
- `hydrateDashboardViews()`: removed `gameData._cachedMetrics = liveMetrics` — derived metrics are never persisted.

**insights.js**
- `generateDeepInsight('vibe')`: removed `gd._cachedMetrics ||` fallback — always uses live calculation.
- Removed dead import `pickFromPool`.

**wyr.js**
- Removed local `deriveWyrLabel` function. Added `import { engine }`. All three call sites now use `engine.deriveWyrPersonalityLabel`.

