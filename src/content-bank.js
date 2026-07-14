/**
 * Content Bank — large curated pools of dynamic content.
 * All content is personalized by profile values at call time.
 * Each function returns a different item each call via index cycling,
 * so the app always feels fresh without needing an internet connection.
 *
 * Content draws from real relationship psychology, positive psychology,
 * communication research, and everyday relatable scenarios.
 */

// ── Daily Insight Headlines ───────────────────────────────────────────────────

export const SOLO_HEADLINES = [
  "Today is a good day to trust yourself.",
  "Small steps still count as movement.",
  "You're allowed to take up space.",
  "Your instincts have been right more than you know.",
  "Rest is part of the work.",
  "The way you show up matters — and you show up.",
  "Progress doesn't have to be loud to be real.",
  "It's okay to not have all the answers yet.",
  "You bring something to every room you walk into.",
  "Today, one thing done well beats ten things started.",
  "Your energy today is enough.",
  "Being kind to yourself is not soft — it's smart.",
  "The version of you right now is a valid work in progress.",
  "Not every day needs a breakthrough to matter.",
  "You are the longest relationship you'll ever have.",
  "Curiosity is one of your best qualities — use it.",
  "The way you connect with people is genuinely special.",
  "Give yourself credit for the hard things you do quietly.",
  "Today's version of you is better than last year's.",
  "You notice things others miss — that's a superpower.",
];

export const PARTNER_HEADLINES = [
  "Something small today could mean everything to them.",
  "You two have built something worth protecting.",
  "The little things are the big things, eventually.",
  "Showing up consistently is its own kind of love.",
  "Good relationships are made from a thousand small moments.",
  "You understand each other better than you think.",
  "The best part of a good connection? It keeps growing.",
  "Every conversation is a chance to know them a little more.",
  "You don't have to be perfect — you just have to be present.",
  "Being known and still chosen — that's the whole thing.",
  "Growth doesn't always look dramatic. Sometimes it's just a better day.",
  "You've already done the hard part — you chose each other.",
  "A shared laugh is worth more than a long talk sometimes.",
  "Even the quiet days together are building something.",
  "Being curious about your partner never gets old.",
  "You two have your own language now — that's rare.",
  "Appreciation is the cheapest gift with the highest return.",
  "They chose you. That still means something.",
  "Today is a great day to say the thing you've been thinking.",
  "The version of this connection six months from now will be even better.",
];

// ── Daily Insight Bodies (keyed by attachment style) ─────────────────────────

export const DAILY_BODIES_SOLO = {
  secure: [
    "Your comfort with yourself gives you a real edge. When things feel uncertain today, lean into that natural stability — it's not complacency, it's foundation.",
    "Being comfortable in your own skin doesn't mean you have everything figured out. It means you're okay with not having it all figured out. That's actually rare.",
    "You're good at reading situations because you're not panicking through them. Use that clarity today — someone around you probably needs it.",
    "Your natural ease with yourself makes you easier to be around. People feel that. Don't underestimate how much that matters.",
    "You don't need external validation to move forward — and that's one of your quiet strengths. Trust that today, {name}.",
    "Being unbothered isn't the same as being disconnected — you feel things, you just don't let them run the show.",
    "You've built a version of stability that doesn't depend on everything going right. That's worth noticing today.",
    "The steadiness you offer other people starts with the steadiness you've built with yourself.",
  ],
  anxious: [
    "The same attentiveness that sometimes makes you overthink is also what makes you deeply caring. Channel it outward today — someone will feel genuinely seen because of it.",
    "Your emotional radar picks up things others walk past. That's not a flaw — it's a sensitivity that, when aimed well, creates real connection.",
    "You care a lot, {name}. That's not a weakness. The key is remembering to aim some of that care at yourself too.",
    "The fact that you notice small shifts in energy around you means you also notice when things are going well — even when you forget to acknowledge it.",
    "Today, try letting one thing just be okay without analyzing it further. Not every signal needs to be decoded.",
    "The intensity you feel isn't a malfunction — it's just more information coming in than most people process.",
    "You already know how to care hard. Today, practice caring hard about your own peace too.",
    "Not every worry needs to be solved today. Some just need to be noticed and set down.",
  ],
  avoidant: [
    "Your independence is real and worth keeping. The goal isn't to become someone who needs everyone — it's to let a few good people in without losing yourself.",
    "You don't always need to explain why you need space. But once in a while, naming it out loud makes people feel less shut out.",
    "You think carefully before acting. That's not avoidance — it's deliberateness. Trust that instinct today, especially in conversations that matter.",
    "Your tendency to process quietly means your conclusions are usually solid. Share one of those conclusions with someone today.",
    "Being self-sufficient is a strength until it becomes a wall. Today, try asking for one thing — anything — and see how it feels.",
    "Needing less from other people isn't the same as needing nothing. Let yourself want something today, {name}.",
    "Your own company is genuinely good company. That's not a consolation prize — it's a skill.",
    "Distance can be a tool or a habit. Today, notice which one you're actually reaching for.",
  ],
  fearful: [
    "Wanting closeness and also being scared of it isn't a contradiction — it's one of the most human experiences there is. You're not broken.",
    "The fact that you want connection at all, despite how it's felt before, shows real courage. Give yourself credit for that, {name}.",
    "You've learned to be careful with who you trust. That means when you do open up, it actually means something — for both of you.",
    "Your self-awareness is one of your greatest strengths. Today, use it to notice one good thing about how you're showing up.",
    "Progress with closeness doesn't have to look dramatic. A small moment of honesty today counts as much as a big one.",
    "You don't have to fully trust something to take one small step toward it.",
    "The push and pull you feel isn't indecision — it's two real, valid things happening at once.",
    "Healing isn't linear, and today doesn't have to be your best day to still count as progress.",
  ],
};

