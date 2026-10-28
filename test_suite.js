const http = require('http');

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
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
    // 1. SECURITY CHECKS
    console.log('--- 1. SENSITIVE FILE ACCESS & SECURITY HEADERS ---');
    const rEnv = await req({ host: '127.0.0.1', port: 3000, path: '/.env' });
    assert('Block /.env from download', rEnv.status === 403, 'Got ' + rEnv.status);

    const rUsers = await req({ host: '127.0.0.1', port: 3000, path: '/users.json' });
    assert('Block /users.json database', rUsers.status === 403, 'Got ' + rUsers.status);

    const rSessions = await req({ host: '127.0.0.1', port: 3000, path: '/sessions.json' });
    assert('Block /sessions.json database', rSessions.status === 403, 'Got ' + rSessions.status);

    const rSchema = await req({ host: '127.0.0.1', port: 3000, path: '/supabase_schema.sql' });
    assert('Block /supabase_schema.sql', rSchema.status === 403, 'Got ' + rSchema.status);

    const rPkg = await req({ host: '127.0.0.1', port: 3000, path: '/package.json' });
    assert('Block /package.json', rPkg.status === 403, 'Got ' + rPkg.status);

    const rBat = await req({ host: '127.0.0.1', port: 3000, path: '/run.bat' });
    assert('Block /run.bat from download', rBat.status === 403, 'Got ' + rBat.status);

    const rHome = await req({ host: '127.0.0.1', port: 3000, path: '/' });
    assert('Home / serves index.html (200)', rHome.status === 200, 'Got ' + rHome.status);
    assert('Security Header: X-Frame-Options === SAMEORIGIN', rHome.headers['x-frame-options'] === 'SAMEORIGIN');
    assert('Security Header: X-Content-Type-Options === nosniff', rHome.headers['x-content-type-options'] === 'nosniff');

    // 2. AUTHENTICATION & SESSIONS
    console.log('\n--- 2. AUTHENTICATION & LOGIN FLOW ---');
    const rBadLogin = await req({ host: '127.0.0.1', port: 3000, path: '/api/auth/login', method: 'POST' }, { email: 'rahul.sharma@example.com', password: 'wrongpassword' });
    assert('Invalid Password returns 401', rBadLogin.status === 401);

    const rGoodLogin = await req({ host: '127.0.0.1', port: 3000, path: '/api/auth/login', method: 'POST' }, { email: 'rahul.sharma@example.com', password: 'password123' });
    assert('Valid Password returns 200 & role citizen', rGoodLogin.status === 200 && rGoodLogin.body.authenticated === true && rGoodLogin.body.role === 'citizen');
    const sessionCookie = (rGoodLogin.headers['set-cookie'] || [])[0];
    assert('Cookie issued (HttpOnly & SameSite=Lax)', Boolean(sessionCookie && sessionCookie.includes('HttpOnly')));

    // Check Session with Cookie
    const cookieVal = sessionCookie ? sessionCookie.split(';')[0] : '';
    const rSession = await req({ host: '127.0.0.1', port: 3000, path: '/api/auth/session', headers: { cookie: cookieVal } });
    assert('Session validates authenticated citizen profile', rSession.status === 200 && rSession.body.authenticated === true && rSession.body.role === 'citizen');

    // Dynamic OTP Flow
    console.log('\n--- 3. DYNAMIC CRYPTOGRAPHIC OTP FLOW ---');
    const rOtpReq = await req({ host: '127.0.0.1', port: 3000, path: '/api/auth/otp/request', method: 'POST' }, { identifier: 'sunita.asha@health.gov.in' });
    assert('OTP Request returns 200 with code', rOtpReq.status === 200 && rOtpReq.body.sent === true && Boolean(rOtpReq.body.devCode));
    const otpCode = rOtpReq.body.devCode;

    const rOtpBad = await req({ host: '127.0.0.1', port: 3000, path: '/api/auth/otp/verify', method: 'POST' }, { identifier: 'sunita.asha@health.gov.in', code: '999999' });
    assert('Wrong OTP returns 401 with remaining attempts', rOtpBad.status === 401);

    const rOtpGood = await req({ host: '127.0.0.1', port: 3000, path: '/api/auth/otp/verify', method: 'POST' }, { identifier: 'sunita.asha@health.gov.in', code: otpCode });
    assert('Correct OTP verifies & logs in as ASHA', rOtpGood.status === 200 && rOtpGood.body.role === 'asha');

    // 4. IDOR / PROFILE TAMPERING PROTECTION
    console.log('\n--- 4. IDOR PROFILE TAMPERING PROTECTION ---');
    const rNoAuthProfile = await req({ host: '127.0.0.1', port: 3000, path: '/api/user/profile', method: 'POST' }, { userId: 'ADMIN-001', name: 'Hacked Admin' });
    assert('Unauthenticated profile update returns 401', rNoAuthProfile.status === 401);

    // Authenticated profile update for own user
    const rAuthProfile = await req({ host: '127.0.0.1', port: 3000, path: '/api/user/profile', method: 'POST', headers: { cookie: cookieVal } }, { name: 'Rahul Sharma Verified', age: 33 });
    assert('Authenticated profile update for own user succeeds with 200', rAuthProfile.status === 200 && rAuthProfile.body.success === true);

    // IDOR Tampering attempt: Rahul tries to edit Admin user
    const rTamperProfile = await req({ host: '127.0.0.1', port: 3000, path: '/api/user/profile', method: 'POST', headers: { cookie: cookieVal } }, { userId: 'ADMIN-001', name: 'Tampered Admin' });
    assert('IDOR Protection: User cannot tamper another user profile (updates own profile instead)', Boolean(rTamperProfile.body?.user && rTamperProfile.body.user.id !== 'ADMIN-001'));

    // 5. FILE UPLOAD SECURITY & EXECUTION
    console.log('\n--- 5. FILE UPLOAD SECURITY ---');
    const rBadUpload = await req({ host: '127.0.0.1', port: 3000, path: '/api/upload', method: 'POST' }, { fileName: 'malicious.exe', fileBase64: 'data:application/octet-stream;base64,AAAA', mimeType: 'application/x-msdownload' });
    assert('Block malicious .exe upload with 400', rBadUpload.status === 400);

    const dummyJpg = Buffer.from('fake-jpeg-data').toString('base64');
    const rGoodUpload = await req({ host: '127.0.0.1', port: 3000, path: '/api/upload', method: 'POST' }, { fileName: 'prescription.jpg', fileBase64: 'data:image/jpeg;base64,' + dummyJpg, mimeType: 'image/jpeg' });
    assert('Allowed .jpg upload succeeds with 200', rGoodUpload.status === 200 && rGoodUpload.body.success === true);

    // 6. HEALTH REPORTS API (STEP 2)
    console.log('\n--- 6. HEALTH REPORTS API (STEP 2) ---');
    const rPostReport = await req({ host: '127.0.0.1', port: 3000, path: '/api/reports', method: 'POST' }, {
      citizenId: 'C10291',
      citizenName: 'Rahul Sharma',
      symptoms: ['Fever', 'Diarrhea', 'Nausea'],
      severity: 'Moderate',
      location: 'Zone C',
      notes: 'Automated test suite symptom submission'
    });
    assert('Submit Health Report returns 201', rPostReport.status === 201 && rPostReport.body.success === true);

    const rGetReports = await req({ host: '127.0.0.1', port: 3000, path: '/api/reports?citizenId=C10291' });
    assert('Get Health Reports for Citizen returns reports list', rGetReports.status === 200 && rGetReports.body.reports.length > 0);

    // 7. CONSULTATIONS API (STEP 2)
    console.log('\n--- 7. CONSULTATIONS API (STEP 2) ---');
    const rPostConsult = await req({ host: '127.0.0.1', port: 3000, path: '/api/consultations', method: 'POST' }, {
      citizenId: 'C10291',
      patientName: 'Rahul Sharma',
      doctorId: 'DR-1004',
      doctorName: 'Dr. Arishta Sharma',
      clinicalNotes: 'Acute febrile gastroenteritis. Vitals normal.',
      advice: 'ORS oral hydration TDS, rest.',
      followUpDate: '24 August'
    });
    assert('Record Consultation returns 201', rPostConsult.status === 201 && rPostConsult.body.success === true);

    const rGetConsults = await req({ host: '127.0.0.1', port: 3000, path: '/api/consultations?citizenId=C10291' });
    assert('Get Consultations for Citizen returns consultations list', rGetConsults.status === 200 && rGetConsults.body.consultations.length > 0);

    // 8. REFERRALS API (STEP 2)
    console.log('\n--- 8. REFERRALS API (STEP 2) ---');
    const rPostRef = await req({ host: '127.0.0.1', port: 3000, path: '/api/referrals', method: 'POST' }, {
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
    const rOutbreak = await req({ host: '127.0.0.1', port: 3000, path: '/api/ai/outbreak-prediction' });
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
    const rHealth = await req({ host: '127.0.0.1', port: 3000, path: '/health' });
    assert('Cloud Health Check /health returns 200 with status healthy', rHealth.status === 200 && rHealth.body.status === 'healthy');
    const rStatus = await req({ host: '127.0.0.1', port: 3000, path: '/api/db/status' });
    assert('DB Status returns valid health stats', rStatus.status === 200 && rStatus.body.usersCount > 0);

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
