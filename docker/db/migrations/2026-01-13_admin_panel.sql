
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);



DROP FUNCTION IF EXISTS format_imion_nazwisk() CASCADE;

CREATE OR REPLACE FUNCTION format_imion_nazwisk()
RETURNS TRIGGER AS $$
BEGIN
    NEW.first_name := INITCAP(NEW.first_name);
    NEW.last_name := INITCAP(NEW.last_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_popraw_dane_users ON users;

CREATE TRIGGER trg_popraw_dane_users
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION format_imion_nazwisk();

UPDATE users
SET first_name = INITCAP(first_name),
    last_name = INITCAP(last_name);