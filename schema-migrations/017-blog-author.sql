-- Blog posts had no author at all -- articles rendered with no byline,
-- which flattens entity trust for AEO/GEO (an anonymous "Admin" post reads
-- as low-authority to both readers and AI answer engines). Per-post rather
-- than sitewide so a guest writer or specialist can be credited on their
-- own article without overwriting who wrote everything else.
ALTER TABLE blog_posts
  ADD COLUMN author_name VARCHAR(255) DEFAULT '' AFTER content,
  ADD COLUMN author_bio VARCHAR(500) DEFAULT '' AFTER author_name;
