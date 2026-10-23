-- Speed. Indexes found missing by trying the admin screens on a database of 20,000 buyers, 60,000 registrations and
-- 150,000 e-mail log rows (counting new / waiting registrations took 20 ms and now takes 1-2 ms), and a table where the site
-- writes down database queries that took unusually long (Admin -> Slow queries). Idempotent.
ALTER TABLE expo_registrations ADD INDEX IF NOT EXISTS idx_reg_created (created_at);
ALTER TABLE expo_registrations ADD INDEX IF NOT EXISTS idx_reg_status (status, created_at);
ALTER TABLE email_log ADD INDEX IF NOT EXISTS idx_email_log_status (status, created_at);

CREATE TABLE IF NOT EXISTS slow_queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fingerprint CHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sql_text VARCHAR(600) NOT NULL,
  calls INT NOT NULL DEFAULT 0,
  total_ms BIGINT NOT NULL DEFAULT 0,
  max_ms INT NOT NULL DEFAULT 0,
  last_ms INT NOT NULL DEFAULT 0,
  first_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_slow_fingerprint (fingerprint),
  KEY idx_slow_total (total_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
