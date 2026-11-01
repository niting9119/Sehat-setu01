/**
 * ============================================================================
 * SEHAT SETU — Centralized Reactive State Store (Data Layer)
 * ============================================================================
 * 
 * TABLE OF CONTENTS:
 *  1. INITIAL_STATE Definition (Lines 35 - 850)
 *      - Line ~20:   userAccounts (Registered login users)
 *      - Line ~160:  users (Default profiles for Citizen, Doctor, ASHA, Admin)
 *      - Line ~197:  family (FAM-10284 members & household clustering signals)
 *      - Line ~250:  citizenTimeline (Health events & doctor visits)
 *      - Line ~290:  medicalRecords (Diagnostic reports, blood tests, Rx)
 *      - Line ~327:  doctorPatients (Surveillance intake queue)
 *      - Line ~387:  consultations (Full clinical consultations & vitals)
 *      - Line ~519:  doctorPerformance (Rating 4.8/5.0, success metrics)
 *      - Line ~562:  ashaTasks (Household follow-ups & visits)
 *      - Line ~596:  zones (Surveillance Zones A through E with risk scores)
 *      - Line ~673:  earlyWarnings (Syndromic early warning alerts)
 *      - Line ~709:  environmental (Water quality, rain, vector breeding)
 *      - Line ~717:  kpis (Overall platform statistics)
 *      - Line ~727:  referrals (Patient referral pipeline)
 *      - Line ~776:  notifications (In-app notification messages)
 * 
 *  2. StateStore Class (Lines 855+)
 *      - loadState() / saveState(): LocalStorage synchronization
 *      - subscribe() / notify(): Pub/Sub reactive listeners & SSE broadcast
 *      - login() / signup(): Authentication actions
 *      - submitHealthReport(): Citizen reporting action
 *      - recordDoctorConsultation(): Doctor clinical assessment action
 *      - recordAshaVerification(): ASHA field verification action
 * 
 * HOW TO MODIFY DATA:
 *  - To change default patients: edit `doctorPatients` or `userAccounts` below.
 *  - To change surveillance risk scores: edit `zones` object.
 *  - To reset data in browser: open DevTools Console -> type `window.SehatState.resetState()`
 * ============================================================================
 */

const STORAGE_KEY = 'SEHAT_SETU_STATE_V2';

