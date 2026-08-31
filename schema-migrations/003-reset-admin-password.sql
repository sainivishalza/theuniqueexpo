-- Sets the admin login password to TheUniqueExpo2026!
-- Run this directly in the Hostinger MySQL panel (phpMyAdmin) against the
-- live database — schema.sql only sets this on a fresh install.
UPDATE users
SET password_hash = '$2b$10$W2RX8zFZ.9gxdmF8CPsnZe7YiHPK4IY41IRUwGXjfI56cfq0lVdZ.'
WHERE email = 'admin@theuniqueexpo.com';
