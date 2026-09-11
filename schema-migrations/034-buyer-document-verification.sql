-- Lets admins mark each of a buyer's 6 uploaded documents as verified or
-- rejected (with a short reason), instead of only being able to see
-- "uploaded or not" as before. A buyer re-uploading a document resets its
-- status back to 'pending' (see setBuyerDocument in buyer-profile-repo.ts)
-- since new file content always needs a fresh review.
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_business_license_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_business_license_note VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_business_card_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_business_card_note VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_passport_front_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_passport_front_note VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_visa_page_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_visa_page_note VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_canton_fair_card_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_canton_fair_card_note VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_buyer_photo_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS doc_buyer_photo_note VARCHAR(500) NOT NULL DEFAULT '';
