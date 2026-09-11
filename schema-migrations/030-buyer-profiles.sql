-- Standing buyer-account profile (nationality, company, passport, purchase
-- interests, and the document photos a buyer needs on file) -- distinct
-- from expo_registrations, which is a per-exhibition sign-up. This is
-- account-level: one row per buyer, editable by that buyer from their own
-- dashboard and by admin from /admin/buyer-profiles, independent of which
-- (if any) specific exhibition they've registered for.
-- Document photos follow the same base64 data: URL storage already used
-- for team member photos and registration documents (MEDIUMTEXT, served
-- through a dedicated route) rather than the filesystem, since Passenger
-- rebuilds this app's checkout from scratch on every deploy -- anything
-- written to disk at runtime would be lost on the next push.
CREATE TABLE IF NOT EXISTS buyer_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL DEFAULT '',
  nationality VARCHAR(100) NOT NULL DEFAULT '',
  passport_number VARCHAR(100) NOT NULL DEFAULT '',
  annual_turnover VARCHAR(100) NOT NULL DEFAULT '',
  purchase_intention TEXT,
  other_purchase_intention TEXT,
  contact_person VARCHAR(255) NOT NULL DEFAULT '',
  doc_business_license MEDIUMTEXT,
  doc_business_card MEDIUMTEXT,
  doc_passport_front MEDIUMTEXT,
  doc_visa_page MEDIUMTEXT,
  doc_canton_fair_card MEDIUMTEXT,
  doc_buyer_photo MEDIUMTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
