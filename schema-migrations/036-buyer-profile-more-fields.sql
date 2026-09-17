-- Ten more buyer-profile fields requested directly by the client, matching
-- the existing fixed-column pattern (see 030-buyer-profiles.sql). Every
-- column gets a DEFAULT '' so existing buyer rows backfill automatically
-- with blank values instead of NULL -- no separate data migration needed.
ALTER TABLE buyer_profiles
  ADD COLUMN departure_city VARCHAR(255) NOT NULL DEFAULT '' AFTER contact_person,
  ADD COLUMN attendance_day VARCHAR(255) NOT NULL DEFAULT '' AFTER departure_city,
  ADD COLUMN meeting_or_visiting VARCHAR(50) NOT NULL DEFAULT '' AFTER attendance_day,
  ADD COLUMN passport_name VARCHAR(255) NOT NULL DEFAULT '' AFTER meeting_or_visiting,
  ADD COLUMN gender VARCHAR(50) NOT NULL DEFAULT '' AFTER passport_name,
  ADD COLUMN wechat_id VARCHAR(255) NOT NULL DEFAULT '' AFTER gender,
  ADD COLUMN overseas_company_address VARCHAR(500) NOT NULL DEFAULT '' AFTER wechat_id,
  ADD COLUMN company_field VARCHAR(255) NOT NULL DEFAULT '' AFTER overseas_company_address,
  ADD COLUMN job_title VARCHAR(255) NOT NULL DEFAULT '' AFTER company_field,
  ADD COLUMN contact_email VARCHAR(255) NOT NULL DEFAULT '' AFTER job_title;
