-- One-time bulk registration of the 150 buyer accounts from the CPHI &
-- PMEC Shenzhen 2026 registration spreadsheet the site owner provided
-- directly, following the same idempotent pattern as
-- 031-import-canton-fair-buyers.sql. The spreadsheet has no phone
-- column, so each account's initial password is that buyer's own
-- WeChat ID (also stored as wechat_id) -- the bcrypt hash below (cost
-- 12, matching src/lib/auth-server.ts's own createUserAccount) is of
-- that value. Two pairs of rows share one email address (evidently a
-- shared inbox between two real, distinct registrants); the second
-- person in each pair gets a '+dup2' suffix on their *login* email only
-- so both accounts can exist -- contact_email keeps the original
-- address exactly as given. The spreadsheet only lists each buyer's
-- document *filenames*, not the photos themselves, so those go into
-- buyer_pending_documents (037) to be matched against the photos once
-- a zip of them is provided, rather than into buyer_profiles directly.


INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Leiba Volodymyr', 'Rossi_46@bigmir.net', '$2b$12$JH3KUGZ.SwEee5ch5IucdetdlifHNlUQ6hp4qu2.LMj8PVilSAQKG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Rossi_46@bigmir.net');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Meest', 'Gz', 'Supply chain', 'Manager', 'PU836156', 'Leiba Volodymyr', 'male', '19700177316', '', '', 'meeting', 'Rossi_46@bigmir.net'
FROM users WHERE email = 'Rossi_46@bigmir.net'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Vova_2026-08-31 18.43.10_IMG_5606_01.png' FROM users WHERE email = 'Rossi_46@bigmir.net'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Vova_2026-08-31 18.43.10_IMG_5609_01.png' FROM users WHERE email = 'Rossi_46@bigmir.net'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Vova_2026-08-31 18.43.10_IMG_3574_01.jpeg' FROM users WHERE email = 'Rossi_46@bigmir.net'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Vova_2026-08-31 18.43.10_IMG_5633_01.png' FROM users WHERE email = 'Rossi_46@bigmir.net'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Vova_2026-08-31 18.43.10_IMG_4011_01.jpeg' FROM users WHERE email = 'Rossi_46@bigmir.net'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'IULIIA POROKH', 'julia.ai.automation@gmail.com', '$2b$12$46yb/cBw4UJSjkyHI01X9.YX7YK.l2QKqNDQY0bTZphp4SYM6qsVy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'julia.ai.automation@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'FOP Iuliia Porokh', 'Україна, 46008, Тернопільська обл., місто Тернопіль, вулиця Лесі Українки, будинок 27-Б', 'Food/Beverages/Neutraceutical', 'Director', 'GM159456', 'IULIIA POROKH', 'female', '16678671053', '', '', 'visiting', 'julia.ai.automation@gmail.com'
FROM users WHERE email = 'julia.ai.automation@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Julia_2026-08-31 18.54.29_IMG_3460_01.jpeg' FROM users WHERE email = 'julia.ai.automation@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Julia_2026-08-31 18.54.29_IMG_9857_01.jpeg' FROM users WHERE email = 'julia.ai.automation@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Julia_2026-08-31 18.54.29_2A5193AB-FD3F-4671-BEE0-83D0AB576D90_01.png' FROM users WHERE email = 'julia.ai.automation@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Julia_2026-08-31 18.54.29_IMG_9107_01.jpeg' FROM users WHERE email = 'julia.ai.automation@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Julia_2026-08-31 18.54.29_e4952628dd914ac35500a3afeebdcb6b_01.jpeg' FROM users WHERE email = 'julia.ai.automation@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Afzal Yaseen', 'zainkhan660191@gmail.com', '$2b$12$J/3.iPH.pXz2m/yYlZxby.dPGAIg1titmjekWt8Qq4CvlDmb74n4.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'zainkhan660191@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Machvolt', 'Islamabad Pakistan', 'Machinery/Equipments/Automation', 'sales manager oversees', 'LM1516721', 'Afzal Yaseen', 'male', '17840993815', '', '', 'visiting', 'zainkhan660191@gmail.com'
FROM users WHERE email = 'zainkhan660191@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Yaseen Afzal_2026-08-31 18.54.49_IMG_0099_01.jpeg' FROM users WHERE email = 'zainkhan660191@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Yaseen Afzal_2026-08-31 18.54.49_IMG_1219_01.png' FROM users WHERE email = 'zainkhan660191@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Yaseen Afzal_2026-08-31 18.54.49_76e05c9d5c4b1fa7132274e67f2cc737_01.jpeg' FROM users WHERE email = 'zainkhan660191@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Yaseen Afzal_2026-08-31 18.54.49_84296f49e96225e17d65ed454bafd737_01.jpeg' FROM users WHERE email = 'zainkhan660191@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Yaseen Afzal_2026-08-31 18.54.49_IMG_5232_01.jpeg' FROM users WHERE email = 'zainkhan660191@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'APAW CLEMENT KWABENA', 'clacconsultgh@gmail.com', '$2b$12$YiLHo//f144fgosMlN5bk.L70O3Okg7K4GP1KHY28LmQPJ.gIp0XC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'clacconsultgh@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'CLAC CONSULT', 'SCNMTC box 16, Osiem, Eastern Regions Ghana', 'Supply chain', 'Manager', 'A180804', 'APAW CLEMENT KWABENA', 'male', '13922715893', '', '', 'visiting', 'clacconsultgh@gmail.com'
FROM users WHERE email = 'clacconsultgh@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Clement K. Apaw_2026-08-31 18.55.07_picture-0_01.png' FROM users WHERE email = 'clacconsultgh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Clement K. Apaw_2026-08-31 18.55.07_picture-0_01.png' FROM users WHERE email = 'clacconsultgh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Clement K. Apaw_2026-08-31 18.55.07_picture-0_01.png' FROM users WHERE email = 'clacconsultgh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Clement K. Apaw_2026-08-31 18.55.07_picture-0_01.png' FROM users WHERE email = 'clacconsultgh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Clement K. Apaw_2026-08-31 18.55.07_picture-0_01.png' FROM users WHERE email = 'clacconsultgh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Yulia Feoktistova', 'julia1987@my.com', '$2b$12$zXOk3pCMgdi5E717IZLef.W1b.8dts34SHe8KYHzLiMtOxAEbdA1K', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'julia1987@my.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'TIS Logistic', '690014, 32A Tolstogo Street, Veles Shopping Center, 2nd Floor, Vladivostok, Russia', 'Supply chain', 'Sales Manager', '551717547', 'Yulia Feoktistova', 'female', '16675185137', '', '', 'visiting', 'julia1987@my.com'
FROM users WHERE email = 'julia1987@my.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Yulia_2026-08-31 18.57.08_新护照首页_01.jpeg' FROM users WHERE email = 'julia1987@my.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Yulia_2026-08-31 18.57.08_d9a9615f-9d91-49aa-8ffe-061d73bcdef1_01.jpeg' FROM users WHERE email = 'julia1987@my.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Yulia_2026-08-31 18.57.08_IMG_2330_01.jpeg' FROM users WHERE email = 'julia1987@my.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Yulia_2026-08-31 18.57.08_IMG_2325_01.jpeg' FROM users WHERE email = 'julia1987@my.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Yulia_2026-08-31 18.57.08_3ef81725f48e23dc51a64474a9cde891_01.jpeg' FROM users WHERE email = 'julia1987@my.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'IHTISHAMULLAH', 'Don.dental.supply@gmail.com', '$2b$12$2w.iaOneH0et7SIsEn39Se4iiI3Cm9NemMJqjmo8FwOe7eDoj.WYK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Don.dental.supply@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Don dental supply', 'Liwan Guangzhou', 'Supply chain', 'CEO', 'AA1177895', 'IHTISHAMULLAH', 'male', '18529294803', '', '', 'meeting', 'Don.dental.supply@gmail.com'
FROM users WHERE email = 'Don.dental.supply@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'DDS_2026-08-31 19.02.17_IMG_4125_01.jpeg' FROM users WHERE email = 'Don.dental.supply@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'DDS_2026-08-31 19.02.17_IMG_9819_01.jpeg' FROM users WHERE email = 'Don.dental.supply@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'DDS_2026-08-31 19.02.17_3807_01.jpeg' FROM users WHERE email = 'Don.dental.supply@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'DDS_2026-08-31 19.02.17_IMG_9797_01.jpeg' FROM users WHERE email = 'Don.dental.supply@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'DDS_2026-08-31 19.02.17_IMG_9855_01.jpeg' FROM users WHERE email = 'Don.dental.supply@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Mumtaz ur rehman', 'Mumtazcadservices@gmail.com', '$2b$12$xpooQ0pH.5j0Wb8l5GrOF.mauQ9w.AHyQwqmxDsFpdbTtCX4BThhG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Mumtazcadservices@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Mutaz international trade Guangzhou ltd', 'Office no 315, Dubai plaza 6th Road Rawalpindi Punjab Pakistan', 'Machinery/Equipments/Automation', 'Director', 'Qh9150072', 'Mumtaz ur rehman', 'male', '13250572906', '', '', 'meeting', 'Mumtazcadservices@gmail.com'
FROM users WHERE email = 'Mumtazcadservices@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'MIKE_2026-08-31 19.03.02_picture-0_01.png' FROM users WHERE email = 'Mumtazcadservices@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'MIKE_2026-08-31 19.03.02_picture-0_01.png' FROM users WHERE email = 'Mumtazcadservices@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'MIKE_2026-08-31 19.03.02_picture-0_01.png' FROM users WHERE email = 'Mumtazcadservices@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'MIKE_2026-08-31 19.03.02_picture-0_01.png' FROM users WHERE email = 'Mumtazcadservices@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'MIKE_2026-08-31 19.03.02_picture-0_01.png' FROM users WHERE email = 'Mumtazcadservices@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Pollyanna Bicalho', 'poy3000@gmail.com', '$2b$12$1vSBlhwOwG601JCPBTfEwOWi9ovO9J4Ls4Zee.FHinojK5/VL1bpy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'poy3000@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Ecommerce da China', 'Brazil', 'Food/Beverages/Neutraceutical', 'CeO', 'GI756148', 'Pollyanna Bicalho', 'female', '19575360040', '', '', 'meeting', 'poy3000@gmail.com'
FROM users WHERE email = 'poy3000@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Poll_2026-08-31 19.03.30_IMG_3423_01.jpeg' FROM users WHERE email = 'poy3000@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Poll_2026-08-31 19.03.30_IMG_7386_01.jpeg' FROM users WHERE email = 'poy3000@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Poll_2026-08-31 19.03.30_IMG_0380_01.jpeg' FROM users WHERE email = 'poy3000@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Poll_2026-08-31 19.03.30_IMG_0382_01.jpeg' FROM users WHERE email = 'poy3000@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Poll_2026-08-31 19.03.30_14076_01.jpeg' FROM users WHERE email = 'poy3000@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Artem', 'kaluginartem19@gmail.com', '$2b$12$Rs60rOfVbAaKdRuuj4EN5udK5V7lAmiZbEdMRB15zgy3.jRKkUpA2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kaluginartem19@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, '佛山俄斯科美发有限公司', '佛山市南海区桂城街道京华广场2座3725房', 'Cosmetics /beauty company', 'Manager', '771577926', 'Artem', 'male', '18876987205', '', '', 'visiting', 'kaluginartem19@gmail.com'
FROM users WHERE email = 'kaluginartem19@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Art.target_2026-08-31 19.04.21_38127e888d24a3366596674266bb5bd5_01.jpeg' FROM users WHERE email = 'kaluginartem19@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Art.target_2026-08-31 19.04.21_IMG_3839_01.jpeg' FROM users WHERE email = 'kaluginartem19@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Art.target_2026-08-31 19.04.21_IMG_5791_01.png' FROM users WHERE email = 'kaluginartem19@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Art.target_2026-08-31 19.04.21_7419_01.jpeg' FROM users WHERE email = 'kaluginartem19@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Art.target_2026-08-31 19.04.21_IMG_4978_01.png' FROM users WHERE email = 'kaluginartem19@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Hawari Sameer', 'sameerhawari55@gmail.com', '$2b$12$1AGeZVid1gkxftjRjQ/5K.KJy7xy8M05L9bNZZKhXkI4AL.JPN5HO', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sameerhawari55@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Star Traders', 'Kathmandu', 'Machinery/Equipments/Automation', 'Marketing head', 'PA2983417', 'Hawari Sameer', 'male', '15692430245', '', '', 'visiting', 'sameerhawari55@gmail.com'
FROM users WHERE email = 'sameerhawari55@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Sameer Hawari_2026-08-31 19.10.57_picture-0_01.png' FROM users WHERE email = 'sameerhawari55@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Sameer Hawari_2026-08-31 19.10.57_picture-0_01.png' FROM users WHERE email = 'sameerhawari55@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Sameer Hawari_2026-08-31 19.10.57_picture-0_01.png' FROM users WHERE email = 'sameerhawari55@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Sameer Hawari_2026-08-31 19.10.57_picture-0_01.png' FROM users WHERE email = 'sameerhawari55@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Sameer Hawari_2026-08-31 19.10.57_picture-0_01.png' FROM users WHERE email = 'sameerhawari55@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Kalyan Yana', 'yanagznsk@yandex.ru', '$2b$12$tjyceYi5hgVzbLoEYQVFQel3uFF2Xezh2/36QQr1.oh0cm8aMDy6a', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'yanagznsk@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Optimal', 'Russia, Novosibirsk city, serebrynikovskaya 4/1', 'Cosmetics /beauty company', 'Manager', '550325374', 'Kalyan Yana', 'female', '13076703903', '', '', 'meeting', 'yanagznsk@yandex.ru'
FROM users WHERE email = 'yanagznsk@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Yana_2026-08-31 19.12.41_IMG_1776_01.jpeg' FROM users WHERE email = 'yanagznsk@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Yana_2026-08-31 19.12.41_IMG_1777_01.jpeg' FROM users WHERE email = 'yanagznsk@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Yana_2026-08-31 19.12.41_IMG_2039_01.jpeg' FROM users WHERE email = 'yanagznsk@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Yana_2026-08-31 19.12.41_IMG_7805_01.jpeg' FROM users WHERE email = 'yanagznsk@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Yana_2026-08-31 19.12.41_915_01.jpeg' FROM users WHERE email = 'yanagznsk@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'TURIEVA IULIIA', 'juliatur6china@list.ru', '$2b$12$HxO7CK..Rr6DLXwrY1p2jOb96X6PrV1OkfdfPIT6GBhP.n1XwYf6K', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'juliatur6china@list.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Tworiva', 'Russia', 'Cosmetics /beauty company', 'Manager', '77 9202830', 'TURIEVA IULIIA', 'female', '15915784239', '', '', 'visiting', 'juliatur6china@list.ru'
FROM users WHERE email = 'juliatur6china@list.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Delivery_Tur6_China_2026-08-31 19.12.57_IMG_2863_01.jpeg' FROM users WHERE email = 'juliatur6china@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Delivery_Tur6_China_2026-08-31 19.12.57_IMG_2932_01.jpeg' FROM users WHERE email = 'juliatur6china@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Delivery_Tur6_China_2026-08-31 19.12.57_IMG_2950_01.jpeg' FROM users WHERE email = 'juliatur6china@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Delivery_Tur6_China_2026-08-31 19.12.57_IMG_2934_01.jpeg' FROM users WHERE email = 'juliatur6china@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Delivery_Tur6_China_2026-08-31 19.12.57_IMG_2933_01.jpeg' FROM users WHERE email = 'juliatur6china@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ismail Muhammad Anwar', 'anwaar707@gmail.com', '$2b$12$Rfo5rDTgurQpeP2cl6UDS.IPQjoMStgTpBxuHF96rZYZDi5aH53Me', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'anwaar707@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Noir', '28 B, Liberty market Apara, G.6/1-2, Islamabad.', 'Pharma Sales', 'Director', 'DG1852992', 'Ismail Muhammad Anwar', 'male', '13248234707', '', '', 'meeting', 'anwaar707@gmail.com'
FROM users WHERE email = 'anwaar707@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Anwaar Ismail_2026-08-31 19.14.27_picture-0_01.png' FROM users WHERE email = 'anwaar707@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Anwaar Ismail_2026-08-31 19.14.27_picture-0_01.png' FROM users WHERE email = 'anwaar707@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Anwaar Ismail_2026-08-31 19.14.27_picture-0_01.png' FROM users WHERE email = 'anwaar707@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Anwaar Ismail_2026-08-31 19.14.27_picture-0_01.png' FROM users WHERE email = 'anwaar707@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Anwaar Ismail_2026-08-31 19.14.27_picture-0_01.png' FROM users WHERE email = 'anwaar707@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Konstantin Sergeev', 'ufa-ded-moroz@yandex.ru', '$2b$12$ygK7p0C99bEp2w37yso4L.ALcNHc7fNDoC122RsNUWWDeEQedgZqC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ufa-ded-moroz@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'IP Sergeev Konstantin Sergeevich', 'Russia, Ufa, st. Richards Zorge 26/1', 'Distributor/Import-Export', 'Manager', '664627507', 'Konstantin Sergeev', 'male', '19865577764', '', '', 'visiting', 'ufa-ded-moroz@yandex.ru'
FROM users WHERE email = 'ufa-ded-moroz@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Konstantin_2026-08-31 19.14.28_picture-0_01.png' FROM users WHERE email = 'ufa-ded-moroz@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Konstantin_2026-08-31 19.14.28_picture-0_01.png' FROM users WHERE email = 'ufa-ded-moroz@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Konstantin_2026-08-31 19.14.28_picture-0_01.png' FROM users WHERE email = 'ufa-ded-moroz@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Konstantin_2026-08-31 19.14.28_picture-0_01.png
Konstantin_2026-08-31 19.14.28_picture-1_02.png
Konstantin_2026-08-31 19.14.28_picture-2_03.png
Konstantin_2026-08-31 19.14.28_picture-3_04.png
Konstantin_2026-08-31 19.14.28_picture-4_05.png' FROM users WHERE email = 'ufa-ded-moroz@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Konstantin_2026-08-31 19.14.28_picture-0_01.png' FROM users WHERE email = 'ufa-ded-moroz@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ahmed Farouk Fahmy Sayed Ahmed', 'lestat_55555@hotmail.com', '$2b$12$gVp5hVg3JOvSkxNpxei8.u296PwXqKbTXYZQdmndKvzLCE5VIfB6y', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'lestat_55555@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Farouk Trading Ltd', 'Egypt. Portsaid', 'Supply chain', 'CEO and founder', 'A34563485', 'Ahmed Farouk Fahmy Sayed Ahmed', 'male', '13751193960', '', '', 'visiting', 'lestat_55555@hotmail.com'
FROM users WHERE email = 'lestat_55555@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Farouk_2026-08-31 19.15.53_IMG_3744_01.jpeg' FROM users WHERE email = 'lestat_55555@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Farouk_2026-08-31 19.15.53_IMG_3867_01.jpeg' FROM users WHERE email = 'lestat_55555@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Farouk_2026-08-31 19.15.53_IMG_5900_01.jpeg' FROM users WHERE email = 'lestat_55555@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Farouk_2026-08-31 19.15.53_9d04091d-5b02-41ec-abae-f52104f6a32b_01.jpeg' FROM users WHERE email = 'lestat_55555@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Farouk_2026-08-31 19.15.53_IMG_4342_01.jpeg' FROM users WHERE email = 'lestat_55555@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Vishal Saini', 'Sainivishalza@gmail.com', '$2b$12$r0PhTBtvm5r/Ady9a16Q3OZXXD4Cqz3WX2lgqGIlOGop0SGwNYfK2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Sainivishalza@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'The Unique Choice Global Limited', 'Mongkok Hongkong', 'Cosmetics /beauty company', 'Director', 'Z5927954', 'Vishal Saini', 'male', '17876763143', '', '', 'meeting', 'Sainivishalza@gmail.com'
FROM users WHERE email = 'Sainivishalza@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Vishal Saini_2026-08-31 19.19.02_96382131-1401-40af-8f0e-04879aafedcf_01.jpeg' FROM users WHERE email = 'Sainivishalza@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Vishal Saini_2026-08-31 19.19.02_IMG_5574_01.jpeg' FROM users WHERE email = 'Sainivishalza@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Vishal Saini_2026-08-31 19.19.02_57a87dbe28b6698db10d0c8629b2849a_01.jpeg' FROM users WHERE email = 'Sainivishalza@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Vishal Saini_2026-08-31 19.19.02_IMG_1764_01.jpeg' FROM users WHERE email = 'Sainivishalza@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Vishal Saini_2026-08-31 19.19.02_IMG_1655_01.jpeg' FROM users WHERE email = 'Sainivishalza@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Kulaha Stanislau', 'portal.stambull@gmail.com', '$2b$12$9j8zm0emmNkuVwy6XzaD9.44WWX.yV1jJ9MV9S0r.4DzPBAQgJqHm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'portal.stambull@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Ocst', 'Belarus, Brest', 'Market Analysis/Investment', 'Marketing manager', 'AB3234570', 'Kulaha Stanislau', 'male', '15019227058', '', '', 'meeting', 'portal.stambull@gmail.com'
FROM users WHERE email = 'portal.stambull@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Stanislau 丹慕豪_2026-08-31 19.32.50_picture-0_01.png' FROM users WHERE email = 'portal.stambull@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Stanislau 丹慕豪_2026-08-31 19.32.50_picture-0_01.png' FROM users WHERE email = 'portal.stambull@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Stanislau 丹慕豪_2026-08-31 19.32.50_picture-0_01.png' FROM users WHERE email = 'portal.stambull@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Stanislau 丹慕豪_2026-08-31 19.32.50_picture-0_01.png' FROM users WHERE email = 'portal.stambull@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Stanislau 丹慕豪_2026-08-31 19.32.50_picture-0_01.png' FROM users WHERE email = 'portal.stambull@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Fokina Natalya', 'Fokinastropsiholog@gmail.com', '$2b$12$O.hUx79yzxfc.EH529lm1.mvha9CXV.iUzOq5ERececITQV5jyFEG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Fokinastropsiholog@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'IP Fokina', 'Foshan', 'Cosmetics /beauty company', 'Manager', '66 3881123', 'Fokina Natalya', 'female', '13630021269', '', '', 'meeting', 'Fokinastropsiholog@gmail.com'
FROM users WHERE email = 'Fokinastropsiholog@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Natella 💃🏼_2026-08-31 19.36.19_IMG_0482_01.jpeg' FROM users WHERE email = 'Fokinastropsiholog@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Natella 💃🏼_2026-08-31 19.36.19_image_01.jpg' FROM users WHERE email = 'Fokinastropsiholog@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Natella 💃🏼_2026-08-31 19.36.19_32583CE7-5B06-47C9-B027-F42FC5477A52_01.png' FROM users WHERE email = 'Fokinastropsiholog@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Natella 💃🏼_2026-08-31 19.36.19_1656acd1-2945-4aec-b94b-41606980a076_01.jpeg' FROM users WHERE email = 'Fokinastropsiholog@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Natella 💃🏼_2026-08-31 19.36.19_3174_01.jpeg
Natella 💃🏼_2026-08-31 19.36.19_IMG_4402_02.jpeg
Natella 💃🏼_2026-08-31 19.36.19_1a959ad8d1a3286eb743e66fbdf967_livephoto_03.jpeg' FROM users WHERE email = 'Fokinastropsiholog@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Natalia Poberezhnik', 'tasha88zh@gmail.com', '$2b$12$8bfE7vgq66eFZ7Utvj/S9OTrH03DVehd4BQQJiF6JhcqnJXRT8YEG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'tasha88zh@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guangzhou Lina international trade co', 'Russia, Perm city, Tankistov, 9', 'Cosmetics /beauty company', 'Sales manager', '664226038', 'Natalia Poberezhnik', 'female', '15625406050', '', '', 'meeting', 'tasha88zh@gmail.com'
FROM users WHERE email = 'tasha88zh@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Tasha_2026-08-31 19.42.09_IMG_6868_01.jpeg' FROM users WHERE email = 'tasha88zh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Tasha_2026-08-31 19.42.09_IMG_9224_01.jpeg' FROM users WHERE email = 'tasha88zh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Tasha_2026-08-31 19.42.09_5499A74C-77B1-4F48-A6EA-19550BBF4D1F_01.jpeg' FROM users WHERE email = 'tasha88zh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Tasha_2026-08-31 19.42.09_a5c329093afbb63013d1806f4df093f3_01.jpeg' FROM users WHERE email = 'tasha88zh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Tasha_2026-08-31 19.42.09_IMG_7239_01.jpeg' FROM users WHERE email = 'tasha88zh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'PODOLSKATETYANA', 'Tatianapodolskaya@yahoo.com', '$2b$12$isY4DvuuDptlzHdkjYVLR.k3D1yLYbtTr6v3jN9Q.jecydRHe/fFa', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Tatianapodolskaya@yahoo.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Elegance', 'Kiev Sofievska 12 a', 'Market Analysis/Investment', 'Director', 'GL037852', 'PODOLSKATETYANA', 'female', '13570159371', 'Guangzhou', '', 'meeting', 'Tatianapodolskaya@yahoo.com'
FROM users WHERE email = 'Tatianapodolskaya@yahoo.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Taty8taty_2026-08-31 20.01.25_IMG_7513_01.png' FROM users WHERE email = 'Tatianapodolskaya@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Taty8taty_2026-08-31 20.01.25_IMG_3246_01.png' FROM users WHERE email = 'Tatianapodolskaya@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Taty8taty_2026-08-31 20.01.25_IMG_2147_01.png' FROM users WHERE email = 'Tatianapodolskaya@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Taty8taty_2026-08-31 20.01.25_IMG_2596_01.jpeg' FROM users WHERE email = 'Tatianapodolskaya@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Taty8taty_2026-08-31 20.01.25_IMG_2722_01.jpeg' FROM users WHERE email = 'Tatianapodolskaya@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Sokolova Natalia', 'falconnatalybest@gmail.com', '$2b$12$yMy7kyYODRwN5qb7cyJ4MuvkRV0NkM/JVALO2HhoF66MvwUYmCEvy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'falconnatalybest@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Tiger logistic', 'Yiwu city', 'Market Analysis/Investment', 'Manager', '771219077', 'Sokolova Natalia', 'female', '13922715154', 'Guangzhou', '', 'meeting', 'falconnatalybest@gmail.com'
FROM users WHERE email = 'falconnatalybest@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Nataly_2026-08-31 20.06.48_IMG_8905_01.jpeg' FROM users WHERE email = 'falconnatalybest@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Nataly_2026-08-31 20.06.48_CamScanner 2026-8-14 13.56_1_01.jpeg' FROM users WHERE email = 'falconnatalybest@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Nataly_2026-08-31 20.06.48_IMG_0957_01.jpeg' FROM users WHERE email = 'falconnatalybest@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Nataly_2026-08-31 20.06.48_IMG_0957_01.jpeg' FROM users WHERE email = 'falconnatalybest@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Nataly_2026-08-31 20.06.48_IMG_1143_01.jpeg' FROM users WHERE email = 'falconnatalybest@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'YASSINE OUKACHA', 'Yassinaha4@gmail.com', '$2b$12$gnB9.865uKSXTApPV41G0u5XfXjLyPLdd5.B68FU0sOyx5dTlqAuW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Yassinaha4@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'LABELVIE', 'Casablanca rue nassr n•39 apart 13', 'Machinery/Equipments/Automation', 'Manager', 'IU9031685', 'YASSINE OUKACHA', 'male', '13434840243', 'Guangzhou', '', 'meeting', 'Yassinaha4@gmail.com'
FROM users WHERE email = 'Yassinaha4@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'YasSine_2026-08-31 20.17.21_IMG_4309_01.jpeg' FROM users WHERE email = 'Yassinaha4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'YasSine_2026-08-31 20.17.21_IMG_4308_01.jpeg' FROM users WHERE email = 'Yassinaha4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'YasSine_2026-08-31 20.17.21_IMG_4058_01.jpeg' FROM users WHERE email = 'Yassinaha4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'YasSine_2026-08-31 20.17.21_IMG_4058_01.jpeg' FROM users WHERE email = 'Yassinaha4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'YasSine_2026-08-31 20.17.21_IMG_2750_01.jpeg' FROM users WHERE email = 'Yassinaha4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Muhammad Raza e Mustafa', 'Razamustafa326@gmail.com', '$2b$12$EJUx0eZzGYaApZYlmnZKtOpyNNIWU0phMqfMsALqvPTwQzmRKuNsW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Razamustafa326@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Al Miraj Trading', 'Office no 68, street no 24th main dogar road hameedpura Lahore', 'Distributor/Import-Export', 'Procurement Manager', 'LV9898872', 'Muhammad Raza e Mustafa', 'male', '13028897644', 'Shenzhen', '', 'meeting', 'Razamustafa326@gmail.com'
FROM users WHERE email = 'Razamustafa326@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'RM 王帅_2026-08-31 20.19.30_IMG_1660_01.jpeg' FROM users WHERE email = 'Razamustafa326@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'RM 王帅_2026-08-31 20.19.30_2ad04bc73e64edd75093576d87448f35_01.png' FROM users WHERE email = 'Razamustafa326@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'RM 王帅_2026-08-31 20.19.30_IMG_9651_01.jpeg' FROM users WHERE email = 'Razamustafa326@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'RM 王帅_2026-08-31 20.19.30_IMG_1182_01.png' FROM users WHERE email = 'Razamustafa326@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'RM 王帅_2026-08-31 20.19.30_30162_01.png' FROM users WHERE email = 'Razamustafa326@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Pogudina Natalia', 'pogudinanatala1@gmail.com', '$2b$12$pDsx6Rt2E2Yq27Yr9KfmyeHgpTzPvBT5Gv05iFI78YOqWIe0mi3da', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'pogudinanatala1@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Optima', 'Moscow, Rgora Abakumoa street, 10-2', 'Cosmetics /beauty company', 'Sales director', '765632763', 'Pogudina Natalia', 'female', '19128234167', 'Guangzhou', '', 'meeting', 'pogudinanatala1@gmail.com'
FROM users WHERE email = 'pogudinanatala1@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Natalie_2026-08-31 20.19.57_IMG_0248_01.jpeg' FROM users WHERE email = 'pogudinanatala1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Natalie_2026-08-31 20.19.57_IMG_0249_01.jpeg' FROM users WHERE email = 'pogudinanatala1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Natalie_2026-08-31 20.19.57_IMG_0311_01.jpeg' FROM users WHERE email = 'pogudinanatala1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Natalie_2026-08-31 20.19.57_IMG_0312_01.jpeg' FROM users WHERE email = 'pogudinanatala1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Natalie_2026-08-31 20.19.57_IMG_0314_01.jpeg' FROM users WHERE email = 'pogudinanatala1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Karpova Svetlana', 'kamsvetlana@inbox.ru', '$2b$12$BEPc./7Q2bHS9njvpb6k5..X4BOVfv3QVPCTsEakf4.ut8CRr4ehK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kamsvetlana@inbox.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'LoveSkin', 'Russia', 'Food/Beverages/Neutraceutical', 'Director', '670210777', 'Karpova Svetlana', 'female', '18811030466', 'Guangzhou', '', 'meeting', 'kamsvetlana@inbox.ru'
FROM users WHERE email = 'kamsvetlana@inbox.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Svetlana_2026-08-31 20.21.20_picture-0_01.png' FROM users WHERE email = 'kamsvetlana@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Svetlana_2026-08-31 20.21.20_picture-0_01.png' FROM users WHERE email = 'kamsvetlana@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Svetlana_2026-08-31 20.21.20_picture-0_01.png' FROM users WHERE email = 'kamsvetlana@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Svetlana_2026-08-31 20.21.20_picture-0_01.png' FROM users WHERE email = 'kamsvetlana@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Svetlana_2026-08-31 20.21.20_picture-0_01.png' FROM users WHERE email = 'kamsvetlana@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Turiev Vladimir', 'Turiev-vladimr@mail.ru', '$2b$12$WX73F7JK7mQFlwwHS56bk.f/70F7VhCFeiI4PlLBEqFRw3ZeFL1KG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Turiev-vladimr@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Two-Riva', 'Pyatigorsk', 'Food/Beverages/Neutraceutical', 'Manager', '774574775', 'Turiev Vladimir', 'male', '13533380644', 'Guangzhou', '', 'visiting', 'Turiev-vladimr@mail.ru'
FROM users WHERE email = 'Turiev-vladimr@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Fotore1991_2026-08-31 20.27.33_IMG_0609_01.jpeg' FROM users WHERE email = 'Turiev-vladimr@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Fotore1991_2026-08-31 20.27.33_IMG_0753_01.jpeg' FROM users WHERE email = 'Turiev-vladimr@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Fotore1991_2026-08-31 20.27.33_IMG_0807_01.jpeg' FROM users WHERE email = 'Turiev-vladimr@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Fotore1991_2026-08-31 20.27.33_IMG_0807_01.jpeg' FROM users WHERE email = 'Turiev-vladimr@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Fotore1991_2026-08-31 20.27.33_IMG_7393_01.jpeg' FROM users WHERE email = 'Turiev-vladimr@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Muhammad Tahir Fazal', 'fouji30@gmail.com', '$2b$12$bMJKItXYm.jiBkv0jsRHWurJVnPda4Ez4r6UhER0PZH87OzP8sIve', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'fouji30@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Ahil Traders', 'Lahore Pakistan', 'Distributor/Import-Export', 'Manager', 'AR8800292', 'Muhammad Tahir Fazal', 'male', '13724247946', 'Shenzhen', '', 'meeting', 'fouji30@gmail.com'
FROM users WHERE email = 'fouji30@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Tahir_2026-08-31 20.32.10_1000180927_01.jpg' FROM users WHERE email = 'fouji30@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Tahir_2026-08-31 20.32.10_1788177843111_01.jpg' FROM users WHERE email = 'fouji30@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Tahir_2026-08-31 20.32.10_1000288199_01.png' FROM users WHERE email = 'fouji30@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Tahir_2026-08-31 20.32.10_1000288208_01.jpg' FROM users WHERE email = 'fouji30@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Tahir_2026-08-31 20.32.10_1000323298_01.jpg' FROM users WHERE email = 'fouji30@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Uvarova Kateryna', 'katynastya8@gmail.com', '$2b$12$KVPGxZgRX2mg52HrJMkvKuVN6LwzoX3iAJiC7KcT9dz1gfcEpFF4S', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'katynastya8@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Humicore', 'HUMICORE W.L.L
Flat 1446, Building 470, Road 1010, Block 410, Sanabis, Kingdom of Bahrain,     Tel. +973 34526041', 'Supply chain', 'CEO', 'FN633364', 'Uvarova Kateryna', 'female', '15013759004', 'Shenzhen', '', 'visiting', 'katynastya8@gmail.com'
FROM users WHERE email = 'katynastya8@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Katerina🐬_2026-08-31 20.34.48_photo-output_01.jpeg' FROM users WHERE email = 'katynastya8@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Katerina🐬_2026-08-31 20.34.48_3586_01.jpeg' FROM users WHERE email = 'katynastya8@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Katerina🐬_2026-08-31 20.34.48_IMG_4574_01.jpeg' FROM users WHERE email = 'katynastya8@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Katerina🐬_2026-08-31 20.34.48_IMG_4576_01.jpeg' FROM users WHERE email = 'katynastya8@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Katerina🐬_2026-08-31 20.34.48_IMG_3022_01.jpeg' FROM users WHERE email = 'katynastya8@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Elena Vlasova', 'level.dva@inbox.ru', '$2b$12$miQ.UiHrvn0BIv9nBEoOT./4wH9t046Ql3lgi0IwlKrXEWa4wDWVO', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'level.dva@inbox.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Qwer', 'GZ', 'Cosmetics /beauty company', 'Manager', '767165025', 'Elena Vlasova', 'female', '15919625421', 'Guangzhou', '', 'meeting', 'level.dva@inbox.ru'
FROM users WHERE email = 'level.dva@inbox.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Elena Vl 🇨🇳_2026-08-31 20.40.35_IMG_0829_01.jpeg' FROM users WHERE email = 'level.dva@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Elena Vl 🇨🇳_2026-08-31 20.40.35_IMG_1426_01.jpeg' FROM users WHERE email = 'level.dva@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Elena Vl 🇨🇳_2026-08-31 20.40.35_IMG_5261_01.jpeg' FROM users WHERE email = 'level.dva@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Elena Vl 🇨🇳_2026-08-31 20.40.35_IMG_5261_01.jpeg' FROM users WHERE email = 'level.dva@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Elena Vl 🇨🇳_2026-08-31 20.40.35_IMG_4975_01.jpeg' FROM users WHERE email = 'level.dva@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'IRFAN MUHAMMAD', 'irrfan.878@gmail.com', '$2b$12$2BKEnqcrGDFl53yjDbTCtu45RMRNJ9u47D3OmVofH8X4gV4GocWpG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'irrfan.878@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Classic Star', 'Fazal plaza Lahore', 'Pharma Manufacturers', 'Sourcing manager', 'LE1987191', 'IRFAN MUHAMMAD', 'male', '15889496905', 'Shenzhen', '', 'meeting', 'irrfan.878@gmail.com'
FROM users WHERE email = 'irrfan.878@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Muhammad Irfan_2026-08-31 20.44.06_picture-0_01.png' FROM users WHERE email = 'irrfan.878@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Muhammad Irfan_2026-08-31 20.44.06_picture-0_01.png' FROM users WHERE email = 'irrfan.878@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Muhammad Irfan_2026-08-31 20.44.06_picture-0_01.png' FROM users WHERE email = 'irrfan.878@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Muhammad Irfan_2026-08-31 20.44.06_picture-0_01.png' FROM users WHERE email = 'irrfan.878@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Muhammad Irfan_2026-08-31 20.44.06_picture-0_01.png' FROM users WHERE email = 'irrfan.878@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Lelyan Albert', 'lelyan.66@mail.ru', '$2b$12$y5iaN3aRMrk3m0IdysU/muQOEbDxreYinDVk9GodEgMoUc4pcOR0K', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'lelyan.66@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Alb-002', 'Moskva Dmittovskoe shosse, 175/1', 'Market Analysis/Investment', 'manager', '5504199233', 'Lelyan Albert', 'male', '18529466450', 'Guangzhou', '', 'meeting', 'lelyan.66@mail.ru'
FROM users WHERE email = 'lelyan.66@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Albert_2026-08-31 20.44.14_IMG_9413_01.jpeg' FROM users WHERE email = 'lelyan.66@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Albert_2026-08-31 20.44.14_IMG_9412_01.jpeg' FROM users WHERE email = 'lelyan.66@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Albert_2026-08-31 20.44.14_IMG_9414_01.jpeg' FROM users WHERE email = 'lelyan.66@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Albert_2026-08-31 20.44.14_IMG_7025_01.jpeg' FROM users WHERE email = 'lelyan.66@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Albert_2026-08-31 20.44.14_IMG_9954_01.jpeg' FROM users WHERE email = 'lelyan.66@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'PASHENTSEVA IULIIA', 'julia.pashenceva@bk.ru', '$2b$12$N7tWhP0SsssbhuQzbJXD4ezPnyNvsYmo.zO4bS2jurt9ER1DY591K', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'julia.pashenceva@bk.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'ProCureOne', 'Vladivostok', 'Machinery/Equipments/Automation', 'Manager', '756559015', 'PASHENTSEVA IULIIA', 'female', '16689731720', 'Guangzhou', '', 'visiting', 'julia.pashenceva@bk.ru'
FROM users WHERE email = 'julia.pashenceva@bk.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Julia.P_2026-08-31 21.34.23_IMG_2234_01.jpeg' FROM users WHERE email = 'julia.pashenceva@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Julia.P_2026-08-31 21.34.23_IMG_0732_01.jpeg' FROM users WHERE email = 'julia.pashenceva@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Julia.P_2026-08-31 21.34.23_IMG_7997_01.jpeg' FROM users WHERE email = 'julia.pashenceva@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Julia.P_2026-08-31 21.34.23_IMG_7867_01.jpeg' FROM users WHERE email = 'julia.pashenceva@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Julia.P_2026-08-31 21.34.23_IMG_3233_01.jpeg' FROM users WHERE email = 'julia.pashenceva@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Azim Sheikh Muhammad', 'azimchina2003@hotmail.com', '$2b$12$B6Dd0FWxzeO1ifU4LsbMkexyyRQWH35GpJqyyux2galW6X.dpqTHa', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'azimchina2003@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Jinma Enterprise', '圣堂街2街25号101', 'Pharma Sales', 'Owner', 'AG 1853924', 'Azim Sheikh Muhammad', 'male', '13790024949', 'Guangzhou', '', 'meeting', 'azimchina2003@hotmail.com'
FROM users WHERE email = 'azimchina2003@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Azim_2026-08-31 21.48.35_picture-0_01.png' FROM users WHERE email = 'azimchina2003@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Azim_2026-08-31 21.48.35_picture-0_01.png' FROM users WHERE email = 'azimchina2003@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Azim_2026-08-31 21.48.35_picture-0_01.png' FROM users WHERE email = 'azimchina2003@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Azim_2026-08-31 21.48.35_picture-0_01.png' FROM users WHERE email = 'azimchina2003@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Azim_2026-08-31 21.48.35_picture-0_01.png' FROM users WHERE email = 'azimchina2003@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Rabab bougunine', 'rababboug69@gmail.com', '$2b$12$M3kAk6WVreW9KF3.zXPy0.t5WFPDRJx/2JG46xCJFz3C5z57EMrD.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'rababboug69@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Morocco Trading', 'Morocco Rabat', 'Food/Beverages/Neutraceutical', 'Manager', 'EJ7032141', 'Rabab bougunine', 'female', '19865849840', 'Guangzhou', '', 'meeting', 'rababboug69@gmail.com'
FROM users WHERE email = 'rababboug69@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Rabab_2026-08-31 22.01.57_IMG_8648_01.jpeg' FROM users WHERE email = 'rababboug69@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Rabab_2026-08-31 22.01.57_IMG_8649_01.jpeg' FROM users WHERE email = 'rababboug69@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Rabab_2026-08-31 22.01.57_IMG_8651_01.png' FROM users WHERE email = 'rababboug69@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Rabab_2026-08-31 22.01.57_IMG_8651_01.png' FROM users WHERE email = 'rababboug69@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Rabab_2026-08-31 22.01.57_IMG_8652_01.png' FROM users WHERE email = 'rababboug69@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Fatemeh ahmadkhani', 'fatemehahmadkhani1363@gmail.com', '$2b$12$aVlh0UMsZ2b.aQT6zPbXae7W6Nw09IsBKKoFwfvY3YGCcimyDfahe', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'fatemehahmadkhani1363@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'rayka', 'iran tehran', 'Cosmetics /beauty company', 'CEO', 'N69921845', 'Fatemeh ahmadkhani', 'female', '13265515058', 'Guangzhou', '', 'meeting', 'fatemehahmadkhani1363@gmail.com'
FROM users WHERE email = 'fatemehahmadkhani1363@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Fatemeh_2026-08-31 22.23.05_CamScanner 5-12-26 11.14_1_01.jpeg' FROM users WHERE email = 'fatemehahmadkhani1363@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Fatemeh_2026-08-31 22.23.05_CamScanner 8-24-26 16.02_1_01.jpeg' FROM users WHERE email = 'fatemehahmadkhani1363@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Fatemeh_2026-08-31 22.23.05_image_01.jpg' FROM users WHERE email = 'fatemehahmadkhani1363@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Fatemeh_2026-08-31 22.23.05_1396_01.jpeg' FROM users WHERE email = 'fatemehahmadkhani1363@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Fatemeh_2026-08-31 22.23.05_24DCEA80-3DD2-4CF5-976A-77CD3C69A9F8_01.jpeg' FROM users WHERE email = 'fatemehahmadkhani1363@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Irfan khan', 'Irfangeneticist@gmail.com', '$2b$12$anWL8tXqEhPH7QDobePnvO4bxZl6XvgSnPjPFunsDfg2VsYZwth.O', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Irfangeneticist@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'YifaanGlobal', 'GT road swabi Pakistan', 'Supply chain', 'CEO', 'GM4129193', 'Irfan khan', 'male', '15056034709', 'Guangzhou', '', 'visiting', 'Irfangeneticist@gmail.com'
FROM users WHERE email = 'Irfangeneticist@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Irfan khan_2026-08-31 22.23.35_IMG_4651_01.jpeg' FROM users WHERE email = 'Irfangeneticist@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Irfan khan_2026-08-31 22.23.35_IMG_7450_01.jpeg' FROM users WHERE email = 'Irfangeneticist@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Irfan khan_2026-08-31 22.23.35_1482_01.jpeg' FROM users WHERE email = 'Irfangeneticist@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Irfan khan_2026-08-31 22.23.35_6006_01.jpeg' FROM users WHERE email = 'Irfangeneticist@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Irfan khan_2026-08-31 22.23.35_IMG_6587_01.jpeg' FROM users WHERE email = 'Irfangeneticist@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Gilvan Brendo', 'Gilvanbrendo@gmail.com', '$2b$12$9EYUddwsudYq3fnBtlepuuMsvceatWZRjjqYqiEZPwyBFPC87rrw2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Gilvanbrendo@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'FC116Brasil', 'São Paulo BR', 'Market Analysis/Investment', 'Manager', 'Gn731938', 'Gilvan Brendo', 'male', '19020564450', 'Shenzhen', '', 'meeting', 'Gilvanbrendo@gmail.com'
FROM users WHERE email = 'Gilvanbrendo@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Gilvan Brendo🇧🇷_2026-08-31 22.26.05_picture-0_01.png' FROM users WHERE email = 'Gilvanbrendo@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Gilvan Brendo🇧🇷_2026-08-31 22.26.05_picture-0_01.png' FROM users WHERE email = 'Gilvanbrendo@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Gilvan Brendo🇧🇷_2026-08-31 22.26.05_picture-0_01.png' FROM users WHERE email = 'Gilvanbrendo@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Gilvan Brendo🇧🇷_2026-08-31 22.26.05_picture-0_01.png' FROM users WHERE email = 'Gilvanbrendo@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Gilvan Brendo🇧🇷_2026-08-31 22.26.05_picture-0_01.png' FROM users WHERE email = 'Gilvanbrendo@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Maxim vlasov', 'maksikipapa@gmail.com', '$2b$12$ZCtDEWF/Y2MrenKGtjCrp.vbx/J.g/RmHisZcrVpHVefOjynmLc7O', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'maksikipapa@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Qwer', 'Qwer', 'Cosmetics /beauty company', 'Manager', '7144838', 'Maxim vlasov', 'male', '15627620273', 'Guangzhou', '', 'meeting', 'maksikipapa@gmail.com'
FROM users WHERE email = 'maksikipapa@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Maxim_2026-08-31 22.30.20_IMG_2876_01.jpeg' FROM users WHERE email = 'maksikipapa@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Maxim_2026-08-31 22.30.20_695_01.jpeg' FROM users WHERE email = 'maksikipapa@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Maxim_2026-08-31 22.30.20_IMG_2876_01.jpeg' FROM users WHERE email = 'maksikipapa@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Maxim_2026-08-31 22.30.20_IMG_2876_01.jpeg' FROM users WHERE email = 'maksikipapa@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Maxim_2026-08-31 22.30.20_D7796572-5848-4E8F-830D-AAEA1F46B628_01.jpeg' FROM users WHERE email = 'maksikipapa@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Aamir khan', 'gobuy.guangzhou@gmail.com', '$2b$12$A8ohNI0RzhaDv0ymTYtFceAxNBxn5ws1LSTTNG.uEtZlTI.8ivDGC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'gobuy.guangzhou@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Go-Buy', 'Tianhe Guangzhou', 'Distributor/Import-Export', 'CEO', 'CW4127244', 'Aamir khan', 'male', '17352401817', 'Guangzhou', '', 'visiting', 'gobuy.guangzhou@gmail.com'
FROM users WHERE email = 'gobuy.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Aamir_2026-08-31 22.30.37_a8e3f3400f9398e6a5063f1c3f024c07_01.jpeg' FROM users WHERE email = 'gobuy.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Aamir_2026-08-31 22.30.37_558_01.jpeg' FROM users WHERE email = 'gobuy.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Aamir_2026-08-31 22.30.37_599_01.jpeg' FROM users WHERE email = 'gobuy.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Aamir_2026-08-31 22.30.37_cf93dc7701e51ed1e6e0d3180287a41b_01.jpeg' FROM users WHERE email = 'gobuy.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Aamir_2026-08-31 22.30.37_59d49818dc59ba6a7f2e4e17d1632190_01.jpeg' FROM users WHERE email = 'gobuy.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Alirezaabasifard', 'alirezaabasifard917@gmail.com', '$2b$12$47VAYF2zZYOTkVbNoz2jwuQOH7SaXbUSbPRGLN.h2KfgViuZUoGgi', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'alirezaabasifard917@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Rayka', 'Iran-tehran', 'Cosmetics /beauty company', 'Manager', 'N59211316', 'Alirezaabasifard', 'male', '15875341068', 'Guangzhou', '', 'meeting', 'alirezaabasifard917@gmail.com'
FROM users WHERE email = 'alirezaabasifard917@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Alireza.AB_2026-08-31 22.33.51_IMG_7709_01.png' FROM users WHERE email = 'alirezaabasifard917@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Alireza.AB_2026-08-31 22.33.51_IMG_7708_01.png' FROM users WHERE email = 'alirezaabasifard917@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Alireza.AB_2026-08-31 22.33.51_image_01.jpg' FROM users WHERE email = 'alirezaabasifard917@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Alireza.AB_2026-08-31 22.33.51_1424_01.jpeg' FROM users WHERE email = 'alirezaabasifard917@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Alireza.AB_2026-08-31 22.33.51_image_01.jpg' FROM users WHERE email = 'alirezaabasifard917@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Mohammad Abir Hasan', 'mdabirhasan657@gmail.com', '$2b$12$nukQUO08xNYP1bwKmI2xfeB00ppTNSpghT1pNrJXgaftZdw4G2Gje', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'mdabirhasan657@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Aark Mould Engineering Ltd', 'Sylhet, Bangladesh', 'Machinery/Equipments/Automation', 'International Sales', 'A04727517', 'Mohammad Abir Hasan', 'male', '19196302251', 'Guangzhou', '', 'meeting', 'mdabirhasan657@gmail.com'
FROM users WHERE email = 'mdabirhasan657@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Hasan_哈森_2026-08-31 22.35.36_4741674c7dbbf2c298a47dd3355b54b2_01.jpeg' FROM users WHERE email = 'mdabirhasan657@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Hasan_哈森_2026-08-31 22.35.36_IMG_9661_01.jpeg' FROM users WHERE email = 'mdabirhasan657@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Hasan_哈森_2026-08-31 22.35.36_1222_01.jpeg' FROM users WHERE email = 'mdabirhasan657@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Hasan_哈森_2026-08-31 22.35.36_23_01.jpeg' FROM users WHERE email = 'mdabirhasan657@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Hasan_哈森_2026-08-31 22.35.36_aa7085424624c100491d93bfd744573b_01.jpeg' FROM users WHERE email = 'mdabirhasan657@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Zaheer Sahibzada Muhammad', 'Zaheer.6311@gmail.com', '$2b$12$xwTqkCvR/dLpxxbrp609/.lUvwFxeOA52gAMt2HbYkrt4kx.Kh5ZG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Zaheer.6311@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Smart choice', 'Swabi,Pakistan', 'Distributor/Import-Export', 'Manager', 'DP5120414', 'Zaheer Sahibzada Muhammad', 'male', '13126462044', 'Guangzhou', '', 'meeting', 'Zaheer.6311@gmail.com'
FROM users WHERE email = 'Zaheer.6311@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Happy(张佐)_2026-08-31 22.38.21_IMG_1536_01.jpeg' FROM users WHERE email = 'Zaheer.6311@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Happy(张佐)_2026-08-31 22.38.21_IMG_6851_01.jpeg' FROM users WHERE email = 'Zaheer.6311@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Happy(张佐)_2026-08-31 22.38.21_IMG_7262_01.jpeg' FROM users WHERE email = 'Zaheer.6311@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Happy(张佐)_2026-08-31 22.38.21_IMG_7262_01.jpeg' FROM users WHERE email = 'Zaheer.6311@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Happy(张佐)_2026-08-31 22.38.21_2CC41583-37E1-4A7C-9A83-C7E4F60B78EE_01.png' FROM users WHERE email = 'Zaheer.6311@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'ZARİNA BEISEMBEKOVA', 'andel_devil@mail.ru', '$2b$12$55khDcW7MgJK.NsuvIg7MOODwtUu/A6lmzun7msCfQucU9SCXk2Mi', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'andel_devil@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Zara compani', 'Respubliki 21', 'Cosmetics /beauty company', 'Boss', 'N13940741', 'ZARİNA BEISEMBEKOVA', 'female', '13060782664', 'Guangzhou', '', 'visiting', 'andel_devil@mail.ru'
FROM users WHERE email = 'andel_devil@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'ZARA_2026-08-31 22.42.03_IMG_0238_01.jpeg' FROM users WHERE email = 'andel_devil@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'ZARA_2026-08-31 22.42.03_29ab9b8d-a96b-4591-90c2-f5e25012b7ef_01.jpeg' FROM users WHERE email = 'andel_devil@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'ZARA_2026-08-31 22.42.03_IMG_6662_01.png' FROM users WHERE email = 'andel_devil@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'ZARA_2026-08-31 22.42.03_12fbcf66-d8af-4cf5-a841-ad7a61a71faf_01.JPG' FROM users WHERE email = 'andel_devil@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'ZARA_2026-08-31 22.42.03_IMG_8569_01.JPG' FROM users WHERE email = 'andel_devil@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'BATYRZHAN KALIYEV', 'kalievbatyrzan@gmail.com', '$2b$12$tvk0HGUDGS.KpEz580BIm.ip/7eP2hU16P2kUwvXmJ3tSBcDJEm1q', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kalievbatyrzan@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'mandarin', 'mandarin', 'Market Analysis/Investment', 'директор', '13058141', 'BATYRZHAN KALIYEV', 'male', '13016018640', 'Guangzhou', '', 'visiting', 'kalievbatyrzan@gmail.com'
FROM users WHERE email = 'kalievbatyrzan@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Батыр_2026-08-31 22.43.27_IMG_4667_01.jpeg' FROM users WHERE email = 'kalievbatyrzan@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Батыр_2026-08-31 22.43.27_IMG_4671_01.jpeg' FROM users WHERE email = 'kalievbatyrzan@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Батыр_2026-08-31 22.43.27_IMG_4671_01.jpeg' FROM users WHERE email = 'kalievbatyrzan@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Батыр_2026-08-31 22.43.27_IMG_4678_01.jpeg' FROM users WHERE email = 'kalievbatyrzan@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Батыр_2026-08-31 22.43.27_IMG_4678_01.jpeg' FROM users WHERE email = 'kalievbatyrzan@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Kayastha Sandesh', 'sandeshkayastha1@gmail.com', '$2b$12$M6Xu8G9RC7HJAF.0iPpwxuvrcs8pFSRjdkFKA3HtDfkKuZ./4ySlq', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sandeshkayastha1@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Allen Traders', 'Kathmandu,nepal', 'Pharma Manufacturers', 'Manager', 'PA2764247', 'Kayastha Sandesh', 'male', '15622206758', 'Guangzhou', '', 'visiting', 'sandeshkayastha1@gmail.com'
FROM users WHERE email = 'sandeshkayastha1@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Sandesh 孙德_2026-08-31 22.52.55_picture-0_01.png' FROM users WHERE email = 'sandeshkayastha1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Sandesh 孙德_2026-08-31 22.52.55_picture-0_01.png' FROM users WHERE email = 'sandeshkayastha1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Sandesh 孙德_2026-08-31 22.52.55_picture-0_01.png' FROM users WHERE email = 'sandeshkayastha1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Sandesh 孙德_2026-08-31 22.52.55_picture-0_01.png' FROM users WHERE email = 'sandeshkayastha1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Sandesh 孙德_2026-08-31 22.52.55_picture-0_01.png' FROM users WHERE email = 'sandeshkayastha1@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'N11970165', 'herecomesthesun@bk.ru', '$2b$12$3b6A8D2ejsC7tfnLlpRy2OJ1spwqT0jIIkujkD4i4jUY7edQr/7hu', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'herecomesthesun@bk.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Savvasim', 'Kazakhstan', 'Food/Beverages/Neutraceutical', 'CEO', 'N11970165', 'N11970165', 'male', '15820411420', 'Shenzhen', '', 'meeting', 'herecomesthesun@bk.ru'
FROM users WHERE email = 'herecomesthesun@bk.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Savva 萨瓦_2026-08-31 23.19.52_54441097-e7eb-494d-ab9e-bd37a114132b_01.jpeg' FROM users WHERE email = 'herecomesthesun@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Savva 萨瓦_2026-08-31 23.19.52_IMG_1441_01.jpeg' FROM users WHERE email = 'herecomesthesun@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Savva 萨瓦_2026-08-31 23.19.52_056876F8-3EC0-4896-B4C4-7867BF57E89D_01.png' FROM users WHERE email = 'herecomesthesun@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Savva 萨瓦_2026-08-31 23.19.52_056876F8-3EC0-4896-B4C4-7867BF57E89D_01.png' FROM users WHERE email = 'herecomesthesun@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Savva 萨瓦_2026-08-31 23.19.52_IMG_2388_01.jpeg' FROM users WHERE email = 'herecomesthesun@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Asthana Animesh', 'expo.china.guangzhou@gmail.com', '$2b$12$4xKtR49tErqdek8HwmaqdeSdBabadl5iOewU9xe9z4xmEsELQfNnu', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'expo.china.guangzhou@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Global Tradings', 'Kathmandu', 'Food/Beverages/Neutraceutical', 'Manufacturer Head', 'PA2470908', 'Asthana Animesh', 'male', '15622195707', 'Guangzhou', '', 'visiting', 'expo.china.guangzhou@gmail.com'
FROM users WHERE email = 'expo.china.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Animesh_2026-08-31 23.51.25_picture-0_01.png' FROM users WHERE email = 'expo.china.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Animesh_2026-08-31 23.51.25_picture-0_01.png' FROM users WHERE email = 'expo.china.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Animesh_2026-08-31 23.51.25_picture-0_01.png' FROM users WHERE email = 'expo.china.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Animesh_2026-08-31 23.51.25_picture-0_01.png' FROM users WHERE email = 'expo.china.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Animesh_2026-08-31 23.51.25_picture-0_01.png' FROM users WHERE email = 'expo.china.guangzhou@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Syed Akhtar Rasool Shah', 'akhtarshah47@gmail.com', '$2b$12$h5w0lAmb0J2TmBsUfE1NyOZOk4t8DgUwkUaF5CEfR3qVLcgQ5pCXm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'akhtarshah47@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Shah enterprises', 'Valencia road, Shah enterprises, Lahore, Pakistan', 'Distributor/Import-Export', 'Business Director', 'UH5147352', 'Syed Akhtar Rasool Shah', 'male', '18620726134', 'Guangzhou', '', 'visiting', 'akhtarshah47@gmail.com'
FROM users WHERE email = 'akhtarshah47@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Shah_2026-09-01 00.08.58_6108_01.jpeg' FROM users WHERE email = 'akhtarshah47@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Shah_2026-09-01 00.08.58_5630_01.jpeg' FROM users WHERE email = 'akhtarshah47@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Shah_2026-09-01 00.08.58_5628_01.jpeg' FROM users WHERE email = 'akhtarshah47@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Shah_2026-09-01 00.08.58_14_01.jpeg' FROM users WHERE email = 'akhtarshah47@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Shah_2026-09-01 00.08.58_IMG_0327_01.jpeg' FROM users WHERE email = 'akhtarshah47@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'JULIANO DA SILVA', 'Fc116br@gmail.com', '$2b$12$pj1m.gi8PwxPaNu2UUcJrelhd0YxuxF5f8dKt2fNb91Bd3WBWOM4i', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Fc116br@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'FC116BR', 'São Paulo', 'Distributor/Import-Export', 'CEO', 'YC786469', 'JULIANO DA SILVA', 'male', '18319032367', 'Shenzhen', '', 'meeting', 'Fc116br@gmail.com'
FROM users WHERE email = 'Fc116br@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Juca Grajaú_2026-09-01 00.25.27_6009394e-4619-4b0f-97d7-3659a2d322b8_01.jpeg' FROM users WHERE email = 'Fc116br@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Juca Grajaú_2026-09-01 00.25.27_IMG_6534_01.jpeg' FROM users WHERE email = 'Fc116br@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Juca Grajaú_2026-09-01 00.25.27_1437_01.jpeg' FROM users WHERE email = 'Fc116br@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Juca Grajaú_2026-09-01 00.25.27_image_01.jpg' FROM users WHERE email = 'Fc116br@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Juca Grajaú_2026-09-01 00.25.27_IMG_6228_01.jpeg' FROM users WHERE email = 'Fc116br@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Jaqueline da Silva', 'Fragranciasalaodebele@gmail.com', '$2b$12$VEXnmO1zrwJGK7R35EpDHemOfOFNB1A1TMHAaIkes6tWBDvUbmYpy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Fragranciasalaodebele@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Fragrância Salão de Beleza', 'São Paulo', 'Cosmetics /beauty company', 'Jaqueline da Silva', 'YF418794', 'Jaqueline da Silva', 'female', '13823601144', 'Shenzhen', '', 'meeting', 'Fragranciasalaodebele@gmail.com'
FROM users WHERE email = 'Fragranciasalaodebele@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'JackieHairstylist Hairtherapist_2026-09-01 00.30.21_IMG_3686_01.jpeg' FROM users WHERE email = 'Fragranciasalaodebele@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'JackieHairstylist Hairtherapist_2026-09-01 00.30.21_IMG_3685_01.jpeg' FROM users WHERE email = 'Fragranciasalaodebele@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'JackieHairstylist Hairtherapist_2026-09-01 00.30.21_IMG_3697_01.png' FROM users WHERE email = 'Fragranciasalaodebele@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'JackieHairstylist Hairtherapist_2026-09-01 00.30.21_IMG_3698_01.jpeg' FROM users WHERE email = 'Fragranciasalaodebele@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'JackieHairstylist Hairtherapist_2026-09-01 00.30.21_26BF98E9-B8E8-4E94-BD08-2BDF57EB07F1_01.jpeg' FROM users WHERE email = 'Fragranciasalaodebele@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'TAKKA SHAHI', 'shahisanjok12345@gmail.com', '$2b$12$La18tcQ0MP4KiV1idpmzYeh4quYCmb3M2fQnzrQUWJMyfSsHk1j2y', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'shahisanjok12345@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Shahi traders', 'Kathmandu Nepal', 'Pharma Sales', 'Manager', 'PA2889775', 'TAKKA SHAHI', 'male', '15622329044', 'Guangzhou', '', 'meeting', 'shahisanjok12345@gmail.com'
FROM users WHERE email = 'shahisanjok12345@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Takka shahi_2026-09-01 00.34.42_68d23531ee2944f011dca4949c3bce2a_01.jpeg' FROM users WHERE email = 'shahisanjok12345@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Takka shahi_2026-09-01 00.34.42_12_01.jpeg' FROM users WHERE email = 'shahisanjok12345@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Takka shahi_2026-09-01 00.34.42_13_01.jpeg' FROM users WHERE email = 'shahisanjok12345@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Takka shahi_2026-09-01 00.34.42_13_01.jpeg' FROM users WHERE email = 'shahisanjok12345@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Takka shahi_2026-09-01 00.34.42_15_01.jpeg' FROM users WHERE email = 'shahisanjok12345@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Irfan  idrees', 'IrfanAdress313@gmail.com', '$2b$12$9iw8SjKbXv68GLRMjd.cAObSzVRCyXRnq6HDxONAmCcaMDZwrP9VO', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'IrfanAdress313@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Irfan trading company', '4th Floor, 402 Xingtai Watch City, Guangyuan West Road, Yuexiu District, Guangzhou City', 'Cosmetics /beauty company', 'CEO', 'Ak1424183', 'Irfan  idrees', 'male', '15818133640', 'Guangzhou', '', 'meeting', 'IrfanAdress313@gmail.com'
FROM users WHERE email = 'IrfanAdress313@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Trade Bridge_2026-09-01 00.57.45_picture-0_01.png' FROM users WHERE email = 'IrfanAdress313@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Trade Bridge_2026-09-01 00.57.45_picture-0_01.png' FROM users WHERE email = 'IrfanAdress313@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Trade Bridge_2026-09-01 00.57.45_picture-0_01.png' FROM users WHERE email = 'IrfanAdress313@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Trade Bridge_2026-09-01 00.57.45_picture-0_01.png' FROM users WHERE email = 'IrfanAdress313@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Trade Bridge_2026-09-01 00.57.45_picture-0_01.png' FROM users WHERE email = 'IrfanAdress313@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Amirhossein Karamoozian', 'ah_karamoozian@yahoo.com', '$2b$12$cykF8Pc3E5iZ6caqquKkkO1Ylx7v/WJLt0U2.nk6/OP1KCqxD4JTq', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ah_karamoozian@yahoo.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'SHAB-TEJRAT TRADING COMPANY', 'Tehran, Iran', 'Distributor/Import-Export', 'Business Manager', 'U97721251', 'Amirhossein Karamoozian', 'male', '17805659441', 'Shenzhen', '', 'meeting', 'ah_karamoozian@yahoo.com'
FROM users WHERE email = 'ah_karamoozian@yahoo.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'A.K.(阿米尔)_2026-09-01 09.19.40_passport_01.jpg' FROM users WHERE email = 'ah_karamoozian@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'A.K.(阿米尔)_2026-09-01 09.19.40_2_01.jpg' FROM users WHERE email = 'ah_karamoozian@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'A.K.(阿米尔)_2026-09-01 09.19.40_Amirhossein Karamoozian_01.jpg' FROM users WHERE email = 'ah_karamoozian@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'A.K.(阿米尔)_2026-09-01 09.19.40_Business License SHAB TEJRAT_01.jpg' FROM users WHERE email = 'ah_karamoozian@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'A.K.(阿米尔)_2026-09-01 09.19.40_Amir_01.jpg' FROM users WHERE email = 'ah_karamoozian@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Fabricio Gabriel Teixeira da Silva', 'fagatesil@gmail.com', '$2b$12$ZbXk61tHIhvMJuTj6u1eJesMMVH5qi5G4SMfJ5SJ/1OhqLobLl9Qy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'fagatesil@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'FC116 Brasil', 'Av. Gregório Bezerra, 451
Jardim Primavera 
São Paulo - SP
CEP 04812-200', 'Pharma Sales', 'Manager', 'GJ111276', 'Fabricio Gabriel Teixeira da Silva', 'male', '19964303014', 'Shenzhen', '', 'visiting', 'fagatesil@gmail.com'
FROM users WHERE email = 'fagatesil@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Gabriel小鱼_2026-09-01 09.22.34_abda17c6a58519219e45a3d2b6a019c0_01.jpeg' FROM users WHERE email = 'fagatesil@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Gabriel小鱼_2026-09-01 09.22.34_VistoFabricio_1_01.jpeg' FROM users WHERE email = 'fagatesil@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Gabriel小鱼_2026-09-01 09.22.34_DA96725D-9B38-42AB-B01C-F052B50B481A_01.png' FROM users WHERE email = 'fagatesil@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Gabriel小鱼_2026-09-01 09.22.34_53_01.jpeg' FROM users WHERE email = 'fagatesil@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Gabriel小鱼_2026-09-01 09.22.34_IMG_3767_01.jpeg' FROM users WHERE email = 'fagatesil@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ali Karamouzian', 'alikaramouzian937@gmail.com', '$2b$12$DNo4ZK8E7CHNgjL93XqvreSLOdAC0iAEpMOolodhdzTGIjUIniU9C', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'alikaramouzian937@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'TOLIDDARU Company', 'No. 45, Unit 3, Corner of Alley 12, Jomhouri Eslami Blvd, Yazd, Iran', 'Distributor/Import-Export', 'Business Manager', 'U67086107', 'Ali Karamouzian', 'male', '18614019799', 'Shenzhen', '', 'meeting', 'alikaramouzian937@gmail.com'
FROM users WHERE email = 'alikaramouzian937@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Athareh_2026-09-01 09.29.51_2_01.jpg' FROM users WHERE email = 'alikaramouzian937@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Athareh_2026-09-01 09.29.51_VISA_01.jpg' FROM users WHERE email = 'alikaramouzian937@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Athareh_2026-09-01 09.29.51_Business Card daru_01.png' FROM users WHERE email = 'alikaramouzian937@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Athareh_2026-09-01 09.29.51_Business License daru_01.png' FROM users WHERE email = 'alikaramouzian937@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Athareh_2026-09-01 09.29.51_IMG_8896_01.jpg' FROM users WHERE email = 'alikaramouzian937@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Athareh Rangavar', '13352782441@163.com', '$2b$12$jqbXph5qM9kA0zRRBZY7d.PTKWFsSFLCiOt9gLEOeL.DY9t0l8W96', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '13352782441@163.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'IRANDARU company', 'Tehran, Iran', 'Distributor/Import-Export', 'Business Manager', 'U67086125', 'Athareh Rangavar', 'female', '13352782441', 'Shenzhen', '', 'meeting', '13352782441@163.com'
FROM users WHERE email = '13352782441@163.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'ali_2026-09-01 09.38.30_1_01.jpg' FROM users WHERE email = '13352782441@163.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'ali_2026-09-01 09.38.30_VISA_01.jpg' FROM users WHERE email = '13352782441@163.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'ali_2026-09-01 09.38.30_business card daru_01.png' FROM users WHERE email = '13352782441@163.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'ali_2026-09-01 09.38.30_Business License daru_01.png' FROM users WHERE email = '13352782441@163.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'ali_2026-09-01 09.38.30_IMG_8894a_01.jpg' FROM users WHERE email = '13352782441@163.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Sidnei Roberson Galvão Filho', 'sid.galvao@hotmail.com', '$2b$12$xVa6jxGsLfn9xpAYEZ3are3cPzBmF2mmWMxEEGHUPOji79EAHUCoW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sid.galvao@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, '116 Brasil', 'Brasil', 'Distributor/Import-Export', 'Manager', 'FZ575497', 'Sidnei Roberson Galvão Filho', 'male', '18813647741', 'Shenzhen', '', 'visiting', 'sid.galvao@hotmail.com'
FROM users WHERE email = 'sid.galvao@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Sidnei Galvão 🇧🇷_2026-09-01 09.59.33_picture-0_01.png' FROM users WHERE email = 'sid.galvao@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Sidnei Galvão 🇧🇷_2026-09-01 09.59.33_picture-0_01.png' FROM users WHERE email = 'sid.galvao@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Sidnei Galvão 🇧🇷_2026-09-01 09.59.33_picture-0_01.png' FROM users WHERE email = 'sid.galvao@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Sidnei Galvão 🇧🇷_2026-09-01 09.59.33_picture-0_01.png' FROM users WHERE email = 'sid.galvao@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Sidnei Galvão 🇧🇷_2026-09-01 09.59.33_picture-0_01.png' FROM users WHERE email = 'sid.galvao@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Morhunovska Olha', 'o.movfdsgh@ggh.com', '$2b$12$oKZyV2RCFB4o79NHFwis7O9sJBT9xaVtZjGnA0UWERsBLQ11hzhgC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'o.movfdsgh@ggh.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'code17', 'Tel- aviv', 'Pharma Sales', 'dir', 'pu941074', 'Morhunovska Olha', 'female', '19502031167', 'Shenzhen', '', 'meeting', 'o.movfdsgh@ggh.com'
FROM users WHERE email = 'o.movfdsgh@ggh.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Olha Morhunovska_2026-09-01 10.17.05_image_01.jpg' FROM users WHERE email = 'o.movfdsgh@ggh.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Olha Morhunovska_2026-09-01 10.17.05_image_01.jpg' FROM users WHERE email = 'o.movfdsgh@ggh.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Olha Morhunovska_2026-09-01 10.17.05_image_01.jpg' FROM users WHERE email = 'o.movfdsgh@ggh.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Olha Morhunovska_2026-09-01 10.17.05_image_01.jpg' FROM users WHERE email = 'o.movfdsgh@ggh.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Olha Morhunovska_2026-09-01 10.17.05_bbcb66e5c56da3b674e0f34bc44e36ca_01.jpeg' FROM users WHERE email = 'o.movfdsgh@ggh.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Mariya Rodkina', 'eva.Mariya.neyu@gmail.com', '$2b$12$NN.AGa3zuyaQY48EjKCWieg4x0ussEo8QHYnS5xnln7GXLHwmyldy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'eva.Mariya.neyu@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'NAT GUANGZHOU INTERNATIONAL TRADE CO', 'Azerbaijan, Baku, Asif Magerramov 23, ap.3', 'Supply chain', 'Director', 'C03224140', 'Mariya Rodkina', 'female', '13250234371', 'Guangzhou', '', 'meeting', 'eva.Mariya.neyu@gmail.com'
FROM users WHERE email = 'eva.Mariya.neyu@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'MIA 王_2026-09-01 10.52.25_picture-0_01.png' FROM users WHERE email = 'eva.Mariya.neyu@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'MIA 王_2026-09-01 10.52.25_picture-0_01.png' FROM users WHERE email = 'eva.Mariya.neyu@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'MIA 王_2026-09-01 10.52.25_picture-0_01.png' FROM users WHERE email = 'eva.Mariya.neyu@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'MIA 王_2026-09-01 10.52.25_picture-0_01.png' FROM users WHERE email = 'eva.Mariya.neyu@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'MIA 王_2026-09-01 10.52.25_picture-0_01.png' FROM users WHERE email = 'eva.Mariya.neyu@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'OGNEVA IRINA', 'irina.ogneva2013@yandex.com', '$2b$12$EzEITel6u49RN8k16eGY3uepE4/pxlp0P1cMgiCkn.JPFX/T91Hoy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'irina.ogneva2013@yandex.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guangzhou Ogrina trading.ltd', 'Guangzhou', 'Distributor/Import-Export', 'Director', '550516115', 'OGNEVA IRINA', 'female', '15914336312', 'Guangzhou', '', 'meeting', 'irina.ogneva2013@yandex.com'
FROM users WHERE email = 'irina.ogneva2013@yandex.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Irina雨兰Gargo_2026-09-01 11.14.49_picture-0_01.png' FROM users WHERE email = 'irina.ogneva2013@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Irina雨兰Gargo_2026-09-01 11.14.49_picture-0_01.png' FROM users WHERE email = 'irina.ogneva2013@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Irina雨兰Gargo_2026-09-01 11.14.49_picture-0_01.png' FROM users WHERE email = 'irina.ogneva2013@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Irina雨兰Gargo_2026-09-01 11.14.49_picture-0_01.png' FROM users WHERE email = 'irina.ogneva2013@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Irina雨兰Gargo_2026-09-01 11.14.49_picture-0_01.png' FROM users WHERE email = 'irina.ogneva2013@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Iasmin Muniz', 'Boulderiasmin.02@gmail.com', '$2b$12$UHDOedlUMd9qL6klLk9GS.Um49V4KzMxl10ZgRohNqY.pS7Lxknem', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Boulderiasmin.02@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'IQ tennis', 'Www.IQtennis.com', 'Machinery/Equipments/Automation', 'Busy', 'Yc3913526', 'Iasmin Muniz', 'female', '18620879375', 'Shenzhen', '', 'visiting', 'Boulderiasmin.02@gmail.com'
FROM users WHERE email = 'Boulderiasmin.02@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Iasmin 🇧🇷🇮🇹_2026-09-01 12.18.57_ec24713d-d714-4432-8118-33029bcb87bb_01.jpeg' FROM users WHERE email = 'Boulderiasmin.02@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Iasmin 🇧🇷🇮🇹_2026-09-01 12.18.57_IMG_2926_01.jpeg' FROM users WHERE email = 'Boulderiasmin.02@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Iasmin 🇧🇷🇮🇹_2026-09-01 12.18.57_F6346608-8955-4D54-9A9F-A57C1C604403_01.png' FROM users WHERE email = 'Boulderiasmin.02@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Iasmin 🇧🇷🇮🇹_2026-09-01 12.18.57_1253_01.jpeg' FROM users WHERE email = 'Boulderiasmin.02@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Iasmin 🇧🇷🇮🇹_2026-09-01 12.18.57_IMG_3639_01.jpeg' FROM users WHERE email = 'Boulderiasmin.02@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Yuzhakova maria', 'You_pro@internet.ru', '$2b$12$ub8Uh4hxNSif7dGchB/Aj.FvFLGqETxS85FI8B/iTjOLJDuFV7cWS', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'You_pro@internet.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Pixel', 'Russia, Barnaul', 'Machinery/Equipments/Automation', 'Founder', '670249769', 'Yuzhakova maria', 'female', '15529349035', 'Guangzhou', '', 'meeting', 'You_pro@internet.ru'
FROM users WHERE email = 'You_pro@internet.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'YuzhMS_2026-09-01 13.37.25_picture-0_01.png' FROM users WHERE email = 'You_pro@internet.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'YuzhMS_2026-09-01 13.37.25_picture-0_01.png' FROM users WHERE email = 'You_pro@internet.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'YuzhMS_2026-09-01 13.37.25_picture-0_01.png' FROM users WHERE email = 'You_pro@internet.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'YuzhMS_2026-09-01 13.37.25_picture-0_01.png' FROM users WHERE email = 'You_pro@internet.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'YuzhMS_2026-09-01 13.37.25_picture-0_01.png' FROM users WHERE email = 'You_pro@internet.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'VONSHINIAN LIADZHEB', 'leha.93_kg@mail.ru', '$2b$12$0w1xKZfQXv8NrBjG7Fg/iuFazzI5LjZcqmR4SsJSt9x8Bl9aJ9Ip6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'leha.93_kg@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guanzhou Xinfu co.ltd', '广州市白云区江高镇中铁诺德阅泷8栋', 'Pharma Manufacturers', 'Director', '664956389', 'VONSHINIAN LIADZHEB', 'male', '19878847708', 'Guangzhou', '', 'meeting', 'leha.93_kg@mail.ru'
FROM users WHERE email = 'leha.93_kg@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'leha 王飞龙_2026-09-01 13.57.51_IMG_9214_01.jpeg' FROM users WHERE email = 'leha.93_kg@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'leha 王飞龙_2026-09-01 13.57.51_IMG_2627_01.jpeg' FROM users WHERE email = 'leha.93_kg@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'leha 王飞龙_2026-09-01 13.57.51_IMG_5534_01.jpeg' FROM users WHERE email = 'leha.93_kg@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'leha 王飞龙_2026-09-01 13.57.51_288e569d5e3c8630bb85806ff84892f5_01.jpeg' FROM users WHERE email = 'leha.93_kg@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'leha 王飞龙_2026-09-01 13.57.51_Photoroom_20240430_123039_01.jpeg' FROM users WHERE email = 'leha.93_kg@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Mirza rizwan khalid', 'lfu_rm@yahoo.com', '$2b$12$/cQQXxKSLZNYQvF9pBUtfuAvptfw0LW.ZFpnd3.Yc7LtpVhsf5O2C', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'lfu_rm@yahoo.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'World traders co', 'Ganpat road lahore Pakistan', 'Distributor/Import-Export', 'Manager', 'BR4102014', 'Mirza rizwan khalid', 'male', '15818163804', 'Guangzhou', '', 'visiting', 'lfu_rm@yahoo.com'
FROM users WHERE email = 'lfu_rm@yahoo.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'DaniMirza_2026-09-01 14.13.37_CamScanner 07-03-2026 07.19_1_01.jpeg' FROM users WHERE email = 'lfu_rm@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'DaniMirza_2026-09-01 14.13.37_CamScanner 2026-08-12 10.35_1_01.jpeg' FROM users WHERE email = 'lfu_rm@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'DaniMirza_2026-09-01 14.13.37_CamScanner 2026-04-22 15.13_1_01.jpeg' FROM users WHERE email = 'lfu_rm@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'DaniMirza_2026-09-01 14.13.37_CamScanner 2026-04-22 15.13_1_01.jpeg' FROM users WHERE email = 'lfu_rm@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'DaniMirza_2026-09-01 14.13.37_IMG_4782_01.jpeg' FROM users WHERE email = 'lfu_rm@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Gillani Efzal Hussain', 'gzsmartco@gmail.com', '$2b$12$kBE70IXPhm9AFDAGe9bVwu8Z1Cwoa5z3NnHlBErAIAACRlZvGWZZO', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'gzsmartco@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'GZ Smartco', 'Xintang zhengchen 402', 'Distributor/Import-Export', 'CEO', 'AF4702073', 'Gillani Efzal Hussain', 'male', '13711607678', 'Guangzhou', '', 'visiting', 'gzsmartco@gmail.com'
FROM users WHERE email = 'gzsmartco@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Hussain (EFFY)🇵🇰🇨🇳_2026-09-01 14.36.07_IMG_7149_01.jpeg' FROM users WHERE email = 'gzsmartco@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Hussain (EFFY)🇵🇰🇨🇳_2026-09-01 14.36.07_IMG_6820_01.jpeg' FROM users WHERE email = 'gzsmartco@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Hussain (EFFY)🇵🇰🇨🇳_2026-09-01 14.36.07_2095_01.jpeg' FROM users WHERE email = 'gzsmartco@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Hussain (EFFY)🇵🇰🇨🇳_2026-09-01 14.36.07_2095_01.jpeg' FROM users WHERE email = 'gzsmartco@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Hussain (EFFY)🇵🇰🇨🇳_2026-09-01 14.36.07_IMG_4570_01.jpeg' FROM users WHERE email = 'gzsmartco@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'AHMED AQIB', 'aki4china@gmail.com', '$2b$12$QVC9EqrQpUmMRDI3looSVOXm..UisOJw/4uHwX8sxGnLEO9kkz6Um', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aki4china@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'GUANGZHOU TRADING CO.LTD', '4th floor,402xingtai watch city yuexiu District Guangzhou', 'Market Analysis/Investment', 'MARKETING MANAGER', 'PG1156983', 'AHMED AQIB', 'male', '13605940786', 'Guangzhou', '', 'visiting', 'aki4china@gmail.com'
FROM users WHERE email = 'aki4china@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Aki_2026-09-01 14.45.26_picture-0_01.png' FROM users WHERE email = 'aki4china@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Aki_2026-09-01 14.45.26_picture-0_01.png' FROM users WHERE email = 'aki4china@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Aki_2026-09-01 14.45.26_picture-0_01.png' FROM users WHERE email = 'aki4china@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Aki_2026-09-01 14.45.26_picture-0_01.png' FROM users WHERE email = 'aki4china@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Aki_2026-09-01 14.45.26_picture-0_01.png' FROM users WHERE email = 'aki4china@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Laura Sakenova', 'Laurita_92@mail.ru', '$2b$12$fqrNeY7I5PI2W663IadkZOIQqiZ9oasgIjHcUztrz19NlAg/lkmk6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Laurita_92@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Tezco Trade', 'Almaty, Zhambula 50', 'Pharma Sales', 'Purchase manager', 'N12515853', 'Laura Sakenova', 'female', '13250257848', 'Guangzhou', '', 'meeting', 'Laurita_92@mail.ru'
FROM users WHERE email = 'Laurita_92@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Laura 🌸_2026-09-01 14.45.31_ef393c815a234d67b87945e1226dabad_01.jpeg' FROM users WHERE email = 'Laurita_92@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Laura 🌸_2026-09-01 14.45.31_IMG_8173_01.jpeg' FROM users WHERE email = 'Laurita_92@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Laura 🌸_2026-09-01 14.45.31_a652e5d3276a7b3d28c57459d6714421_01.png' FROM users WHERE email = 'Laurita_92@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Laura 🌸_2026-09-01 14.45.31_IMG_2429_01.jpeg' FROM users WHERE email = 'Laurita_92@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Laura 🌸_2026-09-01 14.45.31_IMG_2815-compressed_01.jpeg' FROM users WHERE email = 'Laurita_92@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Younas Muhammad Waseem', 'idreesia@live.com', '$2b$12$c0ws6YiHFx7OZS9Pj31a3.WNGwrotimAZ/5ZjBhuz.yVIsf1Ty3la', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'idreesia@live.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Franchising Key', 'Hong Kong', 'Food/Beverages/Neutraceutical', 'Managing Director', 'BW6900453', 'Younas Muhammad Waseem', 'male', '13724247946', 'Guangzhou', '', 'meeting', 'idreesia@live.com'
FROM users WHERE email = 'idreesia@live.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'M. Waseem_2026-09-01 15.52.43_picture-0_01.png' FROM users WHERE email = 'idreesia@live.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'M. Waseem_2026-09-01 15.52.43_picture-0_01.png' FROM users WHERE email = 'idreesia@live.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'M. Waseem_2026-09-01 15.52.43_picture-0_01.png' FROM users WHERE email = 'idreesia@live.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'M. Waseem_2026-09-01 15.52.43_picture-0_01.png' FROM users WHERE email = 'idreesia@live.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'M. Waseem_2026-09-01 15.52.43_picture-0_01.png' FROM users WHERE email = 'idreesia@live.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'KARPOVYCH ARSENII', 'arseniy2805@mail.ru', '$2b$12$UJb56NFakxCIGXxeVqP0GuMwWvOM5wB5pzO1p76gQNvvQJUnaNjkS', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'arseniy2805@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'ARNI COIL TD', '01001, Kyix, 12 Khrestchaey& Street, Office 405, Ulraisse', 'Machinery/Equipments/Automation', 'Director', 'PU563431', 'KARPOVYCH ARSENII', 'male', '13570936468', 'Guangzhou', '', 'meeting', 'arseniy2805@mail.ru'
FROM users WHERE email = 'arseniy2805@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Arsenii_2026-09-01 16.17.31_IMG_8764_01.jpeg' FROM users WHERE email = 'arseniy2805@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Arsenii_2026-09-01 16.17.31_IMG_3168_01.jpeg' FROM users WHERE email = 'arseniy2805@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Arsenii_2026-09-01 16.17.31_IMG_2909_01.jpeg' FROM users WHERE email = 'arseniy2805@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Arsenii_2026-09-01 16.17.31_IMG_2907_01.jpeg' FROM users WHERE email = 'arseniy2805@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Arsenii_2026-09-01 16.17.31_IMG_5789_01.jpeg' FROM users WHERE email = 'arseniy2805@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Kizitska Anastasiia', 'anastasiia28052010@gmail.com', '$2b$12$7Dv1nuBysdWhFUYfDO2jMuheRNBP0BZQKhgNG3WSPjmQMv2yluqvC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'anastasiia28052010@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Negozio', 'Via del Corso, 15, Roma, Italia', 'Cosmetics /beauty company', 'Manager', 'PU457303', 'Kizitska Anastasiia', 'female', '13650838157', 'Guangzhou', '', 'meeting', 'anastasiia28052010@gmail.com'
FROM users WHERE email = 'anastasiia28052010@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Anastasiiа 🇺🇦 广州_2026-09-01 16.19.45_IMG_2473_01.jpeg' FROM users WHERE email = 'anastasiia28052010@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Anastasiiа 🇺🇦 广州_2026-09-01 16.19.45_IMG_9984_01.jpeg' FROM users WHERE email = 'anastasiia28052010@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Anastasiiа 🇺🇦 广州_2026-09-01 16.19.45_IMG_9443_01.png' FROM users WHERE email = 'anastasiia28052010@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Anastasiiа 🇺🇦 广州_2026-09-01 16.19.45_IMG_9444_01.jpeg' FROM users WHERE email = 'anastasiia28052010@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Anastasiiа 🇺🇦 广州_2026-09-01 16.19.45_IMG_9888_01.jpeg' FROM users WHERE email = 'anastasiia28052010@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'NEOPANE GIRWAN', 'girwanch2024@gmail.com', '$2b$12$wsgA1FP0d9bMQ2jyVKaAc.AjV8s3FjsBQUIGXc/wkSIrONufGJet6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'girwanch2024@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Neopane Traders', 'Kathmandu,Nepal', 'Distributor/Import-Export', 'Manager', 'PA3308222', 'NEOPANE GIRWAN', 'male', '15626494051', 'Guangzhou', '', 'meeting', 'girwanch2024@gmail.com'
FROM users WHERE email = 'girwanch2024@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Girwan Neopane_2026-09-01 16.40.57_1000007719_01.jpeg' FROM users WHERE email = 'girwanch2024@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Girwan Neopane_2026-09-01 16.40.57_IMG_5852_01.jpeg' FROM users WHERE email = 'girwanch2024@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Girwan Neopane_2026-09-01 16.40.57_IMG_2831_01.jpeg' FROM users WHERE email = 'girwanch2024@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Girwan Neopane_2026-09-01 16.40.57_IMG_2831_01.jpeg' FROM users WHERE email = 'girwanch2024@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Girwan Neopane_2026-09-01 16.40.57_IMG_2825_01.jpeg' FROM users WHERE email = 'girwanch2024@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Shiraev Adam', 'Energyadam@yandex.ru', '$2b$12$GYvqTl2Mm1CiOqxhPVrnSuWvRT8XcxwJEnIC66gumcqVhAHuLWcHy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Energyadam@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Swex', 'UAE abu dabi', 'Pharma Manufacturers', 'CEO', '770418993', 'Shiraev Adam', 'male', '15918430982', 'Guangzhou', '', 'meeting', 'Energyadam@yandex.ru'
FROM users WHERE email = 'Energyadam@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Adam Rossi_2026-09-01 17.18.49_IMG_7027_01.jpeg' FROM users WHERE email = 'Energyadam@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Adam Rossi_2026-09-01 17.18.49_IMG_7028_01.jpeg' FROM users WHERE email = 'Energyadam@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Adam Rossi_2026-09-01 17.18.49_IMG_7030_01.png' FROM users WHERE email = 'Energyadam@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Adam Rossi_2026-09-01 17.18.49_IMG_7030_01.png' FROM users WHERE email = 'Energyadam@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Adam Rossi_2026-09-01 17.18.49_IMG_7026_01.jpeg' FROM users WHERE email = 'Energyadam@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'El mahboul ayoub', 'Elmahboulayoub4@gmail.com', '$2b$12$Ua9mAKxUlNv6FJAZUBCzo.fjL9J225LFglHSfiFCIuESkYPCzxcfO', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Elmahboulayoub4@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Attijari', 'Agadir El hay', 'Pharma Sales', 'Manager', 'BV1673150', 'El mahboul ayoub', 'male', '13630195817', 'Guangzhou', '', 'meeting', 'Elmahboulayoub4@gmail.com'
FROM users WHERE email = 'Elmahboulayoub4@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Ayoub - 阿尤布_2026-09-01 18.13.33_IMG_9903_01.jpeg' FROM users WHERE email = 'Elmahboulayoub4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Ayoub - 阿尤布_2026-09-01 18.13.33_IMG_9902_01.jpeg' FROM users WHERE email = 'Elmahboulayoub4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Ayoub - 阿尤布_2026-09-01 18.13.33_1583_01.jpeg' FROM users WHERE email = 'Elmahboulayoub4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Ayoub - 阿尤布_2026-09-01 18.13.33_1583_01.jpeg' FROM users WHERE email = 'Elmahboulayoub4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Ayoub - 阿尤布_2026-09-01 18.13.33_IMG_0798_01.jpeg' FROM users WHERE email = 'Elmahboulayoub4@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'VITALII PAVLENKO', 'vital-82@bk.ru', '$2b$12$s5eL5MwAIwk4ICIa1b101.DN/kMi.wsMJ.uFIdxcakWA4IHJ03em6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vital-82@bk.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Pixel', 'Russia, Barnaul', 'Distributor/Import-Export', 'Manager', '763461673', 'VITALII PAVLENKO', 'male', '15529400953', 'Guangzhou', '', 'meeting', 'vital-82@bk.ru'
FROM users WHERE email = 'vital-82@bk.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Vitalii Pavlenko_2026-09-01 18.34.29_IMG_1108_01.jpeg' FROM users WHERE email = 'vital-82@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Vitalii Pavlenko_2026-09-01 18.34.29_IMG_1108_01.jpeg' FROM users WHERE email = 'vital-82@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Vitalii Pavlenko_2026-09-01 18.34.29_IMG_1289_01.jpeg' FROM users WHERE email = 'vital-82@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Vitalii Pavlenko_2026-09-01 18.34.29_D3F3F978-BD6C-4FF1-A466-387A919815C0_01.webp' FROM users WHERE email = 'vital-82@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Vitalii Pavlenko_2026-09-01 18.34.29_IMG_1289_01.jpeg' FROM users WHERE email = 'vital-82@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Aleshechkina Ekaterina', 'sm2551@mail.ru', '$2b$12$FZN51B.WZs5PTh2IM.U7f.4yVwhoGuiytFzQ811edegHixax/.iqm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sm2551@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'TRIZ GROUP', 'Russia, Krasnoyarsk, Mira Street, 5', 'Cosmetics /beauty company', 'Manager', '77 6669407', 'Aleshechkina Ekaterina', 'female', '18198436307', 'Shenzhen', '', 'meeting', 'sm2551@mail.ru'
FROM users WHERE email = 'sm2551@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Katerina卡佳_2026-09-01 20.50.01_image_01.jpg' FROM users WHERE email = 'sm2551@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Katerina卡佳_2026-09-01 20.50.01_image_01.jpg' FROM users WHERE email = 'sm2551@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Katerina卡佳_2026-09-01 20.50.01_IMG_1761_01.png' FROM users WHERE email = 'sm2551@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Katerina卡佳_2026-09-01 20.50.01_image_01.jpg' FROM users WHERE email = 'sm2551@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Katerina卡佳_2026-09-01 20.50.01_IMG_4675_01.jpeg' FROM users WHERE email = 'sm2551@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Vaskin Valentin', 'darevich1978@yandex.ru', '$2b$12$vTAy/XakCOsB8Y8Qb0aIceL9hKKd/KdFQGYKisNTDXpkuqlBYYj6y', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'darevich1978@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Moses', 'Krasnoyarsk', 'Distributor/Import-Export', 'Director', '77 5862727', 'Vaskin Valentin', 'male', '18198436807', 'Shenzhen', '', 'meeting', 'darevich1978@yandex.ru'
FROM users WHERE email = 'darevich1978@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Valentin_2026-09-01 20.59.17_image_01.jpg' FROM users WHERE email = 'darevich1978@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Valentin_2026-09-01 20.59.17_image_01.jpg' FROM users WHERE email = 'darevich1978@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Valentin_2026-09-01 20.59.17_8ce0986db9a32079f563e275c3e904e7_01.png' FROM users WHERE email = 'darevich1978@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Valentin_2026-09-01 20.59.17_image_01.jpg' FROM users WHERE email = 'darevich1978@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Valentin_2026-09-01 20.59.17_IMG_7027_01.jpeg' FROM users WHERE email = 'darevich1978@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Dorj Ulziibadrakh', 'ulziibadrakh@gmail.com', '$2b$12$R4Bb4YbRmg89ZZUMHxO3Te9TndI1QehKw4Zlb3Pv5LS.d2TyvUQEy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ulziibadrakh@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'BUTrade Co., Ltd', 'Mongolia Ulaanbaatar', 'Food/Beverages/Neutraceutical', 'Director', 'E2905355', 'Dorj Ulziibadrakh', 'male', '18614071172', 'Guangzhou', '', 'visiting', 'ulziibadrakh@gmail.com'
FROM users WHERE email = 'ulziibadrakh@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Ulziibadrakh_Dorj_2026-09-01 21.02.40_picture-0_01.png' FROM users WHERE email = 'ulziibadrakh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Ulziibadrakh_Dorj_2026-09-01 21.02.40_picture-0_01.png' FROM users WHERE email = 'ulziibadrakh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Ulziibadrakh_Dorj_2026-09-01 21.02.40_picture-0_01.png
Ulziibadrakh_Dorj_2026-09-01 21.02.40_picture-0_02.png' FROM users WHERE email = 'ulziibadrakh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Ulziibadrakh_Dorj_2026-09-01 21.02.40_picture-0_01.png' FROM users WHERE email = 'ulziibadrakh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Ulziibadrakh_Dorj_2026-09-01 21.02.40_picture-0_01.png
Ulziibadrakh_Dorj_2026-09-01 21.02.40_picture-0_02.png' FROM users WHERE email = 'ulziibadrakh@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Kseniya Zaitsava', 'tatyana.zhilchik73@gmail.com', '$2b$12$GXlYjju7crxN0dvu7HcVN.qjLKS09Xml9HkejbeDndbFqeGGgxRg2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'tatyana.zhilchik73@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Helix', 'Republic of Belarus, Minsk, Kalinina lane 5a', 'Cosmetics /beauty company', 'Manager', 'MC3965636', 'Kseniya Zaitsava', 'female', '18144642165', 'Shenzhen', '', 'meeting', 'tatyana.zhilchik73@gmail.com'
FROM users WHERE email = 'tatyana.zhilchik73@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'kseniya_2026-09-01 22.03.58_picture-0_01.png' FROM users WHERE email = 'tatyana.zhilchik73@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'kseniya_2026-09-01 22.03.58_picture-0_01.png' FROM users WHERE email = 'tatyana.zhilchik73@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'kseniya_2026-09-01 22.03.58_picture-0_01.png' FROM users WHERE email = 'tatyana.zhilchik73@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'kseniya_2026-09-01 22.03.58_picture-0_01.png' FROM users WHERE email = 'tatyana.zhilchik73@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'kseniya_2026-09-01 22.03.58_picture-0_01.png' FROM users WHERE email = 'tatyana.zhilchik73@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Tsuy Violetta', 'a13711788948@yandex.ru', '$2b$12$sm3U02BlJMFNUCOe1KTqyeUBKDf8oDSBEkpOTQ./I.I9QwnNq9C6G', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'a13711788948@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guang-Jiang', '13711788948', 'Cosmetics /beauty company', 'Manager', 'FA0467317', 'Tsuy Violetta', 'female', '13711788948', 'Guangzhou', '', 'meeting', 'a13711788948@yandex.ru'
FROM users WHERE email = 'a13711788948@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '13711788948_2026-09-01 22.23.02_IMG_7445_01.jpeg' FROM users WHERE email = 'a13711788948@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '13711788948_2026-09-01 22.23.02_IMG_8619_01.jpeg' FROM users WHERE email = 'a13711788948@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '13711788948_2026-09-01 22.23.02_IMG_1362_01.jpeg' FROM users WHERE email = 'a13711788948@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '13711788948_2026-09-01 22.23.02_IMG_5397_01.png' FROM users WHERE email = 'a13711788948@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '13711788948_2026-09-01 22.23.02_f892102c566a6b7debd170ba03a1762b_01.jpeg' FROM users WHERE email = 'a13711788948@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Narine', 'aa13520253909@icloud.com', '$2b$12$nB5Zafp9F.3aC9runQ7zpuCxKBRrwKXPUUwPnPQxcUYqAgbYUmmiG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aa13520253909@icloud.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Nari', 'Nari', 'Cosmetics /beauty company', 'Menedjer', '67n3762673', 'Narine', 'female', '13520253909', 'Guangzhou', '', 'visiting', 'aa13520253909@icloud.com'
FROM users WHERE email = 'aa13520253909@icloud.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'nari_2026-09-01 23.00.35_IMG_6264_01.jpeg' FROM users WHERE email = 'aa13520253909@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'nari_2026-09-01 23.00.35_IMG_6265_01.jpeg' FROM users WHERE email = 'aa13520253909@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'nari_2026-09-01 23.00.35_IMG_5884_01.png' FROM users WHERE email = 'aa13520253909@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'nari_2026-09-01 23.00.35_IMG_6282_01.jpeg' FROM users WHERE email = 'aa13520253909@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'nari_2026-09-01 23.00.35_IMG_3728_01.jpeg' FROM users WHERE email = 'aa13520253909@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Zhilkova Marina', 'Powertrix@mail.ru', '$2b$12$OATJvSyYI4yEPJFnGBUblObP3wpVcunTq3LR5mvFgPo3MsVxuZ4Oe', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Powertrix@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'MTM Trading Company', 'Marksistskaya str., 25, bld. 1, Moscow, Russia, 109147', 'Cosmetics /beauty company', 'Manager', '671170856', 'Zhilkova Marina', 'female', '13349361989', 'Guangzhou', '', 'meeting', 'Powertrix@mail.ru'
FROM users WHERE email = 'Powertrix@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Marina Zhilkova (OnlyBlondy)_2026-09-01 23.09.10_picture-0_01.png' FROM users WHERE email = 'Powertrix@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Marina Zhilkova (OnlyBlondy)_2026-09-01 23.09.10_picture-0_01.png' FROM users WHERE email = 'Powertrix@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Marina Zhilkova (OnlyBlondy)_2026-09-01 23.09.10_picture-0_01.png' FROM users WHERE email = 'Powertrix@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Marina Zhilkova (OnlyBlondy)_2026-09-01 23.09.10_picture-0_01.png' FROM users WHERE email = 'Powertrix@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Marina Zhilkova (OnlyBlondy)_2026-09-01 23.09.10_picture-0_01.png' FROM users WHERE email = 'Powertrix@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Alina Liashenko', 'Junsusuki@gmail.com', '$2b$12$M0nBZubMEiKa4yqByDtfC.W8.fgDLvvVD/G3ud2/75XdFlKyMdZNK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Junsusuki@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Olivegrey', 'Olivegrey', 'Distributor/Import-Export', 'Manager', '551634895', 'Alina Liashenko', 'female', '16603040134', 'Guangzhou', '', 'visiting', 'Junsusuki@gmail.com'
FROM users WHERE email = 'Junsusuki@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Lina_2026-09-01 23.15.07_picture-0_01.png' FROM users WHERE email = 'Junsusuki@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Lina_2026-09-01 23.15.07_picture-0_01.png' FROM users WHERE email = 'Junsusuki@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Lina_2026-09-01 23.15.07_picture-0_01.png' FROM users WHERE email = 'Junsusuki@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Lina_2026-09-01 23.15.07_picture-0_01.png' FROM users WHERE email = 'Junsusuki@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Lina_2026-09-01 23.15.07_picture-0_01.png' FROM users WHERE email = 'Junsusuki@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Russia', 'mozaarno@gmail.com', '$2b$12$x4mhWiU0wZzKynsEgbhsvO/FQ8ET4Yti7Z.u2b/gQmX3dbgdddpsW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'mozaarno@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, '13268320163', 'MozArno', 'Distributor/Import-Export', 'Menejer', '756806831', 'Russia', 'female', '13268310163', 'Guangzhou', '', 'visiting', 'mozaarno@gmail.com'
FROM users WHERE email = 'mozaarno@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Moza_2026-09-01 23.23.15_IMG_5366_01.png' FROM users WHERE email = 'mozaarno@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Moza_2026-09-01 23.23.15_IMG_5365_01.png' FROM users WHERE email = 'mozaarno@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Moza_2026-09-01 23.23.15_117_01.jpeg' FROM users WHERE email = 'mozaarno@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Moza_2026-09-01 23.23.15_image_01.jpg' FROM users WHERE email = 'mozaarno@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Moza_2026-09-01 23.23.15_5514165a-376c-49d6-8ce3-6300bf6e4fb2_01.jpeg' FROM users WHERE email = 'mozaarno@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Evgenii Popov', 'popoweugene@gmail.com', '$2b$12$OsTkilG.0lRZ9arVa.YhEu.vP2q.vBfN4k0cVfRFmvB0/XU15TX8q', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'popoweugene@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'KJF Export', 'Russia, Tambov, Magistralnaya street 31', 'Distributor/Import-Export', 'Manager', '662522916', 'Evgenii Popov', 'male', '13059128273', 'Guangzhou', '', 'visiting', 'popoweugene@gmail.com'
FROM users WHERE email = 'popoweugene@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Evgeny_2026-09-02 00.14.21_picture-0_01.png' FROM users WHERE email = 'popoweugene@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Evgeny_2026-09-02 00.14.21_picture-0_01.png' FROM users WHERE email = 'popoweugene@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Evgeny_2026-09-02 00.14.21_picture-0_01.png' FROM users WHERE email = 'popoweugene@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Evgeny_2026-09-02 00.14.21_picture-0_01.png' FROM users WHERE email = 'popoweugene@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Evgeny_2026-09-02 00.14.21_picture-0_01.png' FROM users WHERE email = 'popoweugene@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'MUHAMMAD DAWOOD', 'm6054677@gmail.com', '$2b$12$zP.Xrmoefsolb6MfNMQwMeB5NXz3kc30P0c7a16iOG5bT1CDpeV0O', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'm6054677@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Dawood logistics', 'Pakistan', 'Pharma Manufacturers', 'Director', 'AV7675241', 'MUHAMMAD DAWOOD', 'male', '15622716659', 'Guangzhou', '', 'meeting', 'm6054677@gmail.com'
FROM users WHERE email = 'm6054677@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Muhammad Dawood_2026-09-02 02.07.27_bbb229f6-c5d2-45cd-ae55-7aa6b0db55ac_01.jpeg' FROM users WHERE email = 'm6054677@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Muhammad Dawood_2026-09-02 02.07.27_bbb229f6-c5d2-45cd-ae55-7aa6b0db55ac_01.jpeg' FROM users WHERE email = 'm6054677@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Muhammad Dawood_2026-09-02 02.07.27_2392_01.jpeg' FROM users WHERE email = 'm6054677@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Muhammad Dawood_2026-09-02 02.07.27_2392_01.jpeg' FROM users WHERE email = 'm6054677@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Muhammad Dawood_2026-09-02 02.07.27_IMG_1339_01.jpeg' FROM users WHERE email = 'm6054677@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Zahid Zafar', 'zahidzafar92@hotmail.com', '$2b$12$QK.fMxgcMv3OtJJ7eePb9ON71svJkhvYM.VPk2eCVcVwViyNfBTNO', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'zahidzafar92@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Yiwu faiz trading company', 'Pakistan', 'Pharma Sales', 'CEO', 'BA5520403', 'Zahid Zafar', 'male', '15157947817', 'Guangzhou', '', 'visiting', 'zahidzafar92@hotmail.com'
FROM users WHERE email = 'zahidzafar92@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '15157947917_2026-09-02 10.38.05_picture-0_01.png' FROM users WHERE email = 'zahidzafar92@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '15157947917_2026-09-02 10.38.05_picture-0_01.png' FROM users WHERE email = 'zahidzafar92@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '15157947917_2026-09-02 10.38.05_picture-0_01.png' FROM users WHERE email = 'zahidzafar92@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '15157947917_2026-09-02 10.38.05_picture-0_01.png' FROM users WHERE email = 'zahidzafar92@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '15157947917_2026-09-02 10.38.05_picture-0_01.png' FROM users WHERE email = 'zahidzafar92@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Stanislav Zhilkov', 'Spiritm0on@mail.ru', '$2b$12$x8sWRggFRzfI17N2zu0ji.ZiqZwjJ/s.HpJUYYgcD8T6qny6BeL3.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Spiritm0on@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Mediart', 'Blagoveshensk Amur obl', 'Pharma Sales', 'Manager', '775392167', 'Stanislav Zhilkov', 'male', '13039764648', 'Guangzhou', '', 'meeting', 'Spiritm0on@mail.ru'
FROM users WHERE email = 'Spiritm0on@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'STAN_2026-09-02 11.21.47_IMG_0356_01.jpeg' FROM users WHERE email = 'Spiritm0on@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'STAN_2026-09-02 11.21.47_IMG_7494_01.jpeg' FROM users WHERE email = 'Spiritm0on@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'STAN_2026-09-02 11.21.47_6862_01.jpeg' FROM users WHERE email = 'Spiritm0on@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'STAN_2026-09-02 11.21.47_IMG_7058_01.jpeg' FROM users WHERE email = 'Spiritm0on@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'STAN_2026-09-02 11.21.47_IMG_0724_01.jpeg' FROM users WHERE email = 'Spiritm0on@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'MEKHTIEVA IULIIA', 'somnambula57873@mail.ru', '$2b$12$CYqFHmefHIlm95wIaQo2ae1VEh0rPEheOXeLSIhnOFqB5/KWyVfVC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'somnambula57873@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Julijazz', '123 Anywhere st. Any sity', 'Cosmetics /beauty company', 'manager', '773279761', 'MEKHTIEVA IULIIA', 'female', '13529244947', 'Guangzhou', '', 'visiting', 'somnambula57873@mail.ru'
FROM users WHERE email = 'somnambula57873@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Juli Mekhti_2026-09-02 11.35.38_picture-0_01.png' FROM users WHERE email = 'somnambula57873@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Juli Mekhti_2026-09-02 11.35.38_picture-0_01.png' FROM users WHERE email = 'somnambula57873@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Juli Mekhti_2026-09-02 11.35.38_picture-0_01.png' FROM users WHERE email = 'somnambula57873@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Juli Mekhti_2026-09-02 11.35.38_picture-0_01.png' FROM users WHERE email = 'somnambula57873@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Juli Mekhti_2026-09-02 11.35.38_picture-0_01.png' FROM users WHERE email = 'somnambula57873@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Goriacheva Anastasiia', 'kipi_tok@mail.ru', '$2b$12$lfkMvp3cL5hOp4mDoBPM.OSJr1ZZaU85WFkt1QTKdRQ0b0eZpt8hy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kipi_tok@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Anastasia Hot', 'Shenzhen', 'Cosmetics /beauty company', 'Director', '551034835', 'Goriacheva Anastasiia', 'female', '15019450938', 'Shenzhen', '', 'meeting', 'kipi_tok@mail.ru'
FROM users WHERE email = 'kipi_tok@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Anastasia-Hot_2026-09-02 11.43.22_picture-0_01.png' FROM users WHERE email = 'kipi_tok@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Anastasia-Hot_2026-09-02 11.43.22_picture-0_01.png' FROM users WHERE email = 'kipi_tok@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Anastasia-Hot_2026-09-02 11.43.22_picture-0_01.png' FROM users WHERE email = 'kipi_tok@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Anastasia-Hot_2026-09-02 11.43.22_picture-0_01.png' FROM users WHERE email = 'kipi_tok@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Anastasia-Hot_2026-09-02 11.43.22_picture-0_01.png' FROM users WHERE email = 'kipi_tok@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'SVYATOSHENKO YANA', 'yanushenka@gmail.com', '$2b$12$PiMmwpRAqor26Yxc.WbD1OzreD/S1cOKwZBue6klumuK12rq33N3S', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'yanushenka@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'TECHNOHOUSE PRIVATE ENTERPRIZE', 'PUSHKIN AV., DNIEPROPETROVSK, 49101, UKRAINE', 'Pharma Manufacturers', 'Sales manager', 'PU284046', 'SVYATOSHENKO YANA', 'female', '18927583717', 'Guangzhou', '', 'meeting', 'yanushenka@gmail.com'
FROM users WHERE email = 'yanushenka@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '丫娜 Yana_2026-09-02 14.34.45_9185_01.jpeg' FROM users WHERE email = 'yanushenka@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '丫娜 Yana_2026-09-02 14.34.45_9193_01.jpeg' FROM users WHERE email = 'yanushenka@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '丫娜 Yana_2026-09-02 14.34.45_IMG_4577_01.jpeg' FROM users WHERE email = 'yanushenka@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '丫娜 Yana_2026-09-02 14.34.45_IMG_1937_01.jpeg' FROM users WHERE email = 'yanushenka@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '丫娜 Yana_2026-09-02 14.34.45_IMG_0541_01.jpeg' FROM users WHERE email = 'yanushenka@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'OLEINIKOV ARTEM', '06_92@list.ru', '$2b$12$lEa2CP2Tqn8Gs/odBTqVbezksF5PVW3sbpm/jdeRX4PJAmvbDcKy.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '06_92@list.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guangzhou Baidao E-commerce', 'Novosibirsk, Planovaya 52', 'Distributor/Import-Export', 'General Manager', '777487732', 'OLEINIKOV ARTEM', 'male', '18520441936', 'Shenzhen', '', 'meeting', '06_92@list.ru'
FROM users WHERE email = '06_92@list.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Tom_2026-09-02 15.12.08_image_01.jpg' FROM users WHERE email = '06_92@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Tom_2026-09-02 15.12.08_image_01.jpg' FROM users WHERE email = '06_92@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Tom_2026-09-02 15.12.08_image_01.jpg' FROM users WHERE email = '06_92@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Tom_2026-09-02 15.12.08_IMG_2887_01.jpeg' FROM users WHERE email = '06_92@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Tom_2026-09-02 15.12.08_IMG_3253_01.jpeg' FROM users WHERE email = '06_92@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Gamidov Vadim', 'vadim.gamidov@list.ru', '$2b$12$ACln/la5y41BXE08fiu5oeWtWEW3e0mcAcURIX3UY5eRdyVtNz0NS', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vadim.gamidov@list.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Vadim Company', 'Tverskaya Street 95', 'Cosmetics /beauty company', 'Director', '77 5560961', 'Gamidov Vadim', 'male', '19587446171', 'Guangzhou', '', 'visiting', 'vadim.gamidov@list.ru'
FROM users WHERE email = 'vadim.gamidov@list.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'VADIM_2026-09-02 16.01.13_image_01.jpg' FROM users WHERE email = 'vadim.gamidov@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'VADIM_2026-09-02 16.01.13_IMG_7772_01.jpeg' FROM users WHERE email = 'vadim.gamidov@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'VADIM_2026-09-02 16.01.13_IMG_7772_01.jpeg' FROM users WHERE email = 'vadim.gamidov@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'VADIM_2026-09-02 16.01.13_IMG_7772_01.jpeg' FROM users WHERE email = 'vadim.gamidov@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'VADIM_2026-09-02 16.01.13_IMG_7495_01.jpeg' FROM users WHERE email = 'vadim.gamidov@list.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Yauhen Zaitsau', 'zenakonstantinov43@gmail.com', '$2b$12$LSYEkwLlm68IrEOxKsnGoewnLW8sZ9eJEKQ9fgkrGuBlDCaxTSTui', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'zenakonstantinov43@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Helix', 'Republic of Belarus, Minsk, Lane kalinina 5a', 'Cosmetics /beauty company', 'Manager', 'MC3569070', 'Yauhen Zaitsau', 'male', '18169963072', 'Shenzhen', '', 'meeting', 'zenakonstantinov43@gmail.com'
FROM users WHERE email = 'zenakonstantinov43@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Yauhen_2026-09-02 16.09.53_picture-0_01.png' FROM users WHERE email = 'zenakonstantinov43@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Yauhen_2026-09-02 16.09.53_picture-0_01.png' FROM users WHERE email = 'zenakonstantinov43@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Yauhen_2026-09-02 16.09.53_picture-0_01.png' FROM users WHERE email = 'zenakonstantinov43@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Yauhen_2026-09-02 16.09.53_picture-0_01.png' FROM users WHERE email = 'zenakonstantinov43@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Yauhen_2026-09-02 16.09.53_picture-0_01.png' FROM users WHERE email = 'zenakonstantinov43@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Datsenko Liubov', 'Skysonyasky@mail.ru', '$2b$12$Xt9vmB4eGMVKehdLyXTHj.CGYs54H3u39mvgAUnDTOCiF10PocNru', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Skysonyasky@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Eminent corporation', 'Moscow vidnoye 36', 'Distributor/Import-Export', 'Managing director', '760092874', 'Datsenko Liubov', 'female', '13044224449', 'Guangzhou', '', 'visiting', 'Skysonyasky@mail.ru'
FROM users WHERE email = 'Skysonyasky@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Соня_2026-09-02 18.15.17_image_01.jpg' FROM users WHERE email = 'Skysonyasky@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Соня_2026-09-02 18.15.17_image_01.jpg' FROM users WHERE email = 'Skysonyasky@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Соня_2026-09-02 18.15.17_image_01.jpg' FROM users WHERE email = 'Skysonyasky@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Соня_2026-09-02 18.15.17_IMG_0502_01.jpeg' FROM users WHERE email = 'Skysonyasky@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Соня_2026-09-02 18.15.17_IMG_0496_01.png' FROM users WHERE email = 'Skysonyasky@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Hanna Kryshalovich', 'ia-anna@yandex.ru', '$2b$12$xsfjpD.4uF9DBLJLn1S1ZOaAPnLd..PDNcIKKtpXQ1L26q1QhywWC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ia-anna@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guangzhou Leonida Co.,Ltd', '广州市荔湾区岭南街西堤二马路55号整栋2140', 'Distributor/Import-Export', 'Director', 'KH3070327', 'Hanna Kryshalovich', 'female', '13711404442', 'Guangzhou', '', 'meeting', 'ia-anna@yandex.ru'
FROM users WHERE email = 'ia-anna@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '🦆annushka_2026-09-02 19.09.27_3273_01.jpeg' FROM users WHERE email = 'ia-anna@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '🦆annushka_2026-09-02 19.09.27_3272_01.jpeg' FROM users WHERE email = 'ia-anna@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '🦆annushka_2026-09-02 19.09.27_3278_01.jpeg' FROM users WHERE email = 'ia-anna@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '🦆annushka_2026-09-02 19.09.27_IMG_4782_01.jpeg
🦆annushka_2026-09-02 19.09.27_3276_02.jpeg' FROM users WHERE email = 'ia-anna@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '🦆annushka_2026-09-02 19.09.27_IMG_4123_01.jpeg' FROM users WHERE email = 'ia-anna@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'ABDUL REHMAN MUHAMMAD', 'sultan.traders.gz@icloud.com', '$2b$12$5/PHYZftKW0Urh9WfciGP.aJke/htTxDRm6RdF715fpVoqG1ZiD5y', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sultan.traders.gz@icloud.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guangzhou Sultan trading Co LTD', 'Digital horizon', 'Food/Beverages/Neutraceutical', 'CEO', 'AS1074625', 'ABDUL REHMAN MUHAMMAD', 'male', '13822277414', 'Guangzhou', '', 'visiting', 'sultan.traders.gz@icloud.com'
FROM users WHERE email = 'sultan.traders.gz@icloud.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'MARS AYUBI_2026-09-02 19.12.49_picture-0_01.png' FROM users WHERE email = 'sultan.traders.gz@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'MARS AYUBI_2026-09-02 19.12.49_picture-0_01.png' FROM users WHERE email = 'sultan.traders.gz@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'MARS AYUBI_2026-09-02 19.12.49_picture-0_01.png' FROM users WHERE email = 'sultan.traders.gz@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'MARS AYUBI_2026-09-02 19.12.49_picture-0_01.png' FROM users WHERE email = 'sultan.traders.gz@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'MARS AYUBI_2026-09-02 19.12.49_picture-0_01.png' FROM users WHERE email = 'sultan.traders.gz@icloud.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'KAMDEM FOGAING HERMAN STEVE', 'kamdemherman9@gmail.com', '$2b$12$b.X0L5khjn8h97NIwR4JIOnH0VuILOewWl9r/8Yegxk.CYrQ92cJu', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kamdemherman9@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Brainsoft', 'Yaounde,Cameroon', 'Distributor/Import-Export', 'Manager', 'AA839492', 'KAMDEM FOGAING HERMAN STEVE', 'male', '18218652436', 'Shenzhen', '', 'visiting', 'kamdemherman9@gmail.com'
FROM users WHERE email = 'kamdemherman9@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Herman Steve_2026-09-03 00.46.48_IMG_0427_01.jpeg' FROM users WHERE email = 'kamdemherman9@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Herman Steve_2026-09-03 00.46.48_IMG_0988_01.jpeg' FROM users WHERE email = 'kamdemherman9@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Herman Steve_2026-09-03 00.46.48_IMG_1980_01.jpeg' FROM users WHERE email = 'kamdemherman9@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Herman Steve_2026-09-03 00.46.48_IMG_1979_01.jpeg' FROM users WHERE email = 'kamdemherman9@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Herman Steve_2026-09-03 00.46.48_IMG_0788_01.jpeg' FROM users WHERE email = 'kamdemherman9@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'SIDDIQI UMAIR AHMED', 'umair_ahmed268@hotmail.com', '$2b$12$ANu2bcXXspAdDiewLuzYFuICeqdoY3WQnY7DekgzyZDqVbajgXsTe', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'umair_ahmed268@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'NOOR ENERGY', 'Office 21, 1st Floor, J1 Market, Wapada Town, Lahore, Pakistan', 'Machinery/Equipments/Automation', 'Design Engineer', 'BM5468893', 'SIDDIQI UMAIR AHMED', 'male', '17722561044', 'Shenzhen', '', 'visiting', 'umair_ahmed268@hotmail.com'
FROM users WHERE email = 'umair_ahmed268@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Umair Ahmed Siddiqi_2026-09-03 09.51.56_picture-0_01.png' FROM users WHERE email = 'umair_ahmed268@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Umair Ahmed Siddiqi_2026-09-03 09.51.56_picture-0_01.png' FROM users WHERE email = 'umair_ahmed268@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Umair Ahmed Siddiqi_2026-09-03 09.51.56_picture-0_01.png' FROM users WHERE email = 'umair_ahmed268@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Umair Ahmed Siddiqi_2026-09-03 09.51.56_picture-0_01.png' FROM users WHERE email = 'umair_ahmed268@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Umair Ahmed Siddiqi_2026-09-03 09.51.56_picture-0_01.png' FROM users WHERE email = 'umair_ahmed268@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Usman Hameed', 'xiaoxingconsultants@gamil.com', '$2b$12$Xu9Sjh9sEBdP1L4yxfzaZe6/ea09spMs9JcE1d3PRTjREwj7TxXmq', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'xiaoxingconsultants@gamil.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Xiaoxing Group of Companies', '2201 cornestone blvd Edinburgh, Edinburgh City, Scotland', 'Distributor/Import-Export', 'Director', 'ES6270462', 'Usman Hameed', 'male', '15322062466', 'Guangzhou', '', 'meeting', 'xiaoxingconsultants@gamil.com'
FROM users WHERE email = 'xiaoxingconsultants@gamil.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Derek_2026-09-03 10.20.10_IMG_1162_01.jpeg' FROM users WHERE email = 'xiaoxingconsultants@gamil.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Derek_2026-09-03 10.20.10_IMG_0035_01.jpeg' FROM users WHERE email = 'xiaoxingconsultants@gamil.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Derek_2026-09-03 10.20.10_cf1c2420ebf3939deb0c2259a4e7dcc6_01.jpeg' FROM users WHERE email = 'xiaoxingconsultants@gamil.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Derek_2026-09-03 10.20.10_a67c0763cb7e036a3703be9a00e93430_01.jpeg' FROM users WHERE email = 'xiaoxingconsultants@gamil.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Derek_2026-09-03 10.20.10_9f9c6b7a0e17b1eb1e4d237b4bf8ddbc_01.jpeg' FROM users WHERE email = 'xiaoxingconsultants@gamil.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'maryam moosivand', 'maryam_musivand69@yahoo.com', '$2b$12$bn1Q3UuADCx1aEYJddAB4.h2JyPFcjn5YU5XJO.Ig1s0okCLbi4VC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'maryam_musivand69@yahoo.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'guangzhou mary trading company', 'turkiye, istanbul', 'Distributor/Import-Export', 'manager', 'v54788603', 'maryam moosivand', 'female', '13070285008', 'Guangzhou', '', 'meeting', 'maryam_musivand69@yahoo.com'
FROM users WHERE email = 'maryam_musivand69@yahoo.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '🛩🛳广州玛丽_2026-09-03 10.22.47_picture-0_01.png' FROM users WHERE email = 'maryam_musivand69@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '🛩🛳广州玛丽_2026-09-03 10.22.47_picture-0_01.png' FROM users WHERE email = 'maryam_musivand69@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '🛩🛳广州玛丽_2026-09-03 10.22.47_picture-0_01.png' FROM users WHERE email = 'maryam_musivand69@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '🛩🛳广州玛丽_2026-09-03 10.22.47_picture-0_01.png' FROM users WHERE email = 'maryam_musivand69@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '🛩🛳广州玛丽_2026-09-03 10.22.47_picture-0_01.png' FROM users WHERE email = 'maryam_musivand69@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Kunanbay Abylaikhan', 'abilaykha.2008@gmail.com', '$2b$12$10hXoLAeJsZ8SCzTMyUeaeOvWyRfzj7JaYQrWv/WkpU9gdb2sdEym', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'abilaykha.2008@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Anastasia', '-', 'Cosmetics /beauty company', 'Manager', 'N17345827', 'Kunanbay Abylaikhan', 'male', '13713814167', 'Shenzhen', '', 'meeting', 'abilaykha.2008@gmail.com'
FROM users WHERE email = 'abilaykha.2008@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Abylaikhan_2026-09-03 12.56.12_3e33defd-4100-4839-aef5-1a920a7c5a19_01.jpeg' FROM users WHERE email = 'abilaykha.2008@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Abylaikhan_2026-09-03 12.56.12_3e33defd-4100-4839-aef5-1a920a7c5a19_01.jpeg' FROM users WHERE email = 'abilaykha.2008@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Abylaikhan_2026-09-03 12.56.12_3e33defd-4100-4839-aef5-1a920a7c5a19_01.jpeg' FROM users WHERE email = 'abilaykha.2008@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Abylaikhan_2026-09-03 12.56.12_54_01.jpeg' FROM users WHERE email = 'abilaykha.2008@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Abylaikhan_2026-09-03 12.56.12_57e171a4-50a8-4b34-87bb-2024ffd721f3_01.jpeg' FROM users WHERE email = 'abilaykha.2008@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Shuntsikava Yuliya', 'shuntikov_sergey@mail.ru', '$2b$12$zoXD8N7LQA7JSa0BhUeMneZjGix.NdaQ6TGMUxYYrtaJkoljQAWiy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'shuntikov_sergey@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Analytic', 'Add:vulica Francyska Skaryny 14. Minsk. Minsk Region 220114', 'Cosmetics /beauty company', 'Manager', 'KB2947288', 'Shuntsikava Yuliya', 'female', '13185033160', 'Guangzhou', '', 'visiting', 'shuntikov_sergey@mail.ru'
FROM users WHERE email = 'shuntikov_sergey@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Yulia_2026-09-03 15.42.02_52c97b04c95fae70ae6084e20ddd4cdc_01.jpeg' FROM users WHERE email = 'shuntikov_sergey@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Yulia_2026-09-03 15.42.02_IMG_1211_01.jpeg' FROM users WHERE email = 'shuntikov_sergey@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Yulia_2026-09-03 15.42.02_883108d3bb20d9cc083edd3aecd2cdc8_01.jpeg' FROM users WHERE email = 'shuntikov_sergey@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Yulia_2026-09-03 15.42.02_883108d3bb20d9cc083edd3aecd2cdc8_01.jpeg' FROM users WHERE email = 'shuntikov_sergey@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Yulia_2026-09-03 15.42.02_7343a5e48f1ebb7aa0a53db343ec5149_01.jpeg' FROM users WHERE email = 'shuntikov_sergey@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'AHMED IMRAN SHAFIQ', 'shiningeic786@hotmail.com', '$2b$12$AwZzUFX4dA.ccAZmCBrg1u27zKOtHLrMAbRlNqFRtQU3qhRP6mkHe', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'shiningeic786@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Iman business Ltd', 'Room 201 Median Avenue t.s.t Hong Kong', 'Market Analysis/Investment', 'Manager', 'AN1167663', 'AHMED IMRAN SHAFIQ', 'male', '15913125514', 'Guangzhou', '', 'visiting', 'shiningeic786@hotmail.com'
FROM users WHERE email = 'shiningeic786@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'mani_2026-09-03 16.18.06_558a5696-8c87-44ce-bd85-69641220c305_01.jpeg' FROM users WHERE email = 'shiningeic786@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'mani_2026-09-03 16.18.06_IMG_5403_01.jpeg' FROM users WHERE email = 'shiningeic786@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'mani_2026-09-03 16.18.06_image_01.jpg' FROM users WHERE email = 'shiningeic786@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'mani_2026-09-03 16.18.06_image_01.jpg' FROM users WHERE email = 'shiningeic786@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'mani_2026-09-03 16.18.06_IMG_8245_01.jpeg' FROM users WHERE email = 'shiningeic786@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Susmita kundu', 'skaddrita@gmail.com', '$2b$12$N4c8/PYvR8ohqQmbDS8KF.7gQLtuABUuZ/fXNtwib2nUMOenbqP/q', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'skaddrita@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Bright-i System Ltd.', 'Dhaka,Bangladesh', 'Cosmetics /beauty company', 'Purchase manager', 'A00864178', 'Susmita kundu', 'female', '13049868416', 'Shenzhen', '', 'visiting', 'skaddrita@gmail.com'
FROM users WHERE email = 'skaddrita@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'susmita kundu_2026-09-04 00.15.48_picture-0_01.png' FROM users WHERE email = 'skaddrita@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'susmita kundu_2026-09-04 00.15.48_picture-0_01.png' FROM users WHERE email = 'skaddrita@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'susmita kundu_2026-09-04 00.15.48_picture-0_01.png' FROM users WHERE email = 'skaddrita@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'susmita kundu_2026-09-04 00.15.48_picture-0_01.png' FROM users WHERE email = 'skaddrita@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'susmita kundu_2026-09-04 00.15.48_picture-0_01.png' FROM users WHERE email = 'skaddrita@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Amjad Ali', 'sony78615@yahoo.com', '$2b$12$B2AP6q2wF8VIjZYLvtDHVeHf/ieDePhUs8BNW6RrGIq1eziUjArGm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sony78615@yahoo.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guangzhou Guisi Trading co Ltd', 'Room 701 7th Floor, no.38 xingong street Zhongshan 8th Road,Liwan District Guangzhou', 'Machinery/Equipments/Automation', 'Director', 'RB1799865', 'Amjad Ali', 'male', '13480290786', 'Guangzhou', '', 'visiting', 'sony78615@yahoo.com'
FROM users WHERE email = 'sony78615@yahoo.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Amjad Ali_2026-09-04 00.37.51_picture-0_01.png' FROM users WHERE email = 'sony78615@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Amjad Ali_2026-09-04 00.37.51_picture-0_01.png' FROM users WHERE email = 'sony78615@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Amjad Ali_2026-09-04 00.37.51_picture-0_01.png' FROM users WHERE email = 'sony78615@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Amjad Ali_2026-09-04 00.37.51_picture-0_01.png' FROM users WHERE email = 'sony78615@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Amjad Ali_2026-09-04 00.37.51_picture-0_01.png' FROM users WHERE email = 'sony78615@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Gutsevich Tatiana', 'mealba247@gmail.com', '$2b$12$su3w28dyeLBj5is53mGAyOxKnBP/6SSbz/LEOZfr3RQ7zZPdUrdVC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'mealba247@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Bonbola', 'Radishchev St. 12, apt. 47, Ekaterinburg, Russia', 'Ingredients manufacturers', 'Sourcing manager', '770727406', 'Gutsevich Tatiana', 'female', '13671142447', 'Guangzhou', '', 'meeting', 'mealba247@gmail.com'
FROM users WHERE email = 'mealba247@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'TG_2026-09-04 09.53.36_picture-0_01.png' FROM users WHERE email = 'mealba247@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'TG_2026-09-04 09.53.36_picture-0_01.png' FROM users WHERE email = 'mealba247@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'TG_2026-09-04 09.53.36_picture-0_01.png' FROM users WHERE email = 'mealba247@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'TG_2026-09-04 09.53.36_picture-0_01.png' FROM users WHERE email = 'mealba247@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'TG_2026-09-04 09.53.36_picture-0_01.png' FROM users WHERE email = 'mealba247@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Iarmukhametova Olga', 'Ojarm@mail.ru', '$2b$12$Rpwo1MNqiN4RkF5MpKMGBu8m4lFZod2Y.CfG6qUUHiNv4dUSMxIlS', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Ojarm@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Lunaris', 'Krasnoyarsk, Afontovskii 5', 'Food/Beverages/Neutraceutical', 'Manager', '670958472', 'Iarmukhametova Olga', 'female', '15677121986', 'Guangzhou', '', 'visiting', 'Ojarm@mail.ru'
FROM users WHERE email = 'Ojarm@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Olga_2026-09-04 12.44.50_picture-0_01.png' FROM users WHERE email = 'Ojarm@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Olga_2026-09-04 12.44.50_picture-0_01.png' FROM users WHERE email = 'Ojarm@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Olga_2026-09-04 12.44.50_picture-0_01.png' FROM users WHERE email = 'Ojarm@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Olga_2026-09-04 12.44.50_picture-0_01.png' FROM users WHERE email = 'Ojarm@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Olga_2026-09-04 12.44.50_picture-0_01.png' FROM users WHERE email = 'Ojarm@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'AZ1208414', 'samiamanullah001@gmail.com', '$2b$12$L2tNS0qB.PACfRg.t2sAzOUQ9Ni8om5sRDhb0hQOeIlkfAOoHfipm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'samiamanullah001@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'AMANULLAH trading co.', 'Gujranwala, Pakistan', 'Distributor/Import-Export', 'CEO', 'AZ1208414', 'AZ1208414', 'male', '18080485862', 'Guangzhou', '', 'visiting', 'samiamanullah001@gmail.com'
FROM users WHERE email = 'samiamanullah001@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Sami_2026-09-04 14.39.13_IMG_1038_01.jpeg' FROM users WHERE email = 'samiamanullah001@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Sami_2026-09-04 14.39.13_IMG_1704_01.jpeg' FROM users WHERE email = 'samiamanullah001@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Sami_2026-09-04 14.39.13_IMG_0586_01.jpeg' FROM users WHERE email = 'samiamanullah001@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Sami_2026-09-04 14.39.13_IMG_0038_01.jpeg' FROM users WHERE email = 'samiamanullah001@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Sami_2026-09-04 14.39.13_b87f96200bc056b34589edbcf45327bc_01.jpeg' FROM users WHERE email = 'samiamanullah001@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Nx1855841', 'pitafisaadat@gmail.com', '$2b$12$fg0qfwULpXfizMmRqprQNOlLBdhb8meixvbAAexAvuHj9LMvmXgfi', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'pitafisaadat@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Saadi 1313', 'Pakistan ghotki sindh', 'Cosmetics /beauty company', 'Manager', 'AliSaadat', 'Nx1855841', 'male', '13138695652', 'Guangzhou', '', 'visiting', 'pitafisaadat@gmail.com'
FROM users WHERE email = 'pitafisaadat@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'saadat_2026-09-04 16.03.25_974_01.jpeg' FROM users WHERE email = 'pitafisaadat@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'saadat_2026-09-04 16.03.25_974_01.jpeg' FROM users WHERE email = 'pitafisaadat@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'saadat_2026-09-04 16.03.25_IMG_6591_01.jpeg' FROM users WHERE email = 'pitafisaadat@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'saadat_2026-09-04 16.03.25_IMG_6379_01.png' FROM users WHERE email = 'pitafisaadat@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'saadat_2026-09-04 16.03.25_IMG_5869_01.jpeg' FROM users WHERE email = 'pitafisaadat@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Leekakei stella Zheng zou', 'Estela202622@hotmail.com', '$2b$12$cQnJI0jG7QfZheMOxvIGPej6HuvRQeQsxbN6KCZ4Qu0QIN.SCz7y2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Estela202622@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Tu mundo de belleza c.a', '789 road', 'Cosmetics /beauty company', 'Ceo', '173285428', 'Leekakei stella Zheng zou', 'female', '13750372442', 'Guangzhou', '', 'visiting', 'Estela202622@hotmail.com'
FROM users WHERE email = 'Estela202622@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '℡༗࿆ ོEStellAོ࿆࿆🇻🇪_2026-09-04 16.27.52_205_01.jpeg' FROM users WHERE email = 'Estela202622@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '℡༗࿆ ོEStellAོ࿆࿆🇻🇪_2026-09-04 16.27.52_117785_01.jpeg' FROM users WHERE email = 'Estela202622@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '℡༗࿆ ོEStellAོ࿆࿆🇻🇪_2026-09-04 16.27.52_626_01.jpeg' FROM users WHERE email = 'Estela202622@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '℡༗࿆ ོEStellAོ࿆࿆🇻🇪_2026-09-04 16.27.52_IMG_9841_01.jpeg' FROM users WHERE email = 'Estela202622@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '℡༗࿆ ོEStellAོ࿆࿆🇻🇪_2026-09-04 16.27.52_image_01.jpg' FROM users WHERE email = 'Estela202622@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Muhammad Usman', 'usmang7227@gmail.com', '$2b$12$UVMOJ4XalFEqfbZYWrQj5eYCkZsqDPSyGbzCrwxnQxCT4nZGLvemu', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'usmang7227@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'China Business and sourcing', 'Lahore Pakistan', 'Pharma Sales', 'Manger', 'EB2855532', 'Muhammad Usman', 'male', '19849004312', 'Shenzhen', '', 'meeting', 'usmang7227@gmail.com'
FROM users WHERE email = 'usmang7227@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Mani_2026-09-04 16.43.42_picture-0_01.png' FROM users WHERE email = 'usmang7227@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Mani_2026-09-04 16.43.42_picture-0_01.png' FROM users WHERE email = 'usmang7227@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Mani_2026-09-04 16.43.42_picture-0_01.png' FROM users WHERE email = 'usmang7227@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Mani_2026-09-04 16.43.42_picture-0_01.png' FROM users WHERE email = 'usmang7227@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Mani_2026-09-04 16.43.42_picture-0_01.png' FROM users WHERE email = 'usmang7227@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Aliev Timur', 'Lunaris@bk.ru', '$2b$12$V/FEKY/0p6v84fmgjf6Loutjl2N3M8.ohEUvYXuTND8tWhdiUqjyi', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Lunaris@bk.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Lunaris', 'Krasnoyarsk, Semafornay 191', 'Supply chain', 'Manager', '670958477', 'Aliev Timur', 'male', '17677321986', 'Guangzhou', '', 'visiting', 'Lunaris@bk.ru'
FROM users WHERE email = 'Lunaris@bk.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '飞哥 Tim 吉姆飞_2026-09-04 18.58.21_picture-0_01.png' FROM users WHERE email = 'Lunaris@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '飞哥 Tim 吉姆飞_2026-09-04 18.58.21_picture-0_01.png' FROM users WHERE email = 'Lunaris@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '飞哥 Tim 吉姆飞_2026-09-04 18.58.21_picture-0_01.png' FROM users WHERE email = 'Lunaris@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '飞哥 Tim 吉姆飞_2026-09-04 18.58.21_picture-0_01.png' FROM users WHERE email = 'Lunaris@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '飞哥 Tim 吉姆飞_2026-09-04 18.58.21_picture-0_01.png' FROM users WHERE email = 'Lunaris@bk.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Nazarov Denis', 'Den-bigest@mail.ru', '$2b$12$n8FmDZu5TZJs6foCSc10o.JGKKcEQ0wyPeh5I3QXSAMoDiut9L60G', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Den-bigest@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Tochka Sveta', 'Moscow, Lenin\'s str 105', 'Machinery/Equipments/Automation', 'Director', '774269793', 'Nazarov Denis', 'male', '18948579107', 'Shenzhen', '', 'visiting', 'Den-bigest@mail.ru'
FROM users WHERE email = 'Den-bigest@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Denis_2026-09-04 20.44.40_IMG_0553_01.jpeg' FROM users WHERE email = 'Den-bigest@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Denis_2026-09-04 20.44.40_IMG_0560_01.jpeg' FROM users WHERE email = 'Den-bigest@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Denis_2026-09-04 20.44.40_58071BF2-89F6-4777-B677-1740E28F3D2F_01.png' FROM users WHERE email = 'Den-bigest@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Denis_2026-09-04 20.44.40_IMG_1435_01.jpeg' FROM users WHERE email = 'Den-bigest@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Denis_2026-09-04 20.44.40_IMG_0402_01.jpeg' FROM users WHERE email = 'Den-bigest@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Abushakhmanova Gulzhanat', 'gulzhanat888888@gmail.com', '$2b$12$.grZvrhUqq9piB2fFbjWju0IgR8VXVj7.yu3hYygwxdi0olBetQYm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'gulzhanat888888@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Ledin Kazakhstan', 'Kazakhstan', 'Distributor/Import-Export', 'Director', '12506693', 'Abushakhmanova Gulzhanat', 'female', '17509073740', 'Guangzhou', '', 'meeting', 'gulzhanat888888@gmail.com'
FROM users WHERE email = 'gulzhanat888888@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Gulzhanat🌹🌟💎👑_2026-09-05 11.58.36_picture-0_01.png' FROM users WHERE email = 'gulzhanat888888@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Gulzhanat🌹🌟💎👑_2026-09-05 11.58.36_picture-0_01.png' FROM users WHERE email = 'gulzhanat888888@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Gulzhanat🌹🌟💎👑_2026-09-05 11.58.36_picture-0_01.png' FROM users WHERE email = 'gulzhanat888888@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Gulzhanat🌹🌟💎👑_2026-09-05 11.58.36_picture-0_01.png' FROM users WHERE email = 'gulzhanat888888@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Gulzhanat🌹🌟💎👑_2026-09-05 11.58.36_picture-0_01.png' FROM users WHERE email = 'gulzhanat888888@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Briukhova Olga', 'br_olga@inbox.ru', '$2b$12$m0v9ox1mYw5dijP.8vw/tOKjjrO1w8OeFQFP0I0Zc336w8YMBRd0u', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'br_olga@inbox.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Brolga', 'Russia', 'Food/Beverages/Neutraceutical', 'CEO', '773416028', 'Briukhova Olga', 'female', '13620329703', 'Guangzhou', '', 'visiting', 'br_olga@inbox.ru'
FROM users WHERE email = 'br_olga@inbox.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Olga Br_2026-09-05 21.49.47_picture-0_01.png' FROM users WHERE email = 'br_olga@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Olga Br_2026-09-05 21.49.47_picture-0_01.png' FROM users WHERE email = 'br_olga@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Olga Br_2026-09-05 21.49.47_picture-0_01.png' FROM users WHERE email = 'br_olga@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Olga Br_2026-09-05 21.49.47_picture-0_01.png' FROM users WHERE email = 'br_olga@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Olga Br_2026-09-05 21.49.47_picture-0_01.png' FROM users WHERE email = 'br_olga@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ivan Zaderg', 'stobau@mail.ru', '$2b$12$pNC.as9Z5nZlU5rziZ8DUOXQ7nDJZU2ECJfQwzeHr7EjSPWnBmYXK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'stobau@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'brolga', 'Russia', 'Food/Beverages/Neutraceutical', 'manager', '773415719', 'Ivan Zaderg', 'male', '18811848703', 'Guangzhou', '', 'visiting', 'stobau@mail.ru'
FROM users WHERE email = 'stobau@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'ivan_2026-09-05 21.49.50_picture-0_01.png' FROM users WHERE email = 'stobau@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'ivan_2026-09-05 21.49.50_picture-0_01.png' FROM users WHERE email = 'stobau@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'ivan_2026-09-05 21.49.50_picture-0_01.png' FROM users WHERE email = 'stobau@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'ivan_2026-09-05 21.49.50_picture-0_01.png' FROM users WHERE email = 'stobau@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'ivan_2026-09-05 21.49.50_picture-0_01.png' FROM users WHERE email = 'stobau@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'RASSIA CONGE NELSON DIMITRI', 'nexttrade237@gmail.com', '$2b$12$78fWsqaDBPbojCj0kENmU.8xZsWP6k1Hxw4Hyvr3pHyBU.70Cv4RW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'nexttrade237@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Nextrade', 'Nextrade', 'Machinery/Equipments/Automation', 'Director', 'AB106426', 'RASSIA CONGE NELSON DIMITRI', 'male', '19874772604', 'Shenzhen', '', 'visiting', 'nexttrade237@gmail.com'
FROM users WHERE email = 'nexttrade237@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Lenoir_2026-09-05 23.11.46_picture-0_01.png' FROM users WHERE email = 'nexttrade237@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Lenoir_2026-09-05 23.11.46_picture-0_01.png' FROM users WHERE email = 'nexttrade237@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Lenoir_2026-09-05 23.11.46_picture-0_01.png' FROM users WHERE email = 'nexttrade237@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Lenoir_2026-09-05 23.11.46_picture-0_01.png' FROM users WHERE email = 'nexttrade237@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Lenoir_2026-09-05 23.11.46_picture-0_01.png' FROM users WHERE email = 'nexttrade237@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT '国际护照', 'angel_kailen@mail.ru', '$2b$12$PTqWDTDSUEHHAtmkhzWnM.5wsxjIUP4jc9THR9vPVb8lU3q9wU6.i', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'angel_kailen@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Cleantrade', '115054, Moscow,
st. Dubininskaya, 53, building 5', 'Distributor/Import-Export', 'Manager', '675213903', '国际护照', 'female', '15328998814', 'Guangzhou', '', 'visiting', 'angel_kailen@mail.ru'
FROM users WHERE email = 'angel_kailen@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Vasilisa_2026-09-06 15.32.33_IMG_0410_01.jpeg' FROM users WHERE email = 'angel_kailen@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Vasilisa_2026-09-06 15.32.33_IMG_0411_01.jpeg' FROM users WHERE email = 'angel_kailen@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Vasilisa_2026-09-06 15.32.33_IMG_0398_01.png' FROM users WHERE email = 'angel_kailen@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Vasilisa_2026-09-06 15.32.33_IMG_0399_01.png' FROM users WHERE email = 'angel_kailen@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Vasilisa_2026-09-06 15.32.33_IMG_9750_01.jpeg' FROM users WHERE email = 'angel_kailen@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Aleksandr Arestov', 'beyker96@mail.ru', '$2b$12$2Cw2TEHA1KAcGdpHuzKVv.5u.U/TaG2IZQOqxoP7NJO.E2LlTynZm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'beyker96@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Cleantrade', '115054, Moscow,
st. Dubininskaya, 53, building 5', 'Distributor/Import-Export', 'Manager', '675213905', 'Aleksandr Arestov', 'male', '17072595715', 'Guangzhou', '', 'visiting', 'beyker96@mail.ru'
FROM users WHERE email = 'beyker96@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Alex_2026-09-06 16.32.08_picture-0_01.png' FROM users WHERE email = 'beyker96@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Alex_2026-09-06 16.32.08_picture-0_01.png' FROM users WHERE email = 'beyker96@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Alex_2026-09-06 16.32.08_picture-0_01.png' FROM users WHERE email = 'beyker96@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Alex_2026-09-06 16.32.08_picture-0_01.png' FROM users WHERE email = 'beyker96@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Alex_2026-09-06 16.32.08_picture-0_01.png' FROM users WHERE email = 'beyker96@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Shah Mahmood', 'needi786@gmail.com', '$2b$12$GPNpOmCjlPlQ.XTpDWUCmu.mOaVSbFujXgaLcpCO4S8jbLGSYDPry', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'needi786@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Ningbo Brook Thompson Import and Bxport Co, Ltd.', 'Room 2-2, No. 220, Building 1, Wanda Commercial
Plaza, Jiangbei District, Ningbo City, Zhejiang', 'Market Analysis/Investment', 'Sale Manger', 'SG5141023', 'Shah Mahmood', 'male', '13533488786', 'Guangzhou', '', 'visiting', 'needi786@gmail.com'
FROM users WHERE email = 'needi786@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'MAG_2026-09-06 17.58.57_734f50cf-c453-45f2-bd02-66c954013173_01.jpeg' FROM users WHERE email = 'needi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'MAG_2026-09-06 17.58.57_image_01.jpg' FROM users WHERE email = 'needi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'MAG_2026-09-06 17.58.57_F00D3E7C-7375-4082-942D-914FF8270E81_01.png' FROM users WHERE email = 'needi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'MAG_2026-09-06 17.58.57_3543_01.jpeg' FROM users WHERE email = 'needi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'MAG_2026-09-06 17.58.57_DSC_9530 (1)_01.jpeg' FROM users WHERE email = 'needi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'RAJAN SHARMA', 'rs1992574@gmail.com', '$2b$12$6BFdNZFPiiAAb4Jvz.DVNeqf4gvR1SnwW8qk3aSN3fhV65aiLXv62', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'rs1992574@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Rajan Traders', 'Birgunj,nepal', 'Distributor/Import-Export', 'Manager', 'PA3245314', 'RAJAN SHARMA', 'male', '15622240274', 'Guangzhou', '', 'meeting', 'rs1992574@gmail.com'
FROM users WHERE email = 'rs1992574@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Rajan Sharma_2026-09-06 18.12.47_picture-0_01.png' FROM users WHERE email = 'rs1992574@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Rajan Sharma_2026-09-06 18.12.47_picture-0_01.png' FROM users WHERE email = 'rs1992574@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Rajan Sharma_2026-09-06 18.12.47_picture-0_01.png' FROM users WHERE email = 'rs1992574@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Rajan Sharma_2026-09-06 18.12.47_picture-0_01.png' FROM users WHERE email = 'rs1992574@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Rajan Sharma_2026-09-06 18.12.47_picture-0_01.png' FROM users WHERE email = 'rs1992574@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Aditya Agrawal', 'aadityasinghania57@gmail.com', '$2b$12$xPu/YXNylGbJ0kYPjxAYZ.aiwAIlr/1.DmW95sx9AcjapxlkcyDEO', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aadityasinghania57@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'All Insight Overseas Pvt. Ltd.', 'Nepal', 'Distributor/Import-Export', 'Manager', 'PA3339942', 'Aditya Agrawal', 'male', '15622348158', 'Guangzhou', '', 'meeting', 'aadityasinghania57@gmail.com'
FROM users WHERE email = 'aadityasinghania57@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Aditya_2026-09-06 18.12.53_IMG_5949_01.jpeg' FROM users WHERE email = 'aadityasinghania57@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Aditya_2026-09-06 18.12.53_IMG_6816_01.jpeg' FROM users WHERE email = 'aadityasinghania57@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Aditya_2026-09-06 18.12.53_1E743321-61CF-4A3A-8D6F-AECD5ECF224A_01.jpeg' FROM users WHERE email = 'aadityasinghania57@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Aditya_2026-09-06 18.12.53_IMG_7888_01.png' FROM users WHERE email = 'aadityasinghania57@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Aditya_2026-09-06 18.12.53_IMG_0050_01.jpeg' FROM users WHERE email = 'aadityasinghania57@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Edgar Santiago Pacheco Malpartida', 'Edgpacheco27@outlook.com', '$2b$12$LKIyL.RVf.E/Gm0ScbK4LumPxzUFWDnyp1JN8lTMA22D174sWt9uC', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Edgpacheco27@outlook.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Omnibridge S.R.L.', 'La Paz Av. José Muñoz Reyes Nro.370', 'Distributor/Import-Export', 'Sourcing Manager', 'SE07643', 'Edgar Santiago Pacheco Malpartida', 'male', '15167115492', 'Guangzhou', '', 'visiting', 'Edgpacheco27@outlook.com'
FROM users WHERE email = 'Edgpacheco27@outlook.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Santiago 桑迪_2026-09-06 18.28.06_IMG_7096_01.jpeg' FROM users WHERE email = 'Edgpacheco27@outlook.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Santiago 桑迪_2026-09-06 18.28.06_IMG_1431_01.jpeg' FROM users WHERE email = 'Edgpacheco27@outlook.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Santiago 桑迪_2026-09-06 18.28.06_IMG_1638_01.jpeg' FROM users WHERE email = 'Edgpacheco27@outlook.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Santiago 桑迪_2026-09-06 18.28.06_IMG_8722_01.jpeg' FROM users WHERE email = 'Edgpacheco27@outlook.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Santiago 桑迪_2026-09-06 18.28.06_1000036520_01.jpeg' FROM users WHERE email = 'Edgpacheco27@outlook.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'BERGIS LAIMA', '2980372181@qq.com', '$2b$12$gSs1Mh96rPGQvF33Qu/MOe/OEwgy09bQRfqqzGseQ8NtculRuzzXa', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '2980372181@qq.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Dangmax group', 'Myasnitskaya st. 13/55 ,Moscow , Russia', 'Distributor/Import-Export', 'Vice president', '552151368', 'BERGIS LAIMA', 'female', '18802052619', 'Guangzhou', '', 'meeting', '2980372181@qq.com'
FROM users WHERE email = '2980372181@qq.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '雪莉_2026-09-06 18.38.55_image_01.jpg' FROM users WHERE email = '2980372181@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '雪莉_2026-09-06 18.38.55_image_01.jpg' FROM users WHERE email = '2980372181@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '雪莉_2026-09-06 18.38.55_377_01.jpeg' FROM users WHERE email = '2980372181@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '雪莉_2026-09-06 18.38.55_IMG_4837_01.jpeg' FROM users WHERE email = '2980372181@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '雪莉_2026-09-06 18.38.55_379_01.jpeg' FROM users WHERE email = '2980372181@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'GVOZDENSKIY DMITRY', 'dmitriy@126.com', '$2b$12$o41AqDBZNSkF.opxFrIfIuL8jNrUB84tpY3/LHm5aETzSix.X74ta', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'dmitriy@126.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'MEBELTORG LTD', 'Russia, Moscow, Dmitrovskoe shosse, 58, building 2, off.204', 'Distributor/Import-Export', 'CEO', '550587617', 'GVOZDENSKIY DMITRY', 'male', '13902475894', 'Guangzhou', '', 'visiting', 'dmitriy@126.com'
FROM users WHERE email = 'dmitriy@126.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Dimitar 德米特里_2026-09-06 18.40.11_043D020C-93D1-4429-9D19-741906A26BCD_01.jpeg' FROM users WHERE email = 'dmitriy@126.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Dimitar 德米特里_2026-09-06 18.40.11_38A07DC7-9A6C-4FCE-8FDB-1509499751FD_01.jpeg' FROM users WHERE email = 'dmitriy@126.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Dimitar 德米特里_2026-09-06 18.40.11_003B456D-6E7C-4D59-AAB9-85EEA07C9F67_01.jpeg' FROM users WHERE email = 'dmitriy@126.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Dimitar 德米特里_2026-09-06 18.40.11_67D038D4-90F6-45C1-975A-8B8CDB02ABB1_01.jpeg' FROM users WHERE email = 'dmitriy@126.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Dimitar 德米特里_2026-09-06 18.40.11_1DD5D861-EED5-40E3-A803-4518ED04BBDD_01.jpeg' FROM users WHERE email = 'dmitriy@126.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Fatkieva Aleksandra', 'sasha_verch@mail.ru', '$2b$12$OhVhfmde9lp1nVrygs/CXuLqtNVVsIf..l2tBSxSK4Qwj1UPV6J2.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sasha_verch@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Cozyhome', 'Cozyhome.ru', 'Cosmetics /beauty company', 'Manager', '769145991', 'Fatkieva Aleksandra', 'female', '18104531050', 'Guangzhou', '', 'visiting', 'sasha_verch@mail.ru'
FROM users WHERE email = 'sasha_verch@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '萨沙 Александра_2026-09-06 19.02.15_IMG_3622_01.jpeg' FROM users WHERE email = 'sasha_verch@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '萨沙 Александра_2026-09-06 19.02.15_IMG_9265_01.jpeg' FROM users WHERE email = 'sasha_verch@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '萨沙 Александра_2026-09-06 19.02.15_IMG_5424_01.jpeg' FROM users WHERE email = 'sasha_verch@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '萨沙 Александра_2026-09-06 19.02.15_5882_01.png' FROM users WHERE email = 'sasha_verch@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '萨沙 Александра_2026-09-06 19.02.15_IMG_3620_01.jpeg' FROM users WHERE email = 'sasha_verch@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Olga Reida', 'Olia-eva@mail.ru', '$2b$12$Z5jk2RCdGh1onnaj/H8o7ef9.tzQuVU6o3JdsgeU.ae0RDJ3h34n.', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Olia-eva@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, '深圳市凯思派恩博科技有限公司', '-', 'Cosmetics /beauty company', 'Ceo', '763755988', 'Olga Reida', 'female', '17727848225', 'Shenzhen', '', 'visiting', 'Olia-eva@mail.ru'
FROM users WHERE email = 'Olia-eva@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Olga_2026-09-07 14.33.13_IMG_7888_01.png' FROM users WHERE email = 'Olia-eva@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Olga_2026-09-07 14.33.13_image_01.jpg' FROM users WHERE email = 'Olia-eva@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Olga_2026-09-07 14.33.13_image_01.jpg' FROM users WHERE email = 'Olia-eva@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Olga_2026-09-07 14.33.13_image_01.jpg' FROM users WHERE email = 'Olia-eva@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Olga_2026-09-07 14.33.13_IMG_8515_01.jpeg' FROM users WHERE email = 'Olia-eva@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Artem Reida', 'Olia-eva+dup2@mail.ru', '$2b$12$UZYezgCd7EMsRs9QCoA0/.2lehakUSYEAmpabWLImjiqRXYljTAvK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Olia-eva+dup2@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, '深圳市凯思派恩博科技有限公司', '-', 'Cosmetics /beauty company', 'CEO', '763756004', 'Artem Reida', 'male', '17727933505', 'Shenzhen', '', 'visiting', 'Olia-eva@mail.ru'
FROM users WHERE email = 'Olia-eva+dup2@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Ш_2026-09-07 14.46.11_IMG_0073_01.jpeg' FROM users WHERE email = 'Olia-eva+dup2@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Ш_2026-09-07 14.46.11_IMG_0075_01.jpeg' FROM users WHERE email = 'Olia-eva+dup2@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Ш_2026-09-07 14.46.11_IMG_0076_01.jpeg' FROM users WHERE email = 'Olia-eva+dup2@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Ш_2026-09-07 14.46.11_IMG_0076_01.jpeg' FROM users WHERE email = 'Olia-eva+dup2@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Ш_2026-09-07 14.46.11_IMG_0042_01.jpeg' FROM users WHERE email = 'Olia-eva+dup2@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Zhigalova Alena', 'dirx110919@mail.ru', '$2b$12$5BgjK0sq5icBU/vOEnv03urIavK3yafozGF9WvGKrDDOSSyiQtnUe', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'dirx110919@mail.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Dirx', 'Россия,Москва, ул Советская 38', 'Distributor/Import-Export', 'Менеджер', '776209368', 'Zhigalova Alena', 'female', '15622179758', 'Guangzhou', '', 'meeting', 'dirx110919@mail.ru'
FROM users WHERE email = 'dirx110919@mail.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Alena Dirx_2026-09-07 17.21.35_IMG_6621_01.png' FROM users WHERE email = 'dirx110919@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Alena Dirx_2026-09-07 17.21.35_IMG_6632_01.jpeg' FROM users WHERE email = 'dirx110919@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Alena Dirx_2026-09-07 17.21.35_1441_01.jpeg' FROM users WHERE email = 'dirx110919@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Alena Dirx_2026-09-07 17.21.35_1441_01.jpeg' FROM users WHERE email = 'dirx110919@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Alena Dirx_2026-09-07 17.21.35_IMG_6617_01.jpeg' FROM users WHERE email = 'dirx110919@mail.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'DAVYDOVA ALEKSANDRA', 'Commercial@os-hi.com', '$2b$12$Ov6neyb7Bt5Qz.o287Tj6.z/ZRoe64JDKQSmakpNmh1zIY0YJANf6', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Commercial@os-hi.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'OSHI', 'Guangzhou,panyu', 'Distributor/Import-Export', 'CEO', '550571145', 'DAVYDOVA ALEKSANDRA', 'female', '18620701794', 'Guangzhou', '', 'meeting', 'Commercial@os-hi.com'
FROM users WHERE email = 'Commercial@os-hi.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Sasha 莎莎_2026-09-08 00.39.59_IMG_1812_01.jpeg' FROM users WHERE email = 'Commercial@os-hi.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Sasha 莎莎_2026-09-08 00.39.59_image_01.jpg' FROM users WHERE email = 'Commercial@os-hi.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Sasha 莎莎_2026-09-08 00.39.59_2_01.png
Sasha 莎莎_2026-09-08 00.39.59_1_02.png' FROM users WHERE email = 'Commercial@os-hi.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Sasha 莎莎_2026-09-08 00.39.59_IMG_7155_01.jpeg' FROM users WHERE email = 'Commercial@os-hi.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Sasha 莎莎_2026-09-08 00.39.59_Facetune_03-08-2026-03-41-50_01.jpeg
Sasha 莎莎_2026-09-08 00.39.59_Facetune_03-08-2026-03-41-50_02.jpeg' FROM users WHERE email = 'Commercial@os-hi.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Aneesullah', 'anees.jamro@hotmail.com', '$2b$12$JEyFw6pg3OQ02WBeS9qqdOqdwGxom1TmWsFpMTVU12vEU7txNKfRG', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'anees.jamro@hotmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Adil import & export', 'Meehon khan Jamro district khairpur', 'Food/Beverages/Neutraceutical', 'Purchasing manager', 'CA1718673', 'Aneesullah', 'male', '13060902923', 'Guangzhou', '', 'visiting', 'anees.jamro@hotmail.com'
FROM users WHERE email = 'anees.jamro@hotmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Aneess_2026-09-08 14.11.13_1208_01.jpeg' FROM users WHERE email = 'anees.jamro@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Aneess_2026-09-08 14.11.13_IMG_1584_01.jpeg' FROM users WHERE email = 'anees.jamro@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Aneess_2026-09-08 14.11.13_IMG_2880_01.jpeg' FROM users WHERE email = 'anees.jamro@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Aneess_2026-09-08 14.11.13_1208_01.jpeg' FROM users WHERE email = 'anees.jamro@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Aneess_2026-09-08 14.11.13_1208_01.jpeg' FROM users WHERE email = 'anees.jamro@hotmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Edgar Levonyan', 'Ed.kazaryan@inbox.ru', '$2b$12$Xi6QNoF/x7/YDWqr7qOWJe9WYHzg5KBDM8R8k6Oxwr5UyfsmWbo7y', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Ed.kazaryan@inbox.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'DZYUNIK Traders', 'Yerevan Sari Tagh 6/2', 'Distributor/Import-Export', 'Manager', 'AT0642971', 'Edgar Levonyan', 'male', '13268085202', 'Guangzhou', '', 'meeting', 'Ed.kazaryan@inbox.ru'
FROM users WHERE email = 'Ed.kazaryan@inbox.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Siramarg8888_2026-09-08 17.56.51_image_01.jpg' FROM users WHERE email = 'Ed.kazaryan@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Siramarg8888_2026-09-08 17.56.51_image_01.jpg' FROM users WHERE email = 'Ed.kazaryan@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Siramarg8888_2026-09-08 17.56.51_332_01.jpeg' FROM users WHERE email = 'Ed.kazaryan@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Siramarg8888_2026-09-08 17.56.51_332_01.jpeg' FROM users WHERE email = 'Ed.kazaryan@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Siramarg8888_2026-09-08 17.56.51_IMG_0186_01.jpeg' FROM users WHERE email = 'Ed.kazaryan@inbox.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'MUHAMMAD AHMED', 'rsiltdgz12@gmail.com', '$2b$12$lmSp/ApxPjRgj/SK/.zPCO8RRfAQiqLPd8rjxaHduMf6VMc9LqH6q', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'rsiltdgz12@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'RAPID SUCCESS INVESTMENT LIMITED', 'Guangzhoushi Tianhequ Longkou Xilu 88Hao Tianlong Dasha', 'Machinery/Equipments/Automation', 'CHIEF EXECUTIVE', 'CY1166353', 'MUHAMMAD AHMED', 'male', '13710313265', 'Guangzhou', '', 'visiting', 'rsiltdgz12@gmail.com'
FROM users WHERE email = 'rsiltdgz12@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'ROMMY_2026-09-09 03.14.45_picture-0_01.png' FROM users WHERE email = 'rsiltdgz12@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'ROMMY_2026-09-09 03.14.45_picture-0_01.png' FROM users WHERE email = 'rsiltdgz12@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'ROMMY_2026-09-09 03.14.45_picture-0_01.png' FROM users WHERE email = 'rsiltdgz12@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'ROMMY_2026-09-09 03.14.45_picture-0_01.png' FROM users WHERE email = 'rsiltdgz12@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'ROMMY_2026-09-09 03.14.45_picture-0_01.png' FROM users WHERE email = 'rsiltdgz12@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'FAISAL MEHMOOD', 'Guangzhouthreebroltd@gmail.com', '$2b$12$1HbIvLfAN1AqiICNjjoFqubt/Ra0J1ihSPVe45PEEdPKvJWVqGHy2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Guangzhouthreebroltd@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Guangzhou Three Brothers Medical Equipment co.,Ltd', 'Room 259.2nd Floor.No.49Dongjiaobei Road.Liwan District. Guangzhou city', 'Machinery/Equipments/Automation', 'Chief Executive', 'YF0157913', 'FAISAL MEHMOOD', 'male', '17612025256', 'Guangzhou', '', 'visiting', 'Guangzhouthreebroltd@gmail.com'
FROM users WHERE email = 'Guangzhouthreebroltd@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'TIGER SURGICAL 🐅_2026-09-09 03.43.36_IMG_9757_01.jpeg' FROM users WHERE email = 'Guangzhouthreebroltd@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'TIGER SURGICAL 🐅_2026-09-09 03.43.36_image_01.jpg' FROM users WHERE email = 'Guangzhouthreebroltd@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'TIGER SURGICAL 🐅_2026-09-09 03.43.36_d4032020b7348f2f928ba487594171a4_01.png' FROM users WHERE email = 'Guangzhouthreebroltd@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'TIGER SURGICAL 🐅_2026-09-09 03.43.36_IMG_0009_01.jpeg' FROM users WHERE email = 'Guangzhouthreebroltd@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'TIGER SURGICAL 🐅_2026-09-09 03.43.36_131_01.jpeg' FROM users WHERE email = 'Guangzhouthreebroltd@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'SAPELKINA VITALIYA', 'Vitasapelkina1@yandex.com', '$2b$12$eQnvSNtBOX8nxSAa6331w.J5uKdboHUuHej07lWBEqAoZn36ME5Nu', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Vitasapelkina1@yandex.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Рыба Рис', 'Russia, Novosibirsk', 'Food/Beverages/Neutraceutical', '.', '761697405', 'SAPELKINA VITALIYA', 'female', '17575000751', 'Guangzhou', '', 'visiting', 'Vitasapelkina1@yandex.com'
FROM users WHERE email = 'Vitasapelkina1@yandex.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Vitaliya_2026-09-09 11.49.51_IMG_1030_01.jpeg' FROM users WHERE email = 'Vitasapelkina1@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Vitaliya_2026-09-09 11.49.51_IMG_2245_01.jpeg' FROM users WHERE email = 'Vitasapelkina1@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Vitaliya_2026-09-09 11.49.51_image_01.jpg' FROM users WHERE email = 'Vitasapelkina1@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Vitaliya_2026-09-09 11.49.51_image_01.jpg' FROM users WHERE email = 'Vitasapelkina1@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Vitaliya_2026-09-09 11.49.51_IMG_7300_01.jpeg' FROM users WHERE email = 'Vitasapelkina1@yandex.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Ivanova Svetlana', 'aclonlogistika@yandex.ru', '$2b$12$mnaaWIRwUPjBDYc3oLzk.usX02BOWK5i0BUU6NhWXrDEV6XyJZERy', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aclonlogistika@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Aclon', 'Moscow', 'Cosmetics /beauty company', 'Manager', 'Motherofthree5', 'Ivanova Svetlana', 'female', '19560107735', 'Guangzhou', '', 'meeting', 'aclonlogistika@yandex.ru'
FROM users WHERE email = 'aclonlogistika@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Svetlana_2026-09-09 21.55.25_picture-0_01.png' FROM users WHERE email = 'aclonlogistika@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Svetlana_2026-09-09 21.55.25_picture-0_01.png' FROM users WHERE email = 'aclonlogistika@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Svetlana_2026-09-09 21.55.25_picture-0_01.png' FROM users WHERE email = 'aclonlogistika@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Svetlana_2026-09-09 21.55.25_picture-0_01.png' FROM users WHERE email = 'aclonlogistika@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Svetlana_2026-09-09 21.55.25_picture-0_01.png' FROM users WHERE email = 'aclonlogistika@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'GUBIN ALEKSEI', 'Alekseygu@yandex.ru', '$2b$12$bzS3IiiLBfMHmJA7Re7B2OTKYV5SNOj2K1Hyzl8hKBrL7WMufSf5y', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Alekseygu@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Ipgubin', 'Moscow', 'Market Analysis/Investment', 'Ceo', '77 3293720', 'GUBIN ALEKSEI', 'male', 'AlexAG007', 'Guangzhou', '', 'meeting', 'Alekseygu@yandex.ru'
FROM users WHERE email = 'Alekseygu@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'AlekseiAG_2026-09-09 22.29.44_picture-0_01.png' FROM users WHERE email = 'Alekseygu@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'AlekseiAG_2026-09-09 22.29.44_picture-0_01.png' FROM users WHERE email = 'Alekseygu@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'AlekseiAG_2026-09-09 22.29.44_picture-0_01.png' FROM users WHERE email = 'Alekseygu@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'AlekseiAG_2026-09-09 22.29.44_picture-0_01.png' FROM users WHERE email = 'Alekseygu@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'AlekseiAG_2026-09-09 22.29.44_picture-0_01.png' FROM users WHERE email = 'Alekseygu@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Valid Basnukaev', 'validbasnukaev@gmail.com', '$2b$12$1RDufJIYBFpbOZpJpW4JSOtddwypBLEV5SuStdJmEPeuhKjHnuSTK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'validbasnukaev@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Helix', 'Republic of belarus. Minsk. Lane kalinina 5a', 'Pharma Sales', 'Manager', '768917435', 'Valid Basnukaev', 'male', '768971435', 'Shenzhen', '', 'meeting', 'validbasnukaev@gmail.com'
FROM users WHERE email = 'validbasnukaev@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Valid Basnukaev _2026-09-09 22.31.55_picture-0_01.png' FROM users WHERE email = 'validbasnukaev@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Valid Basnukaev _2026-09-09 22.31.55_picture-0_01.png' FROM users WHERE email = 'validbasnukaev@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Valid Basnukaev _2026-09-09 22.31.55_picture-0_01.png' FROM users WHERE email = 'validbasnukaev@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Valid Basnukaev _2026-09-09 22.31.55_picture-0_01.png' FROM users WHERE email = 'validbasnukaev@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Valid Basnukaev _2026-09-09 22.31.55_picture-0_01.png' FROM users WHERE email = 'validbasnukaev@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Achraf Idyouss', 'idyachrag@gmail.com', '$2b$12$zrx1tgHW4ZtKUgDbCtWLe.bAEGX.9NghSEMeFXJ.tV4XHwCsZ8Ts2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'idyachrag@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Exmi global', 'Exmi global', 'Distributor/Import-Export', 'Manager', 'RG4821586', 'Achraf Idyouss', 'male', 'idyachraf', 'Guangzhou', '', 'visiting', 'idyachrag@gmail.com'
FROM users WHERE email = 'idyachrag@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Achraf Idyouss_2026-09-10 00.57.20_IMG_6928_01.jpeg' FROM users WHERE email = 'idyachrag@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Achraf Idyouss_2026-09-10 00.57.20_IMG_8025_01.jpeg' FROM users WHERE email = 'idyachrag@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Achraf Idyouss_2026-09-10 00.57.20_Blue Grey Minimalist Modern Business Card_01.png' FROM users WHERE email = 'idyachrag@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Achraf Idyouss_2026-09-10 00.57.20_Blue Grey Minimalist Modern Business Card_01.png' FROM users WHERE email = 'idyachrag@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Achraf Idyouss_2026-09-10 00.57.20_IMG_6723_01.jpeg' FROM users WHERE email = 'idyachrag@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Syed Aqib Rasool shah', 'Aqibshah5045@gmail.com', '$2b$12$G79F5yI9jk.WPNZ0bXhd8.NIAn3G6nmbwfaKNIHvdnwLmUconkHLu', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Aqibshah5045@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Shah enterprise', 'Malir cant, karachi, Pakistan', 'Pharma Sales', 'CEO', 'JR5156726', 'Syed Aqib Rasool shah', 'male', 'aqibshah22', 'Guangzhou', '', 'visiting', 'Aqibshah5045@gmail.com'
FROM users WHERE email = 'Aqibshah5045@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Jia_2026-09-10 12.05.14_1768_01.jpeg' FROM users WHERE email = 'Aqibshah5045@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Jia_2026-09-10 12.05.14_1770_01.jpeg' FROM users WHERE email = 'Aqibshah5045@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Jia_2026-09-10 12.05.14_1001_01.png' FROM users WHERE email = 'Aqibshah5045@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Jia_2026-09-10 12.05.14_1042_01.jpeg' FROM users WHERE email = 'Aqibshah5045@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Jia_2026-09-10 12.05.14_1776_01.jpeg' FROM users WHERE email = 'Aqibshah5045@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'OUMAIMA OUASKIOUD', 'Oumaimaouaskioud1999@yahoo.com', '$2b$12$Elpfbj.btmuaCarf9SEwKOssJcoS1R0YNAkgaLFp.JeQ2U9rhv67e', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Oumaimaouaskioud1999@yahoo.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'SOURCE ENERGIE COMPANY LIMITED', 'Yuexiu district Guangzhou', 'Distributor/Import-Export', 'Manager', 'JR2187071', 'OUMAIMA OUASKIOUD', 'female', '13265384026', 'Guangzhou', '', 'visiting', 'Oumaimaouaskioud1999@yahoo.com'
FROM users WHERE email = 'Oumaimaouaskioud1999@yahoo.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'oumaima ouaskioud _2026-09-10 15.26.54_IMG_3965_01.jpeg' FROM users WHERE email = 'Oumaimaouaskioud1999@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'oumaima ouaskioud _2026-09-10 15.26.54_IMG_3966_01.jpeg' FROM users WHERE email = 'Oumaimaouaskioud1999@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'oumaima ouaskioud _2026-09-10 15.26.54_IMG_5305_01.png' FROM users WHERE email = 'Oumaimaouaskioud1999@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'oumaima ouaskioud _2026-09-10 15.26.54_IMG_3977_01.png' FROM users WHERE email = 'Oumaimaouaskioud1999@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'oumaima ouaskioud _2026-09-10 15.26.54_IMG_5795_01.jpeg' FROM users WHERE email = 'Oumaimaouaskioud1999@yahoo.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'MAROUA BAIKRM', 'Maruokeinternationaltrade@gmail.com', '$2b$12$uYOJ1C5IaZmoPLBJTtJBiOlWSlD0vbLOdgXXWHssS42BGrPlOchDW', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Maruokeinternationaltrade@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, '广州马若可国际贸易有限公司', 'Yuexiu district', 'Distributor/Import-Export', 'Manager', 'VX4580216', 'MAROUA BAIKRM', 'female', '17629231602', 'Guangzhou', '', 'visiting', 'Maruokeinternationaltrade@gmail.com'
FROM users WHERE email = 'Maruokeinternationaltrade@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Maroua BAIKEM_2026-09-10 15.36.12_14232_01.jpeg' FROM users WHERE email = 'Maruokeinternationaltrade@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Maroua BAIKEM_2026-09-10 15.36.12_14233_01.jpeg' FROM users WHERE email = 'Maruokeinternationaltrade@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Maroua BAIKEM_2026-09-10 15.36.12_14235_01.jpeg' FROM users WHERE email = 'Maruokeinternationaltrade@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Maroua BAIKEM_2026-09-10 15.36.12_14234_01.jpeg' FROM users WHERE email = 'Maruokeinternationaltrade@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Maroua BAIKEM_2026-09-10 15.36.12_14236_01.jpeg' FROM users WHERE email = 'Maruokeinternationaltrade@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'RP4123663', 'ayankhanjadoon2006@gmail.com', '$2b$12$7x1yFXQQPnyIHuxrOqbs1uB0XVVAAkqpUbYyklPdJJDxlwfRNRUvm', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ayankhanjadoon2006@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'TSING-HUA LUBE (PRIVATE) Limited', 'Office no5, bank plaza markaz sector f11, Islamabad, Pakistan', 'Ingredients manufacturers', 'Purchasing Manager', 'RP4123663', 'RP4123663', 'male', 'wxid_sykfhzol54gq22', 'Shenzhen', '', 'visiting', 'ayankhanjadoon2006@gmail.com'
FROM users WHERE email = 'ayankhanjadoon2006@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Ayan_2026-09-10 19.35.55_picture-0_01.png' FROM users WHERE email = 'ayankhanjadoon2006@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Ayan_2026-09-10 19.35.55_picture-0_01.png' FROM users WHERE email = 'ayankhanjadoon2006@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Ayan_2026-09-10 19.35.55_picture-0_01.png' FROM users WHERE email = 'ayankhanjadoon2006@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Ayan_2026-09-10 19.35.55_picture-0_01.png' FROM users WHERE email = 'ayankhanjadoon2006@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Ayan_2026-09-10 19.35.55_picture-0_01.png' FROM users WHERE email = 'ayankhanjadoon2006@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'SAZONOV VADIM', 'linkwansu@qq.com', '$2b$12$Rp47Gr7ONoHzCzMJd7e75OxRhCEFYiuw6eBU5qpWO1K4Jvoh63LZK', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'linkwansu@qq.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Sazonov Sole Prietor', 'Khabarovsk, Leningradskaya 6', 'Distributor/Import-Export', 'Owner', '756236540', 'SAZONOV VADIM', 'male', 'wxid_jkandefvqxw422', 'Guangzhou', '', 'visiting', 'linkwansu@qq.com'
FROM users WHERE email = 'linkwansu@qq.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Lin_2026-09-11 15.26.14_picture-0_01.png' FROM users WHERE email = 'linkwansu@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Lin_2026-09-11 15.26.14_picture-0_01.png' FROM users WHERE email = 'linkwansu@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Lin_2026-09-11 15.26.14_picture-0_01.png' FROM users WHERE email = 'linkwansu@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Lin_2026-09-11 15.26.14_picture-0_01.png' FROM users WHERE email = 'linkwansu@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Lin_2026-09-11 15.26.14_picture-0_01.png' FROM users WHERE email = 'linkwansu@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'TEPLIAKOVA MARIIA', 'Linkwansu+dup2@qq.com', '$2b$12$cj5wXSLckHIoHfPq5WGYouqQnj7xsD2Kmod0BymzQwaPkPsS4gIby', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Linkwansu+dup2@qq.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Sazonov sole proprietor', 'Khabarovsk, Leningradskaya 6', 'Distributor/Import-Export', 'Assistant manager', '773166660', 'TEPLIAKOVA MARIIA', 'female', 'mariyasenpai', 'Guangzhou', '', 'visiting', 'Linkwansu@qq.com'
FROM users WHERE email = 'Linkwansu+dup2@qq.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Mariya 玛丽亚_2026-09-11 15.49.01_IMG_6449_01.jpeg' FROM users WHERE email = 'Linkwansu+dup2@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Mariya 玛丽亚_2026-09-11 15.49.01_IMG_6450_01.jpeg' FROM users WHERE email = 'Linkwansu+dup2@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Mariya 玛丽亚_2026-09-11 15.49.01_4492_01.jpeg' FROM users WHERE email = 'Linkwansu+dup2@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Mariya 玛丽亚_2026-09-11 15.49.01_4493_01.jpeg' FROM users WHERE email = 'Linkwansu+dup2@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Mariya 玛丽亚_2026-09-11 15.49.01_1C792594-0D74-441D-B587-EC13C302C2D6_01.png' FROM users WHERE email = 'Linkwansu+dup2@qq.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'SAZONOV NIKOLAI', 'nikosapun@yandex.ru', '$2b$12$VCfMYbgcSBboJ8wfAvuOn.ZGqcjievs.GNAdt10wXRZ16MWst6JA2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'nikosapun@yandex.ru');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Sazonov sole proprietor', 'Khabarovsk, leningradskaya 6', 'Distributor/Import-Export', 'Marketing manager', '756236556', 'SAZONOV NIKOLAI', 'male', 'nikosapun', 'Guangzhou', '', 'visiting', 'nikosapun@yandex.ru'
FROM users WHERE email = 'nikosapun@yandex.ru'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Niko_2026-09-11 20.46.15_2-3_01.jpg' FROM users WHERE email = 'nikosapun@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Niko_2026-09-11 20.46.15_22-23 (VISA AUG 2026)_01.jpg' FROM users WHERE email = 'nikosapun@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Niko_2026-09-11 20.46.15_IMG_1208_01.jpeg' FROM users WHERE email = 'nikosapun@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Niko_2026-09-11 20.46.15_License_01.jpeg' FROM users WHERE email = 'nikosapun@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Niko_2026-09-11 20.46.15_full face_01.jpg' FROM users WHERE email = 'nikosapun@yandex.ru'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'YOUSAF MUHAMMAD UMAR', 'dr.mumarsherazi786@gmail.com', '$2b$12$mAmOLoDeft7hSa/5I4Ctg.xSbRXhrlaz/ycKTPDkBNmt0GsokEw3S', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'dr.mumarsherazi786@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'UMAR GLOBAL VENTURES', 'Opposite to Canal Road Lahore, Punjab, Pakistan', 'Distributor/Import-Export', 'Chief Executive Officer & Managing Director', 'HE6916401', 'YOUSAF MUHAMMAD UMAR', 'male', 'Dr-UMARSheraZI', 'Guangzhou', '', 'meeting', 'dr.mumarsherazi786@gmail.com'
FROM users WHERE email = 'dr.mumarsherazi786@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Dr.M.UmaR SheRaZi RajpuT(永国亭)_2026-09-11 21.36.25_23_01.jpeg' FROM users WHERE email = 'dr.mumarsherazi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Dr.M.UmaR SheRaZi RajpuT(永国亭)_2026-09-11 21.36.25_IMG_2578_01.jpeg
Dr.M.UmaR SheRaZi RajpuT(永国亭)_2026-09-11 21.36.25_IMG_4548_02.jpeg' FROM users WHERE email = 'dr.mumarsherazi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Dr.M.UmaR SheRaZi RajpuT(永国亭)_2026-09-11 21.36.25_2026-08-22_Original_01.jpeg
Dr.M.UmaR SheRaZi RajpuT(永国亭)_2026-09-11 21.36.25_IMG_0311_02.jpeg' FROM users WHERE email = 'dr.mumarsherazi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Dr.M.UmaR SheRaZi RajpuT(永国亭)_2026-09-11 21.36.25_IMG_0300_01.jpeg' FROM users WHERE email = 'dr.mumarsherazi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Dr.M.UmaR SheRaZi RajpuT(永国亭)_2026-09-11 21.36.25_IMG_1093_01.jpeg' FROM users WHERE email = 'dr.mumarsherazi786@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Anatolii Amelichev', '6966643@gmail.com', '$2b$12$/uzgIleiiOzTc/r542Vhr.kLi5tTSDav1.iiKeH2Q/hoU3CAJHZce', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '6966643@gmail.com');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Peptider', '117333 Russia, Gubkina 4', 'Pharma Sales', 'Director', '76 7194903', 'Anatolii Amelichev', 'male', 'wxid_ryd9icelpaaq22', 'Shenzhen', '', 'visiting', '6966643@gmail.com'
FROM users WHERE email = '6966643@gmail.com'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'doc_2026-09-12 17.15.46_picture-0_01.png' FROM users WHERE email = '6966643@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'doc_2026-09-12 17.15.46_picture-0_01.png' FROM users WHERE email = '6966643@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'doc_2026-09-12 17.15.46_picture-0_01.png' FROM users WHERE email = '6966643@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'doc_2026-09-12 17.15.46_picture-0_01.png' FROM users WHERE email = '6966643@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'doc_2026-09-12 17.15.46_picture-0_01.png' FROM users WHERE email = '6966643@gmail.com'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'Yassaine Ellaouzy', 'Yassine.ellouzi@uit.ac.ma', '$2b$12$R9dyd6RKWALJ0e/1n4UXqejElPVq7j4kFK50TqqDdd8JBQtUqE/N2', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Yassine.ellouzi@uit.ac.ma');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Banacetg', 'Guangzhou', 'Pharma Manufacturers', 'Manger', 'JK7846897', 'Yassaine Ellaouzy', 'male', '13163352357', 'Guangzhou', '', 'meeting', 'Yassine.ellouzi@uit.ac.ma'
FROM users WHERE email = 'Yassine.ellouzi@uit.ac.ma'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', '亚.辛.Yanni😎_2026-09-14 18.07.33_IMG_5186_01.jpeg' FROM users WHERE email = 'Yassine.ellouzi@uit.ac.ma'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', '亚.辛.Yanni😎_2026-09-14 18.07.33_IMG_5187_01.jpeg' FROM users WHERE email = 'Yassine.ellouzi@uit.ac.ma'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', '亚.辛.Yanni😎_2026-09-14 18.07.33_c5a555c98ae3c27c7e0e4864f08e8bde_01.jpeg' FROM users WHERE email = 'Yassine.ellouzi@uit.ac.ma'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', '亚.辛.Yanni😎_2026-09-14 18.07.33_c5a555c98ae3c27c7e0e4864f08e8bde_01.jpeg' FROM users WHERE email = 'Yassine.ellouzi@uit.ac.ma'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', '亚.辛.Yanni😎_2026-09-14 18.07.33_1077915c0e69e2f97320c80033347b00_01.jpeg' FROM users WHERE email = 'Yassine.ellouzi@uit.ac.ma'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO users (name, email, password_hash, role, country)
SELECT 'HUSSAIN ZEENAT KHADIM', 'Zeenatkhadim@whu.edu.cn', '$2b$12$ovUTe8/Kb0zlR282ffiQg.2ZVyx5mJ5I6yPvNE85Lx1KfvIHRuiQi', 'buyer', ''
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'Zeenatkhadim@whu.edu.cn');

