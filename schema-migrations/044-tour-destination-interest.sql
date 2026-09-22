-- Lead capture for the "Browse by Destination" chips on /tours: when a
-- visitor picks a China city that has no matching tour yet (today only
-- Guangzhou -> Hong Kong exists), they can register interest instead of
-- hitting an empty grid. Same shape as city_partnership_inquiries/
-- conference_inquiries -- lead-capture + admin review, no payment.
CREATE TABLE IF NOT EXISTS tour_destination_interest (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  destination VARCHAR(150) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  message TEXT,
  status ENUM('pending','in-progress','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
