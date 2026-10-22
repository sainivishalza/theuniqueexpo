-- Eighth buyer document slot: Latest Entry Stamp Photo (a photo of the buyer's most recent
-- entry stamp in the passport), alongside the existing seven. Same base64 data: URL storage
-- and per-document verified/rejected review as the others, plus the stored "has this
-- document" flag the admin list reads instead of the image (see 055).
--
-- One ALTER, so the table is rebuilt once, not four times. Idempotent: ADD COLUMN IF NOT
-- EXISTS does nothing on a deploy that already ran it.
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS doc_latest_entry_stamp MEDIUMTEXT,
  ADD COLUMN IF NOT EXISTS doc_latest_entry_stamp_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS doc_latest_entry_stamp_note VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS has_doc_latest_entry_stamp TINYINT(1) AS (doc_latest_entry_stamp IS NOT NULL AND doc_latest_entry_stamp <> '') STORED;
