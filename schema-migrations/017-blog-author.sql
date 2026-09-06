-- Blog posts had no author at all -- articles rendered with no byline,
-- which flattens entity trust for AEO/GEO (an anonymous "Admin" post reads
-- as low-authority to both readers and AI answer engines). Per-post rather
-- than sitewide so a guest writer or specialist can be credited on their
-- own article without overwriting who wrote everything else.
--
-- Safe to re-run (see run 34004617031 -- ADD COLUMN without IF NOT EXISTS
-- broke every deploy after the first successful one, since this script
-- reapplies the full migration list unconditionally on every run).
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(255) DEFAULT '' AFTER content,
  ADD COLUMN IF NOT EXISTS author_bio VARCHAR(500) DEFAULT '' AFTER author_name;
