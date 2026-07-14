/**
 * Save code system.
 *
 * A save code is an 8-character Base32 string formatted as VIBE-XXXX-XXXX,
 * generated ONCE from crypto-grade randomness when the profile is first
 * created, and never regenerated — editing your profile does not change it,
 * so a code written on paper keeps working forever.
 *
 * The code is a pure lookup key: entering it on a new device fetches the
 * newest cloud row tagged with that code (cloudLoadByCode in supabase.js).
 * It carries no data itself and is not derived from the profile.
 */

const BASE32_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Crockford-style, no 0/O/I/1

/**
 * Generates a fresh random save code, formatted "VIBE-K7X2-MN4P".
 * 8 chars of base32 = 40 bits — plenty against guessing, short enough to
 * write on a sticky note.
 */
export function generateSaveCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let raw = '';
  // 256 / 32 = 8 exactly, so the modulo introduces no bias.
  for (const b of bytes) raw += BASE32_CHARS[b % 32];
  return formatCode(raw);
}

/**
 * Normalises a code string: uppercase, remove dashes and spaces.
 */
export function stripFormatting(code) {
  return (code || '').toUpperCase().replace(/[-\s]/g, '');
}

/**
 * Formats an 8-char raw code as VIBE-XXXX-XXXX.
 */
export function formatCode(raw) {
  const r = raw.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8);
  if (r.length < 8) return `VIBE-${r.padEnd(8, '?').slice(0, 4)}-${r.padEnd(8, '?').slice(4, 8)}`;
  return `VIBE-${r.slice(0, 4)}-${r.slice(4, 8)}`;
}
