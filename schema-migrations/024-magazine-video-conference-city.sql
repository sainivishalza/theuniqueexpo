-- Four features closing gaps found against a competitor (Winbtb) that runs
-- its own e-magazine, video content, conference/forum hosting, and city
-- brand-promotion services. Each follows an existing pattern in this
-- codebase rather than inventing a new one: the magazine curates existing
-- blog posts into issues (no duplicated content), videos are embed-based
-- distribution (not production), and conference/city-partnership inquiries
-- are lead-capture + admin review, same shape as consultation_bookings/
-- subsidy_applications -- there's no payment processing anywhere in this
-- codebase to sell either as instant checkout.

CREATE TABLE IF NOT EXISTS magazine_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_number INT NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  cover_image MEDIUMTEXT,
  intro TEXT,
  blog_post_ids JSON NOT NULL,
  status ENUM('draft','published') DEFAULT 'draft',
  publish_date DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  embed_url VARCHAR(500) NOT NULL,
  category VARCHAR(100) DEFAULT '',
  related_type ENUM('exhibition','tour') DEFAULT NULL,
  related_id VARCHAR(100) DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conference_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) DEFAULT '',
  event_type VARCHAR(150) DEFAULT '',
  expected_attendees VARCHAR(50) DEFAULT '',
  preferred_date DATE,
  details TEXT,
  status ENUM('pending','in-progress','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS city_partnership_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  organization VARCHAR(255) DEFAULT '',
  city VARCHAR(150) DEFAULT '',
  country VARCHAR(150) DEFAULT '',
  message TEXT,
  status ENUM('pending','in-progress','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
