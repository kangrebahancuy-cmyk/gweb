-- Elder Realms Online initial gameplay schema (Neon PostgreSQL).
-- Supabase Auth is the identity provider; user_id values are not cross-database FKs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES accounts(user_id) ON DELETE CASCADE,
  display_name varchar(20) NOT NULL,
  region_id varchar(48) NOT NULL DEFAULT 'fern-hollow',
  x real NOT NULL DEFAULT 330 CHECK (x >= 0 AND x <= 1920),
  y real NOT NULL DEFAULT 350 CHECK (y >= 0 AND y <= 1440),
  health integer NOT NULL DEFAULT 100 CHECK (health BETWEEN 0 AND 100),
  gold bigint NOT NULL DEFAULT 15 CHECK (gold >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, display_name)
);
CREATE INDEX IF NOT EXISTS characters_region_idx ON characters(region_id);

CREATE TABLE IF NOT EXISTS character_skills (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id varchar(48) NOT NULL,
  xp bigint NOT NULL DEFAULT 0 CHECK (xp >= 0),
  PRIMARY KEY (character_id, skill_id)
);

CREATE TABLE IF NOT EXISTS item_definitions (
  id varchar(64) PRIMARY KEY,
  display_name varchar(80) NOT NULL,
  stackable boolean NOT NULL DEFAULT true,
  tradeable boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS inventory_items (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id varchar(64) NOT NULL REFERENCES item_definitions(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, item_id)
);

CREATE TABLE IF NOT EXISTS farm_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  plot_key varchar(48) NOT NULL,
  crop_id varchar(64),
  planted_at timestamptz,
  ready_at timestamptz,
  UNIQUE (character_id, plot_key),
  CHECK ((crop_id IS NULL AND planted_at IS NULL AND ready_at IS NULL) OR
         (crop_id IS NOT NULL AND planted_at IS NOT NULL AND ready_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS quest_progress (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id varchar(64) NOT NULL,
  stage integer NOT NULL DEFAULT 0 CHECK (stage >= 0),
  completed_at timestamptz,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (character_id, quest_id)
);

CREATE TABLE IF NOT EXISTS gameplay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  idempotency_key varchar(100) NOT NULL,
  transaction_type varchar(48) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,
  actor_user_id uuid,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  event_type varchar(64) NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO item_definitions (id, display_name, stackable, tradeable) VALUES
  ('turnip_seed', 'Turnip Seed', true, true),
  ('turnip', 'Turnip', true, true),
  ('slime_gel', 'Slime Gel', true, true)
ON CONFLICT (id) DO NOTHING;
