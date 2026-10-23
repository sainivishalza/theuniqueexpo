-- Saved announcement texts ("templates") an admin can load into the announcement dialog. The text is kept in all three
-- languages and may contain the fields {name}, {number} and {exhibition}. Idempotent.
CREATE TABLE IF NOT EXISTS announcement_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subject_json TEXT NOT NULL,
  message_json MEDIUMTEXT NOT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_template_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
