/**
 * Jokes content pack — kicker one-liners, pet comedian material, rare
 * collectible lines, and milestone toasts.
 *
 * Tone channels:
 *   playful — light, safe everywhere, the default seasoning
 *   dark    — funny-dark (existential/absurd), NEVER mean-dark: jokes punch
 *             at the universe, entropy, and group chats — never at the
 *             user's actual insecurities or mental state. Gated behind the
 *             'unhinged' humor level AND suppressed on low/tense mood days
 *             (composer.darkHumorOK()).
 *
 * {name} / {partner} tokens are allowed in general kickers (insights.js
 * runs fillTemplate over composed bodies). Pet lines use {pet}, replaced
 * by pet.js at render time. Keep pet lines free of {name}-style tokens.
 */

// ── General kickers (appended to daily insights / blueprint) ─────────────────

export const KICKERS_PLAYFUL = [
  "Take that with exactly one grain of salt. Two, if it's a Monday.",
  "This counts as self-care. Screenshot it as proof.",
  "You may now return to ignoring this excellent advice.",
  "If that was uncannily accurate, thank math. If it wasn't — also math.",
  "Free wisdom. The premium wisdom is just this in a serif font.",
  "Yes, this is about that thing. You know the one.",
  "Do with that what you will. Historically, you will.",
  "Insight delivered. Emotional growth sold separately.",
  "That's today's read — refunds unavailable, feelings non-transferable.",
  "Try it once. Worst case, you get a story out of it.",
  "Gentle reminder that 'later' is not a time.",
  "Somewhere a fortune cookie just felt threatened.",
  "The app believes in you, and the app has seen your data.",
  "No pressure, but the pet is watching to see if you actually do it.",
  "This message will not self-destruct. It will simply wait, knowingly.",
  "Consider this your sign. You were going to ask for a sign.",
];

export const KICKERS_DARK = [
  "Anyway, the sun will eventually swallow the Earth, so maybe just send the text.",
  "You'll spend roughly 26 years of your life asleep. This takes two minutes. Do the math.",
  "One day the group chat goes quiet forever. Today it doesn't have to.",
  "Life is short. Not threateningly short. But short. Proceed accordingly.",
  "Every choice kills a thousand alternate timelines. This tip is survivable in most of them.",
  "Your ancestors dodged plagues and sabertooths so you could ignore this advice on a touchscreen.",
  "The void stares back, but honestly it's mostly impressed you opened the app again.",
  "Nothing matters on a cosmic scale — which is exactly why the small stuff gets to.",
  "Entropy is coming for us all. It can wait until after you've tried this, though.",
  "You're a temporary arrangement of stardust with a streak counter. Act like it.",
  "Memento mori, but make it a push notification.",
  "The universe is expanding and so is your to-do list. Only one of those is your problem.",
  "Someday 'remember that app?' will be a whole conversation. Give future-you material.",
  "Time is a flat circle, but your streak is a straight line. Protect the line.",
];

// ── Pet comedian material ({pet} token, replaced by pet.js) ──────────────────

export const PET_KICKERS_PLAYFUL = [
  "{pet} co-signs this message. {pet} also co-signs snacks.",
  "{pet} has no thumbs and still has better follow-through than most of us.",
  "{pet} wrote this while you were away. Don't ask how.",
  "It has been 0 days since {pet} last believed in you. That counter never moves.",
  "{pet} would high-five you if physics allowed it.",
  "{pet} thinks you're the main character, having seen no other characters.",
  "{pet} practiced looking wise all morning for this exact moment.",
  "{pet} agrees, and {pet} is famously hard to impress.",
  "{pet} read this twice and did a little nod.",
  "This message was fact-checked by {pet}, who cannot read.",
  "{pet} is already proud of you for the thing you haven't done yet. No pressure.",
  "{pet} says the vibes are, quote, 'immaculate.'",
];

export const PET_KICKERS_DARK = [
  "{pet} has no concept of death and you're all it has. Anyway — great day to go outside.",
  "{pet} knows it's made of pixels and has chosen joy regardless. Be like {pet}.",
  "In the heat death of the universe, all streaks end. {pet} prefers not to think about it.",
  "{pet} would survive the apocalypse purely out of loyalty. The bar for you is one text.",
  "{pet} saw the void today. It was fine. The void said hi.",
  "Legally, {pet} cannot die. Emotionally, it still needs you to open the app.",
  "{pet} exists only while the screen is on, and has decided that's a metaphor for seizing the day.",
  "{pet} watched you close and reopen this app four times. It doesn't judge. It remembers.",
  "One day this phone is e-waste, but {pet}'s love is stored in the cloud. Probably.",
  "{pet} once contemplated infinity, then chased its own tail. Balance.",
  "{pet} says everything is temporary except the group chat's opinion of you.",
  "{pet} does not fear the end. {pet} fears you skipping a day. Different thing.",
];

