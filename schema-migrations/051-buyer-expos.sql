-- An editable list of expos for tagging buyers ("source exhibitions"), plus a
-- link table, so renaming an expo in Admin -> Buyer Expos changes it for every
-- buyer at once. Replaces the free-text buyer_profiles.source_exhibitions
-- column. Linked by users.id (not buyer_profiles) so a buyer with no profile
-- row yet can still be tagged.
CREATE TABLE IF NOT EXISTS buyer_expos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_buyer_expos_name (name)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS buyer_profile_expos (
  user_id INT NOT NULL,
  expo_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, expo_id),
  KEY idx_buyer_profile_expos_expo (expo_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (expo_id) REFERENCES buyer_expos(id) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- One-time move of the old free-text values ("CPHI", "CPHI, Canton Fair") into
-- the new tables. Runs on every deploy like the other data migrations, so the
-- old column is emptied at the end: a later rerun finds nothing to move and
-- can never resurrect an expo an admin has since renamed or deleted.
INSERT IGNORE INTO buyer_expos (name)
SELECT DISTINCT s.name
FROM (
  SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.source_exhibitions, ',', n.n), ',', -1)) AS name
  FROM buyer_profiles p
  JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
        UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) n
    ON n.n <= 1 + CHAR_LENGTH(p.source_exhibitions) - CHAR_LENGTH(REPLACE(p.source_exhibitions, ',', ''))
  WHERE p.source_exhibitions <> ''
) s
WHERE s.name <> '';

INSERT IGNORE INTO buyer_profile_expos (user_id, expo_id)
SELECT DISTINCT s.user_id, e.id
FROM (
  SELECT p.user_id, TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.source_exhibitions, ',', n.n), ',', -1)) AS name
  FROM buyer_profiles p
  JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
        UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) n
    ON n.n <= 1 + CHAR_LENGTH(p.source_exhibitions) - CHAR_LENGTH(REPLACE(p.source_exhibitions, ',', ''))
  WHERE p.source_exhibitions <> ''
) s
JOIN buyer_expos e ON e.name = CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
WHERE s.name <> '';

UPDATE buyer_profiles SET source_exhibitions = '' WHERE source_exhibitions <> '';
