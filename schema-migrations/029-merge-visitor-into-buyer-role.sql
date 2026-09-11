-- "visitor" is no longer a distinct account role/dashboard -- merged into
-- "buyer" (one signup option, one dashboard, one role everywhere in code).
-- Existing visitor accounts become buyer accounts before the enum itself
-- drops the now-unused value (an ALTER can't leave rows pointing at a value
-- the column no longer allows).
UPDATE users SET role = 'buyer' WHERE role = 'visitor';
ALTER TABLE users MODIFY role ENUM('buyer','exhibitor','partner','admin') DEFAULT 'buyer';
