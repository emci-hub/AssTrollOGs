/**
 * Em-Pal — a small, unrelated bonus section for the Palworld server the app
 * owner runs on the side. Not part of the personality/relationship data
 * model at all; just a static drawer with patch notes + connect info so
 * friends who already use the app can find the server.
 *
 * TO UPDATE THE SERVER INFO: edit EM_PAL_CONNECT below. That's the only
 * thing that ever needs to change here.
 */

export const EM_PAL_CONNECT = {
  ip: '',       // e.g. '203.0.113.10'  — leave blank to show "coming soon"
  port: '8211',
  password: '',
  discord: '',  // optional invite link, e.g. 'https://discord.gg/xxxxx'
  note: ''      // optional short note shown under the connect card
};

function connectRow(id, label, value) {
  if (!value) return '';
  return `
    <div class="save-code-display-row" style="margin-bottom:8px;">
      <span id="${id}" class="save-code-value" style="font-size:0.95rem;">${value}</span>
      <button class="save-code-copy-btn" onclick="copyEmPalField('${id}')">Copy</button>
    </div>
    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin:-4px 0 12px;">${label}</div>
  `;
}

function renderConnectCard() {
  const hasServer = !!EM_PAL_CONNECT.ip;
  if (!hasServer) {
    return `
      <div class="card save-code-card">
        <div class="card-title" style="margin-bottom:6px;">Connect</div>
        <p class="card-body">Server's not up yet — check back soon.</p>
      </div>
    `;
  }
  return `
    <div class="card save-code-card">
      <div class="card-title" style="margin-bottom:12px;">Connect</div>
      ${connectRow('empal-ip', 'Server IP', EM_PAL_CONNECT.ip)}
      ${connectRow('empal-port', 'Port', EM_PAL_CONNECT.port)}
      ${connectRow('empal-password', 'Password', EM_PAL_CONNECT.password)}
      ${EM_PAL_CONNECT.discord ? `<a href="${EM_PAL_CONNECT.discord}" target="_blank" rel="noopener" class="btn btn-outline" style="display:block; text-align:center; margin-top:4px; text-decoration:none;">Join the Discord</a>` : ''}
      ${EM_PAL_CONNECT.note ? `<p class="card-body" style="margin-top:10px; font-size:0.72rem; color:var(--text-muted);">${EM_PAL_CONNECT.note}</p>` : ''}
    </div>
  `;
}

