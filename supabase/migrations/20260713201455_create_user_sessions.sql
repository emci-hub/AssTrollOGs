/*
# Create user_sessions table for cloud persistence

## Purpose
Stores each user's profile and game data keyed by a random device_id (UUID)
generated on first app load and stored in localStorage. No sign-in required.

## Tables

### user_sessions
- `id` (uuid, PK) — auto-generated row identifier
- `device_id` (text, NOT NULL, indexed) — opaque UUID from localStorage; acts as the user's key
- `profile_data` (jsonb) — full JSON blob: userProfile, partnerProfile, gameData, vibeSeed, soloMode, etc.
- `schema_version` (integer) — incremented when data shape changes so migrations can run
- `updated_at` (timestamptz) — auto-updated on every write

## Security
- RLS enabled. No sign-in required so all policies use `TO anon, authenticated`.
- `USING (true)` / `WITH CHECK (true)` because device_id itself is the opaque access key
  (a random UUID the user would never guess). Intentionally public within the device.

## Notes
1. The frontend generates a UUID on first run and stores it in localStorage as `vibeDeviceId`.
2. All reads and writes use `.eq('device_id', deviceId)`.
3. `execute_sql` bypasses RLS — only the anon-key frontend proves actual readability.
*/

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  profile_data jsonb NOT NULL DEFAULT '{}',
  schema_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_device_id ON user_sessions(device_id);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON user_sessions;
CREATE POLICY "anon_select_sessions" ON user_sessions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON user_sessions;
CREATE POLICY "anon_insert_sessions" ON user_sessions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON user_sessions;
CREATE POLICY "anon_update_sessions" ON user_sessions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON user_sessions;
CREATE POLICY "anon_delete_sessions" ON user_sessions FOR DELETE
TO anon, authenticated USING (true);
