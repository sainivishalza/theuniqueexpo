-- Widen exhibitions.image to hold base64-encoded uploaded poster images,
-- not just short URLs. Safe to re-run.
ALTER TABLE exhibitions MODIFY image MEDIUMTEXT;
