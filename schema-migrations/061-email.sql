-- E-mail: the sending settings an admin fills in on Admin -> Email, a log of what was sent, the
-- single-use links for "Forgot password", and two columns on users:
--   preferred_locale     the language the person last used the site in (e-mails are written in it)
--   password_changed_at  when the password last changed (unix seconds); sessions signed before it stop working
--
-- Idempotent: every statement can run again on a later deploy.

CREATE TABLE IF NOT EXISTS mail_settings (
  id TINYINT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  host VARCHAR(200) NOT NULL DEFAULT '',
  port INT NOT NULL DEFAULT 587,
  secure TINYINT(1) NOT NULL DEFAULT 0,
  username VARCHAR(200) NOT NULL DEFAULT '',
  password_enc TEXT,
  from_name VARCHAR(120) NOT NULL DEFAULT 'The Unique Expo',
  from_email VARCHAR(200) NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  to_email VARCHAR(254) NOT NULL,
  kind VARCHAR(40) NOT NULL,
  subject VARCHAR(250) NOT NULL DEFAULT '',
  status ENUM('sent','failed') NOT NULL,
  error VARCHAR(300) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_log_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_password_reset_token (token_hash),
  KEY idx_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(5) NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at INT UNSIGNED NULL;
