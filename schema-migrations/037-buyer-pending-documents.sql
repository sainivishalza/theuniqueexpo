-- Tracks the expected filename for a buyer's document photo before the
-- real image file has been provided -- e.g. a bulk import from a
-- spreadsheet that only lists picture filenames, with a zip of the actual
-- photos following separately. An admin (or a one-off script) later
-- matches files from that zip against `filename` here by exact name and
-- writes the real image into buyer_profiles via the existing
-- document-upload path (setBuyerDocument), then deletes this row -- so
-- whatever remains here always reflects what's still missing. Not indexed
-- on filename: matching is done in application code against the small
-- number of rows this table ever holds, not via a DB lookup.
CREATE TABLE IF NOT EXISTS buyer_pending_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  doc_field VARCHAR(50) NOT NULL,
  filename VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_doc_field (user_id, doc_field),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
