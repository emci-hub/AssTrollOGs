# CLAUDE.md — Project Reference

**Start every session by reading this file first.** Update it whenever changes are made.

---

## What This Is

A mobile-first personality + relationship dashboard (430px max-width app container). Users build a personality profile during onboarding; the dashboard then surfaces daily insights, games, a virtual pet companion, and live behavioral metrics. Works in solo mode (self-discovery) or partner mode (relationship alignment).

**Stack:** Vanilla JS ES modules, Vite bundler, Supabase (no auth, device UUID as key), localStorage as primary persistence.

---

## File Map

| File | Purpose |
|---|---|
| `index.html` | Single page shell. All screens live here. Dev panel (gear icon) top-right. |
| `styles.css` | All styles. CSS variables in `:root`. Key classes: `.screen`, `.card`, `.choice-btn`, `.sparks-cell`, `.mood-btn`, `.qt-choice-btn`, `.memory-card` |
| `src/app.js` | Entry point. Imports all modules, binds window globals, handles init (cloud+local load, profile restore). |
| `src/state.js` | `window.AppState`, `defaultGameData()`, `migrateGameData()`, `saveGameData()`, `updateStreak()`, `checkMilestones()`, `canAwardPetGrowthToday()`, `recordPetGrowthToday()`. `SCHEMA_VERSION = 2`. |
| `src/supabase.js` | Supabase client singleton, `getDeviceId()`, `cloudSave()`, `cloudLoad()`, `cloudLoadByCode()`. No auth — device UUID key. |
| `src/save-code.js` | Hash-verified save code system. `generateSaveCode()`, `verifySaveCode()`, `formatCode()`, `stripFormatting()`. Code is a SHA-256 hash of identity fields only (`userProfile`, `partnerProfile`, `soloMode`, `vibeSeed`) — never game data. Used for cross-device restore. |
| `src/profile-builder.js` | Onboarding wizard (steps 0–12 for partner, 0–7 for solo). `finalizeEngineData()` writes `userProfile` + `partnerProfile`. Labels use plain language ("Your full name", "Your city or region"). |
| `src/dashboard.js` | `hydrateDashboardViews()` — main render entry. Updates header, metrics bar, spotlight tips, Day at a Glance, games section titles. |
| `src/drawers.js` | All overlay drawers (insight types, sandbox, games, profile settings, pet). `openDrawer(type)` / `closeDrawer()`. `window.saveProfileSettings` writes to correct tempAnswers keys: `attachment`, `conflict`, `expression`. |
| `src/engine.js` | `computeDeterministicSeed()`, `calculateLiveMetrics()`, `generateDuoName()`, `generateSoloVibeName()` (returns "Alex Soleil" style), `deriveWyrPersonalityLabel()`. |
| `src/insights.js` | `insights.generateDeepInsight(type, profiles, gameData, now, offset)` — content for groove/journey/decoder/vibe drawers. `generateChronicleScenario()`. `assembleMbtiFlavor()` composes short MBTI-flavored lines from `MBTI_FRAGMENTS`. Decoder now reflects both partners' love languages in partner mode. |
| `src/content-bank.js` | Large arrays of insight content indexed by profile keys, plus `MBTI_FRAGMENTS` (small per-letter pool assembled combinatorially, not a full 16-type pool). |
| `src/questions.js` | `PSYCH_QUESTIONS` array (5 questions: loveLanguage, attachment, conflict, expression, mbti). `MBTI_TYPES` array. Question/title/desc copy is plain and warm — `value` fields are lookup keys used throughout the app and must never change. |
| `src/pet.js` | `initPet()`, `renderPetSection()`, `awardPetGrowth(n)`, `renderPetDrawer()`, `refreshPetAffirmation()`. SVG-based virtual pets. Mood synced from `gd.mood.today`. Color/ear-shape/pattern derived deterministically from profile (`derivePetVisuals()`); body silhouette varies per stage (`STAGE_SHAPE`). Solo Legendary pets get a bonus weapon accessory. Couple pet (`gd.pet.couple`) has independent persisted growth and a shiny gradient+sparkle treatment at stage 5. `pickPetReaction()` reacts to today's actual mood/game/streak activity before falling back to `pickAffirmation()`'s shuffle-bag-rotated pool; partner-mode affirmation label now names the actual person it's about. |
| `src/dev-tools.js` | Dev panel: jump steps, force dashboard, clear cache. |
| `src/games/index.js` | Game registry. `gameRegistry.get(id)` / `gameRegistry.bindAll()`. All games registered here. |
| `src/games/trivia.js` | 5-question quiz (solo self-knowledge or partner trivia). Awards pet growth on round complete (daily cap). |
| `src/games/memory.js` | 6-pair memory match. Awards pet growth on win (daily cap). |
| `src/games/wyr.js` | Would You Rather. Updates `wyr.preferences`. Awards pet growth every 5th answer (daily cap). |
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

