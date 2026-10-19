-- Attendance points that depend on where the buyer comes from.
--
-- Some exhibitions (the Anping Wire Mesh Fair, for one) reward attendance by the
-- buyer's region: a buyer from Hengshui earns less than one from Shanghai, and
-- everyone else gets the "other regions" rate. An exhibition can have a list of
-- regions; the first whose keywords appear in the buyer's departure city is used,
-- and the row marked is_default is the "everywhere else" rate. An exhibition with
-- no regions keeps paying its single exhibitions.attendance_points.
--
-- Idempotent: the table is created only once, and the Anping rates are written only
-- while that exhibition has no regions yet (an admin's later edits are never undone).
CREATE TABLE IF NOT EXISTS exhibition_point_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exhibition_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  -- Comma or line separated words matched (ignoring case) against the buyer's departure city.
  keywords TEXT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_point_tiers_expo (exhibition_id, sort_order),
  CONSTRAINT chk_point_tier_points CHECK (points >= 0),
  CONSTRAINT fk_point_tier_expo FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
);

-- 26th China Anping International Wire Mesh Fair: attendance incentive for one invited buyer.
INSERT INTO exhibition_point_tiers (exhibition_id, name, keywords, points, sort_order, is_default)
SELECT e.id, 'Hengshui City (Anping County), Hebei, and neighbouring cities',
       'hengshui, anping, baoding, cangzhou, xingtai, shijiazhuang, 衡水, 安平, 保定, 沧州, 邢台, 石家庄', 300, 1, 0
FROM exhibitions e WHERE e.slug = '26th-china-anping-wire-mesh-fair-2026'
  AND NOT EXISTS (SELECT 1 FROM exhibition_point_tiers t WHERE t.exhibition_id = e.id);

INSERT INTO exhibition_point_tiers (exhibition_id, name, keywords, points, sort_order, is_default)
SELECT e.id, 'Other parts of Hebei, Beijing, Tianjin and Shandong',
       'hebei, tangshan, handan, langfang, zhangjiakou, chengde, qinhuangdao, beijing, tianjin, shandong, jinan, qingdao, yantai, weifang, linyi, zibo, 河北, 唐山, 邯郸, 廊坊, 北京, 天津, 山东, 济南, 青岛', 500, 2, 0
FROM exhibitions e WHERE e.slug = '26th-china-anping-wire-mesh-fair-2026'
  AND (SELECT COUNT(*) FROM exhibition_point_tiers t WHERE t.exhibition_id = e.id) = 1;

INSERT INTO exhibition_point_tiers (exhibition_id, name, keywords, points, sort_order, is_default)
SELECT e.id, 'Jiangsu, Zhejiang and Shanghai region',
       'jiangsu, zhejiang, shanghai, nanjing, suzhou, wuxi, changzhou, nantong, xuzhou, hangzhou, ningbo, wenzhou, shaoxing, jiaxing, taizhou, yiwu, jinhua, 江苏, 浙江, 上海, 南京, 苏州, 无锡, 杭州, 宁波, 温州, 义乌', 1200, 3, 0
FROM exhibitions e WHERE e.slug = '26th-china-anping-wire-mesh-fair-2026'
  AND (SELECT COUNT(*) FROM exhibition_point_tiers t WHERE t.exhibition_id = e.id) = 2;

INSERT INTO exhibition_point_tiers (exhibition_id, name, keywords, points, sort_order, is_default)
SELECT e.id, 'Other regions', '', 1500, 4, 1
FROM exhibitions e WHERE e.slug = '26th-china-anping-wire-mesh-fair-2026'
  AND (SELECT COUNT(*) FROM exhibition_point_tiers t WHERE t.exhibition_id = e.id) = 3;