INSERT INTO buyer_profiles
  (user_id, company_name, overseas_company_address, company_field, job_title, passport_number, passport_name, gender, wechat_id, departure_city, attendance_day, meeting_or_visiting, contact_email)
SELECT id, 'Al Miraj Traders', 'Al miraj foundation Dogar road Hameed pura lahore', 'Pharma Sales', 'Manager', 'Ms6905472', 'HUSSAIN ZEENAT KHADIM', 'female', 'Zeenat2025', 'Shenzhen', '', 'meeting', 'Zeenatkhadim@whu.edu.cn'
FROM users WHERE email = 'Zeenatkhadim@whu.edu.cn'
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  overseas_company_address = VALUES(overseas_company_address),
  company_field = VALUES(company_field),
  job_title = VALUES(job_title),
  passport_number = VALUES(passport_number),
  passport_name = VALUES(passport_name),
  gender = VALUES(gender),
  wechat_id = VALUES(wechat_id),
  departure_city = VALUES(departure_city),
  attendance_day = VALUES(attendance_day),
  meeting_or_visiting = VALUES(meeting_or_visiting),
  contact_email = VALUES(contact_email);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'passportFront', 'Dr.ZEENAT哈蒂_2026-09-16 02.03.07_IMG_2745_01.jpeg' FROM users WHERE email = 'Zeenatkhadim@whu.edu.cn'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'visaPage', 'Dr.ZEENAT哈蒂_2026-09-16 02.03.07_New visa_1_01.jpeg' FROM users WHERE email = 'Zeenatkhadim@whu.edu.cn'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessCard', 'Dr.ZEENAT哈蒂_2026-09-16 02.03.07_CamScanner 2026-6-11 20.32_1_01.jpeg' FROM users WHERE email = 'Zeenatkhadim@whu.edu.cn'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'businessLicense', 'Dr.ZEENAT哈蒂_2026-09-16 02.03.07_CamScanner 2026-6-11 20.32_1_01.jpeg' FROM users WHERE email = 'Zeenatkhadim@whu.edu.cn'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);

INSERT INTO buyer_pending_documents (user_id, doc_field, filename)
SELECT id, 'buyerPhoto', 'Dr.ZEENAT哈蒂_2026-09-16 02.03.07_IMG_7269_01.jpeg' FROM users WHERE email = 'Zeenatkhadim@whu.edu.cn'
ON DUPLICATE KEY UPDATE filename = VALUES(filename);
