-- Add save_code column to user_sessions for cross-device restore
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS save_code text;

-- Unique index allows lookup by code (one code per user row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_save_code
  ON user_sessions(save_code)
  WHERE save_code IS NOT NULL;
