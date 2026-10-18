-- 13 upcoming exhibitions listed on winbtb.com that this site did not have yet.
-- Names, dates, venues, organisers and figures are taken from WinB's own
-- exhibition pages; no booth counts or visitor numbers are made up (where WinB
-- shows none, exhibitors stays 0 and visitors stays empty, and the site hides
-- the stat). Test entries on WinB's list ("Test Exhibition One", "test new form")
-- and events we already list (Global Sources Hong Kong, Anping Wire Mesh,
-- Guzhen Lighting, AIE 2026) are left out.
--
-- Runs once per database: the marker row at the end stops later deploys from
-- re-adding an exhibition an admin has since deleted or renamed. Each row is
-- also skipped if its slug already exists.
CREATE TABLE IF NOT EXISTS applied_data_seeds (
  name VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'winbtb-trade-matching-fair-intelligent-manufacturing-2026', 'WinBTB Global Industry Trade Matching Fair — Intelligent Manufacturing Special', '2026-10-17', '2026-10-19', 'Shangri-La Hotel, Guangzhou (Haizhu District)',
  'Guangzhou', 'China', 'Intelligent Manufacturing', 'A WinBTB trade-matching conference held at the Shangri-La Hotel in Guangzhou during the Canton Fair period, bringing overseas buyers together with suppliers from China''s industrial clusters. This session''s theme is intelligent manufacturing: electronic home appliances, lighting, drones, hardware tools, new energy, vehicles and accessories, and machinery.', '["Theme: intelligent manufacturing", "2,800 m² core venue at the Shangri-La Hotel Guangzhou", "One-on-one negotiation spaces matched to buyers'' procurement needs", "Industry-cluster display and precise procurement-matching areas"]',
  'Конференция WinBTB по подбору торговых партнёров в отеле Shangri-La в Гуанчжоу в период Кантонской ярмарки: зарубежные покупатели встречаются с поставщиками из промышленных кластеров Китая. Тема сессии — интеллектуальное производство: бытовая электроника, освещение, дроны, ручной инструмент и метизы, новая энергетика, транспорт и комплектующие, машиностроение.', '赢龙出海产业展贸对接大会在广交会期间于广州香格里拉酒店举行,为海外采购商与中国产业集群的供应商搭建对接平台。本场主题为智能制造,涵盖电子家电、灯饰、无人机、五金工具、新能源、汽车及配件和机械等行业。', '["Тема: интеллектуальное производство", "Основная площадка 2 800 м² в отеле Shangri-La Гуанчжоу", "Индивидуальные переговоры с учётом закупочных потребностей покупателей", "Зоны промышленных кластеров и точного подбора закупок"]', '["主题:智能制造", "广州香格里拉酒店2,800平方米核心场地", "按采购需求安排一对一洽谈", "产业集群展示区与精准采购对接区"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#7C3AED', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'winbtb-trade-matching-fair-intelligent-manufacturing-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'china-brands-expo-2026', 'China Brands Expo 2026', '2026-10-19', '2026-10-22', 'Hainan International Convention and Exhibition Center',
  'Haikou', 'China', 'Brands & Trade', 'A national-level brand expo at the Hainan International Convention and Exhibition Center in Haikou, themed "Serving Brand Overseas Expansion and Sharing Global Future". It aims to help Chinese brands move from product export to brand export, using the policy environment of the Hainan Free Trade Port. Organised by Brand Union (Shenzhen) Holdings Co., Ltd.', '["Seven thematic pavilions, including cross-border e-commerce brands, fashion life & health and smart home", "Organiser''s target: 200+ overseas purchasing delegations and 1,000+ international buyers", "Organiser''s target: 5,000+ domestic buyers", "Hainan Free Trade Port policy benefits for going global"]',
  'Национальная выставка брендов в Хайнаньском международном конгресс-выставочном центре в Хайкоу под девизом «Служить выходу брендов за рубеж и делиться будущим мира». Цель — помочь китайским брендам перейти от экспорта продукции к экспорту брендов, используя политику порта свободной торговли Хайнань. Организатор — Brand Union (Shenzhen) Holdings Co., Ltd.', '全国性品牌博览会,在海口的海南国际会议展览中心举行,主题为"服务品牌出海 共享全球未来",借助海南自贸港政策,推动中国品牌从"产品出口"走向"品牌出口"。主办方为品牌联盟(深圳)控股有限公司。', '["Семь тематических павильонов: бренды трансграничной электронной торговли, мода, жизнь и здоровье, умный дом и другие", "Цель организатора: 200+ зарубежных закупочных делегаций и 1 000+ международных покупателей", "Цель организатора: 5 000+ покупателей из Китая", "Льготы порта свободной торговли Хайнань для выхода на внешние рынки"]', '["七大主题馆,涵盖跨境电商品牌、时尚生活与健康、智能家居等", "主办方目标:200+境外采购团、1,000+国际采购商", "主办方目标:5,000+国内采购商", "海南自贸港政策红利助力品牌出海"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#0891B2', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'china-brands-expo-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT '100th-china-automobile-parts-fair-2026', 'The 100th China Automobile Parts Fair', '2026-10-20', '2026-10-22', 'No. 1 Rizhao Road, Huaiyin District, Jinan',
  'Jinan', 'China', 'Automotive', 'The 100th edition of the China Automobile Parts Fair, held twice a year since it was founded in 1965, takes place in Jinan, Shandong, the heartland of China''s commercial-vehicle and heavy-truck industry. The focus is traditional auto-parts distribution, new-energy transformation and overseas trade. Organised by the China Machinery Industry Federation, China Machinery International Cooperation Corporation and China Automotive Industry Parts Sales Company.', '["Heavy-duty commercial vehicle main venue", "New Energy and Intelligent Connectivity Zone in Hall 3", "International procurement zone with multilingual one-on-one negotiations", "20–30 events for the 100th-edition celebration, including a heavy-truck parts procurement meeting and a new-energy technology forum"]',
  '100-я Китайская ярмарка автомобильных запчастей — проводится дважды в год с момента основания в 1965 году — состоится в Цзинани (Шаньдун), центре китайской промышленности коммерческого транспорта и тяжёлых грузовиков. Основные темы: традиционная дистрибуция автозапчастей, переход на новую энергетику и внешняя торговля. Организаторы: Китайская федерация машиностроения, China Machinery International Cooperation Corporation и China Automotive Industry Parts Sales Company.', '第100届全国汽车配件交易会创办于1965年,每年举办两届,本届在山东济南举行——这里是中国商用车和重卡产业的核心区域。展会聚焦传统汽配流通、新能源转型与海外贸易。主办单位:中国机械工业联合会、中国机械国际合作股份有限公司、中国汽车工业配件销售总公司。', '["Главная площадка для тяжёлой коммерческой техники", "Зона «Новая энергетика и интеллектуальные подключённые автомобили» в павильоне 3", "Зона международных закупок с многоязычными переговорами один на один", "20–30 мероприятий к 100-му выпуску, включая встречу по закупкам запчастей для тяжёлых грузовиков и форум по технологиям новой энергетики"]', '["重型商用车主展馆", "3号馆新能源与智能网联专区", "国际采购专区,多语种一对一洽谈", "第100届庆典配套20–30场活动,含重卡配件采购对接会、新能源技术论坛"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#DC2626', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = '100th-china-automobile-parts-fair-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT '32nd-china-yiwu-international-commodities-fair-2026', 'The 32nd China Yiwu International Commodities Fair', '2026-10-23', '2026-10-24', 'Yiwu International Expo Center',
  'Yiwu', 'China', 'Consumer Goods', 'The Yiwu Fair, founded in 1995 and UFI-certified, is described by its organisers as China''s largest professional fair for daily consumer goods. The fair itself runs 21–24 October 2026 at the Yiwu International Expo Center, with about 4,500 international-standard booths and 3,000 exhibitors over 110,000 m². Supporting events include a global new-product launch conference, an international small-commodity creative design competition and sourcing and trade negotiation sessions.', '["Founded in 1995; UFI-certified", "About 4,500 standard booths over 110,000 m²", "3,000 exhibitors; around 180,000 professional buyers expected", "Global new-product launch conference and sourcing negotiation sessions"]',
  'Ярмарка в Иу, основанная в 1995 году и сертифицированная UFI, по описанию организаторов — крупнейшая в Китае профессиональная ярмарка товаров повседневного спроса. Сама ярмарка проходит с 21 по 24 октября 2026 года в Международном выставочном центре Иу: около 4 500 стандартных стендов и 3 000 экспонентов на площади 110 000 м². В программе — глобальная конференция по запуску новинок, международный конкурс креативного дизайна малых товаров и переговоры по закупкам и торговле.', '义乌小商品博览会创办于1995年,获UFI认证,主办方称其为中国规模最大的日用消费品专业展会。展会于2026年10月21日至24日在义乌国际博览中心举行,设约4,500个国际标准展位,3,000家参展企业,展览面积11万平方米。同期举办全球新品发布会、国际小商品创意设计大赛及采购洽谈活动。', '["Основана в 1995 году; сертификат UFI", "Около 4 500 стандартных стендов на 110 000 м²", "3 000 экспонентов; ожидается около 180 000 профессиональных покупателей", "Глобальная конференция по запуску новинок и переговоры по закупкам"]', '["创办于1995年,获UFI认证", "约4,500个标准展位,展览面积11万平方米", "3,000家参展企业,预计约18万专业采购商", "全球新品发布会及采购洽谈活动"]',
  3000, '180,000+ expected', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#EAB308', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = '32nd-china-yiwu-international-commodities-fair-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'winbtb-trade-matching-fair-quality-lifestyle-2026', 'WinBTB Global Industry Trade Matching Fair — Quality Lifestyle Special', '2026-10-25', '2026-10-27', 'Shangri-La Hotel, Guangzhou (Haizhu District)',
  'Guangzhou', 'China', 'Home & Lifestyle', 'A WinBTB trade-matching conference held at the Shangri-La Hotel in Guangzhou during the Canton Fair period, bringing overseas buyers together with suppliers from China''s industrial clusters. This session''s theme is quality lifestyle: household goods, kitchenware and tableware, gifts and decorations, and furniture.', '["Theme: quality lifestyle", "2,800 m² core venue at the Shangri-La Hotel Guangzhou", "One-on-one negotiation spaces matched to buyers'' procurement needs", "Industry-cluster display and precise procurement-matching areas"]',
  'Конференция WinBTB по подбору торговых партнёров в отеле Shangri-La в Гуанчжоу в период Кантонской ярмарки: зарубежные покупатели встречаются с поставщиками из промышленных кластеров Китая. Тема сессии — качество жизни: товары для дома, кухонная и столовая посуда, подарки и декор, мебель.', '赢龙出海产业展贸对接大会在广交会期间于广州香格里拉酒店举行,为海外采购商与中国产业集群的供应商搭建对接平台。本场主题为品质生活,涵盖家居用品、厨具餐具、礼品装饰和家具等品类。', '["Тема: качество жизни", "Основная площадка 2 800 м² в отеле Shangri-La Гуанчжоу", "Индивидуальные переговоры с учётом закупочных потребностей покупателей", "Зоны промышленных кластеров и точного подбора закупок"]', '["主题:品质生活", "广州香格里拉酒店2,800平方米核心场地", "按采购需求安排一对一洽谈", "产业集群展示区与精准采购对接区"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#F97316', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'winbtb-trade-matching-fair-quality-lifestyle-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'cangzhou-textile-knitting-garment-expo-2026', 'Cangzhou Textile, Knitting and Garment Expo', '2026-10-26', '2026-10-27', 'Cangdong Economic Development Zone, Cangzhou (venue to be confirmed)',
  'Cangzhou', 'China', 'Textiles & Garments', 'A textile, knitting and garment expo in Cangzhou, Hebei, covering fashion and home textiles. The organisers listed are the China Garment Association and the Hebei Textile and Service Industry Association. The venue and programme are still to be confirmed by the organiser.', '["Fashion and home textiles", "Knitting and garment industry of Cangzhou, Hebei", "Venue and programme to be confirmed by the organiser"]',
  'Выставка текстиля, трикотажа и одежды в Цанчжоу (Хэбэй): модная одежда и домашний текстиль. Указанные организаторы — Китайская ассоциация одежды и Ассоциация текстильной и сервисной отраслей Хэбэя. Место проведения и программа будут уточнены организатором.', '在河北沧州举行的针纺服装展,涵盖时尚服饰与家用纺织品。列明的主办单位为中国服装协会、河北省纺织与服务行业协会。具体场地与日程待主办方确认。', '["Модная одежда и домашний текстиль", "Трикотажная и швейная отрасль Цанчжоу, Хэбэй", "Место и программа будут уточнены организатором"]', '["时尚服饰与家用纺织品", "河北沧州针纺服装产业", "场地与日程待主办方确认"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#B45309', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'cangzhou-textile-knitting-garment-expo-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'linyi-hardware-city-international-sourcing-event-2026', 'Linyi Hardware City International Sourcing Matchmaking Event', '2026-10-28', '2026-10-30', 'Linyi Hardware City, Hedong District',
  'Linyi', 'China', 'Hardware & Tools', 'An international procurement matchmaking event at Linyi Hardware City, Hedong District, Linyi, Shandong, run by the market''s special investment-promotion working group. Overseas hardware buyers are invited to meet local factories and first-level distributors one-to-one and inspect production on site. WinB lists the market at over 2,200 merchants, 12 hardware categories, 1,100+ varieties and 30,000+ product SKUs.', '["International buyer sessions with one-on-one meetings with factories and distributors", "12 hardware categories, 1,100+ varieties, 30,000+ SKUs", "2,200+ merchants; 20+ surrounding hardware-producing villages", "On-site factory visits and sample viewing"]',
  'Международная встреча по подбору закупок на рынке «Линьи Хардвер-Сити» (район Хэдун, Линьи, Шаньдун), организуемая рабочей группой рынка по привлечению инвестиций. Зарубежные покупатели метизов и инструмента приглашаются на личные встречи с местными фабриками и дистрибьюторами первого уровня и на осмотр производства. По данным WinB, на рынке более 2 200 арендаторов, 12 категорий, 1 100+ видов и 30 000+ SKU.', '在山东临沂河东区临沂五金城举行的国际采购对接会,由市场专项招商工作组组织。邀约海外五金采购商与本地工厂、一级经销商一对一面谈并实地验厂看样。据赢龙会展介绍,市场入驻商户2,200余家,覆盖12大五金品类、1,100+个品种、3万+产品SKU。', '["Сессии для международных покупателей: личные встречи с фабриками и дистрибьюторами", "12 категорий, 1 100+ видов, 30 000+ SKU", "2 200+ арендаторов; 20+ окрестных деревень-производителей метизов", "Визиты на фабрики и осмотр образцов на месте"]', '["国际采购商专场,与工厂和经销商一对一面谈", "12大五金品类、1,100+个品种、3万+SKU", "入驻商户2,200余家,带动周边20余个五金生产专业村", "实地验厂与看样"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#78716C', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'linyi-hardware-city-international-sourcing-event-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT '4th-linyi-trade-city-international-sourcing-conference-2026', 'The 4th Linyi Trade City International Sourcing Conference for "Belt and Road" Cooperation', '2026-10-28', '2026-10-30', 'Linyi International Expo Center',
  'Linyi', 'China', 'Trade & Sourcing', 'Co-hosted with the 2026 Linyi Export Commodities Fair at the Linyi International Expo Center: 35,000 m² of exhibition space, 500+ exhibitors, and 2,000+ international buyers from 50+ countries invited alongside 10,000+ domestic buyers. Product categories include building and decoration materials, hardware tools, machinery and equipment, home goods, stationery and gifts, export food, new-energy products and pet supplies. Organised by Linyi Mall International Trade Group and Linyi Trade City Group.', '["35,000 m² exhibition area; 500+ exhibitors", "2,000+ international buyers from 50+ countries invited, plus 10,000+ domestic buyers", "One-on-one business matchmaking zones with interpretation support", "Buyer tours to local markets and factories"]',
  'Проходит совместно с Ярмаркой экспортных товаров Линьи 2026 в Международном выставочном центре Линьи: 35 000 м² выставочной площади, 500+ экспонентов; приглашены более 2 000 иностранных покупателей из 50+ стран и более 10 000 покупателей из Китая. Категории: строительные и отделочные материалы, инструмент, оборудование, товары для дома, канцелярия и подарки, продукты на экспорт, новая энергетика, зоотовары. Организаторы: Linyi Mall International Trade Group и Linyi Trade City Group.', '与2026临沂商城出口商品交易会同期在临沂国际博览中心举行:展览面积3.5万平方米,参展企业500余家;邀请来自50多个国家和地区的2,000余名国际采购商及1万余名国内采购商。品类包括建材装饰、五金工具、机械设备、家居用品、文具礼品、出口食品、新能源产品和宠物用品等。主办单位:临沂商城国际贸易集团、临沂商城集团。', '["35 000 м² выставочной площади; 500+ экспонентов", "Приглашены 2 000+ иностранных покупателей из 50+ стран и 10 000+ покупателей из Китая", "Зоны переговоров один на один с поддержкой переводчиков", "Туры покупателей по местным рынкам и фабрикам"]', '["展览面积3.5万平方米,500余家参展企业", "邀请50多个国家2,000余名国际采购商及1万余名国内采购商", "一对一商务对接区,提供翻译等外贸配套服务", "可安排采购商考察本地市场与工厂"]',
  500, '12,000+ buyers invited', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#D97706', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = '4th-linyi-trade-city-international-sourcing-conference-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'humen-garment-industry-international-conference-2026', '2026 Dongguan Humen Garment Industry International Conference', '2026-10-30', '2026-11-01', 'FU·GO Humen Fumin Mall (Humen Convention & Exhibition Center), Humen Town',
  'Dongguan', 'China', 'Fashion & Lifestyle', 'The core supporting trade event of the 29th Humen International Garment Fair, bringing buyers from Phase 3 of the 140th Canton Fair to Humen, Dongguan, "China Famous Garment & Apparel City". It combines face-to-face talks in a dedicated Humen garment foreign-trade area with themed factory visits for men''s wear, women''s fashion and sport and yoga wear. Hosted by Dongguan Fumin Fashion Digital Industry Investment & Development Co., Ltd. and executed by Guangzhou Winbtb Exhibition Services Co., Ltd.', '["Buyers drawn from the 140th Canton Fair (Phase 3)", "Face-to-face talks with source garment factories", "Three themed factory-tour routes: men''s wear, women''s fashion, sport and yoga wear", "Pre-event matching of buyers'' categories, MOQ and budget with exhibitors"]',
  'Основное сопутствующее торговое мероприятие 29-й Международной швейной ярмарки Хумэнь: покупатели третьего этапа 140-й Кантонской ярмарки приезжают в Хумэнь (Дунгуань), «знаменитый китайский город одежды». Программа сочетает личные переговоры в специальной зоне внешней торговли швейной отрасли Хумэня и тематические визиты на фабрики (мужская одежда, женская мода, спортивная одежда и одежда для йоги). Организатор — Dongguan Fumin Fashion Digital Industry Investment & Development Co., Ltd., проведение — Guangzhou Winbtb Exhibition Services Co., Ltd.', '第29届虎门国际服装交易会的核心配套经贸活动,将第140届广交会第三期的采购商资源引入"中国女装名镇"东莞虎门。活动设虎门服装外贸展区进行面对面洽谈,并安排男装、女装、运动瑜伽装主题工厂参观。主办:东莞富民时尚数字产业投资发展有限公司,承办:广州赢龙会展服务有限公司。', '["Покупатели третьего этапа 140-й Кантонской ярмарки", "Личные переговоры с фабриками-производителями одежды", "Три тематических маршрута: мужская одежда, женская мода, спорт и йога", "Предварительный подбор по категориям, MOQ и бюджету покупателя"]', '["采购商来自第140届广交会第三期", "与服装源头工厂面对面洽谈", "三条主题参观路线:男装、女装、运动瑜伽装", "会前按品类、起订量和预算做供需匹配"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#EC4899', 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'humen-garment-industry-international-conference-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'chaozhou-ceramics-taogangcheng-household-goods-expo-2026', 'Chaozhou Ceramics Industry Exhibition & Taogangcheng Chaoshan Household Goods Exhibition', '2026-10-30', '2026-11-01', 'Chaozhou International Convention and Exhibition Center & Dongshanhu Exhibition Center',
  'Chaozhou', 'China', 'Ceramics & Household Goods', 'Two linked expos in Chaozhou, Guangdong: the Chaozhou Ceramics Industry Expo (30 October – 1 November 2026, Chaozhou International Convention and Exhibition Center) and the 6th Taogangcheng Chaoshan Household Goods Expo (1–3 November 2026, Dongshanhu Exhibition Center). Planned scale is 10,000 m², 500 booths, 300+ exhibitors and 5,000+ new products. Hosted by Guangdong Chaochuang Expo Co., Ltd.', '["\\"Front-exhibition, back-factory\\" model: view samples, then visit source factories nearby", "Chaozhou, known as the \\"Porcelain Capital of China\\"", "Planned: 500 booths, 300+ exhibitors, 5,000+ new products", "Household goods expo runs 1–3 November at the Dongshanhu Exhibition Center"]',
  'Две связанные выставки в Чаочжоу (Гуандун): Выставка керамической промышленности Чаочжоу (30 октября – 1 ноября 2026, Международный конгресс-выставочный центр Чаочжоу) и 6-я выставка товаров для дома Таоганчэн Чаошань (1–3 ноября 2026, выставочный центр Дуншаньху). Планируется 10 000 м², 500 стендов, 300+ экспонентов и 5 000+ новинок. Организатор — Guangdong Chaochuang Expo Co., Ltd.', '在广东潮州举办的两个联动展会:潮州陶瓷产业基地博览会(2026年10月30日至11月1日,潮州国际会展中心)和第6届陶港城潮汕百货外贸展(2026年11月1日至3日,东山湖博览中心)。规划展览面积1万平方米、500个展位、300+家优质展商、5,000+款新品。主办单位:广东潮创会展有限公司。', '["Модель «выставка впереди, фабрика позади»: осмотр образцов и визит на ближайшие фабрики", "Чаочжоу — «фарфоровая столица Китая»", "План: 500 стендов, 300+ экспонентов, 5 000+ новинок", "Выставка товаров для дома — 1–3 ноября в выставочном центре Дуншаньху"]', '["\\"前展后厂\\"模式:看样洽谈后可就近考察源头工厂", "潮州,\\"中国瓷都\\"", "规划500个展位、300+家展商、5,000+款新品", "潮汕百货外贸展11月1日至3日在东山湖博览中心举行"]',
  300, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#7C2D12', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'chaozhou-ceramics-taogangcheng-household-goods-expo-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT 'winbtb-trade-matching-fair-fashion-trends-2026', 'WinBTB Global Industry Trade Matching Fair — Fashion Trends Special', '2026-11-03', '2026-11-05', 'Shangri-La Hotel, Guangzhou (Haizhu District)',
  'Guangzhou', 'China', 'Fashion & Lifestyle', 'A WinBTB trade-matching conference held at the Shangri-La Hotel in Guangzhou during the Canton Fair period, bringing overseas buyers together with suppliers from China''s industrial clusters. This session''s theme is fashion trends: textiles and clothing, footwear and hats, bags, accessories, beauty products, hair accessories, eyewear and smart wearables.', '["Theme: fashion trends", "2,800 m² core venue at the Shangri-La Hotel Guangzhou", "One-on-one negotiation spaces matched to buyers'' procurement needs", "Industry-cluster display and precise procurement-matching areas"]',
  'Конференция WinBTB по подбору торговых партнёров в отеле Shangri-La в Гуанчжоу в период Кантонской ярмарки: зарубежные покупатели встречаются с поставщиками из промышленных кластеров Китая. Тема сессии — модные тренды: текстиль и одежда, обувь и головные уборы, сумки, аксессуары, косметика, украшения для волос, очки и умные носимые устройства.', '赢龙出海产业展贸对接大会在广交会期间于广州香格里拉酒店举行,为海外采购商与中国产业集群的供应商搭建对接平台。本场主题为时尚潮流,汇集纺织服装、鞋帽、箱包、饰品、美妆、发饰、眼镜和智能穿戴等时尚品类。', '["Тема: модные тренды", "Основная площадка 2 800 м² в отеле Shangri-La Гуанчжоу", "Индивидуальные переговоры с учётом закупочных потребностей покупателей", "Зоны промышленных кластеров и точного подбора закупок"]', '["主题:时尚潮流", "广州香格里拉酒店2,800平方米核心场地", "按采购需求安排一对一洽谈", "产业集群展示区与精准采购对接区"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#EC4899', 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'winbtb-trade-matching-fair-fashion-trends-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT '27th-central-china-hunan-agricultural-expo-2026', 'The 27th Central China (Hunan) Agricultural Expo', '2026-11-06', '2026-11-09', 'Changsha International Exhibition Center (No. 118 Guozhan Road)',
  'Changsha', 'China', 'Agriculture', 'Founded in 1999, the Central China (Hunan) Agricultural Expo is described by its organisers as the only four-star comprehensive agricultural brand exhibition authorised by the Ministry of Agriculture and Rural Affairs to carry the "Central China" name. The 27th edition covers about 90,000 m² in 6 halls and a central square, spanning grains and vegetables, livestock and aquatic products, agricultural machinery and supplies, and cold-chain logistics. Hosted by Hongxing Industrial Group Co., Ltd.; run by Hunan Hongxing International Exhibition Co., Ltd.', '["27th edition; founded in 1999", "About 90,000 m² across 6 halls and a central square", "Full agricultural chain from grains and livestock to machinery and cold-chain logistics", "Thematic areas including international agricultural products"]',
  'Выставка сельского хозяйства Центрального Китая (Хунань), основанная в 1999 году, по описанию организаторов — единственная комплексная агробрендовая выставка уровня четырёх звёзд, которой Министерство сельского хозяйства и по делам села разрешило использовать название «Центральный Китай». 27-й выпуск занимает около 90 000 м² (6 павильонов и центральная площадь): зерно и овощи, животноводство и водная продукция, сельхозтехника и ресурсы, холодовая логистика. Организатор — Hongxing Industrial Group Co., Ltd.; проводит Hunan Hongxing International Exhibition Co., Ltd.', '中国中部(湖南)农业博览会创办于1999年,据主办方介绍,是经农业农村部批准使用"中国中部"名称的唯一一个四星级综合性农业品牌展会。第27届展览面积约9万平方米,设6个展馆和中心广场,涵盖粮油蔬菜、畜牧水产、农机农资及冷链物流等。主办:红星实业集团有限公司;承办:湖南红星国际展览有限公司。', '["27-й выпуск; основана в 1999 году", "Около 90 000 м²: 6 павильонов и центральная площадь", "Вся аграрная цепочка — от зерна и животноводства до техники и холодовой логистики", "Тематические зоны, включая международную сельхозпродукцию"]', '["第27届,创办于1999年", "展览面积约9万平方米,6个展馆加中心广场", "覆盖从粮油、畜牧到农机、冷链物流的农业全产业链", "设国际农产品等主题展区"]',
  0, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#65A30D', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = '27th-central-china-hunan-agricultural-expo-2026');

INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights,
  description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image,
  gallery_images, registration_enabled)
