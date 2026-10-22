-- Request limits (wrong passwords, sign-in tries, form submissions) used to live only in the memory of
-- the running server, so a restart gave every counter a fresh start. They are now kept in this table.
-- The key is stored as a SHA-256 hash so e-mail addresses are not kept in readable form.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS does nothing on a deploy that already ran it.
CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  reset_at BIGINT NOT NULL,
  PRIMARY KEY (key_hash),
  KEY idx_rate_limits_reset (reset_at)
) ENGINE=InnoDB;
