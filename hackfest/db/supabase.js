/**
 * ============================================================================
 * Sehat Setu — Supabase PostgreSQL Database Adapter
 * Seamless Cloud DB integration with local fallback
 * ============================================================================
 */

const { createClient } = require('@supabase/supabase-js');

let supabase = null;
let isConnected = false;

function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      isConnected = true;
      console.log('⚡ Supabase PostgreSQL Adapter initialized: Connected to', supabaseUrl);
    } catch (err) {
      console.warn('⚠️ Could not initialize Supabase client:', err.message);
      supabase = null;
      isConnected = false;
    }
  } else {
    supabase = null;
    isConnected = false;
  }
}

initSupabase();

// Check if Supabase is active
function isSupabaseActive() {
  return isConnected && supabase !== null;
}

// ----------------------------------------------------------------------------
// USERS CRUD
// ----------------------------------------------------------------------------
async function getAllUsers() {
  if (!isSupabaseActive()) return null;
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data.map(mapUserFromDb);
  } catch (err) {
    console.error('Supabase getAllUsers error:', err.message);
    return null;
  }
}

async function findUserByIdentifier(identifier) {
  if (!isSupabaseActive()) return null;
  try {
    const val = String(identifier || '').trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.${val},id.ilike.${val},phone.eq.${val}`)
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) return mapUserFromDb(data[0]);
    return null;
  } catch (err) {
    console.error('Supabase findUser error:', err.message);
    return null;
  }
}

async function insertUser(user) {
  if (!isSupabaseActive()) return false;
  try {
    const dbRow = mapUserToDb(user);
    const { data, error } = await supabase.from('users').upsert(dbRow).select();
    if (error) throw error;
    return data && data.length > 0 ? mapUserFromDb(data[0]) : true;
  } catch (err) {
    console.error('Supabase insertUser error:', err.message);
    return false;
  }
}

async function updateUser(id, updates) {
  if (!isSupabaseActive()) return false;
  try {
    const dbRow = mapUserToDb(updates);
    delete dbRow.id;
    const { error } = await supabase.from('users').update(dbRow).eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase updateUser error:', err.message);
    return false;
  }
}

// ----------------------------------------------------------------------------
// SESSIONS CRUD
// ----------------------------------------------------------------------------
async function saveSessionToDb(sessionId, session) {
  if (!isSupabaseActive()) return false;
  try {
    const { error } = await supabase.from('sessions').upsert({
      id: sessionId,
      user_id: session.user?.id || null,
      role: session.role,
      mode: session.mode || 'login',
      user_data: session.user || {},
      created_at: new Date(session.createdAt || Date.now()).toISOString(),
      expires_at: new Date(session.expiresAt || (Date.now() + 86400000)).toISOString()
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase saveSession error:', err.message);
    return false;
  }
}

async function getSessionFromDb(sessionId) {
  if (!isSupabaseActive()) return null;
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) {
      const row = data[0];
      return {
        role: row.role,
        mode: row.mode,
        user: row.user_data,
        createdAt: new Date(row.created_at).getTime(),
        expiresAt: new Date(row.expires_at).getTime()
      };
    }
    return null;
  } catch (err) {
    console.error('Supabase getSession error:', err.message);
    return null;
  }
}

async function deleteSessionFromDb(sessionId) {
  if (!isSupabaseActive()) return false;
  try {
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase deleteSession error:', err.message);
    return false;
  }
}

// ----------------------------------------------------------------------------
// DATA MAPPERS (CamelCase JS <-> SnakeCase PostgreSQL)
// ----------------------------------------------------------------------------
function mapUserToDb(u) {
  const row = {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email ? u.email.toLowerCase().trim() : '',
    phone: u.phone || u.mobile || null,
    password_hash: u.passwordHash || u.password_hash || null,
    provider: u.provider || 'local',
    provider_id: u.providerId || u.provider_id || null,
    abha_id: u.abhaId || u.abha_id || null,
    family_id: u.familyId || u.family_id || null,
    zone: u.zone || u.assignedZone || 'Zone C',
    address: u.address || null,
    age: u.age ? Number(u.age) : null,
    gender: u.gender || null,
    dob: u.dob || null,
    emergency_contact: u.emergencyContact || u.emergency_contact || null,
    monitoring_status: u.monitoringStatus || u.monitoring_status || 'Routine Monitoring',
    reg_number: u.regNumber || u.reg_number || null,
    specialty: u.specialty || null,
    facility: u.facility || null,
    badge_id: u.badgeId || u.badge_id || null,
    area: u.area || null,
    department: u.department || null,
    avatar_url: u.avatarUrl || u.profilePhoto || u.avatar_url || null
  };
  return Object.fromEntries(Object.entries(row).filter(([_, v]) => v !== undefined));
}

function mapUserFromDb(r) {
  return {
    id: r.id,
    role: r.role,
    name: r.name,
    email: r.email,
    phone: r.phone || '',
    mobile: r.phone || '',
    passwordHash: r.password_hash || '',
    provider: r.provider || 'local',
    providerId: r.provider_id || '',
    abhaId: r.abha_id || '',
    familyId: r.family_id || 'FAM-10284',
    zone: r.zone || 'Zone C',
    address: r.address || '',
    age: r.age || null,
    gender: r.gender || '',
    dob: r.dob || '',
    emergencyContact: r.emergency_contact || '',
    monitoringStatus: r.monitoring_status || 'Routine Monitoring',
    regNumber: r.reg_number || '',
    specialty: r.specialty || '',
    facility: r.facility || '',
    badgeId: r.badge_id || '',
    area: r.area || '',
    department: r.department || '',
    avatarUrl: r.avatar_url || '',
    profilePhoto: r.avatar_url || '',
    createdAt: r.created_at || new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// CLOUD STORAGE (Supabase Storage Bucket & Fallback)
// ----------------------------------------------------------------------------
async function uploadFileToStorage(fileBuffer, fileName, mimeType = 'image/jpeg') {
  if (!isSupabaseActive()) return null;
  try {
    const bucketName = 'medical-records';
    const filePath = `uploads/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

    if (error) {
      console.warn('Supabase storage upload notice:', error.message);
      return null;
    }

    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicData?.publicUrl || null;
  } catch (err) {
    console.error('uploadFileToStorage error:', err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// HEALTH REPORTS & REFERRALS CLOUD SYNC
// ----------------------------------------------------------------------------
async function insertHealthReportToDb(report) {
  if (!isSupabaseActive()) return false;
  try {
    const { error } = await supabase.from('health_reports').upsert({
      id: report.id,
      citizen_id: report.citizenId,
      zone: report.zone,
      symptoms: report.symptoms,
      severity: report.severity,
      description: report.description,
      status: report.status || 'Under Surveillance',
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase insertHealthReport error:', err.message);
    return false;
  }
}

async function insertReferralToDb(referral) {
  if (!isSupabaseActive()) return false;
  try {
    const { error } = await supabase.from('referrals').upsert({
      id: referral.id,
      citizen_id: referral.citizenId,
      citizen_name: referral.citizenName,
      doctor_id: referral.doctorId,
      doctor_name: referral.doctorName,
      asha_id: referral.ashaId || 'ASHA-204',
      facility: referral.facility,
      urgency: referral.urgency,
      reason: referral.reason,
      notes: referral.notes,
      status: referral.status || 'Pending Review',
      scheduled_date: referral.date
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase insertReferral error:', err.message);
    return false;
  }
}

module.exports = {
  initSupabase,
  isSupabaseActive,
  getAllUsers,
  findUserByIdentifier,
  insertUser,
  updateUser,
  saveSessionToDb,
  getSessionFromDb,
  deleteSessionFromDb,
  uploadFileToStorage,
  insertHealthReportToDb,
  insertReferralToDb
};
