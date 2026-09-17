-- Retroactively auto-verifies every buyer document already uploaded but
-- still sitting as "pending review" (setBuyerDocument now defaults new
-- uploads straight to 'verified' -- see buyer-profile-repo.ts -- this
-- catches everything uploaded before that change, including the 150
-- CPHI buyers' documents matched from the client's zip). Only touches rows
-- that actually have a document and are still 'pending'; a document an
-- admin already explicitly rejected is left alone, and re-running this on
-- every future deploy is a no-op once nothing is left in that state.
UPDATE buyer_profiles SET doc_business_license_status = 'verified'
  WHERE doc_business_license IS NOT NULL AND doc_business_license_status = 'pending';
UPDATE buyer_profiles SET doc_business_card_status = 'verified'
  WHERE doc_business_card IS NOT NULL AND doc_business_card_status = 'pending';
UPDATE buyer_profiles SET doc_passport_front_status = 'verified'
  WHERE doc_passport_front IS NOT NULL AND doc_passport_front_status = 'pending';
UPDATE buyer_profiles SET doc_visa_page_status = 'verified'
  WHERE doc_visa_page IS NOT NULL AND doc_visa_page_status = 'pending';
UPDATE buyer_profiles SET doc_canton_fair_card_status = 'verified'
  WHERE doc_canton_fair_card IS NOT NULL AND doc_canton_fair_card_status = 'pending';
UPDATE buyer_profiles SET doc_buyer_photo_status = 'verified'
  WHERE doc_buyer_photo IS NOT NULL AND doc_buyer_photo_status = 'pending';
UPDATE buyer_profiles SET doc_invoice_order_list_status = 'verified'
  WHERE doc_invoice_order_list IS NOT NULL AND doc_invoice_order_list_status = 'pending';
