-- Pictures an admin uploads for the website that are not part of a page (today: the WeChat QR code of the help box).
-- Kept apart from the company details so those stay small. Idempotent.
CREATE TABLE IF NOT EXISTS site_assets (
  name VARCHAR(40) NOT NULL PRIMARY KEY,
  content MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
