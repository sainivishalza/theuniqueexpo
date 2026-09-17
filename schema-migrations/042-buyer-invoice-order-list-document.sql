-- Seventh buyer document slot: Invoice / Order List (a proforma invoice or
-- order list the buyer wants on file), alongside the existing 6 (business
-- license, business card, passport front, visa page, Canton Fair card,
-- buyer photo). Same base64 data: URL storage and per-document
-- verified/rejected review as the others.
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_invoice_order_list MEDIUMTEXT;
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_invoice_order_list_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_invoice_order_list_note VARCHAR(500) NOT NULL DEFAULT '';