SELECT '62nd-artificial-plants-accessories-exhibition-2027', 'The 62nd Artificial Plants and Accessories Exhibition', '2027-03-09', '2027-03-11', 'Nanchang Greenland International Expo Center, Honggutan District',
  'Nanchang', 'China', 'Artificial Plants & Decor', 'The 62nd Trade Fair for Artificial Plants, Garden Floristry and Display Props takes place at the Greenland International Expo Center in Nanchang, 9–11 March 2027. Founded in 1974 and hosted by the China Arts and Crafts Association, it has been staged 61 times before. The fair covers 80,000 m² with 1,000+ exhibitors, and welcomes international purchasers from more than 60 countries.', '["62nd edition; founded in 1974 by the China Arts and Crafts Association", "80,000 m² and 1,000+ exhibitors", "Whole chain: artificial and dried flowers, plants, flower ware, display props, equipment", "One-on-one business matchmaking meetings; buyers from 60+ countries"]',
  '62-я Ярмарка искусственных растений, садовой флористики и декоративного реквизита пройдёт 9–11 марта 2027 года в Международном выставочном центре Greenland в Наньчане. Основана в 1974 году, организатор — Китайская ассоциация народных промыслов; ранее состоялось 61 выпуск. Площадь 80 000 м², более 1 000 экспонентов; приглашены иностранные покупатели из 60+ стран.', '第62届仿真植物、园林花艺及美陈道具交易会将于2027年3月9日至11日在南昌绿地国际博览中心举行。该展会创办于1974年,由中国工艺美术协会主办,已成功举办61届。展览面积8万平方米,参展企业1,000余家,并汇聚来自60多个国家的国际采购商。', '["62-й выпуск; основана в 1974 году Китайской ассоциацией народных промыслов", "80 000 м² и 1 000+ экспонентов", "Вся цепочка: искусственные и сухие цветы, растения, вазоны, декоративный реквизит, оборудование", "Встречи один на один; покупатели из 60+ стран"]', '["第62届,1974年创办,中国工艺美术协会主办", "展览面积8万平方米,1,000余家参展企业", "覆盖仿真花、干花、植物、花器、美陈道具及制造设备全产业链", "一对一商务对接洽谈;采购商来自60多个国家"]',
  1000, '', 'The Unique Expo', 'https://theuniqueexpo.com/en', '#16A34A', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1400&h=700&fit=crop&q=80',
  '[]', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM applied_data_seeds WHERE name = '052-winb-exhibitions')
  AND NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = '62nd-artificial-plants-accessories-exhibition-2027');

INSERT IGNORE INTO applied_data_seeds (name) VALUES ('052-winb-exhibitions');