export const DAILY_BODIES_PARTNER = {
  secure: [
    "Your natural comfort with closeness is something {partner} leans on more than they say. Keep being the steady presence — it matters more than you know.",
    "You make it easy for people to feel safe around you. That's not a small thing. It's the foundation everything else is built on.",
    "Your openness to working things through keeps this connection resilient. Today's a good day to check in — not because something is wrong, but because you can.",
    "The confidence you bring to this relationship doesn't come from having all the answers. It comes from trusting that you can figure them out together.",
    "You model something important: that love can be calm. Not boring — calm. There's a huge difference.",
    "You don't need a big gesture today. Just keep doing the small, steady thing you always do.",
    "Your partner has probably stopped noticing how rare your calm actually is. Remind them, gently, that it's a choice you keep making.",
    "Being the steady one doesn't mean you don't need steadying sometimes too.",
  ],
  anxious: [
    "Your care runs deep, and that's exactly why they feel as loved as they do. The key today is trusting that the connection is real even when it's quiet.",
    "You notice the little things — the change in tone, the slight shift in energy. Use that sensitivity to reach out today, not to check in anxiously, but to share something good.",
    "The attentiveness you bring to this relationship is a genuine gift. When you direct it with intention rather than worry, it creates the closeness you're looking for.",
    "Today, try resting in the connection you already have rather than testing it. What you're looking for is probably already there.",
    "Your emotional depth is one of the things that makes this relationship feel real. Trust it today.",
    "The love you bring doesn't need to be proven today — it's already been shown, many times over.",
    "Today, try naming what you need instead of hoping they'll guess it.",
    "Your attentiveness is a gift when it's aimed at connection instead of reassurance-seeking.",
  ],
  avoidant: [
    "You show love through actions, and that's completely valid — but sometimes saying it out loud lands differently. Today, try both.",
    "You process privately, and that's okay. But sharing even a small piece of what's going on inside creates a kind of closeness that actions alone can't always build.",
    "{partner} doesn't need you to be an open book. They just need occasional glimpses. A sentence today is more than enough.",
    "The space you give yourself is healthy. The question is whether your partner knows you're coming back — a small signal of that goes a long way.",
    "Being present doesn't require being verbal. Sometimes just staying in the room a little longer, or looking up from your phone, says everything.",
    "Choosing to stay in the room, even quietly, is its own form of showing up.",
    "You don't have to narrate every feeling — but naming one today would go a long way.",
    "Independence and partnership aren't opposites. You get to have both.",
  ],
  fearful: [
    "You want this connection to be real and safe — and the fact that you're still in it means it's earning that trust. Let it.",
    "Moments of closeness might still trigger old patterns. That's okay. Notice the pattern, then choose what you actually want.",
    "{partner} chose you knowing you come with complexity. That choice deserves to be believed.",
    "Today, try letting one interaction be easy. Not every moment needs to carry the weight of everything before it.",
    "The courage it takes to stay open in a relationship is underrated. You're doing it. That counts.",
    "Every day you stay is proof that the fear doesn't get the final word.",
    "Your partner isn't waiting for you to be fixed. They're just waiting for you.",
    "Trust doesn't arrive all at once. It shows up in moments like today, if you let it.",
  ],
};

// ── Spotlight Focus Tips (keyed by love language) ────────────────────────────

export const SPOTLIGHT_DOS = {
  words: [
    "Tell them one specific thing you appreciate about them — be exact, not general.",
    "Send a message today just to say you were thinking about them.",
    "Narrate something positive you noticed about them recently.",
    "Write down one thing they did this week that meant something to you.",
    "Say the thing you've been meaning to say but keep forgetting.",
    "Acknowledge something they handled well — out loud.",
    "Compliment the effort, not just the result.",
    "Say 'I'm proud of you' for something small they did.",
  ],
  time: [
    "Put your phone face-down for one conversation today.",
    "Plan 20 minutes of something with no agenda — just being together.",
    "Make eye contact when they're talking to you. All the way through.",
    "Be fully present for one meal together — no screens.",
    "Ask what they want to do this weekend and actually do it.",
    "Show up for the small things, not just the big ones.",
    "Give them your undivided attention for one conversation.",
    "Choose to be with them instead of near them today.",
  ],
  service: [
    "Handle one thing on their plate without being asked.",
    "Notice something they usually do and do it first.",
    "Make their morning a little easier — coffee, a text, anything.",
    "Do the thing they keep meaning to do but haven't yet.",
    "Offer to help before they've had to figure out how to ask.",
    "Follow through on the small thing you said you'd do.",
    "Quietly take one task off their list today.",
    "Ask what would make their day easier — then actually do it.",
  ],
  touch: [
    "Initiate a hug that lasts a second longer than usual.",
    "Sit close during downtime instead of across the room.",
    "Hold their hand when you're walking somewhere.",
    "A hand on the shoulder before a stressful moment goes a long way.",
    "Physical presence during a hard conversation can say more than words.",
    "Don't wait for them to come to you — reach out first.",
    "A simple touch that says 'I'm here' is often all they need.",
    "Greet them properly when they walk in the door.",
  ],
  gifts: [
    "Pick up something small that you know they'd like — no occasion needed.",
    "A note left somewhere unexpected means more than it costs.",
    "Bring something back when you're out — a snack, a small thing, whatever.",
    "Remember the thing they mentioned wanting and follow through.",
    "A symbolic token tied to a shared memory hits differently than a practical gift.",
    "The effort to notice and act is the actual gift. Make the effort.",
    "Get them the version of something they'd upgrade to if they weren't being sensible.",
    "Small and thoughtful almost always beats big and generic.",
  ],
};

