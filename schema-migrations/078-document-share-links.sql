-- Links that let someone WITHOUT an account see one buyer document for a limited time (for example a visa agent). The link
-- itself is never stored, only its SHA-256, so a copy of the database does not contain working links. An admin can
-- revoke a link at any time; it also stops working at expires_at. Idempotent.
CREATE TABLE IF NOT EXISTS document_share_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id INT NOT NULL,
  doc_key VARCHAR(80) NOT NULL,
  created_by INT NULL,
  created_by_name VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  views INT NOT NULL DEFAULT 0,
  last_viewed_at DATETIME NULL,
  UNIQUE KEY uniq_share_token (token_hash),
  KEY idx_share_doc (user_id, doc_key, expires_at),
  KEY idx_share_expires (expires_at),
  CONSTRAINT fk_share_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
