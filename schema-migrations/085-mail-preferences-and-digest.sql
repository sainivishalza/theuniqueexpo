-- What a buyer wants e-mailed (weekly new-exhibitions digest, alerts about saved exhibitions) and the admin's switch
-- for the weekly digest (off until an admin turns it on). Idempotent.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mail_digest TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mail_saved_alerts TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS digest_sent_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS digest_settings (
  id TINYINT NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  -- A "batch" is one week's digest: exhibitions added since the previous batch started, sent a hundred or so at a time.
  batch_at DATETIME NULL,
  since_at DATETIME NULL,
  last_count INT NOT NULL DEFAULT 0,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO digest_settings (id, enabled) VALUES (1, 0);
