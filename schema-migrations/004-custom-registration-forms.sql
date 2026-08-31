-- Per-exhibition on/off toggle and custom registration form builder.
-- When registration_form_schema is NULL, the exhibition uses the original
-- fixed Buyer/Visitor form. When set, it's a JSON array of field definitions
-- and the registration page renders entirely from that schema instead.
ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS registration_form_schema JSON DEFAULT NULL;

-- Registrations against a custom form store their answers here instead of
-- the fixed columns, plus a snapshot of the schema they were answered
-- against so admin's view stays accurate even if the form is edited later.
ALTER TABLE expo_registrations
  ADD COLUMN IF NOT EXISTS custom_answers JSON DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_schema_snapshot JSON DEFAULT NULL;

-- The fixed-form columns are no longer always required once custom forms
-- exist -- a custom-form registration only fills custom_answers.
ALTER TABLE expo_registrations
  MODIFY registration_type ENUM('buyer','visitor') NULL,
  MODIFY gender ENUM('male','female') NULL,
  MODIFY full_name VARCHAR(255) NULL,
  MODIFY nationality VARCHAR(100) NULL,
  MODIFY passport_number VARCHAR(100) NULL,
  MODIFY company_name VARCHAR(255) NULL,
  MODIFY phone VARCHAR(50) NULL,
  MODIFY email VARCHAR(255) NULL,
  MODIFY company_type VARCHAR(100) NULL,
  MODIFY company_scale VARCHAR(50) NULL,
  MODIFY purpose_of_visit VARCHAR(100) NULL,
  MODIFY info_source VARCHAR(100) NULL,
  MODIFY doc_passport_front LONGTEXT NULL,
  MODIFY doc_business_card LONGTEXT NULL,
  MODIFY doc_visa_page LONGTEXT NULL,
  MODIFY doc_business_license LONGTEXT NULL;
