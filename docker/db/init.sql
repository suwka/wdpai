CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP TABLE IF EXISTS cat_photos CASCADE;
DROP TABLE IF EXISTS cat_caregivers CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS cats CASCADE;
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_blocked    BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMP,
  avatar_path   TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_blocked ON users(is_blocked);
CREATE TABLE cats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name       TEXT NOT NULL,
  breed      TEXT,
  age        INT CHECK (age IS NULL OR age >= 0),
  description TEXT,
  avatar_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cats_owner_id ON cats(owner_id);
CREATE TABLE cat_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id      UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  caption     TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_photos_cat_id ON cat_photos(cat_id);
CREATE INDEX idx_cat_photos_cat_sort ON cat_photos(cat_id, sort_order, created_at);
CREATE TABLE cat_caregivers (
  cat_id      UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cat_id, user_id)
);

CREATE INDEX idx_cat_caregivers_user_id ON cat_caregivers(user_id);
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id      UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  starts_at   TIMESTAMP NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'cancelled')),
  done_at     TIMESTAMP,
  done_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  done_description TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_cat_id ON activities(cat_id);
CREATE INDEX idx_activities_starts_at ON activities(starts_at);
CREATE INDEX idx_activities_cat_starts_at ON activities(cat_id, starts_at);
CREATE INDEX idx_activities_done_at ON activities(done_at);
CREATE TABLE logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id     UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_cat_id ON logs(cat_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_logs_cat_created_at ON logs(cat_id, created_at);
CREATE TABLE support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  topic      TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
INSERT INTO users (username, email, first_name, last_name, password_hash, role)
VALUES
  ('admin', 'admin@example.com', 'Admin', 'User', '$2y$10$XaWFVP4b0PJkor/MLZEWiuTyxaUKLK1xOgIxo7m5w0x8AB4CVFWmy', 'admin'),
  ('user1', 'user1@example.com', 'Jan', 'Kowalski', '$2y$10$eE9R6yGvJHh8mL7m7QhUOe8ZpW3qvS9y8m4sF6m5bJ2VJm0yqgq6K', 'user'),
  ('testowy', 'testowy@testowy', 'Test', 'User', '$2y$10$4SeBepX4FraV6HfGYmE0puY3m12cgyQ8Jmk2XcPsTfMham13hdMr2', 'user')
ON CONFLICT DO NOTHING;
CREATE OR REPLACE VIEW vw_activity_details AS
SELECT
  a.id          AS activity_id,
  a.cat_id      AS cat_id,
  c.name        AS cat_name,
  c.owner_id    AS owner_id,
  uo.username   AS owner_username,
  a.title,
  a.description,
  a.starts_at,
  a.status,
  a.done_at,
  ud.username   AS done_by_username,
  uc.username   AS created_by_username,
  a.created_at,
  a.updated_at
FROM activities a
JOIN cats c ON c.id = a.cat_id
JOIN users uo ON uo.id = c.owner_id
LEFT JOIN users ud ON ud.id = a.done_by
LEFT JOIN users uc ON uc.id = a.created_by;
CREATE OR REPLACE VIEW vw_cat_overview AS
SELECT
  c.id        AS cat_id,
  c.name      AS cat_name,
  c.breed,
  c.age,
  c.owner_id,
  u.username  AS owner_username,
  COUNT(DISTINCT cc.user_id) AS caregiver_count,
  COUNT(DISTINCT cp.id)      AS photo_count,
  c.created_at,
  c.updated_at
FROM cats c
JOIN users u ON u.id = c.owner_id
LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id
LEFT JOIN cat_photos cp ON cp.cat_id = c.id
GROUP BY c.id, u.username;
CREATE OR REPLACE FUNCTION fn_assign_caregiver(p_cat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  rc INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cats WHERE id = p_cat_id) THEN
    RAISE EXCEPTION 'cat_not_found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO cat_caregivers (cat_id, user_id)
  VALUES (p_cat_id, p_user_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS rc = ROW_COUNT;
  RETURN rc > 0;
END;
$$;
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cats ON cats;
CREATE TRIGGER set_updated_at_cats
BEFORE UPDATE ON cats
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_activities ON activities;
CREATE TRIGGER set_updated_at_activities
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();