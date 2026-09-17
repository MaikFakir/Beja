/**
 * Colmena Segura - Citizen PWA Main Application Controller
 */

import { swarmEngine, INCIDENT_STATES, INCIDENT_CATEGORIES } from './swarmEngine.js';
import { RiskMap } from './riskMap.js';
import { sounds } from './soundEffects.js';
import { syncBus } from './syncBus.js';
import { simulator } from './simulator.js';

class CitizenApp {
  constructor() {
    this.riskMap = null;
    this.currentCategory = 'FIGHT';
    this.panicCountdownTimer = null;
    this.countdownSeconds = 3;
    this.isCountdownActive = false;

    // Default user coordinates (Metro center)
    this.userCoords = { lat: 19.4326, lng: -99.1332 };

    this.init();
  }

  init() {
    // Setup Map
    this.initMap();

    // Setup Navigation Tabs
    this.setupTabs();

    // Setup Panic Button and Categories
    this.setupPanicButton();

    // Setup Safe Routing UI
    this.setupRoutingUI();

    // Setup Simulation Toolbar
    this.setupSimulationControls();

    // Setup Sync Events & Geofence Notifications
    this.setupEventHandlers();

    // Update Profile & Trust Score UI
    this.updateTrustUI();

    // Watch real user GPS if permitted
    this.initGeolocation();
  }