export const SPOTLIGHT_DONTS = {
  direct: [
    "Don't lead with criticism even when you're right — soften the delivery.",
    "Avoid turning every difference of opinion into a debate.",
    "Don't mistake bluntness for honesty — they're not the same.",
    "Tone matters as much as content — watch yours.",
    "Check your tone before you hit send.",
    "Not everything needs to be said the second you think it.",
    "Directness lands better with a little warmth attached.",
    "Give them a beat to respond before you push further.",
  ],
  indirect: [
    "Avoid expecting them to guess — say one thing directly today.",
    "Don't let resentment build from unspoken needs.",
    "Hints work sometimes; clear words work every time.",
    "Naming what you need isn't needy — it's efficient.",
    "If it matters, say it out loud — don't leave it to context clues.",
    "A hint they miss isn't a conversation you had.",
    "Practice saying the direct version, even just once today.",
    "Waiting for them to notice can turn into waiting a long time.",
  ],
  reflective: [
    "Don't stay in your head so long that they're left out.",
    "Sharing your conclusions matters more than sharing your whole thought process.",
    "Avoid using 'I need time to think' as a way to avoid the conversation entirely.",
    "Some things resolve better when you talk them out rather than think them out.",
    "A quick 'I'm still thinking about it' beats total silence.",
    "Not every thought needs to be fully formed before you share it.",
    "Give them a rough sense of when you'll circle back.",
    "Processing alone forever isn't the same as processing.",
  ],
  analytical: [
    "Not everything needs a solution — sometimes they just need to be heard.",
    "Avoid over-explaining in moments that call for empathy.",
    "Logic without warmth can land cold, even when it's accurate.",
    "Resist the urge to fix before fully listening.",
    "Ask if they want advice or just want to vent, before giving either.",
    "Being right isn't the same as being helpful in the moment.",
    "Sometimes what they need most is just 'that sounds hard.'",
    "Save the breakdown for after they feel heard.",
  ],
};

// ── Blueprint Phrases ─────────────────────────────────────────────────────────

export const BLUEPRINT_SOLO = [
  "You're building something worth having — a relationship with yourself that holds up under pressure. The games you play here reflect back real patterns, not invented ones.",
  "Self-knowledge isn't a destination. It's something you keep adding to. Every question you answer here sharpens the picture a little more.",
  "The most useful thing you can do for any future relationship is understand your own patterns first. You're doing that. It's not nothing.",
  "You navigate the world in a distinct way — with a combination of instincts, habits, and values that are genuinely yours. The more clearly you see that, the more intentional you can be with it.",
  "Insight without action is interesting. Insight with action is growth. You're closer to the second one than you think.",
  "Your patterns make sense. Even the ones you're trying to change. Understanding why they exist is the first step to choosing something different.",
  "You're more consistent than you give yourself credit for. The version of you that shows up every day is doing the work.",
  "What makes you 'you' is more specific than any label. Keep getting curious about the details.",
  "The goal isn't to become a different person. It's to become a more intentional version of who you already are.",
  "You've got a way of processing the world that's worth understanding deeply — because it's the lens everything else comes through.",
];

export const BLUEPRINT_PARTNER = [
  "You two are building fluency in each other — the kind that only comes from time, attention, and a willingness to keep learning. That's not common.",
  "Every small interaction you have is part of a larger conversation that's been going on since you met. The theme of it is: 'I'm trying to understand you.'",
  "What keeps a connection healthy isn't grand gestures — it's consistent micro-moments of attention. You're both already doing this.",
  "The fact that you're here thinking about your connection means you take it seriously. That intentionality is a huge predictor of how well this goes.",
  "You don't need to be perfect partners. You need to be honest ones. Honesty and willingness are more than enough to build on.",
  "The way you each show up when things are easy tells you your defaults. The way you show up when things are hard tells you your values. Pay attention to both.",
  "Good connections are made, not found. You're both making this one.",
  "Your individual growth feeds the connection. The more clearly each of you understands yourself, the better you can understand each other.",
  "What makes this connection yours isn't the labels — it's the specific, unrepeatable combination of who you both are.",
  "The strongest relationships aren't the ones with the least conflict. They're the ones where both people keep choosing to stay in the conversation.",
];

// ── Deep Insight Content Pools ────────────────────────────────────────────────

export const DEEP_GROOVE_SOLO = [
  { headline: "You communicate the way you think.", body: "Your natural style isn't something you chose — it formed over years of figuring out what kept you safe and helped you get what you needed. Understanding it isn't about changing it entirely. It's about knowing when to lean into it and when to stretch." },
  { headline: "How you say things shapes what people hear.", body: "The actual words you use carry only part of the message. Tone, timing, and the energy behind it do the rest. Your style has real strengths — the goal is to deploy it with intention, not just habit." },
  { headline: "You have a comfort zone in conversations.", body: "There are topics you navigate easily and ones that feel harder to put into words. Both are worth knowing. The easier ones show your natural strengths. The harder ones show where your growth edge is." },
  { headline: "Your communication style is a feature, not a bug.", body: "Whether you lead with logic, emotion, directness, or care — that's your style doing its job. The trick is to understand how it lands for the people around you, so you can adjust when it matters." },
  { headline: "What you don't say communicates too.", body: "Silence, avoidance, and deflection all carry meaning. Not in a bad way — just in a way worth being aware of. Your unexpressed thoughts are often your clearest ones." },
  { headline: "You adjust your style more than you realize.", body: "You're not one fixed communicator — you shift depending on who you're with and what's at stake. That flexibility is a skill, even when it doesn't feel like one." },
  { headline: "Your style has a history.", body: "The way you communicate now was shaped by what worked before — what got you heard, what kept you safe. It's worth knowing that history without being ruled by it." },
];

