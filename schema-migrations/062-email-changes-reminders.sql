-- Two small additions:
--   email_changes                 a person with no real e-mail address (a buyer imported from an expo sheet)
--                                 asks to add one: a single-use link is e-mailed to the new address and only
--                                 its SHA-256 is stored here until it is used.
--   expo_registrations.reminder_sent_at   when the "please confirm before ..." reminder was e-mailed (once).
--
-- Idempotent: every statement can run again on a later deploy.

CREATE TABLE IF NOT EXISTS email_changes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  new_email VARCHAR(254) NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_change_token (token_hash),
  KEY idx_email_change_user (user_id),
  CONSTRAINT fk_email_change_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE expo_registrations
  ADD COLUMN IF NOT EXISTS reminder_sent_at DATETIME NULL;
