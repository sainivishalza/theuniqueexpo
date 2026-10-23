-- E-mail addresses that bounced (the mail could not be delivered). A "hard" bounce (the address does not exist, or
-- refuses mail for good) stops further e-mails to it (except sign-in security mails) until an admin clears it; a "soft"
-- one (mailbox full, server busy) is only recorded. Found by reading the mailbox the bounces come back to
-- (.github/workflows/mail-bounces.yml). Idempotent.
CREATE TABLE IF NOT EXISTS email_bounces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  kind ENUM('hard', 'soft') NOT NULL,
  reason VARCHAR(300) NOT NULL DEFAULT '',
  status_code VARCHAR(12) NOT NULL DEFAULT '',
  bounce_count INT NOT NULL DEFAULT 1,
  first_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cleared_at DATETIME NULL,
  UNIQUE KEY uniq_bounce_email (email),
  KEY idx_bounce_last (last_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
