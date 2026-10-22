-- Two protections for the admin accounts:
--   admin_totp        the second sign-in step (a 6-digit code from an authenticator app). The secret is
--                     stored encrypted; recovery codes are stored only as SHA-256 hashes. A row with
--                     enabled = 0 is a set-up that was started but not confirmed yet.
--   admin_audit_log   who did what in the admin area (see src/lib/server/audit-log.ts).
--
-- Idempotent: every statement can run again on a later deploy.

CREATE TABLE IF NOT EXISTS admin_totp (
  user_id INT NOT NULL PRIMARY KEY,
  secret_enc VARCHAR(255) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  last_step BIGINT NOT NULL DEFAULT 0,
  recovery_hashes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enabled_at DATETIME NULL,
  CONSTRAINT fk_admin_totp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  admin_name VARCHAR(255) NOT NULL DEFAULT '',
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL DEFAULT '',
  target_id VARCHAR(64) NOT NULL DEFAULT '',
  details VARCHAR(1000) NOT NULL DEFAULT '',
  ip VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_created (created_at),
  KEY idx_audit_admin (admin_id, created_at),
  KEY idx_audit_action (action, created_at)
) ENGINE=InnoDB;
