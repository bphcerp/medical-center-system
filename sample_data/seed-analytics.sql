-- ============================================================
-- Analytics demo seed data — paste and run in Drizzle Studio
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. DISEASES  (safe to re-run — skips on conflict)
-- ──────────────────────────────────────────────────────────────
INSERT INTO diseases (name, icd) VALUES
  ('Common Cold',             'J00'),
  ('Influenza',               'J11'),
  ('Hypertension',            'I10'),
  ('Type 2 Diabetes',         'E11'),
  ('Migraine',                'G43'),
  ('Acute Gastroenteritis',   'A09'),
  ('Anxiety Disorder',        'F41.1'),
  ('Asthma',                  'J45'),
  ('Urinary Tract Infection', 'N39.0'),
  ('Lower Back Pain',         'M54.5')
ON CONFLICT (icd) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- 2. MEDICINES
-- ──────────────────────────────────────────────────────────────
INSERT INTO medicines (drug, company, brand, strength, type, category, price) VALUES
  ('Paracetamol',  'GSK',         'Calpol',     '500mg', 'Analgesic',     'Capsule/Tablet', 5),
  ('Ibuprofen',    'Reckitt',     'Brufen',     '400mg', 'NSAID',         'Capsule/Tablet', 8),
  ('Amoxicillin',  'Cipla',       'Novamox',    '500mg', 'Antibiotic',    'Capsule/Tablet', 25),
  ('Cetirizine',   'UCB',         'Zyrtec',     '10mg',  'Antihistamine', 'Capsule/Tablet', 12),
  ('Omeprazole',   'AstraZeneca', 'Prilosec',   '20mg',  'PPI',           'Capsule/Tablet', 15),
  ('Metformin',    'Merck',       'Glucophage', '500mg', 'Antidiabetic',  'Capsule/Tablet', 10),
  ('Azithromycin', 'Pfizer',      'Zithromax',  '250mg', 'Antibiotic',    'Capsule/Tablet', 30);


-- ──────────────────────────────────────────────────────────────
-- 3. PATIENTS + TYPE TABLES  (chained CTEs, single statement)
-- ──────────────────────────────────────────────────────────────
WITH
  p01 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Arjun Sharma',     'student',   '2003-04-12', 'male')   RETURNING id),
  _01 AS (INSERT INTO students ("studentId", email, phone, "patientId") SELECT '2021A7PS001P', 'arjun.sharma@pilani.bits-pilani.ac.in',    '9876501001', id FROM p01),
  p02 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Priya Menon',      'student',   '2004-08-23', 'female') RETURNING id),
  _02 AS (INSERT INTO students ("studentId", email, phone, "patientId") SELECT '2022A3PS002G', 'priya.menon@goa.bits-pilani.ac.in',         '9876501002', id FROM p02),
  p03 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Rahul Verma',      'student',   '2002-11-05', 'male')   RETURNING id),
  _03 AS (INSERT INTO students ("studentId", email, phone, "patientId") SELECT '2020B4PS003H', 'rahul.verma@hyderabad.bits-pilani.ac.in',   '9876501003', id FROM p03),
  p04 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Sneha Iyer',       'student',   '2003-07-19', 'female') RETURNING id),
  _04 AS (INSERT INTO students ("studentId", email, phone, "patientId") SELECT '2021A1PS004P', 'sneha.iyer@pilani.bits-pilani.ac.in',        '9876501004', id FROM p04),
  p05 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Karan Patel',      'student',   '2004-01-30', 'male')   RETURNING id),
  _05 AS (INSERT INTO students ("studentId", email, phone, "patientId") SELECT '2022B2PS005G', 'karan.patel@goa.bits-pilani.ac.in',         '9876501005', id FROM p05),
  p06 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Divya Nair',       'student',   '2003-09-14', 'female') RETURNING id),
  _06 AS (INSERT INTO students ("studentId", email, phone, "patientId") SELECT '2021A8PS006P', 'divya.nair@pilani.bits-pilani.ac.in',        '9876501006', id FROM p06),
  p07 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Dr. Suresh Kumar', 'professor', '1972-03-22', 'male')   RETURNING id),
  _07 AS (INSERT INTO professors (psrn, email, phone, "patientId") SELECT 'PROF2024001', 'suresh.kumar@pilani.bits-pilani.ac.in', '9876501010', id FROM p07),
  p08 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Dr. Meena Rao',    'professor', '1980-09-15', 'female') RETURNING id),
  _08 AS (INSERT INTO professors (psrn, email, phone, "patientId") SELECT 'PROF2024002', 'meena.rao@pilani.bits-pilani.ac.in',    '9876501011', id FROM p08),
  p09 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Ravi Kumar',       'dependent', '2008-06-10', 'male')   RETURNING id),
  _09 AS (INSERT INTO dependents (psrn, "patientId") SELECT 'PROF2024001', id FROM p09),
  p10 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Anita Rao',        'dependent', '2010-11-25', 'female') RETURNING id),
  _10 AS (INSERT INTO dependents (psrn, "patientId") SELECT 'PROF2024002', id FROM p10),
  p11 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Amit Singh',       'visitor',   '1990-12-01', 'male')   RETURNING id),
  _11 AS (INSERT INTO visitors (email, phone, "patientId") SELECT 'amit.singh@gmail.com',   '9876501020', id FROM p11),
  p12 AS (INSERT INTO patients (name, type, birthdate, sex) VALUES ('Lakshmi Devi',     'visitor',   '1985-05-20', 'female') RETURNING id),
  _12 AS (INSERT INTO visitors (email, phone, "patientId") SELECT 'lakshmi.devi@gmail.com', '9876501021', id FROM p12)
