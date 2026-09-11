-- Admin tool: upload one big zip of customer registration photos (passport,
-- visa, business card, company license, personal picture -- all collected
-- from customers via WeChat/messaging and bulk-exported with inconsistent
-- filenames), auto-group files belonging to the same customer, read their
-- real name off the passport photo via OCR, then re-zip with one folder
-- per customer named after their passport name. Processing runs
-- server-side and can take a while for a large zip, so it's tracked as an
-- async batch job rather than a single request/response.
CREATE TABLE IF NOT EXISTS photo_organizer_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_filename VARCHAR(255) NOT NULL,
  status ENUM('uploading', 'processing', 'review', 'finalizing', 'done', 'failed') NOT NULL DEFAULT 'uploading',
  error_message TEXT,
  total_files INT NOT NULL DEFAULT 0,
  total_groups INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photo_organizer_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  group_key VARCHAR(255) NOT NULL,
  detected_name VARCHAR(255),
  confirmed_name VARCHAR(255),
  passport_filename VARCHAR(500),
  file_list JSON NOT NULL,
  detection_status ENUM('detected', 'low_confidence', 'not_found') NOT NULL DEFAULT 'not_found',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- InnoDB auto-indexes FK columns, so batch_id lookups (the review
  -- screen's main query) don't need a separate CREATE INDEX -- which
  -- also isn't safely re-runnable (MySQL has no CREATE INDEX IF NOT
  -- EXISTS), unlike everything else in this migration.
  FOREIGN KEY (batch_id) REFERENCES photo_organizer_batches(id) ON DELETE CASCADE
);
