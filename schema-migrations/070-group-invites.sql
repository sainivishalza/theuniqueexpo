-- Group registration: a buyer invites colleagues (by e-mail) to register for an exhibition. Whether an invited
-- colleague has registered is worked out from their account and registrations, so nothing else is stored.
-- Idempotent.
CREATE TABLE IF NOT EXISTS group_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inviter_id INT NOT NULL,
  exhibition_id INT NOT NULL,
  email VARCHAR(254) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_sent_at DATETIME NULL,
  UNIQUE KEY uniq_invite (inviter_id, exhibition_id, email),
  KEY idx_invite_email (email),
  CONSTRAINT fk_gi_inviter FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_gi_expo FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
) ENGINE=InnoDB;
