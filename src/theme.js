/**
 * Theme engine.
 *
 * Themes are pure CSS (see themes.css) — this module just tracks which one
 * is active, persists the choice, and applies it via a `data-theme`
 * attribute on <html>. index.html also has a tiny inline boot script that
 * applies the saved theme before first paint (this module doesn't need to
 * duplicate that — by the time app.js runs, the attribute may already be
 * set; getActiveTheme() reads it back rather than assuming 'dark').
 */

export const THEMES = [
  { id: 'dark',  label: 'Dark',  emoji: '🌙', swatch: '#818cf8' },
  { id: 'light', label: 'Light', emoji: '☀️', swatch: '#6366f1' },
  { id: 'cool',  label: 'Cool',  emoji: '🧊', swatch: '#38bdf8' },
  { id: 'fun',   label: 'Fun',   emoji: '🎈', swatch: '#ff5fa2' },
  { id: 'robot', label: 'Robot', emoji: '🤖', swatch: '#39ff88' },
  { id: 'anime', label: 'Anime', emoji: '✨', swatch: '#ff2d78' }
];

const STORAGE_KEY = 'vibeTheme';
const DEFAULT_THEME = 'dark';
const VALID_IDS = new Set(THEMES.map(t => t.id));

export function getActiveTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  if (current && VALID_IDS.has(current)) return current;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_IDS.has(stored)) return stored;
  } catch (_) {}
  return DEFAULT_THEME;
}

export function setTheme(id) {
  if (!VALID_IDS.has(id)) return;
  if (id === DEFAULT_THEME) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', id);
  }
  try { localStorage.setItem(STORAGE_KEY, id); } catch (_) {}
}

/** Called once on app boot — re-applies the saved theme (a no-op if the
 * inline boot script in index.html already did, but cheap and keeps this
 * module as the single source of truth for anything that reads it later). */
export function applyStoredTheme() {
  setTheme(getActiveTheme());
}

// ─── Appearance section (dashboard) ────────────────────────────────────────

export function renderAppearanceSection() {
  const container = document.getElementById('appearance-section');
  if (!container) return;
  const active = getActiveTheme();
  container.innerHTML = `
    <div class="theme-swatch-grid">
      ${THEMES.map(t => `
        <button class="theme-swatch-btn ${t.id === active ? 'active' : ''}" onclick="selectTheme('${t.id}')">
          <span class="theme-swatch-dot" style="background:${t.swatch};"></span>
          <span class="theme-swatch-emoji">${t.emoji}</span>
          <span class="theme-swatch-label">${t.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

window.selectTheme = function(id) {
  setTheme(id);
  renderAppearanceSection();
};
