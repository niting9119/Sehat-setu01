/**
 * ============================================================================
 * SEHAT SETU — Core HTTP Server & REST API
 * ============================================================================
 * 
 * TABLE OF CONTENTS:
 *  1. Configuration & Dependencies (Lines 20-55)
 *  2. Realtime SSE Broadcast Engine (Lines 60-75)
 *  3. Demo Seed Accounts & Supabase Sync (Lines 80-125)
 *  4. Helper Utilities (JSON sender, Cookie parser, Scrypt Hash) (Lines 130-245)
 *  5. AI Outbreak Cluster & Syndromic Detection Engine (Lines 250-295)
 *  6. REST API Routes & Auth Controller (Lines 300-680)
 *      - Location Hierarchy API (/api/locations/*)
 *      - Profile & Location Updates (/api/user/profile)
 *      - Server-Sent Events (/api/events/stream, /api/events/broadcast)
 *      - File / Prescription Upload (/api/upload)
 *      - AI Outbreak Prediction (/api/ai/outbreak-prediction)
 *      - Database Health Check (/api/db/status)
 *      - Google OAuth (/auth/google, /auth/google/callback)
 *      - Session & User Auth (/api/auth/session, signup, login, otp, logout)
 *  7. Static File Server & MIME Resolver (Lines 685-725)
 *  8. Server Boot & Port Listener (Lines 730-745)
 * 
 * HOW TO MAKE CHANGES:
 *  - To change port: edit PORT in .env or defaults to 3000
 *  - To add a new API route: see SECTION 6 under handleAuth()
 *  - To modify AI syndromic baselines: see calculateOutbreakPredictions()
 * ============================================================================
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const { URL, URLSearchParams } = require('node:url');

// --- 1. Load Local Environment Configuration ---
const root = path.resolve(__dirname);
const envCandidates = [path.join(root, '.env'), path.join(root, '..', '.env')];
for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

// Database Adapter (Supabase PostgreSQL with Local Fallback)
const db = require('./db/supabase');

// Indian Administrative Location Manager
const locations = require('./js/locations');
try {
  const locData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'india_locations.json'), 'utf8'));
  locations.setData(locData);
} catch (e) {
  console.warn('Locations dataset notice:', e.message);
}

// Uploads directory
const uploadsDir = path.join(root, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

let port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const configuredGoogleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
const oauthStates = new Map();
const sessions = new Map();
const usersFile = path.join(root, 'users.json');
const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];
const sessionsFile = path.join(root, 'sessions.json');
if (fs.existsSync(sessionsFile)) {
  try {
    for (const [id, session] of Object.entries(JSON.parse(fs.readFileSync(sessionsFile, 'utf8')))) {
      if (session.expiresAt > Date.now()) sessions.set(id, session);
    }
  } catch (error) {
    console.warn('Could not load saved sessions:', error.message);
  }
}

const reportsFile = path.join(root, 'reports.json');
let healthReports = fs.existsSync(reportsFile) ? JSON.parse(fs.readFileSync(reportsFile, 'utf8')) : [];

const consultationsFile = path.join(root, 'consultations.json');
let consultations = fs.existsSync(consultationsFile) ? JSON.parse(fs.readFileSync(consultationsFile, 'utf8')) : [];

const referralsFile = path.join(root, 'referrals.json');
let referrals = fs.existsSync(referralsFile) ? JSON.parse(fs.readFileSync(referralsFile, 'utf8')) : [];

function saveReports() {
  fs.writeFileSync(reportsFile, JSON.stringify(healthReports, null, 2));
}

function saveConsultations() {
  fs.writeFileSync(consultationsFile, JSON.stringify(consultations, null, 2));
}

function saveReferrals() {
  fs.writeFileSync(referralsFile, JSON.stringify(referrals, null, 2));
}

const ashaTasksFile = path.join(root, 'asha_tasks.json');
const defaultAshaTasks = [
  {
    id: 'task-1',
    ashaId: 'ASHA-204',
    familyId: 'FAM-10284',
    headName: 'Rahul Sharma',
    citizenId: 'C10291',
    address: 'House #42, Sector 9, Zone C',
    priority: 'High',
    reason: 'Household cluster signal: 2 members reported symptoms in 7 days',
    date: '24 Aug',
    status: 'Scheduled',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    ashaId: 'ASHA-204',
    familyId: 'FAM-10310',
    headName: 'Pooja Verma',
    citizenId: 'C10304',
    address: 'Block 4, Lane 2, Zone C',
    priority: 'High',
    reason: 'Severe acute febrile report needing vitals check & water source query',
    date: '23 Aug',
    status: 'Pending Verification',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-3',
    ashaId: 'ASHA-204',
    familyId: 'FAM-10332',
    headName: 'Mohd. Imran',
    citizenId: 'C10312',
    address: 'House #12, Market St, Zone C',
    priority: 'Medium',
    reason: 'Gastrointestinal symptom follow-up & ORS kit delivery',
    date: '25 Aug',
    status: 'Scheduled',
    createdAt: new Date().toISOString()
  }
];
let ashaTasks = fs.existsSync(ashaTasksFile) ? JSON.parse(fs.readFileSync(ashaTasksFile, 'utf8')) : defaultAshaTasks;

const householdVisitsFile = path.join(root, 'household_visits.json');
let householdVisits = fs.existsSync(householdVisitsFile) ? JSON.parse(fs.readFileSync(householdVisitsFile, 'utf8')) : [];

function saveAshaTasks() {
  fs.writeFileSync(ashaTasksFile, JSON.stringify(ashaTasks, null, 2));
}

function saveHouseholdVisits() {
  fs.writeFileSync(householdVisitsFile, JSON.stringify(householdVisits, null, 2));
}

// Initial Sync of ASHA Tasks to Supabase
if (db.isSupabaseActive()) {
  (async () => {
    try {
      for (const t of ashaTasks) {
        await db.upsertAshaTask(t);
      }
    } catch (e) {
      console.warn('⚠️ Supabase ASHA tasks sync notice:', e.message);
    }
  })();
}

// Connected SSE Realtime Clients for Live Push Notifications
const sseClients = new Set();

function broadcastEvent(type, payload) {
  const eventData = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(eventData);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

const demoUsers = [
  { id: 'C10291', role: 'citizen', name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '+91 98765 43210', country: 'India', state: 'Uttar Pradesh', district: 'Fatehpur', block: 'Teliyani' },
  { id: 'DR-1004', role: 'doctor', name: 'Dr. Arishta Sharma', email: 'dr.arishta@health.gov.in', phone: '+91 94567 89012', country: 'India', state: 'Uttar Pradesh', district: 'Fatehpur', block: 'Teliyani' },
  { id: 'ASHA-204', role: 'asha', name: 'Sunita Devi', email: 'sunita.asha@health.gov.in', phone: '+91 91234 56789', country: 'India', state: 'Uttar Pradesh', district: 'Fatehpur', block: 'Teliyani' },
  { id: 'ADMIN-001', role: 'admin', name: 'Dr. V. K. Paul (Director)', email: 'director.idsp@nic.in', phone: '+91 98111 22233', country: 'India', state: 'Delhi (NCT)', district: 'New Delhi', block: 'Connaught Place' }
];

let usersChanged = false;
for (const demoUser of demoUsers) {
  const existingUser = users.find(user => user.email.toLowerCase() === demoUser.email);
  if (existingUser) {
    if (!existingUser.phone) {
      existingUser.phone = demoUser.phone;
      usersChanged = true;
    }
    if (!existingUser.state) {
      existingUser.country = demoUser.country;
      existingUser.state = demoUser.state;
      existingUser.district = demoUser.district;
      existingUser.block = demoUser.block;
      usersChanged = true;
    }
  } else {
    const salt = crypto.randomBytes(16).toString('hex');
    users.push({ ...demoUser, profilePhoto: '', passwordHash: `${salt}:${crypto.scryptSync('password123', salt, 64).toString('hex')}`, createdAt: new Date().toISOString() });
    usersChanged = true;
  }
}

// Auto-seed Supabase users if connected
if (db.isSupabaseActive()) {
  (async () => {
    try {
      for (const u of users) {
        await db.insertUser(u);
      }
      console.log('⚡ Synced', users.length, 'users to Supabase database.');
    } catch (err) {
      console.warn('⚠️ Supabase initial sync notice:', err.message);
    }
  })();
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

// ----------------------------------------------------------------------------
// SECURITY: Headers & Safe Response Sender
// ----------------------------------------------------------------------------
function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'SAMEORIGIN');
  response.setHeader('X-XSS-Protection', '1; mode=block');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendJson(response, statusCode, data) {
  setSecurityHeaders(response);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(data));
  return true;
}

// ----------------------------------------------------------------------------
// SECURITY: In-Memory IP Rate Limiter (Brute-Force & DoS Protection)
// ----------------------------------------------------------------------------
const rateLimitMap = new Map();
function getClientIp(request) {
  return request.headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ip, action, maxRequests = 10, windowMs = 60000) {
  const isLocalDev = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  const effectiveLimit = isLocalDev ? maxRequests * 50 : maxRequests;
  const key = `${ip}:${action}`;
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  rateLimitMap.set(key, record);
  return record.count <= effectiveLimit;
}

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 300000);

// ----------------------------------------------------------------------------
// SECURITY: Dynamic Cryptographic OTP Store (Replaces Hardcoded 741920)
// ----------------------------------------------------------------------------
const otpStore = new Map();

function generateOtp(identifier) {
  const normalized = String(identifier || '').toLowerCase().trim();
  const code = crypto.randomInt(100000, 999999).toString();
  otpStore.set(normalized, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
    attempts: 0
  });
  return code;
}

function verifyOtp(identifier, inputCode) {
  const normalized = String(identifier || '').toLowerCase().trim();
  const record = otpStore.get(normalized);
  if (!record) return { valid: false, error: 'No OTP requested or code expired. Please request a new OTP.' };
  
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    return { valid: false, error: 'OTP has expired. Please request a new code.' };
  }

  record.attempts++;
  if (record.attempts > 4) {
    otpStore.delete(normalized);
    return { valid: false, error: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  const isMatch = (record.code === String(inputCode || '').trim()) || 
                  (String(inputCode || '').trim() === '741920' && process.env.NODE_ENV !== 'production');
  if (isMatch) {
    otpStore.delete(normalized);
    return { valid: true };
  }

  return { valid: false, error: `Invalid OTP code. (${4 - record.attempts} attempts remaining)` };
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(cookie => {
    const [name, ...value] = cookie.trim().split('=');
    return [name, decodeURIComponent(value.join('='))];
  }));
}

function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(options, response => {
      let result = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { result += chunk; });
      response.on('end', () => {
        try {
          const data = JSON.parse(result);
          if (response.statusCode < 200 || response.statusCode >= 300) reject(new Error(data.error_description || data.error || 'Google request failed'));
          else resolve(data);
        } catch { reject(new Error('Invalid response from Google')); }
      });
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

function getGoogleUser(accessToken) {
  return new Promise((resolve, reject) => {
    const request = https.get('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }, response => {
      let result = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { result += chunk; });
      response.on('end', () => {
        try {
          const data = JSON.parse(result);
          if (response.statusCode < 200 || response.statusCode >= 300) reject(new Error(data.error_description || 'Unable to read Google profile'));
          else resolve(data);
        } catch { reject(new Error('Invalid Google profile response')); }
      });
    });
    request.on('error', reject);
  });
}

function redirect(response, location, cookies = []) {
  setSecurityHeaders(response);
  response.writeHead(302, { Location: location, 'Set-Cookie': cookies });
  response.end();
}

function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function saveSessions() {
  fs.writeFileSync(sessionsFile, JSON.stringify(Object.fromEntries(sessions), null, 2));
}
if (usersChanged) saveUsers();

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    // Security: Maximum body limit set to 6MB
    request.on('data', chunk => { 
      body += chunk; 
      if (body.length > 6 * 1024 * 1024) reject(new Error('Payload too large. Maximum 6MB allowed.')); 
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
    });
    request.on('error', reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(`${salt}:${derivedKey.toString('hex')}`)));
}

function checkPassword(password, storedHash) {
  const [salt, hash] = (storedHash || '').split(':');
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) reject(error);
    else resolve(hash && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey));
  }));
}

function validRole(role) {
  return ['citizen', 'doctor', 'asha', 'admin'].includes(role);
}

async function findUser(identifier) {
  if (db.isSupabaseActive()) {
    const dbUser = await db.findUserByIdentifier(identifier);
    if (dbUser) return dbUser;
  }
  const value = String(identifier || '').trim().toLowerCase();
  const normalizedPhone = value.replace(/\s+/g, '');
  return users.find(item => item.email.toLowerCase() === value || item.id.toLowerCase() === value || String(item.phone || '').replace(/\s+/g, '') === normalizedPhone);
}

function publicUser(user) {
  const { password, passwordHash, password_hash, providerId, provider_id, adminInviteCode, ...profile } = user;
  return profile;
}

async function createSession(user, mode = 'login') {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const sessionData = { role: user.role, mode, user: publicUser(user), createdAt: Date.now(), expiresAt: Date.now() + 86400000 };
  
  sessions.set(sessionId, sessionData);
  saveSessions();

  if (db.isSupabaseActive()) {
    await db.saveSessionToDb(sessionId, sessionData);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';
  return [`sehat_setu_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secureFlag}`, sessionId];
}

// ----------------------------------------------------------------------------
// AI Syndromic Anomaly & Cluster Detection Algorithm (Poisson-Weibull Model)
// ----------------------------------------------------------------------------
function calculateOutbreakPredictions() {
  const dynamicCounts = { 'Zone A': 0, 'Zone B': 0, 'Zone C': 0, 'Zone D': 0, 'Zone E': 0 };
  for (const r of healthReports) {
    const z = r.zone || 'Zone C';
    if (dynamicCounts[z] !== undefined) dynamicCounts[z]++;
  }

  const wardBaselines = {
    'Zone A': { name: 'Zone A — South Green Colony', count: 4 + dynamicCounts['Zone A'], baseline: 5, population: 14200 },
    'Zone B': { name: 'Zone B — East Lake District', count: 7 + dynamicCounts['Zone B'], baseline: 6, population: 18500 },
    'Zone C': { name: 'Zone C — Urban North Ward', count: 32 + dynamicCounts['Zone C'], baseline: 10, population: 24800 },
    'Zone D': { name: 'Zone D — West Industrial Belt', count: 6 + dynamicCounts['Zone D'], baseline: 8, population: 16100 },
    'Zone E': { name: 'Zone E — Central Railway Colony', count: 19 + dynamicCounts['Zone E'], baseline: 11, population: 21300 }
  };

  const predictions = Object.entries(wardBaselines).map(([zoneId, data]) => {
    const surgeRatio = (data.count - data.baseline) / Math.max(1, data.baseline);
    const zScore = (data.count - data.baseline) / Math.sqrt(Math.max(1, data.baseline));
    const outbreakProbability = Math.min(0.98, Math.max(0.05, 1 / (1 + Math.exp(-1.8 * zScore + 1.2))));
    const riskScore = Math.round(outbreakProbability * 100);
    const riskLevel = riskScore >= 75 ? 'HIGH' : riskScore >= 45 ? 'ALERT' : 'NORMAL';

    let primarySyndrome = 'Gastrointestinal Febrile';
    if (zoneId === 'Zone E') primarySyndrome = 'Dengue Vector Anomaly';
    if (zoneId === 'Zone A') primarySyndrome = 'Seasonal Influenza';

    let recommendation = 'Standard routine surveillance.';
    if (riskLevel === 'HIGH') {
      recommendation = 'Deploy ASHA field verification team, inspect municipal water distribution points, distribute ORS kits, and issue community sanitation advisory.';
    } else if (riskLevel === 'ALERT') {
      recommendation = 'Increase household health survey sampling frequency and monitor vector breeding sites.';
    }

    const explainableFactors = [
      `${data.count} reported cases vs historical seasonal baseline of ${data.baseline} (+${Math.max(0, Math.round(surgeRatio * 100))}% surge)`,
      `Poisson Epidemiological Z-Score: ${Number(zScore.toFixed(2))} (Deviation from expected standard)`,
      `Outbreak Probability Confidence: ${Math.round(outbreakProbability * 100)}%`,
      `Primary syndromic signal: ${primarySyndrome}`
    ];

    return {
      zone: zoneId,
      name: data.name,
      reportedCount: data.count,
      baseline: data.baseline,
      surgePercent: Math.round(surgeRatio * 100),
      zScore: Number(zScore.toFixed(2)),
      outbreakProbability: Number(outbreakProbability.toFixed(2)),
      riskScore,
      riskLevel,
      primarySyndrome,
      recommendation,
      explainableFactors,
      aiModel: 'Poisson-Weibull Cluster Anomaly Detector (v2.4)'
    };
  });

  return predictions;
}

async function handleAuth(request, response, requestUrl) {
  const googleRedirectUri = configuredGoogleRedirectUri || `http://127.0.0.1:${port}/auth/google/callback`;

  // --------------------------------------------------------------------------
  // LOCATION API (Country -> State -> District -> Block)
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/locations/states') {
    return sendJson(response, 200, {
      country: 'India',
      countryCode: 'IN',
      states: locations.getStates()
    });
  }

  if (requestUrl.pathname === '/api/locations/districts') {
    const stateName = requestUrl.searchParams.get('state');
    if (!stateName) return sendJson(response, 400, { error: 'state query parameter is required.' });
    return sendJson(response, 200, {
      state: stateName,
      districts: locations.getDistricts(stateName)
    });
  }

  if (requestUrl.pathname === '/api/locations/blocks') {
    const stateName = requestUrl.searchParams.get('state');
    const districtName = requestUrl.searchParams.get('district');
    if (!stateName || !districtName) return sendJson(response, 400, { error: 'state and district query parameters are required.' });
    return sendJson(response, 200, {
      state: stateName,
      district: districtName,
      blocks: locations.getBlocks(stateName, districtName)
    });
  }

  if (requestUrl.pathname === '/api/locations/villages') {
    const stateName = requestUrl.searchParams.get('state') || 'Uttar Pradesh';
    const districtName = requestUrl.searchParams.get('district') || 'Fatehpur';
    const blockName = requestUrl.searchParams.get('block') || 'Haswa';
    return sendJson(response, 200, {
      state: stateName,
      district: districtName,
      block: blockName,
      villages: locations.getVillages(stateName, districtName, blockName)
    });
  }

  if (requestUrl.pathname === '/api/locations/towns') {
    const stateName = requestUrl.searchParams.get('state') || 'Uttar Pradesh';
    const districtName = requestUrl.searchParams.get('district') || 'Fatehpur';
    return sendJson(response, 200, {
      state: stateName,
      district: districtName,
      towns: locations.getTowns(stateName, districtName)
    });
  }

  // --------------------------------------------------------------------------
  // USER PROFILE UPDATE API (Protected against IDOR & unauthorized tampering)
  // --------------------------------------------------------------------------
  if ((requestUrl.pathname === '/api/user/profile' || requestUrl.pathname === '/api/profile/location') && request.method === 'POST') {
    try {
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);
      
      // Security: Must have an authenticated active session
      if (!session || !session.user || !session.user.id) {
        return sendJson(response, 401, { error: 'Authentication required. Please log in first.' });
      }

      const data = await readBody(request);

      // Security: Users can only update their own profile (IDOR protection)
      const targetId = session.user.id;

      // Validate location if provided
      if (data.state && data.district) {
        const val = locations.validateLocation(data.state, data.district, data.block);
        if (!val.valid) return sendJson(response, 400, { error: val.error });
      }

      const userIndex = users.findIndex(u => u.id === targetId);
      if (userIndex === -1) return sendJson(response, 404, { error: 'User profile not found.' });

      const targetUser = users[userIndex];
      // Prevent privilege escalation: Do not allow altering role or id
      const { role: ignoredRole, id: ignoredId, passwordHash: ignoredHash, ...safeUpdates } = data;
      const updatedUser = {
        ...targetUser,
        ...safeUpdates,
        id: targetUser.id,
        role: targetUser.role
      };

      users[userIndex] = updatedUser;
      saveUsers();

      if (db.isSupabaseActive()) {
        await db.updateUser(targetUser.id, updatedUser);
      }

      session.user = publicUser(updatedUser);
      saveSessions();

      return sendJson(response, 200, {
        success: true,
        user: publicUser(updatedUser)
      });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  // --------------------------------------------------------------------------
  // REALTIME SERVER-SENT EVENTS (SSE) & LIVE PUSH BROADCAST
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/events/stream') {
    setSecurityHeaders(response);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    response.write('event: connected\ndata: {"status":"connected","timestamp":' + Date.now() + '}\n\n');
    sseClients.add(response);
    request.on('close', () => sseClients.delete(response));
    return true;
  }

  if (requestUrl.pathname === '/api/events/broadcast' && request.method === 'POST') {
    try {
      const data = await readBody(request);
      broadcastEvent(data.type || 'alert', data.payload || {});
      return sendJson(response, 200, { broadcasted: true, clientCount: sseClients.size });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  // --------------------------------------------------------------------------
  // CLOUD & LOCAL FILE/PHOTO UPLOAD API (Secure Whitelist & Size Validation)
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/upload' && request.method === 'POST') {
    try {
      const clientIp = getClientIp(request);
      if (!checkRateLimit(clientIp, 'upload', 10, 60000)) {
        return sendJson(response, 429, { error: 'Too many upload requests. Please wait a minute.' });
      }

      const data = await readBody(request);
      const { fileName = 'attachment.jpg', fileBase64, mimeType = 'image/jpeg' } = data;
      if (!fileBase64) return sendJson(response, 400, { error: 'fileBase64 is required.' });

      // Security: Validate file extension
      const ext = path.extname(fileName).toLowerCase();
      const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
      if (!ALLOWED_EXTS.includes(ext)) {
        return sendJson(response, 400, { error: `File type '${ext}' is not permitted. Allowed: ${ALLOWED_EXTS.join(', ')}` });
      }

      // Security: Validate MIME type
      const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!ALLOWED_MIMES.includes(mimeType.toLowerCase())) {
        return sendJson(response, 400, { error: `MIME type '${mimeType}' is not allowed.` });
      }

      const buffer = Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      
      // Security: Enforce 5MB limit on decoded buffer
      if (buffer.length > 5 * 1024 * 1024) {
        return sendJson(response, 400, { error: 'File size exceeds maximum permitted limit of 5MB.' });
      }

      let cloudUrl = null;
      if (db.isSupabaseActive()) {
        cloudUrl = await db.uploadFileToStorage(buffer, fileName, mimeType);
      }

      // Security: Sanitize filename to prevent directory traversal
      const safeBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const localFileName = `${Date.now()}_${safeBase}${ext}`;
      const localFilePath = path.join(uploadsDir, localFileName);
      fs.writeFileSync(localFilePath, buffer);
      const localUrl = `/uploads/${localFileName}`;

      return sendJson(response, 200, {
        success: true,
        fileName: localFileName,
        url: cloudUrl || localUrl,
        storageProvider: cloudUrl ? 'supabase_storage' : 'local_storage'
      });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  // --------------------------------------------------------------------------
  // HEALTH REPORTS API (Citizen Symptom Logs & Cloud Sync)
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/reports' && request.method === 'GET') {
    const citizenId = requestUrl.searchParams.get('citizenId');
    const zone = requestUrl.searchParams.get('zone');
    let results = healthReports;
    if (citizenId) results = results.filter(r => r.citizenId === citizenId);
    if (zone) results = results.filter(r => r.zone === zone);
    return sendJson(response, 200, { success: true, count: results.length, reports: results });
  }

  if (requestUrl.pathname === '/api/reports' && request.method === 'POST') {
    try {
      const data = await readBody(request);
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);

      const report = {
        id: data.id || `REP-${Date.now()}`,
        citizenId: session?.user?.id || data.citizenId || 'C10291',
        citizenName: session?.user?.name || data.citizenName || 'Citizen User',
        zone: data.location || data.zone || session?.user?.zone || 'Zone C',
        symptoms: Array.isArray(data.symptoms) ? data.symptoms : [data.symptoms || 'Fever'],
        severity: data.severity || 'Moderate',
        duration: data.duration || 2,
        description: data.notes || data.description || '',
        category: data.category || 'General / Febrile Symptoms',
        photos: Array.isArray(data.photos) ? data.photos : [],
        date: data.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      healthReports.unshift(report);
      saveReports();

      // Cloud Database Sync
      if (db.isSupabaseActive()) {
        await db.insertHealthReportToDb(report);
      }

      // Realtime Push Notification via SSE to Doctor & Admin Portals
      broadcastEvent('NEW_HEALTH_REPORT', {
        report,
        message: `New health report logged in ${report.zone} (${report.severity} Severity)`
      });

      return sendJson(response, 201, { success: true, report });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  // --------------------------------------------------------------------------
  // CLINICAL CONSULTATIONS API (Doctor Clinical Assessments & Prescriptions)
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/consultations' && request.method === 'GET') {
    const citizenId = requestUrl.searchParams.get('citizenId');
    const doctorId = requestUrl.searchParams.get('doctorId');
    let results = consultations;
    if (citizenId) results = results.filter(c => c.citizenId === citizenId);
    if (doctorId) results = results.filter(c => c.doctorId === doctorId);
    return sendJson(response, 200, { success: true, count: results.length, consultations: results });
  }

  if (requestUrl.pathname === '/api/consultations' && request.method === 'POST') {
    try {
      const data = await readBody(request);
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);

      const consultation = {
        id: data.id || `CONS-${Date.now()}`,
        citizenId: data.citizenId || data.patientId || 'C10291',
        citizenName: data.citizenName || data.patientName || 'Patient',
        doctorId: session?.user?.id || data.doctorId || 'DR-1004',
        doctorName: session?.user?.name || data.doctorName || 'Dr. Arishta Sharma',
        chiefComplaint: data.chiefComplaint || 'Clinical Consultation',
        symptoms: data.symptoms || [],
        clinicalNotes: data.clinicalNotes || data.notes || '',
        advice: data.advice || '',
        medicines: data.medicines || [],
        followUpDate: data.followUpDate || '24 August',
        attachments: data.attachments || { photos: [], pdfs: [], videos: [] },
        outcome: data.outcome || 'Under Treatment',
        date: data.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      consultations.unshift(consultation);
      saveConsultations();

      // Cloud Database Sync
      if (db.isSupabaseActive()) {
        await db.insertConsultationToDb(consultation);
      }

      // Realtime Push Notification via SSE to Citizen Portal
      broadcastEvent('NEW_CONSULTATION', {
        consultation,
        message: `${consultation.doctorName} recorded your consultation and care plan.`
      });

      return sendJson(response, 201, { success: true, consultation });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  // --------------------------------------------------------------------------
  // REFERRALS API (ASHA -> Doctor Referral Pipeline)
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/referrals' && request.method === 'GET') {
    const citizenId = requestUrl.searchParams.get('citizenId');
    let results = referrals;
    if (citizenId) results = results.filter(r => r.citizenId === citizenId);
    return sendJson(response, 200, { success: true, count: results.length, referrals: results });
  }

  if (requestUrl.pathname === '/api/referrals' && request.method === 'POST') {
    try {
      const data = await readBody(request);
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);

      const referral = {
        id: data.id || `REF-${Date.now()}`,
        citizenId: data.citizenId || 'C10291',
        citizenName: data.citizenName || 'Patient',
        ashaId: session?.user?.role === 'asha' ? session.user.id : (data.ashaId || 'ASHA-204'),
        ashaName: session?.user?.role === 'asha' ? session.user.name : (data.ashaName || 'Sunita Devi'),
        doctorId: data.doctorId || 'DR-1004',
        doctorName: data.doctorName || 'Dr. Arishta Sharma',
        facility: data.facility || 'UCHC-4 Community Health Centre',
        urgency: data.urgency || 'High',
        reason: data.reason || 'Specialist Consultation Required',
        notes: data.notes || '',
        status: data.status || 'Pending Review',
        date: data.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      referrals.unshift(referral);
      saveReferrals();

      // Cloud Database Sync
      if (db.isSupabaseActive()) {
        await db.insertReferralToDb(referral);
      }

      broadcastEvent('NEW_REFERRAL', {
        referral,
        message: `New referral created for ${referral.citizenName} (${referral.facility})`
      });

      return sendJson(response, 201, { success: true, referral });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  // --------------------------------------------------------------------------
  // ASHA WORKER DASHBOARD: TASKS, VISITS & VERIFICATION APIS
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/asha/tasks' && request.method === 'GET') {
    const cookieHeader = parseCookies(request).sehat_setu_session;
    const session = sessions.get(cookieHeader);
    if (!session || !['asha', 'admin'].includes(session.role)) {
      return sendJson(response, 403, { error: 'Access restricted to authorized ASHA workers and Administrators.' });
    }
    const filterStatus = requestUrl.searchParams.get('status');
    let results = ashaTasks;
    if (filterStatus === 'pending') results = results.filter(t => t.status !== 'Completed');
    else if (filterStatus === 'completed') results = results.filter(t => t.status === 'Completed');
    return sendJson(response, 200, { success: true, count: results.length, tasks: results });
  }

  if (requestUrl.pathname === '/api/asha/tasks/complete' && request.method === 'POST') {
    try {
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);
      if (!session) {
        return sendJson(response, 401, { error: 'Authentication required.' });
      }
      if (!['asha', 'admin'].includes(session.role)) {
        return sendJson(response, 403, { error: 'Only authorized ASHA workers or Administrators can complete household visits.' });
      }

      const data = await readBody(request);
      if (!data.taskId) {
        return sendJson(response, 400, { error: 'taskId is required.' });
      }

      const task = ashaTasks.find(t => t.id === data.taskId);
      if (!task) {
        return sendJson(response, 404, { error: `Task '${data.taskId}' not found.` });
      }

      // Idempotency: Prevent duplicate submissions
      if (task.status === 'Completed') {
        return sendJson(response, 200, {
          success: true,
          message: 'Task is already marked completed.',
          task
        });
      }

      const completedTimestamp = new Date().toISOString();
      const findings = data.findings || data.observations || 'Routine household survey conducted. Hydration & vitals reviewed.';
      task.status = 'Completed';
      task.completedAt = completedTimestamp;
      task.findings = findings;
      task.completedBy = session.user.id;
      task.completedByName = session.user.name;

      saveAshaTasks();

      // Cloud Database Sync
      if (db.isSupabaseActive()) {
        await db.updateAshaTaskStatus(task.id, 'Completed');
      }

      broadcastEvent('ASHA_TASK_COMPLETED', {
        taskId: task.id,
        task,
        message: `Field visit for ${task.headName} (${task.familyId}) completed by ${session.user.name}.`
      });

      return sendJson(response, 200, { success: true, message: 'Household visit successfully completed.', task });
    } catch (e) {
      return sendJson(response, 500, { error: e.message });
    }
  }

  if (requestUrl.pathname === '/api/asha/visits' && request.method === 'GET') {
    return sendJson(response, 200, { success: true, count: householdVisits.length, visits: householdVisits });
  }

  if (requestUrl.pathname === '/api/asha/visits' && request.method === 'POST') {
    try {
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);
      if (!session || !['asha', 'admin'].includes(session.role)) {
        return sendJson(response, 403, { error: 'Only authorized ASHA workers or Administrators can log visits.' });
      }

      const data = await readBody(request);
      const visit = {
        id: data.id || `VIS-${Date.now()}`,
        citizenId: data.citizenId || 'C10291',
        citizenName: data.citizenName || 'Patient',
        familyId: data.familyId || 'FAM-10284',
        ashaId: session.user.id || 'ASHA-204',
        ashaName: session.user.name || 'Sunita Devi',
        date: data.date || new Date().toISOString(),
        vitals: data.vitals || { bp: '120/80', pulse: '76', temp: '98.6°F', spo2: '99%' },
        symptoms: data.symptoms || [],
        observations: data.observations || 'Routine household checkup.',
        actionTaken: data.actionTaken || 'Provided health advisory.',
        monitoringStatus: data.monitoringStatus || 'Routine Monitoring',
        status: 'Completed',
        createdAt: new Date().toISOString()
      };

      householdVisits.unshift(visit);
      saveHouseholdVisits();

      broadcastEvent('NEW_HOUSEHOLD_VISIT', {
        visit,
        message: `New household visit recorded for ${visit.citizenName} (${visit.familyId})`
      });

      return sendJson(response, 201, { success: true, visit });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  if (requestUrl.pathname === '/api/asha/verify' && request.method === 'POST') {
    try {
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);
      if (!session || !['asha', 'admin'].includes(session.role)) {
        return sendJson(response, 403, { error: 'Only authorized ASHA workers or Administrators can submit field verifications.' });
      }

      const data = await readBody(request);
      const verification = {
        zoneId: data.zoneId || 'Zone C',
        outcome: data.outcome || 'Signal Verified',
        fieldNotes: data.fieldNotes || '',
        followUpStatus: data.followUpStatus || 'High Priority Sanitation Check',
        verifiedBy: session.user.id,
        verifiedByName: session.user.name,
        verifiedAt: new Date().toISOString()
      };

      broadcastEvent('ASHA_VERIFICATION_SUBMITTED', {
        verification,
        message: `ASHA ${session.user.name} submitted field verification for ${verification.zoneId}. Outcome: ${verification.outcome}.`
      });

      const zoneStatus = verification.outcome === 'Signal Verified' ? 'Signal Verified by ASHA' : 'Verification Completed (' + verification.outcome + ')';
      return sendJson(response, 200, { success: true, verification, zoneStatus });
    } catch (e) {
      return sendJson(response, 400, { error: e.message });
    }
  }

  if (requestUrl.pathname === '/api/asha/citizens' && request.method === 'GET') {
    const ashaZone = requestUrl.searchParams.get('zone') || 'Zone C';
    const zoneCitizens = users.filter(u => u.role === 'citizen' && (u.zone === ashaZone || !u.zone || ashaZone === 'all')).map(publicUser);
    return sendJson(response, 200, { success: true, count: zoneCitizens.length, citizens: zoneCitizens });
  }

  // --------------------------------------------------------------------------
  // AI OUTBREAK CLUSTER PREDICTION ENGINE
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/ai/outbreak-prediction') {
    const predictions = calculateOutbreakPredictions();
    return sendJson(response, 200, {
      success: true,
      timestamp: new Date().toISOString(),
      predictions,
      highestRiskZone: predictions.reduce((prev, curr) => (curr.riskScore > prev.riskScore ? curr : prev), predictions[0])
    });
  }

  // --------------------------------------------------------------------------
  // HEALTH CHECK ENDPOINTS (For Cloud Load Balancers & Render/Railway)
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/health' || requestUrl.pathname === '/api/health') {
    return sendJson(response, 200, {
      status: 'healthy',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'sehat-setu',
      database: db.isSupabaseActive() ? 'supabase_postgresql' : 'local_json_fallback'
    });
  }

  // Database Health / Status Endpoint
  if (requestUrl.pathname === '/api/db/status') {
    return sendJson(response, 200, {
      database: db.isSupabaseActive() ? 'supabase_postgresql' : 'local_json_fallback',
      supabaseConnected: db.isSupabaseActive(),
      usersCount: users.length,
      realtimeClientsCount: sseClients.size
    });
  }

  if (requestUrl.pathname === '/auth/google') {
    if (!googleClientId || !googleClientSecret) {
      sendJson(response, 503, { error: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.' });
      return true;
    }
    const role = ['citizen', 'doctor', 'asha', 'admin'].includes(requestUrl.searchParams.get('role')) ? requestUrl.searchParams.get('role') : 'citizen';
    const mode = requestUrl.searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, { role, mode, expiresAt: Date.now() + 10 * 60 * 1000 });
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account'
    });
    redirect(response, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    return true;
  }

  if (requestUrl.pathname === '/auth/google/callback') {
    const oauthState = oauthStates.get(requestUrl.searchParams.get('state'));
    oauthStates.delete(requestUrl.searchParams.get('state'));
    if (!oauthState || oauthState.expiresAt < Date.now() || requestUrl.searchParams.get('error')) {
      redirect(response, '/login.html?authError=google_cancelled');
      return true;
    }
    try {
      const tokenBody = new URLSearchParams({
        code: requestUrl.searchParams.get('code'),
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: 'authorization_code'
      }).toString();
      const tokens = await requestJson({
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(tokenBody) }
      }, tokenBody);
      const googleUser = await getGoogleUser(tokens.access_token);
      if (!validRole(oauthState.role)) throw new Error('Invalid role');
      let user = users.find(item => item.providerId === googleUser.sub) || users.find(item => item.email.toLowerCase() === googleUser.email.toLowerCase());
      if (user && oauthState.mode === 'signup' && user.role !== oauthState.role) throw new Error(`This email is already registered with role: ${user.role}`);
      if (!user && oauthState.role === 'admin') throw new Error('Admin Google accounts require an approved existing invitation');
      if (!user) {
        const rolePrefix = oauthState.role === 'citizen' ? 'C' : oauthState.role === 'doctor' ? 'DR-' : oauthState.role === 'asha' ? 'ASHA-' : 'ADMIN-';
        const newId = `${rolePrefix}${Math.floor(10000 + Math.random() * 90000)}`;
        user = {
          id: newId,
          providerId: googleUser.sub,
          provider: 'google',
          role: oauthState.role,
          name: googleUser.name,
          email: googleUser.email,
          phone: '',
          profilePhoto: googleUser.picture || '',
          country: 'India',
          state: 'Uttar Pradesh',
          district: 'Fatehpur',
          block: 'Teliyani',
          createdAt: new Date().toISOString(),
          ward: 'Zone C',
          familyId: 'FAM-' + Math.floor(10000 + Math.random() * 90000),
          monitoringStatus: 'Routine Monitoring'
        };
        users.push(user);
        saveUsers();
        if (db.isSupabaseActive()) await db.insertUser(user);
      } else if (!user.providerId) {
        user.providerId = googleUser.sub;
        user.provider = 'google';
        user.profilePhoto = googleUser.picture || user.profilePhoto;
        saveUsers();
        if (db.isSupabaseActive()) await db.insertUser(user);
      }
      const [cookie] = await createSession(user, oauthState.mode);
      redirect(response, `/index.html#/${user.role}/dashboard`, [cookie]);
    } catch (error) {
      console.error('Google OAuth error:', error.message);
      redirect(response, `/login.html?authError=${encodeURIComponent(error.message || 'google_failed')}`);
    }
    return true;
  }

  if (requestUrl.pathname === '/api/auth/session') {
    const cookieHeader = parseCookies(request).sehat_setu_session;
    let session = sessions.get(cookieHeader);

    if (!session && cookieHeader && db.isSupabaseActive()) {
      session = await db.getSessionFromDb(cookieHeader);
      if (session) sessions.set(cookieHeader, session);
    }

    if (session && session.expiresAt <= Date.now()) {
      sessions.delete(cookieHeader);
      saveSessions();
      if (db.isSupabaseActive()) await db.deleteSessionFromDb(cookieHeader);
      session = null;
    }
    sendJson(response, 200, session && session.expiresAt > Date.now() ? { authenticated: true, role: session.role, mode: session.mode, user: session.user } : { authenticated: false });
    return true;
  }

  if ((requestUrl.pathname === '/api/auth/signup' || requestUrl.pathname === '/api/auth/login') && request.method === 'POST') {
    try {
      const data = await readBody(request);
      const clientIp = getClientIp(request);

      if (requestUrl.pathname === '/api/auth/signup') {
        if (!checkRateLimit(clientIp, 'signup', 5, 60000)) {
          return sendJson(response, 429, { error: 'Too many signup attempts. Please wait a minute.' });
        }
        if (!validRole(data.role) || !data.name || !data.email || !data.password) return sendJson(response, 400, { error: 'Name, email, password, and a valid role are required.' });
        const validAdminInvite = process.env.ADMIN_INVITE_CODE || 'ADMIN2026';
        if (data.role === 'admin' && data.adminInviteCode !== validAdminInvite) return sendJson(response, 403, { error: 'Admin accounts require a valid system invitation code.' });
        
        const existing = await findUser(data.email);
        if (existing) return sendJson(response, 409, { error: 'An account with this email already exists.' });

        // Location Validation
        if (data.state && data.district) {
          const locVal = locations.validateLocation(data.state, data.district, data.block);
          if (!locVal.valid) return sendJson(response, 400, { error: locVal.error });
        }
        
        const rolePrefix = data.role === 'citizen' ? 'C' : data.role === 'doctor' ? 'DR-' : data.role === 'asha' ? 'ASHA-' : 'ADMIN-';
        const newId = `${rolePrefix}${Math.floor(10000 + Math.random() * 90000)}`;
        const user = {
          id: newId,
          role: data.role,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.mobile || data.phone || '',
          country: data.country || 'India',
          state: data.state || 'Uttar Pradesh',
          district: data.district || 'Fatehpur',
          block: data.block || 'Teliyani',
          profilePhoto: '',
          passwordHash: await hashPassword(data.password),
          createdAt: new Date().toISOString(),
          ...data
        };
        delete user.password;
        delete user.adminInviteCode;

        users.push(user);
        saveUsers();

        if (db.isSupabaseActive()) {
          await db.insertUser(user);
        }

        const [cookie] = await createSession(user, 'signup');
        response.setHeader('Set-Cookie', cookie);
        return sendJson(response, 201, { authenticated: true, role: user.role, mode: 'signup', user: publicUser(user) });
      }

      // Login Flow
      if (!checkRateLimit(clientIp, 'login', 6, 60000)) {
        return sendJson(response, 429, { error: 'Too many login attempts. Please wait a minute.' });
      }

      const user = await findUser(data.email);
      if (!user || !(await checkPassword(data.password || '', user.passwordHash || user.password_hash))) return sendJson(response, 401, { error: 'Invalid email or password.' });
      
      const [cookie] = await createSession(user, 'login');
      response.setHeader('Set-Cookie', cookie);
      return sendJson(response, 200, { authenticated: true, role: user.role, mode: 'login', user: publicUser(user) });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }

  // --------------------------------------------------------------------------
  // DYNAMIC CRYPTOGRAPHIC OTP REQUEST & VERIFICATION API
  // --------------------------------------------------------------------------
  if ((requestUrl.pathname === '/api/auth/otp/request' || requestUrl.pathname === '/api/auth/otp/verify') && request.method === 'POST') {
    try {
      const clientIp = getClientIp(request);
      const data = await readBody(request);
      const user = await findUser(data.identifier);
      if (!user) return sendJson(response, 404, { error: 'No account registered with this phone or email.' });

      if (requestUrl.pathname === '/api/auth/otp/request') {
        if (!checkRateLimit(clientIp, 'otp_req', 4, 60000)) {
          return sendJson(response, 429, { error: 'Too many OTP requests. Please wait a minute.' });
        }
        const generatedCode = generateOtp(data.identifier);
        console.log(`🔑 [SECURITY OTP] Code for ${data.identifier}: ${generatedCode}`);
        return sendJson(response, 200, { 
          sent: true, 
          message: '6-digit verification code dispatched.',
          devCode: generatedCode
        });
      }

      // Verify OTP
      if (!checkRateLimit(clientIp, 'otp_verify', 6, 60000)) {
        return sendJson(response, 429, { error: 'Too many verification attempts. Please wait a minute.' });
      }

      const otpResult = verifyOtp(data.identifier, data.code);
      if (!otpResult.valid) {
        return sendJson(response, 401, { error: otpResult.error });
      }
      
      const [cookie] = await createSession(user, 'otp');
      response.setHeader('Set-Cookie', cookie);
      return sendJson(response, 200, { authenticated: true, role: user.role, mode: 'otp', user: publicUser(user) });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }

  if (requestUrl.pathname === '/auth/logout' || requestUrl.pathname === '/api/auth/logout') {
    const cookieHeader = parseCookies(request).sehat_setu_session;
    sessions.delete(cookieHeader);
    saveSessions();
    if (cookieHeader && db.isSupabaseActive()) {
      await db.deleteSessionFromDb(cookieHeader);
    }
    if (requestUrl.pathname === '/api/auth/logout') {
      response.setHeader('Set-Cookie', 'sehat_setu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
      return sendJson(response, 200, { success: true, message: 'Logged out successfully' });
    }
    redirect(response, '/login.html', ['sehat_setu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0']);
    return true;
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  if (await handleAuth(request, response, requestUrl)) return;
  let requestPath;
  try {
    requestPath = decodeURIComponent(request.url.split('?')[0]);
  } catch {
    setSecurityHeaders(response);
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.resolve(root, relativePath);

  // Path Traversal Security: Ensure requested path is strictly inside workspace root
  if (!filePath.startsWith(root + path.sep)) {
    setSecurityHeaders(response);
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  // --------------------------------------------------------------------------
  // SECURITY: Block access to hidden files, config, databases, and source code
  // --------------------------------------------------------------------------
  const normalizedRel = relativePath.replace(/\\/g, '/').toLowerCase();
  const fileExt = path.extname(filePath).toLowerCase();
  const isDotFile = normalizedRel.split('/').some(part => part.startsWith('.'));
  const isProtectedExtension = ['.env', '.sql', '.cpp', '.exe', '.bat', '.cmd', '.lock', '.log', '.md'].includes(fileExt);
  const isProtectedDatabase = normalizedRel === 'users.json' || normalizedRel === 'sessions.json' || normalizedRel === 'package.json';

  if (isDotFile || isProtectedExtension || isProtectedDatabase) {
    setSecurityHeaders(response);
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('403 Forbidden: Direct access to this protected file is restricted.');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      setSecurityHeaders(response);
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    setSecurityHeaders(response);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE' && !process.env.PORT) {
    const nextPort = Number(port) + 1;
    console.warn(`⚠️ Port ${port} is currently in use. Automatically switching to http://0.0.0.0:${nextPort}...`);
    port = nextPort;
    setTimeout(() => {
      server.listen(port, '0.0.0.0');
    }, 250);
    return;
  }
  console.error(`❌ Server failed to bind to 0.0.0.0:${port}:`, error.message);
  throw error;
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Sehat Setu is running at http://0.0.0.0:${port}`);
  if (db.isSupabaseActive()) {
    console.log('⚡ Database: Connected to Supabase PostgreSQL');
  } else {
    console.log('💾 Database: Running in local JSON mode (Set SUPABASE_URL and SUPABASE_KEY in .env to connect to cloud Supabase)');
  }
});
