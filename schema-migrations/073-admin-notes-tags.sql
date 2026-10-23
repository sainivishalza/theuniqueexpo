-- Internal notes, tags and "assigned to" for buyers and registrations. Only admins ever see these.
--   admin_notes             a log of notes (who wrote what, when)
--   admin_record_tags       short labels on a record
--   admin_record_assignee   which admin looks after a record
-- A record is a buyer (users.id) or a registration (expo_registrations.id). Idempotent.
CREATE TABLE IF NOT EXISTS admin_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_type VARCHAR(20) NOT NULL,
  subject_id INT NOT NULL,
  admin_id INT NULL,
  admin_name VARCHAR(255) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_note_subject (subject_type, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_record_tags (
  subject_type VARCHAR(20) NOT NULL,
  subject_id INT NOT NULL,
  tag VARCHAR(30) NOT NULL,
  PRIMARY KEY (subject_type, subject_id, tag),
  KEY idx_tag (subject_type, tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_record_assignee (
  subject_type VARCHAR(20) NOT NULL,
  subject_id INT NOT NULL,
  admin_id INT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_type, subject_id),
  KEY idx_assignee (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
