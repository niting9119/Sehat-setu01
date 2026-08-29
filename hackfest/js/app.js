/**
 * Sehat Setu — Core Application Controller & UI View Renderers
 * Unified, Connected Healthcare Platform across Citizen, Doctor, ASHA, and Admin Portals
 * 
 * Features:
 * 1. Consistent Shared Data & Patient ID (CIT-10025 Rahul Sharma, CIT-10034 Pooja Verma, CIT-10042 Mohd. Imran)
 * 2. Citizen: Photo Upload Reports, Medical Records Hub (4 categories), Prescriptions, Consultations, Referrals & Doctor Rating
 * 3. Doctor: Register Patient (Search ID/Email & Auto-Fetch), 8-Tab Patient Profile, Consultation with Photo/PDF/Video Attachments, Outcome Analytics (85.9%) vs Rating (4.8/5.0)
 * 4. ASHA: Assigned Citizens, Doctor Referral Pipeline (Photo/PDF support), Health Visits & Verification
 * 5. Admin: Connected Ecosystem Analytics, Referrals Overview & Early Warning Radar
 * 6. Centralized Notification Drawers & Deep-Linked SPA Router
 */

window.SehatApp = {
  selectedSymptoms: new Set(['Fever']),
  selectedSeverity: 'Moderate',
  uploadedReportPhotos: [],
  selectedRecordFilter: 'all',
  currentAdIndex: Math.floor(Math.random() * 8),
  healthcareAds: [
    {
      icon: '💊',
      badgeClass: 'badge-normal',
      badgeText: 'Medicine',
      tag: 'Health Care',
      provider: 'Jan Aushadhi Kendra',
      title: 'Affordable generic medicines near you',
      description: 'Find quality generic medicines at participating Jan Aushadhi Kendras.',
      ctaText: 'Find a Kendra'
    },
    {
      icon: '🏥',
      badgeClass: 'badge-blue',
      badgeText: 'Hospital',
      tag: 'Care Access',
      provider: 'District Health Services',
      title: 'Locate a nearby government hospital',
      description: 'Check public hospitals, primary health centres, and available care services.',
      ctaText: 'View Hospitals'
    },
    {
      icon: '🩺',
      badgeClass: 'badge-purple',
      badgeText: 'Telemedicine',
      tag: 'Free Service',
      provider: 'eSanjeevani',
      title: 'Consult a doctor from home',
      description: 'Access online medical consultations through the national telemedicine service.',
      ctaText: 'Learn More'
    },
    {
      icon: '🧪',
      badgeClass: 'badge-watch',
      badgeText: 'Diagnostics',
      tag: 'Public Service',
      provider: 'Free Diagnostics Initiative',
      title: 'Essential tests at public health centres',
      description: 'Ask your local health centre about available no-cost diagnostic tests.',
      ctaText: 'Check Services'
    },
    {
      icon: '🛡️',
      badgeClass: 'badge-normal',
      badgeText: 'Government Scheme',
      tag: 'Coverage',
      provider: 'Ayushman Bharat',
      title: 'Check your health coverage eligibility',
      description: 'Learn about cashless treatment benefits available under public health coverage.',
      ctaText: 'Check Eligibility'
    },
    {
      icon: '👶',
      badgeClass: 'badge-blue',
      badgeText: 'Family Health',
      tag: 'Prevention',
      provider: 'National Health Mission',
      title: 'Keep your family vaccination schedule on track',
      description: 'Visit your nearest health worker or centre for routine immunisation support.',
      ctaText: 'View Guidance'
    },
    {
      icon: '🧘',
      badgeClass: 'badge-purple',
      badgeText: 'Wellness',
      tag: 'Community Care',
      provider: 'District Wellness Centre',
      title: 'Free support for mental wellbeing',
      description: 'Connect with trained counsellors and community wellness resources.',
      ctaText: 'Find Support'
    },
    {
      icon: '🚑',
      badgeClass: 'badge-high',
      badgeText: 'Emergency',
      tag: 'Always Open',
      provider: 'National Emergency Helpline',
      title: 'Know where to get urgent medical help',
      description: 'For emergencies, contact local emergency services or visit the nearest hospital.',
      ctaText: 'View Helplines'
    }
  ],

  // Doctor Patient Tab State
  activePatientTab: 'overview',

  // Consultation Form State
  consultationPhotos: [],
  consultationPdfs: [],
  consultationVideos: [],

  // Patient Registration Search State
  searchedPatient: null,
  patientSearchError: null,

  async init() {
    if (window.SehatAuthReady) await window.SehatAuthReady;
    const state = window.SehatState.getState();
    window.SehatState.setTheme(state.theme || 'light');

    // Subscribe to state changes for automatic UI re-rendering
    window.SehatState.subscribe((event, payload, newState) => {
      this.renderCurrentView();
      this.updateHeaderNav(newState);
    });

    // Initialize Demo Stepper
    if (window.SehatDemoFlow) {
      window.SehatDemoFlow.init();
    }

    // Connect Realtime Live Event Stream (SSE)
    this.initRealtimeEventStream();

    // Initial render
    this.renderCurrentView();
    this.updateHeaderNav(state);
  },

  initRealtimeEventStream() {
    if (typeof EventSource === 'undefined') return;
    try {
      const eventSource = new EventSource('/api/events/stream');
      
      eventSource.addEventListener('DOCTOR_REFERRAL_CREATED', (e) => {
        try {
          const data = JSON.parse(e.data);
          const ref = data.payload?.referral;
          if (ref) {
            window.SehatUI.showToast('🚨 Live Doctor Referral', `${ref.citizenName} referred to ${ref.doctorName} (${ref.urgency} Urgency)`, 'alert');
          }
        } catch (err) {}
      });

      eventSource.addEventListener('HEALTH_REPORT_ADDED', (e) => {
        try {
          const data = JSON.parse(e.data);
          const report = data.payload?.report;
          if (report) {
            window.SehatUI.showToast('📝 Grassroots Report', `New symptom report filed in ${report.zone} (${report.severity})`, 'warning');
          }
        } catch (err) {}
      });

      eventSource.addEventListener('OUTBREAK_ALERT', (e) => {
        try {
          const data = JSON.parse(e.data);
          window.SehatUI.showToast('🚨 Outbreak Cluster Alert', `High Risk Anomaly detected in ${data.zone || 'Zone C'}`, 'alert');
        } catch (err) {}
      });
    } catch (err) {
      console.warn('Realtime event stream notice:', err.message);
    }
  },

  updateHeaderNav(state) {
    const role = state.currentRole;
    const isAuthenticated = state.isAuthenticated && state.currentUser;
    const user = state.currentUser;

    // Strict Role Isolation: Hide cross-role pill switcher and demo stepper for authenticated users
    const rolePillNav = document.querySelector('.role-pill-nav');
    if (rolePillNav) {
      if (isAuthenticated) {
        rolePillNav.style.display = 'none';
      } else {
        rolePillNav.style.display = 'flex';
        document.querySelectorAll('.role-pill-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-role') === role);
        });
      }
    }

    const demoStepper = document.getElementById('demo-stepper-container');
    if (demoStepper) {
      demoStepper.style.display = isAuthenticated ? 'none' : 'flex';
    }

    // Brand logo handler
    const brandLogo = document.querySelector('.brand-logo');
    if (brandLogo) {
      brandLogo.onclick = (e) => {
        e.preventDefault();
        if (isAuthenticated) {
          window.SehatRouter.navigate(`/${user.role}/dashboard`);
        } else {
          window.SehatRouter.navigate('/landing');
        }
      };
    }

    // Calculate unread notifications for current role
    const unreadNotifs = (state.notifications || []).filter(n => (n.targetRole === role || n.targetRole === 'all') && !n.read).length;

    // Update Header Auth / Profile Button
    const headerAuthContainer = document.getElementById('header-auth-container');
    if (headerAuthContainer) {
      if (isAuthenticated) {
        const roleColor = user.role === 'citizen' ? 'var(--accent-emerald)'
          : user.role === 'doctor' ? 'var(--accent-blue)'
            : user.role === 'asha' ? 'var(--accent-purple)'
              : 'var(--accent-red)';

        const avatarMarkup = user.avatarUrl
          ? `<img src="${user.avatarUrl}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">`
          : `<div style="width: 26px; height: 26px; border-radius: 50%; background: ${roleColor}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800;">
              ${user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>`;

        headerAuthContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <!-- Notification Bell -->
            <button class="icon-btn" title="Notifications" onclick="window.SehatRouter.navigate('/${user.role}/notifications')" style="position: relative; width: 36px; height: 36px;">
              🔔
              ${unreadNotifs > 0 ? `<span style="position: absolute; top: 2px; right: 2px; background: var(--accent-red); color: #fff; font-size: 0.65rem; font-weight: 800; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">${unreadNotifs}</span>` : ''}
            </button>

            <!-- User Profile Pill -->
            <button class="btn btn-sm btn-secondary" onclick="window.SehatRouter.navigate('/${user.role}/profile')" style="display: flex; align-items: center; gap: 0.45rem; border-radius: var(--radius-full); padding: 0.3rem 0.85rem; font-weight: 700;">
              ${avatarMarkup}
              <span>${user.name.split(' ')[0]}</span>
              <span class="badge ${user.role === 'citizen' ? 'badge-normal' : user.role === 'doctor' ? 'badge-blue' : user.role === 'asha' ? 'badge-purple' : 'badge-high'}" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">
                ${user.role.toUpperCase()}
              </span>
            </button>

            <!-- Sign Out Button -->
            <button class="btn btn-sm btn-outline" title="Sign Out" onclick="window.location.href='/auth/logout';" style="border-radius: var(--radius-full); font-weight: 700; font-size: 0.8rem; padding: 0.35rem 0.75rem; color: var(--accent-red); border-color: rgba(239,68,68,0.3);">
              🚪 Log Out
            </button>
          </div>
        `;
      } else {
        headerAuthContainer.innerHTML = `
          <a href="login.html" class="btn btn-sm btn-outline" style="border-radius: var(--radius-full); font-weight: 700; padding: 0.35rem 0.85rem;">Log In</a>
          <a href="signup.html" class="btn btn-sm btn-primary" style="border-radius: var(--radius-full); font-weight: 700; padding: 0.35rem 0.85rem;">Sign Up</a>
        `;
      }
    }
  },

  rotateAd() {
    this.currentAdIndex = (this.currentAdIndex + 1) % this.healthcareAds.length;
    this.renderDynamicFooter();
  },

  renderDynamicFooter() {
    const state = window.SehatState.getState();
    const footer = document.getElementById('app-dynamic-footer');
    if (!footer) return;

    if (state.currentRole === 'landing') {
      // 1. OVERVIEW ONLY: Static Platform Architecture & Protocol Footer
      footer.innerHTML = `
        <div class="container">
          <div class="footer-grid">
            <div>
              <div style="font-weight: 800; font-family: var(--font-display); font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.5rem;">
                Sehat Setu
              </div>
              <p style="font-size: 0.825rem; line-height: 1.5;">
                Grassroots community health monitoring & non-diagnostic early warning surveillance architecture. Connecting citizens, primary healthcare providers, and surveillance officers.
              </p>
            </div>
            <div>
              <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">Role Portals</h4>
              <ul style="list-style: none; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><a href="javascript:void(0)" onclick="window.SehatState.setRole('citizen')">Citizen Health Portal</a></li>
                <li><a href="javascript:void(0)" onclick="window.SehatState.setRole('doctor')">Doctor Consultation Hub</a></li>
                <li><a href="javascript:void(0)" onclick="window.SehatState.setRole('asha')">ASHA Field Mobile App</a></li>
                <li><a href="javascript:void(0)" onclick="window.SehatState.setRole('admin')">Surveillance Command Center</a></li>
              </ul>
            </div>
            <div>
              <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">Surveillance Architecture</h4>
              <ul style="list-style: none; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem; color: var(--text-muted);">
                <li>Baseline Anomaly Detection</li>
                <li>Explainable AI Risk Scores</li>
                <li>Household Cluster Signals</li>
                <li>Environmental Intelligence</li>
              </ul>
            </div>
            <div>
              <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">Standard Protocols</h4>
              <p style="font-size: 0.775rem; color: var(--text-muted);">
                Non-diagnostic public health advisory framework. All elevated community risk scores require field verification before official dispatch.
              </p>
            </div>
          </div>

          <div class="footer-bottom">
            <div>© 2026 Sehat Setu — Smart Community Health Monitoring & Early Warning Prototype.</div>
            <div style="font-family: var(--font-mono); font-size: 0.75rem;">Build v2.6-auth-profile-hackathon</div>
          </div>
        </div>
      `;
    } else {
      // 2. CITIZEN, DOCTOR, ASHA & ADMIN PORTALS: Dynamic Rotating Healthcare Public Ad & Scheme Banner
      const ad = this.healthcareAds[this.currentAdIndex];
      footer.innerHTML = `
        <div class="container">
          <div class="healthcare-ad-strip">
            <div class="ad-main-layout">
              <div style="display: flex; align-items: flex-start; gap: 1.15rem; flex: 1;">
                <div style="width: 52px; height: 52px; border-radius: var(--radius-lg); background: var(--bg-surface-subtle); border: 1px solid var(--border-medium); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; flex-shrink: 0;">
                  ${ad.icon}
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                    <span class="badge ${ad.badgeClass}" style="font-size: 0.725rem; font-weight: 700; padding: 0.2rem 0.55rem;">${ad.badgeText}</span>
                    <span class="badge badge-normal" style="font-size: 0.7rem;">⭐ ${ad.tag}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">• ${ad.provider}</span>
                  </div>
                  <h4 style="font-size: 1.05rem; margin-bottom: 0.25rem; font-weight: 800; color: var(--text-main);">${ad.title}</h4>
                  <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0; line-height: 1.45;">${ad.description}</p>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.45rem; flex-shrink: 0;">
                <button class="btn btn-sm btn-primary" style="font-weight: 700; white-space: nowrap; padding: 0.45rem 1rem; border-radius: var(--radius-full);" onclick="window.SehatUI.showToast('${ad.title}', 'Official notice and scheme details loaded.', 'info')">
                  ${ad.ctaText}
                </button>
                <button class="btn btn-sm btn-outline" style="font-size: 0.725rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); color: var(--text-muted);" onclick="window.SehatApp.rotateAd()">
                  🔄 Next Notice (${this.currentAdIndex + 1}/${this.healthcareAds.length})
                </button>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); padding: 0.25rem 0 0.85rem;">
            <div>© 2026 Sehat Setu • Healthcare Public Advisory & Government Scheme Publishing Network</div>
            <div style="font-family: var(--font-mono);">National Health Mission • Ayushman Bharat Partnered</div>
          </div>
        </div>
      `;
    }
  },

  renderCurrentView() {
    const state = window.SehatState.getState();
    const appMain = document.getElementById('app-main');
    if (!appMain) return;

    if (state.currentTab === 'profile') {
      appMain.innerHTML = this.renderProfileView(state);
      this.bindProfileEvents();
      this.renderDynamicFooter();
      return;
    }

    switch (state.currentRole) {
      case 'citizen':
        appMain.innerHTML = this.renderCitizenView(state);
        this.bindCitizenEvents();
        break;
      case 'doctor':
        appMain.innerHTML = this.renderDoctorView(state);
        this.bindDoctorEvents();
        break;
      case 'asha':
        appMain.innerHTML = this.renderAshaView(state);
        this.bindAshaEvents();
        break;
      case 'admin':
        appMain.innerHTML = this.renderAdminView(state);
        this.bindAdminEvents();
        break;
      case 'landing':
      default:
        appMain.innerHTML = this.renderLandingView(state);
        break;
    }

    this.renderDynamicFooter();
  },

  // =========================================================================
  // 1. LANDING OVERVIEW & LAUNCHPAD
  // =========================================================================
  renderLandingView(state) {
    return `
      <div class="container" style="padding-top: 1.5rem;">
        <section class="hero-section" style="padding: 2.5rem 0 2rem;">
          <div class="hero-badge">
            <span>🛡️ Central National Healthcare Early Warning & Clinical Platform</span>
          </div>

          <h1 class="hero-title" style="font-size: 2.85rem; margin-bottom: 0.85rem;">
            Unified Community Surveillance & <span class="gradient-text">Connected Clinical Care</span>
          </h1>

          <p class="hero-subtitle" style="font-size: 1.05rem; margin-bottom: 1.75rem; max-width: 720px;">
            One integrated ecosystem connecting citizens (symptom reporting & medical records), ASHA workers (field visits & doctor referrals), medical doctors (consultations & outcome tracking), and surveillance administrators.
          </p>

          <div class="hero-cta-group" style="margin-bottom: 2.5rem; display: flex; gap: 0.85rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-lg btn-primary" onclick="window.location.href='login.html?mode=login'" style="border-radius: var(--radius-full); padding: 0.85rem 1.85rem; font-weight: 800; font-size: 1rem; box-shadow: var(--shadow-md);">
              🔑 Sign In / Login →
            </button>
            <button class="btn btn-lg btn-outline" onclick="window.location.href='signup.html'" style="border-radius: var(--radius-full); padding: 0.85rem 1.85rem; font-weight: 800; font-size: 1rem; border-width: 2px;">
              ✨ Create Account (Sign Up)
            </button>
          </div>

          <!-- 4-Step Clinical Lifecycle Flow -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2.5rem; text-align: left;">
            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.15rem; border-top: 4px solid var(--accent-emerald);">
              <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">📱</div>
              <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.2rem;">1. Citizen Health Report</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Symptom logging with photo evidence.</div>
            </div>

            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.15rem; border-top: 4px solid var(--accent-purple);">
              <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">👩‍⚕️</div>
              <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.2rem;">2. ASHA Doctor Referral</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Field visit & doctor referral with photos.</div>
            </div>

            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.15rem; border-top: 4px solid var(--accent-blue);">
              <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🩺</div>
              <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.2rem;">3. Doctor Consultation</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Rx, Photo/PDF/Video attachments & vitals.</div>
            </div>

            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.15rem; border-top: 4px solid var(--accent-red);">
              <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">📊</div>
              <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.2rem;">4. Ratings & Early Warning</div>
              <div style="font-weight: 700; color: var(--accent-emerald); font-size: 0.8rem;">Success: 85.9% • Rating: ⭐ 4.8</div>
            </div>
          </div>

          <!-- Portals Launchpad -->
          <div>
            <div style="text-align: center; margin-bottom: 1.25rem;">
              <h3 style="font-size: 1.35rem; font-weight: 800;">Connected Stakeholder Portals</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">Explore all 4 role portals connected to the central healthcare state:</p>
            </div>

            <div class="role-launchpad-grid">
              <div class="launchpad-card card-citizen" onclick="window.SehatState.login('rahul.sharma@example.com', 'password123', 'citizen'); window.SehatRouter.navigate('/citizen/dashboard');">
                <div>
                  <div class="launchpad-card-icon">👤</div>
                  <h3>Citizen Portal</h3>
                  <p>Rahul Sharma (CIT-10025) • Report symptoms, view medical records, consults & rate doctor.</p>
                </div>
                <div class="launchpad-card-footer">Enter as Citizen →</div>
              </div>

              <div class="launchpad-card card-doctor" onclick="window.SehatState.login('dr.arishta@health.gov.in', 'password123', 'doctor'); window.SehatRouter.navigate('/doctor/dashboard');">
                <div>
                  <div class="launchpad-card-icon">🩺</div>
                  <h3>Doctor Consultation Portal</h3>
                  <p>Dr. Arishta Sharma (DR-1004) • Register patient, complete consultation with files & track ratings.</p>
                </div>
                <div class="launchpad-card-footer">Enter as Doctor →</div>
              </div>

              <div class="launchpad-card card-asha" onclick="window.SehatState.login('sunita.asha@health.gov.in', 'password123', 'asha'); window.SehatRouter.navigate('/asha/dashboard');">
                <div>
                  <div class="launchpad-card-icon">👩‍⚕️</div>
                  <h3>ASHA Field App</h3>
                  <p>Sunita Devi (ASHA-204) • Assigned citizens, doctor referrals & field verification.</p>
                </div>
                <div class="launchpad-card-footer">Enter as ASHA →</div>
              </div>

              <div class="launchpad-card card-admin" onclick="window.SehatState.login('director.idsp@nic.in', 'password123', 'admin'); window.SehatRouter.navigate('/admin/dashboard');">
                <div>
                  <div class="launchpad-card-icon">🏛️</div>
                  <h3>Surveillance Command</h3>
                  <p>District Surveillance Unit • Connected KPIs, geospatial alerts & health trends.</p>
                </div>
                <div class="launchpad-card-footer">Enter Command Center →</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  },

  // =========================================================================
  // 2. CITIZEN PORTAL (REPORTS, RECORDS, CONSULTATIONS, PRESCRIPTIONS, REFERRALS)
  // =========================================================================
  renderCitizenView(state) {
    const user = state.currentUser || state.users.citizen;
    const tab = state.currentTab || 'dashboard';
    const currentPath = window.SehatRouter.currentRoute || '/citizen/dashboard';
    const unreadNotifs = (state.notifications || []).filter(n => (n.targetRole === 'citizen' || n.targetRole === 'all') && !n.read).length;

    const avatarMarkup = user.avatarUrl
      ? `<img src="${user.avatarUrl}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">`
      : `<div class="portal-user-avatar" style="background: var(--accent-emerald);">RS</div>`;

    return `
      <div class="portal-layout">
        <!-- Sidebar -->
        <aside class="portal-sidebar">
          <div class="portal-user-badge" onclick="window.SehatRouter.navigate('/citizen/profile')">
            ${avatarMarkup}
            <div class="portal-user-details">
              <h4>${user.name}</h4>
              <span>ID: ${user.id || 'CIT-10025'}</span>
            </div>
          </div>

          <nav class="portal-nav-menu">
            <div class="portal-nav-item ${currentPath === '/citizen/dashboard' || currentPath === '/citizen' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/dashboard')">
              <span>📊</span> Dashboard
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/profile') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/profile')">
              <span>👤</span> Citizen Profile
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/report') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/report-health-issue')">
              <span>📝</span> Report Health Issue
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/records') || currentPath.includes('/citizen/medical-records') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/medical-records')">
              <span>📋</span> My Medical Records
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/consultations') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/consultations')">
              <span>🩺</span> Consultations
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/prescriptions') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/prescriptions')">
              <span>💊</span> Prescriptions
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/referrals') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/referrals')">
              <span>🏥</span> Referrals
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/timeline') || currentPath.includes('/citizen/alerts') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/timeline')">
              <span>🚨</span> Health Alerts
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/notifications') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/notifications')">
              <span>🔔</span> Notifications ${unreadNotifs > 0 ? `<span class="badge badge-high" style="font-size: 0.65rem; margin-left: auto;">${unreadNotifs}</span>` : ''}
            </div>
            <div class="portal-nav-item ${currentPath.includes('/citizen/family') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/citizen/family')">
              <span>👨‍👩‍👧‍👦</span> Family Hub (${state.family.id})
            </div>
            <div class="portal-nav-item" onclick="window.location.href='/auth/logout';" style="color: var(--accent-red); margin-top: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.65rem;">
              <span>🚪</span> Logout
            </div>
          </nav>
        </aside>

        <!-- Main Content -->
        <main class="portal-content">
          ${this.renderCitizenTabContent(tab, state)}
        </main>
      </div>
    `;
  },

  renderCitizenTabContent(tab, state) {
    const user = state.currentUser || state.users.citizen;
    const family = window.SehatState.getUserFamily(user);
    const records = window.SehatState.getUserMedicalRecords(user);
    const consultations = window.SehatState.getUserConsultations(user);
    const referrals = window.SehatState.getUserReferrals(user);
    const timeline = window.SehatState.getUserTimeline(user);
    const notifications = window.SehatState.getNotificationsForRole('citizen');

    // --- TAB: CITIZEN PROFILE ---
    if (tab === 'profile') {
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>👤 Citizen Health Profile & Demographics</h2>
              <p>Official registry details, ABHA identification, and verified administrative location hierarchy.</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; max-width: 960px;">
            <!-- Profile Identity Card -->
            <div class="card" style="text-align: center;">
              <div style="position: relative; width: 88px; height: 88px; margin: 0 auto 1rem;">
                ${user.avatarUrl ? `
                  <img src="${user.avatarUrl}" style="width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-emerald);">
                ` : `
                  <div style="width: 88px; height: 88px; border-radius: 50%; background: var(--accent-emerald); color: #fff; font-size: 2rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                    ${(user.name || 'Citizen').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                `}
              </div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.25rem;">${user.name}</h3>
              <div style="font-family: var(--font-mono); font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                ID: <strong>${user.id || 'CIT-10025'}</strong>
              </div>
              <span class="badge badge-normal" style="margin-bottom: 1.25rem;">
                <span class="badge-dot"></span> ${user.monitoringStatus || 'Routine Monitoring'}
              </span>

              <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem; text-align: left; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div><strong>Email:</strong> <span style="color: var(--text-muted);">${user.email}</span></div>
                <div><strong>Phone:</strong> <span style="color: var(--text-muted);">${user.phone || user.mobile || '+91 98765 43210'}</span></div>
                <div><strong>Age / Gender:</strong> <span style="color: var(--text-muted);">${user.age || 32} yrs / ${user.gender || 'Male'}</span></div>
                <div><strong>Family Unit:</strong> <span style="color: var(--text-muted); font-family: var(--font-mono);">${user.familyId || 'FAM-10284'}</span></div>
              </div>
            </div>

            <!-- Profile Location & ABHA Card -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>📍</span> Administrative Location (India)</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem; background: var(--bg-surface-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
                  <div><span style="color: var(--text-muted);">Country:</span> <strong>🇮🇳 India</strong></div>
                  <div><span style="color: var(--text-muted);">State / UT:</span> <strong>${user.state || 'Uttar Pradesh'}</strong></div>
                  <div><span style="color: var(--text-muted);">District:</span> <strong>${user.district || 'Fatehpur'}</strong></div>
                  <div><span style="color: var(--text-muted);">Block / Sub-District:</span> <strong>${user.block || 'Haswa'}</strong></div>
                  <div style="grid-column: span 2;"><span style="color: var(--text-muted);">Village / Town / Ward:</span> <strong>🏡 ${user.village || user.town || user.ward || user.address || 'Haswa'}</strong></div>
                </div>

                <button class="btn btn-sm btn-outline" onclick="window.SehatApp.openEditProfileModal()">
                  ✏️ Edit Profile & Location
                </button>
              </div>

              <!-- ABHA National ID -->
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>🆔</span> Ayushman Bharat Health Account (ABHA)</div>
                </div>
                <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                  Your ABHA address uniquely identifies you in India's digital health ecosystem.
                </p>
                <div class="abha-badge" style="font-size: 1rem; padding: 0.75rem; text-align: center;">
                  ${user.abhaId || '14-8921-4320-1092'}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // --- TAB 1: NOTIFICATIONS ---
    if (tab === 'notifications') {
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🔔 Citizen Health Notifications</h2>
              <p>Real-time updates regarding your consultation outcomes, new prescriptions, doctor referrals, and follow-ups.</p>
            </div>
            <button class="btn btn-sm btn-outline" onclick="window.SehatState.markAllNotificationsRead('citizen'); window.SehatUI.showToast('All Read', 'Notifications marked as read.', 'info');">
              ✓ Mark All Read
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 780px;">
            ${notifications.length === 0 ? `
              <div class="card" style="text-align: center; padding: 2rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔕</div>
                <h3>No Notifications Right Now</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem;">You are up to date with all health notices.</p>
              </div>
            ` : notifications.map(n => `
              <div class="card" style="border-left: 4px solid ${n.read ? 'var(--border-medium)' : 'var(--accent-emerald)'}; background: ${n.read ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)'};" onclick="window.SehatState.markNotificationRead('${n.id}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
                  <span class="badge ${n.category === 'Prescription & Care' ? 'badge-normal' : n.category === 'Referral' ? 'badge-purple' : 'badge-blue'}">
                    ${n.category || 'General Notice'}
                  </span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${n.time}</span>
                </div>
                <h4 style="font-size: 1rem; margin-bottom: 0.25rem;">${n.title}</h4>
                <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0;">${n.message}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- TAB 2: MY PRESCRIPTIONS ---
    if (tab === 'prescriptions') {
      const rxRecords = records.filter(r => r.type === 'prescription');
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>💊 My Prescribed Medications & Dosages</h2>
              <p>Official medical prescriptions issued by consulting doctors and primary healthcare centers.</p>
            </div>
            <button class="btn btn-primary" onclick="window.SehatApp.openAddRecordModal()">+ Add Prescription</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 820px;">
            ${rxRecords.length === 0 ? `
              <div class="card" style="text-align: center; padding: 2.5rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">💊</div>
                <h3>No Prescriptions Issued Yet</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem;">When your consulting doctor issues a prescription, it will be displayed here.</p>
                <button class="btn btn-primary" style="margin-top: 0.5rem;" onclick="window.SehatApp.openAddRecordModal()">+ Upload Prescription Record</button>
              </div>
            ` : rxRecords.map(rx => `
              <div class="card" style="border-left: 4px solid var(--accent-emerald);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <h3 style="font-size: 1.15rem; margin-bottom: 0.2rem;">${rx.title}</h3>
                    <div style="font-size: 0.825rem; color: var(--primary-700); font-weight: 700;">🏥 ${rx.provider}</div>
                  </div>
                  <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${rx.date}</span>
                </div>

                <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.85rem; line-height: 1.5; white-space: pre-line; margin-bottom: 0.75rem;">
                  ${rx.details}
                </div>

                ${rx.photoUrl ? `
                  <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${rx.photoUrl}', '${rx.title}')">
                    <img src="${rx.photoUrl}" class="record-attachment-img">
                    <span style="font-size: 0.75rem;">📷 View Attached Prescription Document</span>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- TAB 3: DOCTOR REFERRALS ---
    if (tab === 'referrals') {
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🏥 Doctor Referrals from ASHA Health Worker</h2>
              <p>Specialist consultations scheduled by ASHA Sunita Devi (ASHA-204) for targeted clinical care.</p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 820px;">
            ${referrals.length === 0 ? `
              <div class="card" style="text-align: center; padding: 2.5rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏥</div>
                <h3>No Active Doctor Referrals</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem;">When your ASHA worker refers you for doctor consultation, details will be tracked here.</p>
              </div>
            ` : referrals.map(ref => `
              <div class="card" style="border-left: 4px solid var(--accent-purple);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                  <div>
                    <span class="badge badge-purple" style="font-family: var(--font-mono);">${ref.id}</span>
                    <h3 style="font-size: 1.15rem; margin-top: 0.35rem;">Referred to: ${ref.doctorName}</h3>
                    <div style="font-size: 0.825rem; color: var(--text-muted);">
                      Specialty: <strong>${ref.specialty}</strong> • ${ref.facility}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge ${ref.status === 'Completed' ? 'badge-normal' : ref.status === 'Consultation Scheduled' ? 'badge-blue' : 'badge-watch'}">
                      ● Status: ${ref.status}
                    </span>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">${ref.date}</div>
                  </div>
                </div>

                <div style="font-size: 0.85rem; margin-bottom: 0.75rem; line-height: 1.5; background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
                  <div><strong>Reason for Referral:</strong> ${ref.reason}</div>
                  ${ref.notes ? `<div style="margin-top: 0.35rem; color: var(--text-muted);"><em>ASHA Field Notes: ${ref.notes}</em></div>` : ''}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.65rem; font-size: 0.8rem;">
                  <span style="color: var(--text-muted);">Referred By: <strong>${ref.ashaName} (${ref.ashaId})</strong></span>
                  <button class="btn btn-sm btn-primary" onclick="window.SehatRouter.navigate('/citizen/consultations')">
                    View Associated Consultation →
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- TAB 4: MY DOCTOR CONSULTATIONS & CITIZEN RATING FLOW ---
    if (tab === 'consultations') {
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🩺 My Doctor Consultations & Care Plans</h2>
              <p>Review clinical diagnosis, vitals, prescriptions, and provide feedback on your healthcare experience.</p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1.25rem; max-width: 860px;">
            ${consultations.length === 0 ? `
              <div class="card" style="text-align: center; padding: 2.5rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🩺</div>
                <h3>No Consultations Recorded Yet</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem;">When Dr. Arishta or your primary healthcare provider records a consultation, it will appear here.</p>
              </div>
            ` : consultations.map(c => `
              <div class="card" style="border-left: 4px solid var(--accent-blue);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <div>
                    <span class="badge badge-blue" style="font-family: var(--font-mono);">${c.id}</span>
                    <h3 style="font-size: 1.2rem; margin-top: 0.35rem;">${c.diagnosis}</h3>
                    <div style="font-size: 0.825rem; color: var(--text-muted);">
                      Consulting Doctor: <strong>${c.doctorName}</strong> • ${c.facility}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge ${c.outcome === 'Resolved' ? 'badge-normal' : c.outcome === 'Improved' ? 'badge-blue' : 'badge-watch'}">
                      ● Case Outcome: ${c.outcome}
                    </span>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">${c.date}</div>
                  </div>
                </div>

                <!-- Vitals Grid -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.85rem; font-size: 0.8rem;">
                  <div><span style="color: var(--text-muted);">BP:</span> <strong>${c.vitals?.bp || '120/80 mmHg'}</strong></div>
                  <div><span style="color: var(--text-muted);">Pulse:</span> <strong>${c.vitals?.pulse || '76 bpm'}</strong></div>
                  <div><span style="color: var(--text-muted);">Temp:</span> <strong>${c.vitals?.temp || '98.6 °F'}</strong></div>
                  <div><span style="color: var(--text-muted);">SpO2:</span> <strong>${c.vitals?.spo2 || '99%'}</strong></div>
                </div>

                <!-- Observations & Notes -->
                <div style="font-size: 0.85rem; margin-bottom: 0.85rem; line-height: 1.5;">
                  <strong>Doctor Analysis:</strong> ${c.analysis || c.observations || 'Routine clinical assessment.'}
                  ${c.notes ? `<div style="margin-top: 0.35rem; color: var(--text-muted);"><em>Advice: ${c.notes}</em></div>` : ''}
                </div>

                <!-- Medicines Prescribed Table -->
                ${c.medicines && c.medicines.length > 0 ? `
                  <div style="margin-bottom: 0.85rem;">
                    <div style="font-weight: 800; font-size: 0.85rem; margin-bottom: 0.35rem;">💊 Prescribed Medications:</div>
                    <table class="patient-table" style="font-size: 0.8rem;">
                      <thead>
                        <tr><th>Medicine</th><th>Dosage</th><th>Instructions</th></tr>
                      </thead>
                      <tbody>
                        ${c.medicines.map(m => `
                          <tr><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.instruction}</td></tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : ''}

                <!-- Attachments Section -->
                ${(c.attachments && ((c.attachments.photos && c.attachments.photos.length > 0) || (c.attachments.pdfs && c.attachments.pdfs.length > 0) || (c.attachments.videos && c.attachments.videos.length > 0))) ? `
                  <div style="background: var(--bg-surface-subtle); border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 0.85rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; margin-bottom: 0.5rem;">📎 Attached Medical Documents & Media:</div>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                      ${(c.attachments.photos || []).map(p => `
                        <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${p.url}', '${p.name}')">
                          <img src="${p.url}" class="record-attachment-img">
                          <span style="font-size: 0.75rem;">📷 ${p.name}</span>
                        </div>
                      `).join('')}
                      ${(c.attachments.pdfs || []).map(d => `
                        <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${d.url}', '${d.name}')">
                          <span style="font-size: 1.2rem;">📄</span>
                          <span style="font-size: 0.75rem;"><strong>${d.name}</strong> (${d.size || 'PDF'})</span>
                        </div>
                      `).join('')}
                      ${(c.attachments.videos || []).map(v => `
                        <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openVideoModal('${v.url}', '${v.name}')">
                          <span style="font-size: 1.2rem;">🎥</span>
                          <span style="font-size: 0.75rem;"><strong>${v.name}</strong> (Video Play)</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- Rating / Review Section -->
                <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    ${c.rating ? `
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="color: var(--accent-amber); font-size: 1.1rem;">${'★'.repeat(c.rating.stars)}${'☆'.repeat(5 - c.rating.stars)}</span>
                        <span style="font-size: 0.8rem; font-weight: 700;">Rated ${c.rating.stars}/5</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">— "${c.rating.feedback}" (${c.rating.date})</span>
                      </div>
                    ` : `
                      <span style="font-size: 0.8rem; color: var(--text-muted);">How was your consultation experience with ${c.doctorName}?</span>
                    `}
                  </div>

                  <div>
                    ${!c.rating ? `
                      <button class="btn btn-sm btn-primary" onclick="window.SehatApp.openRatingModal('${c.id}', '${c.doctorId}', '${c.doctorName}')">
                        ⭐ Rate & Review Doctor
                      </button>
                    ` : `
                      <span class="badge badge-normal"><span class="badge-dot"></span> Feedback Submitted</span>
                    `}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- TAB 5: REPORT HEALTH ISSUE WITH PHOTO UPLOAD ---
    if (tab === 'report') {
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🏥 Report Health Issue — Visual Evidence & Details</h2>
              <p>Log your current symptoms and attach supporting photos (visible symptoms, sanitation, water quality) for health worker review.</p>
            </div>
          </div>

          <div class="card" style="max-width: 680px;">
            <form id="citizen-report-form">
              <div class="form-group">
                <label class="form-label">Health Issue / Category *</label>
                <select id="report-category" class="form-control" required>
                  <option value="Gastrointestinal & Vomiting">💧 Gastrointestinal / Diarrhea / Vomiting</option>
                  <option value="Febrile / High Fever">🌡️ Febrile / High Fever / Chills</option>
                  <option value="Respiratory / Cough">🫁 Respiratory / Cough / Breathing Issue</option>
                  <option value="Water Quality & Sanitation Issue">🚰 Water Quality / Stagnation / Sanitation Issue</option>
                  <option value="Skin Rash & Allergy">🩹 Skin Rash / Infection / Swelling</option>
                  <option value="Other Health Issue">📝 Other General Discomfort</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Select Primary Symptoms (Click to toggle)</label>
                <div class="tags-selector" id="symptom-tags">
                  <span class="tag-chip selected" data-symptom="Fever">🌡️ Fever</span>
                  <span class="tag-chip" data-symptom="Diarrhea">💧 Diarrhea</span>
                  <span class="tag-chip" data-symptom="Cough">🫁 Cough</span>
                  <span class="tag-chip" data-symptom="Vomiting">🤢 Vomiting</span>
                  <span class="tag-chip" data-symptom="Abdominal Cramps">⚡ Stomach Cramps</span>
                  <span class="tag-chip" data-symptom="Fatigue">💤 Fatigue</span>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Duration (Days) *</label>
                  <input type="number" id="report-duration" class="form-control" value="2" min="1" max="30" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Location / Village / Ward *</label>
                  <select id="report-location" class="form-control" required>
                    <option value="${user.village || user.town || user.ward || user.address || 'Haswa'}" selected>
                      📍 ${user.village || user.town || user.ward || user.address || 'Haswa'} (${user.district || 'Fatehpur'}, ${user.state || 'UP'})
                    </option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Date & Time of Incident *</label>
                  <input type="datetime-local" id="report-datetime" class="form-control" value="${new Date().toISOString().slice(0, 16)}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Severity Level *</label>
                  <div class="severity-pill-group">
                    <div class="severity-pill" data-severity="Mild">🟢 Mild</div>
                    <div class="severity-pill selected-moderate" data-severity="Moderate">🟡 Moderate</div>
                    <div class="severity-pill" data-severity="Severe">🔴 Severe</div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Detailed Description / Observations</label>
                <textarea id="report-notes" class="form-control" rows="2" placeholder="E.g., Severe stomach discomfort after drinking tap water; several neighbors in the lane reported matching issues..."></textarea>
              </div>

              <!-- 📷 PHOTO UPLOAD -->
              <div class="form-group">
                <label class="form-label">
                  <span>📷 Attach Photos (Multiple Supporting Images)</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Symptoms, affected area, water source, sanitation</span>
                </label>

                <div class="photo-upload-dropzone" id="report-photo-dropzone" onclick="document.getElementById('report-file-input').click()">
                  <input type="file" id="report-file-input" multiple accept="image/*" style="display: none;">
                  <div style="font-size: 1.75rem; margin-bottom: 0.35rem;">📸</div>
                  <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.2rem;">Click or Drag Photos Here to Upload</div>
                  <div style="font-size: 0.775rem; color: var(--text-muted);">Supports multiple JPG, PNG, WEBP (Max 5MB each)</div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.6rem; font-size: 0.75rem;">
                  <span style="color: var(--text-muted); font-weight: 700;">Quick Sample Evidence:</span>
                  <button type="button" class="btn btn-sm btn-secondary" onclick="window.SehatApp.addSamplePhoto('https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80', 'Water Contamination Evidence')">
                    🚰 Water Discoloration
                  </button>
                  <button type="button" class="btn btn-sm btn-secondary" onclick="window.SehatApp.addSamplePhoto('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80', 'Prescription Evidence')">
                    📋 Prescription Slip
                  </button>
                </div>

                <div class="photo-preview-grid" id="report-photo-previews"></div>
              </div>

              <button type="submit" class="btn btn-primary btn-block" style="padding: 0.85rem; font-weight: 800; margin-top: 1rem;">
                Submit Health Report with Photos →
              </button>
            </form>
          </div>
        </div>
      `;
    }

    // --- TAB 6: MY MEDICAL RECORDS HUB (4 CATEGORIES) ---
    if (tab === 'records') {
      const filteredRecords = this.selectedRecordFilter === 'all'
        ? records
        : records.filter(r => r.type === this.selectedRecordFilter);

      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>📋 My Medical Records Hub</h2>
              <p>Store, manage, and view your diagnostic test reports, clinical consultation summaries, medicine prescriptions, and past consultations.</p>
            </div>
            <button class="btn btn-primary" onclick="window.SehatApp.openAddRecordModal()">
              + Upload New Record
            </button>
          </div>

          <div class="records-filter-bar">
            <div class="records-filter-tab ${this.selectedRecordFilter === 'all' ? 'active' : ''}" onclick="window.SehatApp.filterRecords('all')">
              📑 All Records (${records.length})
            </div>
            <div class="records-filter-tab ${this.selectedRecordFilter === 'test_report' ? 'active' : ''}" onclick="window.SehatApp.filterRecords('test_report')">
              🧪 Test Reports (${records.filter(r => r.type === 'test_report').length})
            </div>
            <div class="records-filter-tab ${this.selectedRecordFilter === 'doctor_analysis' ? 'active' : ''}" onclick="window.SehatApp.filterRecords('doctor_analysis')">
              👨‍⚕️ Doctor Analysis (${records.filter(r => r.type === 'doctor_analysis').length})
            </div>
            <div class="records-filter-tab ${this.selectedRecordFilter === 'prescription' ? 'active' : ''}" onclick="window.SehatApp.filterRecords('prescription')">
              💊 Medicine Prescriptions (${records.filter(r => r.type === 'prescription').length})
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
            ${filteredRecords.length === 0 ? `
              <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
                <h3>No Medical Records Uploaded Yet</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem;">Click '+ Add Medical Record' to securely upload your lab test report, prescription, or clinical assessment.</p>
                <button class="btn btn-primary" style="margin-top: 0.5rem;" onclick="window.SehatApp.openAddRecordModal()">+ Add First Record</button>
              </div>
            ` : filteredRecords.map(r => `
              <div class="medical-record-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <span class="badge ${r.type === 'test_report' ? 'badge-blue' : r.type === 'doctor_analysis' ? 'badge-purple' : 'badge-normal'}">
                    ${r.category || (r.type === 'test_report' ? '🧪 Test Report' : r.type === 'doctor_analysis' ? '👨‍⚕️ Doctor Analysis' : '💊 Prescription')}
                  </span>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${r.date}</span>
                </div>

                <div>
                  <h4 style="font-size: 1.05rem; margin-bottom: 0.25rem;">${r.title}</h4>
                  <div style="font-size: 0.8rem; color: var(--primary-700); font-weight: 600;">
                    🏥 ${r.provider || 'UCHC Community Hospital'}
                  </div>
                </div>

                <div style="background: var(--bg-surface-subtle); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.825rem; line-height: 1.5; white-space: pre-line; color: var(--text-main);">
                  ${r.details}
                </div>

                ${r.photoUrl ? `
                  <div class="record-attachment-box">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                      <img src="${r.photoUrl}" class="record-attachment-img" alt="Attachment">
                      <div style="font-size: 0.775rem;">
                        <strong>${r.attachmentName || 'Attached Document'}</strong>
                        <div style="color: var(--text-muted);">Photo / Document Evidence</div>
                      </div>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="window.SehatApp.openPhotoPreviewModal('${r.photoUrl}', '${r.title}')">
                      🔍 View
                    </button>
                  </div>
                ` : ''}

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; margin-top: auto;">
                  <button class="btn btn-sm btn-secondary" onclick="window.SehatApp.openEditRecordModal('${r.id}')">
                    ✏️ Edit
                  </button>
                  <button class="btn btn-sm btn-outline" style="color: var(--risk-high-border);" onclick="window.SehatApp.deleteRecord('${r.id}')">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- TAB 7: TIMELINE VIEW ---
    if (tab === 'timeline') {
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>⏱️ Health Timeline</h2>
              <p>Chronological record of reported symptoms, attached evidence photos, and doctor consultations.</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.SehatRouter.navigate('/citizen/report-health-issue')">+ Report Health Issue</button>
          </div>

          <div class="card">
            ${timeline.length === 0 ? `
              <div style="text-align: center; padding: 2.5rem 1rem;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">⏱️</div>
                <h3>Your Health Timeline is Fresh & Active</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 480px; margin: 0.5rem auto 1rem;">When you file symptom reports or consult with doctors, your clinical events will be chronologically tracked here.</p>
                <button class="btn btn-primary" onclick="window.SehatRouter.navigate('/citizen/report-health-issue')">📝 Report First Health Concern</button>
              </div>
            ` : `
              <div class="timeline">
                ${timeline.map(item => `
                  <div class="timeline-item">
                    <div class="timeline-dot ${item.type === 'doctor' ? 'doctor' : item.type === 'followup' ? 'followup' : ''}">
                      ${item.type === 'doctor' ? '🩺' : item.type === 'followup' ? '🗓️' : '📝'}
                    </div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <div class="timeline-title">${item.title}</div>
                        <span class="badge ${item.badgeClass}">${item.badgeText}</span>
                      </div>
                      <div class="timeline-date">${item.date}</div>
                      <div class="timeline-body" style="margin-top: 0.35rem;">${item.description}</div>

                      ${Array.isArray(item.photos) && item.photos.length > 0 ? `
                        <div style="margin-top: 0.75rem;">
                          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.35rem;">📷 Attached Visual Evidence:</div>
                          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            ${item.photos.map(p => `
                              <img src="${p}" style="width: 60px; height: 60px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border-medium); cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${p}', 'Timeline Evidence')">
                            `).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    }

    // --- TAB 8: FAMILY HUB ---
    if (tab === 'family') {
      const hasSignals = family.householdSignals && family.householdSignals.length > 0;
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>Family Health Hub</h2>
              <p>Household ID: <strong style="font-family: var(--font-mono);">${family.id}</strong> | ${family.members.length} Members Linked</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.SehatRouter.navigate('/citizen/report-health-issue')">+ Report for Member</button>
          </div>

          ${hasSignals ? `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid var(--accent-amber); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.35rem;">⚠️</span>
              <div style="font-size: 0.85rem;">
                <strong>Household Alert:</strong> ${family.householdSignals[0].text}
              </div>
            </div>
          ` : `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid var(--accent-emerald); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.35rem;">🛡️</span>
              <div style="font-size: 0.85rem;">
                <strong>Household Safe:</strong> No active outbreak signals recorded for your registered address (${family.address}).
              </div>
            </div>
          `}

          <div class="family-grid">
            ${family.members.map(m => `
              <div class="family-card">
                <div class="family-card-head">
                  <div class="family-avatar">${(m.name || 'Member').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <div class="family-member-info">
                    <h4>${m.name}</h4>
                    <span>${m.relation} • ${m.age} yrs</span>
                  </div>
                </div>
                <div style="margin-top: 0.5rem;">
                  <span class="badge badge-${m.riskBadge || 'normal'}"><span class="badge-dot"></span> ${m.status || 'Routine Monitoring'}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: auto; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
                  Last Reported: <strong>${m.lastReportDate || 'Just now'}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- DEFAULT: DASHBOARD OVERVIEW ---
    return `
      <div>
        <div class="citizen-status-banner" style="padding: 1.5rem 1.75rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            ${user.avatarUrl ? `
              <img src="${user.avatarUrl}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.6);">
            ` : ''}
            <div>
              <div class="citizen-greeting">
                <h2>Good Day, ${user.name}</h2>
                <p style="color: var(--primary-100); font-size: 0.9rem;">Citizen ID: <strong>${user.id || 'CIT-10025'}</strong> • Location: <strong>${user.village || user.town || user.ward || user.zone || 'Zone C'}</strong></p>
              </div>
            </div>
          </div>
          <div style="text-align: right; z-index: 1;">
            <div style="font-size: 0.725rem; text-transform: uppercase; color: var(--primary-200); font-weight: 700;">Health Status</div>
            <span class="badge badge-normal" style="background: rgba(255,255,255,0.2); color: #fff; border-color: rgba(255,255,255,0.4); font-size: 0.85rem; padding: 0.35rem 0.85rem;">
              <span class="badge-dot" style="background: #34d399;"></span> ${user.monitoringStatus || 'Routine Monitoring'}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem;">
          <div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
              <div class="card" style="cursor: pointer; border-left: 4px solid var(--accent-emerald);" onclick="window.SehatRouter.navigate('/citizen/report-health-issue')">
                <div style="font-size: 1.4rem; margin-bottom: 0.25rem;">📝</div>
                <h4 style="font-size: 0.9rem; margin-bottom: 0.15rem;">Report Symptoms</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted);">With photos</p>
              </div>

              <div class="card" style="cursor: pointer; border-left: 4px solid var(--accent-blue);" onclick="window.SehatRouter.navigate('/citizen/consultations')">
                <div style="font-size: 1.4rem; margin-bottom: 0.25rem;">🩺</div>
                <h4 style="font-size: 0.9rem; margin-bottom: 0.15rem;">Consultations</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted);">${consultations.length} records</p>
              </div>

              <div class="card" style="cursor: pointer; border-left: 4px solid var(--accent-purple);" onclick="window.SehatRouter.navigate('/citizen/medical-records')">
                <div style="font-size: 1.4rem; margin-bottom: 0.25rem;">📋</div>
                <h4 style="font-size: 0.9rem; margin-bottom: 0.15rem;">Medical Records</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted);">${records.length} stored</p>
              </div>

              <div class="card" style="cursor: pointer; border-left: 4px solid var(--accent-amber);" onclick="window.SehatRouter.navigate('/citizen/referrals')">
                <div style="font-size: 1.4rem; margin-bottom: 0.25rem;">🏥</div>
                <h4 style="font-size: 0.9rem; margin-bottom: 0.15rem;">Referrals</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted);">${referrals.length} active</p>
              </div>
            </div>

            <!-- Recent Timeline -->
            <div class="card">
              <div class="card-header">
                <div class="card-title"><span>🩺</span> Recent Health Activity</div>
                <button class="btn btn-sm btn-outline" onclick="window.SehatRouter.navigate('/citizen/timeline')">Full Timeline →</button>
              </div>
              <div class="timeline" style="padding-left: 1.25rem;">
                ${timeline.length === 0 ? `
                  <div style="padding: 1.5rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    <div>🌿 No recent health issues reported.</div>
                    <div style="font-size: 0.775rem; margin-top: 0.25rem;">Your account is fresh and monitored under routine surveillance.</div>
                  </div>
                ` : timeline.slice(0, 2).map(item => `
                  <div class="timeline-item">
                    <div class="timeline-dot ${item.type === 'doctor' ? 'doctor' : ''}">
                      ${item.type === 'doctor' ? '🩺' : '📝'}
                    </div>
                    <div class="timeline-content" style="padding: 0.6rem 0.75rem;">
                      <div class="timeline-header" style="margin-bottom: 0.15rem;">
                        <div class="timeline-title" style="font-size: 0.85rem;">${item.title}</div>
                        <span style="font-size: 0.725rem; color: var(--text-muted);">${item.date}</span>
                      </div>
                      <div style="font-size: 0.8rem;">${item.description}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="card">
              <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Upcoming Review</h4>
              <div style="display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md);">
                <div style="font-size: 1.6rem;">🗓️</div>
                <div>
                  <div style="font-weight: 800; font-size: 0.95rem;">${user.nextFollowUp || '24 August'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Routine ASHA Health Check</div>
                </div>
              </div>
            </div>

            <div class="card">
              <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">National Health (ABHA)</h4>
              <div class="abha-badge" style="font-size: 0.825rem; text-align: center; margin-bottom: 0.5rem;">
                ${user.abhaId || '14-8921-4320-1092'}
              </div>
              <button class="btn btn-sm btn-secondary btn-block" onclick="window.SehatRouter.navigate('/citizen/profile')">
                View & Edit Profile →
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 3. DOCTOR PORTAL (REGISTER PATIENT, 8-TAB PROFILE, CONSULTATION & PERFORMANCE)
  // =========================================================================
  renderDoctorView(state) {
    const doc = state.currentUser || state.users.doctor;
    const currentPath = window.SehatRouter.currentRoute || '/doctor/dashboard';
    const subView = window.SehatRouter.currentParams?.subView || 'queue';
    const params = window.SehatRouter.currentParams || {};
    const unreadNotifs = (state.notifications || []).filter(n => (n.targetRole === 'doctor' || n.targetRole === 'all') && !n.read).length;

    const avatarMarkup = doc.avatarUrl
      ? `<img src="${doc.avatarUrl}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">`
      : `<div class="portal-user-avatar" style="background: var(--accent-blue);">DR</div>`;

    return `
      <div class="portal-layout">
        <!-- Sidebar -->
        <aside class="portal-sidebar">
          <div class="portal-user-badge" onclick="window.SehatRouter.navigate('/doctor/profile')">
            ${avatarMarkup}
            <div class="portal-user-details">
              <h4>${doc.name}</h4>
              <span>${doc.id} • ${doc.assignedZone || 'Zone C'}</span>
            </div>
          </div>

          <nav class="portal-nav-menu">
            <div class="portal-nav-item ${currentPath === '/doctor/dashboard' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/dashboard')">
              <span>📊</span> Dashboard
            </div>
            <div class="portal-nav-item ${currentPath === '/doctor/patients' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/patients')">
              <span>👥</span> Patients
            </div>
            <div class="portal-nav-item ${currentPath.includes('/doctor/register-patient') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/register-patient')">
              <span>➕</span> Register Patient
            </div>
            <div class="portal-nav-item ${currentPath.includes('/doctor/referrals') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/referrals')">
              <span>🏥</span> Referrals
            </div>
            <div class="portal-nav-item ${currentPath === '/doctor/consultations' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/consultations')">
              <span>🩺</span> Consultations
            </div>
            <div class="portal-nav-item ${currentPath.includes('/doctor/medical-records') || currentPath.includes('/doctor/records') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/medical-records')">
              <span>📋</span> Medical Records
            </div>
            <div class="portal-nav-item ${currentPath === '/doctor/performance' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/performance')">
              <span>📈</span> Performance
            </div>
            <div class="portal-nav-item ${currentPath === '/doctor/reviews' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/reviews')">
              <span>⭐</span> Reviews
            </div>
            <div class="portal-nav-item ${currentPath.includes('/doctor/notifications') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/notifications')">
              <span>🔔</span> Notifications ${unreadNotifs > 0 ? `<span class="badge badge-high" style="font-size: 0.65rem; margin-left: auto;">${unreadNotifs}</span>` : ''}
            </div>
            <div class="portal-nav-item ${currentPath.includes('/doctor/profile') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/doctor/profile')">
              <span>👤</span> Profile
            </div>
            <div class="portal-nav-item" onclick="window.location.href='/auth/logout';" style="color: var(--accent-red); margin-top: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.65rem;">
              <span>🚪</span> Logout
            </div>
          </nav>
        </aside>

        <!-- Main Content -->
        <main class="portal-content">
          ${this.renderDoctorSubViewContent(currentPath, params, state)}
        </main>
      </div>
    `;
  },

  renderDoctorSubViewContent(path, params, state) {
    const doc = state.currentUser || state.users.doctor;

    // --- NOTIFICATIONS SUBVIEW ---
    if (path.includes('/doctor/notifications')) {
      const notifs = window.SehatState.getNotificationsForRole('doctor');
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🔔 Doctor Clinical Notifications</h2>
              <p>Updates on new patient registrations, incoming referrals from ASHA workers, and verified patient reviews.</p>
            </div>
            <button class="btn btn-sm btn-outline" onclick="window.SehatState.markAllNotificationsRead('doctor'); window.SehatUI.showToast('All Read', 'Doctor notifications marked as read.', 'info');">✓ Mark All Read</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 780px;">
            ${notifs.map(n => `
              <div class="card" style="border-left: 4px solid ${n.read ? 'var(--border-medium)' : 'var(--accent-blue)'}; background: ${n.read ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)'};" onclick="window.SehatState.markNotificationRead('${n.id}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
                  <span class="badge ${n.category === 'New Referral' ? 'badge-purple' : 'badge-blue'}">${n.category || 'Clinical Alert'}</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${n.time}</span>
                </div>
                <h4 style="font-size: 1rem; margin-bottom: 0.25rem;">${n.title}</h4>
                <p style="font-size: 0.85rem; color: var(--text-main);">${n.message}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- DOCTOR REFERRALS QUEUE SUBVIEW ---
    if (path.includes('/doctor/referrals')) {
      const referrals = window.SehatState.getReferralsForDoctor(doc.id || 'DR-1004');
      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🏥 Doctor Referrals Queue (From ASHA Workers)</h2>
              <p>Incoming patient referrals submitted by field workers with symptom evidence and urgency tags.</p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 860px;">
            ${referrals.map(ref => `
              <div class="card" style="border-left: 4px solid ${ref.urgency === 'Critical' ? 'var(--risk-high-border)' : 'var(--accent-purple)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                  <div>
                    <span class="badge badge-purple" style="font-family: var(--font-mono);">${ref.id}</span>
                    <h3 style="font-size: 1.2rem; margin-top: 0.35rem;">${ref.citizenName} (${ref.citizenId})</h3>
                    <div style="font-size: 0.825rem; color: var(--text-muted);">
                      Ward: <strong>${ref.citizenWard}</strong> • Age: <strong>${ref.citizenAge}y / ${ref.citizenGender}</strong> • Mobile: <strong>${ref.citizenMobile}</strong>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge ${ref.urgency === 'Critical' ? 'badge-high' : 'badge-watch'}">Urgency: ${ref.urgency}</span>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">${ref.date}</div>
                  </div>
                </div>

                <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.85rem; line-height: 1.5; margin-bottom: 0.75rem;">
                  <strong>ASHA Referral Reason:</strong> ${ref.reason}<br>
                  ${ref.notes ? `<strong>Field Notes:</strong> <em>${ref.notes}</em>` : ''}
                </div>

                ${ref.attachments && ref.attachments.length > 0 ? `
                  <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
                    ${ref.attachments.map(att => `
                      <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${att.url}', '${att.name}')">
                        <img src="${att.url}" class="record-attachment-img">
                        <span style="font-size: 0.75rem;">📷 ${att.name}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.65rem;">
                  <span style="font-size: 0.8rem; color: var(--text-muted);">Referred by: <strong>${ref.ashaName} (${ref.ashaId})</strong></span>
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-secondary" onclick="window.SehatState.updateReferralStatus('${ref.id}', 'Accepted'); window.SehatUI.showToast('Referral Accepted', 'Patient status updated.', 'success'); window.SehatApp.renderCurrentView();">
                      ✓ Accept Referral
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.SehatRouter.navigate('/doctor/consultation/new/${ref.citizenId}')">
                      🩺 Start Clinical Consultation →
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- SUBVIEW 1: REGISTER NEW PATIENT WITH SEARCH & AUTO-FETCH ---
    if (path.includes('/doctor/register-patient')) {
      const patient = this.searchedPatient;

      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>➕ Register New Patient to Consultation Unit</h2>
              <p>Enter a Citizen ID (e.g. CIT-10025, CIT-10034) or Registered Email Address to instantly verify and fetch official health details.</p>
            </div>
          </div>

          <!-- Search Input Card -->
          <div class="card" style="max-width: 680px; margin-bottom: 1.5rem;">
            <form id="doctor-search-patient-form">
              <div class="form-group">
                <label class="form-label">Search Citizen ID or Registered Email *</label>
                <div style="display: flex; gap: 0.65rem;">
                  <input type="text" id="patient-search-query" class="form-control" placeholder="e.g. CIT-10025, C10291, or rahul.sharma@example.com" value="CIT-10025" required>
                  <button type="submit" class="btn btn-primary" style="white-space: nowrap; font-weight: 700;">
                    🔍 Search & Verify
                  </button>
                </div>
                <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.4rem;">
                  Try searching: <code>CIT-10025</code> (Rahul), <code>CIT-10034</code> (Pooja), <code>CIT-10042</code> (Mohd. Imran), <code>CIT-10018</code> (Kamla Devi)
                </div>
              </div>
            </form>

            ${this.patientSearchError ? `
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--risk-high-border); border-radius: var(--radius-md); padding: 0.85rem; color: var(--risk-high-border); font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem;">
                <span>⚠️</span>
                <span>${this.patientSearchError}</span>
              </div>
            ` : ''}
          </div>

          <!-- Auto-Fetched Patient Preview Card -->
          ${patient ? `
            <div class="card" style="max-width: 680px; border-top: 4px solid var(--accent-emerald);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
                <div style="display: flex; items-center; gap: 1rem;">
                  ${patient.avatarUrl ? `
                    <img src="${patient.avatarUrl}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-emerald);">
                  ` : `
                    <div class="profile-avatar-xl" style="width: 64px; height: 64px; font-size: 1.5rem; background: var(--accent-emerald);">
                      ${patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  `}
                  <div>
                    <h3 style="font-size: 1.3rem; margin-bottom: 0.2rem;">${patient.name}</h3>
                    <div style="font-size: 0.825rem; color: var(--text-muted); font-family: var(--font-mono);">
                      Citizen ID: <strong>${patient.id || 'CIT-10025'}</strong> • ABHA: <strong>${patient.abhaId || '14-8921-4320-1092'}</strong>
                    </div>
                    <div style="margin-top: 0.35rem;">
                      <span class="badge badge-normal"><span class="badge-dot"></span> ${patient.monitoringStatus || 'Routine Monitoring'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <span class="badge badge-blue">✓ Verified Citizen</span>
                </div>
              </div>

              <!-- Auto-Fetched Demographics Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-surface-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 1.25rem;">
                <div><span style="color: var(--text-muted);">Registered Email:</span> <strong>${patient.email}</strong></div>
                <div><span style="color: var(--text-muted);">Mobile Number:</span> <strong>${patient.mobile}</strong></div>
                <div><span style="color: var(--text-muted);">Age & Date of Birth:</span> <strong>${patient.age} yrs (${patient.dob || '14 Aug 1994'})</strong></div>
                <div><span style="color: var(--text-muted);">Gender:</span> <strong>${patient.gender || 'Male'}</strong></div>
                <div><span style="color: var(--text-muted);">Surveillance Ward:</span> <strong>${patient.zone || 'Zone C'}</strong></div>
                <div><span style="color: var(--text-muted);">Household Family ID:</span> <strong>${patient.familyId || 'FAM-10284'}</strong></div>
                <div style="grid-column: 1 / -1;"><span style="color: var(--text-muted);">Residential Address:</span> <strong>${patient.address || 'House #42, Sector 9, Zone C'}</strong></div>
              </div>

              <div style="display: flex; gap: 0.75rem;">
                <button class="btn btn-primary btn-block" onclick="window.SehatApp.confirmRegisterPatient('${patient.id}')">
                  ✓ Confirm & Add to Active Patient List
                </button>
                <button class="btn btn-secondary" onclick="window.SehatRouter.navigate('/doctor/consultation/new/${patient.id}')">
                  🩺 Start Instant Consultation
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    // --- SUBVIEW 2: AUTHORIZED 8-TAB PATIENT PROFILE ---
    if (path.startsWith('/doctor/patients/')) {
      const citizenId = params.citizenId || path.split('/doctor/patients/')[1].split('/')[0];
      const citizen = state.userAccounts.find(u => u.id === citizenId || u.citizenId === citizenId || (citizenId === 'CIT-10025' && u.id === 'C10291')) || state.users.citizen;
      const history = window.SehatState.getPatientHistory(citizenId);
      const activeTab = this.activePatientTab || 'overview';

      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>👤 Patient Dossier: ${citizen.name} (${citizen.id || citizenId})</h2>
              <p>Authorized Clinical Dossier & Complete Medical Records History</p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-outline" onclick="window.SehatRouter.navigate('/doctor/patients')">← Back to Queue</button>
              <button class="btn btn-primary" onclick="window.SehatRouter.navigate('/doctor/consultation/new/${citizen.id || citizenId}')">
                🩺 Start New Consultation
              </button>
            </div>
          </div>

          <!-- Patient Header Card -->
          <div class="card" style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                ${citizen.avatarUrl ? `
                  <img src="${citizen.avatarUrl}" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-blue);">
                ` : `
                  <div class="profile-avatar-xl" style="width: 68px; height: 68px; font-size: 1.6rem; background: var(--accent-blue);">
                    ${citizen.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                `}
                <div>
                  <h2 style="font-size: 1.35rem; margin-bottom: 0.2rem;">${citizen.name}</h2>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">
                    Citizen ID: <strong>${citizen.id || citizenId}</strong> • ABHA: <strong>${citizen.abhaId || '14-8921-4320-1092'}</strong> • Ward: <strong>${citizen.zone || 'Zone C'}</strong>
                  </div>
                  <div style="margin-top: 0.35rem; display: flex; gap: 0.4rem;">
                    <span class="badge badge-normal">${citizen.monitoringStatus || 'Routine Monitoring'}</span>
                    <span class="badge badge-blue">Family: ${citizen.familyId || 'FAM-10284'}</span>
                  </div>
                </div>
              </div>

              <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
                <div>Email: <strong>${citizen.email}</strong></div>
                <div>Mobile: <strong>${citizen.mobile}</strong></div>
                <div>Age/Gender: <strong>${citizen.age} yrs / ${citizen.gender}</strong></div>
              </div>
            </div>
          </div>

          <!-- 8 Patient Dossier Tabs -->
          <div class="records-filter-bar" style="margin-bottom: 1rem;">
            <div class="records-filter-tab ${activeTab === 'overview' ? 'active' : ''}" onclick="window.SehatApp.activePatientTab='overview'; window.SehatApp.renderCurrentView();">
              📌 Overview
            </div>
            <div class="records-filter-tab ${activeTab === 'reports' ? 'active' : ''}" onclick="window.SehatApp.activePatientTab='reports'; window.SehatApp.renderCurrentView();">
              📝 Health Reports
            </div>
            <div class="records-filter-tab ${activeTab === 'tests' ? 'active' : ''}" onclick="window.SehatApp.activePatientTab='tests'; window.SehatApp.renderCurrentView();">
              🧪 Test Reports
            </div>
            <div class="records-filter-tab ${activeTab === 'consultations' ? 'active' : ''}" onclick="window.SehatApp.activePatientTab='consultations'; window.SehatApp.renderCurrentView();">
              🩺 Consultations
            </div>
            <div class="records-filter-tab ${activeTab === 'prescriptions' ? 'active' : ''}" onclick="window.SehatApp.activePatientTab='prescriptions'; window.SehatApp.renderCurrentView();">
              💊 Prescriptions
            </div>
            <div class="records-filter-tab ${activeTab === 'referrals' ? 'active' : ''}" onclick="window.SehatApp.activePatientTab='referrals'; window.SehatApp.renderCurrentView();">
              🏥 Referrals
            </div>
            <div class="records-filter-tab ${activeTab === 'followups' ? 'active' : ''}" onclick="window.SehatApp.activePatientTab='followups'; window.SehatApp.renderCurrentView();">
              🔄 Follow-ups
            </div>
          </div>

          <!-- Tab Content Renderer -->
          <div class="card">
            ${this.renderPatientTabContent(activeTab, citizen, history)}
          </div>
        </div>
      `;
    }

    // --- SUBVIEW 3: DETAILED CONSULTATION FORM WITH PHOTO/PDF/VIDEO ATTACHMENTS ---
    if (path.startsWith('/doctor/consultation/new/')) {
      const citizenId = params.citizenId || path.split('/doctor/consultation/new/')[1];
      const citizen = state.userAccounts.find(u => u.id === citizenId || (citizenId === 'CIT-10025' && u.id === 'C10291')) || state.users.citizen;

      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🩺 Clinical Consultation: ${citizen.name}</h2>
              <p>Citizen ID: <strong style="font-family: var(--font-mono);">${citizen.id || citizenId}</strong> • Ward: <strong>${citizen.zone || 'Zone C'}</strong> • Age: <strong>${citizen.age} yrs (${citizen.gender})</strong></p>
            </div>
            <button class="btn btn-outline" onclick="window.SehatRouter.navigate('/doctor/patients/${citizen.id || citizenId}')">← View Patient Dossier</button>
          </div>

          <div class="card" style="max-width: 880px;">
            <form id="doctor-full-consultation-form">
              <input type="hidden" id="consult-citizen-id" value="${citizen.id || citizenId}">

              <!-- Section 1: Chief Complaint & Symptoms -->
              <h4 style="font-size: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                1. Chief Complaint & Symptom Presentation
              </h4>

              <div class="form-group">
                <label class="form-label">Chief Complaint *</label>
                <input type="text" id="consult-complaint" class="form-control" placeholder="e.g. Acute watery diarrhea and mild fever after drinking tap water..." value="Acute watery diarrhea and fever" required>
              </div>

              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Identified Symptoms (Comma-separated) *</label>
                  <input type="text" id="consult-symptoms" class="form-control" value="Fever, Diarrhea, Abdominal Cramps, Nausea" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Symptom Duration *</label>
                  <input type="text" id="consult-duration" class="form-control" value="2 Days" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Previous Medical History / Allergies</label>
                <input type="text" id="consult-medhistory" class="form-control" placeholder="e.g. No known drug allergies, hypertension..." value="No prior chronic conditions. Localized tap water contamination reported in Sector 9.">
              </div>

              <!-- Section 2: Clinical Vitals & Observations -->
              <h4 style="font-size: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; margin: 1.5rem 0 1rem;">
                2. Examination Findings & Vitals
              </h4>

              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Blood Pressure</label>
                  <input type="text" id="vital-bp" class="form-control" value="120/80 mmHg">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Pulse Rate</label>
                  <input type="text" id="vital-pulse" class="form-control" value="78 bpm">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Temperature</label>
                  <input type="text" id="vital-temp" class="form-control" value="100.4 °F">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Oxygen (SpO2)</label>
                  <input type="text" id="vital-spo2" class="form-control" value="98%">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Doctor Examination Observations *</label>
                <textarea id="consult-observations" class="form-control" rows="2" required placeholder="Physical examination notes, tenderness, signs of dehydration...">Mild dehydration signs (dry oral mucosa). Epigastric tenderness present. No peritoneal signs.</textarea>
              </div>

              <!-- Section 3: Diagnosis & Tests -->
              <h4 style="font-size: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; margin: 1.5rem 0 1rem;">
                3. Clinical Diagnosis & Investigation
              </h4>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Clinical Diagnosis *</label>
                  <input type="text" id="consult-diagnosis" class="form-control" value="Acute Gastroenteritis with Moderate Febrile Response" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Recommended Lab / Diagnostic Tests</label>
                  <input type="text" id="consult-tests" class="form-control" value="Complete Blood Count (CBC), Widal Panel, Stool Routine">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Clinical Epidemiological Analysis</label>
                <input type="text" id="consult-analysis" class="form-control" value="Acute gastrointestinal cluster symptom manifestation consistent with waterborne microbial contamination.">
              </div>

              <!-- Section 4: Prescriptions -->
              <h4 style="font-size: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; margin: 1.5rem 0 1rem;">
                4. Medicine Prescription & Care Instructions
              </h4>

              <div id="consult-medicines-container" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 0.5rem; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">
                  <span>Medicine Name</span>
                  <span>Dosage</span>
                  <span>Instructions</span>
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 0.5rem;">
                  <input type="text" class="form-control med-name" value="Oral Rehydration Salts (ORS)">
                  <input type="text" class="form-control med-dosage" value="1 Sachet in 1L Water">
                  <input type="text" class="form-control med-instruction" value="Drink throughout the day after each episode">
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 0.5rem;">
                  <input type="text" class="form-control med-name" value="Tab Paracetamol 650mg">
                  <input type="text" class="form-control med-dosage" value="1 Tab SOS">
                  <input type="text" class="form-control med-instruction" value="Take if fever > 100°F (Max 3/day)">
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 0.5rem;">
                  <input type="text" class="form-control med-name" value="Cap Sporlac (Probiotic)">
                  <input type="text" class="form-control med-dosage" value="1 Cap BD">
                  <input type="text" class="form-control med-instruction" value="Take with food for 3 days">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Follow-up Date *</label>
                  <input type="text" id="consult-followup" class="form-control" value="24 August 2026" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Case Outcome Classification *</label>
                  <select id="consult-outcome" class="form-control" required>
                    <option value="Improved" selected>🟢 Improved (Responding well to therapy)</option>
                    <option value="Resolved">✅ Resolved (Complete clinical recovery)</option>
                    <option value="Follow-up Required">🟡 Follow-up Required (Needs second evaluation)</option>
                    <option value="Referred">🔵 Referred (Referred to tertiary hospital)</option>
                    <option value="Ongoing">⚪ Ongoing (Under active observation)</option>
                  </select>
                </div>
              </div>

              <!-- Section 5: Photo / PDF / Video Attachments -->
              <h4 style="font-size: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; margin: 1.5rem 0 1rem;">
                5. Consultation Attachments (Photos, PDFs & Videos)
              </h4>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.25rem;">
                <!-- 📷 Photos -->
                <div class="photo-upload-dropzone" onclick="document.getElementById('consult-photo-input').click()">
                  <input type="file" id="consult-photo-input" multiple accept="image/*" style="display: none;">
                  <div style="font-size: 1.4rem;">📷</div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Upload Photos</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">Multiple JPG / PNG</div>
                </div>

                <!-- 📄 PDFs -->
                <div class="photo-upload-dropzone" onclick="document.getElementById('consult-pdf-input').click()">
                  <input type="file" id="consult-pdf-input" multiple accept=".pdf" style="display: none;">
                  <div style="font-size: 1.4rem;">📄</div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Upload PDFs</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">Lab Reports / Documents</div>
                </div>

                <!-- 🎥 Videos -->
                <div class="photo-upload-dropzone" onclick="document.getElementById('consult-video-input').click()">
                  <input type="file" id="consult-video-input" multiple accept="video/*" style="display: none;">
                  <div style="font-size: 1.4rem;">🎥</div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Upload Video</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">Tele-consultation / Medical clips</div>
                </div>
              </div>

              <!-- Quick Demo Attachments Preset -->
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.75rem;">
                <span style="color: var(--text-muted); font-weight: 700;">Preset Attachments:</span>
                <button type="button" class="btn btn-sm btn-secondary" onclick="window.SehatApp.attachSampleConsultationPhoto()">📷 Add Clinical Photo</button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="window.SehatApp.attachSampleConsultationPdf()">📄 Add Lab PDF</button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="window.SehatApp.attachSampleConsultationVideo()">🎥 Add Video Clip</button>
              </div>

              <!-- Live Attachments Preview Container -->
              <div id="consult-attachments-preview" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;"></div>

              <button type="submit" class="btn btn-primary btn-block" style="padding: 0.85rem; font-weight: 800;">
                💾 Save Consultation, Sync Timeline & Update Records →
              </button>
            </form>
          </div>
        </div>
      `;
    }

    // --- SUBVIEW 4: DOCTOR PERFORMANCE, RATINGS & CASE SUCCESS ANALYTICS ---
    if (path.includes('/doctor/performance') || path.includes('/doctor/reviews')) {
      const perf = window.SehatState.getDoctorPerformance(doc.id || 'DR-1004');

      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>⭐ Doctor Performance & Case Success Analytics</h2>
              <p>${doc.name} (${doc.id || 'DR-1004'}) — Clinical Outcomes & Patient Ratings</p>
            </div>
          </div>

          <!-- Key Performance Cards Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <!-- Rating -->
            <div class="stat-card" style="border-top: 4px solid var(--accent-amber);">
              <div class="stat-label">Average Patient Rating</div>
              <div class="stat-value" style="color: var(--accent-amber); display: flex; align-items: baseline; gap: 0.35rem;">
                <span>⭐ ${perf.rating}</span>
                <span style="font-size: 0.85rem; color: var(--text-muted);">/ 5.0</span>
              </div>
              <div class="stat-meta">${perf.totalReviews} verified patient reviews</div>
            </div>

            <!-- Case Success Rate % -->
            <div class="stat-card" style="border-top: 4px solid var(--accent-emerald);">
              <div class="stat-label">Case Success Rate</div>
              <div class="stat-value" style="color: var(--accent-emerald);">${perf.caseSuccessRate}%</div>
              <div class="stat-meta">${perf.successfulCases} of ${perf.totalConsultations} cases improved/resolved</div>
            </div>

            <!-- Total Consultations -->
            <div class="stat-card" style="border-top: 4px solid var(--accent-blue);">
              <div class="stat-label">Total Consultations</div>
              <div class="stat-value" style="color: var(--accent-blue);">${perf.totalConsultations}</div>
              <div class="stat-meta">Completed clinical assessments</div>
            </div>

            <!-- Follow-ups -->
            <div class="stat-card" style="border-top: 4px solid var(--accent-purple);">
              <div class="stat-label">Follow-ups Completed</div>
              <div class="stat-value" style="color: var(--accent-purple);">${perf.followupsCompleted}</div>
              <div class="stat-meta">Scheduled recovery checks</div>
            </div>
          </div>

          <!-- Detailed Breakdown & Reviews List Grid -->
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.25rem;">
            <!-- Outcome Breakdown Card -->
            <div class="card">
              <div class="card-header">
                <div class="card-title"><span>📊</span> Outcome Breakdown</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span>✅ Resolved Cases:</span>
                  <strong>${perf.resolvedCases}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>🟢 Improved Cases:</span>
                  <strong>${perf.improvedCases}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>🔄 Active Follow-ups:</span>
                  <strong>${perf.followupsCompleted}</strong>
                </div>
                <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; display: flex; justify-content: space-between; font-weight: 800;">
                  <span>Total Monitored Patients:</span>
                  <span>${perf.totalPatients}</span>
                </div>
              </div>
            </div>

            <!-- Patient Reviews Stream -->
            <div class="card">
              <div class="card-header">
                <div class="card-title"><span>💬</span> Patient Reviews & Feedback</div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                ${perf.reviews.length === 0 ? `
                  <div style="color: var(--text-muted); font-size: 0.85rem;">No reviews submitted yet.</div>
                ` : perf.reviews.map(r => `
                  <div style="background: var(--bg-surface-subtle); border-radius: var(--radius-md); padding: 0.85rem; border-left: 3px solid var(--accent-amber);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                      <div style="font-weight: 700; font-size: 0.85rem;">${r.citizenName}</div>
                      <div style="color: var(--accent-amber); font-size: 0.95rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                    </div>
                    <div style="font-size: 0.825rem; line-height: 1.4; color: var(--text-main); margin-bottom: 0.35rem;">
                      "${r.feedback}"
                    </div>
                    <div style="font-size: 0.725rem; color: var(--text-muted); text-align: right;">
                      ${r.date} • Verified Consultation
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // --- SUBVIEW 5: CONSULTATIONS LIST ---
    if (path === '/doctor/consultations') {
      const consultations = state.consultations || [];

      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>🩺 Clinical Consultations Log</h2>
              <p>All recorded patient consultations with prescriptions, attachments, and outcome ratings.</p>
            </div>
            <button class="btn btn-primary" onclick="window.SehatRouter.navigate('/doctor/register-patient')">
              + New Consultation
            </button>
          </div>

          <div class="card">
            <table class="patient-table">
              <thead>
                <tr>
                  <th>Consultation ID</th>
                  <th>Patient Name</th>
                  <th>Diagnosis</th>
                  <th>Date</th>
                  <th>Case Outcome</th>
                  <th>Attachments</th>
                  <th>Rating</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${consultations.map(c => `
                  <tr>
                    <td style="font-family: var(--font-mono); font-weight: 700;">${c.id}</td>
                    <td><strong>${c.patientName}</strong> (${c.citizenId})</td>
                    <td>${c.diagnosis}</td>
                    <td style="font-size: 0.775rem;">${c.date}</td>
                    <td>
                      <span class="badge ${c.outcome === 'Resolved' ? 'badge-normal' : c.outcome === 'Improved' ? 'badge-blue' : 'badge-watch'}">
                        ${c.outcome}
                      </span>
                    </td>
                    <td>
                      ${(c.attachments?.photos?.length || 0) + (c.attachments?.pdfs?.length || 0) + (c.attachments?.videos?.length || 0)} files
                    </td>
                    <td>
                      ${c.rating ? `<span style="color: var(--accent-amber); font-weight: 700;">⭐ ${c.rating.stars}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">Pending</span>`}
                    </td>
                    <td>
                      <button class="btn btn-sm btn-primary" onclick="window.SehatRouter.navigate('/doctor/consultations/${c.id}')">
                        View Dossier →
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // --- SUBVIEW 6: CONSULTATION DETAIL ---
    if (path.startsWith('/doctor/consultations/')) {
      const consId = params.id || path.split('/doctor/consultations/')[1];
      const consultation = (state.consultations || []).find(c => c.id === consId) || state.consultations[0];

      return `
        <div>
          <div class="portal-header-bar">
            <div>
              <h2>📋 Consultation Record: ${consultation.id}</h2>
              <p>Patient: <strong>${consultation.patientName} (${consultation.citizenId})</strong> • Date: <strong>${consultation.date}</strong></p>
            </div>
            <button class="btn btn-outline" onclick="window.SehatRouter.navigate('/doctor/consultations')">← Back to Consultations</button>
          </div>

          <div class="card" style="max-width: 780px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; margin-bottom: 1rem;">
              <div>
                <h3 style="font-size: 1.25rem;">${consultation.diagnosis}</h3>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Doctor: ${consultation.doctorName} • ${consultation.facility}</div>
              </div>
              <span class="badge ${consultation.outcome === 'Resolved' ? 'badge-normal' : 'badge-watch'}">
                ● Outcome: ${consultation.outcome}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 1rem;">
              <div><span style="color: var(--text-muted);">BP:</span> <strong>${consultation.vitals?.bp || '120/80'}</strong></div>
              <div><span style="color: var(--text-muted);">Pulse:</span> <strong>${consultation.vitals?.pulse || '76 bpm'}</strong></div>
              <div><span style="color: var(--text-muted);">Temp:</span> <strong>${consultation.vitals?.temp || '98.6 °F'}</strong></div>
              <div><span style="color: var(--text-muted);">SpO2:</span> <strong>${consultation.vitals?.spo2 || '99%'}</strong></div>
            </div>

            <div style="font-size: 0.85rem; margin-bottom: 1rem; line-height: 1.5;">
              <strong>Chief Complaint:</strong> ${consultation.chiefComplaint}<br>
              <strong>Analysis:</strong> ${consultation.analysis}<br>
              <strong>Observations:</strong> ${consultation.observations}
            </div>

            ${consultation.medicines && consultation.medicines.length > 0 ? `
              <div style="margin-bottom: 1rem;">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem;">💊 Prescribed Medications:</h4>
                <table class="patient-table" style="font-size: 0.8rem;">
                  <thead>
                    <tr><th>Medicine</th><th>Dosage</th><th>Instructions</th></tr>
                  </thead>
                  <tbody>
                    ${consultation.medicines.map(m => `
                      <tr><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.instruction}</td></tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Attachments -->
            ${(consultation.attachments && ((consultation.attachments.photos?.length || 0) + (consultation.attachments.pdfs?.length || 0) + (consultation.attachments.videos?.length || 0)) > 0) ? `
              <div style="background: var(--bg-surface-subtle); border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 1rem;">
                <div style="font-weight: 700; font-size: 0.8rem; margin-bottom: 0.4rem;">📎 Attached Files:</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  ${(consultation.attachments.photos || []).map(p => `
                    <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${p.url}', '${p.name}')">
                      <img src="${p.url}" class="record-attachment-img">
                      <span style="font-size: 0.75rem;">📷 ${p.name}</span>
                    </div>
                  `).join('')}
                  ${(consultation.attachments.pdfs || []).map(d => `
                    <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${d.url}', '${d.name}')">
                      <span>📄</span> <span style="font-size: 0.75rem;"><strong>${d.name}</strong></span>
                    </div>
                  `).join('')}
                  ${(consultation.attachments.videos || []).map(v => `
                    <div class="record-attachment-box" style="cursor: pointer;" onclick="window.SehatApp.openVideoModal('${v.url}', '${v.name}')">
                      <span>🎥</span> <span style="font-size: 0.75rem;"><strong>${v.name}</strong></span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // --- DEFAULT SUBVIEW: PATIENT QUEUE ---
    const doctorPatients = window.SehatState.getPatientsForDoctor ? window.SehatState.getPatientsForDoctor(doc.id) : (doc.id === 'DR-1004' ? state.doctorPatients : []);

    return `
      <div>
        <div class="portal-header-bar">
          <div>
            <h2>Doctor Consultation Portal</h2>
            <p>${doc.facility || 'Urban Community Health Centre (UCHC-4)'} — Patient Intake & Clinical Records</p>
          </div>
          <button class="btn btn-primary" onclick="window.SehatRouter.navigate('/doctor/register-patient')">
            ➕ Register New Patient
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="stat-card stat-doctor">
              <div class="stat-label">Active Queue</div>
              <div class="stat-value">${doctorPatients.length}</div>
              <div class="stat-meta">Patients in consultation unit</div>
            </div>
            <div class="stat-card stat-watch">
              <div class="stat-label">Pending Reviews</div>
              <div class="stat-value" style="color: var(--risk-watch-border);">${doctorPatients.filter(p => p.status === 'Pending Review').length}</div>
              <div class="stat-meta">Awaiting clinical assessment</div>
            </div>
            <div class="stat-card stat-doctor">
              <div class="stat-label">Success Rate</div>
              <div class="stat-value" style="color: var(--accent-emerald);">${doctorPatients.length > 0 ? '85.9%' : '100%'}</div>
              <div class="stat-meta">Outcome-driven resolved cases</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-title"><span>📋</span> Active Patient Intake Queue</div>
            </div>

            ${doctorPatients.length === 0 ? `
              <div style="text-align: center; padding: 3rem 1rem;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">👥</div>
                <h3>No Patients in Consultation Queue Yet</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 480px; margin: 0.5rem auto 1rem;">
                  Your clinical intake queue is fresh. When patients are referred by field ASHA workers or registered at your health center, they will appear here.
                </p>
                <button class="btn btn-primary" onclick="window.SehatRouter.navigate('/doctor/register-patient')">➕ Search or Register Patient</button>
              </div>
            ` : `
              <table class="patient-table">
                <thead>
                  <tr>
                    <th>Citizen ID</th>
                    <th>Patient Name</th>
                    <th>Family ID</th>
                    <th>Recent Symptoms</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${doctorPatients.map(p => `
                    <tr class="patient-row" onclick="window.SehatRouter.navigate('/doctor/patients/${p.id}')">
                      <td style="font-family: var(--font-mono); font-weight: 700;">${p.id}</td>
                      <td><strong>${p.name}</strong> (${p.age}y/${p.gender})</td>
                      <td style="font-family: var(--font-mono);">${p.familyId}</td>
                      <td>${(p.recentSymptoms || []).join(', ')}</td>
                      <td>
                        <span class="badge ${p.severity === 'Severe' ? 'badge-high' : p.severity === 'Moderate' ? 'badge-watch' : 'badge-normal'}">
                          ${p.severity}
                        </span>
                      </td>
                      <td>
                        <span class="badge ${p.status === 'Reviewed' ? 'badge-normal' : 'badge-watch'}">
                          ${p.status}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.SehatRouter.navigate('/doctor/consultation/new/${p.id}')">
                          Consult →
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;
  },

  renderPatientTabContent(tab, citizen, history) {
    if (tab === 'reports') {
      return `
        <div>
          <h4 style="margin-bottom: 0.75rem;">📝 Citizen Symptom Reports</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${history.timeline.filter(t => t.type === 'report').length === 0 ? `
              <p style="color: var(--text-muted);">No citizen symptom reports recorded.</p>
            ` : history.timeline.filter(t => t.type === 'report').map(t => `
              <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                  <strong>${t.title}</strong>
                  <span style="color: var(--text-muted); font-size: 0.75rem;">${t.date}</span>
                </div>
                <div style="font-size: 0.85rem; margin-bottom: 0.4rem;">${t.description}</div>
                ${t.photos && t.photos.length > 0 ? `
                  <div style="display: flex; gap: 0.5rem;">
                    ${t.photos.map(p => `
                      <img src="${p}" style="width: 54px; height: 54px; border-radius: 4px; object-fit: cover; cursor: pointer;" onclick="window.SehatApp.openPhotoPreviewModal('${p}', 'Symptom Evidence')">
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'tests') {
      return `
        <div>
          <h4 style="margin-bottom: 0.75rem;">🧪 Diagnostic Lab Test Reports</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${history.medicalRecords.filter(r => r.type === 'test_report').map(r => `
              <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${r.title}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${r.date}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--primary-700);">${r.provider}</div>
                <div style="font-size: 0.85rem; margin-top: 0.35rem;">${r.details}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'consultations') {
      return `
        <div>
          <h4 style="margin-bottom: 0.75rem;">🩺 Past Consultations Log</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${history.consultations.map(c => `
              <div style="border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${c.diagnosis}</strong>
                  <span class="badge ${c.outcome === 'Resolved' ? 'badge-normal' : 'badge-watch'}">${c.outcome}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">By ${c.doctorName} • ${c.date}</div>
                <div style="font-size: 0.85rem;">${c.analysis}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'prescriptions') {
      return `
        <div>
          <h4 style="margin-bottom: 0.75rem;">💊 Active & Past Prescriptions</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${history.medicalRecords.filter(r => r.type === 'prescription').map(r => `
              <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${r.title}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${r.date}</span>
                </div>
                <div style="font-size: 0.85rem; margin-top: 0.35rem;">${r.details}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'referrals') {
      const refs = window.SehatState.getReferralsForCitizen(citizen.id || 'CIT-10025');
      return `
        <div>
          <h4 style="margin-bottom: 0.75rem;">🏥 ASHA Worker Doctor Referrals</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${refs.map(ref => `
              <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between;">
                  <strong>Referral: ${ref.reason}</strong>
                  <span class="badge badge-purple">${ref.status}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Referred by ${ref.ashaName} (${ref.ashaId}) on ${ref.date}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'followups') {
      return `
        <div>
          <h4 style="margin-bottom: 0.75rem;">🔄 Scheduled Health Follow-ups</h4>
          <div style="background: var(--bg-surface-subtle); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 1rem;">
            <div style="font-size: 1.8rem;">🗓️</div>
            <div>
              <div style="font-weight: 800; font-size: 1rem;">Next Recovery Check: ${citizen.nextFollowUp || '24 August'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Assigned to ASHA Sunita Devi (ASHA-204)</div>
            </div>
          </div>
        </div>
      `;
    }

    // DEFAULT: OVERVIEW TAB
    return `
      <div>
        <h4 style="margin-bottom: 0.75rem;">📌 Patient Clinical Overview</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
          <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-weight: 700; margin-bottom: 0.35rem;">Clinical Status:</div>
            <div>Monitoring Status: <strong>${citizen.monitoringStatus || 'Routine Monitoring'}</strong></div>
            <div>Surveillance Ward: <strong>${citizen.zone || 'Zone C'}</strong></div>
            <div>Household Family: <strong>${citizen.familyId || 'FAM-10284'}</strong></div>
          </div>

          <div style="background: var(--bg-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-weight: 700; margin-bottom: 0.35rem;">Latest Vitals Summary:</div>
            <div>Blood Pressure: <strong>120/80 mmHg</strong></div>
            <div>Pulse Rate: <strong>78 bpm</strong></div>
            <div>Temperature: <strong>100.4 °F</strong></div>
            <div>Oxygen (SpO2): <strong>98%</strong></div>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 4. ASHA WORKER PORTAL (ASSIGNED CITIZENS, REFERRALS & FIELD VERIFICATION)
  // =========================================================================
  renderAshaView(state) {
    const asha = state.currentUser || state.users.asha;
    const currentPath = window.SehatRouter.currentRoute || '/asha/dashboard';
    const subView = window.SehatRouter.currentParams?.subView || 'overview';
    const unreadNotifs = (state.notifications || []).filter(n => (n.targetRole === 'asha' || n.targetRole === 'all') && !n.read).length;

    const avatarMarkup = asha.avatarUrl
      ? `<img src="${asha.avatarUrl}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">`
      : `<div class="portal-user-avatar" style="background: var(--accent-purple);">SD</div>`;

    return `
      <div class="portal-layout">
        <!-- Sidebar -->
        <aside class="portal-sidebar">
          <div class="portal-user-badge" onclick="window.SehatRouter.navigate('/asha/profile')">
            ${avatarMarkup}
            <div class="portal-user-details">
              <h4>${asha.name}</h4>
              <span>${asha.id || 'ASHA-204'} • ${asha.area || 'Zone C'}</span>
            </div>
          </div>

          <nav class="portal-nav-menu">
            <div class="portal-nav-item ${subView === 'overview' || currentPath === '/asha/dashboard' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/dashboard')">
              <span>📊</span> Dashboard
            </div>
            <div class="portal-nav-item ${subView === 'citizens' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/citizens')">
              <span>👥</span> Assigned Citizens
            </div>
            <div class="portal-nav-item ${subView === 'visits' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/health-visits')">
              <span>📋</span> Health Visits
            </div>
            <div class="portal-nav-item ${subView === 'report_issue' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/report-health-issue')">
              <span>📝</span> Report Health Issue
            </div>
            <div class="portal-nav-item ${subView === 'referrals' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/referrals')">
              <span>🏥</span> Referrals
            </div>
            <div class="portal-nav-item ${subView === 'followups' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/follow-ups')">
              <span>🔄</span> Follow-ups
            </div>
            <div class="portal-nav-item ${subView === 'alerts' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/alerts')">
              <span>🚨</span> Health Alerts
            </div>
            <div class="portal-nav-item ${subView === 'notifications' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/notifications')">
              <span>🔔</span> Notifications ${unreadNotifs > 0 ? `<span class="badge badge-high" style="font-size: 0.65rem; margin-left: auto;">${unreadNotifs}</span>` : ''}
            </div>
            <div class="portal-nav-item ${currentPath.includes('/asha/profile') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/asha/profile')">
              <span>👤</span> Profile
            </div>
            <div class="portal-nav-item" onclick="window.location.href='/auth/logout';" style="color: var(--accent-red); margin-top: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.65rem;">
              <span>🚪</span> Logout
            </div>
          </nav>
        </aside>

        <!-- Main Content (Full Screen) -->
        <main class="portal-content">
          <div class="portal-header-bar">
            <div>
              <h2>ASHA Community Health Portal</h2>
              <p>Grassroots Surveillance, Household Monitoring & Clinical Referrals</p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-primary" onclick="window.SehatApp.openCreateReferralModal()">+ Refer to Doctor</button>
            </div>
          </div>

          ${this.renderAshaSubViewContent(subView, state)}
        </main>
      </div>
    `;
  },

  renderAshaSubViewContent(subView, state) {
    const asha = state.currentUser || state.users.asha;
    const citizens = state.userAccounts.filter(u => u.role === 'citizen');
    const referrals = window.SehatState.getReferralsForAsha(asha.id || 'ASHA-204');
    const visits = (state.householdVisits || []);
    const tasks = (state.ashaTasks || []);
    const params = window.SehatRouter.currentParams || {};

    // =========================================================================
    // SUBVIEW: CITIZEN DETAIL PROFILE (/asha/citizens/:id)
    // =========================================================================
    if (subView === 'citizen_detail') {
      const citizenId = params.citizenId || 'C10291';
      const citizen = state.userAccounts.find(u => u.id === citizenId) || state.users.citizen;
      const citizenRefs = window.SehatState.getReferralsForCitizen(citizenId);
      const citizenVisits = visits.filter(v => v.citizenId === citizenId);
      const citizenFamily = state.family;

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <button class="btn btn-sm btn-outline" onclick="window.SehatRouter.navigate('/asha/citizens')" style="margin-bottom: 0.5rem;">
                ← Back to Assigned Citizens
              </button>
              <h3 style="font-size: 1.35rem; margin-bottom: 0.15rem;">👤 ${citizen.name} — Community Health Profile</h3>
              <p style="font-size: 0.825rem; color: var(--text-muted);">
                Citizen ID: <strong>${citizen.id}</strong> • Family: <strong>${citizen.familyId || 'FAM-10284'}</strong> • Ward: <strong>${citizen.zone || 'Zone C'}</strong>
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-sm btn-secondary" onclick="window.SehatApp.openLogVisitModal('${citizen.id}')">📋 Log Visit</button>
              <button class="btn btn-sm btn-primary" onclick="window.SehatApp.openCreateReferralModal('${citizen.id}')">🏥 Refer to Doctor</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem;">
            <!-- Left Column: Health Info & History -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <!-- Basic Demographics & Monitoring Status Card -->
              <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="card-title"><span>🪪</span> Official Demographics & Status</div>
                  <span class="badge ${citizen.monitoringStatus === 'High Risk' ? 'badge-high' : citizen.monitoringStatus === 'Follow-up Required' ? 'badge-watch' : 'badge-normal'}">
                    ${citizen.monitoringStatus || 'Routine Monitoring'}
                  </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; font-size: 0.85rem; padding-top: 0.5rem;">
                  <div><span style="color: var(--text-muted);">Age / Gender:</span><br><strong>${citizen.age || 32} yrs / ${citizen.gender || 'Male'}</strong></div>
                  <div><span style="color: var(--text-muted);">Phone Number:</span><br><strong>${citizen.phone || citizen.mobile || '+91 98765 43210'}</strong></div>
                  <div><span style="color: var(--text-muted);">ABHA ID:</span><br><strong style="font-family: var(--font-mono);">${citizen.abhaId || '14-8921-4320-1092'}</strong></div>
                  <div style="grid-column: span 3;"><span style="color: var(--text-muted);">Residential Address:</span><br><strong>${citizen.address || 'House #42, Sector 9, Zone C — Urban North Ward'}</strong></div>
                </div>

                <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-size: 0.825rem; font-weight: 700;">Update Status:</span>
                  <select class="form-control" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onchange="window.SehatApp.handleUpdateCitizenStatus('${citizen.id}', this.value)">
                    <option value="Routine Monitoring" ${citizen.monitoringStatus === 'Routine Monitoring' ? 'selected' : ''}>Routine Monitoring</option>
                    <option value="Follow-up Required" ${citizen.monitoringStatus === 'Follow-up Required' ? 'selected' : ''}>Follow-up Required</option>
                    <option value="Active Observation" ${citizen.monitoringStatus === 'Active Observation' ? 'selected' : ''}>Active Observation</option>
                    <option value="High Risk" ${citizen.monitoringStatus === 'High Risk' ? 'selected' : ''}>High Risk</option>
                  </select>
                </div>
              </div>

              <!-- Referrals for this Citizen -->
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>🏥</span> Doctor Referrals History (${citizenRefs.length})</div>
                </div>
                ${citizenRefs.length === 0 ? `
                  <p style="color: var(--text-muted); font-size: 0.85rem;">No doctor referrals recorded for this citizen.</p>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                    ${citizenRefs.map(r => `
                      <div style="background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                          <strong>Referred to: ${r.doctorName}</strong>
                          <span class="badge ${r.status === 'Completed' ? 'badge-normal' : 'badge-purple'}">${r.status}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">Reason: ${r.reason}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Scheduled: ${r.date} • Urgency: <strong>${r.urgency}</strong></div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

              <!-- Logged Household Visits -->
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>📋</span> Logged Household Visits (${citizenVisits.length})</div>
                </div>
                ${citizenVisits.length === 0 ? `
                  <p style="color: var(--text-muted); font-size: 0.85rem;">No household visits logged yet. Click "Log Visit" to record vitals and survey findings.</p>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                    ${citizenVisits.map(v => `
                      <div style="background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                          <strong>Visit Date: ${v.date}</strong>
                          <span class="badge badge-normal">Completed</span>
                        </div>
                        <div style="font-size: 0.8rem; margin: 0.3rem 0;">${v.observations}</div>
                        <div style="font-size: 0.75rem; color: var(--primary-700); font-family: var(--font-mono);">
                          BP: ${v.vitals?.bp || '120/80'} | Pulse: ${v.vitals?.pulse || '76'} | Temp: ${v.vitals?.temp || '98.6°F'} | SpO2: ${v.vitals?.spo2 || '99%'}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>

            <!-- Right Column: Family Hub & Contact -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>👨‍👩‍👧‍👦</span> Household Family Unit</div>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                  Family ID: <strong>${citizen.familyId || 'FAM-10284'}</strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  ${(citizenFamily.members || []).map(m => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-surface-subtle); border-radius: var(--radius-sm); font-size: 0.825rem;">
                      <div>
                        <strong>${m.name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${m.relation} (${m.age}y)</div>
                      </div>
                      <span class="badge ${m.status === 'Follow-up Required' ? 'badge-watch' : 'badge-normal'}" style="font-size: 0.7rem;">${m.status}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>🚨</span> Emergency & Ward Contact</div>
                </div>
                <div style="font-size: 0.825rem; display: flex; flex-direction: column; gap: 0.5rem;">
                  <div>Emergency Contact: <strong>${citizen.emergencyContact || '+91 98765 00000 (Family)'}</strong></div>
                  <div>Primary Facility: <strong>Urban Community Health Centre (UCHC-4)</strong></div>
                  <div>Assigned Doctor: <strong>Dr. Arishta Sharma</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // =========================================================================
    // SUBVIEW: ASSIGNED CITIZENS DIRECTORY (/asha/citizens)
    // =========================================================================
    if (subView === 'citizens') {
      const activeFilter = params.filter || 'all';
      const searchQuery = (this.ashaCitizenSearchQuery || '').toLowerCase().trim();

      let filtered = citizens;
      if (activeFilter === 'followup') filtered = filtered.filter(c => c.monitoringStatus === 'Follow-up Required');
      else if (activeFilter === 'observation') filtered = filtered.filter(c => c.monitoringStatus === 'Active Observation');
      else if (activeFilter === 'high_risk') filtered = filtered.filter(c => c.monitoringStatus === 'High Risk');
      else if (activeFilter === 'routine') filtered = filtered.filter(c => c.monitoringStatus === 'Routine Monitoring');

      if (searchQuery) {
        filtered = filtered.filter(c =>
          (c.name || '').toLowerCase().includes(searchQuery) ||
          (c.id || '').toLowerCase().includes(searchQuery) ||
          (c.familyId || '').toLowerCase().includes(searchQuery) ||
          (c.phone || c.mobile || '').includes(searchQuery)
        );
      }

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.2rem;">👥 Assigned Citizens & Household Directory</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Assigned to ${asha.name} in ${asha.area || 'Zone C Urban North Ward'}.</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.SehatApp.openCreateReferralModal()">+ New Doctor Referral</button>
          </div>

          <!-- Search & Filter Toolbar -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 0.85rem; margin-bottom: 1.25rem; display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 220px; position: relative;">
              <input type="text" id="asha-citizen-search-input" class="form-control" placeholder="🔍 Search citizen by Name, ID, Family ID, Phone..." value="${this.ashaCitizenSearchQuery || ''}" style="padding-left: 0.75rem;">
            </div>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              <button class="btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/citizens')">All (${citizens.length})</button>
              <button class="btn btn-sm ${activeFilter === 'followup' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/citizens?filter=followup')">Follow-up Required (${citizens.filter(c => c.monitoringStatus === 'Follow-up Required').length})</button>
              <button class="btn btn-sm ${activeFilter === 'observation' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/citizens?filter=observation')">Active Observation (${citizens.filter(c => c.monitoringStatus === 'Active Observation').length})</button>
              <button class="btn btn-sm ${activeFilter === 'routine' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/citizens?filter=routine')">Routine (${citizens.filter(c => c.monitoringStatus === 'Routine Monitoring').length})</button>
            </div>
          </div>

          <!-- Citizens Grid -->
          ${filtered.length === 0 ? `
            <div class="card" style="text-align: center; padding: 2.5rem 1rem;">
              <p style="color: var(--text-muted); font-size: 0.95rem;">No citizens found matching your filter or search query.</p>
              <button class="btn btn-sm btn-secondary" onclick="window.SehatApp.ashaCitizenSearchQuery = ''; window.SehatRouter.navigate('/asha/citizens');" style="margin-top: 0.5rem;">Reset Filter</button>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${filtered.map(c => `
                <div class="card" style="border-left: 4px solid ${c.monitoringStatus === 'High Risk' ? 'var(--risk-high-border)' : c.monitoringStatus === 'Follow-up Required' ? 'var(--accent-purple)' : 'var(--accent-emerald)'};">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <h4 style="font-size: 1.05rem; margin-bottom: 0.15rem; cursor: pointer; color: var(--primary-700);" onclick="window.SehatRouter.navigate('/asha/citizens/${c.id}')">${c.name}</h4>
                      <div style="font-size: 0.775rem; color: var(--text-muted); font-family: var(--font-mono);">
                        ID: <strong>${c.id}</strong> • Family: <strong>${c.familyId || 'FAM-10284'}</strong> • ${c.age || 32}y/${c.gender || 'M'} • 📞 ${c.phone || c.mobile || '+91 98765 43210'}
                      </div>
                      <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.2rem;">
                        📍 ${c.address || 'Sector 9, Zone C'}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <select class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onchange="window.SehatApp.handleUpdateCitizenStatus('${c.id}', this.value)">
                        <option value="Routine Monitoring" ${c.monitoringStatus === 'Routine Monitoring' ? 'selected' : ''}>Routine</option>
                        <option value="Follow-up Required" ${c.monitoringStatus === 'Follow-up Required' ? 'selected' : ''}>Follow-up</option>
                        <option value="Active Observation" ${c.monitoringStatus === 'Active Observation' ? 'selected' : ''}>Observation</option>
                        <option value="High Risk" ${c.monitoringStatus === 'High Risk' ? 'selected' : ''}>High Risk</option>
                      </select>
                      <span class="badge ${c.monitoringStatus === 'High Risk' ? 'badge-high' : c.monitoringStatus === 'Follow-up Required' ? 'badge-watch' : 'badge-normal'}">${c.monitoringStatus}</span>
                    </div>
                  </div>

                  <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 0.6rem; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-secondary" onclick="window.SehatApp.openLogVisitModal('${c.id}')">
                      📋 Log Visit
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="window.SehatApp.openCreateReferralModal('${c.id}')">
                      🏥 Refer to Doctor
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="window.SehatRouter.navigate('/asha/citizens/${c.id}')" style="margin-left: auto;">
                      View Health Profile →
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }

    // =========================================================================
    // SUBVIEW: HEALTH VISITS (/asha/health-visits)
    // =========================================================================
    if (subView === 'visits') {
      const activeFilter = params.filter || 'all';
      let allVisits = [...tasks.map(t => ({ ...t, type: 'task' })), ...visits.map(v => ({ ...v, type: 'visit' }))];

      if (activeFilter === 'pending') allVisits = allVisits.filter(v => v.status !== 'Completed');
      else if (activeFilter === 'completed') allVisits = allVisits.filter(v => v.status === 'Completed');

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.2rem;">📋 Household Visits & Field Monitoring</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Manage scheduled household rounds, vitals capture, and visit completion logs.</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.SehatApp.openLogVisitModal()">+ Log New Household Visit</button>
          </div>

          <!-- Filter Bar -->
          <div style="display: flex; gap: 0.4rem; margin-bottom: 1rem;">
            <button class="btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/health-visits')">All Visits (${tasks.length + visits.length})</button>
            <button class="btn btn-sm ${activeFilter === 'pending' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/health-visits?filter=pending')">Due / Scheduled (${tasks.filter(t => t.status !== 'Completed').length})</button>
            <button class="btn btn-sm ${activeFilter === 'completed' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/health-visits?filter=completed')">Completed (${tasks.filter(t => t.status === 'Completed').length + visits.length})</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${allVisits.length === 0 ? `
              <div class="card" style="text-align: center; padding: 3rem 1rem;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📋</div>
                <h3>No Household Visits Recorded Yet</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 480px; margin: 0.5rem auto 1rem;">
                  Your household monitoring directory is ready. Click '+ Log New Household Visit' to record vitals, symptoms, and field interventions.
                </p>
                <button class="btn btn-primary" onclick="window.SehatApp.openLogVisitModal()">+ Log First Household Visit</button>
              </div>
            ` : allVisits.map(t => `
              <div class="card" style="border-left: 4px solid ${t.status === 'Completed' ? 'var(--accent-emerald)' : t.priority === 'High' ? 'var(--risk-high-border)' : 'var(--accent-purple)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
                  <div>
                    <h4 style="font-size: 1rem; margin-bottom: 0.15rem;">${t.headName || t.citizenName} (${t.familyId})</h4>
                    <div style="font-size: 0.775rem; color: var(--text-muted);">📍 ${t.address || 'Sector 9, Zone C'}</div>
                  </div>
                  <span class="badge ${t.status === 'Completed' ? 'badge-normal' : t.priority === 'High' ? 'badge-high' : 'badge-watch'}">
                    ${t.status || 'Scheduled'}
                  </span>
                </div>
                <div style="font-size: 0.825rem; margin: 0.35rem 0;">${t.reason || t.observations || 'Routine household wellness check.'}</div>
                ${t.vitals ? `
                  <div style="font-size: 0.75rem; color: var(--primary-700); font-family: var(--font-mono); margin-bottom: 0.4rem;">
                    BP: ${t.vitals.bp || '120/80'} | Pulse: ${t.vitals.pulse || '76 bpm'} | Temp: ${t.vitals.temp || '98.6 °F'} | SpO2: ${t.vitals.spo2 || '99%'}
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; font-size: 0.75rem;">
                  <span>Date: <strong>${t.date}</strong> ${t.completedAt ? `• (${t.completedAt})` : ''}</span>
                  ${t.status !== 'Completed' ? `
                    <div style="display: flex; gap: 0.4rem;">
                      <button class="btn btn-sm btn-primary" onclick="window.SehatApp.handleCompleteAshaTask('${t.id}')">
                        ✓ Complete Visit
                      </button>
                    </div>
                  ` : `
                    <span style="color: var(--accent-emerald); font-weight: 700;">✓ Verified Logged</span>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // =========================================================================
    // SUBVIEW: REPORT HEALTH ISSUE (/asha/report-health-issue)
    // =========================================================================
    if (subView === 'report_issue') {
      return `
        <div>
          <div style="margin-bottom: 1.25rem;">
            <h3 style="font-size: 1.25rem; margin-bottom: 0.2rem;">📝 Report Community Health Issue</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Log grassroots symptom reports or household cluster outbreak signals directly to the district surveillance network.</p>
          </div>

          <div class="card" style="max-width: 800px;">
            <form id="asha-report-symptom-form">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div class="form-group">
                  <label class="form-label">Select Citizen / Household Head *</label>
                  <select id="asha-report-citizen" class="form-control" required>
                    ${citizens.map(c => `
                      <option value="${c.id}">${c.name} (${c.id}) — Family: ${c.familyId}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Surveillance Ward / Area *</label>
                  <select id="asha-report-zone" class="form-control" required>
                    <option value="Zone C" selected>Zone C — Urban North Ward</option>
                    <option value="Zone A">Zone A — South Green Colony</option>
                    <option value="Zone B">Zone B — East Lake District</option>
                    <option value="Zone E">Zone E — Central Railway Colony</option>
                  </select>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label">Observed Symptoms (Select all that apply) *</label>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 0.35rem;">
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Watery Diarrhea" checked> Watery Diarrhea
                  </label>
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Vomiting" checked> Vomiting
                  </label>
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Moderate Fever" checked> Moderate Fever
                  </label>
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Abdominal Cramps" checked> Abdominal Cramps
                  </label>
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Severe Dehydration"> Dehydration
                  </label>
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Jaundice / Yellow Eyes"> Jaundice
                  </label>
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Skin Rash"> Skin Rash
                  </label>
                  <label style="font-size: 0.825rem; display: flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" name="asha-symptoms" value="Dry Cough"> Dry Cough
                  </label>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div class="form-group">
                  <label class="form-label">Severity Assessment *</label>
                  <select id="asha-report-severity" class="form-control" required>
                    <option value="Moderate" selected>🟡 Moderate (Multiple symptomatic)</option>
                    <option value="Severe">🔴 Severe (Urgent doctor attention needed)</option>
                    <option value="Critical">🚨 Critical (Outbreak cluster risk)</option>
                    <option value="Mild">🟢 Mild (Routine monitoring)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Symptom Duration *</label>
                  <input type="text" id="asha-report-duration" class="form-control" value="2 Days" required>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label">Detailed Field Observation & Environmental Notes *</label>
                <textarea id="asha-report-description" class="form-control" rows="3" required placeholder="E.g., Visited household in Sector 9. Noticed cloudy tap water; 3 family members experiencing loose motions. ORS kit provided."></textarea>
              </div>

              <div class="privacy-banner" style="margin-bottom: 1.25rem;">
                <span>ℹ️ Submitting this report updates the Community Risk Engine, notifies Dr. Arishta Sharma, and updates the District Surveillance Command Map.</span>
              </div>

              <button type="submit" class="btn btn-primary btn-block">🚀 Submit Community Health Report</button>
            </form>
          </div>
        </div>
      `;
    }

    // =========================================================================
    // SUBVIEW: REFERRALS TRACKER (/asha/referrals)
    // =========================================================================
    if (subView === 'referrals') {
      const activeFilter = params.filter || 'all';
      let filtered = referrals;
      if (activeFilter === 'pending') filtered = filtered.filter(r => r.status === 'Pending Review' || r.status === 'Scheduled');
      else if (activeFilter === 'completed') filtered = filtered.filter(r => r.status === 'Completed');

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.2rem;">🏥 Doctor Referrals Tracker</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Track clinical acceptance, doctor consultations, and treatment progress.</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.SehatApp.openCreateReferralModal()">+ New Doctor Referral</button>
          </div>

          <div style="display: flex; gap: 0.4rem; margin-bottom: 1rem;">
            <button class="btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/referrals')">All (${referrals.length})</button>
            <button class="btn btn-sm ${activeFilter === 'pending' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/referrals?filter=pending')">Pending Review (${referrals.filter(r => r.status !== 'Completed').length})</button>
            <button class="btn btn-sm ${activeFilter === 'completed' ? 'btn-primary' : 'btn-outline'}" onclick="window.SehatRouter.navigate('/asha/referrals?filter=completed')">Completed (${referrals.filter(r => r.status === 'Completed').length})</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${filtered.length === 0 ? `
              <div class="card" style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-muted);">No referrals recorded under this view.</p>
              </div>
            ` : filtered.map(ref => `
              <div class="card" style="border-left: 4px solid var(--accent-purple);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h4 style="font-size: 1rem; margin-bottom: 0.15rem;">${ref.citizenName} (${ref.citizenId})</h4>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Referred to: <strong>${ref.doctorName}</strong> • ${ref.facility || 'UCHC-4'}</div>
                  </div>
                  <span class="badge ${ref.status === 'Completed' ? 'badge-normal' : 'badge-purple'}">${ref.status}</span>
                </div>
                <div style="font-size: 0.825rem; margin: 0.4rem 0;">${ref.reason}</div>
                ${ref.notes ? `<div style="font-size: 0.775rem; color: var(--text-muted); font-style: italic; margin-bottom: 0.35rem;">Notes: "${ref.notes}"</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.4rem; font-size: 0.75rem;">
                  <span>Scheduled: <strong>${ref.date}</strong> • Urgency: <strong>${ref.urgency}</strong></span>
                  <button class="btn btn-sm btn-outline" onclick="window.SehatRouter.navigate('/asha/citizens/${ref.citizenId}')">View Citizen →</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // =========================================================================
    // SUBVIEW: FOLLOW-UPS TRACKER (/asha/follow-ups)
    // =========================================================================
    if (subView === 'followups') {
      const followupCitizens = citizens.filter(c => c.monitoringStatus === 'Follow-up Required' || c.monitoringStatus === 'Active Observation');

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.2rem;">🔄 Follow-up Cases Manager</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Track recovery trajectory and resolve follow-up milestones.</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.SehatApp.openLogVisitModal()">+ Log Follow-up Visit</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${followupCitizens.map(c => `
              <div class="card" style="border-left: 4px solid var(--accent-purple);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <div>
                    <h4 style="font-size: 1rem; margin-bottom: 0.1rem;">${c.name} (${c.id})</h4>
                    <div style="font-size: 0.775rem; color: var(--text-muted);">Family: ${c.familyId} • Next Due: <strong>${c.nextFollowUp || '24 August'}</strong></div>
                  </div>
                  <span class="badge ${c.monitoringStatus === 'Follow-up Required' ? 'badge-watch' : 'badge-normal'}">${c.monitoringStatus}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin: 0.3rem 0;">📍 ${c.address || 'Sector 9, Zone C'} • 📞 ${c.phone || c.mobile || '+91 98765 43210'}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; margin-top: 0.4rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.775rem;">
                    <span>Update Case:</span>
                    <select class="form-control" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onchange="window.SehatApp.handleUpdateCitizenStatus('${c.id}', this.value)">
                      <option value="Follow-up Required" ${c.monitoringStatus === 'Follow-up Required' ? 'selected' : ''}>Follow-up Required</option>
                      <option value="Routine Monitoring" ${c.monitoringStatus === 'Routine Monitoring' ? 'selected' : ''}>Resolved (Routine)</option>
                      <option value="Active Observation" ${c.monitoringStatus === 'Active Observation' ? 'selected' : ''}>Active Observation</option>
                    </select>
                  </div>
                  <div style="display: flex; gap: 0.4rem;">
                    <button class="btn btn-sm btn-secondary" onclick="window.SehatApp.openLogVisitModal('${c.id}')">📋 Log Visit</button>
                    <button class="btn btn-sm btn-outline" onclick="window.SehatApp.openCreateReferralModal('${c.id}')">🏥 Refer</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // =========================================================================
    // SUBVIEW: HEALTH ALERTS & FIELD VERIFICATION (/asha/alerts)
    // =========================================================================
    if (subView === 'alerts') {
      const earlyWarnings = state.earlyWarnings || [];

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.2rem;">🚨 Early Warning Alerts & Ward Risk</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Real-time epidemiological cluster signals requiring field verification.</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.SehatUI.openAshaVerificationModal('Zone C')">✓ Perform Field Verification</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${earlyWarnings.map(w => `
              <div class="card" style="border-left: 4px solid ${w.riskScore > 75 ? 'var(--risk-high-border)' : 'var(--risk-watch-border)'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <div>
                    <span class="badge ${w.riskScore > 75 ? 'badge-high' : 'badge-watch'}"><span class="badge-dot"></span> Risk Score: ${w.riskScore}/100</span>
                    <span style="font-weight: 700; margin-left: 0.5rem;">${w.zone}</span>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${w.timestamp}</span>
                </div>

                <h4 style="font-size: 1.05rem; margin-bottom: 0.35rem;">${w.title}</h4>

                <div style="background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); margin: 0.5rem 0;">
                  <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 0.25rem;">Detected Signals:</div>
                  <ul style="padding-left: 1.25rem; font-size: 0.8rem; color: var(--text-muted);">
                    ${(w.signals || []).map(s => `<li>${s}</li>`).join('')}
                  </ul>
                </div>

                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                  <strong>Recommended Action:</strong> ${w.actionRecommendation || 'Survey households, inspect water source, distribute ORS packs.'}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.6rem;">
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Status: <strong>${w.status}</strong></span>
                  <button class="btn btn-sm btn-primary" onclick="window.SehatUI.openAshaVerificationModal('${w.zone}')">
                    ✓ Perform Field Verification
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // =========================================================================
    // SUBVIEW: NOTIFICATIONS (/asha/notifications)
    // =========================================================================
    if (subView === 'notifications') {
      const notifs = window.SehatState.getNotificationsForRole('asha');

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.2rem;">🔔 ASHA Notifications & Alerts Feed</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Clinical updates, referral statuses, and community surveillance warnings.</p>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="window.SehatState.markAllNotificationsRead('asha'); window.SehatApp.renderCurrentView();">
              Mark all as read
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.65rem;">
            ${notifs.length === 0 ? `
              <div class="card" style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-muted);">No new notifications at this time.</p>
              </div>
            ` : notifs.map(n => `
              <div class="card" style="padding: 0.85rem 1.15rem; ${n.read ? 'opacity: 0.85;' : 'border-left: 4px solid var(--accent-purple);'}" onclick="window.SehatState.markNotificationRead('${n.id}'); window.SehatApp.renderCurrentView();">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                  <strong style="font-size: 0.9rem;">${n.title}</strong>
                  <span style="font-size: 0.725rem; color: var(--text-muted);">${n.time || 'Just now'}</span>
                </div>
                <div style="font-size: 0.825rem; color: var(--text-muted);">${n.message}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // =========================================================================
    // DEFAULT SUBVIEW: OVERVIEW DASHBOARD (/asha/dashboard)
    // =========================================================================
    const dueTasksCount = tasks.filter(t => t.status !== 'Completed').length;
    const activeRefCounts = referrals.filter(r => r.status !== 'Completed').length;

    return `
      <div>
        <!-- Clickable KPI Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.85rem; margin-bottom: 1.35rem;">
          <div class="card" style="cursor: pointer; padding: 0.85rem; border-left: 4px solid var(--accent-emerald);" onclick="window.SehatRouter.navigate('/asha/citizens')">
            <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Assigned Citizens</div>
            <div style="font-size: 1.5rem; font-family: var(--font-mono); font-weight: 800; color: var(--accent-emerald);">${citizens.length}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">Click to view directory →</div>
          </div>
          <div class="card" style="cursor: pointer; padding: 0.85rem; border-left: 4px solid var(--primary-600);" onclick="window.SehatRouter.navigate('/asha/health-visits')">
            <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Visits Due</div>
            <div style="font-size: 1.5rem; font-family: var(--font-mono); font-weight: 800; color: var(--primary-600);">${dueTasksCount}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">Click to view visits queue →</div>
          </div>
          <div class="card" style="cursor: pointer; padding: 0.85rem; border-left: 4px solid var(--accent-purple);" onclick="window.SehatRouter.navigate('/asha/referrals')">
            <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Active Referrals</div>
            <div style="font-size: 1.5rem; font-family: var(--font-mono); font-weight: 800; color: var(--accent-purple);">${activeRefCounts}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">Click to track referrals →</div>
          </div>
          <div class="card" style="cursor: pointer; padding: 0.85rem; border-left: 4px solid var(--risk-high-border);" onclick="window.SehatRouter.navigate('/asha/alerts')">
            <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Zone C Risk</div>
            <div style="font-size: 1.5rem; font-family: var(--font-mono); font-weight: 800; color: var(--risk-high-border);">84/100</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">High Risk Cluster Signal →</div>
          </div>
        </div>

        <!-- High Priority Cluster Signal Alert -->
        <div class="card" style="border-left: 4px solid var(--risk-high-border); margin-bottom: 1.35rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span class="badge badge-high"><span class="badge-dot"></span> Risk Score: 84/100 (HIGH OUTBREAK RISK)</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Zone C — Urban North Ward</span>
          </div>
          <h4 style="font-size: 1.05rem; margin-bottom: 0.35rem;">🚨 Gastrointestinal Cluster Outbreak Signal</h4>
          <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            31 symptom reports recorded vs 10 historical baseline (+42% surge). 4 distinct household clusters identified.
          </p>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.SehatUI.openAshaVerificationModal('Zone C')">
              ✓ Perform Field Survey Verification
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.SehatRouter.navigate('/asha/report-health-issue')">
              📝 Report Community Case
            </button>
          </div>
        </div>

        <!-- Assigned Household Tasks & Scheduled Visits -->
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <h4 style="font-size: 1rem;">📋 Assigned Household Tasks & Due Rounds</h4>
          <button class="btn btn-sm btn-outline" onclick="window.SehatRouter.navigate('/asha/health-visits')">View All Visits →</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${tasks.map(t => `
            <div class="followup-task-item" style="margin-bottom: 0; padding: 0.85rem; border-left: 4px solid ${t.status === 'Completed' ? 'var(--accent-emerald)' : t.priority === 'High' ? 'var(--risk-high-border)' : 'var(--accent-purple)'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h4 style="font-size: 0.95rem;">${t.headName} (${t.familyId})</h4>
                  <div style="font-size: 0.775rem; color: var(--text-muted);">📍 ${t.address}</div>
                </div>
                <span class="badge ${t.status === 'Completed' ? 'badge-normal' : t.priority === 'High' ? 'badge-high' : 'badge-watch'}">
                  ${t.status || 'Scheduled'}
                </span>
              </div>
              <div style="font-size: 0.825rem; margin: 0.4rem 0;">${t.reason}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; font-size: 0.75rem;">
                <span>Due Date: <strong>${t.date}</strong> ${t.completedAt ? `• (${t.completedAt})` : ''}</span>
                ${t.status !== 'Completed' ? `
                  <button class="btn btn-sm btn-primary" onclick="window.SehatApp.handleCompleteAshaTask('${t.id}')">
                    ✓ Complete Visit
                  </button>
                ` : `
                  <span style="color: var(--accent-emerald); font-weight: 700;">✓ Completed</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 5. ADMIN SURVEILLANCE COMMAND CENTER
  // =========================================================================
  renderAdminView(state) {
    const kpis = state.kpis;
    const zoneC = state.zones['Zone C'];
    const currentPath = window.SehatRouter.currentRoute || '/admin/dashboard';
    const subView = window.SehatRouter.currentParams?.subView || 'command';

    return `
      <div class="portal-layout">
        <aside class="portal-sidebar">
          <div class="portal-user-badge" onclick="window.SehatRouter.navigate('/admin/dashboard')">
            <div class="portal-user-avatar" style="background: var(--accent-red);">ADM</div>
            <div class="portal-user-details">
              <h4>Surveillance Director</h4>
              <span>${state.users.admin.id}</span>
            </div>
          </div>

          <nav class="portal-nav-menu">
            <div class="portal-nav-item ${subView === 'command' || currentPath === '/admin/dashboard' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/dashboard')">
              <span>🏛️</span> Dashboard
            </div>
            <div class="portal-nav-item ${subView === 'citizens' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/citizens')">
              <span>👥</span> Citizens
            </div>
            <div class="portal-nav-item ${subView === 'doctors' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/doctors')">
              <span>🩺</span> Doctors
            </div>
            <div class="portal-nav-item ${subView === 'asha_workers' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/asha-workers')">
              <span>👩‍⚕️</span> ASHA Workers
            </div>
            <div class="portal-nav-item ${subView === 'health_reports' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/health-reports')">
              <span>📝</span> Health Reports
            </div>
            <div class="portal-nav-item ${subView === 'consultations' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/consultations')">
              <span>🔬</span> Consultations
            </div>
            <div class="portal-nav-item ${subView === 'referrals' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/referrals')">
              <span>🏥</span> Referrals
            </div>
            <div class="portal-nav-item ${subView === 'health_alerts' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/health-alerts')">
              <span>🚨</span> Health Alerts
            </div>
            <div class="portal-nav-item ${subView === 'analytics' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/analytics')">
              <span>📈</span> Analytics
            </div>
            <div class="portal-nav-item ${subView === 'system_activity' ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/system-activity')">
              <span>⚙️</span> System Activity
            </div>
            <div class="portal-nav-item ${currentPath.includes('/admin/profile') || currentPath.includes('/admin/settings') ? 'active' : ''}" onclick="window.SehatRouter.navigate('/admin/settings')">
              <span>👤</span> Settings
            </div>
            <div class="portal-nav-item" onclick="window.location.href='/auth/logout';" style="color: var(--accent-red); margin-top: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.65rem;">
              <span>🚪</span> Logout
            </div>
          </nav>
        </aside>

        <main class="portal-content">
          <div class="portal-header-bar">
            <div>
              <h2>Surveillance Command Center</h2>
              <p>District Real-Time Early Warning & Geospatial Intelligence</p>
            </div>
          </div>

          <div class="command-kpi-grid" style="margin-bottom: 1.5rem;">
            <div class="stat-card stat-citizen">
              <div class="stat-label">Monitored Citizens</div>
              <div class="stat-value">${kpis.totalCitizens.toLocaleString()}</div>
            </div>
            <div class="stat-card stat-citizen">
              <div class="stat-label">Households</div>
              <div class="stat-value">${kpis.totalFamilies.toLocaleString()}</div>
            </div>
            <div class="stat-card stat-doctor">
              <div class="stat-label">Health Reports</div>
              <div class="stat-value">${kpis.totalHealthReports.toLocaleString()}</div>
            </div>
            <div class="stat-card stat-high">
              <div class="stat-label">High-Risk Wards</div>
              <div class="stat-value" style="color: var(--risk-high-border);">Zone C (84)</div>
            </div>
          </div>

          <div class="xai-panel" style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div>
                <span class="badge badge-high"><span class="badge-dot"></span> AI Risk Intelligence</span>
                <h3 style="font-size: 1.35rem; margin-top: 0.25rem;">Zone C Anomaly Intelligence</h3>
              </div>
              <div>
                ${window.SehatCharts.renderRiskRingSVG(zoneC.riskScore, 90, 7)}
              </div>
            </div>

            <div class="xai-signals-list">
              <div class="xai-signal-item verified">
                <span class="xai-signal-icon">✓</span>
                <div><strong>+42% Surge in gastrointestinal symptoms</strong> reported over the last 72 hours.</div>
              </div>
              <div class="xai-signal-item verified">
                <span class="xai-signal-icon">✓</span>
                <div><strong>31 active reports vs 10 historical baseline</strong> in Urban North Ward.</div>
              </div>
              <div class="xai-signal-item verified">
                <span class="xai-signal-icon">✓</span>
                <div><strong>4 distinct household clusters</strong> identified in Sector 9 & Market Street.</div>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="card">
              <div class="card-header">
                <div class="card-title"><span>📈</span> Symptom Trajectory (7 Days)</div>
              </div>
              <canvas id="epidemiological-trend-canvas" style="width: 100%; height: 220px;"></canvas>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="card-title"><span>🗺️</span> Ward Risk Comparison</div>
              </div>
              <div id="area-comparison-container"></div>
            </div>
          </div>

          <div class="map-card-wrapper" style="margin-top: 1.5rem;">
            <div class="map-toolbar">
              <div style="font-weight: 700; font-size: 0.95rem;">🗺️ Geospatial Surveillance Map</div>
              <span class="badge badge-high">Zone C (84/100)</span>
            </div>
            <div id="community-map" class="map-container" style="height: 380px;"></div>
          </div>
        </main>
      </div>
    `;
  },

  // =========================================================================
  // 6. USER PROFILE VIEW
  // =========================================================================
  renderProfileView(state) {
    const user = state.currentUser || state.users.citizen;
    const roleColor = user.role === 'citizen' ? 'var(--accent-emerald)'
      : user.role === 'doctor' ? 'var(--accent-blue)'
        : user.role === 'asha' ? 'var(--accent-purple)'
          : 'var(--accent-red)';

    const avatarMarkup = user.avatarUrl
      ? `<img src="${user.avatarUrl}" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-emerald);">`
      : `<div class="profile-avatar-xl" style="background: ${roleColor};">
          ${user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>`;

    return `
      <div class="container" style="padding: 2rem 1.25rem;">
        <div class="profile-container">
          <div class="profile-hero">
            <div class="profile-hero-left">
              <div class="profile-avatar-wrapper" onclick="document.getElementById('profile-photo-file-input').click()">
                ${avatarMarkup}
                <div class="avatar-upload-overlay">
                  <span>📷 Change</span>
                </div>
                <input type="file" id="profile-photo-file-input" accept="image/*" style="display: none;">
              </div>

              <div>
                <h2>${user.name}</h2>
                <div class="profile-meta-tags">
                  <span class="badge ${user.role === 'citizen' ? 'badge-normal' : user.role === 'doctor' ? 'badge-blue' : user.role === 'asha' ? 'badge-purple' : 'badge-high'}">
                    ${user.role.toUpperCase()}
                  </span>
                  <span style="font-family: var(--font-mono); font-size: 0.825rem; color: var(--text-muted);">
                    ID: <strong>${user.id || 'CIT-10025'}</strong>
                  </span>
                  <span class="badge badge-normal"><span class="badge-dot"></span> Active Session</span>
                </div>
              </div>
            </div>
            <div>
              <button class="btn btn-outline" onclick="window.SehatRouter.navigate('/${user.role}/dashboard')">
                ← Return to Dashboard
              </button>
            </div>
          </div>

          <div class="profile-grid">
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <!-- 1. DYNAMIC OFFICIAL IDENTIFIERS CARD -->
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>🪪</span> Official Identifiers & Hierarchy</div>
                </div>

                ${user.role === 'doctor' ? `
                  <div class="profile-field-row">
                    <span class="profile-field-label">Medical Reg. Number (NMC / SMC)</span>
                    <span class="abha-badge" style="background: rgba(14, 165, 233, 0.15); color: var(--accent-blue); border-color: var(--accent-blue);">${user.regNumber || user.regNo || 'NMC-UP-48921'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Healthcare Facility / Hospital</span>
                    <span class="profile-field-value" style="font-weight: 700;">🏥 ${user.facility || user.hospital || 'Urban Community Health Centre (UCHC-4)'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Clinical Specialty</span>
                    <span class="profile-field-value">${user.specialty || 'General Medicine & Clinical Surveillance'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Assigned District / Jurisdiction</span>
                    <span class="profile-field-value">📍 ${user.district || 'Fatehpur'}, ${user.state || 'Uttar Pradesh'}</span>
                  </div>
                ` : user.role === 'asha' ? `
                  <div class="profile-field-row">
                    <span class="profile-field-label">ASHA Worker Badge ID</span>
                    <span class="abha-badge" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); border-color: var(--accent-purple);">${user.badgeId || user.id || 'ASHA-UP-FTP-204'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Attached Health Sub-Centre (HSC)</span>
                    <span class="profile-field-value" style="font-weight: 700;">🏥 ${user.healthCenter || 'Haswa Sub-Centre / UCHC-4'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Assigned Village / Urban Ward</span>
                    <span class="profile-field-value">🏡 ${user.village || user.town || user.ward || user.area || 'Haswa / Bilinda'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Administrative Block</span>
                    <span class="profile-field-value">📍 ${user.block || 'Haswa'}, ${user.district || 'Fatehpur'}</span>
                  </div>
                ` : user.role === 'admin' ? `
                  <div class="profile-field-row">
                    <span class="profile-field-label">IDSP Officer Designation Code</span>
                    <span class="abha-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-red); border-color: var(--accent-red);">${user.id || 'IDSP-DIR-01'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Surveillance Authority</span>
                    <span class="profile-field-value" style="font-weight: 700;">🏛️ Integrated Disease Surveillance Programme (IDSP)</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Administrative Jurisdiction</span>
                    <span class="profile-field-value">📍 ${user.jurisdiction || 'State-Level Surveillance (Uttar Pradesh)'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Command & Control Level</span>
                    <span class="badge badge-high">● Tier-1 Full Administrative Access</span>
                  </div>
                ` : `
                  <div class="profile-field-row">
                    <span class="profile-field-label">National Health (ABHA) ID</span>
                    <span class="abha-badge">${user.abhaId || (user.id ? '14-8921-4320-' + user.id.replace(/\\D/g,'').padStart(4,'1092').slice(-4) : '14-8921-4320-1092')}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Household Family ID</span>
                    <span class="profile-field-value" style="font-family: var(--font-mono); font-weight: 700;">${user.familyId || ('FAM-' + (user.id || 'NEW'))}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Village / Town / Ward</span>
                    <span class="profile-field-value">🏡 ${user.village || user.town || user.ward || user.address || 'Haswa'}</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Block & District</span>
                    <span class="profile-field-value">📍 ${user.block || 'Haswa'} Block, ${user.district || 'Fatehpur'} (${user.state || 'UP'})</span>
                  </div>
                `}
              </div>

              <!-- 2. EDIT PERSONAL & LOCATION DETAILS -->
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>✏️</span> Edit Personal Details</div>
                </div>

                <form id="profile-edit-form">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem;">
                    <div class="form-group">
                      <label class="form-label">Full Name *</label>
                      <input type="text" id="edit-name" class="form-control" value="${user.name}" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Mobile Number *</label>
                      <input type="tel" id="edit-mobile" class="form-control" value="${user.mobile || '+91 98765 43210'}" required>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem;">
                    <div class="form-group">
                      <label class="form-label">Email Address (Mandatory) *</label>
                      <input type="email" id="edit-email" class="form-control" value="${user.email || 'user@example.com'}" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Date of Birth / Age</label>
                      <input type="text" id="edit-dob" class="form-control" value="${user.dob || '14 Aug 1994 (32 yrs)'}">
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem;">
                    <div class="form-group">
                      <label class="form-label">Gender</label>
                      <select id="edit-gender" class="form-control">
                        <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                        <option value="Other" ${user.gender === 'Other' ? 'selected' : ''}>Other</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Emergency Contact</label>
                      <input type="text" id="edit-emergency" class="form-control" value="${user.emergencyContact || '+91 98765 00000 (Family)'}">
                    </div>
                  </div>

                  <!-- Location Hierarchy (India -> State -> District -> Block) -->
                  <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.85rem;">
                    <div style="font-weight: 800; font-size: 0.85rem; margin-bottom: 0.65rem; color: var(--primary-700); display: flex; align-items: center; gap: 0.35rem;">
                      <span>📍</span> Administrative Location (India LGD Standard)
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem;">Country</label>
                        <select id="edit-country" class="form-control" disabled style="background: var(--bg-surface);">
                          <option value="India" selected>🇮🇳 India</option>
                        </select>
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem;">State / UT *</label>
                        <select id="edit-state" class="form-control" required>
                          <option value="">Loading States...</option>
                        </select>
                      </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem;">District *</label>
                        <select id="edit-district" class="form-control" required disabled>
                          <option value="">-- Select District (Select State first) --</option>
                        </select>
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.75rem;">Administrative Block / Sub-District *</label>
                        <select id="edit-block" class="form-control" required disabled>
                          <option value="">-- Select Block (Select District first) --</option>
                        </select>
                      </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" style="font-size: 0.75rem;">Village / Town / Ward</label>
                      <input type="text" id="edit-village" class="form-control" value="${user.village || user.town || user.ward || ''}" placeholder="e.g. Haswa, Bilinda, Chak Kazi...">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Residential / Local Address</label>
                    <input type="text" id="edit-address" class="form-control" value="${user.address || ''}" placeholder="e.g. Main Road, Near Primary Health Centre">
                  </div>

                  <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem; font-weight: 700; width: 100%;">
                    💾 Save Profile & Return to Dashboard
                  </button>
                </form>
              </div>
            </div>

            <!-- 3. SWITCH ACTIVE ACCOUNT CARD -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div class="card">
                <div class="card-header">
                  <div class="card-title"><span>🔄</span> Switch Active Account</div>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                  Seamlessly switch between verified stakeholder roles to test role-specific dashboards and permissions.
                </p>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <button class="btn btn-sm ${user.role === 'citizen' ? 'btn-primary' : 'btn-secondary'}" onclick="window.SehatApp.switchAccount('rahul.sharma@example.com', 'password123', 'citizen')" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>👤 Rahul Sharma (Citizen)</span>
                    ${user.role === 'citizen' ? '<span class="badge badge-normal" style="font-size: 0.65rem;">Active</span>' : ''}
                  </button>
                  <button class="btn btn-sm ${user.role === 'doctor' ? 'btn-primary' : 'btn-secondary'}" onclick="window.SehatApp.switchAccount('dr.arishta@health.gov.in', 'password123', 'doctor')" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>🩺 Dr. Arishta (Doctor)</span>
                    ${user.role === 'doctor' ? '<span class="badge badge-normal" style="font-size: 0.65rem;">Active</span>' : ''}
                  </button>
                  <button class="btn btn-sm ${user.role === 'asha' ? 'btn-primary' : 'btn-secondary'}" onclick="window.SehatApp.switchAccount('sunita.asha@health.gov.in', 'password123', 'asha')" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>👩‍⚕️ Sunita Devi (ASHA Worker)</span>
                    ${user.role === 'asha' ? '<span class="badge badge-normal" style="font-size: 0.65rem;">Active</span>' : ''}
                  </button>
                  <button class="btn btn-sm ${user.role === 'admin' ? 'btn-primary' : 'btn-secondary'}" onclick="window.SehatApp.switchAccount('director.idsp@nic.in', 'password123', 'admin')" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>🏛️ Director Paul (Admin / IDSP)</span>
                    ${user.role === 'admin' ? '<span class="badge badge-normal" style="font-size: 0.65rem;">Active</span>' : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 7. COMMON MODALS & INTERACTIVE FLOWS
  // =========================================================================
  openCreateReferralModal(defaultCitizenId = 'CIT-10025') {
    let modal = document.getElementById('modal-create-referral');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-create-referral';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    const citizens = window.SehatState.getState().userAccounts.filter(u => u.role === 'citizen');

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 560px;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Create Doctor Referral</h3>
          <button class="icon-btn" onclick="window.SehatUI.closeModal('modal-create-referral')">✕</button>
        </div>
        <form id="create-referral-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Select Citizen *</label>
              <select id="ref-citizen-select" class="form-control" required>
                ${citizens.map(c => `
                  <option value="${c.id}" ${c.id === defaultCitizenId ? 'selected' : ''}>${c.name} (${c.id}) — Ward: ${c.zone}</option>
                `).join('')}
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label class="form-label">Select Doctor *</label>
                <select id="ref-doctor-select" class="form-control" required>
                  <option value="DR-1004">Dr. Arishta Sharma (UCHC-4)</option>
                  <option value="DR-1008">Dr. Samir Joshi (City Hospital)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Urgency Level *</label>
                <select id="ref-urgency-select" class="form-control" required>
                  <option value="High" selected>🔴 High Priority</option>
                  <option value="Critical">🚨 Critical / Immediate</option>
                  <option value="Medium">🟡 Routine Consultation</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Clinical Symptoms & Reason for Referral *</label>
              <textarea id="ref-reason-text" class="form-control" rows="3" placeholder="Describe symptoms, cluster findings, or duration..." required>Patient experiencing acute gastrointestinal distress with fever. Multiple household members symptomatic.</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Field Notes / Supporting Observations</label>
              <input type="text" id="ref-notes-input" class="form-control" value="Inspected tap water source in lane. ORS pack delivered.">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.SehatUI.closeModal('modal-create-referral')">Cancel</button>
            <button type="submit" class="btn btn-primary">Send Doctor Referral →</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('create-referral-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const citizenId = document.getElementById('ref-citizen-select').value;
      const doctorId = document.getElementById('ref-doctor-select').value;
      const urgency = document.getElementById('ref-urgency-select').value;
      const reason = document.getElementById('ref-reason-text').value;
      const notes = document.getElementById('ref-notes-input').value;

      window.SehatState.createDoctorReferral({
        citizenId,
        doctorId,
        doctorName: doctorId === 'DR-1004' ? 'Dr. Arishta Sharma' : 'Dr. Samir Joshi',
        specialty: 'Community Medicine Specialist',
        facility: 'Urban Community Health Centre (UCHC-4)',
        urgency,
        reason,
        notes
      });

      window.SehatUI.closeModal('modal-create-referral');
      window.SehatUI.showToast('Referral Created', 'Referral transmitted to Dr. Arishta Sharma.', 'success');
      this.renderCurrentView();
    });

    window.SehatUI.openModal('modal-create-referral');
  },

  // --- DOCTOR EVENT BINDINGS ---
  bindDoctorEvents() {
    const searchForm = document.getElementById('doctor-search-patient-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('patient-search-query').value;
        const result = window.SehatState.searchCitizenForDoctor(query);

        if (result) {
          this.searchedPatient = result;
          this.patientSearchError = null;
          window.SehatUI.showToast('Patient Verified', `Found official records for ${result.name} (${result.id}).`, 'success');
        } else {
          this.searchedPatient = null;
          this.patientSearchError = 'Patient not found. Please check Citizen ID or Email.';
          window.SehatUI.showToast('Search Failed', 'Patient not found. Please check Citizen ID or Email.', 'error');
        }
        this.renderCurrentView();
      });
    }

    const consultForm = document.getElementById('doctor-full-consultation-form');
    if (consultForm) {
      consultForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const citizenId = document.getElementById('consult-citizen-id').value;
        const complaint = document.getElementById('consult-complaint').value;
        const symptoms = document.getElementById('consult-symptoms').value.split(',').map(s => s.trim());
        const duration = document.getElementById('consult-duration').value;
        const medhistory = document.getElementById('consult-medhistory').value;

        const bp = document.getElementById('vital-bp').value;
        const pulse = document.getElementById('vital-pulse').value;
        const temp = document.getElementById('vital-temp').value;
        const spo2 = document.getElementById('vital-spo2').value;

        const observations = document.getElementById('consult-observations').value;
        const diagnosis = document.getElementById('consult-diagnosis').value;
        const tests = document.getElementById('consult-tests').value;
        const analysis = document.getElementById('consult-analysis').value;
        const followup = document.getElementById('consult-followup').value;
        const outcome = document.getElementById('consult-outcome').value;

        // Collect Medicines
        const medNames = document.querySelectorAll('.med-name');
        const medDosages = document.querySelectorAll('.med-dosage');
        const medInstructions = document.querySelectorAll('.med-instruction');
        const medicinesList = [];

        medNames.forEach((input, idx) => {
          if (input.value.trim()) {
            medicinesList.push({
              name: input.value.trim(),
              dosage: medDosages[idx]?.value.trim() || '',
              instruction: medInstructions[idx]?.value.trim() || ''
            });
          }
        });

        const newConsultation = window.SehatState.createConsultation({
          citizenId,
          chiefComplaint: complaint,
          symptoms,
          duration,
          medicalHistory: medhistory,
          vitals: { bp, pulse, temp, spo2 },
          observations,
          analysis,
          diagnosis,
          recommendedTests: tests,
          medicines: medicinesList,
          followUpDate: followup,
          outcome,
          attachments: {
            photos: [...this.consultationPhotos],
            pdfs: [...this.consultationPdfs],
            videos: [...this.consultationVideos]
          }
        });

        this.consultationPhotos = [];
        this.consultationPdfs = [];
        this.consultationVideos = [];

        window.SehatUI.showToast('Consultation Saved', `Consultation ${newConsultation.id} created and synced with Citizen Portal.`, 'success');
        window.SehatRouter.navigate(`/doctor/consultations/${newConsultation.id}`);
      });
    }
  },

  confirmRegisterPatient(citizenId) {
    const doc = window.SehatState.getState().currentUser || window.SehatState.getState().users.doctor;
    const res = window.SehatState.registerPatientToDoctor(doc.id, citizenId);
    if (res.success) {
      window.SehatUI.showToast('Patient Registered', `Citizen ${citizenId} added to active patient queue.`, 'success');
      window.SehatRouter.navigate(`/doctor/patients/${citizenId}`);
    }
  },

  attachSampleConsultationPhoto() {
    this.consultationPhotos.push({
      id: 'att-' + Date.now(),
      name: 'clinical_tongue_hydration.jpg',
      size: '1.2 MB',
      url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
      type: 'image'
    });
    this.renderConsultationAttachmentsPreview();
    window.SehatUI.showToast('Photo Attached', 'Clinical hydration photo added to consultation.', 'info');
  },

  attachSampleConsultationPdf() {
    this.consultationPdfs.push({
      id: 'att-' + Date.now(),
      name: 'cbc_widal_panel_lab.pdf',
      size: '340 KB',
      url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80',
      type: 'pdf'
    });
    this.renderConsultationAttachmentsPreview();
    window.SehatUI.showToast('PDF Attached', 'CBC & Widal lab report PDF added to consultation.', 'info');
  },

  attachSampleConsultationVideo() {
    this.consultationVideos.push({
      id: 'att-' + Date.now(),
      name: 'teleconsult_vitals_review.mp4',
      size: '4.2 MB',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      type: 'video'
    });
    this.renderConsultationAttachmentsPreview();
    window.SehatUI.showToast('Video Attached', 'Tele-consultation video clip attached.', 'info');
  },

  renderConsultationAttachmentsPreview() {
    const container = document.getElementById('consult-attachments-preview');
    if (!container) return;

    let markup = '';
    this.consultationPhotos.forEach((p, idx) => {
      markup += `
        <div class="record-attachment-box">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <img src="${p.url}" class="record-attachment-img">
            <div><strong>📷 ${p.name}</strong> <span style="color: var(--text-muted);">(${p.size})</span></div>
          </div>
          <button type="button" class="btn btn-sm btn-outline" onclick="window.SehatApp.consultationPhotos.splice(${idx}, 1); window.SehatApp.renderConsultationAttachmentsPreview();">✕ Remove</button>
        </div>
      `;
    });

    this.consultationPdfs.forEach((d, idx) => {
      markup += `
        <div class="record-attachment-box">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="font-size: 1.4rem;">📄</span>
            <div><strong>${d.name}</strong> <span style="color: var(--text-muted);">(${d.size})</span></div>
          </div>
          <button type="button" class="btn btn-sm btn-outline" onclick="window.SehatApp.consultationPdfs.splice(${idx}, 1); window.SehatApp.renderConsultationAttachmentsPreview();">✕ Remove</button>
        </div>
      `;
    });

    this.consultationVideos.forEach((v, idx) => {
      markup += `
        <div class="record-attachment-box">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="font-size: 1.4rem;">🎥</span>
            <div><strong>${v.name}</strong> <span style="color: var(--text-muted);">(${v.size})</span></div>
          </div>
          <button type="button" class="btn btn-sm btn-outline" onclick="window.SehatApp.consultationVideos.splice(${idx}, 1); window.SehatApp.renderConsultationAttachmentsPreview();">✕ Remove</button>
        </div>
      `;
    });

    container.innerHTML = markup;
  },

  openVideoModal(videoUrl, title) {
    let modal = document.getElementById('modal-video-preview');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-video-preview';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-container" style="max-width: 640px;">
          <div class="modal-header">
            <h3 id="video-modal-title" style="font-size: 1.1rem;">Attached Medical Video</h3>
            <button class="icon-btn" onclick="window.SehatUI.closeModal('modal-video-preview')">✕</button>
          </div>
          <div class="modal-body" style="padding: 1rem; text-align: center;">
            <video id="video-modal-player" controls autoplay style="width: 100%; border-radius: var(--radius-md); background: #000;">
              <source id="video-modal-source" src="" type="video/mp4">
            </video>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="window.SehatUI.closeModal('modal-video-preview')">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('video-modal-title').textContent = title || 'Medical Consultation Video';
    const player = document.getElementById('video-modal-player');
    const source = document.getElementById('video-modal-source');
    source.src = videoUrl;
    player.load();
    window.SehatUI.openModal('modal-video-preview');
  },

  openRatingModal(consultationId, doctorId, doctorName) {
    let modal = document.getElementById('modal-citizen-rating');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-citizen-rating';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 500px;">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem;">Rate Doctor Consultation</h3>
          <button class="icon-btn" onclick="window.SehatUI.closeModal('modal-citizen-rating')">✕</button>
        </div>
        <form id="rating-modal-form">
          <div class="modal-body">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
              How would you rate your consultation experience with <strong>${doctorName}</strong>?
            </p>

            <div class="form-group" style="text-align: center;">
              <label class="form-label" style="text-align: center;">Select Star Rating *</label>
              <div id="star-rating-selector" style="font-size: 2rem; color: var(--accent-amber); cursor: pointer; display: flex; justify-content: center; gap: 0.5rem;">
                <span data-star="1">★</span>
                <span data-star="2">★</span>
                <span data-star="3">★</span>
                <span data-star="4">★</span>
                <span data-star="5">★</span>
              </div>
              <input type="hidden" id="selected-star-value" value="5">
            </div>

            <div class="form-group">
              <label class="form-label">Write Feedback / Review</label>
              <textarea id="rating-feedback-text" class="form-control" rows="3" placeholder="Share how the treatment advice or medication helped your recovery..." required>Very thorough diagnosis and clear dosage instructions. My symptoms improved quickly.</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.SehatUI.closeModal('modal-citizen-rating')">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Rating</button>
          </div>
        </form>
      </div>
    `;

    const starSpans = modal.querySelectorAll('#star-rating-selector span');
    starSpans.forEach(span => {
      span.addEventListener('click', () => {
        const starVal = parseInt(span.getAttribute('data-star'));
        document.getElementById('selected-star-value').value = starVal;
        starSpans.forEach((s, i) => {
          s.style.opacity = (i < starVal) ? '1' : '0.25';
        });
      });
    });

    document.getElementById('rating-modal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const stars = document.getElementById('selected-star-value').value;
      const feedback = document.getElementById('rating-feedback-text').value;
      const citizen = window.SehatState.getState().currentUser || window.SehatState.getState().users.citizen;

      const res = window.SehatState.submitDoctorReview(consultationId, citizen.id || 'CIT-10025', doctorId, stars, feedback);
      if (res.success) {
        window.SehatUI.closeModal('modal-citizen-rating');
        window.SehatUI.showToast('Rating Submitted', `Thank you for rating ${doctorName}. Performance metrics updated.`, 'success');
        this.renderCurrentView();
      }
    });

    window.SehatUI.openModal('modal-citizen-rating');
  },

  // --- CITIZEN REPORT & RECORDS HELPERS ---
  bindCitizenEvents() {
    const tagChips = document.querySelectorAll('#symptom-tags .tag-chip');
    tagChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const symptom = chip.getAttribute('data-symptom');
        if (this.selectedSymptoms.has(symptom)) {
          this.selectedSymptoms.delete(symptom);
          chip.classList.remove('selected');
        } else {
          this.selectedSymptoms.add(symptom);
          chip.classList.add('selected');
        }
      });
    });

    const sevPills = document.querySelectorAll('.severity-pill');
    sevPills.forEach(pill => {
      pill.addEventListener('click', () => {
        sevPills.forEach(p => p.classList.remove('selected-mild', 'selected-moderate', 'selected-severe'));
        const sev = pill.getAttribute('data-severity');
        this.selectedSeverity = sev;
        pill.classList.add(`selected-${sev.toLowerCase()}`);
      });
    });

    const fileInput = document.getElementById('report-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.uploadedReportPhotos.push(event.target.result);
            this.renderReportPhotoPreviews();
          };
          reader.readAsDataURL(file);
        });
      });
    }

    const form = document.getElementById('citizen-report-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const symptomsArr = Array.from(this.selectedSymptoms);
        if (symptomsArr.length === 0) symptomsArr.push('Fever');

        const category = document.getElementById('report-category')?.value || 'General Health Issue';
        const duration = document.getElementById('report-duration')?.value || 2;
        const location = document.getElementById('report-location')?.value || 'Zone C';
        const datetime = document.getElementById('report-datetime')?.value;
        const notes = document.getElementById('report-notes')?.value || '';

        const dateFormatted = datetime
          ? new Date(datetime).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : undefined;

        window.SehatState.submitHealthReport({
          category: category,
          symptoms: symptomsArr,
          severity: this.selectedSeverity,
          duration: parseInt(duration),
          location: location,
          date: dateFormatted,
          notes: notes,
          photos: [...this.uploadedReportPhotos]
        });

        this.uploadedReportPhotos = [];
        window.SehatUI.showToast('Report Submitted', 'Health report with attached evidence logged into timeline.', 'success');
        window.SehatRouter.navigate('/citizen/timeline');
      });
    }
  },

  renderReportPhotoPreviews() {
    const container = document.getElementById('report-photo-previews');
    if (!container) return;

    container.innerHTML = this.uploadedReportPhotos.map((photo, idx) => `
      <div class="photo-thumb-card">
        <img src="${photo}" alt="Uploaded Evidence">
        <button type="button" class="photo-thumb-remove" onclick="window.SehatApp.removeReportPhoto(${idx})">✕</button>
      </div>
    `).join('');
  },

  addSamplePhoto(url, label) {
    this.uploadedReportPhotos.push(url);
    this.renderReportPhotoPreviews();
    window.SehatUI.showToast('Sample Photo Added', `${label} added as supporting evidence.`, 'info');
  },

  removeReportPhoto(idx) {
    this.uploadedReportPhotos.splice(idx, 1);
    this.renderReportPhotoPreviews();
  },

  filterRecords(type) {
    this.selectedRecordFilter = type;
    this.renderCurrentView();
  },

  openPhotoPreviewModal(imgUrl, title) {
    let modal = document.getElementById('modal-photo-preview');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-photo-preview';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-container" style="max-width: 600px;">
          <div class="modal-header">
            <h3 id="photo-modal-title" style="font-size: 1.1rem;">Attached Photo Evidence</h3>
            <button class="icon-btn" onclick="window.SehatUI.closeModal('modal-photo-preview')">✕</button>
          </div>
          <div class="modal-body" style="text-align: center; padding: 1rem;">
            <img id="photo-modal-img" src="" style="max-width: 100%; max-height: 450px; border-radius: var(--radius-md); object-fit: contain; box-shadow: var(--shadow-md);">
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="window.SehatUI.closeModal('modal-photo-preview')">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('photo-modal-title').textContent = title || 'Document Evidence';
    document.getElementById('photo-modal-img').src = imgUrl;
    window.SehatUI.openModal('modal-photo-preview');
  },

  openAddRecordModal() {
    let modal = document.getElementById('modal-medical-record-form');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-medical-record-form';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 580px;">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem;">Upload / Add Medical Record</h3>
          <button class="icon-btn" onclick="window.SehatUI.closeModal('modal-medical-record-form')">✕</button>
        </div>
        <form id="add-record-modal-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Record Category *</label>
              <select id="modal-record-type" class="form-control" required>
                <option value="test_report">🧪 Test Report (Lab, Blood, Urine, Water)</option>
                <option value="doctor_analysis">👨‍⚕️ Doctor Analysis / Consultation Summary</option>
                <option value="prescription">💊 Medicine Prescription / Dosage Schedule</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Record Title *</label>
              <input type="text" id="modal-record-title" class="form-control" placeholder="e.g. Widal Test Report / ORS Prescription" required>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label class="form-label">Date *</label>
                <input type="text" id="modal-record-date" class="form-control" value="${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Doctor / Hospital Name</label>
                <input type="text" id="modal-record-provider" class="form-control" placeholder="e.g. Dr. Arishta Sharma (UCHC-4)" value="UCHC-4 Community Hospital">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Details / Clinical Observations / Dosage *</label>
              <textarea id="modal-record-details" class="form-control" rows="3" placeholder="Enter test values, medication instructions, clinical diagnosis..." required></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Attach Photo / Scan (Optional)</label>
              <div class="photo-upload-dropzone" onclick="document.getElementById('modal-record-photo-file').click()" style="padding: 1rem;">
                <input type="file" id="modal-record-photo-file" accept="image/*" style="display: none;">
                <div style="font-size: 1.25rem;">📷 Click to Upload Record Photo / Scan</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">JPG, PNG, PDF document scans</div>
              </div>
              <div id="modal-record-photo-preview" style="margin-top: 0.5rem;"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.SehatUI.closeModal('modal-medical-record-form')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Medical Record</button>
          </div>
        </form>
      </div>
    `;

    let attachedPhotoUrl = null;
    const fileInput = document.getElementById('modal-record-photo-file');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          attachedPhotoUrl = ev.target.result;
          document.getElementById('modal-record-photo-preview').innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface-subtle); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm);">
              <img src="${attachedPhotoUrl}" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover;">
              <span style="font-size: 0.8rem;">Photo attached ✓</span>
            </div>
          `;
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('add-record-modal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('modal-record-type').value;
      const title = document.getElementById('modal-record-title').value;
      const date = document.getElementById('modal-record-date').value;
      const provider = document.getElementById('modal-record-provider').value;
      const details = document.getElementById('modal-record-details').value;

      window.SehatState.addMedicalRecord({
        type,
        title,
        date,
        provider,
        details,
        photoUrl: attachedPhotoUrl
      });

      window.SehatUI.closeModal('modal-medical-record-form');
      window.SehatUI.showToast('Record Added', `${title} saved to Medical Records.`, 'success');
      this.renderCurrentView();
    });

    window.SehatUI.openModal('modal-medical-record-form');
  },

  openEditRecordModal(id) {
    const record = (window.SehatState.getState().medicalRecords || []).find(r => r.id === id);
    if (!record) return;

    let modal = document.getElementById('modal-medical-record-form');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-medical-record-form';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 580px;">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem;">Edit Medical Record</h3>
          <button class="icon-btn" onclick="window.SehatUI.closeModal('modal-medical-record-form')">✕</button>
        </div>
        <form id="edit-record-modal-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Record Title *</label>
              <input type="text" id="edit-modal-record-title" class="form-control" value="${record.title}" required>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label class="form-label">Date *</label>
                <input type="text" id="edit-modal-record-date" class="form-control" value="${record.date}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Doctor / Hospital Name</label>
                <input type="text" id="edit-modal-record-provider" class="form-control" value="${record.provider || ''}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Details / Clinical Notes *</label>
              <textarea id="edit-modal-record-details" class="form-control" rows="3" required>${record.details}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.SehatUI.closeModal('modal-medical-record-form')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('edit-record-modal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('edit-modal-record-title').value;
      const date = document.getElementById('edit-modal-record-date').value;
      const provider = document.getElementById('edit-modal-record-provider').value;
      const details = document.getElementById('edit-modal-record-details').value;

      window.SehatState.updateMedicalRecord(id, { title, date, provider, details });
      window.SehatUI.closeModal('modal-medical-record-form');
      window.SehatUI.showToast('Record Updated', `${title} updated successfully.`, 'success');
      this.renderCurrentView();
    });

    window.SehatUI.openModal('modal-medical-record-form');
  },

  handleCompleteAshaTask(taskId) {
    const success = window.SehatState.completeAshaTask(taskId);
    if (success) {
      window.SehatUI.showToast('Task Completed', 'Household round and visit verified successfully.', 'success');
      this.renderCurrentView();
    }
  },

  handleUpdateCitizenStatus(citizenId, status) {
    const success = window.SehatState.updateCitizenMonitoringStatus(citizenId, status);
    if (success) {
      window.SehatUI.showToast('Status Updated', `Monitoring status set to ${status}.`, 'info');
      this.renderCurrentView();
    }
  },

  openLogVisitModal(defaultCitizenId = 'C10291') {
    let modal = document.getElementById('modal-log-household-visit');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-log-household-visit';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    const citizens = window.SehatState.getState().userAccounts.filter(u => u.role === 'citizen');
    const selectedCit = citizens.find(c => c.id === defaultCitizenId) || citizens[0] || {};

    modal.innerHTML = `
      <div class="modal-container" style="max-width: 580px;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">📋 Log Household Health Visit</h3>
          <button class="icon-btn" onclick="window.SehatUI.closeModal('modal-log-household-visit')">✕</button>
        </div>
        <form id="log-household-visit-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Select Citizen / Household Head *</label>
              <select id="visit-citizen-select" class="form-control" required>
                ${citizens.map(c => `
                  <option value="${c.id}" ${c.id === defaultCitizenId ? 'selected' : ''}>${c.name} (${c.id}) — Family: ${c.familyId}</option>
                `).join('')}
              </select>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">Blood Pressure</label>
                <input type="text" id="visit-bp" class="form-control" value="120/80" required>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">Pulse (bpm)</label>
                <input type="text" id="visit-pulse" class="form-control" value="76" required>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">Temp (°F)</label>
                <input type="text" id="visit-temp" class="form-control" value="98.6" required>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">SpO2 (%)</label>
                <input type="text" id="visit-spo2" class="form-control" value="99" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Monitoring Status *</label>
              <select id="visit-status-select" class="form-control" required>
                <option value="Routine Monitoring" selected>Routine Monitoring (Stable)</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="Active Observation">Active Observation</option>
                <option value="High Risk">High Risk (Doctor Referral Advised)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Field Observations & Household Survey Notes *</label>
              <textarea id="visit-observations" class="form-control" rows="2" placeholder="Record hydration status, water hygiene, family symptom check..." required>Conducted routine household survey. Water source inspected. Vitals within stable parameters.</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Action Taken / Supplies Provided</label>
              <input type="text" id="visit-action" class="form-control" value="Provided ORS packets & chlorine disinfection tablets.">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.SehatUI.closeModal('modal-log-household-visit')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Visit Record →</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('log-household-visit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const citizenId = document.getElementById('visit-citizen-select').value;
      const citizen = citizens.find(c => c.id === citizenId) || {};
      const bp = document.getElementById('visit-bp').value;
      const pulse = document.getElementById('visit-pulse').value;
      const temp = document.getElementById('visit-temp').value;
      const spo2 = document.getElementById('visit-spo2').value;
      const monitoringStatus = document.getElementById('visit-status-select').value;
      const observations = document.getElementById('visit-observations').value;
      const actionTaken = document.getElementById('visit-action').value;

      window.SehatState.addHouseholdVisit({
        citizenId,
        citizenName: citizen.name || 'Citizen',
        familyId: citizen.familyId || 'FAM-10284',
        vitals: { bp, pulse, temp, spo2 },
        monitoringStatus,
        observations,
        actionTaken
      });

      window.SehatUI.closeModal('modal-log-household-visit');
      window.SehatUI.showToast('Household Visit Logged', `Recorded visit for ${citizen.name}.`, 'success');
      this.renderCurrentView();
    });

    window.SehatUI.openModal('modal-log-household-visit');
  },

  deleteRecord(id) {
    if (confirm('Are you sure you want to delete this medical record?')) {
      window.SehatState.deleteMedicalRecord(id);
      window.SehatUI.showToast('Record Deleted', 'Medical record removed.', 'info');
      this.renderCurrentView();
    }
  },

  bindAshaEvents() {
    // 1. Verification Modal Submit
    const ashaForm = document.getElementById('asha-verify-form');
    if (ashaForm) {
      ashaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const zoneId = document.getElementById('verify-zone-id').value || 'Zone C';
        const outcome = document.querySelector('input[name="verify-outcome"]:checked')?.value || 'Signal Verified';
        const notes = document.getElementById('verify-field-notes').value || '';
        const followUp = document.getElementById('verify-followup-status').value || 'High Priority Sanitation Check';

        window.SehatState.recordAshaVerification(zoneId, {
          outcome: outcome,
          fieldNotes: notes,
          followUpStatus: followUp
        });

        window.SehatUI.closeAllModals();
        window.SehatUI.showToast('Verification Recorded', `Zone ${zoneId} verified as ${outcome}.`, 'success');
        this.renderCurrentView();
      });
    }

    // 2. Symptom / Cluster Report Form Submit
    const reportForm = document.getElementById('asha-report-symptom-form');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const citizenId = document.getElementById('asha-report-citizen').value;
        const zone = document.getElementById('asha-report-zone').value;
        const severity = document.getElementById('asha-report-severity').value;
        const duration = document.getElementById('asha-report-duration').value;
        const description = document.getElementById('asha-report-description').value;

        const checkedSymptoms = Array.from(document.querySelectorAll('input[name="asha-symptoms"]:checked')).map(cb => cb.value);

        const citizens = window.SehatState.getState().userAccounts.filter(u => u.role === 'citizen');
        const citizen = citizens.find(c => c.id === citizenId) || {};

        window.SehatState.addHealthReport({
          citizenId,
          citizenName: citizen.name || 'Community Member',
          familyId: citizen.familyId || 'FAM-10284',
          zone,
          symptoms: checkedSymptoms.length > 0 ? checkedSymptoms : ['Fever', 'Diarrhea'],
          severity,
          description: `${description} (Duration: ${duration})`
        });

        window.SehatUI.showToast('Report Submitted', 'Community health issue logged to surveillance engine.', 'success');
        window.SehatRouter.navigate('/asha/alerts');
      });
    }

    // 3. Citizen Live Search Binding
    const searchInput = document.getElementById('asha-citizen-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.ashaCitizenSearchQuery = e.target.value;
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => {
          this.renderCurrentView();
        }, 300);
      });
    }
  },

  bindAdminEvents() {
    setTimeout(() => {
      if (window.SehatCharts) {
        window.SehatCharts.renderTrendChart('epidemiological-trend-canvas', '7d');
        window.SehatCharts.renderAreaBarChart('area-comparison-container');
      }
      if (window.SehatMap) {
        window.SehatMap.init('community-map');
      }
    }, 50);
  },

  bindProfileEvents() {
    const photoInput = document.getElementById('profile-photo-file-input');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            window.SehatState.updateProfilePhoto(dataUrl);
            window.SehatUI.showToast('Profile Photo Updated', 'Your new profile avatar is now active across all dashboards.', 'success');
            this.renderCurrentView();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const user = window.SehatState.currentUser || window.SehatState.getState().users.citizen || {};
    const stateVal = user.state || 'Uttar Pradesh';
    const districtVal = user.district || 'Fatehpur';
    const blockVal = user.block || 'Teliyani';

    if (window.SehatLocations) {
      window.SehatLocations.bindLocationDropdowns({
        stateSelectId: 'edit-state',
        districtSelectId: 'edit-district',
        blockSelectId: 'edit-block',
        initial: { state: stateVal, district: districtVal, block: blockVal }
      });
    }

    const editForm = document.getElementById('profile-edit-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('edit-name').value;
        const mobile = document.getElementById('edit-mobile').value;
        const email = document.getElementById('edit-email').value;
        const dob = document.getElementById('edit-dob')?.value;
        const gender = document.getElementById('edit-gender')?.value;
        const emergencyContact = document.getElementById('edit-emergency')?.value;
        const address = document.getElementById('edit-address')?.value;
        const country = 'India';
        const state = document.getElementById('edit-state')?.value || '';
        const district = document.getElementById('edit-district')?.value || '';
        const block = document.getElementById('edit-block')?.value || '';

        // Validate location
        if (window.SehatLocations && state && district) {
          const locVal = window.SehatLocations.validateLocation(state, district, block);
          if (!locVal.valid) {
            window.SehatUI.showToast('Invalid Location', locVal.error, 'error');
            return;
          }
        }

        const village = document.getElementById('edit-village')?.value || '';
        window.SehatState.updateUserProfile({
          name, mobile, email, dob, gender, emergencyContact, address,
          village, ward: village, country, state, district, block
        });
        window.SehatUI.showToast('Profile Saved Successfully', 'Redirecting to your main dashboard...', 'success');

        // Automatically navigate back to Main Dashboard and re-render
        const currentRole = window.SehatState.getCurrentRole() || user.role || 'citizen';
        setTimeout(() => {
          window.SehatRouter.navigate(`/${currentRole}/dashboard`);
          this.renderCurrentView();
        }, 350);
      });
    }
  },

  openEditProfileModal() {
    const user = window.SehatState.getCurrentUser() || {};
    const role = window.SehatState.getCurrentRole() || user.role || 'citizen';
    window.SehatRouter.navigate(`/${role}/profile`);
  },

  async switchAccount(email, password, role) {
    window.SehatUI.showToast('Switching Role', `Authenticating as ${role.toUpperCase()}...`, 'info');
    try {
      const res = await window.SehatState.login(email, password, role);
      if (res && res.authenticated) {
        window.SehatUI.showToast('Role Switched', `Logged in as ${res.user.name} (${role.toUpperCase()})`, 'success');
        window.SehatRouter.navigate(`/${role}/dashboard`);
        this.renderCurrentView();
      } else {
        const defaultUser = window.SehatState.getState().users[role];
        window.SehatState.hydrateGoogleSession({ role, user: defaultUser });
        window.SehatUI.showToast('Role Switched', `Active profile: ${defaultUser?.name || role.toUpperCase()}`, 'success');
        window.SehatRouter.navigate(`/${role}/dashboard`);
        this.renderCurrentView();
      }
    } catch (err) {
      console.warn('Switch account fallback:', err);
      const defaultUser = window.SehatState.getState().users[role];
      window.SehatState.hydrateGoogleSession({ role, user: defaultUser });
      window.SehatRouter.navigate(`/${role}/dashboard`);
      this.renderCurrentView();
    }
  }
};

// Start application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.SehatApp.init();
});
