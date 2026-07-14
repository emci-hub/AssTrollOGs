/**
 * Supabase client singleton.
 * All cloud persistence goes through this. Never import createClient directly elsewhere.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && key) ? createClient(url, key) : null;

// ─── Device ID ───────────────────────────────────────────────────────────────
// Generated once on first run, persisted in localStorage as the user's cloud key.

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function getDeviceId() {
  let id = localStorage.getItem('vibeDeviceId');
  if (!id) {
    id = generateUUID();
    localStorage.setItem('vibeDeviceId', id);
  }
  return id;
}

// ─── Cloud sync ───────────────────────────────────────────────────────────────

/**
 * Saves profile payload to Supabase keyed by device_id.
 * Optionally attaches a save_code for cross-device lookup.
 */
export async function cloudSave(payload, saveCode) {
  if (!supabase) return;
  try {
    const deviceId = getDeviceId();
    const row = {
      device_id: deviceId,
      profile_data: payload,
      schema_version: payload.schemaVersion || 1,
      updated_at: new Date().toISOString()
    };
    if (saveCode) row.save_code = saveCode;
    await supabase.from('user_sessions').upsert(row, { onConflict: 'device_id' });
  } catch (_) {
    // Cloud sync failures are silent — localStorage is always the source of truth
  }
}

/**
 * Loads profile by device_id (same device restore).
 */
export async function cloudLoad() {
  if (!supabase) return null;
  try {
    const deviceId = getDeviceId();
    const { data } = await supabase
      .from('user_sessions')
      .select('profile_data, updated_at')
      .eq('device_id', deviceId)
      .maybeSingle();
    return data?.profile_data || null;
  } catch (_) {
    return null;
  }
}

/**
 * Loads profile by save code (cross-device restore).
 * Returns { profileData, saveCode } or null if not found.
 */
export async function cloudLoadByCode(code) {
  if (!supabase || !code) return null;
  try {
    const normalised = code.toUpperCase().replace(/[-\s]/g, '');
    // Build all valid formatted variants to match against the stored value
    const formatted = `VIBE-${normalised.slice(0, 4)}-${normalised.slice(4, 8)}`;
    const { data } = await supabase
      .from('user_sessions')
      .select('profile_data, save_code')
      .or(`save_code.eq.${formatted},save_code.eq.${normalised}`)
      .maybeSingle();
    if (!data?.profile_data) return null;
    return { profileData: data.profile_data, saveCode: data.save_code };
  } catch (_) {
    return null;
  }
}
