-- Footer newsletter signups. One row per email address; re-subscribing the
-- same address is a no-op (the unique key makes the INSERT idempotent).
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  locale VARCHAR(5) NOT NULL DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_newsletter_subscribers_email (email)
);
