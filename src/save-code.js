/**
 * Hash-verified save code system.
 *
 * A save code is an 8-character Base32 string formatted as VIBE-XXXX-XXXX.
 * It is derived from a SHA-256 hash of the user's stable identity fields
 * (userProfile + partnerProfile + soloMode + vibeSeed) — NOT game data, which
 * changes constantly and would invalidate the code on every session.
 *
 * The code is used as a cross-device restore key: the user notes it down,
 * enters it on a new device, and the app loads their full save from Supabase
 * after verifying the code matches the stored payload.
 */

const BASE32_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Crockford-style, no 0/O/I/1

function _identityPayload(savePackage) {
  return JSON.stringify({
    userProfile: savePackage.userProfile || null,
    partnerProfile: savePackage.partnerProfile || null,
    soloMode: savePackage.soloMode || false,
    vibeSeed: savePackage.vibeSeed || null
  });
}

async function _sha256Bytes(str) {
  const encoded = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(hashBuffer);
}

function _bytesToBase32(bytes) {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_CHARS[(value >> bits) & 0x1f];
    }
  }
  return result;
}

/**
 * Generates a save code from a profile package.
 * Returns a formatted string like "VIBE-K7X2-MN4P".
 * Async because Web Crypto is promise-based.
 */
export async function generateSaveCode(savePackage) {
  const payload = _identityPayload(savePackage);
  const bytes = await _sha256Bytes(payload);
  const raw = _bytesToBase32(bytes).slice(0, 8).toUpperCase();
  return formatCode(raw);
}

/**
 * Verifies that a user-supplied code matches the expected code for a payload.
 * Returns true if the code is valid.
 */
export async function verifySaveCode(code, savePackage) {
  const expected = await generateSaveCode(savePackage);
  return stripFormatting(code) === stripFormatting(expected);
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
