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
  gallery_images JSON DEFAULT NULL,
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

-- Generic editable footer content pages (Contact, Careers, Blog, Help Center,
-- Exhibition Guide, Booth Setup Tips, API Documentation), managed from the
-- admin panel at /admin/pages/[slug]. Slugs match src/lib/site-pages.ts.
CREATE TABLE IF NOT EXISTS site_pages (
  slug VARCHAR(64) PRIMARY KEY,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO site_pages (slug, content) VALUES ('contact', '{"heading": "Contact Us", "tagline": "We\'d love to hear from you \\u2014 reach out with any question about exhibitions, bookings, or partnerships.", "body": "Our team typically responds within one business day. For urgent matters during an active exhibition, please call the number below.", "itemsLabel": "Departments", "items": [{"title": "Sales & Partnerships", "description": "sales@theuniqueexpo.com"}, {"title": "Buyer Support", "description": "support@theuniqueexpo.com"}, {"title": "Media & Press", "description": "press@theuniqueexpo.com"}], "contactEmail": "info@theuniqueexpo.com", "contactPhone": "+86 400 000 0000"}')
ON DUPLICATE KEY UPDATE slug = slug;

INSERT INTO site_pages (slug, content) VALUES ('careers', '{"heading": "Careers at The Unique Expo", "tagline": "Help us connect the world\'s buyers and exhibitors.", "body": "We\'re a small, fast-moving team building the platform international buyers and exhibitors rely on for every trade fair visit. We\'re always interested in hearing from people who care about international trade, logistics, or building good software.", "itemsLabel": "Open Positions", "items": [{"title": "Exhibition Account Manager \\u2014 Shanghai", "description": "Manage relationships with exhibitors and organizers across our China-based trade fairs."}, {"title": "Buyer Success Specialist \\u2014 Remote", "description": "Support international buyers through registration, sourcing, and on-site logistics."}, {"title": "Frontend Engineer \\u2014 Remote", "description": "Build and improve the platform buyers and exhibitors use every day."}], "contactEmail": "careers@theuniqueexpo.com", "contactPhone": ""}')
ON DUPLICATE KEY UPDATE slug = slug;

INSERT INTO site_pages (slug, content) VALUES ('blog', '{"heading": "The Unique Expo Blog", "tagline": "Insights, guides, and updates from the world of B2B trade fairs.", "body": "New posts from our team on exhibition prep, sourcing strategy, and what\'s changing across the industries we cover.", "itemsLabel": "Recent Posts", "items": [{"title": "5 Tips for First-Time Exhibitors", "description": "What to prepare before your first trade fair booth."}, {"title": "How to Prepare for CIFF Shanghai 2026", "description": "A buyer\'s checklist for the furniture industry\'s biggest fair."}, {"title": "Understanding Trade Fair Visa Requirements", "description": "A quick guide to visa support for international visitors."}], "contactEmail": "", "contactPhone": ""}')
ON DUPLICATE KEY UPDATE slug = slug;

INSERT INTO site_pages (slug, content) VALUES ('help-center', '{"heading": "Help Center", "tagline": "Answers to common questions about registration, bookings, and more.", "body": "Can\'t find what you\'re looking for? Reach out to our support team and we\'ll get back to you.", "itemsLabel": "Frequently Asked Questions", "items": [{"title": "How do I register for an exhibition?", "description": "Visit the exhibition page and click \\"Register as Buyer / Visitor\\" \\u2014 registration is required separately for each exhibition."}, {"title": "Can I reuse my documents across exhibitions?", "description": "Yes \\u2014 we prefill your details from your most recent registration, though you\'ll still need to submit a fresh registration per exhibition."}, {"title": "How do I book a hotel near the venue?", "description": "Each exhibition page has a Hotels section with partner hotels near the venue."}], "contactEmail": "support@theuniqueexpo.com", "contactPhone": ""}')
ON DUPLICATE KEY UPDATE slug = slug;

INSERT INTO site_pages (slug, content) VALUES ('exhibition-guide', '{"heading": "Exhibition Guide", "tagline": "Everything you need to know before attending your first trade fair.", "body": "Trade fairs move fast. A little preparation goes a long way toward making the most of your visit.", "itemsLabel": "Steps to Get Ready", "items": [{"title": "1. Register Early", "description": "Complete your buyer/visitor registration as soon as the exhibition opens for sign-ups."}, {"title": "2. Plan Your Visit", "description": "Review the floor plan and shortlist exhibitors you want to meet."}, {"title": "3. Prepare Your Documents", "description": "Have your passport, business card, and visa ready for registration and check-in."}, {"title": "4. Book Accommodation", "description": "Reserve a hotel near the venue through our Hotels section."}], "contactEmail": "", "contactPhone": ""}')
ON DUPLICATE KEY UPDATE slug = slug;

INSERT INTO site_pages (slug, content) VALUES ('booth-setup-tips', '{"heading": "Booth Setup Tips", "tagline": "Practical advice for exhibitors setting up at a trade fair.", "body": "A well-run booth is the difference between a busy floor and a quiet one. A few basics go a long way.", "itemsLabel": "Tips", "items": [{"title": "Design for a 3-second impression", "description": "Passersby decide whether to stop within seconds \\u2014 keep your signage bold and simple."}, {"title": "Bring more business cards than you think", "description": "Popular booths run out fast \\u2014 overestimate."}, {"title": "Staff your booth in shifts", "description": "Keep your team fresh across long exhibition days."}], "contactEmail": "", "contactPhone": ""}')
ON DUPLICATE KEY UPDATE slug = slug;

INSERT INTO site_pages (slug, content) VALUES ('api-documentation', '{"heading": "API Documentation", "tagline": "Reference for developers integrating with The Unique Expo platform.", "body": "A quick overview of the public endpoints available today. This is a work in progress -- reach out if you need something not listed here.", "itemsLabel": "Endpoints", "items": [{"title": "GET /api/exhibitions", "description": "List all published exhibitions."}, {"title": "GET /api/exhibitions/{slug}", "description": "Get details for a single exhibition."}, {"title": "POST /api/expo-registrations", "description": "Submit a buyer/visitor registration for an exhibition (requires sign-in)."}], "contactEmail": "developers@theuniqueexpo.com", "contactPhone": ""}')
ON DUPLICATE KEY UPDATE slug = slug;
