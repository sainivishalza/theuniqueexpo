-- Answers a buyer gave to exhibition registration questions that the buyer profile has no field for
-- ("company scale", "purpose of visit", a question an exhibition added to its own form, an extra
-- document). They are kept on the buyer's profile so the next registration needs no retyping, and
-- are shown on the profile page. One row per question (info_key); the value is text, a JSON list for
-- multiple choice, or an uploaded file as a data URL.
--
-- Idempotent: every statement can run again on a later deploy.

CREATE TABLE IF NOT EXISTS buyer_extra_info (
  user_id INT NOT NULL,
  info_key VARCHAR(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  label VARCHAR(255) NOT NULL DEFAULT '',
  kind VARCHAR(16) NOT NULL DEFAULT 'text',
  value MEDIUMTEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, info_key),
  CONSTRAINT fk_extra_info_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
