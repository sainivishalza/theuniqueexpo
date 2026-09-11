-- Packages the existing (self-selected, no real benefits) "partner" user
-- role into an actual program: named tiers with real benefits an admin can
-- edit without a deploy, and an application flow so joining a paid tier is
-- a reviewed request rather than an instant, unchecked role pick at
-- registration -- same "apply, admin approves" shape as subsidy/tour
-- applications elsewhere on the platform, since there's no payment
-- processing in this codebase to gate a tier behind instant checkout.
CREATE TABLE IF NOT EXISTS partner_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  price_label VARCHAR(100) NOT NULL,
  commission_rate VARCHAR(100) NOT NULL,
  benefits JSON NOT NULL,
  badge_tone VARCHAR(20) NOT NULL DEFAULT 'gray',
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO partner_tiers (name, tagline, price_label, commission_rate, benefits, badge_tone, display_order)
SELECT * FROM (SELECT
  'Affiliate Partner' AS name,
  'Free to join -- share your link and start earning' AS tagline,
  'Free' AS price_label,
  '10% commission' AS commission_rate,
  JSON_ARRAY('Personal referral link', 'Real-time referral tracking dashboard', 'Marketing kit (banners, email templates)', 'Monthly payout') AS benefits,
  'gray' AS badge_tone,
  1 AS display_order
UNION ALL SELECT
  'Certified Partner',
  'For travel agencies, relocation firms, and tour operators',
  'Apply to join',
  '15% commission + priority payouts',
  JSON_ARRAY('Everything in Affiliate Partner', 'Featured badge on your exhibitor profile', 'Co-branded landing page for your referral link', 'Priority placement in the exhibitor directory', 'Dedicated partner support'),
  'gold',
  2
UNION ALL SELECT
  'Strategic Partner',
  'By invitation or application -- for high-volume partners',
  'Custom terms',
  'Custom revenue share',
  JSON_ARRAY('Everything in Certified Partner', 'Homepage logo placement', 'Joint marketing campaigns and co-hosted events', 'Dedicated account manager', 'Early access to new exhibitions and tours'),
  'emerald',
  3
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM partner_tiers);

CREATE TABLE IF NOT EXISTS partner_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tier_id INT NOT NULL,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(255) DEFAULT '',
  message TEXT,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tier_id) REFERENCES partner_tiers(id)
);