export const DEEP_GROOVE_PARTNER = [
  { headline: "You two have overlapping styles — and meaningful gaps.", body: "Where you communicate similarly, things feel easy. Where you differ, that's where the real work and the most interesting growth happens. Neither is a problem. Both are useful information." },
  { headline: "Your rhythms don't have to match to work.", body: "One of you might need time to think before talking. The other might process out loud. Neither way is wrong — but knowing which is which saves a lot of confusion and hurt feelings." },
  { headline: "Repair is more important than perfection.", body: "Every relationship has moments where communication breaks down. What sets strong connections apart isn't avoiding those moments — it's how quickly and genuinely you recover from them." },
  { headline: "The conversation you avoid is usually the one you need.", body: "The topics that feel risky to bring up are almost always the ones worth having. Avoiding them doesn't make them smaller — it usually makes them bigger over time." },
  { headline: "Listening is the other half of communication.", body: "The way each of you listens shapes the whole dynamic. Are you listening to respond, or listening to understand? The second one changes everything about what's possible between you." },
  { headline: "You've built shorthand nobody else has.", body: "The way you two communicate now — the glances, the half-sentences, the things that don't need explaining — took real time to build. That's not a small thing." },
  { headline: "Misunderstandings aren't proof something's wrong.", body: "Two different communication styles will occasionally cross wires. That's not a red flag — it's just two people, being two different people, in the same conversation." },
];

export const DEEP_JOURNEY_SOLO = [
  { headline: "You're further along than you think.", body: "Growth doesn't always announce itself. Most of the meaningful change happening in your life is quiet — built from habits, choices, and small moments of courage you don't always credit yourself for." },
  { headline: "Your patterns are data, not destiny.", body: "The way you've reacted to things in the past tells you something true about your tendencies. But tendencies aren't fixed. Understanding them is the first step to choosing something different." },
  { headline: "What you're building is worth protecting.", body: "Self-knowledge is one of the few things that compounds. Every reflection, every honest answer, every time you pause to understand yourself better — it all builds on itself." },
  { headline: "Your story isn't finished.", body: "Whatever chapter you're in right now, it's not the final one. The patterns that haven't served you can shift. The strengths you haven't fully used are still there, waiting." },
  { headline: "The goal isn't to arrive — it's to keep moving.", body: "There's no version of personal growth where you're finally done and can stop paying attention. But the journey genuinely gets more interesting the deeper in you go." },
  { headline: "You keep showing up, even on the hard days.", body: "Consistency doesn't always look impressive from the outside. But the version of you that keeps trying, even quietly, is the one actually building something." },
  { headline: "You're allowed to outgrow old versions of yourself.", body: "The person you were a year ago made sense for who you were then. You don't owe that version of you any loyalty if it's not who you're becoming." },
];

export const DEEP_JOURNEY_PARTNER = [
  { headline: "Where you started and where you are now.", body: "Every relationship has a before and an after — a 'us when we first started' and 'us now.' The distance between those two points is the relationship's growth. It's worth acknowledging." },
  { headline: "The challenges you've already navigated together.", body: "Some of the hard things you've been through together have quietly strengthened things you'll only fully see later. Resilience in a relationship builds invisibly for a long time before it becomes obvious." },
  { headline: "The version of this connection five years from now.", body: "If you keep doing what you're already doing — checking in, showing up, being curious about each other — the future version of this relationship will be something genuinely impressive." },
  { headline: "You're building a shared history.", body: "The inside jokes, the things only you two know, the way you've learned to read each other — that accumulates into something that can't be replicated. It's yours." },
  { headline: "Your growth feeds the connection.", body: "The more each of you understands yourself, the better you understand each other. Individual growth and relational growth aren't competing — they're complementary." },
  { headline: "You've both changed — and stayed.", body: "People assume growing apart is the risk. Just as often, two people grow and choose to keep meeting each other where they are. That's what's been happening here." },
  { headline: "The hard seasons taught you something the easy ones couldn't.", body: "Nobody wants the difficult stretches. But if you're honest, some of what you value most about this connection was built in one of them." },
];

export const DEEP_DECODER_SOLO = [
  { headline: "What actually makes you feel cared for.", body: "You feel most genuinely supported when someone shows up in a specific way — not generically, but in the way that matches what you actually need. Knowing that clearly means you can ask for it, and recognize it when it's there." },
  { headline: "How you naturally show care to others.", body: "The way you express care often mirrors what you'd most want to receive. Notice your default — it tells you something true about what love means to you, even when you haven't said it out loud." },
  { headline: "The gap between what you give and what you need.", body: "Sometimes we give what we wish we'd received rather than what the other person actually needs. And sometimes we forget to apply the same generosity to ourselves. Both gaps are worth closing." },
  { headline: "Self-care as a practice, not a reward.", body: "Taking care of yourself isn't something you earn by being good enough or busy enough. It's maintenance. The same way you'd invest in someone you love — invest in yourself." },
  { headline: "How you know you're doing okay.", body: "There are specific signals that tell you when you're in a good place — emotionally, energetically, relationally. Learning to read those signals means you can act on them before you're running on empty." },
  { headline: "Care doesn't always look like you expect.", body: "Sometimes the people who care about you show it in a completely different language than the one you speak. Learning to recognize their version matters as much as asking for your own." },
  { headline: "You can ask for what you need directly.", body: "Waiting for someone to guess what makes you feel cared for puts a lot of pressure on guesswork. Saying it plainly is a kindness to both of you." },
];

export const DEEP_DECODER_PARTNER = [
  { headline: "What they need from you that they might not be saying.", body: "Love languages are a useful shortcut, but the real fluency is in the details. Knowing how they feel loved in general is the starting point — knowing the specific version of that is the finish line." },
  { headline: "How you make each other feel seen.", body: "Feeling truly understood by someone is one of the most powerful experiences in a close relationship. The moments that do that for each of you are worth identifying and protecting." },
  { headline: "The gap between intention and impact.", body: "You probably already try to show care in ways that are meaningful. But every so often, the way you deliver it doesn't land quite the way you mean it to. That gap is easy to close once you know it's there." },
  { headline: "What 'I love you' looks like in action for each of you.", body: "Words are great. But the specific actions that make each of you feel loved are the real language. Speaking both — yours and theirs — is what makes a relationship feel genuinely attentive." },
  { headline: "Appreciation as a practice.", body: "The couples who feel closest aren't the ones who never struggle — they're the ones who say the good stuff out loud, often. It's not complicated. Just: say it, specifically, and don't wait for a reason." },
  { headline: "Small consistent gestures beat big rare ones.", body: "It's tempting to save up for the grand gesture. But the small, repeated ones — the ones that say 'I see you' on an ordinary Tuesday — are what actually build a feeling of being loved." },
  { headline: "You're allowed to ask, not just guess.", body: "Trying to intuit exactly what makes someone feel loved is a lot of pressure to put on yourself. Sometimes the fastest path to feeling understood is just asking directly." },
];

