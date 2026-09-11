-- One-time bulk registration of the 37 buyer accounts from the
-- Canton Fair customer-registration spreadsheet the site owner
-- provided directly (in preference to using the /admin/users/bulk
-- UI). Idempotent like every other data-mutation migration here
-- (021-rotate-admin-password.sql is the established pattern): the
-- user INSERT is guarded by NOT EXISTS so re-running this on every
-- future deploy never creates a duplicate account for an email that
-- already exists (including one of these buyers registering
-- themselves in the meantime), and the buyer_profiles upsert uses
-- ON DUPLICATE KEY UPDATE for the same reason. Each password is the
-- bcrypt hash (cost 12, matching src/lib/auth-server.ts's own
-- createUserAccount) of that buyer's phone number, exactly as given
-- in the source spreadsheet.

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'adamou abdou mouhamadoul hafizou', 'souleymanesoumana291@gmail.com', '$2b$12$G1.6LCRp3do9J60fVZZ2JeKYEXF.IsALd3dWMTPVUFvFIVVVQrHlm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'souleymanesoumana291@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'ABD', 'niger', '13cp16696', '100mille', 'Multiple Choices: (•智能耳机 Smart headphones)', 'Non', 'Mubarak'
FROM users WHERE email = 'souleymanesoumana291@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ayegba Esther', 'estherpretty125@gmail.com', '$2b$12$1Lt6BmaxnwRn8YpkScqPTOR7.Zf3TKva1izIgpbpkcP33v7jRlJU6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'estherpretty125@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Aprilgoya', 'Nigeria', 'B50615505', '2000$', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, ·智能家电 Smart home appliances)', 'Am ok with those one i selected', 'Mubarak'
FROM users WHERE email = 'estherpretty125@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Abdoulaye souley fataou', 'abdoulayeabdoulfataou9@gmail.com', '$2b$12$8G8QjfrOFJBqyj9joOyL2Ov6eoF98fIOvv9WA/34zD.gyxmxzYGNq', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'abdoulayeabdoulfataou9@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Lux mailarey', 'Nigerien', '12PC11769', 'Rmb', 'Multiple Choices: (•智能手表 Smartwatches)', 'Wach', 'Mubarak'
FROM users WHERE email = 'abdoulayeabdoulfataou9@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Usman Muhammad zain', 'zainusman69@gmail.com', '$2b$12$dIy4DyMcvGQMpn74SYJj3./vu49zsSc1JZtfoWFZOQZIopne9vKpa', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'zainusman69@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Khareedari Pvt LTD', 'Pakistan', 'DP2854272', '100000', '•智能耳机 Smart headphones，•智能眼镜 Smart glasses，•智能手表 Smartwatches，•AI翻译机 Al translation device，·智能家电 Smart home appliances，·健身设备 Fitness equipment，·智能光伏 Smart photovoltaies，• 船舶 Ships，•无人机 Drones，•机器人 Robots', 'Yes I want to buy these items', 'Mubarak'
FROM users WHERE email = 'zainusman69@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'ALSABRI ABDULAZIZ MOHAMMED THABIT ABDULLAH', 'alsabriabdalaziz@gmail.com', '$2b$12$DjOe09e7DTzWQowGhVmQGeH8oeBZGaqyb5cfErgZ68AlylVte/eDq', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'alsabriabdalaziz@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'ALQABOOL', 'YEMEN', '15788200', '0', 'Multiple Choices: (•智能耳机 Smart headphones, •智能手表 Smartwatches, •无人机 Drones, •机器人 Robots)', 'Same thing like what like chose', 'Mubarak'
FROM users WHERE email = 'alsabriabdalaziz@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Nizish Mehmood', 'mehmoodnazish775@gmail.com', '$2b$12$bK5tpoquzJDxwjCMHXBv7uPycTN9LBZZuoxcpbyaAAaMYq6GtiGtK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'mehmoodnazish775@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Stitch soul', 'Pakistan', 'BC0169813', '10000', 'Multiple Choices: (•智能耳机 Smart headphones, •智能手表 Smartwatches, ·智能光伏 Smart photovoltaies, ·新能源汽车 New energy vehicles, •无人机 Drones)', 'Cloths', 'Mubarak'
FROM users WHERE email = 'mehmoodnazish775@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'ABDULRAHMAN MOHAMMED THABIT ABDULLAH ALSABRI', 'abdulrahmanalsabri10@gmail.com', '$2b$12$GT65hexKrgNPHUr7utna9OVDHFr.eyCTcEnEoyByaUZc6qGU08z7e', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'abdulrahmanalsabri10@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Alqabool', 'Yemen', '15780574', '850000', 'Multiple Choices: (•智能眼镜 Smart glasses, •智能手表 Smartwatches, ·智能家电 Smart home appliances, ·智能光伏 Smart photovoltaies, •无人机 Drones, •机器人 Robots, •人工智能 Al Tech)', '智能电子产品相关的一切', 'Mubarak'
FROM users WHERE email = 'abdulrahmanalsabri10@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'ALSAEITI AHMED RAFIA HAMAD', 'ahmedrafa890@gmail.com', '$2b$12$r5Dx9S2A1GsJDuOnSa8xs.76wCsmcNs/Uf/gq1X23WyR3oEHEwxq2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ahmedrafa890@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Mediterranean company', '利比亚', 'AD109739', '200000', 'Multiple Choices: (1、Silk Road Pavilion, •智能眼镜 Smart glasses, •智能手表 Smartwatches, •AI翻译机 Al translation device, •人工智能 Al Tech)', 'Smart glass', 'Mubarak'
FROM users WHERE email = 'ahmedrafa890@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'AMMAR ALI', 'aliammar225@gmail.com', '$2b$12$dXfXMA9chbemNv09fZqylu8DX3iZKhs.qPb3BtEnByF1bhd0fH8ua', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aliammar225@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'International trade house', 'PAKISTAN', 'EN1229893', '1000000', 'Multiple Choices: (1、Silk Road Pavilion, •智能眼镜 Smart glasses)', 'Smartwatches', 'Mubarak'
FROM users WHERE email = 'aliammar225@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Affan Khan', 'affankhan4951@gmail.com', '$2b$12$jXtxHuLksLOrHZHrjn6OpO6IeAP68h.MGo2ZXSbtP7lcpDJfWtkVy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'affankhan4951@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Waseem & Sons', 'Pakistan', 'MX4128474', '20000', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, •AI翻译机 Al translation device, •无人机 Drones, •人工智能 Al Tech)', 'No other', 'Mubarak'
FROM users WHERE email = 'affankhan4951@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Vinshel Viktoriya', 'vikavinshelita@gmail.com', '$2b$12$AN4WZSC/DHGLrVLYL60HMu8Uau/H7L2DiweykFfYDhRdG2Ynpz9uG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vikavinshelita@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Waseem and sons', 'Kazakhstan', 'N16890761', '20000', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •AI翻译机 Al translation device, •无人机 Drones, •人工智能 Al Tech)', 'No other', 'Mubarak'
FROM users WHERE email = 'vikavinshelita@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Muhammad Usman Riaz', 'nust.usman@gmail.com', '$2b$12$IGaF4CgSCfEpjdUNNGvme.Pwar0i1NH51/YGA1Zx5K/W2obCNnuSK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'nust.usman@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Butt stationers', 'Pakistan', 'ED9919732', '50k aud', 'Multiple Choices: (·健身设备 Fitness equipment)', 'No', 'Mubarak'
FROM users WHERE email = 'nust.usman@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'ABDUL BASIT', 'abdulbasitmangi@gmail.com', '$2b$12$w7baIyBVb53AQAm/sXgz5.XbhuAZlpjvFh3YRmYAS1p9/S.ytAxkm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'abdulbasitmangi@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'SUNRISE & CO', 'Pakistan', 'ZN9996112', '200000', 'Multiple Choices: (•智能眼镜 Smart glasses, •智能手表 Smartwatches, •AI翻译机 Al translation device, ·智能家电 Smart home appliances, ·新能源汽车 New energy vehicles, •无人机 Drones)', 'No', 'Mubarak'
FROM users WHERE email = 'abdulbasitmangi@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'MUGISHA JEAN LUC', 'mugishajeanluc250@gmail.com', '$2b$12$W.u4Ggu34B4Nue2yrgNrQOq/J.mFlqwEiF1V6mhpc702eipK/ugky', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'mugishajeanluc250@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'White front hardware ltd', 'Rwanda', 'PC831226', '5', 'Multiple Choices: (•智能耳机 Smart headphones, •AI翻译机 Al translation device, ·新能源汽车 New energy vehicles, •机器人 Robots)', 'Smart glasses, AI translation devices, smart watches, drones, AI cameras, smart home devices, robots, and other AI consumer electronics.', 'Mubarak'
FROM users WHERE email = 'mugishajeanluc250@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Waqar Ali Shah', 'wali09043@gmail.com', '$2b$12$nEoxUmBJl18eWmxXHac9EuYMxPgmiyXs5zEtnf8Pm7jYVBrjYBMe.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'wali09043@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'ChemicalTechno', 'Pakistan', 'SM5159172', '3000', 'Multiple Choices: (•智能眼镜 Smart glasses, •无人机 Drones)', 'Nill', 'Mubarak'
FROM users WHERE email = 'wali09043@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'NGENZI JEAN CLAUDE', 'ngenzi125@gmail.com', '$2b$12$bmHbTp15gC2mZmiklYn67eDC0i.lRdWaj6MXJVuKzT3xEmGuX8iQW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ngenzi125@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Jinhua Ltd.', 'Rwanda', 'PC640768', '5k usd', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, ·健身设备 Fitness equipment)', 'Jewels 💎', 'Mubarak'
FROM users WHERE email = 'ngenzi125@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ndorimana Elyse', 'ndolyzee720@gmail.com', '$2b$12$HCU0D.UvVaHN74iwRCes7eJwavt1joQQv7YlJjvNw6vP6ikVwoiF6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ndolyzee720@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'NES ltd( Ndolyzee electrical service ltd)', 'Rwanda', 'PC912944', '2000', '·智能家电 Smart home appliances，•智能手表 Smartwatches，•无人机 Drones，•机器人 Robots，·智能光伏 Smart photovoltaies', 'Enough', 'Mubarak'
FROM users WHERE email = 'ndolyzee720@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'jiddou jeddou', 'jiddoujeddou@gmail.com', '$2b$12$DarTRJAwX4VW6F5HMZOZFe5ptKJ4k7kzFh9QED5eYE3MxEUmTW8Xa', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'jiddoujeddou@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Sahil', 'Mauritania', 'B02865286', '20000000元', 'Multiple Choices: (1、Silk Road Pavilion, •智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, •AI翻译机 Al translation device, ·智能家电 Smart home appliances, ·新能源汽车 New energy vehicles)', 'Non', 'Mubarak'
FROM users WHERE email = 'jiddoujeddou@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Shahid Ali', 'shahid.ali-1990@outlook.com', '$2b$12$bTwK5yKpdMOBriLsZdubbuNTXzuHYmfifTQMSFndwLBNM.cgLMPXK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'shahid.ali-1990@outlook.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Ali .com', 'Pakistan', 'KG1815523', '1000000', 'Multiple Choices: (1、Silk Road Pavilion, •智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, • 船舶 Ships)', 'I need it', 'Mubarak'
FROM users WHERE email = 'shahid.ali-1990@outlook.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Abu Kathiany', 'abura@abuengineering.com', '$2b$12$iYspt.adz3jqJHjmPjazeOp2jXB15uEZFhqC1kBdnDogEtWcEaHb6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'abura@abuengineering.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Abu Engineering Co Ltd', 'Kenyan', 'AK1158192', '500000', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, ·智能家电 Smart home appliances, ·智能光伏 Smart photovoltaies, •人工智能 Al Tech)', 'Smart home appliances', 'Mubarak'
FROM users WHERE email = 'abura@abuengineering.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Uwase Esther Henriette', 'estherhenrietteuwase@gmail.com', '$2b$12$RQWEaeKPigj7gQaLSxDjYuf9.3xTGXY4vUP5bpBIrWQ6LTygl4rFq', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'estherhenrietteuwase@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Rolex', 'Rwandan', 'PC817053', '3,400,000RWF', 'Multiple Choices: (•智能手表 Smartwatches, ·健身设备 Fitness equipment)', 'To visit other companies to view their products', 'Mubarak'
FROM users WHERE email = 'estherhenrietteuwase@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Nazifi Ahmad hussain', 'nazeefee204@gmail.com', '$2b$12$bxgG2l8.Y2aEFsmVeSK7JumyLLna1ASCQacgN96BhhooouSUrL9Rq', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'nazeefee204@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'N A G', 'Niger', '12PC61295', 'RMB', 'Multiple Choices: (•智能手表 Smartwatches)', 'Wach', 'Mubarak'
FROM users WHERE email = 'nazeefee204@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Asmaa Shaban Abden Morsi', 'asmaaabdin825@gmail.com', '$2b$12$1rG.ynnihoI6OHGi/ELRNuN0rYO67TX6ftXyn9jaEzY08S65uCfJe', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'asmaaabdin825@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Obied', 'Egypt', 'A35462681', '300000', 'Multiple Choices: (•智能眼镜 Smart glasses, •智能手表 Smartwatches, •无人机 Drones, •机器人 Robots)', 'No', 'Mubarak'
FROM users WHERE email = 'asmaaabdin825@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Siisi Osiban Nyampong', '1801820180@qq.com', '$2b$12$7c7ok4LJN1usNs13rwYnh.qLwmUxbRtb3tPAErW1Rg1JnuUAjvKoy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '1801820180@qq.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Agro-Minster', 'Ghana', 'G3175412', '$26 million', '•智能耳机 Smart headphones，•AI翻译机 Al translation device，·健身设备 Fitness equipment，• 船舶 Ships，·新能源汽车 New energy vehicles，•无人机 Drones', 'Smart home appliances', 'Mubarak'
FROM users WHERE email = '1801820180@qq.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'DEWAN MD RASEL', 'dewan6379@gmail.com', '$2b$12$8q.CU6hmGXGUbw2WF08cYum7lM1.feLOSD97hGiZNPwWyS8J8bj9e', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'dewan6379@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Self business', 'Bangladesh', 'A15480411', 'N/A', 'Multiple Choices: (·健身设备 Fitness equipment, ·新能源汽车 New energy vehicles)', 'No', 'Mubarak'
FROM users WHERE email = 'dewan6379@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Faustin AHIRWE', 'faustinahirwe@gmail.com', '$2b$12$tusI8C5lkVwB6WOBqsjTbeHnGSYuyczSm5InsB2eZNz1WyvBCRgPm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'faustinahirwe@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Nzeli ltd', 'Rwandan', 'PC912127', '8500$', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •AI翻译机 Al translation device, ·智能家电 Smart home appliances)', 'There is nothing more at this time', 'Mubarak'
FROM users WHERE email = 'faustinahirwe@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Twagirumukiza deconing', 'irumvaibra@gmail.com', '$2b$12$vs.hVBDlm96I9sobl68hf.lYbUbBIH55LrUo166QDeTdGWpnPX7KK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'irumvaibra@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Jinhua hanji trading co .,Ltd', 'Rwanda', 'PC676923', '200000', 'Multiple Choices: (•智能手表 Smartwatches, ·健身设备 Fitness equipment, 2. Smart Mobility Pavilion, ·智能光伏 Smart photovoltaies, • 船舶 Ships, ·新能源汽车 New energy vehicles, •无人机 Drones)', 'Machine', 'Mubarak'
FROM users WHERE email = 'irumvaibra@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Alfakhar', 'drarman503@gmail.com', '$2b$12$z1TSOyIQEi29pWg2sbb7NuzLSoAjdZWejuluRlxJ0ngcFv.BL.hgK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'drarman503@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Decor 8', 'Pakistan', 'GX5151292', '80 million USD', '1、Silk Road Pavilion，•智能耳机 Smart headphones，•智能眼镜 Smart glasses，•智能手表 Smartwatches，•AI翻译机 Al translation device，·智能家电 Smart home appliances，·健身设备 Fitness equipment，2. Smart Mobility Pavilion，·智能光伏 Smart photovoltaies，• 船舶 Ships，·新能源汽车 New energy vehicles，•无人机 Drones，•机器人 Robots，•人工智能 Al Tech', 'I already selected all', 'Mubarak'
FROM users WHERE email = 'drarman503@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'AMIN MD ASRAFUL', 'asrafulamin816@gmail.com', '$2b$12$B89HvmpPMzolp5NZ8CFuBOKXRPNDBt3VUYYIs3/A4hwi9wn0n.oMy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'asrafulamin816@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'A& H Trade', 'BANGLADESHI', 'A11662370', '100,000,000,000$', '•智能耳机 Smart headphones，•智能眼镜 Smart glasses，•智能手表 Smartwatches，•AI翻译机 Al translation device，·智能家电 Smart home appliances，·智能光伏 Smart photovoltaies', 'Smart Home Appliances', 'Mubarak'
FROM users WHERE email = 'asrafulamin816@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Roy suranjit chandra', 'suranjitroy64@gmail.com', '$2b$12$vzXpstkYhSsoDGv5fOtX3O8v.ldRLGHywY7NNnNRI1fEQ4Ze6SSne', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'suranjitroy64@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'International endeavour limited', 'Bangladesh', 'A13017854', '2000000', '1、Silk Road Pavilion，•智能耳机 Smart headphones，•智能眼镜 Smart glasses，•智能手表 Smartwatches，•AI翻译机 Al translation device，·智能光伏 Smart photovoltaies，•无人机 Drones，•机器人 Robots，•人工智能 Al Tech', 'No', 'Mubarak'
FROM users WHERE email = 'suranjitroy64@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'NDIZEYE Jean Aime', 'jeanaimendizeye@gmail.com', '$2b$12$G5wIvtUf9vK5rfpBxnmmzOWbaaym3bJqUR/h7/TC56EW2eONzl2MW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'jeanaimendizeye@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'ABG Ltd', 'Rwandan', 'PC912844', '3000$', '•智能手表 Smartwatches，•机器人 Robots，•人工智能 Al Tech', 'Enough', 'Mubarak'
FROM users WHERE email = 'jeanaimendizeye@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'De La Chance MASENGESHO', 'masengeshodelachance6@gmail.com', '$2b$12$Sau9WGEYJFdUw5NhiVkWoOUJ8SQ3mw4gqNjaOD.vinmKwva52PPse', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'masengeshodelachance6@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Student', 'RWANDA', 'PC913667', '500', '•智能眼镜 Smart glasses，•智能手表 Smartwatches，•AI翻译机 Al translation device，·智能家电 Smart home appliances，•人工智能 Al Tech，•智能耳机 Smart headphones', 'Smart devices', 'Mubarak'
FROM users WHERE email = 'masengeshodelachance6@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ismail Muhammad Anwar', 'anwaar707@gmail.com', '$2b$12$lN4EESqGVbma2Gk24WPMwOHryy2pxlhgKKNE1YpEndbRalV.IM0ze', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'anwaar707@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Noor', 'Pakistani', 'DG1852992', '200000000', '•智能耳机 Smart headphones，•智能眼镜 Smart glasses，•智能手表 Smartwatches，•AI翻译机 Al translation device，•无人机 Drones', 'Sports devices', 'Mubarak'
FROM users WHERE email = 'anwaar707@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Zeshan Muhammad', 'mzeshanraj1234@gmail.com', '$2b$12$0DU4YPr1GA4I3CUGB1DjTOLZqsKwdwUGlY6RP6XlT4UuBxfcSU9zC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'mzeshanraj1234@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Toyish Land', 'Pakistani', 'BR5840452', '13 Million', '•智能耳机 Smart headphones，•智能手表 Smartwatches，•无人机 Drones，•智能眼镜 Smart glasses', 'No', 'Mubarak'
FROM users WHERE email = 'mzeshanraj1234@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Benti Teha Romanu', 'teharomanu@gmail.com', '$2b$12$SOyJ1/RX.pPU7mDianRdxOk0bjxjhRrHh/i2Wp/x7TbU5ty/aXt6a', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'teharomanu@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'Electronic company', 'Ethiopia', 'EP7291715', '5,000,000USD', '1、Silk Road Pavilion，•智能耳机 Smart headphones，•智能眼镜 Smart glasses，•智能手表 Smartwatches，•AI翻译机 Al translation device，·智能家电 Smart home appliances，·健身设备 Fitness equipment，·智能光伏 Smart photovoltaies，• 船舶 Ships，·新能源汽车 New energy vehicles，•无人机 Drones，•机器人 Robots，•人工智能 Al Tech', 'Agricultural machinery', 'Mubarak'
FROM users WHERE email = 'teharomanu@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Muhammad Hamza Zahoor', 'wantedhamza95@gmail.com', '$2b$12$bXwG1U.ks3vZzGxyrwK/2eCdDEVjp49dJfg7FCIai0NBMZzyXRSuW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'wantedhamza95@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'The muhandis', 'Pakistan', 'LB5120162', '560000', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, •无人机 Drones, •机器人 Robots, •人工智能 Al Tech)', 'No', 'Mubarak'
FROM users WHERE email = 'wantedhamza95@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Imran Ali Soomro', 'isoomro179@gmail.com', '$2b$12$EHlSwwAaIliob.CgbekCMuKt6UOVwlNjok13a2kz8V6lxYjGSpcw.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'isoomro179@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
SELECT id, 'HaptiCare', 'Pakistani', 'CN5229781', '1000-5000', 'Multiple Choices: (•智能耳机 Smart headphones, •智能眼镜 Smart glasses, •智能手表 Smartwatches, •AI翻译机 Al translation device, ·智能家电 Smart home appliances, •无人机 Drones, •人工智能 Al Tech)', 'Smart gadgets', 'Mubarak'
FROM users WHERE email = 'isoomro179@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  nationality = VALUES(nationality),
  passport_number = VALUES(passport_number),
  annual_turnover = VALUES(annual_turnover),
  purchase_intention = VALUES(purchase_intention),
  other_purchase_intention = VALUES(other_purchase_intention),
  contact_person = VALUES(contact_person);
