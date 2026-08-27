/**
 * Sehat Setu — UI Components & Modal Management
 * Renders dynamic views, handles modal overlays, toasts, and reactive dom binding.
 */

window.SehatUI = {
  // Toast Notification System
  showToast(title, message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'alert') icon = '🚨';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content" style="flex: 1;">
        <h5>${title}</h5>
        <p>${message}</p>
      </div>
      <button style="color: var(--text-muted); font-size: 1.1rem; line-height: 1;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    // Trigger slide-in
    setTimeout(() => toast.classList.add('show'), 20);

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Modal Manager
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  },

  // Zone Detail Modal
  openZoneDetailModal(zoneKey) {
    const state = window.SehatState.getState();
    const zone = state.zones[zoneKey];
    if (!zone) return;

    const modalBody = document.getElementById('zone-modal-body');
    const modalTitle = document.getElementById('zone-modal-title');
    
    if (modalTitle) {
      modalTitle.textContent = `${zone.name} — Community Risk Profile`;
    }

    if (modalBody) {
      const isHigh = zone.riskScore > 75;
      const isWatch = zone.riskScore > 30 && zone.riskScore <= 50;
      const badgeClass = isHigh ? 'badge-high' : isWatch ? 'badge-watch' : 'badge-normal';

      modalBody.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <span class="badge ${badgeClass}"><span class="badge-dot"></span> ${zone.riskLevel}</span>
            <span style="font-family: var(--font-mono); font-size: 0.8rem; margin-left: 0.5rem; color: var(--text-muted);">
              Status: ${zone.status}
            </span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Community Risk Score</div>
            <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 800; color: ${isHigh ? 'var(--risk-high-border)' : 'var(--text-main)'};">
              ${zone.riskScore} / 100
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
          <div class="stat-card" style="padding: 0.85rem;">
            <div class="stat-label">Recent Reports</div>
            <div class="stat-value" style="font-size: 1.35rem;">${zone.reportsCount}</div>
            <div class="stat-meta">Historical Baseline: ${zone.baseline}</div>
          </div>
          <div class="stat-card" style="padding: 0.85rem;">
            <div class="stat-label">ASHA Assigned</div>
            <div style="font-size: 0.95rem; font-weight: 700; margin-top: 0.25rem;">${zone.ashaWorker}</div>
            <div class="stat-meta">Surveillance Ward Active</div>
          </div>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Identified Risk Signals</h4>
          <ul style="padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.35rem;">
            ${(zone.signals || [
              'Reports within expected seasonal distribution',
              'No household clustering identified'
            ]).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        ${zone.verificationDetails && zone.verificationDetails.status === 'Verified' ? `
          <div style="background: var(--risk-normal-bg); border: 1px solid var(--risk-normal-border); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1rem;">
            <h5 style="color: var(--risk-normal-text); font-size: 0.85rem; margin-bottom: 0.25rem;">✓ Field Verification Completed</h5>
            <p style="font-size: 0.8rem; color: var(--text-main);">
              <strong>Outcome:</strong> ${zone.verificationDetails.outcome}<br>
              <strong>Verified By:</strong> ${zone.verificationDetails.verifiedBy} (${zone.verificationDetails.verificationDate})<br>
              <strong>Notes:</strong> ${zone.verificationDetails.fieldNotes || 'Standard field survey recorded.'}
            </p>
          </div>
        ` : `
          <div class="privacy-banner" style="margin-bottom: 1rem;">
            <span>ℹ️ Verification Pending: ASHA field verification recommended before high-level community escalation.</span>
          </div>
        `}
      `;
    }

    this.openModal('modal-zone-detail');
  },

  // Open Doctor Consultation Modal for a specific patient
  openDoctorConsultationModal(patientId) {
    const state = window.SehatState.getState();
    const patient = state.doctorPatients.find(p => p.id === patientId) || state.users.citizen;

    const patientTitle = document.getElementById('consult-patient-title');
    const patientDetails = document.getElementById('consult-patient-details');
    const patientIdInput = document.getElementById('consult-patient-id');

    if (patientTitle) patientTitle.textContent = `Consultation — ${patient.name} (${patient.id})`;
    if (patientIdInput) patientIdInput.value = patient.id;

    if (patientDetails) {
      patientDetails.innerHTML = `
        <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1rem; font-size: 0.85rem;">
          <div><strong>Family ID:</strong> <span style="font-family: var(--font-mono);">${patient.familyId || 'FAM-10284'}</span> | <strong>Zone:</strong> ${patient.zone || 'Zone C'}</div>
          <div style="margin-top: 0.25rem;"><strong>Reported Symptoms:</strong> ${(patient.recentSymptoms || ['Fever', 'Diarrhea']).join(', ')} (${patient.severity || 'Moderate'})</div>
        </div>
      `;
    }

    this.openModal('modal-doctor-consultation');
  },

  // Open ASHA Field Verification Modal
  openAshaVerificationModal(zoneKey = 'Zone C') {
    const state = window.SehatState.getState();
    const zone = state.zones[zoneKey];

    const titleElem = document.getElementById('verify-zone-title');
    const zoneKeyInput = document.getElementById('verify-zone-id');

    if (titleElem) titleElem.textContent = `Field Verification — ${zoneKey}`;
    if (zoneKeyInput) zoneKeyInput.value = zoneKey;

    this.openModal('modal-asha-verification');
  }
};
