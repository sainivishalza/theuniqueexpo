-- Data retention: identity documents (passport page, visa page, entry stamp) are deleted some time after the last
-- exhibition a buyer registered for has ended. OFF until an admin turns it on (Admin -> Data retention). Idempotent.
CREATE TABLE IF NOT EXISTS data_retention_settings (
  id TINYINT NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  days INT NOT NULL DEFAULT 90,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO data_retention_settings (id, enabled, days) VALUES (1, 0, 90);

CREATE TABLE IF NOT EXISTS data_retention_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trigger_kind VARCHAR(10) NOT NULL,
  days INT NOT NULL,
  admin_id INT NULL,
  profiles_cleared INT NOT NULL DEFAULT 0,
  files_removed INT NOT NULL DEFAULT 0,
  registrations_cleared INT NOT NULL DEFAULT 0,
  KEY idx_retention_run_at (run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
