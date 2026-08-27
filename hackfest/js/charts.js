/**
 * Sehat Setu — Responsive Analytics & SVG Charting Module
 * Zero-dependency, ultra-fast canvas & SVG charts tailored for healthcare surveillance.
 */

window.SehatCharts = {
  /**
   * Generates SVG markup for the Risk Score Ring
   * @param {number} score - 0 to 100
   * @param {number} size - diameter in pixels
   * @param {number} strokeWidth - stroke thickness
   */
  renderRiskRingSVG(score, size = 120, strokeWidth = 8) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let riskClass = 'normal';
    let riskLabel = 'NORMAL';
    if (score > 75) {
      riskClass = 'high';
      riskLabel = 'HIGH RISK';
    } else if (score > 50) {
      riskClass = 'alert';
      riskLabel = 'ALERT';
    } else if (score > 30) {
      riskClass = 'watch';
      riskLabel = 'WATCH';
    }

    return `
      <div class="risk-ring-container" style="width: ${size}px; height: ${size}px;">
        <svg class="risk-ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle class="risk-ring-bg" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke-width="${strokeWidth}" />
          <circle class="risk-ring-progress ${riskClass}" cx="${size / 2}" cy="${size / 2}" r="${radius}" 
            stroke-width="${strokeWidth}" 
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${offset}" />
        </svg>
        <div class="risk-ring-inner">
          <span class="risk-ring-score">${score}</span>
          <span class="risk-ring-label ${riskClass}">${riskLabel}</span>
        </div>
      </div>
    `;
  },

  /**
   * Renders Epidemiological Trend Chart on HTML5 Canvas
   */
  renderTrendChart(canvasId, timeRange = '7d') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.parentElement.clientWidth || 600);
    const height = (canvas.height = 240);

    ctx.clearRect(0, 0, width, height);

    // Time ranges data mock
    let labels, feverData, diarrheaData, coughData, baseline;
    if (timeRange === '7d') {
      labels = ['17 Aug', '18 Aug', '19 Aug', '20 Aug', '21 Aug', '22 Aug', '23 Aug'];
      feverData = [12, 14, 19, 25, 34, 42, 48];
      diarrheaData = [8, 9, 13, 18, 22, 29, 35];
      coughData = [10, 11, 12, 14, 15, 17, 18];
      baseline = 10;
    } else if (timeRange === '30d') {
      labels = ['W1', 'W2', 'W3', 'W4'];
      feverData = [45, 60, 95, 140];
      diarrheaData = [30, 42, 68, 110];
      coughData = [40, 48, 52, 60];
      baseline = 40;
    } else {
      labels = ['June', 'July', 'August'];
      feverData = [120, 180, 340];
      diarrheaData = [90, 130, 260];
      coughData = [150, 160, 190];
      baseline = 110;
    }

    const maxVal = Math.max(...feverData, ...diarrheaData, ...coughData, baseline) * 1.25;
    const padding = { top: 25, right: 30, bottom: 40, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Grid lines & Y labels
    const gridSteps = 4;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || '#e2e8f0';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridSteps; i++) {
      const yVal = Math.round((maxVal / gridSteps) * (gridSteps - i));
      const y = padding.top + (chartH / gridSteps) * i;
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(yVal.toString(), padding.left - 30, y + 3);
    }

    // Baseline Line (Dashed Red/Orange)
    const baselineY = padding.top + chartH - (baseline / maxVal) * chartH;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, baselineY);
    ctx.lineTo(width - padding.right, baselineY);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Historical Baseline (' + baseline + ')', width - padding.right - 140, baselineY - 6);
    ctx.restore();

    // Helper to draw a line series
    function drawSeries(data, color, fill = false) {
      const stepX = chartW / (data.length - 1);
      ctx.beginPath();
      data.forEach((val, idx) => {
        const x = padding.left + idx * stepX;
        const y = padding.top + chartH - (val / maxVal) * chartH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (fill) {
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = color.replace(')', ', 0.08)').replace('rgb', 'rgba');
        ctx.fill();
      }

      // Draw points
      data.forEach((val, idx) => {
        const x = padding.left + idx * stepX;
        const y = padding.top + chartH - (val / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Draw Symptom Series
    drawSeries(coughData, '#0d9488'); // Teal for cough
    drawSeries(diarrheaData, '#f97316'); // Orange for diarrhea
    drawSeries(feverData, '#ef4444', true); // Red filled for fever spike

    // X Axis Labels
    const stepX = chartW / (labels.length - 1);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b';
    ctx.textAlign = 'center';
    labels.forEach((label, idx) => {
      const x = padding.left + idx * stepX;
      ctx.fillText(label, x, height - 12);
    });
  },

  /**
   * Renders Area Comparison Bar Chart
   */
  renderAreaBarChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const zones = window.SehatState.getState().zones;
    const zoneKeys = Object.keys(zones);

    let html = '<div style="display: flex; flex-direction: column; gap: 0.85rem;">';

    zoneKeys.forEach(key => {
      const z = zones[key];
      const maxReports = 40;
      const pct = Math.min(100, (z.reportsCount / maxReports) * 100);
      const isHigh = z.riskScore > 75;
      const barColor = isHigh ? 'var(--risk-high-border)' : z.riskScore > 50 ? 'var(--risk-alert-border)' : z.riskScore > 30 ? 'var(--risk-watch-border)' : 'var(--accent-500)';

      html += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
            <span style="font-weight: 600;">${z.name}</span>
            <span style="font-family: var(--font-mono); font-weight: 700;">${z.reportsCount} reports (Baseline: ${z.baseline})</span>
          </div>
          <div style="height: 10px; background: var(--bg-surface-subtle); border-radius: 99px; overflow: hidden; border: 1px solid var(--border-subtle);">
            <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 99px; transition: width 0.6s ease;"></div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }
};
