-- Makes the Conference & Forum Hosting and City Partnerships pages'
-- marketing copy admin-editable instead of hardcoded -- same single-row
-- JSON-blob pattern as about_content/company_profile/site_theme. Only the
-- page copy lives here; the inquiries those pages collect already have
-- their own tables (conference_inquiries/city_partnership_inquiries,
-- see 024-magazine-video-conference-city.sql).
CREATE TABLE IF NOT EXISTS conference_hosting_content (
  id INT PRIMARY KEY DEFAULT 1,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO conference_hosting_content (id, content)
VALUES (1, JSON_OBJECT(
  'title', 'Conference & Forum Hosting',
  'subtitle', 'Bring your own conference, forum, or summit to life -- we handle the venue, registration, attendee logistics, and on-site staffing.',
  'heroImage', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=600&fit=crop&q=80',
  'included', JSON_ARRAY(
    JSON_OBJECT('icon', '📍', 'title', 'Venue Sourcing', 'desc', 'Access to venues across our exhibition network in major Chinese cities.'),
    JSON_OBJECT('icon', '💻', 'title', 'Registration Website', 'desc', 'A branded, custom registration site for your attendees.'),
    JSON_OBJECT('icon', '📋', 'title', 'Attendee Management', 'desc', 'Check-in, badges, and speaker/session scheduling.'),
    JSON_OBJECT('icon', '🏨', 'title', 'Hotel & Tour Bundling', 'desc', 'Accommodation and city tours for out-of-town guests.'),
    JSON_OBJECT('icon', '👥', 'title', 'On-Site Staffing', 'desc', 'Registration desks, translators, and event-day support.'),
    JSON_OBJECT('icon', '🤝', 'title', 'Sponsorship Packaging', 'desc', 'Help structuring and selling sponsorship tiers.')
  )
))
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS city_partnerships_content (
  id INT PRIMARY KEY DEFAULT 1,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO city_partnerships_content (id, content)
VALUES (1, JSON_OBJECT(
  'title', 'Promote your city to global buyers and exhibitors',
  'subtitle', 'Partner with us to put your city in front of the buyers and exhibitors already using our platform for China''s major trade fairs.',
  'heroImage', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&h=600&fit=crop&q=80',
  'benefits', JSON_ARRAY(
    JSON_OBJECT('icon', '🌍', 'title', 'Reach an Active Audience', 'desc', 'Thousands of buyers and exhibitors already planning trips to China.'),
    JSON_OBJECT('icon', '🏆', 'title', 'Destination Spotlights', 'desc', 'Featured placement on relevant exhibition and tour pages.'),
    JSON_OBJECT('icon', '📣', 'title', 'Co-Marketing', 'desc', 'Joint content, social posts, and newsletter features.'),
    JSON_OBJECT('icon', '🧭', 'title', 'Delegation Support', 'desc', 'Help hosting buyer delegations visiting your city.')
  )
))
ON DUPLICATE KEY UPDATE id = id;
