-- Rewards wallet for buyers: 1 reward point = 1 RMB, whole points only.
--
-- Money rules this schema enforces (the application code follows the same rules,
-- but the database is the last line of defence):
--   * wallets.balance can never go below zero (CHECK constraint).
--   * wallet_transactions is the ledger: one row per change of a balance, never
--     edited or deleted by the application. balance = sum of that user's rows.
--   * (user_id, idem_key) is unique, so the same event (a check-in, an approved
--     top-up, a double-clicked Send button) can only ever be booked once.
--   * A wallet cannot be removed while its user exists, and a user with a wallet
--     cannot be deleted (ON DELETE RESTRICT) -- suspend the account instead.
--
-- Idempotent: every statement can run again on a later deploy.

CREATE TABLE IF NOT EXISTS wallets (
  user_id INT NOT NULL PRIMARY KEY,
  -- Random, unguessable code printed in the buyer's QR code. It only says "send to
  -- this wallet"; it never lets anyone take points out.
  wallet_code CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  -- An admin can freeze a wallet: it can still receive points but not send,
  -- withdraw or spend them.
  frozen TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_wallet_code (wallet_code),
  CONSTRAINT chk_wallet_balance CHECK (balance >= 0),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  -- Signed: positive adds points, negative takes them away.
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  type ENUM('attendance','expense','topup','transfer_in','transfer_out','withdrawal_hold','withdrawal_refund','purchase','purchase_refund','adjustment') NOT NULL,
  -- What the row is about (a top-up, a withdrawal, an expense claim, a tour...).
  ref_type VARCHAR(30) NULL,
  ref_id INT NULL,
  -- The other buyer in a transfer.
  counterparty_user_id INT NULL,
  note VARCHAR(255) NOT NULL DEFAULT '',
  idem_key VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  -- The admin who caused it (approvals, adjustments); NULL for the buyer's own actions.
  created_by INT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_wallet_tx_idem (user_id, idem_key),
  KEY idx_wallet_tx_user (user_id, id),
  KEY idx_wallet_tx_recent_out (user_id, type, created_at),
  CONSTRAINT chk_wallet_tx_amount CHECK (amount <> 0),
  CONSTRAINT chk_wallet_tx_balance CHECK (balance_after >= 0)
);

-- Top-up: the buyer pays the company outside the site and uploads proof; an admin
-- approves it and the points are added.
CREATE TABLE IF NOT EXISTS wallet_topups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  points BIGINT NOT NULL,
  reference VARCHAR(150) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  proof LONGTEXT NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  -- What was actually credited (an admin may correct the amount to what arrived).
  approved_points BIGINT NULL,
  admin_note VARCHAR(500) NOT NULL DEFAULT '',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_topup_client (user_id, client_key),
  KEY idx_topups_status (status, id),
  KEY idx_topups_user (user_id, id),
  CONSTRAINT chk_topup_points CHECK (points > 0),
  CONSTRAINT fk_topup_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Withdrawal: points are taken out of the balance the moment it is requested
-- (so they cannot be spent twice) and returned if it is rejected or cancelled.
-- The admin pays the money out by hand and marks it paid.
CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  points BIGINT NOT NULL,
  method ENUM('alipay','wechat','bank') NOT NULL,
  -- Alipay / WeChat: the buyer's receiving QR code (an image) and the name on it.
  qr_image LONGTEXT NULL,
  account_name VARCHAR(150) NOT NULL DEFAULT '',
  -- China bank details.
  bank_name VARCHAR(150) NOT NULL DEFAULT '',
  bank_branch VARCHAR(200) NOT NULL DEFAULT '',
  bank_account VARCHAR(60) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  status ENUM('pending','paid','rejected','cancelled') NOT NULL DEFAULT 'pending',
  payout_reference VARCHAR(150) NOT NULL DEFAULT '',
  admin_note VARCHAR(500) NOT NULL DEFAULT '',
  processed_by INT NULL,
  processed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_withdrawal_client (user_id, client_key),
  KEY idx_withdrawals_status (status, id),
  KEY idx_withdrawals_user (user_id, id),
  CONSTRAINT chk_withdrawal_points CHECK (points > 0),
  CONSTRAINT fk_withdrawal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Travel expense claims: receipts uploaded by the buyer; an admin reviews them and
-- decides how many points they are worth.
CREATE TABLE IF NOT EXISTS wallet_expense_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  exhibition_id INT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'other',
  title VARCHAR(150) NOT NULL DEFAULT '',
  expense_date DATE NULL,
  -- What the receipt says, in the buyer's own currency (for the admin to judge).
  amount_text VARCHAR(60) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  -- JSON array of 1-3 uploaded images/PDFs.
  receipts LONGTEXT NOT NULL,
  receipt_count TINYINT NOT NULL DEFAULT 1,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  points_awarded BIGINT NULL,
  admin_note VARCHAR(500) NOT NULL DEFAULT '',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_expense_client (user_id, client_key),
  KEY idx_expenses_status (status, id),
  KEY idx_expenses_user (user_id, id),
  CONSTRAINT fk_expense_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Packages (tours) bought with points.
CREATE TABLE IF NOT EXISTS wallet_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  tour_id INT NOT NULL,
  points BIGINT NOT NULL,
  status ENUM('paid','refunded') NOT NULL DEFAULT 'paid',
  admin_note VARCHAR(500) NOT NULL DEFAULT '',
  refunded_by INT NULL,
  refunded_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_purchase_client (user_id, client_key),
  KEY idx_purchases_user (user_id, id),
  KEY idx_purchases_tour (tour_id, user_id, status),
  CONSTRAINT chk_purchase_points CHECK (points > 0),
  CONSTRAINT fk_purchase_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Admin-editable settings (limits, how to pay the company, the company's own QR codes).
CREATE TABLE IF NOT EXISTS wallet_settings (
  name VARCHAR(60) NOT NULL PRIMARY KEY,
  value MEDIUMTEXT NOT NULL
);

-- Points a buyer earns for attending an exhibition (0 = none), and the price of a
-- tour in points (NULL / 0 = cannot be bought with points).
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS attendance_points INT NOT NULL DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_points INT NULL;
