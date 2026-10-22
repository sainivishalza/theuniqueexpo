-- Buyer form settings: lets an admin add, rename, reorder and hide the documents a buyer uploads,
-- and add extra information fields, without a developer.
--
--   * buyer_form_items        the list itself (one row per document / extra field), with its
--                             name in English, Russian and Chinese. The eight built-in documents
--                             are seeded here; their uploaded files stay in the buyer_profiles
--                             columns they always lived in -- nothing is moved.
--   * buyer_custom_documents  files for documents an admin added.
--   * buyer_custom_values     answers to extra information fields an admin added.
--
-- Idempotent: every statement can run again on a later deploy. The seed uses INSERT IGNORE on the
-- unique key, so a name or order an admin changed is never put back.

CREATE TABLE IF NOT EXISTS buyer_form_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  kind ENUM('document','field') NOT NULL,
  builtin TINYINT(1) NOT NULL DEFAULT 0,
  label_en VARCHAR(120) NOT NULL,
  label_ru VARCHAR(120) NOT NULL DEFAULT '',
  label_zh VARCHAR(120) NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  -- Hidden items are not shown or exported; what buyers already gave is kept.
  active TINYINT(1) NOT NULL DEFAULT 1,
  -- Documents only: a required document must be uploaded and verified for a buyer to count as Verified.
  required TINYINT(1) NOT NULL DEFAULT 1,
  -- Extra information fields only.
  field_type ENUM('text','longtext','date','choice') NULL,
  -- Choices, one per line, in the same order in every language.
  options_en TEXT NULL,
  options_ru TEXT NULL,
  options_zh TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_buyer_form_item_key (item_key),
  KEY idx_buyer_form_kind_position (kind, position)
);

INSERT IGNORE INTO buyer_form_items (item_key, kind, builtin, label_en, label_ru, label_zh, position, active, required) VALUES
  ('passportFront',    'document', 1, 'Passport Front Page',       'Разворот паспорта',              '护照首页',     10, 1, 1),
  ('visaPage',         'document', 1, 'Visa Page',                 'Страница визы',                  '签证页',       20, 1, 1),
  ('businessLicense',  'document', 1, 'Business License',          'Лицензия компании',              '营业执照',     30, 1, 1),
  ('businessCard',     'document', 1, 'Business Card',             'Визитная карточка',              '名片',         40, 1, 1),
  ('buyerPhoto',       'document', 1, 'Buyer Photo',               'Фото покупателя',                '买家照片',     50, 1, 1),
  ('cantonFairCard',   'document', 1, 'Canton Fair Card',          'Карта Кантонской ярмарки',       '广交会证件',   60, 1, 1),
  ('invoiceOrderList', 'document', 1, 'Invoice / Order List',      'Счёт / список заказа',           '发票 / 订单清单', 70, 1, 1),
  ('latestEntryStamp', 'document', 1, 'Latest Entry Stamp Photo',  'Фото последнего штампа въезда',  '最近入境章照片', 80, 1, 1);

CREATE TABLE IF NOT EXISTS buyer_custom_documents (
  user_id INT NOT NULL,
  item_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data MEDIUMTEXT NOT NULL,
  status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  note VARCHAR(500) NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_key),
  KEY idx_custom_docs_item (item_key),
  CONSTRAINT fk_custom_doc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buyer_custom_values (
  user_id INT NOT NULL,
  item_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, item_key),
  KEY idx_custom_values_item (item_key),
  CONSTRAINT fk_custom_value_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