// The patch-notes poster — inlined as-authored, not restyled to match the
// app's theme system. It's a fixed dark card-game illustration by design.
const POSTER_SVG = `
<svg width="680" height="1130" viewBox="0 0 680 1130" xmlns="http://www.w3.org/2000/svg" role="img" style="width:100%; height:auto; display:block; border-radius:12px;">
<title>Em-Pal server patch notes poster with real settings</title>
<desc>A dark, gold-accented card-game style poster for the Em-Pal Palworld server showing exact server settings: XP rate 2.5x, capture rate 2.5x, work speed 5x, and base limits, each with a short reason, plus a quick-glance list of other rates and a short list of gameplay changes.</desc>
<rect x="0" y="0" width="680" height="1130" fill="#17171a"/>
<path d="M20 20 L40 20 L40 24 L24 24 L24 40 L20 40 Z" fill="#E8935D"/>
<path d="M660 20 L640 20 L640 24 L656 24 L656 40 L660 40 Z" fill="#E8935D"/>
<path d="M20 1110 L40 1110 L40 1106 L24 1106 L24 1090 L20 1090 Z" fill="#E8935D"/>
<path d="M660 1110 L640 1110 L640 1106 L656 1106 L656 1090 L660 1090 Z" fill="#E8935D"/>
<text x="340" y="66" text-anchor="middle" style="font-family: sans-serif; font-size:34px;font-weight:500;letter-spacing:5px;fill:#E8935D">EM-PAL</text>
<text x="340" y="90" text-anchor="middle" style="font-family: sans-serif; font-size:12px;letter-spacing:3px;fill:#ABA89F">PALWORLD SERVER — PATCH NOTES</text>
<rect x="40" y="130" width="600" height="96" rx="10" fill="#1F1F24" stroke="#33333A" stroke-width="0.5"/>
<rect x="40" y="130" width="4" height="96" fill="#E8935D"/>
<text x="60" y="168" style="font-family: sans-serif; font-size:17px;font-weight:500;fill:#F0EDE4">XP rate — <tspan fill="#E8935D">2.5x</tspan></text>
<text x="60" y="194" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Level up and unlock tech fast, without hours of repetitive grinding</text>
<rect x="40" y="240" width="600" height="96" rx="10" fill="#1F1F24" stroke="#33333A" stroke-width="0.5"/>
<rect x="40" y="240" width="4" height="96" fill="#5AA9E0"/>
<text x="60" y="278" style="font-family: sans-serif; font-size:17px;font-weight:500;fill:#F0EDE4">Capture rate — <tspan fill="#5AA9E0">2.5x</tspan></text>
<text x="60" y="304" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Fewer wasted Spheres — more "got it" moments, less save-scumming</text>
<rect x="40" y="350" width="600" height="96" rx="10" fill="#1F1F24" stroke="#33333A" stroke-width="0.5"/>
<rect x="40" y="350" width="4" height="96" fill="#F2D34D"/>
<text x="60" y="388" style="font-family: sans-serif; font-size:17px;font-weight:500;fill:#F0EDE4">Work speed — <tspan fill="#F2D34D">5x</tspan></text>
<text x="60" y="414" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">1-2 Pals per station now outproduces a crowded base</text>
<rect x="40" y="460" width="600" height="96" rx="10" fill="#1F1F24" stroke="#33333A" stroke-width="0.5"/>
<rect x="40" y="460" width="4" height="96" fill="#E8935D"/>
<text x="60" y="498" style="font-family: sans-serif; font-size:17px;font-weight:500;fill:#F0EDE4">Base limits — <tspan fill="#E8935D">8 per base, 50 total</tspan></text>
<text x="60" y="524" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Keeps performance smooth for everyone online</text>
<line x1="40" y1="576" x2="640" y2="576" stroke="#33333A" stroke-width="1"/>
<polygon points="340,572 344,576 340,580 336,576" fill="#E8935D"/>
<text x="40" y="608" style="font-family: sans-serif; font-size:14px;font-weight:500;letter-spacing:3px;fill:#E8935D">AT A GLANCE</text>
<text x="60" y="638" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Spawn density</text>
<text x="310" y="638" text-anchor="end" style="font-family: sans-serif; font-size:13px;font-weight:500;fill:#F0EDE4">0.8x</text>
<text x="360" y="638" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Hunger drain</text>
<text x="610" y="638" text-anchor="end" style="font-family: sans-serif; font-size:13px;font-weight:500;fill:#F0EDE4">0.3x</text>
<text x="60" y="672" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Weight rate</text>
<text x="310" y="672" text-anchor="end" style="font-family: sans-serif; font-size:13px;font-weight:500;fill:#F0EDE4">0.3x</text>
<text x="360" y="672" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Gathering yield</text>
<text x="610" y="672" text-anchor="end" style="font-family: sans-serif; font-size:13px;font-weight:500;fill:#F0EDE4">2x</text>
<text x="60" y="706" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Enemy loot</text>
<text x="310" y="706" text-anchor="end" style="font-family: sans-serif; font-size:13px;font-weight:500;fill:#F0EDE4">1.5x</text>
<text x="360" y="706" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Player cap</text>
<text x="610" y="706" text-anchor="end" style="font-family: sans-serif; font-size:13px;font-weight:500;fill:#F0EDE4">16</text>
<line x1="40" y1="730" x2="640" y2="730" stroke="#33333A" stroke-width="1"/>
<polygon points="340,726 344,730 340,734 336,730" fill="#E8935D"/>
<text x="40" y="762" style="font-family: sans-serif; font-size:14px;font-weight:500;letter-spacing:3px;fill:#E8935D">MORE CHANGES</text>
<polygon points="44,783 48,787 44,791 40,787" fill="#5AA9E0"/>
<text x="60" y="792" style="font-family: sans-serif; font-size:15px;font-weight:500;fill:#F0EDE4">Catch Pals, not headaches</text>
<text x="60" y="812" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Bosses hit back harder and take real strategy — catchable once geared up</text>
<line x1="40" y1="835" x2="640" y2="835" stroke="#33333A" stroke-width="0.5"/>
<polygon points="44,853 48,857 44,861 40,857" fill="#F2D34D"/>
<text x="60" y="862" style="font-family: sans-serif; font-size:15px;font-weight:500;fill:#F0EDE4">A real endgame, not a treadmill</text>
<text x="60" y="882" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Built for about 1-2 weeks of play; legendary gear stays reachable, never trivial</text>
<line x1="40" y1="905" x2="640" y2="905" stroke="#33333A" stroke-width="0.5"/>
<polygon points="44,923 48,927 44,931 40,927" fill="#E8935D"/>
<text x="60" y="932" style="font-family: sans-serif; font-size:15px;font-weight:500;fill:#F0EDE4">Room for the whole crew</text>
<text x="60" y="952" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Monsters stay dangerous no matter how many players join</text>
<line x1="40" y1="975" x2="640" y2="975" stroke="#33333A" stroke-width="0.5"/>
<polygon points="44,993 48,997 44,1001 40,997" fill="#5AA9E0"/>
<text x="60" y="1002" style="font-family: sans-serif; font-size:15px;font-weight:500;fill:#F0EDE4">Rock-solid recovery</text>
<text x="60" y="1022" style="font-family: sans-serif; font-size:13px;fill:#ABA89F">Automatic backups, crash auto-restart, one-command rebuild script</text>
<line x1="40" y1="1045" x2="640" y2="1045" stroke="#33333A" stroke-width="0.5"/>
<text x="340" y="1080" text-anchor="middle" style="font-family: sans-serif; font-size:11px;letter-spacing:2px;fill:#5A5A5E">© EM-PAL SERVER</text>
</svg>
`;

export function renderEmPalDrawer() {
  return `
    <div class="subtitle">Elsewhere</div>
    <h2 style="margin-bottom:12px;">Em-Pal — Palworld Server</h2>
    <p class="card-body" style="margin-bottom:16px;">A Palworld server on the side. Not part of the personality stuff above — just parking the connect info here so it's easy to find.</p>
    <div style="border-radius:12px; overflow:hidden; margin-bottom:16px;">${POSTER_SVG}</div>
    ${renderConnectCard()}
  `;
}

export function copyEmPalField(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const btn = el.parentElement?.querySelector('.save-code-copy-btn');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  }).catch(() => {});
}
