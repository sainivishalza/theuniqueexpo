-- In-app notifications ("Your registration was approved", "A document was sent back", "Points received", ...):
-- the same events the site e-mails about, kept for the person to read on the website, so they are seen even when
-- e-mail is switched off or the person has no real e-mail address. `params` holds the values the message
-- needs (an expo name, a number of points, a reason); the wording is chosen when the person reads it, in
-- the language they are using. Rows older than 180 days are removed by the daily clean-up.
--
-- Idempotent: every statement can run again on a later deploy.

CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  kind VARCHAR(40) NOT NULL,
  params TEXT NULL,
  path VARCHAR(200) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  KEY idx_notif_user (user_id, id),
  KEY idx_notif_created (created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
