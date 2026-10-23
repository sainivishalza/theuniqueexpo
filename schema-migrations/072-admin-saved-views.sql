-- Saved filters ("views") an admin keeps for a list page, so a combination such as "Russia, approved, missing visa"
-- is one click away on any device. Private to the admin who saved it. Idempotent.
CREATE TABLE IF NOT EXISTS admin_saved_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  page VARCHAR(40) NOT NULL,
  name VARCHAR(80) NOT NULL,
  filters_json TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_admin_view (admin_id, page, name),
  CONSTRAINT fk_asv_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
