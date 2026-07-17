/*
# Em-Pal server config — editable from the app's existing dev panel

Lets the app owner update the Palworld server's address/password from the
already-password-gated dev panel (src/dev-tools.js) instead of asking for
a code change every time the server details change. public/empal.html
(a separate static page, not part of this app's build) just reads the
current values from here — no edit UI on that page at all.

Single-row table. Same trust model as user_sessions: reads AND writes are
open via RLS (this project's dev panel is a client-side password gate,
not a hard security boundary — same as every other dev-tools.js action),
since there's no real per-user auth layer in this app to hang a stricter
policy off of.
*/

CREATE TABLE IF NOT EXISTS em_pal_config (
  id int PRIMARY KEY DEFAULT 1,
  server_address text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT em_pal_config_single_row CHECK (id = 1)
);

INSERT INTO em_pal_config (id, server_address, password)
VALUES (1, '136.118.89.15:8211', 'ato')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE em_pal_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS em_pal_config_select ON em_pal_config;
CREATE POLICY em_pal_config_select ON em_pal_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS em_pal_config_update ON em_pal_config;
CREATE POLICY em_pal_config_update ON em_pal_config
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
