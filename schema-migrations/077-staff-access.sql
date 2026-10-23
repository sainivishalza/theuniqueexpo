-- Limits an admin account to part of the back office (a "staff role"). An admin with no row here has full access, as
-- before, so nothing changes for existing admins. Idempotent.
CREATE TABLE IF NOT EXISTS admin_staff_access (
  user_id INT NOT NULL PRIMARY KEY,
  preset VARCHAR(20) NOT NULL,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
