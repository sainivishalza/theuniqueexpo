-- The Unique Expo — Admin panel tables (exhibitions, hotels, RFQs)
-- Run this in Hostinger MySQL panel (phpMyAdmin) after schema.sql

CREATE TABLE IF NOT EXISTS exhibitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue VARCHAR(255) DEFAULT '',
  city VARCHAR(100) DEFAULT '',
  country VARCHAR(100) DEFAULT '',
  industry VARCHAR(100) DEFAULT '',
  description TEXT,
  highlights TEXT,
  exhibitors INT DEFAULT 0,
  visitors VARCHAR(50) DEFAULT '',
  organizer VARCHAR(255) DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  color VARCHAR(20) DEFAULT '#059669',
  image MEDIUMTEXT,
  registration_enabled BOOLEAN DEFAULT TRUE,
  registration_form_schema JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stars INT DEFAULT 3,
  address VARCHAR(255) DEFAULT '',
  city VARCHAR(100) DEFAULT '',
  exhibition_id INT,
  price_per_night DECIMAL(10,2) DEFAULT 0,
  distance_to_venue VARCHAR(100) DEFAULT '',
  amenities TEXT,
  image VARCHAR(20) DEFAULT '🏨',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  exhibition_id INT,
  user_id INT,
  user_name VARCHAR(255) DEFAULT '',
  check_in DATE,
  check_out DATE,
  rooms INT DEFAULT 1,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  product VARCHAR(255) DEFAULT '',
  description TEXT,
  quantity VARCHAR(100) DEFAULT '',
  target_price VARCHAR(100) DEFAULT '',
  deadline DATE,
  category VARCHAR(100) DEFAULT '',
  buyer_id INT,
  buyer_name VARCHAR(255) DEFAULT '',
  status ENUM('draft','open','quotes_received','awarded','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfq_id INT NOT NULL,
  exhibitor_id INT,
  exhibitor_name VARCHAR(255) DEFAULT '',
  price VARCHAR(100) DEFAULT '',
  lead_time VARCHAR(100) DEFAULT '',
  notes TEXT,
  status ENUM('submitted','accepted','rejected') DEFAULT 'submitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
);

-- Per-exhibition Buyer/Visitor registration (see schema-migrations/002-expo-registrations.sql for details)
CREATE TABLE IF NOT EXISTS expo_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exhibition_id INT NOT NULL,
  user_id INT NOT NULL,
  registration_type ENUM('buyer','visitor') NULL,
  gender ENUM('male','female') NULL,
  full_name VARCHAR(255) NULL,
  nationality VARCHAR(100) NULL,
  passport_number VARCHAR(100) NULL,
  company_name VARCHAR(255) NULL,
  company_website VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  company_type VARCHAR(100) NULL,
  company_type_other VARCHAR(255) DEFAULT '',
  company_scale VARCHAR(50) NULL,
  company_intro TEXT,
  purpose_of_visit VARCHAR(100) NULL,
  info_source VARCHAR(100) NULL,
  info_source_other VARCHAR(255) DEFAULT '',
  exporting_markets JSON,
  exporting_market_other VARCHAR(255) DEFAULT '',
  doc_passport_front LONGTEXT NULL,
  doc_business_card LONGTEXT NULL,
  doc_visa_page LONGTEXT NULL,
  doc_business_license LONGTEXT NULL,
  doc_order_list LONGTEXT,
  custom_answers JSON DEFAULT NULL,
  form_schema_snapshot JSON DEFAULT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_exhibition_user (exhibition_id, user_id),
  FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Editable "About Us" page content, managed from the admin panel (see
-- schema-migrations/005-about-content.sql for details).
CREATE TABLE IF NOT EXISTS about_content (
  id INT PRIMARY KEY DEFAULT 1,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO about_content (id, content)
VALUES (1, JSON_OBJECT(
  'heading', 'About The Unique Expo',
  'tagline', 'Connecting buyers and exhibitors across the globe, one exhibition at a time.',
  'story', 'The Unique Expo was founded to make it simple for buyers and exhibitors to find each other at the world''s leading trade fairs. What started as a small team helping first-time exhibitors navigate unfamiliar markets has grown into a full-service B2B platform spanning exhibition registration, booth booking, hotel arrangements, visa support, and business tours.\n\nToday we work with organizers, buyers, and exhibitors across dozens of industries -- from furniture and electronics to pharmaceuticals and industrial machinery -- helping them turn a trade show visit into real business relationships.',
  'mission', 'To remove the friction from international trade fairs so buyers and exhibitors can focus on what matters -- building relationships and closing deals.',
  'vision', 'To become the trusted platform every serious trade fair buyer and exhibitor turns to first, in every major exhibition hub worldwide.',
  'stats', JSON_ARRAY(
    JSON_OBJECT('label', 'Exhibitions Supported', 'value', '200+'),
    JSON_OBJECT('label', 'Countries Served', 'value', '40+'),
    JSON_OBJECT('label', 'Registered Buyers', 'value', '10,000+'),
    JSON_OBJECT('label', 'Years of Experience', 'value', '8+')
  ),
  'heroImage', ''
))
ON DUPLICATE KEY UPDATE id = id;
