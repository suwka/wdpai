-- Ensures FK ON DELETE behaviors are correct and consistent.
-- Safe to run multiple times.

BEGIN;

-- cats.owner_id -> restrict delete of owner unless cats removed first
ALTER TABLE cats DROP CONSTRAINT IF EXISTS cats_owner_id_fkey;
ALTER TABLE cats
  ADD CONSTRAINT cats_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;

-- cat_photos
ALTER TABLE cat_photos DROP CONSTRAINT IF EXISTS cat_photos_cat_id_fkey;
ALTER TABLE cat_photos
  ADD CONSTRAINT cat_photos_cat_id_fkey
  FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE;

ALTER TABLE cat_photos DROP CONSTRAINT IF EXISTS cat_photos_uploaded_by_fkey;
ALTER TABLE cat_photos
  ADD CONSTRAINT cat_photos_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- cat_caregivers
ALTER TABLE cat_caregivers DROP CONSTRAINT IF EXISTS cat_caregivers_cat_id_fkey;
ALTER TABLE cat_caregivers
  ADD CONSTRAINT cat_caregivers_cat_id_fkey
  FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE;

ALTER TABLE cat_caregivers DROP CONSTRAINT IF EXISTS cat_caregivers_user_id_fkey;
ALTER TABLE cat_caregivers
  ADD CONSTRAINT cat_caregivers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- activities
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_cat_id_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_cat_id_fkey
  FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE;

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_done_by_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_done_by_fkey
  FOREIGN KEY (done_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_created_by_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- logs
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_cat_id_fkey;
ALTER TABLE logs
  ADD CONSTRAINT logs_cat_id_fkey
  FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE;

ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_created_by_fkey;
ALTER TABLE logs
  ADD CONSTRAINT logs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- support_tickets
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

COMMIT;
