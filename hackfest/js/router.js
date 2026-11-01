/**
 * ============================================================================
 * SEHAT SETU — Client-Side Hash Router (SPA Navigator)
 * ============================================================================
 * 
 * HOW ROUTING WORKS:
 * 1. The browser URL uses hash fragments, e.g.:
 *    - http://127.0.0.1:3000/#/citizen/dashboard
 *    - http://127.0.0.1:3000/#/doctor/patients/C10291
 *    - http://127.0.0.1:3000/#/asha/follow-ups
 *    - http://127.0.0.1:3000/#/admin/dashboard
 * 2. On hashchange or load, handleRouting() extracts the route and parameters.
 * 3. Role enforcement checks if the authenticated user has access.
 * 4. State is updated (currentRole, currentTab, subView, params) and
 *    'ROUTE_CHANGED' is broadcast to re-render the view in app.js.
 * 
 * HOW TO ADD A NEW ROUTE:
 *  - Go to matchRoute(path) below.
 *  - Add an if statement matching your route, e.g.:
 *      if (normalized === '/citizen/my-new-feature') return { role: 'citizen', tab: 'new_feature', params: {} };
 *  - In js/app.js, handle the new tab in renderCitizenTabContent().
 * ============================================================================
 */

class SehatRouter {
  constructor() {
    this.currentRoute = '';
    this.currentParams = {};

    // Listen to hash changes in browser address bar
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('load', () => this.handleRouting());
  }

  /**
   * Programmatically navigate to any hash route
   * @param {string} path - e.g. '/citizen/dashboard' or '#/doctor/patients'
   */
  navigate(path) {
    window.location.hash = path.startsWith('#') ? path : '#' + path;
  }

  /**
   * Evaluates the current URL hash, checks permissions, and notifies the app
   */
  handleRouting() {
    const rawHash = window.location.hash.slice(1) || '/landing';
    const [pathPart, queryPart] = rawHash.split('?');
    const path = pathPart.startsWith('/') ? pathPart : '/' + pathPart;

    const state = window.SehatState.getState();

    // 1. Direct external auth page redirects
    if (path === '/signup' || path === '/register') {
      window.location.href = 'signup.html';
      return;
    }
    if (path === '/login' || path === '/signin') {
      window.location.href = 'login.html';
      return;
    }

    // 2. Check matching routes and extract params
    let matched = this.matchRoute(path);

    if (!matched) {
      // Default fallback based on active role
      const defaultRole = state.currentRole || 'landing';
      if (defaultRole === 'doctor') {
        this.navigate('/doctor/dashboard');
      } else if (defaultRole === 'citizen') {
        this.navigate('/citizen/dashboard');
      } else if (defaultRole === 'asha') {
        this.navigate('/asha/dashboard');
      } else if (defaultRole === 'admin') {
        this.navigate('/admin/dashboard');
      } else {
        this.navigate('/landing');
      }
      return;
    }

    const { role, tab, subView, params } = matched;

    // The authenticated profile is the only source for portal access.
    const authenticatedUser = state.isAuthenticated && state.currentUser;
    if (role !== 'landing' && (!authenticatedUser || !['citizen', 'doctor', 'asha', 'admin'].includes(authenticatedUser.role))) {
      window.location.href = 'login.html?authError=role_missing';
      return;
    }
    if (role !== 'landing' && authenticatedUser.role !== role) {
      this.navigate(`/${authenticatedUser.role}/dashboard`);
      return;
    }
    if (role === 'landing' && authenticatedUser) {
      this.navigate(`/${authenticatedUser.role}/dashboard`);
      return;
    }

    this.currentRoute = path;
    const mergedParams = { ...(params || {}) };
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      for (const [key, val] of searchParams.entries()) {
        mergedParams[key] = val;
      }
    }
    this.currentParams = mergedParams;

