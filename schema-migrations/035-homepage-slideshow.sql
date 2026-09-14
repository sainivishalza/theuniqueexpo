-- Admin-manageable photo slideshow shown on the homepage hero. Photo
-- storage mirrors team_members.photo (MEDIUMTEXT holding a data: URL,
-- served through a dedicated /api/slideshow-photos/[id]/image route) so
-- the list response stays small instead of shipping every photo's base64
-- on every homepage load.
CREATE TABLE IF NOT EXISTS homepage_slideshow_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image MEDIUMTEXT NOT NULL,
  caption VARCHAR(255) NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
