-- Three independent additions:
-- 1. Direct messaging between a buyer and the exhibitor who quoted them on
--    an RFQ -- one thread per quote, so context (which request, which
--    price) is always attached to the conversation.
-- 2. Saved/favorited exhibitions for buyers and visitors.
-- 3. Reviews on exhibitor profiles (keyed by the profile's stable slug --
--    exhibitor profiles are directory content, not yet tied to individual
--    registered exhibitor accounts).

CREATE TABLE IF NOT EXISTS message_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  rfq_id INT NOT NULL,
  buyer_id INT NOT NULL,
  exhibitor_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_quote_thread (quote_id),
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_name VARCHAR(255) DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exhibition_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  exhibition_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_exhibition (user_id, exhibition_id),
  FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exhibitor_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exhibitor_slug VARCHAR(255) NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(255) DEFAULT '',
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_exhibitor (exhibitor_slug, user_id)
);
