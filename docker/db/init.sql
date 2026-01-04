-- Rozszerzenie do UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Re-run safety (useful when applying schema manually)
DROP TABLE IF EXISTS cat_photos CASCADE;
DROP TABLE IF EXISTS cat_caregivers CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS cats CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_path   TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);

-- CATS
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

-- CAT PHOTOS (gallery)
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

-- CAREGIVERS (many-to-many)
CREATE TABLE cat_caregivers (
  cat_id      UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cat_id, user_id)
);

CREATE INDEX idx_cat_caregivers_user_id ON cat_caregivers(user_id);

-- ACTIVITIES (schedule / planned activities)
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id      UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  starts_at   TIMESTAMP NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'cancelled')),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_cat_id ON activities(cat_id);
CREATE INDEX idx_activities_starts_at ON activities(starts_at);
CREATE INDEX idx_activities_cat_starts_at ON activities(cat_id, starts_at);

-- LOGS
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

-- Seed (minimal data for testing)
INSERT INTO users (username, email, first_name, last_name, password_hash, role)
VALUES
  ('admin', 'admin@example.com', 'Admin', 'User', '$2y$10$eE9R6yGvJHh8mL7m7QhUOe8ZpW3qvS9y8m4sF6m5bJ2VJm0yqgq6K', 'admin'),
  ('user1', 'user1@example.com', 'Jan', 'Kowalski', '$2y$10$eE9R6yGvJHh8mL7m7QhUOe8ZpW3qvS9y8m4sF6m5bJ2VJm0yqgq6K', 'user')
ON CONFLICT DO NOTHING;