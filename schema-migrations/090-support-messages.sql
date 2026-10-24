-- "Ask our team": a buyer writes to the staff inside the site, staff answer from the admin. One thread per question.
-- Idempotent.
CREATE TABLE IF NOT EXISTS support_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic ENUM('registration','tickets','points','documents','other') NOT NULL DEFAULT 'other',
  subject VARCHAR(150) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  -- Whose turn it is: 'staff' = the buyer wrote last, 'buyer' = the team answered.
  waiting_on ENUM('staff','buyer') NOT NULL DEFAULT 'staff',
  created_at DATETIME(6) NOT NULL,
  -- Microseconds: an answer in the same second as the buyer's last visit must still count as new.
  last_message_at DATETIME(6) NOT NULL,
  -- The last time the buyer opened the thread: an answer newer than this is "unread".
  buyer_read_at DATETIME(6) NULL,
  KEY idx_support_queue (status, waiting_on, last_message_at),
  KEY idx_support_user (user_id, last_message_at),
  CONSTRAINT fk_support_thread_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  -- The buyer, or the admin who answered.
  sender_id INT NOT NULL,
  from_staff TINYINT(1) NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  KEY idx_support_messages_thread (thread_id, id),
  CONSTRAINT fk_support_message_thread FOREIGN KEY (thread_id) REFERENCES support_threads(id) ON DELETE CASCADE
);

-- When the staff were last e-mailed about this thread: one e-mail per half hour per thread, and it starts again after an answer.
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS staff_notified_at DATETIME(6) NULL;
