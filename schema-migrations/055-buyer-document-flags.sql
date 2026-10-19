-- "Has this buyer uploaded document X?" kept up to date by the database itself.
--
-- The admin buyer list only needs a yes/no per document, but each document is a
-- full base64 image stored in a MEDIUMTEXT column, so asking for the document to
-- find out whether it exists pulled every buyer's images (hundreds of MB once a
-- couple of thousand buyers have uploaded) into the server on every page load.
-- A stored generated column is filled in by MariaDB whenever a row is written, so
-- no application code has to remember to maintain it, and reading it does not
-- touch the images.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS does nothing on a deploy that already ran it.
-- One ALTER, so the table is rebuilt once, not seven times.
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS has_doc_business_license TINYINT(1) AS (doc_business_license IS NOT NULL AND doc_business_license <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_doc_business_card TINYINT(1) AS (doc_business_card IS NOT NULL AND doc_business_card <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_doc_passport_front TINYINT(1) AS (doc_passport_front IS NOT NULL AND doc_passport_front <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_doc_visa_page TINYINT(1) AS (doc_visa_page IS NOT NULL AND doc_visa_page <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_doc_canton_fair_card TINYINT(1) AS (doc_canton_fair_card IS NOT NULL AND doc_canton_fair_card <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_doc_buyer_photo TINYINT(1) AS (doc_buyer_photo IS NOT NULL AND doc_buyer_photo <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_doc_invoice_order_list TINYINT(1) AS (doc_invoice_order_list IS NOT NULL AND doc_invoice_order_list <> '') STORED;
