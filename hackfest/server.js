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
const demoUsers = [
  { id: 'C10291', role: 'citizen', name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '+91 98765 43210' },
  { id: 'DR-1004', role: 'doctor', name: 'Dr. Arishta Sharma', email: 'dr.arishta@health.gov.in', phone: '+91 94567 89012' },
  { id: 'ASHA-204', role: 'asha', name: 'Sunita Devi', email: 'sunita.asha@health.gov.in', phone: '+91 91234 56789' },
  { id: 'ADMIN-001', role: 'admin', name: 'Dr. V. K. Paul (Director)', email: 'director.idsp@nic.in', phone: '+91 98111 22233' }
];
let usersChanged = false;
for (const demoUser of demoUsers) {
  const existingUser = users.find(user => user.email.toLowerCase() === demoUser.email);
  if (existingUser) {
    if (!existingUser.phone) {
      existingUser.phone = demoUser.phone;
      usersChanged = true;
    }
  } else {
    const salt = crypto.randomBytes(16).toString('hex');
    users.push({ ...demoUser, profilePhoto: '', passwordHash: `${salt}:${crypto.scryptSync('password123', salt, 64).toString('hex')}`, createdAt: new Date().toISOString() });
    usersChanged = true;
  }
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
  '.ico': 'image/x-icon'
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
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
    request.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) reject(new Error('Request too large')); });
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

function findUser(identifier) {
  const value = String(identifier || '').trim().toLowerCase();
  const normalizedPhone = value.replace(/\s+/g, '');
  return users.find(item => item.email.toLowerCase() === value || item.id.toLowerCase() === value || String(item.phone || '').replace(/\s+/g, '') === normalizedPhone);
}

function publicUser(user) {
  const { password, passwordHash, providerId, adminInviteCode, ...profile } = user;
  return profile;
}

function createSession(user, mode = 'login') {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { role: user.role, mode, user: publicUser(user), createdAt: Date.now(), expiresAt: Date.now() + 86400000 });
  saveSessions();
  return [`sehat_setu_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`, sessionId];
}

async function handleAuth(request, response, requestUrl) {
  const googleRedirectUri = configuredGoogleRedirectUri || `http://127.0.0.1:${port}/auth/google/callback`;
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
          createdAt: new Date().toISOString(),
          ward: 'Zone C',
          familyId: 'FAM-' + Math.floor(10000 + Math.random() * 90000),
          monitoringStatus: 'Routine Monitoring'
        };
        users.push(user);
        saveUsers();
      } else if (!user.providerId) {
        user.providerId = googleUser.sub;
        user.provider = 'google';
        user.profilePhoto = googleUser.picture || user.profilePhoto;
        saveUsers();
      }
      const [cookie] = createSession(user, oauthState.mode);
      redirect(response, `/index.html#/${user.role}/dashboard`, [cookie]);
    } catch (error) {
      console.error('Google OAuth error:', error.message);
      redirect(response, `/login.html?authError=${encodeURIComponent(error.message || 'google_failed')}`);
    }
    return true;
  }

  if (requestUrl.pathname === '/api/auth/session') {
    const session = sessions.get(parseCookies(request).sehat_setu_session);
    if (session && session.expiresAt <= Date.now()) {
      sessions.delete(parseCookies(request).sehat_setu_session);
      saveSessions();
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
        if (users.some(user => user.email.toLowerCase() === data.email.trim().toLowerCase())) return sendJson(response, 409, { error: 'An account with this email already exists.' });
        const rolePrefix = data.role === 'citizen' ? 'C' : data.role === 'doctor' ? 'DR-' : data.role === 'asha' ? 'ASHA-' : 'ADMIN-';
        const newId = `${rolePrefix}${Math.floor(10000 + Math.random() * 90000)}`;
        const user = {
          id: newId,
          role: data.role,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.mobile || data.phone || '',
          profilePhoto: '',
          passwordHash: await hashPassword(data.password),
          createdAt: new Date().toISOString(),
          ...data
        };
        delete user.password;
        delete user.adminInviteCode;
        users.push(user);
        saveUsers();
        const [cookie] = createSession(user, 'signup');
        response.setHeader('Set-Cookie', cookie);
        return sendJson(response, 201, { authenticated: true, role: user.role, mode: 'signup', user: publicUser(user) });
      }
      const user = findUser(data.email);
      if (!user || !(await checkPassword(data.password || '', user.passwordHash))) return sendJson(response, 401, { error: 'Invalid email or password.' });
      const [cookie] = createSession(user, 'login');
      response.setHeader('Set-Cookie', cookie);
      return sendJson(response, 200, { authenticated: true, role: user.role, mode: 'login', user: publicUser(user) });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }

  if ((requestUrl.pathname === '/api/auth/otp/request' || requestUrl.pathname === '/api/auth/otp/verify') && request.method === 'POST') {
    try {
      const data = await readBody(request);
      const user = findUser(data.identifier);
      if (!user) return sendJson(response, 404, { error: 'Account not found.' });
      if (requestUrl.pathname === '/api/auth/otp/verify' && data.code !== '741920') return sendJson(response, 401, { error: 'Invalid OTP.' });
      if (requestUrl.pathname === '/api/auth/otp/request') return sendJson(response, 200, { sent: true });
      const [cookie] = createSession(user, 'otp');
      response.setHeader('Set-Cookie', cookie);
      return sendJson(response, 200, { authenticated: true, role: user.role, mode: 'otp', user: publicUser(user) });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }

  if (requestUrl.pathname === '/auth/logout') {
    sessions.delete(parseCookies(request).sehat_setu_session);
    saveSessions();
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
  const relativePath = requestPath === '/' ? 'login.html' : requestPath.slice(1);
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
});
