-- Registration lifecycle after the sign-up form: review -> confirm attendance
-- -> check-in/out at the venue -> feedback. Until now a registration could only
-- be pending / approved / rejected.
--
--   pending    submitted, waiting for the organiser (buyer can edit or cancel)
--   approved   organiser accepted; buyer must confirm attendance by confirm_by
--   confirmed  buyer confirmed (optional arrival date / ticket)
--   attended   checked in at the venue by scanning the exhibition QR code
--   rejected   organiser declined
--   cancelled  buyer cancelled (they can register again)
--   absent     confirmed but never checked in (set by the organiser)
--
-- "expired" (approved but confirm_by passed) is worked out when read, not stored.
-- Every time below is UTC; confirm_by is a plain date (valid through that day).
ALTER TABLE expo_registrations
  MODIFY status ENUM('pending','approved','confirmed','attended','rejected','cancelled','absent') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS confirm_by DATE NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS arrival_date DATE NULL,
  ADD COLUMN IF NOT EXISTS arrival_note VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS doc_ticket LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS checked_in_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS checked_out_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS feedback_rating TINYINT NULL,
  ADD COLUMN IF NOT EXISTS feedback_comment TEXT NULL,
  ADD COLUMN IF NOT EXISTS feedback_at DATETIME NULL;

-- Registrations that were already approved before this change keep their
-- approval date from the sign-up date, so "approved on" is never blank.
UPDATE expo_registrations SET approved_at = created_at WHERE status = 'approved' AND approved_at IS NULL;
