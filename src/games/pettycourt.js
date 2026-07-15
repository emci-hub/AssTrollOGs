/**
 * Petty Court — the pet presides over humanity's most important disputes.
 *
 * Partner mode: pass-the-phone. You pick a side in secret, hand the phone
 * over, your partner picks theirs, and the pet delivers a verdict. Agreement
 * rate is stored (gd.pettycourt) and feeds game insights.
 *
 * Solo mode: you pick a side and the pet rules on you vs. "public opinion"
 * (a deterministic per-question stance, so the court is consistent —
 * corrupt, but consistent).
 */

import { saveGameData, canAwardPetGrowthToday, recordPetGrowthToday } from '../state.js';
import { awardPetGrowth } from '../pet.js';
import { accountSalt, hashStr, pickFrom, kickerFor } from '../composer.js';

const DISPUTES = [
  { title: "Is a hotdog a sandwich?", a: "Obviously yes", b: "Absolutely not" },
  { title: "Toilet paper: over or under?", a: "Over, like civilization intended", b: "Under, like a free spirit" },
  { title: "Pineapple on pizza", a: "Delicious, next question", b: "A crime scene" },
  { title: "Cereal: milk first or cereal first?", a: "Cereal first, obviously", b: "Milk first, chaos forever" },
  { title: "Is a straw one hole or two?", a: "One", b: "Two" },
  { title: "The cinema armrest belongs to...", a: "Whoever claims it first", b: "It's shared — be civilized" },
  { title: "Cold pizza for breakfast", a: "Elite", b: "Unwell behavior" },
  { title: "Socks with sandals", a: "Comfort is king", b: "Jail. Immediately." },
  { title: "Is water wet?", a: "Yes, self-evidently", b: "No — water MAKES things wet" },
  { title: "Ketchup lives in the...", a: "Fridge", b: "Cupboard" },
  { title: "How many wears do jeans get?", a: "Two, maximum", b: "Until they walk away on their own" },
  { title: "GIF is pronounced...", a: "Hard G, like gift", b: "Soft G, like the inventor said" },
  { title: "Subtitles on everything?", a: "Always on", b: "Only for the whispering shows" },
  { title: "Correct shower temperature:", a: "Pleasantly warm", b: "Surface of the sun" },
  { title: "Phone calls without a warning text", a: "Fine, normal, healthy", b: "An act of aggression" },
  { title: "Is the dessert stomach real?", a: "Medically real", b: "An excuse (a good one)" },
  { title: "Dinner at 7pm is...", a: "Early", b: "Late" },
  { title: "Double texting is...", a: "Enthusiasm — love it", b: "A cool-down violation" },
];

const AGREE_VERDICTS = [
  "The court finds you disgustingly compatible. Case dismissed. Get a room.",
  "Unanimous. The court is moved. The judge is adding this to the wedding-toast file.",
  "Same side, zero deliberation. The court calls this 'a keeper situation' and adjourns for snacks.",
];

const DISAGREE_VERDICTS = [
  "After careful deliberation (one nap), the court rules for {winner}. {loser} may appeal by making dinner.",
  "The court rules in favor of {winner}. {loser}'s argument was heartfelt, wrong, and noted for the record.",
  "Verdict: {winner} is right. The court reminds {loser} that being wrong together is also intimacy.",
];

const SOLO_MATCH_VERDICTS = [
  "The court AND the general public side with you. Insufferable, but correct.",
  "You and public opinion, perfectly aligned. The court finds this suspiciously well-adjusted.",
  "Correct — says the court, the public, and one very smug judge.",
];

const SOLO_CLASH_VERDICTS = [
  "The public disagrees, but the court respects a maverick. Ruling: wrong, iconically.",
  "Against public opinion AND proud of it. The court fines you one snack, payable to yourself.",
  "The people have spoken, and honestly they might be wrong too. Court adjourned.",
];

let currentCase = null;
let _phase = 'pick';   // partner mode: 'pick' → 'handoff' → 'partner' → 'verdict'
let _userPick = null;
let shownCases = [];

function isSolo() {
  return window.AppState.soloMode || !window.AppState.partnerProfile;
}

function judgeName() {
  return window.AppState.gameData?.pet?.user?.name || 'The Judge';
}

function partnerName() {
  return window.AppState.partnerProfile?.name || 'your partner';
}

function userName() {
  return window.AppState.userProfile?.name || 'You';
}

function pickCase() {
  if (shownCases.length >= DISPUTES.length) shownCases = [];
  // Deterministic rotation seeded by cases heard + account salt.
  const heard = window.AppState.gameData?.pettycourt?.cases || 0;
  let idx = (heard + accountSalt() + shownCases.length) % DISPUTES.length;
  while (shownCases.includes(idx)) idx = (idx + 1) % DISPUTES.length;
  shownCases.push(idx);
  currentCase = DISPUTES[idx];
}

// The "public opinion" side for solo mode — deterministic per question so
// the court never flip-flops on precedent.
function publicSide(dispute) {
  return hashStr(dispute.title) % 2 === 0 ? 'a' : 'b';
}

