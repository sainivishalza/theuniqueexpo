-- Train-ticket refunds. Each exhibition decides whether buyers who buy their own tickets are refunded in points ('refund')
-- or whether we arrange the transport ('none', nothing to refund). A refund claim is a wallet_expense_claims row of kind
-- 'train': the buyer's scan receipt, the e-invoice downloaded from 12306 and the amount on the invoice. Idempotent.
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS ticket_refund_mode ENUM('none','refund') NOT NULL DEFAULT 'none';
-- Share of the invoice amount that is refunded (1 point = 1 RMB), and the most points one buyer can get back for this
-- exhibition (0 = no limit).
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS ticket_refund_percent TINYINT UNSIGNED NOT NULL DEFAULT 100;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS ticket_refund_max_points INT NOT NULL DEFAULT 0;

ALTER TABLE wallet_expense_claims ADD COLUMN IF NOT EXISTS kind ENUM('general','train') NOT NULL DEFAULT 'general';
-- The amount printed on the e-invoice, in RMB.
ALTER TABLE wallet_expense_claims ADD COLUMN IF NOT EXISTS amount_cny DECIMAL(10,2) NULL;
-- The electronic ticket number, when the buyer typed it; with the invoice fingerprint it stops one ticket being claimed twice.
ALTER TABLE wallet_expense_claims ADD COLUMN IF NOT EXISTS ticket_no VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE wallet_expense_claims ADD COLUMN IF NOT EXISTS invoice_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL;
-- What the QR code on the scan receipt says (the 12306 invoice link).
ALTER TABLE wallet_expense_claims ADD COLUMN IF NOT EXISTS qr_text VARCHAR(500) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_expenses_invoice ON wallet_expense_claims (invoice_hash);
CREATE INDEX IF NOT EXISTS idx_expenses_ticket ON wallet_expense_claims (ticket_no);
