-- Self-service account deletion: when an account was deleted (the account itself is kept as an anonymous shell, because wallet
-- entries and registrations point at it). Idempotent.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