export const DEEP_VIBE_SOLO = [
  { headline: "Your energy right now.", body: "You carry a particular quality into every room and interaction — a combination of your natural warmth, your directness, your depth, and your way of paying attention. That combination is yours. It's worth understanding and leaning into." },
  { headline: "The mood you create without realizing it.", body: "People around you feel something specific in your presence — whether that's calm, energy, wit, or depth. You probably underestimate how much of a tone-setter you are." },
  { headline: "What makes you distinctly you.", body: "Your personality isn't a fixed thing, but there are consistent notes that run through all of it — the way you think, the way you care, the things you notice. Those notes are worth knowing by name." },
  { headline: "Your current state, honestly.", body: "The best read on your vibe comes from what you've been doing, thinking about, and feeling lately — not from a label. You're a moving target, which is good. It means you're still growing." },
  { headline: "What you bring to every interaction.", body: "You lead with something distinct — a quality that people respond to whether they name it or not. Knowing what that is lets you choose when to amplify it and when to dial it back." },
  { headline: "Your energy shifts, and that's normal.", body: "You're not the same on every day, in every room, with every person — and that's not inconsistency, that's being a full person responding to context." },
  { headline: "You have a signature, even in the chaos.", body: "However scattered a day feels, there's a throughline in how you move through it — a set of instincts that are unmistakably yours." },
];

export const DEEP_VIBE_PARTNER = [
  { headline: "The energy you two create together.", body: "There's a distinct 'us' quality to how you two operate together — a vibe that doesn't exist when either of you is alone. That shared energy is something you've built, and it's worth recognizing." },
  { headline: "What it feels like to be in this connection.", body: "From the inside, a relationship can feel ordinary because you're in it every day. But the particular combination of who you both are, and how you bring that to each other, is anything but ordinary." },
  { headline: "Your complementary strengths.", body: "You each bring something the other one doesn't have in the same way — a way of thinking, a way of feeling, a way of handling things. That's not accidental. It's part of why this works." },
  { headline: "The mood of right now.", body: "Every relationship has seasons — periods of growth, closeness, distance, routine, and renewal. Understanding where you are right now helps you make the most of it." },
  { headline: "What's working really well.", body: "It's easy to focus on what needs improvement. But there are things you two do genuinely well together — things that would be worth naming and protecting. Do that today." },
  { headline: "You bring out a version of each other nobody else sees.", body: "There's a specific version of you that only exists around your partner, and a specific version of them that only exists around you. That mutual unlocking is rare." },
  { headline: "Your energy together has its own rhythm.", body: "Some days it's fast and playful. Some days it's slow and quiet. Both are the relationship working — not one version being more 'real' than the other." },
];

// ── Chronicle Scenarios (greatly expanded) ───────────────────────────────────

export const CHRONICLE_SCENARIOS = [
  { task: 'assembling a complex flatpack bookshelf', userRole: 'analyzing the instruction manual and sorting all the hardware', partnerRole: 'holding panels steady and calling out step numbers' },
  { task: 'planning a surprise weekend trip', userRole: 'researching destinations and building the itinerary', partnerRole: 'managing packing, budget, and building the anticipation' },
  { task: 'hosting a last-minute dinner party', userRole: 'creating the playlist and setting the vibe', partnerRole: 'running the kitchen and managing the guest list' },
  { task: 'surviving a full day without phones', userRole: 'designing the no-screen activity schedule', partnerRole: 'keeping everyone entertained when the schedule falls apart' },
  { task: 'adopting a puppy together', userRole: 'researching breeds, trainers, and vet options', partnerRole: 'handling the emotional negotiations with the puppy at 3am' },
  { task: 'navigating a huge holiday mall on the last shopping day', userRole: 'mapping the most efficient store route', partnerRole: 'carrying everything and maintaining morale' },
  { task: 'surviving a long international flight with a delayed connection', userRole: 'tracking all the rebooking options and logistics', partnerRole: 'finding food, keeping spirits up, and claiming the good seats' },
  { task: 'moving into a new apartment in one day', userRole: 'directing furniture placement and organizing boxes', partnerRole: 'bribing friends with pizza and keeping energy high' },
  { task: 'saving a camping trip when it starts raining', userRole: 'finding a waterproof shelter solution', partnerRole: 'turning the situation into a memorable story' },
  { task: 'cooking a five-course meal from scratch', userRole: 'building the menu and timing every dish', partnerRole: 'handling improvisation when ingredients are missing' },
  { task: 'fixing a broken car on the side of the road', userRole: 'looking up the fix and sourcing materials', partnerRole: 'flagging for help and keeping everyone calm' },
  { task: 'planning the perfect birthday for someone very specific', userRole: 'building a surprise that matches their personality exactly', partnerRole: 'wrangling the logistics and keeping the secret' },
  { task: 'making it to a sold-out event with no tickets', userRole: 'scouting every possible entry strategy', partnerRole: 'working the social angles and making friends with the right people' },
  { task: 'setting up a living room home cinema from scratch', userRole: 'handling all the AV setup and cable management', partnerRole: 'managing snacks, blankets, and the movie selection argument' },
  { task: 'rescuing a baking experiment gone wrong', userRole: 'diagnosing what went wrong and engineering a fix', partnerRole: 'creative rebranding of the output as "rustic"' },
];

// ── Games — WYR bonus questions ───────────────────────────────────────────────

