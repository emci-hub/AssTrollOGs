-- The unique index on save_code broke cross-device restore: once a second
-- device adopts an existing save code, its cloudSave() upsert (keyed by its
-- own device_id) collides with the unique constraint and silently fails.
-- Multiple device rows legitimately share one save code, so replace the
-- unique index with a plain lookup index.
DROP INDEX IF EXISTS idx_user_sessions_save_code;

CREATE INDEX IF NOT EXISTS idx_user_sessions_save_code
  ON user_sessions(save_code)
  WHERE save_code IS NOT NULL;
