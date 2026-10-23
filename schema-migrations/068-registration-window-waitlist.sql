-- Registration window, places and waiting list, plus the memory of reminders already sent:
--   exhibitions.registration_opens / registration_closes   optional dates (inclusive) between which buyers can register
--   exhibitions.buyer_quota                                 how many buyers an exhibition takes (NULL / 0 = no limit)
--   expo_registrations.waitlisted / waitlisted_at           a registration made while every place was taken
--   saved_exhibition_alerts                                 "registration opens / closes soon" told to someone who saved an exhibition (once)
--   document_alerts_sent                                    "your passport / visa expires too early" told once per registration and problem
--
-- Idempotent: every statement can run again on a later deploy.

ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS registration_opens DATE NULL,
  ADD COLUMN IF NOT EXISTS registration_closes DATE NULL,
  ADD COLUMN IF NOT EXISTS buyer_quota INT NULL;

ALTER TABLE expo_registrations
  ADD COLUMN IF NOT EXISTS waitlisted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlisted_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS saved_exhibition_alerts (
  user_id INT NOT NULL,
  exhibition_id INT NOT NULL,
  kind VARCHAR(20) NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, exhibition_id, kind),
  CONSTRAINT fk_sea_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sea_expo FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_alerts_sent (
  user_id INT NOT NULL,
  registration_id INT NOT NULL,
  kind VARCHAR(30) NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, registration_id, kind),
  CONSTRAINT fk_das_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_das_reg FOREIGN KEY (registration_id) REFERENCES expo_registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB;
