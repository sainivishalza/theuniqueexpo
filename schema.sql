-- The Unique Expo Database Schema
-- Run this in Hostinger MySQL panel (phpMyAdmin)

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('buyer','exhibitor','visitor','partner','admin') DEFAULT 'buyer',
  country VARCHAR(100) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tour_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(255) DEFAULT '',
  nationality VARCHAR(100) DEFAULT '',
  travelers INT DEFAULT 1,
  services JSON,
  special_requests TEXT,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS visa_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(255) DEFAULT '',
  nationality VARCHAR(100) DEFAULT '',
  service_type VARCHAR(100) DEFAULT '',
  details TEXT,
  status ENUM('pending','in-progress','completed','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS moving_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(255) DEFAULT '',
  move_type ENUM('office','residential','freight','pet') DEFAULT 'office',
  origin VARCHAR(255) DEFAULT '',
  destination VARCHAR(255) DEFAULT '',
  move_date DATE,
  details TEXT,
  status ENUM('pending','quoted','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultation_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) DEFAULT '',
  topic VARCHAR(255) DEFAULT '',
  preferred_date DATE,
  questions TEXT,
  status ENUM('pending','scheduled','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: TheUniqueExpo2026!)
-- In production, change this password immediately!
INSERT INTO users (name, email, password_hash, role, country) VALUES
('Admin', 'admin@theuniqueexpo.com', '$2b$10$W2RX8zFZ.9gxdmF8CPsnZe7YiHPK4IY41IRUwGXjfI56cfq0lVdZ.', 'admin', 'China')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);