export const WYR_BONUS_QUESTIONS = [
  { a: "Always have the perfect comeback five seconds later", b: "Always know when to say nothing at all", signals: { a: { independent: 1 }, b: { deep: 1 } } },
  { a: "Live in a house with a library", b: "Live in a house with a home cinema", signals: { a: { deep: 1 }, b: { lighthearted: 1 } } },
  { a: "Be able to speed-read anything", b: "Be able to remember everything you hear", signals: { a: { planner: 1 }, b: { connected: 1 } } },
  { a: "Have a job where you travel the world", b: "Have a job where you work from your dream home", signals: { a: { adventurous: 1 }, b: { homebody: 1 } } },
  { a: "Always wake up before 7am feeling great", b: "Always be a night owl with perfect energy", signals: { a: { planner: 1 }, b: { spontaneous: 1 } } },
  { a: "Have a best friend who knows everything about you", b: "Have a large social circle who loves having you around", signals: { a: { deep: 1 }, b: { connected: 1 } } },
  { a: "Be fluent in every language instantly", b: "Be a world-class musician instantly", signals: { a: { connected: 1 }, b: { lighthearted: 1 } } },
  { a: "Always have a perfectly clean house", b: "Always have a perfectly stocked fridge", signals: { a: { planner: 1 }, b: { homebody: 1 } } },
  { a: "Take a spontaneous solo trip this month", b: "Take a perfectly planned group trip next month", signals: { a: { adventurous: 1 }, b: { planner: 1 } } },
  { a: "Know exactly what you want in life", b: "Be pleasantly surprised by where life takes you", signals: { a: { planner: 1 }, b: { spontaneous: 1 } } },
];

// ── Sparks cards (extra pool for bingo reshuffle) ─────────────────────────────

export const EXTRA_SPARKS_SOLO = [
  'I do better when I have a plan',
  'I can read a room almost instantly',
  'My gut feelings are usually right',
  'I tend to remember how things made me feel more than what was said',
  'I hold myself to high standards',
  'I prefer depth over small talk',
  'I can be stubborn when I believe I am right',
  'I am good at making people feel comfortable',
  'I pick up on unspoken tension quickly',
  'I do my best work when I am interested in something',
  'I usually see both sides of an argument',
  'I need time to recharge after intense social situations',
  'I care more about why than what',
  'I tend to give more than I ask for in return',
  'I forgive people but I usually remember',
  'I express love more easily through actions than words',
  'I get really focused when something captures my interest',
  'I feel everything a little more intensely than I let on',
  'I would rather do something meaningful than something impressive',
  'I am still figuring out what I want and I am okay with that',
];

export const EXTRA_SPARKS_PARTNER = [
  'You two bring out each other\'s better nature',
  'You\'ve had at least one conversation that changed how you see things',
  'You make ordinary moments feel worth remembering',
  'You\'ve gotten better at knowing what the other person needs',
  'You can disagree and still feel close after',
  'You\'ve helped each other through something that was actually hard',
  'There are things you only do or say around each other',
  'You both put effort in, even when it\'s not convenient',
  'Your humor together is a language all its own',
  'You give each other permission to be exactly who you are',
  'You\'ve grown individually because of this connection',
  'You trust each other with the parts of yourself you don\'t show everyone',
  'When things go wrong, you still choose to figure it out together',
  'You make each other more curious about life',
  'The best version of each of you shows up more in this connection',
];

// ── Focus / Spotlight extra tips ──────────────────────────────────────────────

export const FOCUS_TIPS_SOLO = [
  "Notice one thing today that went better than expected.",
  "Set one boundary — even a tiny one — and keep it.",
  "Do one thing for future you that present you won't feel like doing.",
  "Check in with yourself at the end of the day: was today actually okay?",
  "Give yourself the benefit of the doubt at least once.",
  "Text someone you've been meaning to text.",
  "Rest without justifying the rest.",
  "Name one feeling accurately instead of letting it sit as a vague mood.",
  "Do the hard thing first instead of last.",
  "Choose honesty over comfort in one conversation today.",
];

export const FOCUS_TIPS_PARTNER = [
  "Ask them one question you actually want to know the answer to.",
  "Say something kind before they have to ask for it.",
  "Bring up one thing you've been holding back.",
  "Choose curiosity over assumption once today.",
  "Tell them specifically what you appreciate — not in general.",
  "Reach out mid-day just because.",
  "Pay attention to their mood today without needing to fix it.",
  "Do something small that you know they'll appreciate.",
  "Let them be right about something today — genuinely.",
  "Share one thing that's going on with you that you'd usually keep to yourself.",
];

// ── MBTI flavor fragments (assembled into a sentence, keyed by letter) ───────
// Small, cheap-to-write pool that gets combinatorial variety from assembly
// rather than needing 16 separate full-type pools.

export const MBTI_FRAGMENTS = {
  E: ["feeds off the room's energy", "says the thing out loud before thinking it all the way through", "recharges by being around people"],
  I: ["recharges best in quiet moments", "likes to process things alone before talking them out", "prefers depth over a crowded room"],
  S: ["trusts what's right in front of them", "notices the small concrete details everyone else skips", "prefers the practical over the theoretical"],
  N: ["is always chasing the bigger picture", "connects dots other people miss entirely", "gets pulled toward whatever feels possible"],
  T: ["wants the plan, not just the vibe", "leads with logic even in emotional moments", "would rather be accurate than comforted"],
  F: ["reads the room emotionally before anything else", "leads with how it feels first", "values harmony over being technically right"],
  J: ["feels better once something's decided", "brings structure without being asked to", "likes a plan and actually sticks to it"],
  P: ["keeps options open as long as possible", "works best with room to improvise", "prefers flexible plans over fixed ones"],
};

// ── Trait-combination insights (attachment × love language) ─────────────────
// The single biggest personalization multiplier: messages keyed by the
// INTERSECTION of two traits read as "how did it know that about me" where
// single-trait content reads generic. Keys: `${attachmentStyle}_${loveLanguage}`.

