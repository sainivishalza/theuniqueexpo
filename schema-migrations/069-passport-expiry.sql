-- Passport expiry date on the buyer profile (next to the visa expiry date), so buyers can be warned when
-- their passport or visa will not cover an exhibition. Idempotent.
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS passport_expire_date VARCHAR(50) NOT NULL DEFAULT '' AFTER visa_expire_date;
