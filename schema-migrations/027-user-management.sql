-- Admin User Management: the users table had no way to suspend an
-- account short of deleting it outright. A suspended user can't log in
-- (checked in verifyUserPassword) and any of their existing sessions stop
-- working on their next request (checked in getSessionUser), without
-- losing their data.
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('active', 'suspended') NOT NULL DEFAULT 'active';
