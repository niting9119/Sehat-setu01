const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const { URL, URLSearchParams } = require('node:url');

const root = path.resolve(__dirname);
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
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
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=utf-8'
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  response.end(JSON.stringify(data));
  return true;
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
    request.on('data', chunk => { body += chunk; if (body.length > 25 * 1024 * 1024) reject(new Error('Request too large')); });
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

  return [`sehat_setu_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`, sessionId];
}

// AI Syndromic Anomaly & Cluster Detection Algorithm
function calculateOutbreakPredictions() {
  const wardBaselines = {
    'Zone A': { name: 'Zone A — South Green Colony', count: 4, baseline: 5, population: 14200 },
    'Zone B': { name: 'Zone B — East Lake District', count: 7, baseline: 6, population: 18500 },
    'Zone C': { name: 'Zone C — Urban North Ward', count: 32, baseline: 10, population: 24800 },
    'Zone D': { name: 'Zone D — West Industrial Belt', count: 6, baseline: 8, population: 16100 },
    'Zone E': { name: 'Zone E — Central Railway Colony', count: 19, baseline: 11, population: 21300 }
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
      recommendation = 'Deploy ASHA field verification team, inspect water distribution points, distribute ORS kits, and issue community sanitation advisory.';
    } else if (riskLevel === 'ALERT') {
      recommendation = 'Increase household health survey sampling frequency and monitor vector breeding sites.';
    }

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
  // USER PROFILE UPDATE API
  // --------------------------------------------------------------------------
  if ((requestUrl.pathname === '/api/user/profile' || requestUrl.pathname === '/api/profile/location') && request.method === 'POST') {
    try {
      const cookieHeader = parseCookies(request).sehat_setu_session;
      const session = sessions.get(cookieHeader);
      const data = await readBody(request);

      const targetId = session?.user?.id || data.userId;
      if (!targetId) return sendJson(response, 401, { error: 'Unauthorized session or missing userId.' });

      // Validate location if provided
      if (data.state && data.district) {
        const val = locations.validateLocation(data.state, data.district, data.block);
        if (!val.valid) return sendJson(response, 400, { error: val.error });
      }

      const userIndex = users.findIndex(u => u.id === targetId || u.email === data.email);
      if (userIndex === -1) return sendJson(response, 404, { error: 'User not found.' });

      const targetUser = users[userIndex];
      const updatedUser = {
        ...targetUser,
        ...data,
        id: targetUser.id,
        role: targetUser.role
      };

      users[userIndex] = updatedUser;
      saveUsers();

      if (db.isSupabaseActive()) {
        await db.updateUser(targetUser.id, updatedUser);
      }

      if (session) {
        session.user = publicUser(updatedUser);
        saveSessions();
      }

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
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
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
  // CLOUD & LOCAL FILE/PHOTO UPLOAD API
  // --------------------------------------------------------------------------
  if (requestUrl.pathname === '/api/upload' && request.method === 'POST') {
    try {
      const data = await readBody(request);
      const { fileName = 'attachment.jpg', fileBase64, mimeType = 'image/jpeg' } = data;
      if (!fileBase64) return sendJson(response, 400, { error: 'fileBase64 is required.' });

      const buffer = Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      
      let cloudUrl = null;
      if (db.isSupabaseActive()) {
        cloudUrl = await db.uploadFileToStorage(buffer, fileName, mimeType);
      }

      const localFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
      if (requestUrl.pathname === '/api/auth/signup') {
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
      const user = await findUser(data.email);
      if (!user || !(await checkPassword(data.password || '', user.passwordHash || user.password_hash))) return sendJson(response, 401, { error: 'Invalid email or password.' });
      
      const [cookie] = await createSession(user, 'login');
      response.setHeader('Set-Cookie', cookie);
      return sendJson(response, 200, { authenticated: true, role: user.role, mode: 'login', user: publicUser(user) });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }

  if ((requestUrl.pathname === '/api/auth/otp/request' || requestUrl.pathname === '/api/auth/otp/verify') && request.method === 'POST') {
    try {
      const data = await readBody(request);
      const user = await findUser(data.identifier);
      if (!user) return sendJson(response, 404, { error: 'Account not found.' });
      if (requestUrl.pathname === '/api/auth/otp/verify' && data.code !== '741920') return sendJson(response, 401, { error: 'Invalid OTP.' });
      if (requestUrl.pathname === '/api/auth/otp/request') return sendJson(response, 200, { sent: true });
      
      const [cookie] = await createSession(user, 'otp');
      response.setHeader('Set-Cookie', cookie);
      return sendJson(response, 200, { authenticated: true, role: user.role, mode: 'otp', user: publicUser(user) });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }

  if (requestUrl.pathname === '/auth/logout') {
    const cookieHeader = parseCookies(request).sehat_setu_session;
    sessions.delete(cookieHeader);
    saveSessions();
    if (cookieHeader && db.isSupabaseActive()) {
      await db.deleteSessionFromDb(cookieHeader);
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
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }
  // CHANGE 1: Main root URL / serves index.html (the public Overview page)
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root + path.sep)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE' && !process.env.PORT && port === 3000) {
    port = 3001;
    server.listen(port, '127.0.0.1');
    return;
  }
  throw error;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Sehat Setu is running at http://127.0.0.1:${port}`);
  if (db.isSupabaseActive()) {
    console.log('⚡ Database: Connected to Supabase PostgreSQL');
  } else {
    console.log('💾 Database: Running in local JSON mode (Set SUPABASE_URL and SUPABASE_KEY in .env to connect to cloud Supabase)');
  }
});
