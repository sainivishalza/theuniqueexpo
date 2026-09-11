-- The Canton Fair spreadsheet had one extra column (a bare single letter --
-- M, Z, T, or X for most rows, blank for many) with no header and no
-- explanation available. Its meaning isn't confirmed, and it wasn't even
-- stable per person across that person's multiple submissions in the
-- source sheet, so it's captured as free-text admin-only metadata rather
-- than something asserted to mean anything specific -- an admin who
-- recognizes it (e.g. a hall/table code) can start using it meaningfully.
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS registration_code VARCHAR(20) NOT NULL DEFAULT '';
