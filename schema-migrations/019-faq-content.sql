-- Homepage had no FAQ section or FAQPage schema at all -- FAQ content is
-- one of the highest-value AEO/GEO signals (both readers and AI answer
-- engines scrape FAQ blocks for direct Q&A pairs) and there was nothing to
-- point schema at. Single row, JSON array, same pattern as about_content/
-- company_profile.
CREATE TABLE IF NOT EXISTS faq_content (
  id INT PRIMARY KEY DEFAULT 1,
  items JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO faq_content (id, items)
VALUES (1, JSON_ARRAY(
  JSON_OBJECT(
    'question', 'What does TheUniqueExpo actually do?',
    'answer', 'We help buyers and exhibitors get more out of China''s major trade fairs -- exhibition registration, booth booking, business and city tours, hotel arrangements, visa setup, and relocation support, all from one platform.'
  ),
  JSON_OBJECT(
    'question', 'Do I need to be a registered company to use the platform?',
    'answer', 'No -- buyers, visitors, exhibitors, and partners can all register. Some services (like exhibitor booth booking) are aimed at businesses, but browsing exhibitions and booking business tours does not require a company registration.'
  ),
  JSON_OBJECT(
    'question', 'Can TheUniqueExpo help with visas and relocation, not just the exhibition itself?',
    'answer', 'Yes -- our visa setup and moving assistance services are built to be used alongside exhibition registration, for anyone spending more than a short trip in China.'
  ),
  JSON_OBJECT(
    'question', 'How do I get started?',
    'answer', 'Create a free account, browse upcoming exhibitions, and register as a buyer or exhibitor for the ones relevant to you. If you are not sure where to start, book a free consultation and we will walk through it with you.'
  )
))
ON DUPLICATE KEY UPDATE id = id;

-- Optional per-article FAQ, stored alongside the article so its FAQPage
-- schema always matches what's actually rendered on the page -- rather
-- than a free-text FAQ section in the article body that schema can't
-- reliably parse back out.
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS faq_items JSON DEFAULT NULL;
