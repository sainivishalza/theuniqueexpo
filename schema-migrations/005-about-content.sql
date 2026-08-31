-- Editable "About Us" page content, managed from the admin panel.
-- Single row (id = 1); content is a JSON blob so new fields (stats,
-- mission/vision, etc.) don't need further migrations.
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
