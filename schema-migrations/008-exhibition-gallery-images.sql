-- Additional photos for an exhibition beyond the single hero image. The
-- hero (`image` column) is unchanged and still displays as the main
-- picture; these show as a gallery on the exhibition's own page. Stored as
-- a JSON array of image values (data: URIs or plain URLs), same shape as
-- the existing `image` column just repeated. NULL/empty means no extra
-- photos.
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS gallery_images JSON DEFAULT NULL;
