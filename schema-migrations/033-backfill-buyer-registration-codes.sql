-- Backfills registration_code for the buyers imported in
-- 031-import-canton-fair-buyers.sql, using the value from that
-- person's kept submission row (see 032's own migration for what
-- this column is and isn't). Most buyers had no value in the
-- source column at all -- only these had one. Idempotent: plain
-- UPDATEs, safe to re-run on every future deploy.

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'M'
WHERE u.email = 'abdoulayeabdoulfataou9@gmail.com';

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'X'
WHERE u.email = 'alsabriabdalaziz@gmail.com';

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'X'
WHERE u.email = 'mehmoodnazish775@gmail.com';

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'X'
WHERE u.email = 'abdulrahmanalsabri10@gmail.com';

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'X'
WHERE u.email = 'ahmedrafa890@gmail.com';

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'X'
WHERE u.email = 'aliammar225@gmail.com';

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'X'
WHERE u.email = 'affankhan4951@gmail.com';

UPDATE buyer_profiles bp JOIN users u ON u.id = bp.user_id
SET bp.registration_code = 'X'
WHERE u.email = 'vikavinshelita@gmail.com';