export const COMBO_INSIGHTS = {
  secure_words:   "You're steady enough that you rarely fish for compliments — which means people forget you still like hearing them. Being low-maintenance doesn't mean no-maintenance.",
  secure_time:    "Your calm makes shared time easy — but easy time can drift into parallel time. Presence is your love language; make some of it undivided.",
  secure_service: "You help without keeping score, and your stability makes it look effortless. Just check that 'I've got it handled' isn't quietly becoming 'I never ask.'",
  secure_touch:   "You're grounded, and physical closeness is how you top that up. On off days, you tend to give the reassuring touch you'd actually like to receive.",
  secure_gifts:   "You notice what people mention wanting and quietly remember it. That thoughtfulness is your steadiness made visible — let people do the same for you.",
  anxious_words:  "Words land deep for you — which is exactly why silence lands deeper. When it's quiet, remember: no message is usually no message, not a message.",
  anxious_time:   "Undivided attention is how you know things are okay. Distracted time can feel like distance to you when it's often just a busy day — ask before concluding.",
  anxious_service:"You show care by doing, and you notice every unreciprocated favor. Say the need out loud instead of doing one more thing and hoping it's noticed.",
  anxious_touch:  "Closeness calms your whole nervous system — a hand on the shoulder does what an hour of reassurance can't. It's okay to ask for it plainly.",
  anxious_gifts:  "Small tokens tell you that you were thought about while apart — that's the real gift. Careful not to read a forgetful week as a verdict.",
  avoidant_words: "You'd rather show it than say it, but the people who love you can't read actions fluently forever. One direct sentence buys a week of understood silence.",
  avoidant_time:  "You want togetherness without an agenda — side-by-side counts. Tell people that quiet company IS your version of quality time, or they'll keep filling it with talk.",
  avoidant_service:"Doing useful things is how you say what you'd never phrase out loud. It works — as long as someone occasionally tells the people it's aimed at.",
  avoidant_touch: "You keep distance verbally but recharge on physical closeness — a combination people misread constantly. Let one person in on the secret.",
  avoidant_gifts: "A precise, well-chosen gift is your way of proving you pay attention without having to narrate it. The precision is the point — and it's noticed.",
  fearful_words:  "Kind words matter enormously to you and are also the hardest to trust. Practice letting a compliment just be true for one full minute before auditing it.",
  fearful_time:   "You crave real time together and get twitchy when you have it. Shorter, more frequent doses build the safety that marathon closeness can't.",
  fearful_service:"You do a lot for people you're not sure will stay. Notice when helping is generosity and when it's quietly buying insurance.",
  fearful_touch:  "Physical closeness is both the thing you want and the thing that trips the alarm. You get to set the pace — slow counts as progress.",
  fearful_gifts:  "You remember every thoughtful thing anyone's given you — evidence, to you, that they saw the real you. Keep some of that evidence in view on doubtful days."
};

// ── Attachment pairing matrix (partner mode) ─────────────────────────────────
// The couple's ACTUAL dynamic — keyed `${userAttachment}_${partnerAttachment}`,
// order matters ("you" is always the primary user). {partner} is interpolated.

export const ATTACHMENT_PAIRINGS = {
  secure_secure:   "Two steady people. Your risk isn't conflict — it's coasting. Calm this reliable deserves to be spent on something, not just maintained.",
  secure_anxious:  "You're the anchor; {partner} reads the water. When {partner} checks in more than usual, it isn't doubt in you — it's their radar running. A little unprompted reassurance from you goes miles.",
  secure_avoidant: "You're comfortable close; {partner} recharges at a distance. The win condition is simple: you don't chase, and {partner} announces the retreats. Space with a return time never feels like rejection.",
  secure_fearful:  "Your consistency is quietly rewriting what closeness feels like for {partner}. Don't rush the timeline — every uneventful week is the evidence that matters.",
  anxious_secure:  "{partner}'s calm is real, not indifference — secure people just don't broadcast much. When your radar pings, ask instead of decoding; you'll get a straight answer.",
  anxious_anxious: "You both feel everything and notice everything — incredible closeness, shared spirals. When one of you starts scanning for problems, the other's job is to NOT join the search party.",
  anxious_avoidant:"The classic loop: you reach for closeness under stress, {partner} reaches for space, and each move triggers the other's. Naming which mode you're each in — out loud — breaks the cycle faster than anything else.",
  anxious_fearful: "You pursue when worried; {partner} both wants that and braces against it. Gentle consistency beats grand reassurance here — small and steady is what actually lands.",
  avoidant_secure: "{partner} gives you room without keeping score, which is exactly why this works. Repay it in the only currency that matters: occasionally coming back before you're asked to.",
  avoidant_anxious:"Your silences read louder to {partner} than they feel to you. A three-word status update — 'recharging, all good' — costs you nothing and saves {partner} an evening of theories.",
  avoidant_avoidant:"Nobody crowds anybody. The risk is two well-respected bubbles that stop touching. One of you has to be the one who reaches out each week — trade off whose turn it is.",
  avoidant_fearful:"You withdraw to recharge; {partner} withdraws to test the water. Same move, different meanings — so say which one it is. 'I need an evening' is kindness here, not oversharing.",
  fearful_secure:  "{partner} keeps showing up, and part of you keeps waiting for the catch. There's no catch. Let the boring, reliable weeks count as data too.",
  fearful_anxious: "You both want proof this is safe and you both collect it differently — {partner} by drawing closer, you by stepping back to watch. Tell each other what a test looks like, so nobody fails one they didn't know they were taking.",
  fearful_avoidant:"Push-pull squared: your guardedness reads as distance to {partner}, whose distance confirms your guardedness. Someone has to make the first small honest move — it's allowed to be you.",
  fearful_fearful: "Two careful hearts, both braced. The good news: nobody here rushes anybody. The work: making sure 'careful' doesn't quietly become the whole relationship."
};

// ── Conflict style pairings (partner mode, groove drawer) ────────────────────
// Keyed by the SORTED pair (`[a,b].sort().join('|')`) with order-neutral
// phrasing, so 10 entries cover all 16 combinations.

