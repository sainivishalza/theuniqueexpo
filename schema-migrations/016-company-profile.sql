-- Sitewide entity data (Organization schema, footer social links, llms.txt)
-- previously didn't exist anywhere -- footer socials were href="#"
-- placeholders and there was no JSON-LD at all. Single row, JSON blob,
-- same pattern as about_content -- admin-editable, safe empty defaults so
-- nothing fabricates a fake phone/address/social link before the admin
-- fills it in.
CREATE TABLE IF NOT EXISTS company_profile (
  id INT PRIMARY KEY DEFAULT 1,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO company_profile (id, content)
VALUES (1, JSON_OBJECT(
  'legalName', 'The Unique Expo',
  'logoUrl', '',
  'contactEmail', 'info@theuniqueexpo.com',
  'phone', '',
  'addressLine', '',
  'addressCity', '',
  'addressCountry', '',
  'socialLinkedIn', '',
  'socialFacebook', '',
  'socialInstagram', '',
  'socialX', '',
  'socialYoutube', ''
))
ON DUPLICATE KEY UPDATE id = id;
