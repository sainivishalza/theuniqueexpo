-- Replaces the partner dashboard's 100%-mock referral data
-- (src/lib/partners.ts) with real tracking. A referral row is created
-- when someone registers via a partner's ?ref=<partnerId> link;
-- conversion_status auto-upgrades on real activity (posting an RFQ,
-- submitting an exhibition registration -- see the hooks in
-- src/app/api/rfqs/route.ts and src/app/api/expo-registrations/route.ts).
-- commission has no automatic calculation to drive it from (this
-- codebase has no payment processing at all -- confirmed during the
-- earlier security audit), so it's a plain admin-editable field the
-- admin fills in once an actual payout is arranged.
CREATE TABLE IF NOT EXISTS partner_referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_id INT NOT NULL,
  referred_user_id INT NOT NULL,
  conversion_status ENUM('signed_up', 'booked_booth', 'posted_rfq') NOT NULL DEFAULT 'signed_up',
  commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);
