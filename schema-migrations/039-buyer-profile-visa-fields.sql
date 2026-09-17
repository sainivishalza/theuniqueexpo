-- Three more buyer-profile fields requested directly by the client: Date
-- of Birth, Visa Type, and Visa Expiry Date. IF NOT EXISTS on every column
-- (see 036-buyer-profile-more-fields.sql's own fix for why: every deploy
-- re-applies every migration, so a plain ADD COLUMN breaks the second
-- deploy onward once the column already exists).
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(50) NOT NULL DEFAULT '' AFTER contact_email,
  ADD COLUMN IF NOT EXISTS visa_type VARCHAR(100) NOT NULL DEFAULT '' AFTER date_of_birth,
  ADD COLUMN IF NOT EXISTS visa_expire_date VARCHAR(50) NOT NULL DEFAULT '' AFTER visa_type;
