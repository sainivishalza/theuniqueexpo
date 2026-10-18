-- Every buyer gets a permanent registration number: TUE0001, TUE0002, ...
-- Stored as the plain number (users.buyer_no); the "TUE" + zero padding is added
-- when it is shown. A number is never reused, even if the buyer is later deleted
-- (id_counters keeps the last number handed out).
ALTER TABLE users ADD COLUMN IF NOT EXISTS buyer_no INT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_buyer_no ON users (buyer_no);

CREATE TABLE IF NOT EXISTS id_counters (
  name VARCHAR(50) PRIMARY KEY,
  last_no INT NOT NULL DEFAULT 0
);

-- Number every buyer that has none yet: oldest account first, continuing after
-- the highest number already in use. Safe to run again -- numbered buyers are
-- left alone, and it only picks up buyers who somehow missed theirs.
UPDATE users u
JOIN (
  SELECT t.id, t.rn + COALESCE((SELECT MAX(m.buyer_no) FROM (SELECT buyer_no FROM users) m), 0) AS no
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
    FROM users
    WHERE role = 'buyer' AND buyer_no IS NULL
  ) t
) x ON x.id = u.id
SET u.buyer_no = x.no;

INSERT INTO id_counters (name, last_no)
SELECT 'buyer_no', COALESCE(MAX(buyer_no), 0) FROM users
ON DUPLICATE KEY UPDATE last_no = GREATEST(last_no, VALUES(last_no));
