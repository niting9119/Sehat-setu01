/**
 * Sehat Setu — Interactive Community Health Map Module
 * Combines Leaflet.js geospatial mapping with an interactive high-tech Zone Grid fallback.
 */

window.SehatMap = {
  leafletMapInstance: null,
  zoneLayers: {},

  init(containerId = 'community-map') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check if Leaflet is available in window
    if (typeof L !== 'undefined') {
      this.initLeafletMap(containerId);
    } else {
      this.initZoneGridFallback(containerId);
    }
  },

  initLeafletMap(containerId) {
    if (this.leafletMapInstance) {
      this.leafletMapInstance.remove();
    }

    // Centered around demo urban district coordinates
    const map = L.map(containerId, {
      zoomControl: false,
      attributionControl: false
    }).setView([28.6139, 77.2090], 12);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark/Light aware tile layer
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(map);

    this.leafletMapInstance = map;

    // Plot Zone Polygons / Circles
    const zonesData = [
      { id: 'Zone A', lat: 28.5800, lng: 77.1800, radius: 1600, color: '#10b981', score: 18, level: 'NORMAL' },
      { id: 'Zone B', lat: 28.6300, lng: 77.2400, radius: 1800, color: '#f59e0b', score: 42, level: 'WATCH' },
      { id: 'Zone C', lat: 28.6500, lng: 77.1950, radius: 2100, color: '#ef4444', score: 84, level: 'HIGH' },
      { id: 'Zone D', lat: 28.5900, lng: 77.2600, radius: 1700, color: '#10b981', score: 22, level: 'NORMAL' },
      { id: 'Zone E', lat: 28.6100, lng: 77.2150, radius: 1900, color: '#f97316', score: 58, level: 'ALERT' }
    ];

    zonesData.forEach(z => {
      const circle = L.circle([z.lat, z.lng], {
        color: z.color,
        fillColor: z.color,
        fillOpacity: z.score > 75 ? 0.35 : 0.2,
        weight: z.score > 75 ? 3 : 1.5,
        radius: z.radius
      }).addTo(map);

      // Custom marker icon with score
      const iconHtml = `
        <div style="
          background: ${z.color}; 
          color: #fff; 
          font-family: 'IBM Plex Mono', monospace; 
          font-weight: 700; 
          font-size: 11px; 
          padding: 3px 8px; 
          border-radius: 99px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid #fff;
          white-space: nowrap;
          cursor: pointer;
        ">
          ${z.id} (${z.score})
        </div>
      `;

      const markerIcon = L.divIcon({
        html: iconHtml,
        className: 'zone-map-marker',
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      });

      const marker = L.marker([z.lat, z.lng], { icon: markerIcon }).addTo(map);

      const clickHandler = () => {
        window.SehatUI.openZoneDetailModal(z.id);
      };

      circle.on('click', clickHandler);
      marker.on('click', clickHandler);
    });

    // Auto fit bounds slightly
    map.setView([28.6250, 77.2100], 12);
  },

  initZoneGridFallback(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const zones = window.SehatState.getState().zones;
    let gridHtml = `
      <div style="padding: 1.5rem; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; text-align: center;">
          Interactive Surveillance Grid View (Click any zone to inspect risk intelligence)
        </div>
        <div class="zone-interactive-grid">
    `;

    Object.keys(zones).forEach(key => {
      const z = zones[key];
      const isHigh = z.riskScore > 75;
      const isWatch = z.riskScore > 30 && z.riskScore <= 50;
      const isAlert = z.riskScore > 50 && z.riskScore <= 75;
      const badgeClass = isHigh ? 'badge-high' : isAlert ? 'badge-alert' : isWatch ? 'badge-watch' : 'badge-normal';

      gridHtml += `
        <div class="zone-tile ${isHigh ? 'zone-high' : isWatch ? 'zone-watch' : ''}" onclick="window.SehatUI.openZoneDetailModal('${key}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <h4 style="font-size: 1rem;">${key}</h4>
            <span class="badge ${badgeClass}">${z.riskLevel}</span>
          </div>
          <div style="font-size: 1.5rem; font-family: var(--font-mono); font-weight: 800; margin-bottom: 0.35rem;">
            ${z.riskScore}<span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">/100</span>
          </div>
          <div style="font-size: 0.775rem; color: var(--text-muted);">
            Recent Reports: <strong style="color: var(--text-main);">${z.reportsCount}</strong> (Baseline: ${z.baseline})
          </div>
          <div style="font-size: 0.725rem; color: var(--primary-600); margin-top: 0.5rem; font-weight: 600;">
            Click to View Signals →
          </div>
        </div>
      `;
    });

    gridHtml += `</div></div>`;
    container.innerHTML = gridHtml;
  }
};
