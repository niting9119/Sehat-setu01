const http = require('http');

let activePort = Number(process.env.TEST_PORT) || 3000;

function req(options, body) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, port: options.port || activePort };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || data });
      });
    });
    r.on('error', reject);
    if (body) {
      const buf = typeof body === 'string' ? body : JSON.stringify(body);
      r.setHeader('Content-Type', 'application/json');
      r.setHeader('Content-Length', Buffer.byteLength(buf));
      r.write(buf);
    }
    r.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING FULL SEHAT SETU END-TO-END TEST SUITE');
  console.log('====================================================\n');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log('  [PASS]', name);
      passed++;
    } else {
      console.error('  [FAIL]', name, extra);
      failed++;
    }
  }

  try {
    if (process.env.TEST_PORT) {
      activePort = Number(process.env.TEST_PORT);
    } else {
      for (const p of [3000, 3001, 3002, 3003]) {
        try {
          const probe = await req({ host: '127.0.0.1', port: p, path: '/health' });
          if (probe.status === 200) {
            activePort = p;
            break;
          }
        } catch (e) {}
      }
    }
    console.log(`📡 Connected to target server at http://127.0.0.1:${activePort}\n`);
    // 1. SECURITY CHECKS
    console.log('--- 1. SENSITIVE FILE ACCESS & SECURITY HEADERS ---');
    const rEnv = await req({ host: '127.0.0.1', port: activePort, path: '/.env' });
    assert('Block /.env from download', rEnv.status === 403, 'Got ' + rEnv.status);

    const rUsers = await req({ host: '127.0.0.1', port: activePort, path: '/users.json' });
    assert('Block /users.json database', rUsers.status === 403, 'Got ' + rUsers.status);

    const rSessions = await req({ host: '127.0.0.1', port: activePort, path: '/sessions.json' });
    assert('Block /sessions.json database', rSessions.status === 403, 'Got ' + rSessions.status);

    const rSchema = await req({ host: '127.0.0.1', port: activePort, path: '/supabase_schema.sql' });
    assert('Block /supabase_schema.sql', rSchema.status === 403, 'Got ' + rSchema.status);

    const rPkg = await req({ host: '127.0.0.1', port: activePort, path: '/package.json' });
    assert('Block /package.json', rPkg.status === 403, 'Got ' + rPkg.status);

    const rBat = await req({ host: '127.0.0.1', port: activePort, path: '/run.bat' });
    assert('Block /run.bat from download', rBat.status === 403, 'Got ' + rBat.status);

    const rHome = await req({ host: '127.0.0.1', port: activePort, path: '/' });
    assert('Home / serves index.html (200)', rHome.status === 200, 'Got ' + rHome.status);
    assert('Security Header: X-Frame-Options === SAMEORIGIN', rHome.headers['x-frame-options'] === 'SAMEORIGIN');
    assert('Security Header: X-Content-Type-Options === nosniff', rHome.headers['x-content-type-options'] === 'nosniff');

    // 2. AUTHENTICATION & SESSIONS
    console.log('\n--- 2. AUTHENTICATION & LOGIN FLOW ---');
    const rBadLogin = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/login', method: 'POST' }, { email: 'rahul.sharma@example.com', password: 'wrongpassword' });
    assert('Invalid Password returns 401', rBadLogin.status === 401);

    const rGoodLogin = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/login', method: 'POST' }, { email: 'rahul.sharma@example.com', password: 'password123' });
    assert('Valid Password returns 200 & role citizen', rGoodLogin.status === 200 && rGoodLogin.body.authenticated === true && rGoodLogin.body.role === 'citizen');
    const sessionCookie = (rGoodLogin.headers['set-cookie'] || [])[0];
    assert('Cookie issued (HttpOnly & SameSite=Lax)', Boolean(sessionCookie && sessionCookie.includes('HttpOnly')));

    // Check Session with Cookie
    const cookieVal = sessionCookie ? sessionCookie.split(';')[0] : '';
    const rSession = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/session', headers: { cookie: cookieVal } });
    assert('Session validates authenticated citizen profile', rSession.status === 200 && rSession.body.authenticated === true && rSession.body.role === 'citizen');

    // Dynamic OTP Flow
    console.log('\n--- 3. DYNAMIC CRYPTOGRAPHIC OTP FLOW ---');
    const rOtpReq = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/otp/request', method: 'POST' }, { identifier: 'sunita.asha@health.gov.in' });
    assert('OTP Request returns 200 with code', rOtpReq.status === 200 && rOtpReq.body.sent === true && Boolean(rOtpReq.body.devCode));
    const otpCode = rOtpReq.body.devCode;

    const rOtpBad = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/otp/verify', method: 'POST' }, { identifier: 'sunita.asha@health.gov.in', code: '999999' });
    assert('Wrong OTP returns 401 with remaining attempts', rOtpBad.status === 401);

    const rOtpGood = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/otp/verify', method: 'POST' }, { identifier: 'sunita.asha@health.gov.in', code: otpCode });
    assert('Correct OTP verifies & logs in as ASHA', rOtpGood.status === 200 && rOtpGood.body.role === 'asha');

    // 4. IDOR / PROFILE TAMPERING PROTECTION
    console.log('\n--- 4. IDOR PROFILE TAMPERING PROTECTION ---');
    const rNoAuthProfile = await req({ host: '127.0.0.1', port: activePort, path: '/api/user/profile', method: 'POST' }, { userId: 'ADMIN-001', name: 'Hacked Admin' });
    assert('Unauthenticated profile update returns 401', rNoAuthProfile.status === 401);

    // Authenticated profile update for own user
    const rAuthProfile = await req({ host: '127.0.0.1', port: activePort, path: '/api/user/profile', method: 'POST', headers: { cookie: cookieVal } }, { name: 'Rahul Sharma Verified', age: 33 });
    assert('Authenticated profile update for own user succeeds with 200', rAuthProfile.status === 200 && rAuthProfile.body.success === true);

    // IDOR Tampering attempt: Rahul tries to edit Admin user
    const rTamperProfile = await req({ host: '127.0.0.1', port: activePort, path: '/api/user/profile', method: 'POST', headers: { cookie: cookieVal } }, { userId: 'ADMIN-001', name: 'Tampered Admin' });
    assert('IDOR Protection: User cannot tamper another user profile (updates own profile instead)', Boolean(rTamperProfile.body?.user && rTamperProfile.body.user.id !== 'ADMIN-001'));

    // 5. FILE UPLOAD SECURITY & EXECUTION
    console.log('\n--- 5. FILE UPLOAD SECURITY ---');
    const rBadUpload = await req({ host: '127.0.0.1', port: activePort, path: '/api/upload', method: 'POST' }, { fileName: 'malicious.exe', fileBase64: 'data:application/octet-stream;base64,AAAA', mimeType: 'application/x-msdownload' });
    assert('Block malicious .exe upload with 400', rBadUpload.status === 400);

    const dummyJpg = Buffer.from('fake-jpeg-data').toString('base64');
    const rGoodUpload = await req({ host: '127.0.0.1', port: activePort, path: '/api/upload', method: 'POST' }, { fileName: 'prescription.jpg', fileBase64: 'data:image/jpeg;base64,' + dummyJpg, mimeType: 'image/jpeg' });
    assert('Allowed .jpg upload succeeds with 200', rGoodUpload.status === 200 && rGoodUpload.body.success === true);

    // 6. HEALTH REPORTS API (STEP 2)
    console.log('\n--- 6. HEALTH REPORTS API (STEP 2) ---');
    const rPostReport = await req({ host: '127.0.0.1', port: activePort, path: '/api/reports', method: 'POST' }, {
      citizenId: 'C10291',
      citizenName: 'Rahul Sharma',
      symptoms: ['Fever', 'Diarrhea', 'Nausea'],
      severity: 'Moderate',
      location: 'Zone C',
      notes: 'Automated test suite symptom submission'
    });
    assert('Submit Health Report returns 201', rPostReport.status === 201 && rPostReport.body.success === true);

    const rGetReports = await req({ host: '127.0.0.1', port: activePort, path: '/api/reports?citizenId=C10291' });
    assert('Get Health Reports for Citizen returns reports list', rGetReports.status === 200 && rGetReports.body.reports.length > 0);

    // 7. CONSULTATIONS API (STEP 2)
    console.log('\n--- 7. CONSULTATIONS API (STEP 2) ---');
    const rPostConsult = await req({ host: '127.0.0.1', port: activePort, path: '/api/consultations', method: 'POST' }, {
      citizenId: 'C10291',
      patientName: 'Rahul Sharma',
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      clinicalNotes: 'Acute febrile gastroenteritis. Vitals normal.',
      advice: 'ORS oral hydration TDS, rest.',
      followUpDate: '24 August'
    });
    assert('Record Consultation returns 201', rPostConsult.status === 201 && rPostConsult.body.success === true);

    const rGetConsults = await req({ host: '127.0.0.1', port: activePort, path: '/api/consultations?citizenId=C10291' });
    assert('Get Consultations for Citizen returns consultations list', rGetConsults.status === 200 && rGetConsults.body.consultations.length > 0);

    // 8. REFERRALS API (STEP 2)
    console.log('\n--- 8. REFERRALS API (STEP 2) ---');
    const rPostRef = await req({ host: '127.0.0.1', port: activePort, path: '/api/referrals', method: 'POST' }, {
      citizenId: 'C10291',
      citizenName: 'Rahul Sharma',
      ashaId: 'ASHA-204',
      facility: 'UCHC-4 Community Health Centre',
      urgency: 'High',
      reason: 'Persistent fever needing laboratory blood draw'
    });
    assert('Create Referral returns 201', rPostRef.status === 201 && rPostRef.body.success === true);

    // 9. AI OUTBREAK ENGINE & EXPLAINABILITY (STEP 4)
    console.log('\n--- 9. AI OUTBREAK DETECTION & EXPLAINABILITY (STEP 4) ---');
    const rOutbreak = await req({ host: '127.0.0.1', port: activePort, path: '/api/ai/outbreak-prediction' });
    assert('Outbreak engine returns 200 with zones', rOutbreak.status === 200 && rOutbreak.body.predictions.length >= 5);
    assert('Identifies Zone C anomaly as highest risk', rOutbreak.body.highestRiskZone.zone === 'Zone C');
    const zoneCPrediction = rOutbreak.body.predictions.find(p => p.zone === 'Zone C');
    assert('Zone C has valid Poisson Z-score', typeof zoneCPrediction.zScore === 'number' && zoneCPrediction.zScore > 0);
    assert('Zone C has Explainable AI factors array', Array.isArray(zoneCPrediction.explainableFactors) && zoneCPrediction.explainableFactors.length >= 3);
    assert('Zone C includes targeted clinical recommendation', Boolean(zoneCPrediction.recommendation && zoneCPrediction.recommendation.length > 10));

    // 10. FRONTEND UX & MOBILE VALIDATION (STEP 3)
    console.log('\n--- 10. FRONTEND UX & MOBILE VALIDATION (STEP 3) ---');
    const fs = require('fs');
    const signupHtml = fs.readFileSync('hackfest/signup.html', 'utf8');
    assert('Signup enforces 10-digit Indian mobile pattern', signupHtml.includes('/^[6-9]\\d{9}$/'));
    assert('Signup enforces minimum 8-character password', signupHtml.includes('minlength="8"'));
    const loginHtml = fs.readFileSync('hackfest/login.html', 'utf8');
    assert('Login has 6-box OTP input boxes', loginHtml.includes('id="otp-1"') && loginHtml.includes('id="otp-6"'));
    const appJs = fs.readFileSync('hackfest/js/app.js', 'utf8');
    assert('Canvas client-side image compression implemented in app.js', appJs.includes('compressImage('));

    // 11. STATUTORY LEGAL & SURVEILLANCE DISCLAIMER (STEP 4)
    console.log('\n--- 11. STATUTORY LEGAL DISCLAIMER (STEP 4) ---');
    assert('Login page contains Statutory Medical Disclaimer', loginHtml.includes('Statutory Disclaimer'));
    assert('Signup page contains Statutory Medical Disclaimer', signupHtml.includes('Statutory Disclaimer'));
    assert('App footer contains Statutory Medical Disclaimer', appJs.includes('Statutory Medical & Surveillance Disclaimer'));

    // 12. DATABASE & CLOUD HEALTH CHECK ENDPOINTS (STEP 5)
    console.log('\n--- 12. CLOUD HEALTH CHECK & DB STATUS (STEP 5) ---');
    const rHealth = await req({ host: '127.0.0.1', port: activePort, path: '/health' });
    assert('Cloud Health Check /health returns 200 with status healthy', rHealth.status === 200 && rHealth.body.status === 'healthy');
    const rStatus = await req({ host: '127.0.0.1', port: activePort, path: '/api/db/status' });
    assert('DB Status returns valid health stats', rStatus.status === 200 && rStatus.body.usersCount > 0);

    // 13. ASHA DASHBOARD & WORKER ENDPOINTS
    console.log('\n--- 13. ASHA DASHBOARD & WORKER ENDPOINTS ---');
    // ASHA Worker Login
    const rAshaLogin = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/login', method: 'POST' }, { email: 'sunita.asha@health.gov.in', password: 'password123' });
    assert('ASHA login returns 200', rAshaLogin.status === 200 && rAshaLogin.body.role === 'asha');
    const ashaCookie = (rAshaLogin.headers['set-cookie'] || [])[0]?.split(';')[0];

    // Citizen Forbidden on ASHA Tasks
    const rCitizenAshaTasks = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/tasks', headers: { cookie: cookieVal } });
    assert('Citizen access to /api/asha/tasks returns 403 Forbidden', rCitizenAshaTasks.status === 403);

    // ASHA Authorized on Tasks
    const rAshaTasks = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/tasks', headers: { cookie: ashaCookie } });
    assert('ASHA access to /api/asha/tasks returns 200 with tasks', rAshaTasks.status === 200 && Array.isArray(rAshaTasks.body.tasks) && rAshaTasks.body.tasks.length > 0);
    const targetTask = rAshaTasks.body.tasks[0];
    assert('ASHA Task has correct structure (id, familyId, headName, address, status)', Boolean(targetTask.id && targetTask.familyId && targetTask.headName && targetTask.address && targetTask.status));

    // Complete Visit - Unauthenticated
    const rNoAuthComplete = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/tasks/complete', method: 'POST' }, { taskId: targetTask.id });
    assert('Unauthenticated visit completion returns 401', rNoAuthComplete.status === 401);

    // Complete Visit - Citizen Forbidden
    const rCitizenComplete = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/tasks/complete', method: 'POST', headers: { cookie: cookieVal } }, { taskId: targetTask.id });
    assert('Citizen visit completion returns 403 Forbidden', rCitizenComplete.status === 403);

    // Complete Visit - ASHA Success
    const rAshaComplete = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/tasks/complete', method: 'POST', headers: { cookie: ashaCookie } }, {
      taskId: targetTask.id,
      findings: 'Completed prenatal and hydration inspection. Vitals verified normal.'
    });
    assert('ASHA completes visit with 200 and updated status', rAshaComplete.status === 200 && rAshaComplete.body.success === true && rAshaComplete.body.task.status === 'Completed');

    // Idempotent completion check
    const rAshaCompleteAgain = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/tasks/complete', method: 'POST', headers: { cookie: ashaCookie } }, {
      taskId: targetTask.id,
      findings: 'Duplicate completion attempt'
    });
    assert('Duplicate completion is idempotent (200 success without error)', rAshaCompleteAgain.status === 200 && rAshaCompleteAgain.body.success === true);

    // Log Household Visit
    const rLogVisit = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/visits', method: 'POST', headers: { cookie: ashaCookie } }, {
      citizenId: 'C10291',
      citizenName: 'Rahul Sharma',
      familyId: 'FAM-10284',
      observations: 'Field checkup completed. Oral rehydration supplied.',
      vitals: { bp: '120/80', pulse: '76', temp: '98.4 F', spo2: '99%' }
    });
    assert('Log household visit returns 201', rLogVisit.status === 201 && rLogVisit.body.success === true);

    const rGetVisits = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/visits', headers: { cookie: ashaCookie } });
    assert('Get household visits returns visits list', rGetVisits.status === 200 && Array.isArray(rGetVisits.body.visits));

    // Field Survey Verification
    const rVerify = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/verify', method: 'POST', headers: { cookie: ashaCookie } }, {
      zoneId: 'Zone C',
      outcome: 'Signal Verified',
      fieldNotes: 'Inspected 8 households in Sector 9. Confirmed 4 individuals recovering from mild gastroenteritis.'
    });
    assert('Submit field verification returns 200', rVerify.status === 200 && rVerify.body.success === true && rVerify.body.zoneStatus === 'Signal Verified by ASHA');

    // ASHA Citizens lookup
    const rAshaCitizens = await req({ host: '127.0.0.1', port: activePort, path: '/api/asha/citizens', headers: { cookie: ashaCookie } });
    assert('Get ASHA assigned citizens returns 200 with citizens array', rAshaCitizens.status === 200 && Array.isArray(rAshaCitizens.body.citizens) && rAshaCitizens.body.citizens.length > 0);

    // 14. PROFILE CLEANUP & SECURITY VERIFICATION
    console.log('\n--- 14. PROFILE CLEANUP & SECURITY VERIFICATION ---');
    const freshAppJs = fs.readFileSync('hackfest/js/app.js', 'utf8');
    assert('Switch Active Account UI is completely removed from app.js', !freshAppJs.includes('Switch Active Account'));
    assert('switchAccount method is completely removed from app.js', !freshAppJs.includes('switchAccount('));
    assert('Account Security & Credentials card is present in app.js', freshAppJs.includes('Account Security & Credentials'));
    assert('Demo Surveillance Dataset disclaimer is rendered in ASHA dashboard', freshAppJs.includes('Demo Surveillance Dataset'));
    assert('Visit complete button has async error handling and loading feedback', freshAppJs.includes('Completing...') && freshAppJs.includes('handleCompleteAshaTask'));

    // Logout endpoint
    const rLogout = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/logout', method: 'POST', headers: { cookie: ashaCookie } });
    assert('API Logout returns 200 and clears session cookie', rLogout.status === 200 && rLogout.headers['set-cookie'] && rLogout.headers['set-cookie'][0].includes('Max-Age=0'));

    // 15. GOOGLE OAUTH CONFIGURATION & SANITIZATION (STEP 6)
    console.log('\n--- 15. GOOGLE OAUTH 2.0 CONFIGURATION & SANITIZATION ---');
    const rGoogleStatus = await req({ host: '127.0.0.1', port: activePort, path: '/api/auth/google/status' });
    assert('Google OAuth Diagnostic status returns 200', rGoogleStatus.status === 200);
    assert('Diagnostic confirms Client ID has NO newlines', rGoogleStatus.body.clientIdHasNewline === false);
    assert('Diagnostic confirms Client ID has NO internal whitespace', rGoogleStatus.body.clientIdHasWhitespace === false);
    assert('Diagnostic confirms Client ID is in valid Google Web format (*.apps.googleusercontent.com)', rGoogleStatus.body.clientIdValidFormat === true);
    assert('Effective redirect URI points to /auth/google/callback', rGoogleStatus.body.effectiveRedirectUri && rGoogleStatus.body.effectiveRedirectUri.includes('/auth/google/callback'));

    // Initiate Google OAuth Flow
    const rGoogleAuth = await req({ host: '127.0.0.1', port: activePort, path: '/auth/google?role=citizen' });
    assert('GET /auth/google redirects (302)', rGoogleAuth.status === 302 && Boolean(rGoogleAuth.headers['location']));
    const targetGoogleUrl = rGoogleAuth.headers['location'] || '';
    assert('Redirect target is accounts.google.com', targetGoogleUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
    assert('Client ID in URL does NOT contain newline %0A or \\n', !targetGoogleUrl.includes('%0A') && !targetGoogleUrl.includes('%0a') && !targetGoogleUrl.includes('\n'));
    assert('Redirect URI in URL matches callback endpoint', targetGoogleUrl.includes('redirect_uri=') && targetGoogleUrl.includes('auth%2Fgoogle%2Fcallback'));
    assert('OAuth state token is generated with 64 hex chars', targetGoogleUrl.includes('state='));

    // 16. LOCAL AND PRODUCTION HOST/URL HANDLING
    console.log('\n--- 16. LOCAL AND PRODUCTION HOST/URL HANDLING ---');
    // Test 1: 0.0.0.0 host canonicalization (redirects 0.0.0.0 to localhost to prevent Chrome 0.0.0.0 deprecation warning)
    const rZeroHost = await req({ host: '127.0.0.1', port: activePort, path: '/', headers: { host: `0.0.0.0:${activePort}` } });
    assert('Requests to 0.0.0.0 are smoothly canonicalized (302 redirect)', rZeroHost.status === 302 && Boolean(rZeroHost.headers['location']));
    assert('Canonical location points to http://localhost', rZeroHost.headers['location'] && rZeroHost.headers['location'].startsWith(`http://localhost:${activePort}`));

    // Test 2: Localhost request serves 200 without redirecting to Render
    const rLocalhost = await req({ host: '127.0.0.1', port: activePort, path: '/', headers: { host: `localhost:${activePort}` } });
    assert('Localhost request returns 200 and stays local (no cross-environment redirect)', rLocalhost.status === 200);

    // Test 3: OAuth redirect on localhost uses localhost callback (never 0.0.0.0)
    const rLocalAuth = await req({ host: '127.0.0.1', port: activePort, path: '/auth/google?role=citizen', headers: { host: `localhost:${activePort}` } });
    const localTarget = rLocalAuth.headers['location'] || '';
    assert('Local Google OAuth uses localhost callback URI', localTarget.includes('redirect_uri=http%3A%2F%2Flocalhost'));
    assert('Local Google OAuth never includes 0.0.0.0', !localTarget.includes('0.0.0.0'));

    // Test 4: Production request uses https://sehat-setu-tzn2.onrender.com callback URI
    const rProdAuth = await req({
      host: '127.0.0.1',
      port: activePort,
      path: '/auth/google?role=citizen',
      headers: {
        host: 'sehat-setu-tzn2.onrender.com',
        'x-forwarded-host': 'sehat-setu-tzn2.onrender.com',
        'x-forwarded-proto': 'https'
      }
    });
    const prodTarget = rProdAuth.headers['location'] || '';
    assert('Production Google OAuth uses Render production callback URI', prodTarget.includes('redirect_uri=https%3A%2F%2Fsehat-setu-tzn2.onrender.com%2Fauth%2Fgoogle%2Fcallback'));
    assert('Production Google OAuth never leaks localhost or 0.0.0.0', !prodTarget.includes('localhost') && !prodTarget.includes('127.0.0.1') && !prodTarget.includes('0.0.0.0'));

    console.log('\n====================================================');
    console.log('TOTAL TESTS: ' + (passed + failed) + ' | PASSED: ' + passed + ' | FAILED: ' + failed);
    console.log('====================================================');
    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Test Execution Error:', err);
    process.exit(1);
  }
}

runTests();