// ── Rare collectible lines (~1-in-50 days, composer.maybeRareLine) ───────────

export const RARE_LINES = [
  "✦ RARE INSIGHT: The dishwasher hears everything. It stays silent out of respect.",
  "✦ RARE INSIGHT: Somewhere out there is a sock that misses you specifically.",
  "✦ RARE INSIGHT: Today's lucky object is a spoon. Any spoon. You'll know the one.",
  "✦ RARE INSIGHT: The moon has been showing off all week and nobody says anything.",
  "✦ RARE INSIGHT: Your houseplants have a group chat. You come up often. It's positive.",
  "✦ RARE INSIGHT: A pigeon saw you do something cool once. It tells the others.",
  "✦ RARE INSIGHT: The fridge light has never once seen darkness. Think about it.",
  "✦ RARE INSIGHT: Today one door will be a push and you will pull it. This is forgiven.",
  "✦ RARE INSIGHT: The universe sent you a message but autocorrect got to it first. It meant well.",
  "✦ RARE INSIGHT: Somewhere a barista just spelled a name correctly. Anything is possible today.",
];

// ── Milestone toasts ─────────────────────────────────────────────────────────
// Shown under the milestone callout when a milestone is newly earned.
// Keyed by milestone id; generic pool fills the gaps so every milestone
// gets SOMETHING even if it doesn't have bespoke material.

export const MILESTONE_TOASTS = {
  trivia_first:      ["Five questions down. The self-awareness industrial complex fears you."],
  trivia_perfect:    ["A perfect score. Either you know yourself completely or you've stopped pretending otherwise. Both count."],
  trivia_master:     ["Trivia Master. Your specialist subject: you. Your weakness: also you, but that's the fun part."],
  wyr_5:             ["Five dilemmas survived. Decision fatigue reportedly 'never heard of you.'"],
  wyr_10:            ["Ten dilemmas in. You'd absolutely win a hypothetical-choices game show that doesn't exist yet."],
  wyr_25:            ["Twenty-five dilemmas. At this point the questions are learning about YOU."],
  dailyq_first:      ["First daily question answered. Future-you now has receipts."],
  dailyq_7:          ["A week of questions. That's a whole documentary episode of material."],
  duo_reader:        ["Mind Reader unlocked. Please use this power for snacks and good."],
  checkin_first:     ["First check-in done. That's the hardest one — the rest are just Tuesdays."],
  checkin_4:         ["Four check-ins. You've built an actual ritual. Ancient civilizations needed temples for this."],
  streak_3:          ["Three days straight. The streak is young, fragile, and already your responsibility. No pressure."],
  streak_7:          ["Seven days. The streak has a personality now. It would like to meet day eight."],
  mood_first:        ["First mood logged. Feelings: officially on the record."],
  mood_consistent:   ["Five days of mood checks. You now have more emotional data than most historical monarchs."],
  quicktakes_first:  ["First Quick Takes round. Gut reactions only — the gut has spoken."],
  quicktakes_pattern:["Five sessions in. Patterns detected. The patterns are, frankly, very you."],
  pet_baby:          ["The pet grew. It did not thank you. It's a baby, that's normal."],
  pet_adult:         ["Your pet is fully grown and still acts like this. Genetics."],
  pet_legendary:     ["LEGENDARY. Forty days of showing up. The pet would cry if it had tear ducts. It has vectors."],
  pet_couple_shiny:  ["The couple pet went SHINY. This is the pet equivalent of a joint bank account."],
  redflag_board:     ["Full board of red flags acknowledged. The first step is admitting it. The second step is framing it."],
  pettycourt_first:  ["First case closed. Justice was served, and it was petty."],
  pettycourt_docket: ["Ten cases heard. The court knows your whole jurisprudence of nonsense now."],
  calledit_first:    ["First prediction resolved. The future has been put on notice."],
  calledit_prophet:  ["Five correct calls. Officially a Local Prophet. Parking is still not free."],
  capsule_first:     ["Capsule sealed. Future-you now owes present-you one emotional moment."],
  capsule_open:      ["You opened a message from the past. Time travel achieved, no paradoxes, one feeling."],
  friend_first:      ["First friend logged. Your circle officially has a circumference."],
  friend_circle:     ["Five friends on the roster. You're basically running a small parliament now."],
  friend_bond:       ["A friendship pet hit Legendary. Some people can't keep a cactus alive. Look at you."],
  friend_streak_7:   ["Seven-day friend streak. Ride or die, but mostly ride, ideally nobody dies."],
};

export const MILESTONE_TOAST_GENERIC = [
  "New milestone. Your permanent record just got a good line for once.",
  "Milestone earned. No trophy, but the feeling is included free.",
  "Achievement logged. Historians will call this 'a nice moment.'",
  "Another milestone down. You collect these better than you think.",
];