// Initial Seed Demo Data
const INITIAL_STATE = {
  currentRole: 'landing', // 'landing', 'auth', 'citizen', 'doctor', 'asha', 'admin'
  currentTab: 'dashboard', // active sub-tab within role
  authMode: 'login', // 'login' or 'signup'
  authSelectedRole: 'citizen', // selected role in login/signup
  theme: 'light', // 'light' or 'dark'
  isAuthenticated: false,
  currentUser: null, // set when logged in

  // Registered User Accounts (For Auth System)
  userAccounts: [
    {
      id: 'C10291',
      username: 'rahul.sharma',
      password: 'password123',
      role: 'citizen',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      mobile: '+91 98765 43210',
      abhaId: '14-8921-4320-1092',
      age: 32,
      gender: 'Male',
      familyId: 'FAM-10284',
      zone: 'Zone C',
      address: 'House #42, Sector 9, Zone C — Urban North Ward',
      emergencyContact: '+91 98765 00000 (Father)',
      monitoringStatus: 'Routine Monitoring',
      nextFollowUp: '24 August',
      joinedDate: '15 Jan 2026',
      consentDataSharing: true,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      dob: '14 Aug 1994',
      emergencyContact: '+91 98765 00000 (Father)'
    },
    {
      id: 'C10304',
      username: 'pooja.verma',
      password: 'password123',
      role: 'citizen',
      name: 'Pooja Verma',
      email: 'pooja.verma@example.com',
      mobile: '+91 98765 22334',
      abhaId: '14-3490-8812-3321',
      age: 28,
      gender: 'Female',
      familyId: 'FAM-10310',
      zone: 'Zone C',
      address: 'Block 4, Lane 2, Sector 9, Zone C',
      emergencyContact: '+91 98765 11111 (Husband)',
      monitoringStatus: 'Follow-up Required',
      nextFollowUp: '23 August',
      joinedDate: '20 Jan 2026',
      consentDataSharing: true,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      dob: '02 May 1998'
    },
    {
      id: 'C10312',
      username: 'mohd.imran',
      password: 'password123',
      role: 'citizen',
      name: 'Mohd. Imran',
      email: 'mohd.imran@example.com',
      mobile: '+91 98765 33445',
      abhaId: '14-7712-4432-8871',
      age: 45,
      gender: 'Male',
      familyId: 'FAM-10332',
      zone: 'Zone C',
      address: 'Shop #12, Market Street, Zone C',
      emergencyContact: '+91 98765 22222 (Brother)',
      monitoringStatus: 'Active Observation',
      nextFollowUp: '25 August',
      joinedDate: '01 Feb 2026',
      consentDataSharing: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      dob: '18 Nov 1980'
    },
    {
      id: 'C10188',
      username: 'kamla.devi',
      password: 'password123',
      role: 'citizen',
      name: 'Kamla Devi',
      email: 'kamla.devi@example.com',
      mobile: '+91 98765 55667',
      abhaId: '14-5541-9923-1144',
      age: 67,
      gender: 'Female',
      familyId: 'FAM-10150',
      zone: 'Zone B',
      address: 'House #8, Lake View Enclave, Zone B',
      emergencyContact: '+91 98765 33333 (Son)',
      monitoringStatus: 'Routine Monitoring',
      nextFollowUp: '27 August',
      joinedDate: '10 Jan 2026',
      consentDataSharing: true,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      dob: '05 Mar 1959'
    },
    {
      id: 'DR-1004',
      username: 'dr.arishta',
      password: 'password123',
      role: 'doctor',
      name: 'Dr. Arishta Sharma',
      email: 'dr.arishta@health.gov.in',
      mobile: '+91 94567 89012',
      regNumber: 'MCI/DMC-89201',
      specialty: 'Community Medicine Specialist',
      facility: 'Urban Community Health Centre (UCHC-4)',
      assignedZone: 'Zone C',
      age: 41,
      gender: 'Female',
      joinedDate: '10 Feb 2024'
    },
    {
      id: 'ASHA-204',
      username: 'sunita.devi',
      password: 'password123',
      role: 'asha',
      name: 'Sunita Devi',
      email: 'sunita.asha204@health.gov.in',
      mobile: '+91 91234 56789',
      roleTitle: 'Accredited Social Health Activist (ASHA)',
      area: 'Zone C — Urban North Ward',
      badgeId: 'ASHA-DEL-ZN3-204',
      pendingFollowupsCount: 8,
      highRiskHouseholdsCount: 2,
      activeAlertsCount: 1,
      age: 36,
      gender: 'Female',
      joinedDate: '01 Mar 2022'
    },
    {
      id: 'ADMIN-001',
      username: 'director.surveillance',
      password: 'password123',
      role: 'admin',
      name: 'Dr. V. K. Paul (Director)',
      email: 'director.surveillance@idsp.nic.in',
      mobile: '+91 98111 22233',
      department: 'District Epidemiological Surveillance Unit',
      district: 'Central Metro Surveillance Division',
      designation: 'Chief Epidemiological Surveillance Officer',
      age: 52,
      gender: 'Male',
      joinedDate: '01 Jan 2020'
    }
  ],

  // Users Object for quick reference
  users: {
    citizen: {
      id: 'C10291',
      name: 'Rahul Sharma',
      age: 32,
      gender: 'Male',
      familyId: 'FAM-10284',
      zone: 'Zone C',
      address: 'House #42, Sector 9, Zone C',
      monitoringStatus: 'Routine Monitoring',
      nextFollowUp: '24 August'
    },
    doctor: {
      id: 'DR-1004',
      name: 'Dr. Arishta Sharma',
      specialty: 'Community Medicine Specialist',
      facility: 'Urban Community Health Centre (UCHC-4)',
      assignedZone: 'Zone C'
    },
    asha: {
      id: 'ASHA-204',
      name: 'Sunita Devi',
      roleTitle: 'Accredited Social Health Activist (ASHA)',
      area: 'Zone C — Urban North Ward',
      pendingFollowupsCount: 8,
      highRiskHouseholdsCount: 2,
      activeAlertsCount: 1
    },
    admin: {
      id: 'ADMIN-001',
      name: 'Dr. V. K. Paul (Director)',
      department: 'District Epidemiological Surveillance Unit',
      district: 'Central Metro Surveillance Division'
    }
  },

  // Family Unit
  family: {
    id: 'FAM-10284',
    address: 'House #42, Sector 9, Zone C',
    householdSignals: [
      {
        id: 'hs-1',
        text: '2 health reports recorded from this household in the last 7 days.',
        status: 'recommended',
        recommendation: 'Household follow-up recommended by health worker.'
      }
    ],
    members: [
      {
        id: 'C10290',
        name: 'Rajendra Sharma',
        relation: 'Father',
        age: 64,
        status: 'Routine Monitoring',
        riskBadge: 'normal',
        lastReportDate: '12 Aug'
      },
      {
        id: 'C10289',
        name: 'Shanti Sharma',
        relation: 'Mother',
        age: 59,
        status: 'Follow-up Required',
        riskBadge: 'watch',
        lastReportDate: '19 Aug',
        symptoms: ['Mild Cough', 'Fatigue']
      },
      {
        id: 'C10292',
        name: 'Ananya Sharma',
        relation: 'Sister / Member 3',
        age: 27,
        status: 'Routine Monitoring',
        riskBadge: 'normal',
        lastReportDate: '04 Aug'
      },
      {
        id: 'C10291',
        name: 'Rahul Sharma (You)',
        relation: 'Self / Member 4',
        age: 32,
        status: 'Routine Monitoring',
        riskBadge: 'normal',
        lastReportDate: '18 Aug'
      }
    ]
  },

  // Timeline Events for Citizen C10291
  citizenTimeline: [
    {
      id: 'tl-1',
      date: '18 Aug, 10:15 AM',
      type: 'report',
      title: 'Health issue reported',
      description: 'Reported symptoms: Moderate Fever (38.5°C), Gastrointestinal discomfort. Duration: 2 days. Location: Zone C.',
      badgeText: 'Citizen Report',
      badgeClass: 'badge-neutral'
    },
    {
      id: 'tl-2',
      date: '19 Aug, 02:30 PM',
      type: 'doctor',
      title: 'Doctor consultation recorded',
      description: 'Consultation conducted by Dr. Arishta Sharma (DR-1004). Vital signs documented: BP 120/80, SpO2 98%.',
      badgeText: 'Consultation Done',
      badgeClass: 'badge-normal'
    },
    {
      id: 'tl-3',
      date: '19 Aug, 02:45 PM',
      type: 'doctor',
      title: 'Clinical assessment recorded',
      description: 'Assessment: Acute febrile symptom cluster. Advice: ORS hydration, rest, paracetamol as required. Advised to isolate if symptoms persist.',
      badgeText: 'Clinical Notes',
      badgeClass: 'badge-normal'
    },
    {
      id: 'tl-4',
      date: '24 Aug (Scheduled)',
      type: 'followup',
      title: 'Follow-up due',
      description: 'Routine recovery verification follow-up scheduled via ASHA field visit / UCHC tele-review.',
      badgeText: 'Pending Milestone',
      badgeClass: 'badge-watch'
    }
  ],

  // Medical Records (Test Reports, Doctor Consultations, Prescriptions)
  medicalRecords: [
    {
      id: 'rec-1',
      type: 'test_report',
      category: '🧪 Test Report',
      title: 'Complete Blood Count (CBC) & Widal Panel',
      date: '19 Aug 2026',
      provider: 'City Care Diagnostic Lab / UCHC-4',
      details: 'Hemoglobin: 14.2 g/dL, WBC: 9,200/mcL (Normal), Platelets: 2.1 Lakhs, Widal: Negative for Salmonella enterica. No severe bacteremia detected.',
      attachmentName: 'cbc_widal_report.jpg',
      photoUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'rec-2',
      type: 'doctor_analysis',
      category: '👨‍⚕️ Doctor Consultation',
      title: 'Acute Gastrointestinal & Febrile Assessment',
      date: '19 Aug 2026',
      provider: 'Dr. Arishta Sharma (UCHC-4 Community Hospital)',
      details: 'Patient presented with sudden mild-to-moderate fever, loose stools, and abdominal cramps following Sector 9 municipal pipeline disruption. Vitals: BP 120/80, SpO2 98%, Pulse 78 bpm. Prognosis: Favorable with oral hydration therapy.',
      attachmentName: 'clinical_consultation_summary.jpg',
      photoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'rec-3',
      type: 'prescription',
      category: '💊 Medicine Prescription',
      title: 'ORS Hydration & Probiotic Therapy Prescription',
      date: '19 Aug 2026',
      provider: 'Dr. Arishta Sharma (DR-1004)',
      details: '1. Oral Rehydration Salts (ORS) — 1 sachet in 1 Litre boiled & cooled water, drink throughout the day.\n2. Tab Paracetamol 650mg TDS (SOS for fever > 38°C).\n3. Cap Sporlac (Lactic acid bacillus) 1 cap BD for 3 days.\n4. Avoid raw vegetables and unboiled tap water.',
      attachmentName: 'rx_prescription_slip.jpg',
      photoUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80'
    }
  ],

  // Doctor Patients Queue
  doctorPatients: [
    {
      id: 'C10291',
      name: 'Rahul Sharma',
      familyId: 'FAM-10284',
      age: 32,
      gender: 'M',
      zone: 'Zone C',
      recentSymptoms: ['Fever', 'Diarrhea', 'Nausea'],
      severity: 'Moderate',
      reportedDate: '18 Aug',
      status: 'Reviewed',
      notes: 'Advised hydration therapy and isolation. Symptom cluster logged for community surveillance.',
      nextFollowUp: '24 August'
    },
    {
      id: 'C10304',
      name: 'Pooja Verma',
      familyId: 'FAM-10310',
      age: 28,
      gender: 'F',
      zone: 'Zone C',
      recentSymptoms: ['High Fever', 'Chills', 'Vomiting'],
      severity: 'Severe',
      reportedDate: '21 Aug',
      status: 'Pending Review',
      notes: '',
      nextFollowUp: '23 August'
    },
    {
      id: 'C10312',
      name: 'Mohd. Imran',
      familyId: 'FAM-10332',
      age: 45,
      gender: 'M',
      zone: 'Zone C',
      recentSymptoms: ['Fever', 'Abdominal Cramps'],
      severity: 'Moderate',
      reportedDate: '22 Aug',
      status: 'Pending Review',
      notes: '',
      nextFollowUp: '25 August'
    },
    {
      id: 'C10188',
      name: 'Kamla Devi',
      familyId: 'FAM-10150',
      age: 67,
      gender: 'F',
      zone: 'Zone B',
      recentSymptoms: ['Dry Cough', 'Mild Fever'],
      severity: 'Mild',
      reportedDate: '20 Aug',
      status: 'Reviewed',
      notes: 'Symptom trajectory stable.',
      nextFollowUp: '27 August'
    }
  ],

  // Comprehensive Doctor Consultations
  consultations: [
    {
      id: 'CONS-901',
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      facility: 'Urban Community Health Centre (UCHC-4)',
      citizenId: 'C10291',
      patientName: 'Rahul Sharma',
      patientAge: 32,
      patientGender: 'Male',
      patientZone: 'Zone C',
      patientEmail: 'rahul.sharma@example.com',
      patientMobile: '+91 98765 43210',
      date: '19 Aug 2026, 02:45 PM',
      chiefComplaint: 'Acute watery diarrhea (4-5 episodes) with moderate fever and stomach cramps.',
      symptoms: ['Fever', 'Diarrhea', 'Abdominal Cramps', 'Nausea'],
      duration: '2 Days',
      medicalHistory: 'No prior chronic conditions. Noticed municipal tap water discoloration in Sector 9 before symptom onset.',
      vitals: {
        bp: '120/80 mmHg',
        pulse: '78 bpm',
        temp: '100.4 °F',
        spo2: '98%'
      },
      observations: 'Mild dehydration signs noted (dry oral mucosa). Epigastric tenderness present. No peritoneal signs.',
      analysis: 'Acute gastrointestinal cluster symptom manifestation consistent with waterborne microbial contamination.',
      diagnosis: 'Acute Gastroenteritis with Moderate Febrile Response',
      recommendedTests: 'Complete Blood Count (CBC), Widal Panel, Stool Routine',
      medicines: [
        { name: 'Oral Rehydration Salts (ORS)', dosage: '1 Sachet in 1L Water', instruction: 'Drink throughout the day after each episode' },
        { name: 'Tab Paracetamol 650mg', dosage: '1 Tab SOS', instruction: 'Take if fever > 100°F (Max 3/day)' },
        { name: 'Cap Sporlac (Probiotic)', dosage: '1 Cap Twice Daily', instruction: 'Take with food for 3 days' }
      ],
      followUpDate: '24 Aug 2026',
      notes: 'Advised strict intake of boiled water. Avoid roadside unhygienic foods. Immediate review if vomiting persists.',
      outcome: 'Improved', // 'Improved' | 'Resolved' | 'Follow-up Required' | 'Referred' | 'Ongoing'
      attachments: {
        photos: [
          { id: 'att-p1', name: 'clinical_hydration_eval.jpg', size: '1.2 MB', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80', type: 'image' }
        ],
        pdfs: [
          { id: 'att-d1', name: 'cbc_widal_panel_lab.pdf', size: '340 KB', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80', type: 'pdf' }
        ],
        videos: [
          { id: 'att-v1', name: 'teleconsult_vitals_review.mp4', size: '4.2 MB', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', type: 'video' }
        ]
      },
      rating: {
        stars: 5,
        feedback: 'Very thorough diagnosis. The ORS hydration advice and medicine dosage cleared my fever and stomach cramps within 2 days.',
        date: '20 Aug 2026'
      }
    },
    {
      id: 'CONS-894',
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      facility: 'Urban Community Health Centre (UCHC-4)',
      citizenId: 'C10304',
      patientName: 'Pooja Verma',
      patientAge: 28,
      patientGender: 'Female',
      patientZone: 'Zone C',
      patientEmail: 'pooja.verma@example.com',
      patientMobile: '+91 98765 22334',
      date: '18 Aug 2026, 11:30 AM',
      chiefComplaint: 'High grade fever with chills and persistent vomiting.',
      symptoms: ['High Fever', 'Chills', 'Vomiting'],
      duration: '3 Days',
      medicalHistory: 'No prior allergies.',
      vitals: { bp: '110/70 mmHg', pulse: '86 bpm', temp: '101.8 °F', spo2: '99%' },
      observations: 'Mild tachycardia, oral dehydration.',
      analysis: 'Febrile gastroenteritis cluster symptom in Zone C.',
      diagnosis: 'Acute Febrile Illness',
      recommendedTests: 'CBC, Serum Electrolytes',
      medicines: [
        { name: 'Tab Ondansetron 4mg', dosage: '1 Tab BD', instruction: 'Before food for nausea' },
        { name: 'Tab Paracetamol 650mg', dosage: '1 Tab TDS', instruction: 'After meals' }
      ],
      followUpDate: '23 Aug 2026',
      notes: 'Isolate at home and observe vitals closely.',
      outcome: 'Resolved',
      attachments: {
        photos: [],
        pdfs: [{ id: 'att-d2', name: 'prescription_slip.pdf', size: '180 KB', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80', type: 'pdf' }],
        videos: []
      },
      rating: {
        stars: 5,
        feedback: 'Doctor quickly identified the gastro cluster risk and guided me on boiled water safety. Very polite and prompt!',
        date: '18 Aug 2026'
      }
    },
    {
      id: 'CONS-880',
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      facility: 'Urban Community Health Centre (UCHC-4)',
      citizenId: 'C10312',
      patientName: 'Mohd. Imran',
      patientAge: 45,
      patientGender: 'Male',
      patientZone: 'Zone C',
      patientEmail: 'mohd.imran@example.com',
      patientMobile: '+91 98765 33445',
      date: '14 Aug 2026, 04:15 PM',
      chiefComplaint: 'Intermittent fever and abdominal cramps for 4 days.',
      symptoms: ['Fever', 'Abdominal Cramps'],
      duration: '4 Days',
      medicalHistory: 'Hypertension controlled on Amlodipine 5mg.',
      vitals: { bp: '130/84 mmHg', pulse: '76 bpm', temp: '99.8 °F', spo2: '97%' },
      observations: 'Stable vitals, mild periumbilical tenderness.',
      analysis: 'Sub-acute enteritis without severe sepsis.',
      diagnosis: 'Infectious Enteritis',
      recommendedTests: 'Stool Culture',
      medicines: [
        { name: 'Tab Cefixime 200mg', dosage: '1 Tab BD', instruction: '5 days course after food' },
        { name: 'Cap Probiotic', dosage: '1 Cap Daily', instruction: 'With water' }
      ],
      followUpDate: '25 Aug 2026',
      notes: 'Continue anti-hypertensive medication without interruption.',
      outcome: 'Improved',
      attachments: { photos: [], pdfs: [], videos: [] },
      rating: {
        stars: 4,
        feedback: 'Good consultation and prescribed accurate medicines. Follow up check was done on time.',
        date: '16 Aug 2026'
      }
    }
  ],

  // Doctor Performance Records
  doctorPerformance: {
    'DR-1004': {
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      baseRatingsCount: 142,
      baseRatingSum: 681.6, // 4.8 avg
      baseTotalConsultations: 156,
      baseResolvedCases: 112,
      baseImprovedCases: 22,
      baseFollowupsCompleted: 98,
      reviews: [
        {
          id: 'rev-1',
          consultationId: 'CONS-901',
          citizenId: 'C10291',
          citizenName: 'Rahul Sharma',
          rating: 5,
          feedback: 'Very thorough diagnosis. The ORS hydration advice and medicine dosage cleared my fever and stomach cramps within 2 days.',
          date: '20 Aug 2026'
        },
        {
          id: 'rev-2',
          consultationId: 'CONS-894',
          citizenId: 'C10304',
          citizenName: 'Pooja Verma',
          rating: 5,
          feedback: 'Doctor quickly identified the gastro cluster risk and guided me on boiled water safety. Very polite and prompt!',
          date: '18 Aug 2026'
        },
        {
          id: 'rev-3',
          consultationId: 'CONS-880',
          citizenId: 'C10312',
          citizenName: 'Mohd. Imran',
          rating: 4,
          feedback: 'Good consultation and prescribed accurate medicines. Follow up check was done on time.',
          date: '16 Aug 2026'
        }
      ]
    }
  },

  // ASHA Tasks & Area Data
  ashaTasks: [
    {
      id: 'task-1',
      familyId: 'FAM-10284',
      headName: 'Rahul Sharma',
      address: 'House #42, Sector 9, Zone C',
      priority: 'High',
      reason: 'Household cluster signal: 2 members reported symptoms in 7 days',
      date: '24 Aug',
      status: 'Scheduled'
    },
    {
      id: 'task-2',
      familyId: 'FAM-10310',
      headName: 'Pooja Verma',
      address: 'Block 4, Lane 2, Zone C',
      priority: 'High',
      reason: 'Severe acute febrile report needing vitals check & water source query',
      date: '23 Aug',
      status: 'Pending Verification'
    },
    {
      id: 'task-3',
      familyId: 'FAM-10332',
      headName: 'Mohd. Imran',
      address: 'House #12, Market St, Zone C',
      priority: 'Medium',
      reason: 'Gastrointestinal symptom follow-up & ORS kit delivery',
      date: '25 Aug',
      status: 'Scheduled'
    }
  ],

  // Zones Summary
  zones: {
    'Zone A': {
      id: 'Zone A',
      name: 'Zone A — South Green Colony',
      riskScore: 18,
      riskLevel: 'NORMAL',
      reportsCount: 4,
      baseline: 6,
      ashaWorker: 'Meena Kumari (ASHA-201)',
      status: 'Routine Monitoring',
      clustering: 'Low',
      recentTrend: 'Stable (-5%)'
    },
    'Zone B': {
      id: 'Zone B',
      name: 'Zone B — East Lake Vista',
      riskScore: 42,
      riskLevel: 'WATCH',
      reportsCount: 14,
      baseline: 9,
      ashaWorker: 'Rekha Rani (ASHA-202)',
      status: 'Watch List',
      clustering: 'Moderate',
      recentTrend: 'Upward (+18%)'
    },
    'Zone C': {
      id: 'Zone C',
      name: 'Zone C — Urban North Ward',
      riskScore: 84,
      riskLevel: 'HIGH',
      reportsCount: 31,
      baseline: 10,
      ashaWorker: 'Sunita Devi (ASHA-204)',
      status: 'Verification Pending',
      clustering: 'High (4 Household Clusters)',
      recentTrend: 'Spike (+42%)',
      signals: [
        'Reports significantly above historical baseline (31 vs 10 baseline)',
        'Rapid increase in recent reports (+42% over last 72 hours)',
        'Similar health signals clustered geographically in Sector 9 & Market St',
        'Nearby Zone B & E showing matching gastrointestinal patterns'
      ],
      verificationDetails: {
        status: 'Verification Pending',
        verifiedBy: null,
        verificationDate: null,
        outcome: null,
        fieldNotes: ''
      }
    },
    'Zone D': {
      id: 'Zone D',
      name: 'Zone D — West Industrial Belt',
      riskScore: 22,
      riskLevel: 'NORMAL',
      reportsCount: 6,
      baseline: 8,
      ashaWorker: 'Kavita Roy (ASHA-205)',
      status: 'Routine Monitoring',
      clustering: 'Low',
      recentTrend: 'Normal (+2%)'
    },
    'Zone E': {
      id: 'Zone E',
      name: 'Zone E — Central Railway Colony',
      riskScore: 58,
      riskLevel: 'ALERT',
      reportsCount: 19,
      baseline: 11,
      ashaWorker: 'Anju Bala (ASHA-206)',
      status: 'Watch List',
      clustering: 'Moderate',
      recentTrend: 'Upward (+31%)'
    }
  },

  // Early Warnings Feed
  earlyWarnings: [
    {
      id: 'EW-902',
      zone: 'Zone C',
      title: 'Potential Community Health Risk Signal Detected',
      riskScore: 84,
      riskLevel: 'HIGH',
      timestamp: 'Today, 08:30 AM',
      signals: [
        'Rapid increase in fever + gastrointestinal reports',
        '31 reports vs historical baseline of 10',
        'Geographic clustering in Sector 9 & Market Street',
        'Household clusters detected across 4 family units'
      ],
      assignedWorker: 'Sunita Devi (ASHA-204)',
      status: 'Verification Pending',
      actionRecommendation: 'Deploy field verification team, inspect municipal water distribution point #4, distribute ORS kits.'
    },
    {
      id: 'EW-901',
      zone: 'Zone E',
      title: 'Abnormal Health Trend Watch',
      riskScore: 58,
      riskLevel: 'ALERT',
      timestamp: 'Yesterday, 04:15 PM',
      signals: [
        'Gastrointestinal complaints rising in Railway Colony',
        '19 reports vs baseline of 11'
      ],
      assignedWorker: 'Anju Bala (ASHA-206)',
      status: 'Investigation Ongoing',
      actionRecommendation: 'Review primary health centre intake logs.'
    }
  ],

  // Environmental Intelligence Data
  environmental: {
    rainfall: '78 mm (Heavy Rainfall over 48h)',
    waterStagnation: '3 Municipal reports recorded in Zone C lowlands',
    temperature: '29.4°C / Humidity 88%',
    signalSummary: 'Heavy rainfall + Water stagnation reports + Increasing gastrointestinal symptoms → Potential environmental health risk signal.'
  },

  // Global Surveillance KPIs
  kpis: {
    totalCitizens: 12480,
    totalFamilies: 3820,
    totalHealthReports: 1284,
    pendingFollowups: 37,
    activeAlerts: 7,
    highRiskAreas: 3
  },

  // Doctor Referrals by ASHA Workers
  referrals: [
    {
      id: 'REF-401',
      citizenId: 'CIT-10025',
      citizenAlias: 'C10291',
      citizenName: 'Rahul Sharma',
      citizenAge: 32,
      citizenGender: 'Male',
      citizenWard: 'Zone C',
      citizenMobile: '+91 98765 43210',
      ashaId: 'ASHA-204',
      ashaName: 'Sunita Devi',
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      specialty: 'Community Medicine Specialist',
      facility: 'Urban Community Health Centre (UCHC-4)',
      reason: 'Household cluster signal: Patient experiencing 4-5 episodes of acute watery diarrhea and moderate fever. Localized tap water contamination detected.',
      urgency: 'High',
      status: 'Consultation Scheduled', // 'Pending' | 'Accepted' | 'Consultation Scheduled' | 'Completed' | 'Follow-up Required' | 'Closed'
      date: '19 Aug 2026',
      notes: 'Advised family on boiling water. Patient scheduled for priority UCHC clinic intake.',
      attachments: [
        { id: 'att-r1', name: 'water_stagnation_sector9.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80' }
      ]
    },
    {
      id: 'REF-398',
      citizenId: 'CIT-10034',
      citizenAlias: 'C10304',
      citizenName: 'Pooja Verma',
      citizenAge: 28,
      citizenGender: 'Female',
      citizenWard: 'Zone C',
      citizenMobile: '+91 98765 22334',
      ashaId: 'ASHA-204',
      ashaName: 'Sunita Devi',
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      specialty: 'General Medicine',
      facility: 'Urban Community Health Centre (UCHC-4)',
      reason: 'Severe acute febrile report with continuous vomiting. Immediate clinical review recommended.',
      urgency: 'Critical',
      status: 'Completed',
      date: '18 Aug 2026',
      notes: 'Prescribed antiemetic and hydration. Case resolved favorably.'
    }
  ],

  // Role-Targeted Notifications Stream
  notifications: [
    {
      id: 'notif-1',
      targetRole: 'citizen',
      category: 'Prescription & Care',
      title: 'New Medicine Prescription Issued',
      message: 'Dr. Arishta Sharma issued an Rx Prescription (ORS, Paracetamol, Sporlac) for your acute fever & gastro report.',
      time: '15 mins ago',
      read: false
    },
    {
      id: 'notif-2',
      targetRole: 'citizen',
      category: 'Follow-up Reminder',
      title: 'Routine Health Review Scheduled',
      message: 'Your 24 August recovery verification visit with ASHA Sunita Devi is confirmed.',
      time: '2 hours ago',
      read: false
    },
    {
      id: 'notif-3',
      targetRole: 'doctor',
      category: 'New Referral',
      title: 'Doctor Referral Received: Rahul Sharma (CIT-10025)',
      message: 'ASHA Sunita Devi referred patient for acute febrile gastro review in Zone C.',
      time: '25 mins ago',
      read: false
    },
    {
      id: 'notif-4',
      targetRole: 'doctor',
      category: 'Patient Rating',
      title: 'New 5-Star Patient Rating Received',
      message: 'Rahul Sharma submitted a 5-star review: "Very thorough diagnosis and clear dosage instructions."',
      time: '1 hour ago',
      read: false
    },
    {
      id: 'notif-5',
      targetRole: 'asha',
      category: 'Referral Accepted',
      title: 'Doctor Referral Accepted: Pooja Verma (CIT-10034)',
      message: 'Dr. Arishta Sharma accepted referral and completed clinical assessment.',
      time: '3 hours ago',
      read: true
    },
    {
      id: 'notif-6',
      targetRole: 'asha',
      category: 'Early Warning Alert',
      title: 'Surveillance Alert: Zone C Gastro Cluster',
      message: 'Early warning radar active in Sector 9. High priority sanitation inspection required.',
      time: '4 hours ago',
      read: false
    },
    {
      id: 'notif-7',
      targetRole: 'admin',
      category: 'Early Warning Signal',
      title: 'Threshold Trigger: Zone C Risk 84/100',
      message: 'Gastrointestinal anomaly index crossed alert threshold. Field verification deployed.',
      time: '2 hours ago',
      read: false
    },
    {
      id: 'notif-8',
      targetRole: 'admin',
      category: 'System Activity',
      title: 'System Milestone: 1,284 Health Reports Logged',
      message: 'Real-time grassroots surveillance actively tracking 3,820 households across 5 zones.',
      time: '5 hours ago',
      read: true
    }
  ]
};

class StateStore {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load saved state from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.warn('Failed to persist state:', e);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.saveState();
    this.listeners.forEach(fn => {
      try {
        fn(event, payload, this.state);
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    });

    // Realtime Live Event Broadcast
    if (typeof fetch !== 'undefined') {
      fetch('/api/events/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: event, payload })
      }).catch(() => {});
    }
  }

  get currentUser() {
    return this.state.currentUser;
  }

  get userRole() {
    return this.state.currentUser ? this.state.currentUser.role : null;
  }

  get isAuthenticated() {
    return Boolean(this.state.isAuthenticated && this.state.currentUser);
  }

  get loading() {
    return Boolean(this.state.authLoading);
  }

  get profile() {
    return this.state.currentUser;
  }

  setRole(role, tab = 'dashboard') {
    // If authenticated, do not allow changing to a role different from the saved authenticated role
    if (this.isAuthenticated && this.userRole && role !== 'landing') {
      if (role !== this.userRole) {
        console.warn(`Access Denied: User role is ${this.userRole}, cannot switch to ${role}`);
        role = this.userRole;
      }
    }

    this.state.currentRole = role;
    this.state.currentTab = tab;

    if (window.SehatRouter) {
      if (role === 'citizen') window.SehatRouter.navigate('/citizen/dashboard');
      else if (role === 'doctor') window.SehatRouter.navigate('/doctor/dashboard');
      else if (role === 'asha') window.SehatRouter.navigate('/asha/dashboard');
      else if (role === 'admin') window.SehatRouter.navigate('/admin/dashboard');
      else if (role === 'landing') window.SehatRouter.navigate('/landing');
    }
    this.notify('ROLE_CHANGED', { role, tab });
  }

  setTab(tab) {
    this.state.currentTab = tab;
    this.notify('TAB_CHANGED', { tab });
  }

  setAuthMode(mode, role = 'citizen') {
    this.state.currentRole = 'auth';
    this.state.authMode = mode; // 'login' or 'signup'
    this.state.authSelectedRole = role;
    this.notify('AUTH_MODE_CHANGED', { mode, role });
  }

  setTheme(theme) {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.notify('THEME_CHANGED', { theme });
  }

  toggleTheme() {
    const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  // --- AUTHENTICATION METHODS ---

  login(identifier, password, role) {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId || !password) {
      return { success: false, message: 'Email/ID and password are required.' };
    }
    const account = this.state.userAccounts.find(
      u => (u.id.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        u.mobile.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')) &&
        (role ? u.role === role : true) &&
        u.password === password
    );

    if (account) {
      this.state.currentUser = account;
      this.state.isAuthenticated = true;
      this.state.currentRole = account.role;
      this.state.currentTab = 'dashboard';
      this.notify('USER_LOGGED_IN', { user: account });
      return { success: true, user: account };
    }

    return { success: false, message: 'Invalid email, ID, mobile number, password, or role.' };
  }

  loginWithGoogle(role = 'citizen') {
    const matched = this.state.userAccounts.find(u => u.role === role) || this.state.userAccounts[0];
    const googleUser = {
      ...matched,
      authProvider: 'google',
      googleEmail: matched.email || `${matched.username}@gmail.com`,
      googleLinked: true
    };

    this.state.currentUser = googleUser;
    this.state.isAuthenticated = true;
    this.state.currentRole = role;
    this.state.currentTab = 'dashboard';
    this.notify('USER_LOGGED_IN', { user: googleUser });
    return { success: true, user: googleUser };
  }

  hydrateGoogleSession(session) {
    const profile = session.user || {};
    const role = session.role || (profile && profile.role) || 'citizen';
    const matched = this.state.userAccounts.find(user => (user.id && user.id === profile.id) || (user.email && user.email.toLowerCase() === (profile.email || '').toLowerCase() && user.role === role));
    const googleUser = matched ? {
      ...matched,
      ...profile,
      role: role,
      name: profile.name || matched.name,
      email: profile.email || matched.email,
      avatarUrl: profile.profilePhoto || profile.picture || matched.avatarUrl,
      authProvider: profile.provider || 'google',
      googleEmail: profile.email || matched.email,
      googleLinked: true
    } : {
      id: profile.id || `USER-${String(profile.sub || Date.now()).slice(-6)}`,
      username: (profile.email || 'user').split('@')[0],
      password: 'oauth_authenticated',
      role,
      name: profile.name || profile.email || 'User',
      email: profile.email || '',
      mobile: profile.mobile || profile.phone || '',
      avatarUrl: profile.profilePhoto || profile.picture || '',
      zone: profile.ward || 'Zone C',
      familyId: profile.familyId || 'FAM-' + Math.floor(10000 + Math.random() * 90000),
      monitoringStatus: 'Routine Monitoring',
      joinedDate: 'Today',
      authProvider: profile.provider || 'google',
      googleEmail: profile.email || '',
      googleLinked: true,
      // Doctor fields
      regNumber: profile.regNumber || 'MCI-' + Math.floor(10000 + Math.random() * 90000),
      specialty: profile.specialty || 'General Medicine',
      facility: profile.facility || 'Community Health Centre (UCHC-4)',
      assignedZone: profile.ward || 'Zone C',
      // ASHA fields
      badgeId: profile.badgeId || 'ASHA-DEL-' + Math.floor(100 + Math.random() * 900),
      area: `${profile.area || profile.ward || 'Zone C'} — Surveillance Ward`,
      pendingFollowupsCount: 2,
      highRiskHouseholdsCount: 0,
      activeAlertsCount: 0,
      // Admin fields
      department: profile.department || 'District Epidemiological Surveillance Unit',
      district: 'Central Metro Surveillance Division'
    };

    if (!matched) this.state.userAccounts.push(googleUser);
    this.state.currentUser = googleUser;
    this.state.isAuthenticated = true;
    this.state.currentRole = role;
    this.state.authLoading = false;

    if (role === 'citizen') {
      this.state.users.citizen = {
        id: googleUser.id,
        name: googleUser.name,
        age: googleUser.age || 32,
        gender: googleUser.gender || 'Male',
        familyId: googleUser.familyId,
        zone: googleUser.zone,
        address: googleUser.address || `Sector 9, ${googleUser.zone}`,
        monitoringStatus: googleUser.monitoringStatus || 'Routine Monitoring',
        nextFollowUp: googleUser.nextFollowUp || '24 August'
      };
    } else if (role === 'doctor') {
      this.state.users.doctor = {
        id: googleUser.id,
        name: googleUser.name,
        specialty: googleUser.specialty,
        facility: googleUser.facility,
        assignedZone: googleUser.assignedZone || 'Zone C'
      };
    } else if (role === 'asha') {
      this.state.users.asha = {
        id: googleUser.id,
        name: googleUser.name,
        roleTitle: 'Accredited Social Health Activist (ASHA)',
        area: googleUser.area,
        pendingFollowupsCount: googleUser.pendingFollowupsCount || 0,
        highRiskHouseholdsCount: 0,
        activeAlertsCount: 0
      };
    } else if (role === 'admin') {
      this.state.users.admin = {
        id: googleUser.id,
        name: googleUser.name,
        department: googleUser.department,
        district: googleUser.district
      };
    }

    this.notify(session.mode === 'signup' ? 'USER_SIGNED_UP' : 'USER_LOGGED_IN', { user: googleUser });
    return { success: true, user: googleUser };
  }

  signupWithGoogle(role = 'citizen', googleData = {}) {
    const defaultName = role === 'citizen' ? 'Aarav Mehta'
      : role === 'doctor' ? 'Dr. Samir Joshi'
        : role === 'asha' ? 'Pooja Kumari'
          : 'Dr. Anita Roy';

    const name = googleData.name || defaultName;
    const email = googleData.email || `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

    const newId = role === 'citizen' ? 'C' + Math.floor(10000 + Math.random() * 90000)
      : role === 'doctor' ? 'DR-' + Math.floor(1000 + Math.random() * 9000)
        : role === 'asha' ? 'ASHA-' + Math.floor(200 + Math.random() * 800)
          : 'ADMIN-' + Math.floor(100 + Math.random() * 900);

    const newAccount = {
      id: newId,
      username: name.toLowerCase().replace(/\s+/g, '.'),
      password: 'google_oauth_auth',
      role: role,
      name: name,
      email: email,
      mobile: '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
      age: 29,
      gender: 'Male',
      zone: 'Zone C',
      familyId: 'FAM-' + Math.floor(10000 + Math.random() * 90000),
      address: 'House #18, Sector 9, Zone C',
      abhaId: `14-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      monitoringStatus: 'Routine Monitoring',
      nextFollowUp: '28 August',
      joinedDate: 'Today',
      consentDataSharing: true,
      authProvider: 'google',
      googleLinked: true,
      regNumber: 'MCI/DMC-' + Math.floor(10000 + Math.random() * 90000),
      specialty: 'Community Medicine',
      facility: 'Urban Community Health Centre (UCHC-4)',
      badgeId: 'ASHA-DEL-' + newId,
      area: 'Zone C — Surveillance Ward',
      pendingFollowupsCount: 2,
      highRiskHouseholdsCount: 0,
      activeAlertsCount: 0,
      department: 'District Epidemiological Unit',
      district: 'Central Metro Surveillance Division'
    };

    this.state.userAccounts.push(newAccount);
    this.state.currentUser = newAccount;
    this.state.isAuthenticated = true;
    this.state.currentRole = role;
    this.state.currentTab = 'dashboard';

    if (role === 'citizen') {
      this.state.users.citizen = {
        id: newAccount.id,
        name: newAccount.name,
        age: newAccount.age,
        gender: newAccount.gender,
        familyId: newAccount.familyId,
        zone: newAccount.zone,
        address: newAccount.address,
        monitoringStatus: newAccount.monitoringStatus,
        nextFollowUp: newAccount.nextFollowUp
      };
      this.state.kpis.totalCitizens += 1;
    }

    this.notify('USER_SIGNED_UP', { user: newAccount });
    return { success: true, user: newAccount };
  }

  signup(formData) {
    const { name, email, mobile, age, gender, role, password, ward, familyOption, familyId, regNumber, specialty, facility, badgeId, department } = formData;

    const newId = role === 'citizen' ? 'C' + Math.floor(10000 + Math.random() * 90000)
      : role === 'doctor' ? 'DR-' + Math.floor(1000 + Math.random() * 9000)
        : role === 'asha' ? 'ASHA-' + Math.floor(200 + Math.random() * 800)
          : 'ADMIN-' + Math.floor(100 + Math.random() * 900);

    const effectiveFamilyId = familyOption === 'join' && familyId ? familyId : 'FAM-' + Math.floor(10000 + Math.random() * 90000);

    const newAccount = {
      id: newId,
      username: name.toLowerCase().replace(/\s+/g, '.'),
      password: password || 'password123',
      role: role,
      name: name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      mobile: mobile,
      age: parseInt(age) || 30,
      gender: gender || 'Other',
      zone: ward || 'Zone C',
      familyId: effectiveFamilyId,
      address: `Sector 9, ${ward || 'Zone C'}`,
      abhaId: `14-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      monitoringStatus: 'Routine Monitoring',
      nextFollowUp: '28 August',
      joinedDate: 'Today',
      consentDataSharing: true,
      // Doctor specific
      regNumber: regNumber || 'MCI-' + Math.floor(10000 + Math.random() * 90000),
      specialty: specialty || 'General Medicine',
      facility: facility || 'Community Health Centre',
      // ASHA specific
      badgeId: badgeId || 'ASHA-DEL-' + newId,
      area: `${ward || 'Zone C'} — Surveillance Ward`,
      pendingFollowupsCount: 3,
      highRiskHouseholdsCount: 0,
      activeAlertsCount: 0,
      // Admin specific
      department: department || 'District Epidemiological Unit',
      district: 'Central Metro Surveillance Division'
    };

    this.state.userAccounts.push(newAccount);
    this.state.currentUser = newAccount;
    this.state.isAuthenticated = true;
    this.state.currentRole = role;
    this.state.currentTab = 'dashboard';

    // If Citizen, update users.citizen
    if (role === 'citizen') {
      this.state.users.citizen = {
        id: newAccount.id,
        name: newAccount.name,
        age: newAccount.age,
        gender: newAccount.gender,
        familyId: newAccount.familyId,
        zone: newAccount.zone,
        address: newAccount.address,
        monitoringStatus: newAccount.monitoringStatus,
        nextFollowUp: newAccount.nextFollowUp
      };
      this.state.kpis.totalCitizens += 1;
    }

    this.notify('USER_SIGNED_UP', { user: newAccount });
    return { success: true, user: newAccount };
  }

  logout() {
    this.state.isAuthenticated = false;
    this.state.currentUser = null;
    this.state.currentRole = 'landing';
    this.state.currentTab = 'dashboard';
    this.notify('USER_LOGGED_OUT', {});
  }

  updateUserProfile(updatedData) {
    if (!this.state.currentUser) return;
    Object.assign(this.state.currentUser, updatedData);

    // Update in userAccounts
    const idx = this.state.userAccounts.findIndex(u => u.id === this.state.currentUser.id);
    if (idx !== -1) {
      this.state.userAccounts[idx] = { ...this.state.currentUser };
    }

    // Sync role specific cached object
    if (this.state.currentUser.role === 'citizen') {
      Object.assign(this.state.users.citizen, {
        name: this.state.currentUser.name,
        mobile: this.state.currentUser.mobile,
        address: this.state.currentUser.address,
        zone: this.state.currentUser.zone
      });
    }

    this.notify('PROFILE_UPDATED', { user: this.state.currentUser });

    // Sync to backend / database
    if (typeof fetch !== 'undefined') {
      fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      }).catch(err => console.warn('Profile background sync notice:', err));
    }
  }

  updateProfilePhoto(photoDataUrl) {
    if (!this.state.currentUser) return;
    this.state.currentUser.avatarUrl = photoDataUrl;

    // Update in userAccounts
    const idx = this.state.userAccounts.findIndex(u => u.id === this.state.currentUser.id);
    if (idx !== -1) {
      this.state.userAccounts[idx].avatarUrl = photoDataUrl;
    }

    if (this.state.currentUser.role === 'citizen') {
      this.state.users.citizen.avatarUrl = photoDataUrl;
    }

    this.notify('AVATAR_UPDATED', { avatarUrl: photoDataUrl });
  }

  // --- USER DATA ISOLATION GETTERS (For Fresh Clean Account on New Signup) ---
  getUserFamily(user) {
    if (!user) return this.state.family;
    const isDemoRahul = user.id === 'C10291' || user.email === 'rahul.sharma@example.com';
    if (isDemoRahul) return this.state.family;

    if (!this.state.userFamilies) this.state.userFamilies = {};
    if (!this.state.userFamilies[user.id]) {
      this.state.userFamilies[user.id] = {
        id: user.familyId || ('FAM-' + (user.id || 'NEW')),
        address: user.address || user.ward || (user.district ? `${user.district}, ${user.state}` : 'Registered Address'),
        householdSignals: [],
        members: [
          {
            id: user.id,
            name: `${user.name} (You)`,
            relation: 'Self / Primary Member',
            age: user.age || 30,
            status: user.monitoringStatus || 'Routine Monitoring',
            riskBadge: 'normal',
            lastReportDate: 'Account Created'
          }
        ]
      };
      this.saveState();
    }
    return this.state.userFamilies[user.id];
  }

  addFamilyMemberForUser(user, member) {
    const family = this.getUserFamily(user);
    family.members.push({
      id: 'FAM-M-' + Date.now(),
      name: member.name,
      relation: member.relation || 'Family Member',
      age: Number(member.age) || 25,
      status: 'Routine Monitoring',
      riskBadge: 'normal',
      lastReportDate: 'Joined Today'
    });
    this.saveState();
    this.notify('FAMILY_MEMBER_ADDED', { family });
    return family;
  }

  getUserTimeline(user) {
    if (!user) return this.state.citizenTimeline || [];
    const isDemoRahul = user.id === 'C10291' || user.email === 'rahul.sharma@example.com';
    if (isDemoRahul) return this.state.citizenTimeline || [];

    if (!this.state.userTimelines) this.state.userTimelines = {};
    return this.state.userTimelines[user.id] || [];
  }

  getUserMedicalRecords(user) {
    if (!user) return this.state.medicalRecords || [];
    const isDemoRahul = user.id === 'C10291' || user.email === 'rahul.sharma@example.com';
    if (isDemoRahul) return this.state.medicalRecords || [];

    return (this.state.medicalRecords || []).filter(r => r.citizenId === user.id);
  }

  getUserConsultations(user) {
    if (!user) return this.state.consultations || [];
    const isDemoRahul = user.id === 'C10291' || user.email === 'rahul.sharma@example.com';
    if (isDemoRahul) return this.state.consultations || [];

    return (this.state.consultations || []).filter(c => c.citizenId === user.id);
  }

  getUserReferrals(user) {
    if (!user) return this.state.referrals || [];
    const isDemoRahul = user.id === 'C10291' || user.email === 'rahul.sharma@example.com';
    if (isDemoRahul) return this.state.referrals || [];

    return (this.state.referrals || []).filter(r => r.citizenId === user.id);
  }

  getPatientsForDoctor(doctorId) {
    if (!doctorId) return this.state.doctorPatients || [];
    if (doctorId === 'DR-1004' || doctorId === 'dr.arishta') return this.state.doctorPatients || [];
    return (this.state.doctorPatients || []).filter(p => p.doctorId === doctorId || p.assignedDoctorId === doctorId);
  }

  getVisitsForAsha(ashaId) {
    if (!ashaId) return this.state.householdVisits || [];
    if (ashaId === 'ASHA-204' || ashaId === 'sunita.asha') return this.state.householdVisits || [];
    return (this.state.householdVisits || []).filter(v => v.ashaId === ashaId);
  }

  // --- MEDICAL RECORDS CRUD ---
  addMedicalRecord(recordData) {
    const user = this.state.currentUser || {};
    const newRecord = {
      id: 'rec-' + Date.now(),
      citizenId: recordData.citizenId || user.id || 'C10291',
      type: recordData.type || 'test_report',
      category: recordData.type === 'test_report' ? '🧪 Test Report'
        : recordData.type === 'doctor_analysis' ? '👨‍⚕️ Doctor Consultation'
          : '💊 Medicine Prescription',
      title: recordData.title || 'Medical Record Entry',
      date: recordData.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      provider: recordData.provider || 'UCHC-4 / Community Health Centre',
      details: recordData.details || '',
      attachmentName: recordData.attachmentName || (recordData.photoUrl ? 'attached_evidence.jpg' : null),
      photoUrl: recordData.photoUrl || null
    };

    if (!this.state.medicalRecords) {
      this.state.medicalRecords = [];
    }
    this.state.medicalRecords.unshift(newRecord);
    this.saveState();
    this.notify('MEDICAL_RECORD_ADDED', { record: newRecord });
    return newRecord;
  }

  updateMedicalRecord(id, updatedData) {
    if (!this.state.medicalRecords) return false;
    const idx = this.state.medicalRecords.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.state.medicalRecords[idx] = { ...this.state.medicalRecords[idx], ...updatedData };
      this.notify('MEDICAL_RECORD_UPDATED', { record: this.state.medicalRecords[idx] });
      return true;
    }
    return false;
  }

  deleteMedicalRecord(id) {
    if (!this.state.medicalRecords) return false;
    this.state.medicalRecords = this.state.medicalRecords.filter(r => r.id !== id);
    this.notify('MEDICAL_RECORD_DELETED', { id });
    return true;
  }

  // --- ACTIONS ---

  submitHealthReport(reportData) {
    const { symptoms, severity, duration, location, notes, date, category, photos } = reportData;
    const reportDateStr = date || 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newTlItem = {
      id: 'tl-' + Date.now(),
      date: reportDateStr,
      type: 'report',
      category: category || 'General / Febrile Symptoms',
      title: 'Health issue reported',
      description: `Reported: ${category ? `[${category}] ` : ''}${symptoms.join(', ')}. Severity: ${severity}. Duration: ${duration} days. Area: ${location || 'Zone C'}. ${notes ? `Notes: ${notes}` : ''}`,
      badgeText: 'Citizen Report',
      badgeClass: severity === 'Severe' ? 'badge-high' : severity === 'Moderate' ? 'badge-watch' : 'badge-normal',
      photos: Array.isArray(photos) ? photos : []
    };
    this.state.citizenTimeline.unshift(newTlItem);

    const selfMember = this.state.family.members.find(m => m.id === 'C10291');
    if (selfMember) {
      selfMember.status = severity === 'Severe' ? 'Follow-up Required' : 'Active Observation';
      selfMember.riskBadge = severity === 'Severe' ? 'high' : 'watch';
      selfMember.lastReportDate = 'Today';
    }

    const fam = this.state.family;
    fam.householdSignals = [
      {
        id: 'hs-' + Date.now(),
        text: '3 health reports recorded from this household in the last 5 days.',
        status: 'recommended',
        recommendation: '⚠️ Household follow-up recommended — multiple members reporting similar febrile signals.'
      }
    ];

    this.state.kpis.totalHealthReports += 1;
    if (this.state.zones['Zone C']) {
      this.state.zones['Zone C'].reportsCount += 1;
      this.state.zones['Zone C'].riskScore = Math.min(100, this.state.zones['Zone C'].riskScore + 2);
    }

    let docPatient = this.state.doctorPatients.find(p => p.id === 'C10291');
    if (docPatient) {
      docPatient.status = 'Pending Review';
      docPatient.recentSymptoms = symptoms;
      docPatient.severity = severity;
      docPatient.reportedDate = 'Today';
    }

    this.state.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'citizen',
      title: 'Health report submitted successfully',
      message: 'Your symptoms were recorded. Health timeline updated. Routine surveillance active.',
      time: 'Just now',
      read: false
    });

    // Realtime Server & Cloud Database Sync
    if (typeof fetch !== 'undefined') {
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      }).catch(err => console.warn('Report server sync notice:', err.message));
    }

    this.notify('HEALTH_REPORT_SUBMITTED', { reportData, timelineItem: newTlItem });
  }

  recordDoctorConsultation(patientId, consultationData) {
    const { clinicalNotes, advice, followUpDate } = consultationData;
    const nowStr = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const patient = this.state.doctorPatients.find(p => p.id === patientId);
    if (patient) {
      patient.status = 'Reviewed';
      patient.notes = clinicalNotes;
      patient.nextFollowUp = followUpDate || '24 August';
    }

    if (patientId === 'C10291') {
      const docItem = {
        id: 'tl-' + Date.now(),
        date: nowStr,
        type: 'doctor',
        title: 'Doctor consultation recorded',
        description: `Consultation by Dr. Arishta Sharma (DR-1004). Advice: ${advice || 'Adequate fluid hydration and rest.'}`,
        badgeText: 'Consultation Done',
        badgeClass: 'badge-normal'
      };

      const notesItem = {
        id: 'tl-' + (Date.now() + 1),
        date: nowStr,
        type: 'doctor',
        title: 'Clinical assessment recorded',
        description: `Clinical Notes: ${clinicalNotes || 'Febrile cluster assessment documented.'} Next follow-up due: ${followUpDate || '24 August'}.`,
        badgeText: 'Clinical Assessment',
        badgeClass: 'badge-normal'
      };

      this.state.citizenTimeline.unshift(notesItem);
      this.state.citizenTimeline.unshift(docItem);
      this.state.users.citizen.nextFollowUp = followUpDate || '24 August';
    }

    this.state.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'doctor',
      title: 'Consultation Logged',
      message: `Consultation completed for Citizen ${patientId}. Citizen timeline synced.`,
      time: 'Just now',
      read: false
    });

    // Realtime Server & Cloud Database Sync
    if (typeof fetch !== 'undefined') {
      fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizenId: patientId, ...consultationData })
      }).catch(err => console.warn('Consultation server sync notice:', err.message));
    }

    this.notify('DOCTOR_CONSULTATION_RECORDED', { patientId, consultationData });
  }

  // --- CONNECTED DOCTOR-CITIZEN CLINICAL SYSTEM METHODS ---

  searchCitizenForDoctor(query) {
    if (!query) return null;
    const cleanQ = query.trim().toLowerCase();

    // Find in registered user accounts
    const citizen = this.state.userAccounts.find(u =>
      u.role === 'citizen' && (
        u.id.toLowerCase() === cleanQ ||
        u.email.toLowerCase() === cleanQ ||
        u.mobile.replace(/\s+/g, '').includes(cleanQ.replace(/\s+/g, ''))
      )
    );

    if (!citizen) return null;

    // Attach complete medical dossier
    const history = this.getPatientHistory(citizen.id);
    return {
      ...citizen,
      ...history
    };
  }

  registerPatientToDoctor(doctorId, citizenId) {
    const citizen = this.state.userAccounts.find(u => u.id === citizenId);
    if (!citizen) return { success: false, message: 'Patient not found' };

    let patientInQueue = this.state.doctorPatients.find(p => p.id === citizenId);
    if (!patientInQueue) {
      patientInQueue = {
        id: citizen.id,
        name: citizen.name,
        familyId: citizen.familyId || 'FAM-10000',
        age: citizen.age || 30,
        gender: citizen.gender ? citizen.gender[0] : 'U',
        zone: citizen.zone || 'Zone C',
        recentSymptoms: ['Routine Health Review'],
        severity: 'Mild',
        reportedDate: 'Today',
        status: 'Registered Patient',
        notes: 'Registered by Doctor consultation unit.',
        nextFollowUp: 'Scheduled'
      };
      this.state.doctorPatients.unshift(patientInQueue);
    }

    this.notify('PATIENT_REGISTERED_TO_DOCTOR', { doctorId, citizenId, patient: patientInQueue });
    return { success: true, patient: patientInQueue };
  }

  getPatientHistory(citizenId) {
    const consultations = (this.state.consultations || []).filter(c => c.citizenId === citizenId);
    const medicalRecords = (this.state.medicalRecords || []).filter(r => r.citizenId === citizenId || (!r.citizenId && citizenId === 'C10291'));
    const timeline = (this.state.citizenTimeline || []).filter(t => t.citizenId === citizenId || (!t.citizenId && citizenId === 'C10291'));

    return {
      consultations,
      medicalRecords,
      timeline
    };
  }

  createConsultation(consultationData) {
    const {
      doctorId,
      doctorName,
      citizenId,
      chiefComplaint,
      symptoms,
      duration,
      medicalHistory,
      vitals,
      observations,
      analysis,
      diagnosis,
      recommendedTests,
      medicines,
      followUpDate,
      notes,
      outcome, // 'Improved' | 'Resolved' | 'Follow-up Required' | 'Referred' | 'Ongoing'
      attachments
    } = consultationData;

    const citizen = this.state.userAccounts.find(u => u.id === citizenId) || this.state.users.citizen;
    const nowFormatted = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const consId = 'CONS-' + (Math.floor(100 + Math.random() * 900));

    const newConsultation = {
      id: consId,
      doctorId: doctorId || 'DR-1004',
      doctorName: doctorName || 'Dr. Arishta Sharma',
      facility: 'Urban Community Health Centre (UCHC-4)',
      citizenId: citizenId,
      patientName: citizen ? citizen.name : 'Patient',
      patientAge: citizen ? citizen.age : 32,
      patientGender: citizen ? citizen.gender : 'Male',
      patientZone: citizen ? citizen.zone : 'Zone C',
      patientEmail: citizen ? citizen.email : '',
      patientMobile: citizen ? citizen.mobile : '',
      date: nowFormatted,
      chiefComplaint: chiefComplaint || '',
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      duration: duration || '1 Day',
      medicalHistory: medicalHistory || 'None reported',
      vitals: vitals || { bp: '120/80', pulse: '76 bpm', temp: '98.6 °F', spo2: '99%' },
      observations: observations || '',
      analysis: analysis || '',
      diagnosis: diagnosis || 'Clinical Health Assessment',
      recommendedTests: recommendedTests || '',
      medicines: Array.isArray(medicines) ? medicines : [],
      followUpDate: followUpDate || '24 August 2026',
      notes: notes || '',
      outcome: outcome || 'Follow-up Required',
      attachments: attachments || { photos: [], pdfs: [], videos: [] },
      rating: null // pending citizen review
    };

    if (!this.state.consultations) {
      this.state.consultations = [];
    }
    this.state.consultations.unshift(newConsultation);

    // 1. Sync to Doctor patient queue
    let patient = this.state.doctorPatients.find(p => p.id === citizenId);
    if (patient) {
      patient.status = 'Reviewed';
      patient.notes = diagnosis + ' — ' + (analysis || '');
      patient.nextFollowUp = followUpDate || '24 August';
    }

    // 2. Sync to Citizen Timeline
    const tlItem = {
      id: 'tl-' + Date.now(),
      citizenId: citizenId,
      date: nowFormatted,
      type: 'doctor',
      title: `Consultation & Rx: ${diagnosis}`,
      description: `Diagnosis: ${diagnosis}. Prescribed: ${newConsultation.medicines.map(m => m.name).join(', ') || 'Hydration & Rest'}. Follow-up: ${followUpDate}. Outcome: ${outcome}.`,
      badgeText: 'Doctor Consultation',
      badgeClass: 'badge-normal',
      consultationId: consId,
      photos: (attachments && attachments.photos) ? attachments.photos.map(p => p.url) : []
    };
    this.state.citizenTimeline.unshift(tlItem);

    // 3. Sync to Citizen Medical Records (Prescription)
    if (newConsultation.medicines.length > 0) {
      this.addMedicalRecord({
        citizenId: citizenId,
        type: 'prescription',
        title: `Rx Prescription for ${diagnosis}`,
        provider: `${newConsultation.doctorName} (${newConsultation.facility})`,
        details: newConsultation.medicines.map((m, i) => `${i + 1}. ${m.name} (${m.dosage}) — ${m.instruction}`).join('\n') + `\nNotes: ${notes}`,
        photoUrl: (attachments && attachments.photos && attachments.photos.length > 0) ? attachments.photos[0].url : null,
        attachmentName: (attachments && attachments.pdfs && attachments.pdfs.length > 0) ? attachments.pdfs[0].name : 'rx_prescription.pdf'
      });
    }

    this.notify('CONSULTATION_CREATED', { consultation: newConsultation });
    return newConsultation;
  }

  submitDoctorReview(consultationId, citizenId, doctorId, rating, feedback) {
    const consultation = (this.state.consultations || []).find(c => c.id === consultationId);
    if (!consultation) return { success: false, message: 'Consultation not found' };
    if (consultation.rating) return { success: false, message: 'Review already submitted for this consultation.' };

    const citizen = this.state.userAccounts.find(u => u.id === citizenId) || this.state.currentUser;
    const reviewDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const reviewObj = {
      id: 'rev-' + Date.now(),
      consultationId: consultationId,
      citizenId: citizenId,
      citizenName: citizen ? citizen.name : 'Verified Citizen',
      rating: parseInt(rating),
      feedback: feedback || 'Consultation completed successfully.',
      date: reviewDate
    };

    consultation.rating = reviewObj;

    // Update Doctor Performance Store
    let perf = this.state.doctorPerformance[doctorId || 'DR-1004'];
    if (!perf) {
      perf = {
        doctorId: doctorId || 'DR-1004',
        doctorName: 'Dr. Arishta Sharma',
        baseRatingsCount: 0,
        baseRatingSum: 0,
        baseTotalConsultations: 0,
        baseResolvedCases: 0,
        baseImprovedCases: 0,
        baseFollowupsCompleted: 0,
        reviews: []
      };
      this.state.doctorPerformance[doctorId || 'DR-1004'] = perf;
    }

    perf.reviews.unshift(reviewObj);
    this.notify('DOCTOR_REVIEW_SUBMITTED', { review: reviewObj, consultationId });
    return { success: true, review: reviewObj };
  }

  getDoctorPerformance(doctorId = 'DR-1004') {
    const perf = this.state.doctorPerformance[doctorId] || {
      doctorId,
      doctorName: 'Dr. Arishta Sharma',
      baseRatingsCount: 140,
      baseRatingSum: 672,
      baseTotalConsultations: 150,
      baseResolvedCases: 108,
      baseImprovedCases: 20,
      baseFollowupsCompleted: 95,
      reviews: []
    };

    const docConsultations = (this.state.consultations || []).filter(c => c.doctorId === doctorId);

    // Dynamic calculation from actual consultation outcomes
    let resolvedCount = docConsultations.filter(c => c.outcome === 'Resolved').length;
    let improvedCount = docConsultations.filter(c => c.outcome === 'Improved').length;
    let followupsCount = docConsultations.filter(c => c.outcome === 'Follow-up Required').length;
    let totalCount = Math.max(docConsultations.length, 1);

    // Combine with base seed numbers for a rich production feel
    const totalConsultations = perf.baseTotalConsultations + docConsultations.length;
    const totalResolved = perf.baseResolvedCases + resolvedCount;
    const totalImproved = perf.baseImprovedCases + improvedCount;
    const totalFollowups = perf.baseFollowupsCompleted + followupsCount;
    const totalSuccessful = totalResolved + totalImproved;

    // Outcome-based Case Success Rate %
    const successRate = ((totalSuccessful / totalConsultations) * 100).toFixed(1);

    // Calculate dynamic rating
    let totalReviews = perf.reviews.length;
    let sumRatings = perf.reviews.reduce((acc, r) => acc + r.rating, 0);
    let avgRating = totalReviews > 0
      ? ((perf.baseRatingSum + sumRatings) / (perf.baseRatingsCount + totalReviews)).toFixed(1)
      : '4.8';

    // Unique Patients count
    const uniquePatients = new Set(docConsultations.map(c => c.citizenId));

    return {
      doctorId,
      doctorName: perf.doctorName,
      rating: avgRating,
      totalReviews: perf.baseRatingsCount + totalReviews,
      totalPatients: Math.max(perf.reviews.length + 38, uniquePatients.size),
      totalConsultations,
      resolvedCases: totalResolved,
      improvedCases: totalImproved,
      successfulCases: totalSuccessful,
      followupsCompleted: totalFollowups,
      caseSuccessRate: successRate,
      reviews: perf.reviews
    };
  }

  recordAshaVerification(zoneId, verificationData) {
    const { outcome, fieldNotes, followUpStatus, workerId } = verificationData;
    const dateStr = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const zone = this.state.zones[zoneId];
    if (zone) {
      zone.status = outcome === 'Signal Verified' ? 'Signal Verified by ASHA' : 'Verification Completed (' + outcome + ')';
      zone.verificationDetails = {
        status: 'Verified',
        verifiedBy: workerId || 'Sunita Devi (ASHA-204)',
        verificationDate: dateStr,
        outcome: outcome,
        fieldNotes: fieldNotes
      };
    }

    const warning = this.state.earlyWarnings.find(w => w.zone === zoneId);
    if (warning) {
      warning.status = 'Verified by ASHA (' + outcome + ')';
      warning.verificationOutcome = outcome;
      warning.verifiedAt = dateStr;
    }

    this.state.users.asha.pendingFollowupsCount = Math.max(0, this.state.users.asha.pendingFollowupsCount - 1);

    this.state.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'admin',
      title: `Verification Submitted — ${zoneId}`,
      message: `ASHA Sunita Devi completed field verification for ${zoneId}. Outcome: ${outcome}.`,
      time: 'Just now',
      read: false
    });

    this.notify('ASHA_VERIFICATION_COMPLETED', { zoneId, verificationData });

    // Sync with Backend /api/asha/verify
    if (typeof fetch !== 'undefined') {
      fetch('/api/asha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, ...verificationData })
      }).catch(err => console.warn('Field verification sync notice:', err.message));
    }
  }

  // --- ASHA FIELD WORK & HOUSEHOLD VISITS ---
  async completeAshaTask(taskId, findings = 'Routine household survey conducted. Hydration & vitals reviewed.') {
    if (!this.state.ashaTasks) this.state.ashaTasks = [];
    const task = this.state.ashaTasks.find(t => t.id === taskId);
    if (!task) return false;

    // Backend Persistence & Validation
    if (typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/asha/tasks/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, findings })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'Visit completion request rejected.' }));
          throw new Error(errData.error || `Failed to complete visit (Status ${response.status})`);
        }
      } catch (err) {
        console.error('Failed to persist task completion to backend:', err);
        throw err;
      }
    }

    // Only update local state once backend confirms success!
    task.status = 'Completed';
    task.completedAt = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    task.findings = findings;

    if (this.state.users.asha && this.state.users.asha.pendingFollowupsCount > 0) {
      this.state.users.asha.pendingFollowupsCount -= 1;
    }

    this.state.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'asha',
      category: 'Task Completed',
      title: `Household Task Completed`,
      message: `Field visit for ${task.headName} (${task.familyId}) marked complete.`,
      time: 'Just now',
      read: false
    });

    this.saveState();
    this.notify('ASHA_TASK_COMPLETED', { taskId, task });
    return true;
  }

  addHouseholdVisit(visitData) {
    if (!this.state.householdVisits) this.state.householdVisits = [];
    const newVisit = {
      id: 'vis-' + Date.now(),
      citizenId: visitData.citizenId || 'C10291',
      citizenName: visitData.citizenName || 'Patient',
      familyId: visitData.familyId || 'FAM-10284',
      date: visitData.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      vitals: visitData.vitals || { bp: '120/80', pulse: '76 bpm', temp: '98.6 °F', spo2: '99%' },
      symptoms: visitData.symptoms || [],
      observations: visitData.observations || 'Routine household assessment completed.',
      actionTaken: visitData.actionTaken || 'Provided ORS kit and sanitation guidance.',
      monitoringStatus: visitData.monitoringStatus || 'Routine Monitoring',
      ashaId: visitData.ashaId || 'ASHA-204',
      ashaName: visitData.ashaName || 'Sunita Devi',
      status: 'Completed',
      createdAt: new Date().toISOString()
    };

    this.state.householdVisits.unshift(newVisit);

    // Sync with Backend
    if (typeof fetch !== 'undefined') {
      fetch('/api/asha/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVisit)
      }).catch(err => console.warn('Household visit server sync notice:', err.message));
    }

    // Update citizen's monitoring status
    const citizen = this.state.userAccounts.find(u => u.id === newVisit.citizenId);
    if (citizen) {
      citizen.monitoringStatus = newVisit.monitoringStatus;
      citizen.lastVisitDate = newVisit.date;
    }

    this.state.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'asha',
      category: 'Visit Logged',
      title: `Household Visit Recorded`,
      message: `Health visit logged for ${newVisit.citizenName} (${newVisit.familyId}).`,
      time: 'Just now',
      read: false
    });

    this.saveState();
    this.notify('HOUSEHOLD_VISIT_ADDED', { visit: newVisit });
    return newVisit;
  }

  addHealthReport(reportData) {
    if (!this.state.symptomReports) this.state.symptomReports = [];
    const newReport = {
      id: 'REP-' + Math.floor(1000 + Math.random() * 9000),
      citizenId: reportData.citizenId || 'C10291',
      citizenName: reportData.citizenName || 'Community Member',
      familyId: reportData.familyId || 'FAM-10284',
      zone: reportData.zone || 'Zone C',
      symptoms: reportData.symptoms || ['Fever'],
      severity: reportData.severity || 'Moderate',
      description: reportData.description || 'Community health report filed by ASHA worker.',
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Under Surveillance',
      reportedBy: reportData.reportedBy || 'ASHA-204 (Sunita Devi)',
      photos: reportData.photos || [],
      createdAt: new Date().toISOString()
    };

    this.state.symptomReports.unshift(newReport);

    // Record in user's isolated timeline
    if (newReport.citizenId) {
      if (!this.state.userTimelines) this.state.userTimelines = {};
      if (!this.state.userTimelines[newReport.citizenId]) this.state.userTimelines[newReport.citizenId] = [];
      this.state.userTimelines[newReport.citizenId].unshift({
        id: 'tl-' + Date.now(),
        date: newReport.date,
        type: 'report',
        title: `Health issue reported: ${newReport.symptoms.join(', ')}`,
        description: `${newReport.description} (Severity: ${newReport.severity}, Area: ${newReport.zone})`,
        badgeText: 'Symptom Report',
        badgeClass: 'badge-neutral',
        photos: newReport.photos || []
      });
    }

    // Update Zone stats and Early Warning
    const zone = this.state.zones[newReport.zone];
    if (zone) {
      zone.reportsCount = (zone.reportsCount || 10) + 1;
      if (zone.reportsCount > 25) {
        zone.riskScore = Math.min(100, (zone.riskScore || 50) + 2);
        zone.riskLevel = 'HIGH';
      }
    }

    // Update KPI
    if (this.state.kpis) {
      this.state.kpis.totalHealthReports = (this.state.kpis.totalHealthReports || 0) + 1;
    }

    // Notify Doctor and Admin
    this.state.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'doctor',
      category: 'Field Report',
      title: `New Symptom Report: ${newReport.zone}`,
      message: `ASHA reported ${newReport.symptoms.join(', ')} for ${newReport.citizenName}. Severity: ${newReport.severity}.`,
      time: 'Just now',
      read: false
    });

    this.state.notifications.unshift({
      id: 'notif-' + (Date.now() + 1),
      targetRole: 'admin',
      category: 'Surveillance Alert',
      title: `Community Cluster Report in ${newReport.zone}`,
      message: `${newReport.symptoms.join(', ')} filed by ASHA in ${newReport.zone}.`,
      time: 'Just now',
      read: false
    });

    this.saveState();
    this.notify('HEALTH_REPORT_ADDED', { report: newReport });
    return newReport;
  }

  updateCitizenMonitoringStatus(citizenId, newStatus) {
    const citizen = this.state.userAccounts.find(u => u.id === citizenId);
    if (citizen) {
      citizen.monitoringStatus = newStatus;
      this.saveState();
      this.notify('CITIZEN_STATUS_UPDATED', { citizenId, status: newStatus });
      return true;
    }
    return false;
  }

  getCitizenDetailsForAsha(citizenId) {
    const citizen = this.state.userAccounts.find(u => u.id === citizenId) || this.state.users.citizen;
    const referrals = this.getReferralsForCitizen(citizenId);
    const visits = (this.state.householdVisits || []).filter(v => v.citizenId === citizenId);
    const family = this.state.family;
    return { citizen, referrals, visits, family };
  }

  // --- ASHA-TO-DOCTOR REFERRAL PIPELINE METHODS ---

  createDoctorReferral(referralData) {
    const {
      citizenId,
      ashaId,
      ashaName,
      doctorId,
      doctorName,
      specialty,
      facility,
      reason,
      urgency,
      notes,
      attachments
    } = referralData;

    const citizen = this.state.userAccounts.find(u => u.id === citizenId || u.citizenId === citizenId) || this.state.users.citizen;
    const refId = 'REF-' + Math.floor(100 + Math.random() * 900);
    const dateFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const newReferral = {
      id: refId,
      citizenId: citizen ? citizen.id : citizenId,
      citizenName: citizen ? citizen.name : 'Patient',
      citizenAge: citizen ? citizen.age : 30,
      citizenGender: citizen ? citizen.gender : 'Other',
      citizenWard: citizen ? citizen.zone : 'Zone C',
      citizenMobile: citizen ? citizen.mobile : '+91 98765 00000',
      ashaId: ashaId || 'ASHA-204',
      ashaName: ashaName || 'Sunita Devi',
      doctorId: doctorId || 'DR-1004',
      doctorName: doctorName || 'Dr. Arishta Sharma',
      specialty: specialty || 'Community Medicine Specialist',
      facility: facility || 'Urban Community Health Centre (UCHC-4)',
      reason: reason || 'Clinical review requested by ASHA worker.',
      urgency: urgency || 'Medium',
      status: 'Pending', // 'Pending' | 'Accepted' | 'Consultation Scheduled' | 'Completed' | 'Follow-up Required' | 'Closed'
      date: dateFormatted,
      notes: notes || '',
      attachments: attachments || []
    };

    if (!this.state.referrals) {
      this.state.referrals = [];
    }
    this.state.referrals.unshift(newReferral);

    // Add notification to Doctor
    this.state.notifications.unshift({
      id: 'notif-' + Date.now(),
      targetRole: 'doctor',
      category: 'New Referral',
      title: `Doctor Referral: ${newReferral.citizenName} (${newReferral.citizenId})`,
      message: `ASHA ${newReferral.ashaName} referred patient for ${newReferral.reason}`,
      time: 'Just now',
      read: false
    });

    // Add notification to Citizen
    this.state.notifications.unshift({
      id: 'notif-' + (Date.now() + 1),
      targetRole: 'citizen',
      category: 'Referral',
      title: 'Doctor Referral Initiated',
      message: `ASHA worker ${newReferral.ashaName} scheduled a referral to ${newReferral.doctorName}.`,
      time: 'Just now',
      read: false
    });

    // Realtime Server & Cloud Database Sync
    if (typeof fetch !== 'undefined') {
      fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReferral)
      }).catch(err => console.warn('Referral server sync notice:', err.message));
    }

    this.notify('DOCTOR_REFERRAL_CREATED', { referral: newReferral });
    return newReferral;
  }

  updateReferralStatus(referralId, status) {
    if (!this.state.referrals) return false;
    const ref = this.state.referrals.find(r => r.id === referralId);
    if (ref) {
      ref.status = status;

      // Notify ASHA & Citizen
      this.state.notifications.unshift({
        id: 'notif-' + Date.now(),
        targetRole: 'asha',
        category: 'Referral Update',
        title: `Referral ${status}: ${ref.citizenName}`,
        message: `Dr. ${ref.doctorName} marked referral as ${status}.`,
        time: 'Just now',
        read: false
      });

      this.notify('REFERRAL_STATUS_UPDATED', { referralId, status, referral: ref });
      return true;
    }
    return false;
  }

  getReferralsForDoctor(doctorId = 'DR-1004') {
    return (this.state.referrals || []).filter(r => r.doctorId === doctorId);
  }

  getReferralsForAsha(ashaId = 'ASHA-204') {
    return (this.state.referrals || []).filter(r => r.ashaId === ashaId);
  }

  getReferralsForCitizen(citizenId = 'CIT-10025') {
    return (this.state.referrals || []).filter(r => r.citizenId === citizenId || r.citizenAlias === citizenId || (!r.citizenId && citizenId === 'C10291'));
  }

  // --- NOTIFICATIONS MANAGEMENT ---

  getNotificationsForRole(role) {
    return (this.state.notifications || []).filter(n => n.targetRole === role || n.targetRole === 'all');
  }

  markNotificationRead(notificationId) {
    const notif = (this.state.notifications || []).find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      this.notify('NOTIFICATION_READ', { notificationId });
      return true;
    }
    return false;
  }

  markAllNotificationsRead(role) {
    (this.state.notifications || []).forEach(n => {
      if (n.targetRole === role || n.targetRole === 'all') {
        n.read = true;
      }
    });
    this.notify('ALL_NOTIFICATIONS_READ', { role });
  }

  resetState() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.notify('STATE_RESET', {});
  }
}

// Universal Singleton Export
const instance = new StateStore();
if (typeof window !== 'undefined') {
  window.SehatState = instance;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = instance;
}
