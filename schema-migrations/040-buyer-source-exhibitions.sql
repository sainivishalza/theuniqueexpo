-- Which exhibition(s) a buyer's data came from (e.g. "CPHI", or
-- "CPHI, Canton Fair" once the same buyer is later imported from a second
-- one) -- free text, comma-separated, admin-only, searchable. Lets an
-- admin find everyone from a given exhibition by name.
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS source_exhibitions VARCHAR(500) NOT NULL DEFAULT '' AFTER registration_code;
