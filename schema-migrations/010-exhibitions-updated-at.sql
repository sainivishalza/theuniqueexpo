-- The poster/gallery images are served through a stable URL
-- (/api/exhibitions/{slug}/image) with long cache lifetimes so browsers and
-- the CDN don't re-download them on every navigation. But since the URL
-- never changed after an admin re-uploaded a poster, those caches kept
-- serving the old image for up to a day (stale-while-revalidate=86400).
-- Adding updated_at lets the app append a cache-busting ?v= to the URL that
-- changes whenever the row is edited, so a new upload gets a new URL
-- instead of silently colliding with the cached old one.
ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
