-- The admin password was previously committed to source control in
-- plaintext (see the now-scrubbed 003-reset-admin-password.sql) and that
-- migration was run unconditionally on every deploy, silently resetting
-- the live password back to the leaked value even if it had since been
-- changed by hand. This rotates it to a new, randomly generated password
-- (given to the site owner out-of-band, not committed anywhere) and is
-- self-disarming: the WHERE clause only matches the specific old leaked
-- hash, so this is safe to leave in the deploy script permanently -- it
-- fires exactly once and is a no-op on every deploy after that,
-- including if the password is changed again by some other means later.
UPDATE users
SET password_hash = '$2b$10$SIntChXnGYyDlfH3/Sbps.tryq6/TPnHyo2zxqZdrIyVJBqt2dpn2'
WHERE email = 'admin@theuniqueexpo.com'
  AND password_hash = '$2b$10$W2RX8zFZ.9gxdmF8CPsnZe7YiHPK4IY41IRUwGXjfI56cfq0lVdZ.';
