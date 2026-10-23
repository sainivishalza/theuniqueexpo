-- "Change my e-mail address": a person who already has a real address asks to change it. The link goes to the NEW
-- address; this column keeps the address the account had when the link was asked for, so the link only works while the
-- account still has that address (and the old address can be told when the change happens). It stays NULL for the
-- "add your e-mail" flow (an account that had no real address).
--
-- Idempotent: every statement can run again on a later deploy.

ALTER TABLE email_changes
  ADD COLUMN IF NOT EXISTS old_email VARCHAR(254) NULL;
