-- Excel reports e-mailed on a schedule (daily, weekly or monthly) to chosen addresses. Idempotent.
CREATE TABLE IF NOT EXISTS scheduled_exports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  filters_json TEXT NOT NULL,
  frequency VARCHAR(10) NOT NULL,
  weekday TINYINT NOT NULL DEFAULT 1,
  month_day TINYINT NOT NULL DEFAULT 1,
  recipients TEXT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_sent_at DATETIME NULL,
  last_status VARCHAR(255) NOT NULL DEFAULT '',
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
