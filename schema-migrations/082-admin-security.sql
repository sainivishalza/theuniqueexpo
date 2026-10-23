-- Admin sign-in security: an on/off switch that makes two-step sign-in required for every admin (an admin without it can only
-- open their account page until they set it up), and a record of the browsers/places each admin has signed in from, so a
-- sign-in from somewhere new can be e-mailed to that admin. Idempotent.
CREATE TABLE IF NOT EXISTS admin_security_settings (
  id TINYINT NOT NULL PRIMARY KEY,
  require_two_step TINYINT(1) NOT NULL DEFAULT 0,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO admin_security_settings (id, require_two_step) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS admin_login_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ip_prefix VARCHAR(64) NOT NULL DEFAULT '',
  browser VARCHAR(120) NOT NULL DEFAULT '',
  first_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sign_ins INT NOT NULL DEFAULT 1,
  alerted_at DATETIME NULL,
  UNIQUE KEY uniq_admin_device (user_id, fingerprint),
  KEY idx_device_last (user_id, last_at),
  CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
