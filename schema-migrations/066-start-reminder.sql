-- "Your exhibition starts soon": a confirmed registration gets one reminder in the week before the exhibition opens.
-- This is when it was sent (once per registration).
--
-- Idempotent: every statement can run again on a later deploy.

ALTER TABLE expo_registrations
  ADD COLUMN IF NOT EXISTS start_reminder_sent_at DATETIME NULL;