function renderCase() {
  const area = document.getElementById('pettycourt-area');
  if (!area) return;
  _phase = 'pick';
  _userPick = null;
  const solo = isSolo();
  area.innerHTML = `
    <div class="card" style="margin-bottom:12px; text-align:center;">
      <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">Case #${(window.AppState.gameData?.pettycourt?.cases || 0) + 1} — ${judgeName()} presiding</div>
      <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">${currentCase.title}</div>
      ${solo ? '' : `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px;">${userName()} picks first — in secret.</div>`}
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="choice-btn" style="text-align:left;" onclick="pettyCourtPick('a')">${currentCase.a}</button>
      <button class="choice-btn" style="text-align:left;" onclick="pettyCourtPick('b')">${currentCase.b}</button>
    </div>
  `;
}

function renderHandoff() {
  const area = document.getElementById('pettycourt-area');
  if (!area) return;
  _phase = 'handoff';
  area.innerHTML = `
    <div style="text-align:center; padding:14px 0;">
      <div style="font-size:2rem; margin-bottom:8px;">⚖️</div>
      <div style="font-size:0.9rem; font-weight:700; margin-bottom:6px;">Hand the phone to ${partnerName()}</div>
      <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:16px;">The first pick is sealed. No peeking. The court is watching.</div>
      <button class="btn" onclick="pettyCourtPartnerReady()">I'm ${partnerName()} — show me the case</button>
    </div>
  `;
}

function renderPartnerPick() {
  const area = document.getElementById('pettycourt-area');
  if (!area) return;
  _phase = 'partner';
  area.innerHTML = `
    <div class="card" style="margin-bottom:12px; text-align:center;">
      <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">${judgeName()} presiding</div>
      <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">${currentCase.title}</div>
      <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px;">${partnerName()}, where do you stand?</div>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="choice-btn" style="text-align:left;" onclick="pettyCourtPick('a')">${currentCase.a}</button>
      <button class="choice-btn" style="text-align:left;" onclick="pettyCourtPick('b')">${currentCase.b}</button>
    </div>
  `;
}

function renderVerdict(text, agreed) {
  const area = document.getElementById('pettycourt-area');
  if (!area) return;
  _phase = 'verdict';
  const gd = window.AppState.gameData;
  const pc = gd.pettycourt;
  const rate = pc.cases > 0 && !isSolo() ? ` You agree on ${Math.round((pc.agreements / pc.cases) * 100)}% of the docket so far.` : '';
  area.innerHTML = `
    <div style="text-align:center; padding:10px 0;">
      <div style="font-size:2rem; margin-bottom:8px;">${agreed ? '💞' : '🔨'}</div>
      <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">The verdict of ${judgeName()}</div>
      <div style="font-size:0.85rem; color:var(--text-primary); line-height:1.6; margin-bottom:8px;">${text}</div>
      <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:14px;">${rate}</div>
      <button class="btn" onclick="pettyCourtNextCase()">Next Case</button>
    </div>
  `;
}

function recordCase(agreed) {
  const gd = window.AppState.gameData;
  if (!gd.pettycourt) gd.pettycourt = { cases: 0, agreements: 0, lastPlayed: null };
  gd.pettycourt.cases += 1;
  if (agreed) gd.pettycourt.agreements += 1;
  gd.pettycourt.lastPlayed = new Date().toISOString();
  saveGameData();
  if (canAwardPetGrowthToday('pettycourt')) {
    recordPetGrowthToday('pettycourt');
    awardPetGrowth(1);
  }
}

function deliverPartnerVerdict(userPick, partnerPick) {
  const gd = window.AppState.gameData;
  const heard = gd.pettycourt?.cases || 0;
  const agreed = userPick === partnerPick;
  let text;
  if (agreed) {
    text = pickFrom(AGREE_VERDICTS, heard, accountSalt(), currentCase.title);
  } else {
    // The court picks a winner deterministically per case — precedent matters.
    const winnerSide = publicSide(currentCase);
    const winner = winnerSide === userPick ? userName() : partnerName();
    const loser = winnerSide === userPick ? partnerName() : userName();
    text = pickFrom(DISAGREE_VERDICTS, heard, accountSalt(), currentCase.title)
      .replace(/\{winner\}/g, winner).replace(/\{loser\}/g, loser);
  }
  const kicker = kickerFor('general', heard, currentCase.title, 'pettycourt');
  if (kicker) text += ` ${kicker}`;
  recordCase(agreed);
  renderVerdict(text, agreed);
}

function deliverSoloVerdict(userPick) {
  const gd = window.AppState.gameData;
  const heard = gd.pettycourt?.cases || 0;
  const matched = userPick === publicSide(currentCase);
  let text = pickFrom(matched ? SOLO_MATCH_VERDICTS : SOLO_CLASH_VERDICTS, heard, accountSalt(), currentCase.title);
  const kicker = kickerFor('general', heard, currentCase.title, 'pettycourt');
  if (kicker) text += ` ${kicker}`;
  recordCase(matched);
  renderVerdict(text, matched);
}

function pick(side) {
  if (!currentCase) return;
  if (isSolo()) {
    deliverSoloVerdict(side);
    return;
  }
  if (_phase === 'pick') {
    _userPick = side;
    renderHandoff();
  } else if (_phase === 'partner') {
    deliverPartnerVerdict(_userPick, side);
  }
}

export const pettyCourtGame = {
  id: 'pettycourt',
  title: 'Petty Court',
  renderDrawer: () => {
    const solo = isSolo();
    const pName = partnerName();
    return `
      <div class="subtitle">Games</div>
      <h2 style="margin-bottom:4px;">Petty Court</h2>
      <p class="card-body" style="margin-bottom:16px;">${solo
        ? `The great debates of our time, ruled on by ${judgeName()}. Pick your side; the court compares you to public opinion.`
        : `You and ${pName} take sides on the great debates of our time — in secret — and ${judgeName()} delivers the verdict.`}</p>
      <div id="pettycourt-area"></div>
    `;
  },
  init: () => {
    shownCases = [];
    pickCase();
    renderCase();
  },
  bindWindow: () => {
    window.pettyCourtPick = pick;
    window.pettyCourtPartnerReady = renderPartnerPick;
    window.pettyCourtNextCase = () => { pickCase(); renderCase(); };
  }
};
