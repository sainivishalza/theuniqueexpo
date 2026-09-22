-- Admin-editable China Travel content (destinations + pre-built routes) for
-- the new /china-travel page, linked from exhibition pages ("Add China
-- Travel") and the Business Tours page. Single-row JSON blob, same pattern
-- as about_content/company_profile -- seeded once with the initial
-- destination/route list, safe to edit from /admin/china-travel afterward.
CREATE TABLE IF NOT EXISTS china_travel_content (
  id INT PRIMARY KEY DEFAULT 1,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO china_travel_content (id, content)
VALUES (1, JSON_OBJECT(
  'destinations', JSON_ARRAY(
    JSON_OBJECT('icon', '🏙️', 'name', 'Guangzhou', 'tagline', 'Business + city experience', 'highlights', JSON_ARRAY('Canton Fair', 'Wholesale markets', 'Business meetings', 'Historical Guangzhou', 'Local experiences')),
    JSON_OBJECT('icon', '🏙️', 'name', 'Shenzhen', 'tagline', 'Technology, business, modern China', 'highlights', JSON_ARRAY('Technology', 'Business', 'Markets', 'Modern China')),
    JSON_OBJECT('icon', '🏔️', 'name', 'Yangshuo', 'tagline', 'A 2-3 day countryside extension', 'highlights', JSON_ARRAY('Li River', 'Mountains', 'Countryside', '2-3 day extension')),
    JSON_OBJECT('icon', '🏖️', 'name', 'Silver Beach', 'tagline', 'A relaxing weekend extension', 'highlights', JSON_ARRAY('Beach', 'Relaxation', 'Weekend extension')),
    JSON_OBJECT('icon', '🏙️', 'name', 'Hong Kong', 'tagline', 'Business, city, international connections', 'highlights', JSON_ARRAY('Business', 'City', 'Shopping', 'International connections')),
    JSON_OBJECT('icon', '🏙️', 'name', 'Macau', 'tagline', 'City, culture, entertainment', 'highlights', JSON_ARRAY('City experience', 'Culture', 'Entertainment')),
    JSON_OBJECT('icon', '🏖️', 'name', 'Zhuhai', 'tagline', 'Coastal city, easy to combine with Macau', 'highlights', JSON_ARRAY('Coastal city', 'Leisure', 'Easy combination with Macau')),
    JSON_OBJECT('icon', '🏙️', 'name', 'Hangzhou', 'tagline', 'West Lake, business, Chinese culture', 'highlights', JSON_ARRAY('West Lake', 'Business', 'Chinese culture')),
    JSON_OBJECT('icon', '🏙️', 'name', 'Shanghai', 'tagline', 'Business, exhibitions, modern China', 'highlights', JSON_ARRAY('Business', 'Exhibition', 'Modern China')),
    JSON_OBJECT('icon', '🏛️', 'name', 'Beijing', 'tagline', 'Business, culture, historical China', 'highlights', JSON_ARRAY('Business', 'Culture', 'Historical China')),
    JSON_OBJECT('icon', '🏛️', 'name', 'Xi''an', 'tagline', 'A cultural extension around history', 'highlights', JSON_ARRAY('Terracotta Warriors', 'History', 'Cultural extension')),
    JSON_OBJECT('icon', '🐼', 'name', 'Chengdu', 'tagline', 'Culture, food, and the panda experience', 'highlights', JSON_ARRAY('Culture', 'Food', 'Panda experience')),
    JSON_OBJECT('icon', '🏙️', 'name', 'Chongqing', 'tagline', 'A mountain city with great food', 'highlights', JSON_ARRAY('City experience', 'Food', 'Mountain city')),
    JSON_OBJECT('icon', '🏔️', 'name', 'Zhangjiajie', 'tagline', 'A 2-3 day nature extension', 'highlights', JSON_ARRAY('Mountains', 'Nature', '2-3 day extension')),
    JSON_OBJECT('icon', '🏖️', 'name', 'Shantou / Nan''ao', 'tagline', 'A coastal weekend extension', 'highlights', JSON_ARRAY('Coastal experience', 'Food', 'Weekend extension'))
  ),
  'routes', JSON_ARRAY(
    JSON_OBJECT('title', 'Canton Fair + Guangzhou + Yangshuo', 'duration', '5-7 days', 'description', 'Business + exhibition + China experience'),
    JSON_OBJECT('title', 'Canton Fair + Guangzhou + Silver Beach', 'duration', '5-6 days', 'description', 'Business + exhibition + beach'),
    JSON_OBJECT('title', 'Exhibition + Guangzhou + Shenzhen', 'duration', '5-6 days', 'description', 'Business + technology + city'),
    JSON_OBJECT('title', 'Exhibition + Hong Kong + Shenzhen + Guangzhou', 'duration', '6-8 days', 'description', 'International business + China experience')
  )
))
ON DUPLICATE KEY UPDATE id = id;

-- Custom China-route context on a business trip inquiry -- which
-- pre-built route (if any) was selected, and which destinations the
-- visitor wants to combine with their exhibition trip.
ALTER TABLE business_trip_inquiries
  ADD COLUMN IF NOT EXISTS route VARCHAR(255) DEFAULT '' AFTER industry,
  ADD COLUMN IF NOT EXISTS destinations JSON DEFAULT NULL AFTER route;
