-- Errors seen by the website (on the server, or in a visitor's browser), grouped by what they say so a repeating error is ONE row
-- with a count. New ones are e-mailed to the admins (one digest, not one mail per error); an admin marks one resolved on
-- Admin -> Errors and it comes back only if it happens again. Idempotent.
CREATE TABLE IF NOT EXISTS error_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fingerprint CHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source VARCHAR(10) NOT NULL,
  message VARCHAR(500) NOT NULL,
  detail TEXT NULL,
  path VARCHAR(300) NOT NULL DEFAULT '',
  user_agent VARCHAR(160) NOT NULL DEFAULT '',
  occurrences INT NOT NULL DEFAULT 1,
  first_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  alerted_at DATETIME NULL,
  UNIQUE KEY uniq_error_fingerprint (fingerprint),
  KEY idx_error_last (last_at),
  KEY idx_error_alert (alerted_at, last_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
