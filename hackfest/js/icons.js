/**
 * Sehat Setu — Unified High-Definition SVG Icon System
 * Replaces system emojis with crisp, theme-aware vector SVG icons (Lucide / Feather Standard)
 */
(function (global) {
  'use strict';

  const SVG_DEFS = {
    'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'dashboard': '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'family': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="18" cy="14" r="2.5"/><path d="M21 21v-1a2.5 2.5 0 0 0-5 0v1"/>',
    'stethoscope': '<path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3"/><path d="M9 12.5v4.5a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V14"/><circle cx="16" cy="12" r="2"/>',
    'nurse': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    'building': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    'hospital': '<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/><path d="M10 12v.01"/><path d="M10 16v4"/><path d="M14 16v4"/><path d="M10 8h4"/><path d="M12 6v4"/>',
    'edit': '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    'edit-2': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    'pill': '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'theme': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    'menu': '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'message': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'flask': '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    'map': '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>',
    'clipboard': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    'id-card': '<rect width="18" height="14" x="3" y="5" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M15 9h2"/><path d="M15 13h2"/><path d="M5 17a4 4 0 0 1 8 0"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'save': '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'trash': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'video': '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>',
    'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    'key': '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    'smartphone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    'check': '<polyline points="20 6 9 17 4 12"/>',
    'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'calendar': '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'refresh': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    'paperclip': '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    'send': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    'thermometer': '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
    'circle': '<circle cx="12" cy="12" r="10"/>'
  };

  const EMOJI_MAP = {
    '🏠': 'home',
    '👤': 'user',
    '🩺': 'stethoscope',
    '👩‍⚕️': 'nurse',
    '👩': 'nurse',
    '🏛️': 'building',
    '🏛': 'building',
    '🌓': 'theme',
    '☰': 'menu',
    '✕': 'x',
    '🔔': 'bell',
    '🚪': 'log-out',
    '📊': 'dashboard',
    '📝': 'edit',
    '📁': 'folder',
    '💊': 'pill',
    '🚨': 'alert-triangle',
    '⚠️': 'alert-triangle',
    '⚠': 'alert-triangle',
    '🏥': 'hospital',
    '👨‍👩‍👧‍👦': 'family',
    '👨': 'user',
    '💬': 'message',
    '🧪': 'flask',
    '🗺️': 'map',
    '🗺': 'map',
    '👥': 'users',
    '📋': 'clipboard',
    '🪪': 'id-card',
    '✏️': 'edit-2',
    '✏': 'edit-2',
    '📍': 'map-pin',
    '🏡': 'home',
    '💾': 'save',
    '📷': 'camera',
    '📸': 'camera',
    '🔍': 'search',
    '🗑️': 'trash',
    '🗑': 'trash',
    '📄': 'file-text',
    '📑': 'file-text',
    '🎥': 'video',
    '📞': 'phone',
    '🔑': 'key',
    '📱': 'smartphone',
    '✓': 'check',
    '✅': 'check',
    '➕': 'plus',
    '🗓️': 'calendar',
    '🗓': 'calendar',
    '📈': 'trending-up',
    '⚙️': 'settings',
    '⚙': 'settings',
    '🎯': 'target',
    '🛡️': 'shield',
    '🛡': 'shield',
    '📎': 'paperclip',
    '🔄': 'refresh',
    '🚀': 'send',
    '⭐': 'star',
    '★': 'star',
    '☆': 'star',
    '💧': 'droplet',
    '🌡️': 'thermometer',
    '🌡': 'thermometer',
    '🫁': 'activity',
    '🚰': 'droplet',
    '🩹': 'plus',
    '🤢': 'activity',
    '⚡': 'activity',
    '💤': 'activity',
    '🟢': 'check',
    '🟡': 'alert-triangle',
    '🔴': 'alert-triangle',
    '🔵': 'circle',
    '⚪': 'circle',
    '🌿': 'activity',
    '📌': 'map-pin',
    '👶': 'user',
    '🧘': 'user',
    '🚑': 'hospital',
    '🔬': 'flask'
  };

  const SehatIcons = {
    /**
     * Get raw SVG string for an icon name
     */
    get(name, options = {}) {
      const size = options.size || 18;
      const strokeWidth = options.strokeWidth || 2;
      const className = options.className ? `sehat-icon ${options.className}` : 'sehat-icon';
      const color = options.color || 'currentColor';
      const style = options.style ? ` style="${options.style}"` : '';

      const content = SVG_DEFS[name] || SVG_DEFS['activity'];
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true"${style}>${content}</svg>`;
    },

    /**
     * Helper for sidebar navigation items
     */
    navItem(name, options = {}) {
      return `<span class="nav-icon-box">${this.get(name, { size: 18, ...options })}</span>`;
    },

    /**
     * Get SVG for a specific emoji
     */
    fromEmoji(emoji, options = {}) {
      if (!emoji) return null;
      const clean = emoji.trim();
      const name = EMOJI_MAP[clean];
      if (name) {
        return this.get(name, options);
      }
      return null;
    },

    /**
     * Replaces emoji inside a text node cleanly using document fragment
     */
    replaceInTextNode(textNode) {
      const val = textNode.nodeValue;
      if (!val) return;

      let matchedEmoji = null;
      let matchedIcon = null;

      for (const [emoji, iconName] of Object.entries(EMOJI_MAP)) {
        if (val.includes(emoji)) {
          matchedEmoji = emoji;
          matchedIcon = iconName;
          break;
        }
      }

      if (!matchedEmoji || !matchedIcon) return;

      const parent = textNode.parentNode;
      if (!parent || parent.nodeName === 'SCRIPT' || parent.nodeName === 'STYLE' || parent.closest('.brand-logo')) return;

      const parts = val.split(matchedEmoji);
      const span = document.createElement('span');
      span.className = 'sehat-icon-inline';
      span.style.display = 'inline-flex';
      span.style.alignItems = 'center';
      span.style.verticalAlign = 'middle';
      span.style.marginRight = '0.35rem';
      span.innerHTML = this.get(matchedIcon, { size: 16 });

      const frag = document.createDocumentFragment();
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          frag.appendChild(document.createTextNode(parts[i]));
        }
        if (i < parts.length - 1) {
          frag.appendChild(span.cloneNode(true));
        }
      }

      parent.replaceChild(frag, textNode);
    },

    /**
     * Scans DOM tree and replaces standalone emoji text nodes or emoji in icon containers
     */
    scanAndReplace(container = document.body) {
      if (!container) return;

      // 1. Replace inside portal-nav-item span elements
      const navSpans = container.querySelectorAll('.portal-nav-item > span:first-child');
      navSpans.forEach(span => {
        if (span.classList.contains('nav-icon-box') || span.querySelector('svg')) return;
        const text = span.textContent.trim();
        const iconSvg = this.fromEmoji(text, { size: 18 });
        if (iconSvg) {
          span.innerHTML = iconSvg;
          span.classList.add('nav-icon-box');
        }
      });

      // 2. Replace inside card titles
      const cardTitles = container.querySelectorAll('.card-title > span:first-child');
      cardTitles.forEach(span => {
        if (span.querySelector('svg')) return;
        const text = span.textContent.trim();
        const iconSvg = this.fromEmoji(text, { size: 20 });
        if (iconSvg) {
          span.innerHTML = iconSvg;
          span.classList.add('card-icon-box');
        }
      });

      // 3. Replace inside icon-btn buttons that just contain emoji
      const iconBtns = container.querySelectorAll('.icon-btn');
      iconBtns.forEach(btn => {
        if (btn.querySelector('svg') || btn.querySelector('img')) return;
        const text = btn.textContent.trim();
        if (EMOJI_MAP[text]) {
          const iconSvg = this.fromEmoji(text, { size: 18 });
          if (iconSvg) {
            btn.innerHTML = iconSvg;
          }
        }
      });

      // 4. Role pills and mobile buttons
      const rolePillBtns = container.querySelectorAll('.role-pill-btn, .mobile-nav-btn, .role-btn');
      rolePillBtns.forEach(btn => {
        if (btn.querySelector('svg')) return;
        for (const [emoji, iconName] of Object.entries(EMOJI_MAP)) {
          if (btn.innerHTML.includes(emoji)) {
            const svg = this.get(iconName, { size: 16 });
            btn.innerHTML = btn.innerHTML.split(emoji).join(svg + ' ');
            break;
          }
        }
      });

      // 5. Walk text nodes in buttons, headings, badges, table cells
      const targets = container.querySelectorAll('button, h1, h2, h3, h4, h5, .badge, th, td, label, .privacy-banner span, .hero-badge span');
      targets.forEach(target => {
        const textNodes = [];
        target.childNodes.forEach(child => {
          if (child.nodeType === 3 /* Node.TEXT_NODE */) {
            textNodes.push(child);
          }
        });
        textNodes.forEach(tn => this.replaceInTextNode(tn));
      });
    }
  };

  // Run on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => SehatIcons.scanAndReplace());
    } else {
      setTimeout(() => SehatIcons.scanAndReplace(), 50);
    }
  }

  global.SehatIcons = SehatIcons;
})(typeof window !== 'undefined' ? window : this);
