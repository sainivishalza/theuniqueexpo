-- Page speed as real visitors experience it: one row per day, kind of page, device and measure, counting how many page
-- views were good / needed work / poor (Google's thresholds) plus the sum, so an average can be shown. Idempotent.
CREATE TABLE IF NOT EXISTS web_vitals_daily (
  day DATE NOT NULL,
  page VARCHAR(40) NOT NULL,
  device VARCHAR(7) NOT NULL,
  metric VARCHAR(4) NOT NULL,
  good INT NOT NULL DEFAULT 0,
  needs INT NOT NULL DEFAULT 0,
  poor INT NOT NULL DEFAULT 0,
  total_value DOUBLE NOT NULL DEFAULT 0,
  PRIMARY KEY (day, page, device, metric)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
