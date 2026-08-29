-- ============================================================================
-- Sehat Setu — Supabase PostgreSQL Database Schema
-- Smart Community Health Monitoring & Early Warning System
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. USERS TABLE (Citizen, Doctor, ASHA, Admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    role VARCHAR(32) NOT NULL CHECK (role IN ('citizen', 'doctor', 'asha', 'admin')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(64),
    password_hash TEXT,
    provider VARCHAR(64) DEFAULT 'local',
    provider_id VARCHAR(255),
    abha_id VARCHAR(64),
    family_id VARCHAR(64),
    zone VARCHAR(128) DEFAULT 'Zone C',
    address TEXT,
    age INT,
    gender VARCHAR(32),
    dob VARCHAR(64),
    emergency_contact VARCHAR(255),
    monitoring_status VARCHAR(64) DEFAULT 'Routine Monitoring',
    reg_number VARCHAR(128),
    specialty VARCHAR(255),
    facility VARCHAR(255),
    badge_id VARCHAR(128),
    area VARCHAR(255),
    department VARCHAR(255),
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);

-- ============================================================================
-- 3. SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    mode VARCHAR(32) DEFAULT 'login',
    user_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

-- ============================================================================
-- 4. CONSULTATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consultations (
    id VARCHAR(64) PRIMARY KEY,
    citizen_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    citizen_name VARCHAR(255),
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    chief_complaint TEXT NOT NULL,
    symptoms JSONB DEFAULT '[]'::jsonb,
    duration VARCHAR(64),
    medical_history TEXT,
    vitals JSONB DEFAULT '{}'::jsonb,
    observations TEXT,
    analysis TEXT,
    diagnosis VARCHAR(255),
    recommended_tests TEXT,
    medicines JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '{"photos":[], "pdfs":[], "videos":[]}'::jsonb,
    follow_up_date VARCHAR(64),
    outcome VARCHAR(64) DEFAULT 'Under Treatment',
    date VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_citizen ON public.consultations(citizen_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON public.consultations(doctor_id);

-- ============================================================================
-- 5. MEDICAL RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medical_records (
    id VARCHAR(64) PRIMARY KEY,
    citizen_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    date VARCHAR(64),
    details TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_citizen ON public.medical_records(citizen_id);

-- ============================================================================
-- 6. REFERRALS TABLE (ASHA -> Doctor Referrals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id VARCHAR(64) PRIMARY KEY,
    citizen_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    citizen_name VARCHAR(255),
    asha_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    asha_name VARCHAR(255),
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    reason TEXT NOT NULL,
    urgency VARCHAR(32) DEFAULT 'Medium',
    status VARCHAR(64) DEFAULT 'Pending Review',
    date VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_citizen ON public.referrals(citizen_id);
CREATE INDEX IF NOT EXISTS idx_referrals_asha ON public.referrals(asha_id);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON public.referrals(doctor_id);

-- ============================================================================
-- 7. HEALTH REPORTS & SYMPTOM LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.health_reports (
    id VARCHAR(64) PRIMARY KEY,
    citizen_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    citizen_name VARCHAR(255),
    zone VARCHAR(128) DEFAULT 'Zone C',
    symptoms JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    severity VARCHAR(32) DEFAULT 'Mild',
    photos JSONB DEFAULT '[]'::jsonb,
    verified_by_asha BOOLEAN DEFAULT FALSE,
    date VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_reports_zone ON public.health_reports(zone);

-- ============================================================================
-- 8. ASHA HOUSEHOLD TASKS & VISITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.asha_tasks (
    id VARCHAR(64) PRIMARY KEY,
    asha_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    family_id VARCHAR(64),
    head_name VARCHAR(255),
    address TEXT,
    reason TEXT,
    priority VARCHAR(32) DEFAULT 'Normal',
    date VARCHAR(64),
    status VARCHAR(64) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asha_tasks_asha ON public.asha_tasks(asha_id);

-- ============================================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(64) PRIMARY KEY,
    target_role VARCHAR(32) DEFAULT 'all',
    target_user_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(64) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_target ON public.notifications(target_role, target_user_id);

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asha_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Full Access Users" ON public.users;
    CREATE POLICY "Public Full Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access Sessions" ON public.sessions;
    CREATE POLICY "Public Full Access Sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access Consultations" ON public.consultations;
    CREATE POLICY "Public Full Access Consultations" ON public.consultations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access Records" ON public.medical_records;
    CREATE POLICY "Public Full Access Records" ON public.medical_records FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access Referrals" ON public.referrals;
    CREATE POLICY "Public Full Access Referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access Reports" ON public.health_reports;
    CREATE POLICY "Public Full Access Reports" ON public.health_reports FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access Tasks" ON public.asha_tasks;
    CREATE POLICY "Public Full Access Tasks" ON public.asha_tasks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access Notifications" ON public.notifications;
    CREATE POLICY "Public Full Access Notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ============================================================================
-- 11. INITIAL SEED DATA (Citizen, Doctor, ASHA, Admin)
-- Password for all seed users is: password123
-- ============================================================================
INSERT INTO public.users (
    id, role, name, email, phone, password_hash, abha_id, family_id, zone, address, age, gender, monitoring_status, reg_number, specialty, facility, badge_id, area, department
) VALUES
(
    'C10291', 'citizen', 'Rahul Sharma', 'rahul.sharma@example.com', '+91 98765 43210',
    '3391783cf6551b9e248b9487c6742516:e8eb4ea7a1fcfdb70daef93e04e2ce26e84d720c74fb9ea0614838612be98bc58b299eef1e6878b27376cff937b2bc224097f5a9e33fb67a1fb30c1beab7f910',
    '14-8921-4320-1092', 'FAM-10284', 'Zone C', 'House #42, Sector 9, Zone C — Urban North Ward', 32, 'Male', 'Routine Monitoring', NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'DR-1004', 'doctor', 'Dr. Arishta Sharma', 'dr.arishta@health.gov.in', '+91 94567 89012',
    '3391783cf6551b9e248b9487c6742516:e8eb4ea7a1fcfdb70daef93e04e2ce26e84d720c74fb9ea0614838612be98bc58b299eef1e6878b27376cff937b2bc224097f5a9e33fb67a1fb30c1beab7f910',
    NULL, NULL, 'Zone C', NULL, 41, 'Female', NULL, 'MCI/DMC-89201', 'Community Medicine Specialist', 'Urban Community Health Centre (UCHC-4)', NULL, NULL, NULL
),
(
    'ASHA-204', 'asha', 'Sunita Devi', 'sunita.asha@health.gov.in', '+91 91234 56789',
    '3391783cf6551b9e248b9487c6742516:e8eb4ea7a1fcfdb70daef93e04e2ce26e84d720c74fb9ea0614838612be98bc58b299eef1e6878b27376cff937b2bc224097f5a9e33fb67a1fb30c1beab7f910',
    NULL, NULL, 'Zone C', NULL, 36, 'Female', NULL, NULL, NULL, NULL, 'ASHA-DEL-ZN3-204', 'Zone C — Urban North Ward', NULL
),
(
    'ADMIN-001', 'admin', 'Dr. V. K. Paul (Director)', 'director.idsp@nic.in', '+91 98111 22233',
    '3391783cf6551b9e248b9487c6742516:e8eb4ea7a1fcfdb70daef93e04e2ce26e84d720c74fb9ea0614838612be98bc58b299eef1e6878b27376cff937b2bc224097f5a9e33fb67a1fb30c1beab7f910',
    NULL, NULL, 'Zone C', NULL, 58, 'Male', NULL, NULL, NULL, NULL, NULL, NULL, 'National Epidemiological Surveillance Unit'
)
ON CONFLICT (email) DO NOTHING;

-- Initial Consultations
INSERT INTO public.consultations (
    id, citizen_id, citizen_name, doctor_id, doctor_name, chief_complaint, symptoms, duration, diagnosis, outcome, date
) VALUES
(
    'CONS-901', 'C10291', 'Rahul Sharma', 'DR-1004', 'Dr. Arishta Sharma', 'Acute Watery Diarrhea with Mild Dehydration',
    '["Watery Diarrhea", "Abdominal Cramps", "Mild Fever"]'::jsonb, '2 Days', 'Acute Gastroenteritis (Suspected Contaminated Water Source)', 'Resolved', '18 August 2026'
)
ON CONFLICT (id) DO NOTHING;

-- Initial Medical Records
INSERT INTO public.medical_records (
    id, citizen_id, type, title, provider, date, details
) VALUES
(
    'REC-8801', 'C10291', 'test_report', 'CBC & Serum Electrolytes Panel', 'District Central Diagnostic Lab', '19 Aug 2026', 'Hemoglobin: 14.2 g/dL, WBC: 8,400 /mcL, Sodium: 138 mEq/L, Potassium: 4.1 mEq/L. Normal findings.'
),
(
    'REC-8802', 'C10291', 'prescription', 'Oral Rehydration & Antibiotic Prescription', 'Dr. Arishta Sharma (UCHC-4)', '18 Aug 2026', '1. ORS Sachet (1L water) SOS, 2. Tab Ciprofloxacin 500mg BD x 3 days, 3. Tab Zinc 20mg OD x 14 days.'
)
ON CONFLICT (id) DO NOTHING;

-- Initial Referrals
INSERT INTO public.referrals (
    id, citizen_id, citizen_name, asha_id, asha_name, doctor_id, doctor_name, reason, urgency, status, date
) VALUES
(
    'REF-501', 'C10291', 'Rahul Sharma', 'ASHA-204', 'Sunita Devi', 'DR-1004', 'Dr. Arishta Sharma',
    'High fever and persistent abdominal cramps reported during household visit.', 'Medium', 'Completed', '18 Aug 2026'
)
ON CONFLICT (id) DO NOTHING;