## gameData Schema (SCHEMA_VERSION = 2)

```js
{
  schemaVersion: 2,
  trivia:     { correct, total, lastPlayed, categoryAccuracy: { mbti, loveLanguage, attachment, conflict, expression } },
  memory:     { completed, bestMoves, lastPlayed },
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

**Pet stages:** 0d=Newborn, 4d=Baby, 10d=Growing, 20d=Adult, 40d=Legendary

**Pet appearance:** Color, ear shape, and pattern overlay are derived deterministically from the profile every render (`derivePetVisuals()` in `pet.js`) — never persisted. Color comes from a per-person hue (hashed from name/location/mbti/attachmentStyle) plus an attachment-style "mood" (S/L range + hue-shift bias), not a fixed 4-color palette. MBTI's E/I picks ear shape; `loveLanguage` picks a pattern overlay (spots/stripes/band/sparkle/none). Body silhouette (proportions, limbs, aura) also varies per stage via `STAGE_SHAPE`, not just overall size.

**Pet growth sources:**
- Daily visit: +2 (solo), +1 (partner), +1 (couple pet, partner mode only)
- Each game win/completion: +1 (daily cap via `petGrowthLog`) — applies to user, partner, *and* couple pet simultaneously; no per-game code needed for the couple pet, it rides the same `awardPetGrowth()` call
- Games with daily cap: `trivia`, `memory`, `wyr`, `sparks`, `mood`, `quicktakes`

**Solo Legendary weapon:** At stage 5, a pet rendered with `isSolo: true` (true solo mode only — never partner-mode individual pets, even at stage 5) additionally renders a weapon accessory alongside the crown.

**Couple pet — independent growth + shiny:** Unlike the two individual pets, `gd.pet.couple` is NOT derived as `min(userStage, partnerStage)` — it has its own persisted `totalDays`/`stage`, ticked once per day in partner mode (`tickCouplePet()`) and bumped by every `awardPetGrowth()` call. It can lag or lead the two individual pets. Once it independently reaches stage 5, it renders "shiny legendary": a 5-stop gradient blending both partners' actual hues (instead of the flat averaged blend used at stages 1-4) plus a static sparkle overlay, and earns the `pet_couple_shiny` milestone.

**Pet mood derived from** `gd.mood.today`: glowing→excited, curious→curious, chill/low→happy, fired→excited, tense→curious. Falls back to game-based derivation if no mood check.

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

- **Table:** `user_sessions` — columns: `device_id` (text PK), `profile_data` (jsonb), `schema_version` (int), `updated_at` (timestamptz), `save_code` (text, nullable, indexed — not unique, since a code can be shared across multiple device rows once restored on a second device)
- **RLS:** anon + authenticated read/write (`USING (true)`) — single-tenant, no auth
- **Strategy:** localStorage is always source of truth. Cloud load on startup picks whichever is newer (by `cachedDate`). Cloud save is silent fire-and-forget in `saveGameData()`.
- **Device ID:** Random UUID stored in `localStorage['vibeDeviceId']`, generated once.
- **Save code:** Generated once from identity fields (`generateSaveCode()` in `save-code.js`) on onboarding completion and on profile-settings edits — never on every gameplay save (game data changes constantly and isn't part of the hash). `cloudLoadByCode()` looks up by `save_code` and takes the most recently updated row, since the column isn't unique.

---

## Milestone IDs

`trivia_first`, `trivia_perfect` (≥10 total, 100%), `trivia_master` (≥15, ≥80%), `wyr_5`, `wyr_10`, `wyr_25`, `memory_first`, `memory_sharp` (≤8 moves), `bingo_3`, `bingo_row`, `streak_3`, `streak_7`, `mood_first`, `mood_consistent` (5-day mood streak), `quicktakes_first`, `quicktakes_pattern` (5 sessions), `pet_baby` (4d), `pet_adult` (20d), `pet_legendary` (40d), `pet_couple_shiny` (couple pet independently ≥40d, partner mode only)

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
| Trivia | `gd.trivia.categoryAccuracy[cat]` | `getWeakestCategoryLabel()` → spotlight DON'T tips, groove drawer |
| WYR | `gd.wyr.preferences` | `engine.deriveWyrPersonalityLabel()` → dashboard pill + vibe drawer; nudge tips in spotlight |
| Mood Check | `gd.mood.today` | Day at a Glance mood note; pet facial expression |
| QuickTakes | `gd.wyr.preferences` (same object) | same as WYR above |
| Memory | `gd.memory.bestMoves` | game insight sentences in blueprint/groove drawers |
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

