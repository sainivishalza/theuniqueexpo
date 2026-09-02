-- Tours: a new, admin-manageable tour/travel-package content type,
-- mirroring exhibitions (own table, admin CRUD, customizable per-tour
-- registration form via the same registration_form_schema mechanism, and
-- a tour_registrations table mirroring expo_registrations). Every tour
-- registration goes through the custom-form path -- there is no separate
-- fixed schema like exhibitions' Buyer/Visitor form, since the default
-- questionnaire below already covers what a tour booking needs.

CREATE TABLE IF NOT EXISTS tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration VARCHAR(100) DEFAULT '',
  departure_city VARCHAR(150) DEFAULT '',
  destination VARCHAR(150) DEFAULT '',
  description TEXT,
  highlights TEXT,
  price VARCHAR(50) DEFAULT '',
  currency VARCHAR(10) DEFAULT 'USD',
  group_size VARCHAR(50) DEFAULT '',
  organizer VARCHAR(255) DEFAULT '',
  color VARCHAR(20) DEFAULT '#0891b2',
  image MEDIUMTEXT,
  gallery_images JSON DEFAULT NULL,
  registration_enabled BOOLEAN DEFAULT TRUE,
  registration_form_schema JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tour_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  user_id INT NOT NULL,
  custom_answers JSON DEFAULT NULL,
  form_schema_snapshot JSON DEFAULT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tour_user (tour_id, user_id),
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
);

-- Seed one real tour: Guangzhou -> Lantau Island (Hong Kong), 2 nights, by
-- coach, round trip -- with the full travel-planning questionnaire as its
-- default registration form.
INSERT INTO tours (slug, title, start_date, end_date, duration, departure_city, destination, description, highlights, price, currency, group_size, organizer, color, image, gallery_images, registration_enabled, registration_form_schema)
SELECT 'guangzhou-lantau-island-hongkong-2night-tour', 'Guangzhou to Lantau Island (Hong Kong) — 2-Night Bus Tour', '2026-10-16', '2026-10-18', '3 days / 2 nights', 'Guangzhou', 'Lantau Island, Hong Kong',
  'Cross the border in comfort on a private coach from Guangzhou straight to Lantau Island, Hong Kong\'s largest island and home to the world-famous Tian Tan Buddha (the "Big Buddha").

Over three days and two nights, you will ride the Ngong Ping 360 cable car for sweeping views of the South China Sea, visit the tranquil Po Lin Monastery at the foot of the Buddha, wander the stilt houses and dried-seafood stalls of Tai O fishing village, and have free time to explore Hong Kong\'s skyline and harbourfront before the coach returns you to Guangzhou.

Hotel, coach transport both ways, and an English-speaking guide are included. This tour is fully customizable -- tell us about your group and interests when you register, and we will tailor the itinerary to match.',
  '["Private coach, Guangzhou to Lantau Island and back","Tian Tan Buddha (the \\"Big Buddha\\") and Po Lin Monastery","Ngong Ping 360 cable car ride","Tai O fishing village and stilt houses","2 nights hotel accommodation included","English-speaking guide","Free time in Hong Kong before returning"]',
  '220', 'USD', '10-25 travelers', 'The Unique Expo Travel Desk', '#0891b2',
  'https://images.unsplash.com/photo-1549167008-f02ad8abf052?w=1600&h=900&fit=crop&q=80',
  '["https://images.unsplash.com/photo-1620015092538-e33c665fc181?w=1200&h=800&fit=crop&q=80","https://images.unsplash.com/photo-1563090162-6b4c2a20d658?w=1200&h=800&fit=crop&q=80","https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1200&h=800&fit=crop&q=80"]',
  TRUE,
  '[{"id":"f_adults","label":"How many adults are traveling?","type":"text","required":true},{"id":"f_children","label":"How many children are traveling? (please note their ages)","type":"text","required":false},{"id":"f_seniors","label":"How many seniors are traveling?","type":"text","required":false},{"id":"f_special_needs","label":"Any special needs? (diet, allergies, health restrictions, stroller, etc.)","type":"textarea","required":false},{"id":"f_trip_priority","label":"What matters most to you on this trip? (choose up to 3)","type":"checkbox","required":true,"options":["Culture","Nature","Food","Shopping","Relaxation","Business"]},{"id":"f_trip_style","label":"Do you want the classic sights or something more unusual?","type":"radio","required":true,"options":["Classic must-see spots","Off the beaten path","A mix of both"]},{"id":"f_must_see","label":"Any cities or attractions you definitely want to visit?","type":"textarea","required":false},{"id":"f_travel_dates","label":"Planned travel dates (month or season)","type":"text","required":true},{"id":"f_trip_length","label":"How many days are you willing to travel (excluding flights)?","type":"text","required":false},{"id":"f_return_deadline","label":"Any fixed return date?","type":"text","required":false},{"id":"f_budget","label":"Approximate budget per person (excluding airfare)","type":"text","required":true},{"id":"f_hotel_class","label":"Preferred hotel class","type":"radio","required":true,"options":["Hostel / budget","2-3 star","4-5 star luxury"]},{"id":"f_splurge","label":"Willing to pay extra for a unique experience? (helicopter, private guide, individual transfer)","type":"radio","required":false,"options":["Yes","No","Maybe — tell me more"]},{"id":"f_interests","label":"Your top interests (choose 2-3)","type":"checkbox","required":true,"options":["History & culture","Nature & mountains","Modern megacities","Food & gastronomy","Shopping","Relaxation (tea ceremony, spa, hot springs)","Photography / Instagram spots","Children\'s entertainment"]},{"id":"f_transport_comfort","label":"Preferred transport comfort level","type":"radio","required":false,"options":["High-speed train","Flights","Private driver","Economy / budget"]},{"id":"f_long_journeys","label":"Are you OK with long journeys (5+ hours), or do you want to minimize travel time?","type":"radio","required":false,"options":["Fine with long journeys","Prefer to minimize travel time"]},{"id":"f_avoid","label":"Anything you absolutely do NOT want to see or do?","type":"textarea","required":false},{"id":"f_dream","label":"Any dream experiences you want to fulfill? (pet a panda, bamboo raft, view the city from above, etc.)","type":"textarea","required":false},{"id":"f_free_time","label":"Fully organized tour, or free days for independent exploration?","type":"radio","required":false,"options":["Fully organized","Free days included","A mix of both"]},{"id":"f_guide","label":"Do you need an English-speaking guide for the entire tour or just certain days?","type":"radio","required":false,"options":["Entire tour","Certain days only","Not needed"]},{"id":"f_airport_transfer","label":"Do you need airport transfer assistance?","type":"radio","required":false,"options":["Yes","No"]},{"id":"f_extra_services","label":"Do you need help with visas, tickets, or insurance?","type":"checkbox","required":false,"options":["Visa assistance","Flight tickets","Travel insurance","None needed"]},{"id":"f_phone","label":"Phone Number","type":"text","required":true}]'
WHERE NOT EXISTS (SELECT 1 FROM tours WHERE slug = 'guangzhou-lantau-island-hongkong-2night-tour');
