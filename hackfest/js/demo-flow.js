/**
 * Sehat Setu — Hackathon 20-Step Guided Demo Flow Controller
 * Guides judges & presenters seamlessly across the entire connected healthcare cycle.
 */

window.SehatDemoFlow = {
  currentStep: 1,
  totalSteps: 20,

  steps: [
    {
      step: 1,
      title: '1. Launchpad: Citizen Login',
      desc: 'Switch to Citizen Portal (C10291 - Rahul Sharma).',
      action: () => {
        window.SehatState.setRole('citizen', 'dashboard');
        window.SehatUI.showToast('Demo Step 1', 'Citizen C10291 portal loaded.', 'info');
      }
    },
    {
      step: 2,
      title: '2. Citizen Dashboard',
      desc: 'Explore Routine Monitoring status and recent activity.',
      action: () => {
        window.SehatState.setRole('citizen', 'dashboard');
      }
    },
    {
      step: 3,
      title: '3. Family Hub & Household Signal',
      desc: 'Inspect Family FAM-10284 cards & multi-member signal.',
      action: () => {
        window.SehatState.setRole('citizen', 'family');
        window.SehatUI.showToast('Household Signal', '2 reports in last 7 days detected for FAM-10284.', 'warning');
      }
    },
    {
      step: 4,
      title: '4. Report Health Issue',
      desc: 'Open Report form and enter symptom cluster (Fever, Gastro).',
      action: () => {
        window.SehatState.setRole('citizen', 'report');
      }
    },
    {
      step: 5,
      title: '5. Submit & Check Timeline',
      desc: 'Simulate citizen submission and view updated timeline.',
      action: () => {
        window.SehatState.submitHealthReport({
          symptoms: ['Fever', 'Diarrhea', 'Nausea'],
          severity: 'Moderate',
          duration: 2,
          location: 'Zone C',
          notes: 'Sudden onset fever with stomach cramps after drinking local water.'
        });
        window.SehatState.setRole('citizen', 'timeline');
        window.SehatUI.showToast('Report Submitted', 'Health timeline updated with citizen entry.', 'success');
      }
    },
    {
      step: 6,
      title: '6. Doctor Login (DR-1004)',
      desc: 'Switch to Doctor Dashboard (Dr. Arishta Sharma).',
      action: () => {
        window.SehatState.setRole('doctor', 'dashboard');
        window.SehatUI.showToast('Doctor Portal', 'Logged in as Dr. Arishta Sharma (UCHC-4).', 'info');
      }
    },
    {
      step: 7,
      title: '7. Patient Review Queue',
      desc: 'Inspect patient C10291 (Rahul Sharma) in consultation list.',
      action: () => {
        window.SehatState.setRole('doctor', 'patients');
      }
    },
    {
      step: 8,
      title: '8. Record Doctor Consultation',
      desc: 'Add clinical notes, advice & 24 Aug follow-up date.',
      action: () => {
        window.SehatState.recordDoctorConsultation('C10291', {
          clinicalNotes: 'Acute febrile gastroenteritis symptom cluster. Documented for community pattern surveillance.',
          advice: 'Strict ORS hydration, avoid unboiled tap water, paracetamol TDS.',
          followUpDate: '24 August'
        });
        window.SehatState.setRole('citizen', 'timeline');
        window.SehatUI.showToast('Consultation Synced', 'Doctor consultation and clinical notes added to Citizen Timeline.', 'success');
      }
    },
    {
      step: 9,
      title: '9. ASHA Worker Login',
      desc: 'Switch to mobile-optimized ASHA portal (Sunita Devi, ASHA-204).',
      action: () => {
        window.SehatState.setRole('asha', 'dashboard');
        window.SehatUI.showToast('ASHA Portal', 'Logged in as Sunita Devi (Zone C Field Worker).', 'info');
      }
    },
    {
      step: 10,
      title: '10. Household Follow-ups',
      desc: 'View assigned high-priority household tasks for FAM-10284.',
      action: () => {
        window.SehatState.setRole('asha', 'followups');
      }
    },
    {
      step: 11,
      title: '11. Community Alert Stream',
      desc: 'Inspect Zone C early warning triggered by AI engine.',
      action: () => {
        window.SehatState.setRole('asha', 'warnings');
      }
    },
    {
      step: 12,
      title: '12. Inspect Zone C Details',
      desc: 'Open Zone C community risk profile modal.',
      action: () => {
        window.SehatUI.openZoneDetailModal('Zone C');
      }
    },
    {
      step: 13,
      title: '13. View Risk Score (84/100)',
      desc: 'Close modal and inspect Zone C Risk Score Ring.',
      action: () => {
        window.SehatUI.closeAllModals();
        window.SehatState.setRole('asha', 'area');
      }
    },
    {
      step: 14,
      title: '14. Explainable AI Intelligence',
      desc: 'Switch to Admin / Surveillance to review Explainable AI reasons.',
      action: () => {
        window.SehatState.setRole('admin', 'analytics');
        window.SehatUI.showToast('Explainable AI', '4 distinct risk factors identified above baseline.', 'info');
      }
    },
    {
      step: 15,
      title: '15. Early Warnings Hub',
      desc: 'View Admin Early Warning action recommendation for Zone C.',
      action: () => {
        window.SehatState.setRole('admin', 'warnings');
      }
    },
    {
      step: 16,
      title: '16. ASHA Field Verification',
      desc: 'Complete field verification modal as ASHA worker.',
      action: () => {
        window.SehatState.setRole('asha', 'warnings');
        window.SehatState.recordAshaVerification('Zone C', {
          outcome: 'Signal Verified',
          fieldNotes: 'Field survey confirmed localized gastrointestinal cluster in Sector 9 lane. Municipal pipe leakage reported near overhead tank.',
          followUpStatus: 'High Priority Sanitation Intervention Needed',
          workerId: 'Sunita Devi (ASHA-204)'
        });
        window.SehatUI.showToast('Field Verified', 'ASHA Sunita Devi confirmed anomalous signal. Broadcasted to Admin.', 'success');
      }
    },
    {
      step: 17,
      title: '17. Admin Command Center',
      desc: 'Switch to Health Authority Command Center (ADMIN-001).',
      action: () => {
        window.SehatState.setRole('admin', 'dashboard');
        window.SehatUI.showToast('Command Center', 'Health Authority real-time dashboard loaded.', 'info');
      }
    },
    {
      step: 18,
      title: '18. Verified Alert Status',
      desc: 'Observe Zone C status updated to "Signal Verified by ASHA".',
      action: () => {
        window.SehatState.setRole('admin', 'warnings');
      }
    },
    {
      step: 19,
      title: '19. Interactive Map',
      desc: 'Explore geospatial heat clusters and zone polygons.',
      action: () => {
        window.SehatState.setRole('admin', 'map');
      }
    },
    {
      step: 20,
      title: '20. Epidemiological Analytics',
      desc: 'Review 7d/30d/90d symptom trends & environmental intelligence.',
      action: () => {
        window.SehatState.setRole('admin', 'analytics');
        window.SehatUI.showToast('Demo Complete', 'Full 20-step Sehat Setu cycle successfully demonstrated!', 'success');
      }
    }
  ],

  init() {
    this.renderStepperUI();
  },

  goToStep(stepNum) {
    if (stepNum < 1 || stepNum > this.totalSteps) return;
    this.currentStep = stepNum;
    const stepObj = this.steps.find(s => s.step === stepNum);
    if (stepObj) {
      stepObj.action();
    }
    this.renderStepperUI();
  },

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  },

  renderStepperUI() {
    const container = document.getElementById('demo-stepper-container');
    if (!container) return;

    const current = this.steps.find(s => s.step === this.currentStep) || this.steps[0];

    container.innerHTML = `
      <div class="demo-stepper-label">
        <span>⚡ DEMO STEPPER:</span>
        <span style="color: var(--text-main); font-weight: 700;">Step ${this.currentStep}/${this.totalSteps}</span>
      </div>

      <div class="demo-stepper-controls">
        <button class="btn btn-sm btn-secondary" onclick="window.SehatDemoFlow.prevStep()" ${this.currentStep === 1 ? 'disabled style="opacity:0.5;"' : ''}>← Prev</button>
        <span style="font-weight: 600; font-size: 0.8rem; color: var(--primary-700);">${current.title}</span>
        <button class="btn btn-sm btn-primary" onclick="window.SehatDemoFlow.nextStep()" ${this.currentStep === this.totalSteps ? 'disabled style="opacity:0.5;"' : ''}>Next Step →</button>
      </div>

      <div class="demo-stepper-actions">
        <button class="btn btn-sm btn-outline" onclick="window.SehatState.resetState(); window.SehatDemoFlow.goToStep(1);">🔄 Reset Demo</button>
      </div>
    `;
  }
};
