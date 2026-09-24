-- Phone number field, requested for the Fashion Fair buyer import (the
-- source spreadsheet has a phone column, unlike CPHI which only had
-- WeChat ID) -- also useful going forward for matching a person across
-- exhibitions/imports by phone in addition to email and passport number.
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) NOT NULL DEFAULT '' AFTER contact_email;
