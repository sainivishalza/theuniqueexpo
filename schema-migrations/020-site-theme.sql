-- Lets the admin control the site's colors and fonts without a code
-- deploy: one hex per role (primary/gold/background/footer) expanded into
-- full Tailwind-style scales at render time, plus a font choice per role
-- from a fixed, self-hosted catalog. Single row, JSON blob, same pattern
-- as company_profile/faq_content. Defaults match what's already live, so
-- an empty/missing row renders identically to today.
CREATE TABLE IF NOT EXISTS site_theme (
  id INT PRIMARY KEY DEFAULT 1,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO site_theme (id, content)
VALUES (1, JSON_OBJECT(
  'primaryColor', '#075b4f',
  'goldColor', '#c9a24a',
  'backgroundColor', '#fefdfb',
  'footerColor', '#011714',
  'headingFont', 'oswald',
  'bodyFont', 'inter',
  'scriptFont', 'caveat'
))
ON DUPLICATE KEY UPDATE id = id;
