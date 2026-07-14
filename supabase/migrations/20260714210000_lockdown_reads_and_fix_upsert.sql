/*
# Lock down reads + fix the upsert conflict target

## Why
1. The open SELECT policy (`USING (true)`) let anyone holding the shipped anon
   key enumerate the entire user_sessions table — every user's name, location,
   and full personality profile. Reads now require knowing the exact device_id
   or save_code, enforced by SECURITY DEFINER lookup functions.
2. `cloudSave()` upserts with `onConflict: 'device_id'`, but device_id only
   ever had a plain (non-unique) index — Postgres rejects ON CONFLICT without
   a matching unique constraint, so every cloud save has been silently failing.
   Dedupe any accidental duplicates, then add the unique index the upsert needs.
3. The app never deletes rows, so the open DELETE policy goes too.

Writes stay open (insert/update with `true`) because the device_id in the row
is itself the opaque access key, same trust model as before.
*/

-- 1. Dedupe device_id rows (keep the newest per device), then enforce uniqueness
DELETE FROM user_sessions a
USING user_sessions b
WHERE a.device_id = b.device_id
  AND (a.updated_at < b.updated_at
       OR (a.updated_at = b.updated_at AND a.id < b.id));

DROP INDEX IF EXISTS idx_user_sessions_device_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_device_id
  ON user_sessions(device_id);

-- 2. Remove open read + delete access
DROP POLICY IF EXISTS "anon_select_sessions" ON user_sessions;
DROP POLICY IF EXISTS "anon_delete_sessions" ON user_sessions;

-- 3. Key-required lookups. SECURITY DEFINER bypasses RLS, but each function
--    only ever returns the single row matching the exact key the caller
--    already holds — no enumeration surface.
CREATE OR REPLACE FUNCTION get_session_by_device(p_device_id text)
RETURNS TABLE (profile_data jsonb, save_code text, updated_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.profile_data, s.save_code, s.updated_at
  FROM user_sessions s
  WHERE p_device_id IS NOT NULL
    AND length(p_device_id) >= 8
    AND s.device_id = p_device_id
  ORDER BY s.updated_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_session_by_code(p_code text)
RETURNS TABLE (profile_data jsonb, save_code text, updated_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.profile_data, s.save_code, s.updated_at
  FROM user_sessions s
  WHERE p_code IS NOT NULL
    AND length(regexp_replace(upper(p_code), '[^A-Z2-9]', '', 'g')) >= 8
    AND regexp_replace(upper(coalesce(s.save_code, '')), '[^A-Z2-9]', '', 'g')
        = regexp_replace(upper(p_code), '[^A-Z2-9]', '', 'g')
  ORDER BY s.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_session_by_device(text) FROM public;
REVOKE ALL ON FUNCTION get_session_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION get_session_by_device(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_session_by_code(text) TO anon, authenticated;
