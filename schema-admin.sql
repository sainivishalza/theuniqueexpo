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
