/*
# Full bootstrap — run this ONCE in the Supabase SQL Editor

Consolidates all four files in supabase/migrations/ into a single script that
works on a FRESH project (where user_sessions never existed). Safe to re-run:
everything is IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.

End state (matches what the app in src/supabase.js expects):
- user_sessions table with a UNIQUE device_id index (required by cloudSave()'s
  upsert onConflict:'device_id') and a plain save_code lookup index (NOT
  unique — multiple devices legitimately share one save code).
- RLS on. Writes open (device_id in the row is the opaque access key).
  NO open SELECT or DELETE policy — reads only via the two SECURITY DEFINER
  RPCs below, which require knowing the exact key and return a single row.
*/

-- ── 1. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  profile_data jsonb NOT NULL DEFAULT '{}',
  schema_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  save_code text
);

-- In case the table pre-exists from a partial earlier attempt without the column
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS save_code text;

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

-- Dedupe device_id rows first (no-op on a fresh table) so the unique index
-- can always be created, keeping the newest row per device.
DELETE FROM user_sessions a
USING user_sessions b
WHERE a.device_id = b.device_id
  AND (a.updated_at < b.updated_at
       OR (a.updated_at = b.updated_at AND a.id < b.id));

-- UNIQUE on device_id — cloudSave() upserts with onConflict:'device_id',
-- which Postgres rejects without a matching unique constraint.
DROP INDEX IF EXISTS idx_user_sessions_device_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_device_id
  ON user_sessions(device_id);

-- PLAIN (non-unique) lookup index on save_code — several device rows share
-- one code; a unique index here breaks second-device sync.
DROP INDEX IF EXISTS idx_user_sessions_save_code;
CREATE INDEX IF NOT EXISTS idx_user_sessions_save_code
  ON user_sessions(save_code)
  WHERE save_code IS NOT NULL;

-- ── 3. RLS: writes open, reads/deletes closed ────────────────────────────────

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop the old open read/delete policies if a partial earlier attempt made them
DROP POLICY IF EXISTS "anon_select_sessions" ON user_sessions;
DROP POLICY IF EXISTS "anon_delete_sessions" ON user_sessions;

DROP POLICY IF EXISTS "anon_insert_sessions" ON user_sessions;
CREATE POLICY "anon_insert_sessions" ON user_sessions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON user_sessions;
CREATE POLICY "anon_update_sessions" ON user_sessions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 4. Key-required lookup RPCs ──────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS, but each function only returns the single
-- row matching the exact key the caller already holds — no enumeration.

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
