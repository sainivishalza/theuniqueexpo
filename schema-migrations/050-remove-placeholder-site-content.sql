-- Remove placeholder content that shipped as the seeded default: the three
-- made-up job listings on the Careers page and the dummy +86 400 000 0000
-- phone number. Each statement only touches a row that still holds the
-- original seeded text, so anything an admin has since edited is left alone.
-- The new text matches DEFAULT_SITE_PAGE_CONTENT.careers in src/lib/site-pages.ts,
-- which keeps the built-in Russian/Chinese translations applying.
UPDATE site_pages
SET content = JSON_SET(
  content,
  '$.body', 'We\'re a small, fast-moving team building the platform international buyers and exhibitors rely on for every trade fair visit. We\'re always interested in hearing from people who care about international trade, logistics, or building good software.\n\nThere are no open positions listed right now, but we\'d still like to hear from you — send a short introduction and your CV to the address below.',
  '$.items', JSON_ARRAY()
)
WHERE slug = 'careers' AND content LIKE '%Exhibition Account Manager%';

UPDATE site_pages
SET content = JSON_SET(content, '$.contactPhone', '')
WHERE slug = 'contact' AND content LIKE '%+86 400 000 0000%';