SELECT 1;


-- ──────────────────────────────────────────────────────────────
-- 4. CASES  (55 rows spread over last 60 days)
--    Weighted diagnosis: J00 5×, J11 4×, I10/A09 3×, G43/F41.1 2×, rest 1×
-- ──────────────────────────────────────────────────────────────
INSERT INTO cases (token, patient, weight, temperature, "heartRate", spo2, "consultationNotes", diagnosis, finalized_state, created_at, updated_at)
SELECT
  9000 + gs,
  (SELECT id FROM patients ORDER BY random() LIMIT 1),
  (55 + (random() * 35))::integer,
  round((36.2 + random() * 2.3)::numeric, 1)::real,
  (65 + (random() * 35))::integer,
  (94 + (random() * 6))::integer,
  'Patient presented with symptoms. Examination and vitals recorded.',
  ARRAY[(
    SELECT id FROM diseases WHERE icd =
      (ARRAY['J00','J00','J00','J00','J00',
             'J11','J11','J11','J11',
             'I10','I10','I10',
             'A09','A09','A09',
             'G43','G43',
             'F41.1','F41.1',
             'N39.0','J45','E11','M54.5']
      )[1 + (random() * 22)::integer]
  )],
  (ARRAY['opd','opd','opd','admitted','referred']::finalized_state[])[1 + (random() * 4)::integer],
  NOW() - (floor(random() * 60)::text || ' days')::interval
       - ((random() * 8)::text || ' hours')::interval,
  NOW() - (floor(random() * 60)::text || ' days')::interval
       - ((random() * 8)::text || ' hours')::interval
FROM generate_series(1, 55) gs;


-- ──────────────────────────────────────────────────────────────
-- 5. PRESCRIPTIONS
--    Weighted medicine: Calpol 4×, Novamox 3×, others 1×
--    Primary for every case; second for ~60% of cases
-- ──────────────────────────────────────────────────────────────
INSERT INTO case_prescriptions ("caseId", "medicineId", dosage, frequency, duration, "durationUnit", "categoryData")
SELECT
  id,
  (SELECT id FROM medicines WHERE brand =
    (ARRAY['Calpol','Calpol','Calpol','Calpol',
           'Novamox','Novamox','Novamox',
           'Brufen','Zyrtec','Prilosec','Glucophage','Zithromax']
    )[1 + (random() * 11)::integer]
  LIMIT 1),
  '1 tablet', 'Twice daily', '5', 'days',
  '{"category": "Capsule/Tablet", "mealTiming": "After Meal"}'::jsonb
FROM cases WHERE token BETWEEN 9001 AND 9055;

INSERT INTO case_prescriptions ("caseId", "medicineId", dosage, frequency, duration, "durationUnit", "categoryData")
SELECT
  id,
  (SELECT id FROM medicines WHERE brand =
    (ARRAY['Calpol','Calpol','Calpol','Calpol',
           'Novamox','Novamox','Novamox',
           'Brufen','Zyrtec','Prilosec','Glucophage','Zithromax']
    )[1 + (random() * 11)::integer]
  LIMIT 1),
  '1 tablet', 'Once daily', '7', 'days',
  '{"category": "Capsule/Tablet", "mealTiming": "Before Meal"}'::jsonb
FROM cases WHERE token BETWEEN 9001 AND 9055 AND random() < 0.6;


-- ──────────────────────────────────────────────────────────────
-- 6. APPOINTMENTS  (auto-skipped if no users exist)
--    Status weighted: completed 3×, cancelled 1×, no_show 1×
-- ──────────────────────────────────────────────────────────────
INSERT INTO appointments ("patientId", "doctorId", appointment_date, slot_start, slot_end, status, token_number, booked_by_id, created_at, updated_at)
SELECT
  (SELECT id FROM patients ORDER BY random() LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  (CURRENT_DATE - (gs * 2))::text,
  '10:00', '10:15',
  (ARRAY['completed','completed','completed','cancelled','no_show']::appointment_status[])[1 + (random() * 4)::integer],
  gs,
  (SELECT id FROM users LIMIT 1),
  NOW() - (gs * 2 || ' days')::interval,
  NOW() - (gs * 2 || ' days')::interval
FROM generate_series(1, 20) gs
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);
