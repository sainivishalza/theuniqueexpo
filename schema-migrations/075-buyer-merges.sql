-- A record of every time one buyer account was merged into another (who, when, what moved, and the identifiers
-- that were taken off the old account), so a merge can always be explained afterwards. Idempotent.
CREATE TABLE IF NOT EXISTS buyer_merges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kept_id INT NOT NULL,
  merged_id INT NOT NULL,
  admin_id INT NULL,
  admin_name VARCHAR(255) NOT NULL DEFAULT '',
  details_json MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_merged (merged_id),
  KEY idx_kept (kept_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
