/**
 * Sehat Setu — Interactive Real Google Maps & Community Health Geospatial Surveillance
 * Integrates Real Google Maps (Street, Satellite/Hybrid, Terrain) with Outbreak Risk Intelligence
 */

window.SehatMap = {
  leafletMapInstance: null,
  activeLayer: null,
  layers: {},
  zoneLayers: [],

  init(containerId = 'community-map') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof L !== 'undefined') {
      this.initGoogleMap(containerId);
    } else {
      this.initZoneGridFallback(containerId);
    }
  },

  initGoogleMap(containerId) {
    if (this.leafletMapInstance) {
      try {
        this.leafletMapInstance.remove();
      } catch (e) {}
      this.leafletMapInstance = null;
    }

    // Centered around District Surveillance Headquarters (coordinates in India)
    const map = L.map(containerId, {
      zoomControl: false,
      attributionControl: true
    }).setView([28.6139, 77.2090], 12);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // ------------------------------------------------------------------------
    // REAL GOOGLE MAPS TILE LAYERS
    // ------------------------------------------------------------------------
    this.layers = {
      googleStreets: L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps — Sehat Setu Surveillance'
      }),
      googleHybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps Satellite — Sehat Setu'
      }),
      googleTerrain: L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps Terrain — Sehat Setu'
      })
    };

    // Default: Google Streets
    this.activeLayer = this.layers.googleStreets;
    this.activeLayer.addTo(map);
    this.leafletMapInstance = map;

    // ------------------------------------------------------------------------
    // REAL GOOGLE MAPS CONTROLS TOOLBAR
    // ------------------------------------------------------------------------
    const customControl = L.control({ position: 'topright' });
    customControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'google-map-type-bar');
      div.style.background = 'var(--bg-surface, #ffffff)';
      div.style.padding = '5px 8px';
      div.style.borderRadius = '8px';
      div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      div.style.display = 'flex';
      div.style.gap = '4px';
      div.style.border = '1px solid var(--border-medium, #cbd5e1)';
      div.innerHTML = `
        <button id="btn-gmap-street" style="font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; border: none; background: #0d9488; color: #fff; cursor: pointer;">🗺️ Google Map</button>
        <button id="btn-gmap-satellite" style="font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;">🛰️ Satellite</button>
        <button id="btn-gmap-terrain" style="font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; cursor: pointer;">⛰️ Terrain</button>
      `;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    customControl.addTo(map);

    // Bind Layer Switchers
    setTimeout(() => {
      const bStreet = document.getElementById('btn-gmap-street');
      const bSat = document.getElementById('btn-gmap-satellite');
      const bTer = document.getElementById('btn-gmap-terrain');

      const resetBtns = () => {
        [bStreet, bSat, bTer].forEach(b => {
          if (b) {
            b.style.background = '#f8fafc';
            b.style.color = '#334155';
            b.style.border = '1px solid #cbd5e1';
          }
        });
      };

      if (bStreet) {
        bStreet.onclick = () => {
          map.removeLayer(this.activeLayer);
          this.activeLayer = this.layers.googleStreets;
          this.activeLayer.addTo(map);
          resetBtns();
          bStreet.style.background = '#0d9488';
          bStreet.style.color = '#fff';
        };
      }
      if (bSat) {
        bSat.onclick = () => {
          map.removeLayer(this.activeLayer);
          this.activeLayer = this.layers.googleHybrid;
          this.activeLayer.addTo(map);
          resetBtns();
          bSat.style.background = '#0d9488';
          bSat.style.color = '#fff';
        };
      }
      if (bTer) {
        bTer.onclick = () => {
          map.removeLayer(this.activeLayer);
          this.activeLayer = this.layers.googleTerrain;
          this.activeLayer.addTo(map);
          resetBtns();
          bTer.style.background = '#0d9488';
          bTer.style.color = '#fff';
        };
      }
    }, 100);

    // ------------------------------------------------------------------------
    // PLOT OUTBREAK SURVEILLANCE CLUSTERS ON GOOGLE MAP
    // ------------------------------------------------------------------------
    const zonesData = [
      { id: 'Zone A', name: 'South Green Colony', lat: 28.5800, lng: 77.1800, radius: 1600, color: '#10b981', score: 18, level: 'NORMAL', cases: 4 },
      { id: 'Zone B', name: 'East Lake District', lat: 28.6300, lng: 77.2400, radius: 1800, color: '#f59e0b', score: 42, level: 'WATCH', cases: 7 },
      { id: 'Zone C', name: 'Urban North Ward', lat: 28.6500, lng: 77.1950, radius: 2200, color: '#ef4444', score: 98, level: 'HIGH OUTBREAK RISK', cases: 32 },
      { id: 'Zone D', name: 'West Industrial Belt', lat: 28.5900, lng: 77.2600, radius: 1700, color: '#10b981', score: 22, level: 'NORMAL', cases: 6 },
      { id: 'Zone E', name: 'Central Railway Colony', lat: 28.6100, lng: 77.2150, radius: 1900, color: '#f97316', score: 58, level: 'ALERT', cases: 19 }
    ];

    zonesData.forEach(z => {
      const circle = L.circle([z.lat, z.lng], {
        color: z.color,
        fillColor: z.color,
        fillOpacity: z.score > 75 ? 0.4 : 0.22,
        weight: z.score > 75 ? 3.5 : 2,
        radius: z.radius
      }).addTo(map);

      // Google Maps style DivIcon Badge
      const iconHtml = `
        <div style="
          background: ${z.color}; 
          color: #fff; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-weight: 800; 
          font-size: 11px; 
          padding: 3px 8px; 
          border-radius: 99px; 
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          border: 2px solid #ffffff;
          white-space: nowrap;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>${z.score > 75 ? '🚨' : z.score > 45 ? '⚠️' : '🛡️'}</span>
          <span>${z.id}: ${z.score}/100</span>
        </div>
      `;

      const markerIcon = L.divIcon({
        html: iconHtml,
        className: 'zone-google-map-marker',
        iconSize: [110, 26],
        iconAnchor: [55, 13]
      });

      const marker = L.marker([z.lat, z.lng], { icon: markerIcon }).addTo(map);

      // Popup with Google Maps navigation link
      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; padding: 4px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: ${z.color};">${z.id} — ${z.name}</div>
          <div style="margin-bottom: 6px;">Status: <strong>${z.level}</strong> (Risk Score: ${z.score}/100)</div>
          <div style="margin-bottom: 6px;">Active Cases: <strong>${z.cases}</strong></div>
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <button onclick="window.SehatUI.openZoneDetailModal('${z.id}')" style="background: #0d9488; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 11px;">View Intel →</button>
            <a href="https://www.google.com/maps?q=${z.lat},${z.lng}" target="_blank" style="background: #f1f5f9; color: #0284c7; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">📍 Open in Google Maps</a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      circle.bindPopup(popupHtml);
    });

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
