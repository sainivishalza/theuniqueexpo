-- Lead-capture tables for the "How Are You Attending?" / business-tour-type
-- quote requests and the new organizer/company "Partner With Us" page.
-- Same shape as conference_inquiries/city_partnership_inquiries: public
-- submission, no payment processing, admin reviews and updates status.

CREATE TABLE IF NOT EXISTS business_trip_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(255) DEFAULT '',
  attending_type ENUM('in_china', 'traveling', 'unspecified') DEFAULT 'unspecified',
  tour_type VARCHAR(50) DEFAULT '',
  exhibition_slug VARCHAR(150) DEFAULT '',
  message TEXT,
  status ENUM('pending','in-progress','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) DEFAULT '',
  partner_type ENUM('organizer', 'company', 'other') DEFAULT 'other',
  message TEXT,
  status ENUM('pending','in-progress','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
