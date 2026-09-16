/**
 * Colmena Segura - Central Command & Tactical Dispatcher Controller
 */

import { swarmEngine, INCIDENT_STATES, INCIDENT_CATEGORIES } from './swarmEngine.js';
import { RiskMap } from './riskMap.js';
import { sounds } from './soundEffects.js';
import { syncBus } from './syncBus.js';
import { simulator } from './simulator.js';

class DispatcherApp {
  constructor() {
    this.tacticalMap = null;
    this.centerCoords = [19.4326, -99.1332];
    this.audioAlertsEnabled = true;

    this.init();
  }

  init() {
    this.initMap();
    this.setupEventListeners();
    this.renderMetrics();
    this.renderIncidentQueue();
    this.setupBroadcastModal();
    this.setupSimulationBar();
  }

  initMap() {
    this.tacticalMap = new RiskMap('admin-map', {
      center: this.centerCoords,
      zoom: 15
    });
  }

  setupEventListeners() {
    // Sound toggle button
    const soundToggleBtn = document.getElementById('btn-toggle-sound');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        const isMuted = sounds.toggleMute();
        soundToggleBtn.innerHTML = isMuted ? '🔇 Audio: Silenciado' : '🔊 Audio: Activo';
        soundToggleBtn.className = isMuted ? 'tactical-btn btn-muted' : 'tactical-btn btn-active';
      });
    }

    // Broadcast trigger button
    const openBroadcastBtn = document.getElementById('btn-open-broadcast');
    if (openBroadcastBtn) {
      openBroadcastBtn.addEventListener('click', () => {
        sounds.playClick();
        document.getElementById('admin-broadcast-modal').classList.remove('hidden');
      });
    }

    // SyncBus listeners
    syncBus.on('SWARM_ESCALATED_CRITICAL', ({ incident }) => {
      sounds.playCriticalAlarm();
      sounds.speakAlert('Atención comando: Nueva alerta crítica enjambre generada.');
      this.renderIncidentQueue();
      this.renderMetrics();
    });

    syncBus.on('NEW_PROBE_ALERT', () => {
      sounds.playWarningPing();
      this.renderIncidentQueue();
      this.renderMetrics();
    });

    syncBus.on('INCIDENT_MUTATION', () => {
      this.renderIncidentQueue();
      this.renderMetrics();
    });
  }

  renderMetrics() {
    const incidents = swarmEngine.loadIncidents();
    const criticalCount = incidents.filter(i => i.status === INCIDENT_STATES.CRITICAL_SWARM).length;
    const probingCount = incidents.filter(i => i.status === INCIDENT_STATES.PROBING).length;
    const dispatchedCount = incidents.filter(i => i.status === INCIDENT_STATES.DISPATCHED).length;

    const elCrit = document.getElementById('stat-critical');
    const elProbe = document.getElementById('stat-probing');
    const elDisp = document.getElementById('stat-dispatched');
    const elUnits = document.getElementById('stat-active-units');
    const elCritM = document.getElementById('stat-crit-m');
    const elProbeM = document.getElementById('stat-warn-m');
    const elDispM = document.getElementById('stat-disp-m');

    if (elCrit) elCrit.textContent = criticalCount;
    if (elProbe) elProbe.textContent = probingCount;
    if (elDisp) elDisp.textContent = dispatchedCount;
    if (elUnits) elUnits.textContent = '12 Patrullas';
    if (elCritM) elCritM.textContent = criticalCount;
    if (elProbeM) elProbeM.textContent = probingCount;
    if (elDispM) elDispM.textContent = dispatchedCount;
  }

  renderIncidentQueue() {
    const queueContainer = document.getElementById('admin-incident-queue');
    if (!queueContainer) return;

    const incidents = swarmEngine.loadIncidents();

    // Sort critical first, then dispatched, then probing
    const sorted = [...incidents].sort((a, b) => {
      const order = { [INCIDENT_STATES.CRITICAL_SWARM]: 1, [INCIDENT_STATES.DISPATCHED]: 2, [INCIDENT_STATES.PROBING]: 3 };
      return (order[a.status] || 99) - (order[b.status] || 99);
    });

    if (sorted.length === 0) {
      queueContainer.innerHTML = `
        <div class="admin-empty-queue">
          <span style="font-size: 2.2rem;">🛡️</span>
          <p>Sin incidentes activos en el cuadrante metropolitano.</p>
          <small>El sistema de colmena está en guardia.</small>
        </div>
      `;
      return;
    }

    queueContainer.innerHTML = sorted.map(inc => {
      const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
      const isDispatched = inc.status === INCIDENT_STATES.DISPATCHED;
      const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;
      const timeElapsedMins = Math.max(1, Math.round((Date.now() - inc.createdAt) / 60000));

      return `
        <div class="admin-incident-card ${isCritical ? 'admin-card-critical' : (isDispatched ? 'admin-card-dispatched' : 'admin-card-probing')}" id="card-${inc.id}">
          <div class="card-header-tactical">
            <div class="header-left">
              <span class="badge-status-tactical ${isCritical ? 'status-critical' : (isDispatched ? 'status-info' : 'status-warning')}">
                ${isCritical ? '🔴 ENJAMBRE CRÍTICO' : (isDispatched ? '🔵 DESPACHADO' : '🟡 SONDEO PREVENTIVO')}
              </span>
              <span class="incident-code">#${inc.id.slice(-6).toUpperCase()}</span>
            </div>
            <span class="incident-time">⏱️ Hace ${timeElapsedMins} min</span>
          </div>

          <div class="card-body-tactical">
            <div class="category-row">
              <span class="cat-icon">${cat.icon}</span>
              <strong>${cat.name}</strong>
              <span class="swarm-tally">👥 ${inc.reportCount} ciudadanos coinciden en radio de 200m</span>
            </div>

            ${inc.reporters.length > 0 && inc.reporters[0].note ? `
              <div class="reporter-notes">
                <em>"${inc.reporters[0].note}"</em>
              </div>
            ` : ''}

            ${isDispatched ? `
              <div class="dispatched-unit-info">
                🚔 Unidad Asignada: <strong>${inc.assignedUnit.code}</strong> (ETA ~${inc.assignedUnit.etaMinutes} min)
              </div>
            ` : ''}
          </div>

          <div class="card-actions-tactical">
            ${!isDispatched ? `
              <button class="btn-tactical btn-dispatch" data-id="${inc.id}">
                🚔 Despachar Patrulla
              </button>
            ` : `
              <button class="btn-tactical btn-resolve" data-id="${inc.id}">
                ✅ Confirmar Resuelto
              </button>
            `}
            <button class="btn-tactical btn-locate" data-lat="${inc.lat}" data-lng="${inc.lng}">
              📍 Ubicar en Mapa
            </button>
            <button class="btn-tactical btn-dismiss" data-id="${inc.id}">
              ❌ Falsa Alarma
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach button actions
    queueContainer.querySelectorAll('.btn-dispatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        sounds.playDispatchChime();
        swarmEngine.dispatchUnit(id, {
          code: 'SECTOR-DELTA-' + Math.floor(Math.random() * 80 + 10),
          etaMinutes: Math.floor(Math.random() * 4 + 2)
        });
      });
    });

    queueContainer.querySelectorAll('.btn-resolve').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        sounds.playClick();
        swarmEngine.resolveIncident(id);
      });
    });

    queueContainer.querySelectorAll('.btn-dismiss').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        sounds.playClick();
        swarmEngine.markFalseAlarm(id);
      });
    });

    queueContainer.querySelectorAll('.btn-locate').forEach(btn => {
      btn.addEventListener('click', () => {
        const lat = parseFloat(btn.dataset.lat);
        const lng = parseFloat(btn.dataset.lng);
        sounds.playClick();
        if (this.tacticalMap && this.tacticalMap.map) {
          this.tacticalMap.map.setView([lat, lng], 17, { animate: true });
        }
      });
    });
  }

  setupBroadcastModal() {
    const modal = document.getElementById('admin-broadcast-modal');
    const closeBtn = document.getElementById('btn-close-broadcast');
    const sendBtn = document.getElementById('btn-send-broadcast');
    const titleInput = document.getElementById('broadcast-title-input');
    const msgInput = document.getElementById('broadcast-message-input');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        sounds.playClick();
        modal.classList.add('hidden');
      });
    }

    if (sendBtn && modal) {
      sendBtn.addEventListener('click', () => {
        const title = titleInput.value.trim() || 'ALERTA OFICIAL DE AUTORIDADES';
        const msg = msgInput.value.trim();

        if (!msg) {
          alert('Por favor ingrese el mensaje para los ciudadanos.');
          return;
        }

        sounds.playCriticalAlarm();
        swarmEngine.sendBroadcastAlert({
          title,
          message: msg,
          radiusMeters: 2000,
          centerLat: this.centerCoords[0],
          centerLng: this.centerCoords[1]
        });

        modal.classList.add('hidden');
        titleInput.value = '';
        msgInput.value = '';
      });
    }
  }

  setupSimulationBar() {
    const fightBtn = document.getElementById('admin-sim-fight');
    const robberyBtn = document.getElementById('admin-sim-robbery');
    const resetBtn = document.getElementById('admin-sim-reset');

    if (fightBtn) {
      fightBtn.addEventListener('click', () => {
        simulator.runStreetFightScenario({ lat: this.centerCoords[0], lng: this.centerCoords[1] });
      });
    }

    if (robberyBtn) {
      robberyBtn.addEventListener('click', () => {
        simulator.runRobberyScenario({ lat: this.centerCoords[0], lng: this.centerCoords[1] });
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        simulator.resetAll();
      });
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.dispatcherApp = new DispatcherApp();
});