  initMap() {
    this.riskMap = new RiskMap('citizen-map', {
      center: [this.userCoords.lat, this.userCoords.lng],
      zoom: 16,
      onGeofenceChange: (threat) => this.handleGeofenceAlert(threat),
      onMapClick: (latlng) => {
        // Pin destination only if explicitly in routes tab or pin placement mode
        const routesActive = document.getElementById('tab-routes')?.classList.contains('active');
        const destInput = document.getElementById('route-dest-input');
        if (destInput && routesActive && this.pinSelectionMode) {
          destInput.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
          this.calculateRouteFromInputs();
        }
      }
    });

    // Time filter buttons (All / Day / Night)
    const timeButtons = document.querySelectorAll('.time-filter-btn');
    timeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        timeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.time;
        this.riskMap.setTimeFilter(filter);
        sounds.playClick();
      });
    });
  }

  initGeolocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          this.riskMap.setUserLocation(this.userCoords.lat, this.userCoords.lng, true);
        },
        (err) => {
          console.log('Using default simulation coordinates', err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }

  setupTabs() {
    const navItems = document.querySelectorAll('.nav-tab-item');
    const tabPanels = document.querySelectorAll('.tab-panel');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        sounds.playClick();
        const targetId = item.dataset.tab;

        navItems.forEach(n => n.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        item.classList.add('active');
        const activePanel = document.getElementById(`tab-${targetId}`);
        if (activePanel) {
          activePanel.classList.add('active');
        }

        // Invalidate map size when switching back to map
        if (targetId === 'map' && this.riskMap && this.riskMap.map) {
          setTimeout(() => this.riskMap.map.invalidateSize(), 150);
        }
      });
    });
  }

  setupPanicButton() {
    const panicBtn = document.getElementById('main-panic-btn');
    const cancelBtn = document.getElementById('panic-cancel-btn');
    const countdownOverlay = document.getElementById('panic-countdown-overlay');
    const countdownNumber = document.getElementById('countdown-number');
    const categoryChips = document.querySelectorAll('.category-chip');

    // Category selection
    categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        sounds.playClick();
        categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentCategory = chip.dataset.category;
      });
    });

    // Panic Button Click -> Starts 3-second safety abort countdown
    if (panicBtn) {
      panicBtn.addEventListener('click', () => {
        if (window.firebaseAuth && !window.firebaseAuth.currentUser) {
          sounds.playWarningPing();
          document.getElementById('marketing-login-modal')?.classList.remove('hidden');
          return;
        }
        sounds.playWarningPing();
        this.startPanicCountdown();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.abortPanicCountdown();
      });
    }
  }

  startPanicCountdown() {
    this.isCountdownActive = true;
    this.countdownSeconds = 3;
    const overlay = document.getElementById('panic-countdown-overlay');
    const numberEl = document.getElementById('countdown-number');

    overlay.classList.remove('hidden');
    numberEl.textContent = this.countdownSeconds;

    this.panicCountdownTimer = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds > 0) {
        sounds.playClick();
        numberEl.textContent = this.countdownSeconds;
      } else {
        clearInterval(this.panicCountdownTimer);
        this.panicCountdownTimer = null;
        this.isCountdownActive = false;
        overlay.classList.add('hidden');
        this.dispatchCitizenReport();
      }
    }, 1000);
  }

  abortPanicCountdown() {
    if (this.panicCountdownTimer) {
      clearInterval(this.panicCountdownTimer);
      this.panicCountdownTimer = null;
    }
    this.isCountdownActive = false;
    document.getElementById('panic-countdown-overlay').classList.add('hidden');
    sounds.playClick();
    this.showToast('Alerta cancelada a tiempo.', 'info');
  }

  dispatchCitizenReport() {
    const noteInput = document.getElementById('report-note-input');
    const note = noteInput ? noteInput.value.trim() : '';

    try {
      const { incident, isEscalated } = swarmEngine.reportIncident({
        lat: this.userCoords.lat,
        lng: this.userCoords.lng,
        category: this.currentCategory,
        note: note
      });

      if (isEscalated) {
        sounds.playCriticalAlarm();
        sounds.speakAlert('Alerta de colmena confirmada. Zona roja activada.');
        this.showToast('🚨 ¡CONSENSO DE COLMENA! Múltiples ciudadanos han confirmado la alerta.', 'critical');
      } else {
        sounds.playWarningPing();
        this.showToast('📡 Alerta de sondeo enviada. Esperando confirmación de vecinos...', 'warning');
      }

      // Switch to Map View to see the pulse
      const mapTabBtn = document.querySelector('[data-tab="map"]');
      if (mapTabBtn) mapTabBtn.click();

      // Clear note
      if (noteInput) noteInput.value = '';

    } catch (err) {
      this.showToast(err.message, 'critical');
    }
  }

  setupRoutingUI() {
    const calcBtn = document.getElementById('btn-calc-route');
    const clearBtn = document.getElementById('btn-clear-route');

    if (calcBtn) {
      calcBtn.addEventListener('click', () => {
        sounds.playClick();
        this.calculateRouteFromInputs();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        sounds.playClick();
        this.riskMap.clearRoutes();
        document.getElementById('route-results-card').classList.add('hidden');
      });
    }
  }

  calculateRouteFromInputs() {
    // Generate route from user's current location to a point ~800m north-east (past any active incident)
    const start = this.userCoords;
    const dest = {
      lat: this.userCoords.lat + 0.007,
      lng: this.userCoords.lng + 0.006
    };

    const routeInfo = this.riskMap.calculateSafeRoute(start, dest);
    const resultsCard = document.getElementById('route-results-card');
    const resultsText = document.getElementById('route-results-text');

    if (resultsCard && resultsText) {
      resultsCard.classList.remove('hidden');
      if (routeInfo.isDetour) {
        resultsText.innerHTML = `
          <strong style="color: var(--color-safe);">🛡️ Ruta Segura Calculada:</strong><br>
          Se evitó <strong>${routeInfo.riskAvoided} zona(s) de riesgo activa(s)</strong> (${routeInfo.threatCategory}).<br>
          📏 Distancia: ${routeInfo.distanceKm} km | ⏱️ Tiempo estimado: ${routeInfo.etaMins} min.
        `;
      } else {
        resultsText.innerHTML = `
          <strong style="color: var(--color-safe);">✅ Camino Directo Seguro:</strong><br>
          No hay incidentes de colmena en tu trayectoria.<br>
          📏 Distancia: ${routeInfo.distanceKm} km | ⏱️ Tiempo: ${routeInfo.etaMins} min.
        `;
      }
    }
  }

  setupSimulationControls() {
    const simFightBtn = document.getElementById('btn-sim-fight');
    const simRobberyBtn = document.getElementById('btn-sim-robbery');
    const simFalseBtn = document.getElementById('btn-sim-false');
    const simResetBtn = document.getElementById('btn-sim-reset');

    if (simFightBtn) {
      simFightBtn.addEventListener('click', () => {
        this.showToast('🚀 Iniciando simulación de Riña (3 ciudadanos)...', 'warning');
        simulator.runStreetFightScenario(this.userCoords);
      });
    }

    if (simRobberyBtn) {
      simRobberyBtn.addEventListener('click', () => {
        this.showToast('🚨 Simulando asalto nocturno...', 'critical');
        simulator.runRobberyScenario(this.userCoords);
      });
    }

    if (simFalseBtn) {
      simFalseBtn.addEventListener('click', () => {
        this.showToast('🟡 Simulando reporte aislado...', 'warning');
        simulator.runFalseAlarmScenario(this.userCoords);
      });
    }

    if (simResetBtn) {
      simResetBtn.addEventListener('click', () => {
        sounds.playClick();
        simulator.resetAll();
        this.showToast('🧹 Sistema reiniciado.', 'info');
      });
    }
  }

  setupEventHandlers() {
    // Escalate to critical swarm
    syncBus.on('SWARM_ESCALATED_CRITICAL', ({ incident }) => {
      sounds.playCriticalAlarm();
      sounds.speakAlert(`Alerta comunitaria: ${INCIDENT_CATEGORIES[incident.category]?.name || 'Peligro'} confirmado en tu cuadrante.`);
      this.showToast(`🚨 ¡PELIGRO ENJAMBRE CONFIRMADO! ${incident.reportCount} reportes en tu zona.`, 'critical');
      this.renderRecentIncidentsFeed();
    });

    // Unit dispatched
    syncBus.on('UNIT_DISPATCHED', ({ incident }) => {
      sounds.playDispatchChime();
      this.showToast(`🚔 Patrulla ${incident.assignedUnit?.code || '01'} asignada y en camino.`, 'info');
    });

    // Community Broadcast from authorities
    syncBus.on('COMMUNITY_BROADCAST', (broadcast) => {
      sounds.playCriticalAlarm();
      sounds.speakAlert(`Comunicado oficial: ${broadcast.title}`);
      this.showBroadcastModal(broadcast);
    });

    // General incident updates
    syncBus.on('INCIDENT_MUTATION', () => {
      this.renderRecentIncidentsFeed();
    });

    syncBus.on('TRUST_UPDATED', (trust) => {
      this.updateTrustUI();
    });

    this.renderRecentIncidentsFeed();
  }

  handleGeofenceAlert(threat) {
    const banner = document.getElementById('geofence-warning-banner');
    if (!banner) return;

    if (threat) {
      const cat = INCIDENT_CATEGORIES[threat.incident.category] || INCIDENT_CATEGORIES.FIGHT;
      const isCritical = threat.incident.status === INCIDENT_STATES.CRITICAL_SWARM;

      banner.classList.remove('hidden');
      banner.className = `geofence-banner ${isCritical ? 'banner-critical' : 'banner-warning'}`;
      banner.innerHTML = `
        <div class="banner-content">
          <span class="banner-icon">${isCritical ? '🚨' : '⚠️'}</span>
          <div class="banner-text">
            <strong>¡Atención! Estás a ${threat.distanceMeters}m de una zona de alerta</strong>
            <span>${cat.icon} ${cat.name} (${threat.incident.reportCount} reportes activos)</span>
          </div>
        </div>
      `;
      sounds.playWarningPing();
    } else {
      banner.classList.add('hidden');
    }
  }

  showBroadcastModal(broadcast) {
    const modal = document.getElementById('broadcast-alert-modal');
    if (!modal) return;

    document.getElementById('broadcast-modal-title').textContent = broadcast.title;
    document.getElementById('broadcast-modal-msg').textContent = broadcast.message;
    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('broadcast-modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        sounds.playClick();
        modal.classList.add('hidden');
      };
    }
  }

  renderRecentIncidentsFeed() {
    const feedContainer = document.getElementById('recent-incidents-list');
    if (!feedContainer) return;

    const incidents = swarmEngine.loadIncidents();
    if (incidents.length === 0) {
      feedContainer.innerHTML = `
        <div class="empty-feed">
          <span class="empty-icon">🛡️</span>
          <p>Tu cuadrante está en calma. No hay incidentes activos en la colmena.</p>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = incidents.map(inc => {
      const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;
      const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
      const isDispatched = inc.status === INCIDENT_STATES.DISPATCHED;

      return `
        <div class="incident-card ${isCritical ? 'card-critical' : (isDispatched ? 'card-dispatched' : 'card-warning')}">
          <div class="card-icon">${cat.icon}</div>
          <div class="card-info">
            <div class="card-top">
              <span class="card-title">${cat.name}</span>
              <span class="card-badge ${isCritical ? 'badge-critical' : (isDispatched ? 'badge-info' : 'badge-warning')}">
                ${isCritical ? '🚨 Enjambre Crítico' : (isDispatched ? '🚔 Patrulla en Camino' : '🟡 Sondeo')}
              </span>
            </div>
            <p class="card-sub">${inc.reportCount} ciudadano(s) reportando en un radio de 200m</p>
            ${inc.reporters[0]?.note ? `<p class="card-note">"${inc.reporters[0].note}"</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  updateTrustUI() {
    const trust = swarmEngine.userTrust;
    const scoreEl = document.getElementById('trust-score-num');
    const levelEl = document.getElementById('trust-score-level');
    const verifiedEl = document.getElementById('trust-verified-count');

    if (scoreEl) scoreEl.textContent = `${trust.score}/100`;
    if (levelEl) levelEl.textContent = trust.level;
    if (verifiedEl) verifiedEl.textContent = `${trust.verifiedReports} reportes validados`;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.citizenApp = new CitizenApp();
});