export const CONFLICT_PAIRINGS = {
  'collaborative|collaborative': "You both want to stay in the conversation until it's actually solved. Your only trap is over-processing small stuff — some disagreements just need a shrug and dinner.",
  'collaborative|compromising':  "One of you wants to dig to the root; the other wants a fair deal by Tuesday. Agree upfront which kind of problem this is — a dig-deep one or a split-the-difference one.",
  'accommodating|collaborative': "One of you talks it all the way through; the other folds early to keep the peace. Watch for false agreement — 'fine' given quickly isn't the same as fine.",
  'avoiding|collaborative':      "One of you processes by talking now, the other by cooling off first. The fix is a scheduled return: 'pause now, finish at 8' gives one of you the space and the other the certainty.",
  'compromising|compromising':   "You two settle things fast and fair — efficient, low-drama. Just make sure the big recurring topics get one full airing eventually, instead of fifty small trades.",
  'accommodating|compromising':  "Deals get made quickly here, but one of you may be paying more than they let on. Every so often, re-open a 'settled' topic and ask if it actually feels settled.",
  'avoiding|compromising':       "One of you wants it resolved fast; the other wants it postponed. A short, bounded pause satisfies both: real cool-down, guaranteed landing.",
  'accommodating|accommodating': "You'd both rather bend than battle — so nothing ever blows up, and nothing ever quite gets said. Take turns going first with the honest version.",
  'accommodating|avoiding':      "One of you yields, the other retreats — conflict just evaporates without resolving. Pick your smallest live issue and practice finishing it on purpose.",
  'avoiding|avoiding':           "You both step back when it gets tense, which keeps things calm and keeps things unresolved. Put a return-time on every pause, or the pause becomes the policy."
};

// Solo conflict-style lines for the groove drawer.
export const CONFLICT_SOLO = {
  collaborative: "In conflict you instinctively look for the version where both people win — a genuine skill. Just notice when the other person needs empathy first and solutions second.",
  compromising:  "You settle things quickly and fairly, and people appreciate it. Once in a while, check whether 'meeting in the middle' is costing you something you actually cared about.",
  accommodating: "You keep the peace by bending — generous, and easy to overdraw. The resentment ledger fills up quietly; say the honest thing while it's still small.",
  avoiding:      "You need space before you can engage, and that's legitimate — cool-down produces your best conversations. Just attach a return time, so space reads as process, not exit."
};

// ── Growth Compass content ───────────────────────────────────────────────────
// Four life areas, each keyed by the trait that best predicts the person's
// pattern in that area. Every entry: a short read + one concrete practice.

export const GROWTH_AREAS = {
  connection: {
    title: 'Connection',
    keyed: 'attachmentStyle',
    entries: {
      secure:   { read: "Closeness comes naturally to you — you're often the emotional floor other people stand on.", practice: "Ask for support once this week before you technically need it." },
      anxious:  { read: "You attune to people fast and deeply; the flip side is treating every quiet moment as a signal to decode.", practice: "When the radar pings this week, ask one direct question instead of running three theories." },
      avoidant: { read: "You connect through reliability and presence more than disclosure — real, but easy for others to under-read.", practice: "Share one unpolished, in-progress thought with someone this week." },
      fearful:  { read: "You want depth and vet it carefully — when you do let someone in, it means everything.", practice: "Let one small bid for closeness land this week without auditing it first." }
    }
  },
  communication: {
    title: 'Communication',
    keyed: 'expressionStyle',
    entries: {
      direct:     { read: "People always know where you stand — rare and valuable. Delivery, not honesty, is your growth edge.", practice: "Before one hard truth this week, add a sentence of warmth first. Same message, better landing." },
      indirect:   { read: "You communicate in context and hints — considerate, but it outsources guesswork to people who love you.", practice: "Say one need this week in plain words, no hint version first." },
      reflective: { read: "You think before you speak, so what you say is worth hearing. The cost is people filling your silence with their guesses.", practice: "When you need time this week, say so out loud — 'still thinking, back tomorrow' — instead of going quiet." },
      analytical: { read: "You turn messy feelings into workable structure — a superpower, mistimed as a fix-it reflex.", practice: "In one emotional conversation this week, ask 'vent or solve?' before doing either." }
    }
  },
  conflict: {
    title: 'Conflict',
    keyed: 'conflictStyle',
    entries: {
      collaborative: { read: "You stay in hard conversations until they're genuinely resolved — most people can't.", practice: "Pick one small disagreement this week and deliberately let it go unresolved. Notice that nothing breaks." },
      compromising:  { read: "You're fast to a fair deal, which keeps life moving and occasionally papers over the real issue.", practice: "Revisit one past compromise this week and check whether it still feels fair to you." },
      accommodating: { read: "You yield to protect the relationship — kind, and habit-forming in a costly way.", practice: "State one preference this week and hold it through the first pushback." },
      avoiding:      { read: "Your pauses genuinely produce better conversations — when they end.", practice: "Next pause you take, name the return time before you step away." }
    }
  },
  selfcare: {
    title: 'Self-Care',
    keyed: 'loveLanguage',
    entries: {
      words:   { read: "You run on acknowledgment — and you're likely last in line for your own.", practice: "Write down one thing you handled well this week, in the words you'd use for a friend." },
      time:    { read: "Undivided attention restores you — including your own. Scattered time drains you fastest.", practice: "Block 30 phone-free minutes this week that belong to nobody but you." },
      service: { read: "You care by doing, which means your own tank empties while everyone else's gets filled.", practice: "Do one future-you favor this week with the same energy you'd spend on someone else's errand." },
      touch:   { read: "Your body keeps the score — physical comfort regulates you more than talk does.", practice: "Build one physical reset into this week: the long shower, the walk, the early night." },
      gifts:   { read: "Small tangible tokens of care register deeply with you — and you rarely aim that at yourself.", practice: "Get yourself the small thing you keep almost buying. It counts as maintenance, not indulgence." }
    }
  }
};