    // 3. Synchronize State Store (Role, Tab and SubView)
    window.SehatState.state.currentRole = role;
    window.SehatState.state.currentTab = tab;
    window.SehatState.notify('ROUTE_CHANGED', { route: path, params: this.currentParams, subView, role, tab });
  }

  matchRoute(path) {
    // Normalize path trailing slash
    const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

    // -------------------------------------------------------------
    // CITIZEN ROUTES
    // -------------------------------------------------------------
    if (normalized === '/citizen/dashboard' || normalized === '/citizen') return { role: 'citizen', tab: 'dashboard', params: {} };
    if (normalized === '/citizen/profile') return { role: 'citizen', tab: 'profile', params: {} };
    if (normalized === '/citizen/report-health-issue' || normalized === '/citizen/report') return { role: 'citizen', tab: 'report', params: {} };
    if (normalized === '/citizen/medical-records' || normalized === '/citizen/records') return { role: 'citizen', tab: 'records', params: {} };
    if (normalized === '/citizen/consultations') return { role: 'citizen', tab: 'consultations', params: {} };
    if (normalized === '/citizen/prescriptions') return { role: 'citizen', tab: 'prescriptions', params: {} };
    if (normalized === '/citizen/referrals') return { role: 'citizen', tab: 'referrals', params: {} };
    if (normalized === '/citizen/health-alerts' || normalized === '/citizen/alerts' || normalized === '/citizen/timeline') return { role: 'citizen', tab: 'timeline', params: {} };
    if (normalized === '/citizen/notifications') return { role: 'citizen', tab: 'notifications', params: {} };
    if (normalized === '/citizen/family') return { role: 'citizen', tab: 'family', params: {} };

    // -------------------------------------------------------------
    // DOCTOR ROUTES
    // -------------------------------------------------------------
    if (normalized === '/doctor/dashboard' || normalized === '/doctor') return { role: 'doctor', tab: 'dashboard', subView: 'queue', params: {} };
    if (normalized === '/doctor/profile') return { role: 'doctor', tab: 'profile', params: {} };
    if (normalized === '/doctor/patients') return { role: 'doctor', tab: 'dashboard', subView: 'patients_list', params: {} };
    if (normalized === '/doctor/register-patient' || normalized === '/doctor/register') return { role: 'doctor', tab: 'dashboard', subView: 'register_patient', params: {} };
    if (normalized === '/doctor/referrals') return { role: 'doctor', tab: 'dashboard', subView: 'referrals', params: {} };
    if (normalized === '/doctor/consultations') return { role: 'doctor', tab: 'dashboard', subView: 'consultations_list', params: {} };
    if (normalized === '/doctor/medical-records' || normalized === '/doctor/records') return { role: 'doctor', tab: 'dashboard', subView: 'patients_list', params: { filter: 'records' } };
    if (normalized === '/doctor/performance') return { role: 'doctor', tab: 'dashboard', subView: 'performance', params: {} };
    if (normalized === '/doctor/reviews') return { role: 'doctor', tab: 'dashboard', subView: 'performance', params: { view: 'reviews' } };
    if (normalized === '/doctor/notifications') return { role: 'doctor', tab: 'dashboard', subView: 'notifications', params: {} };

    // Doctor Parameterized Routes
    let match = normalized.match(/^\/doctor\/patients\/([^\/]+)\/history$/);
    if (match) return { role: 'doctor', tab: 'dashboard', subView: 'patient_profile', params: { citizenId: match[1], subTab: 'history' } };

    match = normalized.match(/^\/doctor\/patients\/([^\/]+)$/);
    if (match) return { role: 'doctor', tab: 'dashboard', subView: 'patient_profile', params: { citizenId: match[1], subTab: 'overview' } };

    match = normalized.match(/^\/doctor\/consultation\/new\/([^\/]+)$/);
    if (match) return { role: 'doctor', tab: 'dashboard', subView: 'new_consultation', params: { citizenId: match[1] } };

    match = normalized.match(/^\/doctor\/consultations\/([^\/]+)$/);
    if (match) return { role: 'doctor', tab: 'dashboard', subView: 'consultation_detail', params: { id: match[1] } };

    // -------------------------------------------------------------
    // ASHA WORKER ROUTES
    // -------------------------------------------------------------
    if (normalized === '/asha/dashboard' || normalized === '/asha') return { role: 'asha', tab: 'dashboard', subView: 'overview', params: {} };
    if (normalized === '/asha/profile') return { role: 'asha', tab: 'profile', params: {} };
    if (normalized === '/asha/citizens' || normalized === '/asha/assigned-citizens') return { role: 'asha', tab: 'dashboard', subView: 'citizens', params: {} };
    if (normalized === '/asha/health-visits' || normalized === '/asha/visits') return { role: 'asha', tab: 'dashboard', subView: 'visits', params: {} };
    if (normalized === '/asha/report-health-issue' || normalized === '/asha/report') return { role: 'asha', tab: 'dashboard', subView: 'report_issue', params: {} };
    if (normalized === '/asha/referrals') return { role: 'asha', tab: 'dashboard', subView: 'referrals', params: {} };
    if (normalized === '/asha/follow-ups' || normalized === '/asha/followups') return { role: 'asha', tab: 'dashboard', subView: 'followups', params: {} };
    if (normalized === '/asha/alerts' || normalized === '/asha/health-alerts') return { role: 'asha', tab: 'dashboard', subView: 'alerts', params: {} };
    if (normalized === '/asha/notifications') return { role: 'asha', tab: 'dashboard', subView: 'notifications', params: {} };

    match = normalized.match(/^\/asha\/citizens\/([^\/]+)$/);
    if (match) return { role: 'asha', tab: 'dashboard', subView: 'citizen_detail', params: { citizenId: match[1] } };

    // -------------------------------------------------------------
    // ADMIN SURVEILLANCE COMMAND ROUTES
    // -------------------------------------------------------------
    if (normalized === '/admin/dashboard' || normalized === '/admin') return { role: 'admin', tab: 'dashboard', subView: 'command', params: {} };
    if (normalized === '/admin/citizens') return { role: 'admin', tab: 'dashboard', subView: 'citizens', params: {} };
    if (normalized === '/admin/doctors') return { role: 'admin', tab: 'dashboard', subView: 'doctors', params: {} };
    if (normalized === '/admin/asha-workers' || normalized === '/admin/workers') return { role: 'admin', tab: 'dashboard', subView: 'asha_workers', params: {} };
    if (normalized === '/admin/health-reports' || normalized === '/admin/reports') return { role: 'admin', tab: 'dashboard', subView: 'health_reports', params: {} };
    if (normalized === '/admin/consultations') return { role: 'admin', tab: 'dashboard', subView: 'consultations', params: {} };
    if (normalized === '/admin/referrals') return { role: 'admin', tab: 'dashboard', subView: 'referrals', params: {} };
    if (normalized === '/admin/health-alerts' || normalized === '/admin/alerts') return { role: 'admin', tab: 'dashboard', subView: 'health_alerts', params: {} };
    if (normalized === '/admin/analytics') return { role: 'admin', tab: 'dashboard', subView: 'analytics', params: {} };
    if (normalized === '/admin/system-activity' || normalized === '/admin/activity') return { role: 'admin', tab: 'dashboard', subView: 'system_activity', params: {} };
    if (normalized === '/admin/notifications') return { role: 'admin', tab: 'dashboard', subView: 'notifications', params: {} };
    if (normalized === '/admin/settings' || normalized === '/admin/profile') return { role: 'admin', tab: 'profile', params: {} };

    // Landing & Root fallback
    if (normalized === '/landing' || normalized === '/') return { role: 'landing', tab: 'dashboard', params: {} };

    return null;
  }
}

window.SehatRouter = new SehatRouter();
