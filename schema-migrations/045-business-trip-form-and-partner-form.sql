-- Widens business_trip_inquiries and partner_inquiries for the full
-- dedicated forms (Business Tour Form / Partnership Form) replacing the
-- earlier quick-modal versions of both.
--
-- business_trip_inquiries: `whatsapp` is a new column rather than a rename
-- of `phone` -- MySQL/MariaDB has no idempotent "rename column if it still
-- has its old name" and this migration (like every other one here) reruns
-- on every deploy. `phone` is left in place, unused going forward; there's
-- effectively no real data in it yet since the table only just shipped.
ALTER TABLE business_trip_inquiries
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT '' AFTER phone,
  ADD COLUMN IF NOT EXISTS country VARCHAR(150) DEFAULT '' AFTER company,
  ADD COLUMN IF NOT EXISTS departure_city VARCHAR(150) DEFAULT '' AFTER country,
  ADD COLUMN IF NOT EXISTS arrival_date DATE DEFAULT NULL AFTER exhibition_slug,
  ADD COLUMN IF NOT EXISTS departure_date DATE DEFAULT NULL AFTER arrival_date,
  ADD COLUMN IF NOT EXISTS travelers INT DEFAULT NULL AFTER departure_date,
  ADD COLUMN IF NOT EXISTS needs JSON DEFAULT NULL AFTER travelers,
  ADD COLUMN IF NOT EXISTS industry VARCHAR(255) DEFAULT '' AFTER needs;

ALTER TABLE partner_inquiries
  MODIFY COLUMN partner_type VARCHAR(30) DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT '' AFTER company,
  ADD COLUMN IF NOT EXISTS country VARCHAR(150) DEFAULT '' AFTER website,
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT '' AFTER email,
  ADD COLUMN IF NOT EXISTS topics JSON DEFAULT NULL AFTER partner_type;
