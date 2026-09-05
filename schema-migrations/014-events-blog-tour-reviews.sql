-- Three independent additions, all admin-manageable from day one:
-- 1. Events: local meetups (networking, hiking, picnics, cultural) with a
--    simple one-click registration (no custom-form builder like tours/
--    exhibitions -- an event just needs a headcount, not a questionnaire).
-- 2. Blog: real dated/categorized posts, replacing the single static
--    "blog" site_pages row with an actual list of articles.
-- 3. Tour reviews: same shape as exhibitor_reviews, keyed by tour slug
--    instead of exhibitor slug, so tours get the same rating/review UI.

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category ENUM('networking','hiking','picnic','cultural','other') DEFAULT 'other',
  city VARCHAR(150) DEFAULT '',
  venue VARCHAR(255) DEFAULT '',
  event_date DATE NOT NULL,
  start_time VARCHAR(20) DEFAULT '',
  end_time VARCHAR(20) DEFAULT '',
  price VARCHAR(50) DEFAULT '',
  capacity INT DEFAULT 0,
  description TEXT,
  image MEDIUMTEXT,
  registration_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_event_user (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category ENUM('life-in-china','relocation-tips','exhibition-reviews') NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt VARCHAR(500) DEFAULT '',
  content LONGTEXT,
  cover_image MEDIUMTEXT,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tour_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_slug VARCHAR(255) NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(255) DEFAULT '',
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_tour (tour_slug, user_id)
);
