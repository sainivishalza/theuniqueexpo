-- History of changes to an exhibition's text fields (not its pictures), so a mistaken edit can be undone.
-- Each row holds how the exhibition looked BEFORE one change, and which fields that change touched. Idempotent.
CREATE TABLE IF NOT EXISTS exhibition_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exhibition_id INT NOT NULL,
  admin_id INT NULL,
  admin_name VARCHAR(255) NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL DEFAULT 'edit',
  changed_json TEXT NOT NULL,
  before_json MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_version_expo (exhibition_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
