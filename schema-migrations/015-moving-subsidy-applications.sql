-- Moving-assistance and transport-subsidy pages had forms that never
-- submitted anywhere (moving-assistance faked success client-side;
-- transport-subsidies had no form at all). Both are public lead-capture,
-- same as consultation_bookings -- no login required to ask for a quote
-- or application help.

CREATE TABLE IF NOT EXISTS moving_quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(255) DEFAULT '',
  moving_type ENUM('office','residential','freight','pet') DEFAULT 'office',
  origin_city VARCHAR(150) DEFAULT '',
  destination_city VARCHAR(150) DEFAULT '',
  preferred_date DATE,
  details TEXT,
  status ENUM('pending','quoted','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subsidy_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  subsidy_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) DEFAULT '',
  message TEXT,
  status ENUM('pending','in-progress','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
