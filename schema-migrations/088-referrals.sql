-- Referral programme: a buyer invites another buyer with a personal link; both can earn reward points.
-- The rules (on/off, when points are paid, how many points, the cap per referrer) live in wallet_settings
-- and are edited by an admin, so nothing here needs a developer to change. Idempotent.

-- New kind of ledger row for the points a referral pays.
ALTER TABLE wallet_transactions
  MODIFY COLUMN type ENUM('attendance','expense','topup','transfer_in','transfer_out','withdrawal_hold','withdrawal_refund','purchase','purchase_refund','adjustment','referral') NOT NULL;

-- One personal, unguessable invitation code per buyer, made the first time they open the invite page.
CREATE TABLE IF NOT EXISTS referral_codes (
  user_id INT NOT NULL PRIMARY KEY,
  code CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_referral_code (code),
  CONSTRAINT fk_referral_code_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Who invited whom. A buyer can be invited once (referred_id is unique). 'pending' = signed up, reward not paid yet;
-- 'rewarded' = points paid (the amounts are kept as they were at that moment); 'rejected' = an admin turned it down.
CREATE TABLE IF NOT EXISTS buyer_referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  status ENUM('pending','rewarded','rejected') NOT NULL DEFAULT 'pending',
  referrer_points INT NOT NULL DEFAULT 0,
  referred_points INT NOT NULL DEFAULT 0,
  note VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  rewarded_at DATETIME NULL,
  UNIQUE KEY uniq_referred (referred_id),
  KEY idx_referrer (referrer_id, status),
  KEY idx_referral_status (status, id),
  CONSTRAINT chk_referral_not_self CHECK (referrer_id <> referred_id),
  CONSTRAINT fk_referral_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_referral_referred FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE RESTRICT
);
