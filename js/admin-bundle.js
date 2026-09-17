/**
 * Colmena Segura - Universal Single-Bundle Script for Central Command & Dispatch Panel (admin.html)
 * Features: 100% Fully Responsive Layout (Mobile / Tablet / Desktop),
 * Real-time Auto-Center on user's real execution location (GPS/IP),
 * Auto-Focus on incoming alerts, Dynamic Real-Time Heatmap at actual user streets,
 * Category Filters, Tactical Popups & Direct Actions.
 */

(function() {
  'use strict';

  // --- 0. GEOLOCATION AUTO-RESOLVER ---
  class GeoResolver {
    constructor() {
      this.currentCoords = this.getLastKnown() || { lat: 4.6097, lng: -74.0817 };
      this.isRealGps = false;
      this.onLocationUpdated = [];
      this.resolveLocation();
    }

    getLastKnown() {
      try {
        const raw = localStorage.getItem('colmena_real_user_location');
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    setCoords(lat, lng, isGps = true) {
      this.currentCoords = { lat, lng };
      this.isRealGps = isGps;
      try {
        localStorage.setItem('colmena_real_user_location', JSON.stringify({ lat, lng }));
      } catch (e) {}
      this.onLocationUpdated.forEach(cb => {
        try { cb(this.currentCoords, isGps); } catch (err) {}
      });
    }

    async resolveLocation() {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.setCoords(pos.coords.latitude, pos.coords.longitude, true);
          },
          () => {
            this.resolveIpLocation();
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );

        navigator.geolocation.watchPosition(
          (pos) => {
            this.setCoords(pos.coords.latitude, pos.coords.longitude, true);
          },
          null,
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      } else {
        this.resolveIpLocation();
      }
    }

    async resolveIpLocation() {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            this.setCoords(data.latitude, data.longitude, false);
          }
        }
      } catch (e) {}
    }

    subscribe(cb) {
      this.onLocationUpdated.push(cb);
      if (this.currentCoords) cb(this.currentCoords, this.isRealGps);
    }
  }

  const geoResolver = new GeoResolver();

  // --- 1. SOUND ENGINE ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
    }

    ensureContext() {
      if (!this.ctx) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.ctx = new AudioContext();
        } catch (e) {}
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      return this.isMuted;
    }

    playClick() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      } catch (e) {}
    }

    playWarningPing() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } catch (e) {}
    }

    playCriticalAlarm() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(920, now + 0.25);
        osc.frequency.linearRampToValueAtTime(440, now + 0.5);
        osc.frequency.linearRampToValueAtTime(920, now + 0.75);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.1);
      } catch (e) {}
    }

    playDispatchChime() {
      if (this.isMuted) return;
      this.ensureContext();
      if (!this.ctx) return;
      try {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const now = this.ctx.currentTime + (i * 0.08);
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
        });
      } catch (e) {}
    }

    speakAlert(text) {
      if (this.isMuted || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  }

  const sounds = new SoundEngine();

  // --- 2. SYNC BUS ---
  class SyncBus {
    constructor() {
      this.channelName = 'colmena_segura_realtime_mesh';
      this.channel = null;
      this.listeners = new Map();
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (e) => this.triggerLocal(e.data?.event, e.data);
      }
      window.addEventListener('storage', (e) => {
        if (e.key === this.channelName && e.newValue) {
          try {
            const payload = JSON.parse(e.newValue);
            this.triggerLocal(payload.event, payload);
          } catch (err) {}
        }
      });
    }

    emit(eventName, data = {}) {
      const payload = { event: eventName, data, timestamp: Date.now(), senderId: 'admin_panel' };
      if (this.channel) this.channel.postMessage(payload);
      try { localStorage.setItem(this.channelName, JSON.stringify(payload)); } catch (e) {}
      this.triggerLocal(eventName, payload);
    }

    on(eventName, cb) {
      if (!this.listeners.has(eventName)) this.listeners.set(eventName, []);
      this.listeners.get(eventName).push(cb);
    }

    triggerLocal(eventName, payload) {
      if (!eventName || !payload) return;
      if (this.listeners.has(eventName)) {
        this.listeners.get(eventName).forEach(cb => {
          try { cb(payload.data, payload); } catch (e) {}
        });
      }
    }
  }

  const syncBus = new SyncBus();

  // --- 3. SWARM CONSTANTS & ENGINE ---
  const INCIDENT_STATES = {
    PROBING: 'PROBING',
    CRITICAL_SWARM: 'CRITICAL_SWARM',
    DISPATCHED: 'DISPATCHED',
    PATROL_ATTENDED: 'PATROL_ATTENDED',
    RESOLVED: 'RESOLVED',
    FALSE_ALARM: 'FALSE_ALARM'
  };

  const INCIDENT_CATEGORIES = {
    FIGHT: { id: 'FIGHT', name: 'Riña / Pelea', icon: '⚔️', defaultSeverity: 'HIGH' },
    ROBBERY: { id: 'ROBBERY', name: 'Robo / Asalto', icon: '🚨', defaultSeverity: 'CRITICAL' },
    MEDICAL: { id: 'MEDICAL', name: 'Emergencia Médica', icon: '🚑', defaultSeverity: 'HIGH' },
    SUSPICIOUS: { id: 'SUSPICIOUS', name: 'Actividad Sospechosa', icon: '👁️', defaultSeverity: 'MEDIUM' }
  };

  class SwarmEngine {
    constructor() {
      this.STORAGE_KEY_INCIDENTS = 'colmena_incidents_active_v2';
      this.STORAGE_KEY_HISTORY = 'colmena_incidents_history_v2';

      this.CLUSTER_RADIUS_METERS = 50;
      this.CRITICAL_RED_DURATION_MS = 8 * 60 * 1000; // 8 minutes active red alarm
      this.COOLING_YELLOW_DURATION_MS = 20 * 60 * 1000; // 20 minutes yellow preventive cooling
      // Umbral de peso acumulado de consenso necesario para escalar una alerta a Enjambre Crítico (ROJO)
      this.CONSENSUS_ESCALATION_THRESHOLD = 1.0;

      try {
        localStorage.removeItem('colmena_incidents_active_v1');
        localStorage.removeItem('colmena_incidents_history_v1');
      } catch (e) {}

      this.incidents = this.loadIncidents();
      this.history = this.loadHistory();

      syncBus.on('INCIDENT_MUTATION', () => {
        this.incidents = this.loadIncidents();
        this.history = this.loadHistory();
      });

      this.decayInterval = setInterval(() => {
        this.cleanupExpiredIncidents();
      }, 20000);
    }

    patrolIncident(incidentId, unitData = { code: 'PATRULLA-CUADRANTE', etaMinutes: 0 }) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      incident.status = INCIDENT_STATES.PATROL_ATTENDED;
      incident.patrolAttendedAt = Date.now();
      incident.attendedBy = unitData;
      this.history.push({
        lat: incident.lat,
        lng: incident.lng,
        category: incident.category,
        weight: 0.35, // Soft calm weight: preserves hotzone without loud alarm
        timestamp: Date.now(),
        timeOfDay: new Date().getHours() >= 19 || new Date().getHours() <= 5 ? 'NIGHT' : 'DAY'
      });
      this.saveHistory();
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incident, status: INCIDENT_STATES.PATROL_ATTENDED });
    }

    dispatchUnit(incidentId, unitData = { code: 'PATRULLA-07', etaMinutes: 3 }) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      incident.status = INCIDENT_STATES.DISPATCHED;
      incident.assignedUnit = { ...unitData, dispatchedAt: Date.now() };
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incident });
      syncBus.emit('UNIT_DISPATCHED', { incident });
    }

    resolveIncident(incidentId) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      this.recordDismissedId(incidentId);
      this.incidents = this.incidents.filter(i => i.id !== incidentId);
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.RESOLVED });

      try {
        const raw = localStorage.getItem('colmena_user_trust_v2');
        if (raw) {
          const trust = JSON.parse(raw);
          trust.score = Math.min(100, trust.score + 5);
          if (trust.score >= 95) trust.level = '👑 Líder de Colmena';
          else if (trust.score >= 85) trust.level = '🔵 Centinela de Cuadrante';
          else if (trust.score >= 70) trust.level = '🟢 Guardián Activo';
          else if (trust.score >= 45) trust.level = '🟡 Ciudadano Iniciado';
          else trust.level = '⚠️ En Observación';
          trust.history = trust.history || [];
          trust.history.unshift({ timestamp: Date.now(), delta: '+5', reason: 'Incidente atendido y resuelto por autoridades' });
          if (trust.history.length > 10) trust.history.pop();
          localStorage.setItem('colmena_user_trust_v2', JSON.stringify(trust));
          syncBus.emit('TRUST_UPDATED', { trust, delta: 5, reason: 'Incidente resuelto por autoridades' });
        }
      } catch (e) {}
    }

    markFalseAlarm(incidentId) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      this.recordDismissedId(incidentId);
      this.incidents = this.incidents.filter(i => i.id !== incidentId);
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.FALSE_ALARM });

      try {
        const raw = localStorage.getItem('colmena_user_trust_v2');
        if (raw) {
          const trust = JSON.parse(raw);
          trust.score = Math.max(0, trust.score - 15);
          if (trust.score >= 95) trust.level = '👑 Líder de Colmena';
          else if (trust.score >= 85) trust.level = '🔵 Centinela de Cuadrante';
          else if (trust.score >= 70) trust.level = '🟢 Guardián Activo';
          else if (trust.score >= 45) trust.level = '🟡 Ciudadano Iniciado';
          else trust.level = '⚠️ En Observación';
          trust.history = trust.history || [];
          trust.history.unshift({ timestamp: Date.now(), delta: '-15', reason: 'Penalización: Reporte descartado como falsa alarma' });
          if (trust.history.length > 10) trust.history.pop();
          localStorage.setItem('colmena_user_trust_v2', JSON.stringify(trust));
          syncBus.emit('TRUST_UPDATED', { trust, delta: -15, reason: 'Penalización por reporte falso' });
        }
      } catch (e) {}
    }

    recordDismissedId(id) {
      try {
        const raw = localStorage.getItem('colmena_dismissed_incident_ids_v2');
        const set = raw ? JSON.parse(raw) : [];
        if (!set.includes(id)) {
          set.push(id);
          localStorage.setItem('colmena_dismissed_incident_ids_v2', JSON.stringify(set));
        }
      } catch (e) {}
    }

    getDismissedIds() {
      try {
        const raw = localStorage.getItem('colmena_dismissed_incident_ids_v2');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    cleanupExpiredIncidents() {
      const now = Date.now();
      const active = [];
      let changed = false;
      const dismissed = this.getDismissedIds();

      this.incidents.forEach(inc => {
        if (dismissed.includes(inc.id) || inc.status === INCIDENT_STATES.RESOLVED || inc.status === INCIDENT_STATES.FALSE_ALARM) {
          changed = true;
          return;
        }

        const referenceTime = inc.criticalStartedAt || inc.updatedAt || inc.createdAt;
        const ageMs = now - referenceTime;

        // 1. Critical Swarm & Dispatched: DEGRADE from ROJO to AMARILLO after 8 minutes
        if ((inc.status === INCIDENT_STATES.CRITICAL_SWARM || inc.status === INCIDENT_STATES.DISPATCHED) && ageMs > this.CRITICAL_RED_DURATION_MS) {
          changed = true;
          inc.status = INCIDENT_STATES.PROBING;
          inc.coolingDown = true;
          inc.decayedFromCritical = true;
          inc.coolingStartedAt = now;
          inc.updatedAt = now;
          active.push(inc);
          return;
        }

        // 2. Probing (AMARILLO): Stays 20m in cautionary yellow, then archives to historical heatmap
        if (inc.status === INCIDENT_STATES.PROBING) {
          const yellowTime = inc.coolingStartedAt || inc.updatedAt || inc.createdAt;
          const yellowAgeMs = now - yellowTime;
          if (yellowAgeMs > this.COOLING_YELLOW_DURATION_MS) {
            changed = true;
            this.history.push({
              lat: inc.lat,
              lng: inc.lng,
              category: inc.category,
              weight: 0.5,
              timestamp: inc.createdAt,
              timeOfDay: new Date(inc.createdAt).getHours() >= 19 || new Date(inc.createdAt).getHours() <= 5 ? 'NIGHT' : 'DAY'
            });
            this.recordDismissedId(inc.id);
            return;
          }
        }

        // 3. Patrol Attended: Active for 20 minutes, then archive
        if (inc.status === INCIDENT_STATES.PATROL_ATTENDED && ageMs > this.COOLING_YELLOW_DURATION_MS) {
          changed = true;
          this.recordDismissedId(inc.id);
          return;
        }

        active.push(inc);
      });

      if (changed) {
        this.incidents = active;
        this.saveIncidents();
        this.saveHistory();
        syncBus.emit('INCIDENT_MUTATION', { action: 'DECAY_EVALUATION', count: this.incidents.length });
      }
    }

    loadIncidents() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_INCIDENTS);
        let list = raw ? JSON.parse(raw) : [];
        const dismissed = this.getDismissedIds();
        list = list.filter(i => !dismissed.includes(i.id) && i.status !== INCIDENT_STATES.RESOLVED && i.status !== INCIDENT_STATES.FALSE_ALARM);
        return list;
      } catch (e) { return []; }
    }

    saveIncidents() {
      try { localStorage.setItem(this.STORAGE_KEY_INCIDENTS, JSON.stringify(this.incidents)); } catch (e) {}
    }

    loadHistory() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_HISTORY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    }

    saveHistory() {
      try { localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.history)); } catch (e) {}
    }

    calculateDistanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Mismo criterio de peso por reputación que usa la app ciudadana: alta reputación pesa mucho
     * (una sola alerta puede activar el enjambre crítico), reputación media necesita coincidencia
     * de varios ciudadanos, y baja reputación casi no suma aunque reporte varias veces.
     */
    getConsensusWeight(trustScore) {
      const score = (typeof trustScore === 'number' && !isNaN(trustScore)) ? trustScore : 50;
      if (score >= 85) return 1.0;
      if (score >= 45) return 0.5;
      return 0.15;
    }

    /**
     * Usado por los botones de simulación y el Inyector Masivo del panel de administración
     * para generar/alimentar incidentes de prueba con el mismo motor de consenso que usan los ciudadanos.
     */
    reportIncident({ lat, lng, category = 'FIGHT', note = '', userId = null, userTrust = null, forceStatus = null }) {
      userId = userId || ('admin_' + Math.random().toString(36).substring(2, 8));
      const now = Date.now();
      const weight = this.getConsensusWeight(userTrust);
      this.incidents = this.loadIncidents();

      let matchingCluster = this.incidents.find(inc => {
        if (inc.status === INCIDENT_STATES.RESOLVED || inc.status === INCIDENT_STATES.FALSE_ALARM) return false;
        return this.calculateDistanceMeters(lat, lng, inc.lat, inc.lng) <= this.CLUSTER_RADIUS_METERS;
      });

      let resultIncident;
      let isEscalated = false;

      if (matchingCluster) {
        const alreadyReported = matchingCluster.reporters.some(r => r.userId === userId);
        const isDifferentUser = !alreadyReported;
        if (isDifferentUser) {
          matchingCluster.reporters.push({ userId, timestamp: now, note, weight });
          matchingCluster.reportCount = matchingCluster.reporters.length;
          matchingCluster.consensusWeight = matchingCluster.reporters.reduce((sum, r) => sum + (typeof r.weight === 'number' ? r.weight : this.getConsensusWeight(null)), 0);
        }
        matchingCluster.updatedAt = now;

        const meetsThreshold = forceStatus === INCIDENT_STATES.CRITICAL_SWARM || matchingCluster.consensusWeight >= this.CONSENSUS_ESCALATION_THRESHOLD;
        if (matchingCluster.status === INCIDENT_STATES.PROBING && isDifferentUser && meetsThreshold) {
          matchingCluster.status = INCIDENT_STATES.CRITICAL_SWARM;
          matchingCluster.criticalStartedAt = now;
          matchingCluster.coolingDown = false;
          isEscalated = true;
          if (matchingCluster.decayedFromCritical) {
            matchingCluster.reactivatedAt = now;
            matchingCluster.reactivatedBy = userId;
          }
        }
        resultIncident = matchingCluster;
      } else {
        const startsCritical = forceStatus === INCIDENT_STATES.CRITICAL_SWARM || weight >= this.CONSENSUS_ESCALATION_THRESHOLD;
        resultIncident = {
          id: 'inc_' + now + '_' + Math.random().toString(36).substr(2, 4),
          lat,
          lng,
          category,
          status: startsCritical ? INCIDENT_STATES.CRITICAL_SWARM : INCIDENT_STATES.PROBING,
          createdAt: now,
          updatedAt: now,
          criticalStartedAt: startsCritical ? now : null,
          coolingDown: false,
          reportCount: 1,
          consensusWeight: weight,
          creatorId: userId,
          reporters: [{ userId, timestamp: now, note, weight }],
          assignedUnit: null
        };
        if (startsCritical) isEscalated = true;
        this.incidents.unshift(resultIncident);
      }

      this.history.push({
        lat, lng, category,
        weight: isEscalated ? 1.0 : 0.8,
        timeOfDay: new Date().getHours() >= 19 || new Date().getHours() <= 5 ? 'NIGHT' : 'DAY',
        timestamp: now
      });
      this.saveHistory();
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incident: resultIncident, isEscalated });
      if (isEscalated) {
        syncBus.emit('SWARM_ESCALATED_CRITICAL', { incident: resultIncident });
      } else if (resultIncident.reportCount === 1) {
        syncBus.emit('NEW_PROBE_ALERT', { incident: resultIncident });
      }

      return { incident: resultIncident, isEscalated };
    }

    sendBroadcastAlert({ title, message, radiusMeters = null, centerLat = null, centerLng = null, active = true }) {
      const bc = { id: 'bc_' + Date.now(), title, message, radiusMeters, centerLat, centerLng, active, timestamp: Date.now() };
      syncBus.emit('COMMUNITY_BROADCAST', bc);
      return bc;
    }
  }

  const swarmEngine = new SwarmEngine();

  // --- 4. TACTICAL MAP & HEATMAP FOR ADMIN ---
  class AdminMap {
    constructor(containerId) {
      this.containerId = containerId;
      this.map = null;
      this.markerLayerGroup = null;
      this.heatLayer = null;
      this.markersMap = new Map();
      this.center = [geoResolver.currentCoords.lat, geoResolver.currentCoords.lng];
      this.categoryFilter = 'ALL';
      this.hasAutoCentered = false;
      this.initMap();
    }

    initMap() {
      if (!window.L) {
        setTimeout(() => this.initMap(), 300);
        return;
      }
      const container = document.getElementById(this.containerId);
      if (!container) return;

      try {
        this.map = L.map(this.containerId, {
          center: this.center,
          zoom: 15,
          zoomControl: false,
          attributionControl: false
        });

        // 100% Free OpenStreetMap High-Contrast Tactical Cyber Tiles (Zero API Key - Zero Watermarks)
        const freeTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          className: 'colmena-dark-tiles'
        });
        freeTileLayer.addTo(this.map);

        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        this.markerLayerGroup = L.layerGroup().addTo(this.map);
        this.renderHeatmap();
        this.renderActiveIncidents();

        geoResolver.subscribe((coords) => {
          if (!this.hasAutoCentered && this.map) {
            this.map.setView([coords.lat, coords.lng], 15);
            this.hasAutoCentered = true;
          }
        });

        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 600);

        syncBus.on('INCIDENT_MUTATION', () => {
          this.renderActiveIncidents();
          this.renderHeatmap();
        });
      } catch (e) {
        console.error('Admin map error', e);
      }
    }

    setCategoryFilter(category) {
      this.categoryFilter = category;
      this.renderActiveIncidents();
      this.renderHeatmap();
    }

    renderHeatmap() {
      if (!this.map || !window.L || !window.L.heatLayer) return;
      if (this.heatLayer) {
        this.map.removeLayer(this.heatLayer);
        this.heatLayer = null;
      }

      const history = swarmEngine.loadHistory();
      const active = swarmEngine.loadIncidents();
      const points = [];

      history.forEach(pt => {
        if (this.categoryFilter === 'ALL' || pt.category === this.categoryFilter) {
          points.push([pt.lat, pt.lng, pt.weight || 0.6]);
        }
      });

      active.forEach(inc => {
        if (this.categoryFilter === 'ALL' || inc.category === this.categoryFilter) {
          const isCrit = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
          const weight = isCrit ? 1.0 : 0.7;
          points.push([inc.lat, inc.lng, weight]);
        }
      });

      if (points.length > 0) {
        this.heatLayer = L.heatLayer(points, {
          radius: 22,
          blur: 14,
          maxZoom: 18,
          gradient: { 0.2: '#00f5a0', 0.45: '#ffb800', 0.7: '#ff5e3a', 1.0: '#ff1744' }
        }).addTo(this.map);
      }
    }

    renderActiveIncidents() {
      if (!this.markerLayerGroup || !this.map || !window.L) return;
      this.markerLayerGroup.clearLayers();
      this.markersMap.clear();

      const incidents = swarmEngine.loadIncidents();
      incidents.forEach(inc => {
        if (this.categoryFilter !== 'ALL' && inc.category !== this.categoryFilter) return;

        const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
        const isDispatched = inc.status === INCIDENT_STATES.DISPATCHED;
        const isPatrolAttended = inc.status === INCIDENT_STATES.PATROL_ATTENDED;
        const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;

        // 50m swarm influence radius
        L.circle([inc.lat, inc.lng], {
          radius: 50,
          color: isCritical ? '#ff2a55' : (isPatrolAttended ? '#00b0ff' : (isDispatched ? '#00d2ff' : '#ffb800')),
          weight: 2,
          fillColor: isCritical ? '#ff2a55' : (isPatrolAttended ? '#00b0ff' : (isDispatched ? '#00d2ff' : '#ffb800')),
          fillOpacity: isCritical ? 0.3 : (isPatrolAttended ? 0.12 : 0.15),
          dashArray: isCritical ? null : '4, 6'
        }).addTo(this.markerLayerGroup);

        // ONLY critical has pulsating wave! Probing and patrol-attended do NOT pulsate.
        const markerHtml = `
          <div class="incident-custom-marker ${isCritical ? 'critical' : (isPatrolAttended ? 'patrol-attended' : (isDispatched ? 'dispatched' : 'probing'))}">
            ${isCritical ? '<div class="marker-radar-wave"></div>' : ''}
            <div class="marker-core">
              <span class="marker-icon">${isPatrolAttended ? '🚓' : cat.icon}</span>
              <span class="marker-count">${inc.reportCount}</span>
            </div>
          </div>
        `;
        const icon = L.divIcon({ className: 'incident-leaflet-wrapper', html: markerHtml, iconSize: [44, 44], iconAnchor: [22, 22] });
        const marker = L.marker([inc.lat, inc.lng], { icon });

        const popupContent = `
          <div class="tactical-popup">
            <div class="popup-header">
              <span class="popup-category">${isPatrolAttended ? '🚓 Cuadrante en Sitio' : `${cat.icon} ${cat.name}`}</span>
              <span class="popup-badge ${isCritical ? 'badge-critical' : (isPatrolAttended ? 'badge-patrol-attended' : 'badge-warning')}">
                ${isCritical ? '🚨 ENJAMBRE CRÍTICO' : (isPatrolAttended ? '🚓 ASEGURADO POR PATRULLA' : (isDispatched ? '🚔 EN CAMINO' : '🟡 SONDEO'))}
              </span>
            </div>
            <div class="popup-body">
              <p>👥 <strong>${inc.reportCount} ciudadano(s)</strong> coinciden en 50m.</p>
              <p style="color:var(--text-muted);font-size:0.72rem;">📍 Coordenadas: ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</p>
              ${inc.reporters[0]?.note ? `<p style="font-style:italic;margin:4px 0;">"${inc.reporters[0].note}"</p>` : ''}
              ${isPatrolAttended ? `<p style="color:#00b0ff;font-weight:700;font-size:0.75rem;">🚓 Patrulla en sitio. Zona calmada sin alarma ruidosa.</p>` : ''}
              ${inc.assignedUnit ? `<p style="color:var(--color-info);font-weight:700;">🚔 ${inc.assignedUnit.code} (ETA ~${inc.assignedUnit.etaMinutes}m)</p>` : ''}
            </div>
            <div style="display:flex;gap:4px;margin-top:8px;">
              ${!isPatrolAttended ? `
                <button class="btn-tactical" style="background:rgba(0,176,255,0.2);border:1px solid #00b0ff;color:#00b0ff;" onclick="window.dispatcherApp.patrolAttend('${inc.id}')">🚓 Atender (Azul)</button>
              ` : ''}
              ${!isDispatched && !isPatrolAttended ? `
                <button class="btn-tactical btn-dispatch" onclick="window.dispatcherApp.dispatch('${inc.id}')">🚔 Despachar</button>
              ` : ''}
              <button class="btn-tactical btn-resolve" onclick="window.dispatcherApp.resolve('${inc.id}')">✅ Resolver</button>
              <button class="btn-tactical btn-dismiss" onclick="window.dispatcherApp.dismiss('${inc.id}')">❌ Falsa</button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { minWidth: 220 });
        this.markerLayerGroup.addLayer(marker);
        this.markersMap.set(inc.id, marker);
      });
    }

    focusIncident(incident) {
      if (!this.map || !incident) return;
      this.map.flyTo([incident.lat, incident.lng], 16, { duration: 1.2 });
      setTimeout(() => {
        const marker = this.markersMap.get(incident.id);
        if (marker) {
          marker.openPopup();
        }
      }, 1300);
    }

    /**
     * Modo Pincel: mientras está activo, clic (o clic+arrastre) sobre el mapa "pinta" alertas de
     * prueba en las coordenadas tocadas, en lugar de mover el mapa. Pensado para mapear/calibrar
     * zonas de riesgo rápidamente durante pruebas.
     */
    setPaintMode(active, onPaintPoint) {
      if (!this.map) return;
      this.paintModeActive = active;
      const container = this.map.getContainer();

      if (active) {
        this.map.dragging.disable();
        if (container) container.style.cursor = 'crosshair';
        this._paintPointerDown = false;
        this._paintLastPointAt = 0;
        this._paintOnDown = (e) => { this._paintPointerDown = true; this._paintTick(e.latlng, onPaintPoint); };
        this._paintOnMove = (e) => { if (this._paintPointerDown) this._paintTick(e.latlng, onPaintPoint); };
        this._paintOnUp = () => { this._paintPointerDown = false; };
        this.map.on('mousedown', this._paintOnDown);
        this.map.on('mousemove', this._paintOnMove);
        this.map.on('mouseup', this._paintOnUp);
      } else {
        this.map.dragging.enable();
        if (container) container.style.cursor = '';
        if (this._paintOnDown) this.map.off('mousedown', this._paintOnDown);
        if (this._paintOnMove) this.map.off('mousemove', this._paintOnMove);
        if (this._paintOnUp) this.map.off('mouseup', this._paintOnUp);
        this._paintPointerDown = false;
      }
    }

    _paintTick(latlng, onPaintPoint) {
      const now = Date.now();
      if (now - this._paintLastPointAt < 220) return; // separa los puntos de un mismo trazo para que se vea como pincelada
      this._paintLastPointAt = now;
      if (typeof onPaintPoint === 'function') onPaintPoint(latlng);
    }
  }

  // --- 4.5. FIREBASE REAL-TIME CLOUD SYNCHRONIZER (PLAN SPARK) ---
  class FirebaseSyncService {
    constructor() {
      this.db = null;
      this.isConfigured = false;
      this.isConnected = false;
    }

    init() {
      const config = (typeof window !== 'undefined' && window.COLMENA_FIREBASE_CONFIG) 
        ? window.COLMENA_FIREBASE_CONFIG 
        : null;

      if (!config || !config.apiKey || config.apiKey.trim() === '') {
        return;
      }

      try {
        if (window.firebase) {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(config);
          }
          this.db = window.firebase.firestore();
          this.isConfigured = true;
          this.isConnected = true;
          this.listenToCloudChanges();
        }
      } catch (err) {
        console.warn('Firebase admin error:', err);
      }
    }

    listenToCloudChanges() {
      if (!this.db) return;

      this.db.collection('incidents').onSnapshot((snapshot) => {
        const cloudIncidents = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          cloudIncidents.push(data);
        });

        if (cloudIncidents.length > 0) {
          swarmEngine.incidents = cloudIncidents;
          localStorage.setItem(swarmEngine.STORAGE_KEY_INCIDENTS, JSON.stringify(cloudIncidents));
          syncBus.emit('INCIDENT_MUTATION', { action: 'CLOUD_SYNC' });
        }
      });
    }

    async saveIncidentToCloud(incident) {
      if (!this.isConfigured || !this.db || !incident) return;
      try {
        await this.db.collection('incidents').doc(incident.id).set(incident, { merge: true });
      } catch (e) {}
    }

    async sendBroadcastToCloud(broadcastData) {
      const bc = {
        active: true,
        ...broadcastData,
        timestamp: Date.now()
      };
      if (this.isConfigured && this.db) {
        try {
          await this.db.collection('broadcasts').add(bc);
        } catch (e) {}
      }
      let local = [];
      try { local = JSON.parse(localStorage.getItem('colmena_local_broadcasts') || '[]'); } catch (e) {}
      local.unshift(bc);
      localStorage.setItem('colmena_local_broadcasts', JSON.stringify(local.slice(0, 50)));
    }

    async getBroadcastsFromCloud() {
      if (this.isConfigured && this.db) {
        try {
          const snap = await this.db.collection('broadcasts').orderBy('timestamp', 'desc').limit(50).get();
          const list = [];
          snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
          if (list.length > 0) return list;
        } catch (e) {}
      }
      const local = localStorage.getItem('colmena_local_broadcasts') || '[]';
      try { return JSON.parse(local); } catch (e) { return []; }
    }

    async toggleBroadcastStatus(id, active) {
      if (this.isConfigured && this.db) {
        try {
          await this.db.collection('broadcasts').doc(id).update({ active });
        } catch (e) {}
      }
      let local = [];
      try { local = JSON.parse(localStorage.getItem('colmena_local_broadcasts') || '[]'); } catch (e) {}
      local = local.map(b => b.id === id ? { ...b, active } : b);
      localStorage.setItem('colmena_local_broadcasts', JSON.stringify(local));
    }

    async deleteBroadcast(id) {
      if (this.isConfigured && this.db) {
        try {
          await this.db.collection('broadcasts').doc(id).delete();
        } catch (e) {}
      }
      let local = [];
      try { local = JSON.parse(localStorage.getItem('colmena_local_broadcasts') || '[]'); } catch (e) {}
      local = local.filter(b => b.id !== id);
      localStorage.setItem('colmena_local_broadcasts', JSON.stringify(local));
    }
  }

  const firebaseSync = window.firebaseSync || new FirebaseSyncService();
  if (typeof window !== 'undefined') window.firebaseSync = firebaseSync;

  // --- 4.6. FIREBASE AUTHENTICATION SERVICE (ADMIN DIRECTORY) ---
  class FirebaseAuthService {
    constructor() {
      this.STORAGE_KEY_ALL_USERS = 'colmena_registered_users_directory';
    }

    init() {
      // Connect to Firestore if available
      if (window.firebaseSync && window.firebaseSync.db) {
        try {
          window.firebaseSync.db.collection('users').onSnapshot((snapshot) => {
            const cloudUsers = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              data.uid = doc.id;
              cloudUsers.push(data);
            });
            if (cloudUsers.length > 0) {
              localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(cloudUsers));
              if (window.dispatcherApp) window.dispatcherApp.renderUsersDirectory();
            }
          }, (err) => console.warn('Users cloud sync error:', err));
        } catch (e) { console.warn('Users listener error:', e); }
      }
    }

    getUsersList() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_ALL_USERS);
        if (raw) return JSON.parse(raw);
      } catch (e) {}

      const initialDirectory = [
        {
          uid: 'user_admin_super',
          email: 'Gabyolarte2017@gmail.com',
          displayName: 'GABY OLARTE (SUPER ADMIN)',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gaby',
          role: 'admin',
          trustScore: 100,
          verifiedReports: 35,
          validationsGiven: 70,
          status: 'active',
          createdAt: Date.now() - 86400000 * 30
        },
        {
          uid: 'user_patrol_07',
          email: 'patrullero.cuadrante07@gmail.com',
          displayName: 'PATRULLERO CUADRANTE 07',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=patrullero',
          role: 'patrol',
          trustScore: 98,
          verifiedReports: 14,
          validationsGiven: 32,
          status: 'active',
          createdAt: Date.now() - 86400000 * 20
        },
        {
          uid: 'user_cit_02',
          email: 'maria.gonzalez@gmail.com',
          displayName: 'MARÍA GONZÁLEZ (LÍDER COMUNAL)',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=maria',
          role: 'citizen',
          trustScore: 92,
          verifiedReports: 7,
          validationsGiven: 19,
          status: 'active',
          createdAt: Date.now() - 86400000 * 12
        }
      ];
      try {
        localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(initialDirectory));
      } catch (e) {}
      return initialDirectory;
    }

    saveUsersList(users) {
      try {
        localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(users));
      } catch (e) {}
    }
  }

  const firebaseAuth = window.firebaseAuth || new FirebaseAuthService();
  if (typeof window !== 'undefined') window.firebaseAuth = firebaseAuth;

  // --- 5. DISPATCHER CONTROLLER ---
  class DispatcherApp {
    constructor() {
      this.tacticalMap = null;
      this.selectedFilter = 'ALL';
      this.queueStatusFilter = 'ACTIVE_CRITICAL'; // Default to active/critical as requested by user!
      this.userRoleFilter = 'ALL';
      this.chatRoleFilter = 'ALL';
      this.selectedUserForModeration = null;
      this.mobileView = 'map'; // 'map' or 'queue'
      this.currentView = 'radar'; // 'radar', 'users', 'broadcasts', 'chat'
      this.userSearchQuery = '';
      this.init();
    }

    init() {
      try { firebaseSync.init(); } catch (e) { console.warn('Sync init warning:', e); }
      try { firebaseAuth.init(); } catch (e) { console.warn('Auth init warning:', e); }
      try { this.tacticalMap = new AdminMap('admin-map'); } catch (e) { console.error('AdminMap init error:', e); }
      try { this.setupEventListeners(); } catch (e) { console.error('setupEventListeners error:', e); }
      try { this.renderMetrics(); } catch (e) { console.error('renderMetrics error:', e); }
      try { this.renderIncidentQueue(); } catch (e) { console.error('renderIncidentQueue error:', e); }
      try { this.setupQueueStatusFilters(); } catch (e) { console.error('setupQueueStatusFilters error:', e); }
      try { this.setupBroadcastModal(); } catch (e) { console.error('setupBroadcastModal error:', e); }
      try { this.setupSimulationBar(); } catch (e) { console.error('setupSimulationBar error:', e); }
      try { this.setupCategoryFilters(); } catch (e) { console.error('setupCategoryFilters error:', e); }
      try { this.setupMobileSwitcher(); } catch (e) { console.error('setupMobileSwitcher error:', e); }
      try { this.setupViewSwitcher(); } catch (e) { console.error('setupViewSwitcher error:', e); }
      try { this.setupUserDirectoryEvents(); } catch (e) { console.error('setupUserDirectoryEvents error:', e); }
      try { this.setupUserModerationModal(); } catch (e) { console.error('setupUserModerationModal error:', e); }
      try { this.setupAdminChat(); } catch (e) { console.error('setupAdminChat error:', e); }
      try { this.setupBulkGenerator(); } catch (e) { console.error('setupBulkGenerator error:', e); }
      try { this.setupAuthorityGate(); } catch (e) { console.error('setupAuthorityGate error:', e); }
    }

    setupAuthorityGate() {
      const gateModal = document.getElementById('admin-access-gate-modal');
      const btnSuperAdmin = document.getElementById('btn-gate-super-admin');
      const btnPatrol = document.getElementById('btn-gate-patrol');
      const btnToggleCustom = document.getElementById('btn-gate-toggle-custom');
      const customDrawer = document.getElementById('gate-custom-auth-drawer');
      const customInput = document.getElementById('gate-custom-email-input');
      const btnCustomEnter = document.getElementById('btn-gate-custom-enter');
      const headerPill = document.getElementById('admin-user-header-pill');

      const evaluateAuth = (user) => {
        const isAuthorized = user && (user.role === 'admin' || user.role === 'patrol');
        if (gateModal) {
          if (isAuthorized) {
            gateModal.classList.add('hidden');
          } else {
            gateModal.classList.remove('hidden');
          }
        }

        if (headerPill) {
          if (isAuthorized) {
            const roleBadge = user.role === 'admin' ? '👑 Admin' : '🚓 Patrullero';
            headerPill.innerHTML = `
              <div class="authority-header-chip" title="Sesión de Autoridad Activa">
                <img src="${user.photoURL}" alt="Avatar" class="auth-chip-avatar">
                <div class="auth-chip-info">
                  <span class="auth-chip-name">${user.displayName.split(' ')[0]}</span>
                  <span class="auth-chip-role">${roleBadge}</span>
                </div>
                <button class="auth-chip-logout" id="btn-admin-logout" title="Cerrar sesión">&times;</button>
              </div>
            `;
            headerPill.querySelector('#btn-admin-logout')?.addEventListener('click', async () => {
              sounds.playClick();
              if (window.firebaseAuth) await window.firebaseAuth.logout();
              evaluateAuth(null);
            });
          } else {
            headerPill.innerHTML = `
              <button class="tactical-btn" id="btn-admin-header-login" style="background: rgba(239, 68, 68, 0.2); border-color: var(--color-critical); color: #ff5c77;">
                🔑 Entrar C2
              </button>
            `;
            headerPill.querySelector('#btn-admin-header-login')?.addEventListener('click', () => {
              sounds.playClick();
              this.promptAuthorityLogin();
            });
          }
        }
      };

      // 1-Tap Super Admin Entry
      btnSuperAdmin?.addEventListener('click', () => {
        sounds.playDispatchChime();
        const user = window.firebaseAuth 
          ? window.firebaseAuth.loginWithEmail('Gabyolarte2017@gmail.com')
          : { email: 'Gabyolarte2017@gmail.com', role: 'admin', displayName: 'GABY OLARTE (SUPER ADMIN)', photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gaby' };
        this.unlockC2(user);
      });

      // 1-Tap Patrol Entry
      btnPatrol?.addEventListener('click', () => {
        sounds.playDispatchChime();
        const user = window.firebaseAuth 
          ? window.firebaseAuth.loginWithEmail('patrullero.cuadrante07@gmail.com')
          : { email: 'patrullero.cuadrante07@gmail.com', role: 'patrol', displayName: 'PATRULLERO CUADRANTE 07', photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=patrullero' };
        this.unlockC2(user);
      });

      // Toggle Custom Drawer
      btnToggleCustom?.addEventListener('click', (e) => {
        e.preventDefault();
        sounds.playClick();
        if (customDrawer) {
          customDrawer.classList.toggle('hidden');
          if (!customDrawer.classList.contains('hidden') && customInput) customInput.focus();
        }
      });

      const handleCustomLogin = () => {
        const email = customInput ? customInput.value.trim() : '';
        if (email && email.includes('@')) {
          sounds.playDispatchChime();
          const user = window.firebaseAuth ? window.firebaseAuth.loginWithEmail(email) : null;
          if (user && (user.role === 'admin' || user.role === 'patrol')) {
            this.unlockC2(user);
          } else {
            alert('⚠️ El correo (' + email + ') no tiene permisos de Autoridad/Admin. Usa Gabyolarte2017@gmail.com o un correo de patrullero.');
          }
        } else {
          alert('Ingresa un correo electrónico válido.');
        }
      };

      btnCustomEnter?.addEventListener('click', (e) => {
        e.preventDefault();
        handleCustomLogin();
      });

      customInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCustomLogin();
        }
      });

      if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged(user => {
          evaluateAuth(user);
        });
        evaluateAuth(window.firebaseAuth.currentUser);
      }
    }

    unlockC2(user) {
      const gateModal = document.getElementById('admin-access-gate-modal');
      if (gateModal) gateModal.classList.add('hidden');
      this.setupAuthorityGate();
      if (this.tacticalMap && this.tacticalMap.map) {
        setTimeout(() => {
          this.tacticalMap.map.invalidateSize();
          this.tacticalMap.renderActiveIncidents();
          this.tacticalMap.renderHeatmap();
        }, 150);
      }
      this.renderMetrics();
      this.renderIncidentQueue();
      this.renderUsersDirectory();
    }

    async promptAuthorityLogin() {
      if (window.firebaseAuth && window.firebaseAuth.openGoogleChooser) {
        const user = await window.firebaseAuth.openGoogleChooser();
        if (user) {
          if (user.role === 'admin' || user.role === 'patrol') {
            sounds.playDispatchChime();
            this.unlockC2(user);
          } else {
            sounds.playWarningPing();
            alert('⚠️ La cuenta (' + user.email + ') tiene rol de CIUDADANO y no tiene permisos para despachar unidades ni moderar en el Centro C2. Por favor selecciona una cuenta de Autoridad (Gaby Olarte o Patrullero).');
          }
        }
      }
    }

    setupMobileSwitcher() {
      const toggleBtn = document.getElementById('btn-admin-mobile-toggle');
      const queuePanel = document.getElementById('admin-queue-panel');
      const mapPanel = document.getElementById('admin-map-panel');

      if (toggleBtn && queuePanel && mapPanel) {
        toggleBtn.addEventListener('click', () => {
          sounds.playClick();
          if (this.mobileView === 'map') {
            this.mobileView = 'queue';
            queuePanel.classList.add('mobile-active');
            mapPanel.classList.add('mobile-hidden');
            toggleBtn.innerHTML = '🗺️ Ver Mapa';
          } else {
            this.mobileView = 'map';
            queuePanel.classList.remove('mobile-active');
            mapPanel.classList.remove('mobile-hidden');
            toggleBtn.innerHTML = '📋 Ver Cola';
            if (this.tacticalMap && this.tacticalMap.map) {
              setTimeout(() => this.tacticalMap.map.invalidateSize(), 150);
            }
          }
        });
      }
    }

    setupCategoryFilters() {
      const filterPills = document.querySelectorAll('.admin-filter-pill');
      filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
          sounds.playClick();
          filterPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.selectedFilter = pill.dataset.category;
          if (this.tacticalMap) {
            this.tacticalMap.setCategoryFilter(this.selectedFilter);
          }
          this.renderIncidentQueue();
        });
      });
    }

    setupEventListeners() {
      const soundToggleBtn = document.getElementById('btn-toggle-sound');
      if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
          const isMuted = sounds.toggleMute();
          soundToggleBtn.innerHTML = isMuted ? '🔇 Audio' : '🔊 Audio';
          soundToggleBtn.className = isMuted ? 'tactical-btn btn-muted' : 'tactical-btn btn-active';
        });
      }

      syncBus.on('SWARM_ESCALATED_CRITICAL', ({ incident }) => {
        sounds.playCriticalAlarm();
        sounds.speakAlert(`Atención comando: Alerta crítica de ${INCIDENT_CATEGORIES[incident.category]?.name || 'emergencia'} en progreso.`);
        this.renderIncidentQueue();
        this.renderMetrics();
        if (this.tacticalMap) {
          this.tacticalMap.focusIncident(incident);
        }
      });

      syncBus.on('NEW_PROBE_ALERT', ({ incident }) => {
        sounds.playWarningPing();
        this.renderIncidentQueue();
        this.renderMetrics();
        if (this.tacticalMap) {
          this.tacticalMap.focusIncident(incident);
        }
      });

      syncBus.on('INCIDENT_MUTATION', () => {
        this.renderIncidentQueue();
        this.renderMetrics();
      });
    }

    renderMetrics() {
      const incidents = swarmEngine.loadIncidents();
      const crit = incidents.filter(i => i.status === INCIDENT_STATES.CRITICAL_SWARM).length;
      const probe = incidents.filter(i => i.status === INCIDENT_STATES.PROBING).length;
      const disp = incidents.filter(i => i.status === INCIDENT_STATES.DISPATCHED).length;

      const statCrit = document.getElementById('stat-critical');
      const statProbe = document.getElementById('stat-probing');
      const statDisp = document.getElementById('stat-dispatched');
      const statCritM = document.getElementById('stat-crit-m');
      const statProbeM = document.getElementById('stat-warn-m');
      const statDispM = document.getElementById('stat-disp-m');

      if (statCrit) statCrit.textContent = crit;
      if (statProbe) statProbe.textContent = probe;
      if (statDisp) statDisp.textContent = disp;
      if (statCritM) statCritM.textContent = crit;
      if (statProbeM) statProbeM.textContent = probe;
      if (statDispM) statDispM.textContent = disp;
    }

    setupQueueStatusFilters() {
      const statusButtons = document.querySelectorAll('#queue-status-filter-tabs .status-segment-btn');
      statusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          sounds.playClick();
          statusButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.queueStatusFilter = btn.dataset.statusFilter;
          this.renderIncidentQueue();
        });
      });
    }

    renderIncidentQueue() {
      const queue = document.getElementById('admin-incident-queue');
      if (!queue) return;

      const rawIncidents = swarmEngine.loadIncidents();
      const incidents = rawIncidents.filter(inc => {
        // 1. Category Filter
        if (this.selectedFilter !== 'ALL' && inc.category !== this.selectedFilter) return false;

        // 2. Status Segmenter Filter (User requested to isolate active from probing)
        if (this.queueStatusFilter === 'ACTIVE_CRITICAL') {
          return inc.status === INCIDENT_STATES.CRITICAL_SWARM || inc.status === INCIDENT_STATES.DISPATCHED;
        } else if (this.queueStatusFilter === 'PATROL_ATTENDED') {
          return inc.status === INCIDENT_STATES.PATROL_ATTENDED;
        } else if (this.queueStatusFilter === 'PROBING') {
          return inc.status === INCIDENT_STATES.PROBING;
        }
        return true;
      });

      if (incidents.length === 0) {
        queue.innerHTML = `
          <div class="admin-empty-queue">
            <span style="font-size: 2.2rem;">🛡️</span>
            <p>Sin incidentes activos para el filtro actual.</p>
            <small>Los eventos de otras prioridades están en sus respectivas pestañas superiores.</small>
          </div>
        `;
        return;
      }

      queue.innerHTML = incidents.map(inc => {
        const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
        const isDispatched = inc.status === INCIDENT_STATES.DISPATCHED;
        const isPatrolAttended = inc.status === INCIDENT_STATES.PATROL_ATTENDED;
        const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;
        const timeElapsedMins = Math.max(1, Math.round((Date.now() - inc.createdAt) / 60000));

        let cardClass = 'admin-card-probing';
        let statusBadgeClass = 'status-warning';
        let statusLabel = '🟡 SONDEO PREVENTIVO';

        if (isCritical) {
          cardClass = 'admin-card-critical';
          statusBadgeClass = 'status-critical';
          statusLabel = '🔴 ENJAMBRE CRÍTICO';
        } else if (isPatrolAttended) {
          cardClass = 'admin-card-patrol-attended';
          statusBadgeClass = 'status-patrol-attended';
          statusLabel = '🚓 ASEGURADO POR PATRULLA';
        } else if (isDispatched) {
          cardClass = 'admin-card-dispatched';
          statusBadgeClass = 'status-info';
          statusLabel = '🔵 DESPACHADO';
        }

        return `
          <div class="admin-incident-card ${cardClass}">
            <div class="card-header-tactical">
              <div class="header-left">
                <span class="badge-status-tactical ${statusBadgeClass}">
                  ${statusLabel}
                </span>
                <span class="incident-code">#${inc.id.slice(-5).toUpperCase()}</span>
              </div>
              <span class="incident-time">⏱️ Hace ${timeElapsedMins} min</span>
            </div>

            <div class="card-body-tactical">
              <div class="category-row">
                <span>${isPatrolAttended ? '🚓' : cat.icon}</span>
                <strong>${cat.name}</strong>
                <span class="swarm-tally">👥 ${inc.reportCount} ciudadano(s)</span>
              </div>
              <p style="color:var(--text-dim);font-size:0.7rem;margin-top:2px;">📍 Coordenadas: ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</p>
              ${inc.reporters[0]?.note ? `<div class="reporter-notes">"${inc.reporters[0].note}"</div>` : ''}
              ${isPatrolAttended ? `<div style="color:#00b0ff;font-weight:700;font-size:0.75rem;margin-top:4px;">🚓 Patrulla en sitio. Zona calmada sin alarma ruidosa.</div>` : ''}
              ${inc.assignedUnit ? `<div class="dispatched-unit-info">🚔 ${inc.assignedUnit.code} (ETA ~${inc.assignedUnit.etaMinutes}m)</div>` : ''}
            </div>

            <div class="card-actions-tactical">
              ${!isPatrolAttended ? `
                <button class="btn-tactical" style="background:rgba(0,176,255,0.2);border:1px solid #00b0ff;color:#00b0ff;" onclick="window.dispatcherApp.patrolAttend('${inc.id}')" title="Marcar presencia de patrulla en sitio (Alerta Azul)">
                  🚓 Atender (Azul)
                </button>
              ` : ''}
              ${!isDispatched && !isPatrolAttended ? `
                <button class="btn-tactical btn-dispatch" onclick="window.dispatcherApp.dispatch('${inc.id}')">🚔 Despachar</button>
              ` : ''}
              <button class="btn-tactical btn-resolve" onclick="window.dispatcherApp.resolve('${inc.id}')">✅ Resuelto</button>
              <button class="btn-tactical btn-locate" onclick="window.dispatcherApp.locate('${inc.id}')">📍 Ver Mapa</button>
              <button class="btn-tactical btn-dismiss" onclick="window.dispatcherApp.dismiss('${inc.id}')">❌ Falsa</button>
            </div>
          </div>
        `;
      }).join('');
    }

    patrolAttend(id) {
      sounds.playDispatchChime();
      swarmEngine.patrolIncident(id, {
        code: 'PATRULLA-PRESENCIAL-' + Math.floor(Math.random() * 50 + 10),
        attendedAt: Date.now()
      });
      const updated = swarmEngine.loadIncidents().find(i => i.id === id);
      if (updated) firebaseSync.saveIncidentToCloud(updated);
      this.renderIncidentQueue();
      if (this.tacticalMap) this.tacticalMap.renderActiveIncidents();
    }

    dispatch(id) {
      sounds.playDispatchChime();
      swarmEngine.dispatchUnit(id, {
        code: 'PATRULLA-DELTA-' + Math.floor(Math.random() * 70 + 10),
        etaMinutes: Math.floor(Math.random() * 4 + 2)
      });
      const updated = swarmEngine.loadIncidents().find(i => i.id === id);
      if (updated) firebaseSync.saveIncidentToCloud(updated);
      this.renderIncidentQueue();
      if (this.tacticalMap) this.tacticalMap.renderActiveIncidents();
    }

    resolve(id) {
      sounds.playClick();
      const inc = swarmEngine.loadIncidents().find(i => i.id === id);
      swarmEngine.resolveIncident(id);
      if (firebaseSync.deleteIncidentFromCloud) {
        firebaseSync.deleteIncidentFromCloud(id);
      } else if (inc) {
        firebaseSync.saveIncidentToCloud({ ...inc, status: 'RESOLVED' });
      }
      this.renderIncidentQueue();
      if (this.tacticalMap) this.tacticalMap.renderActiveIncidents();
    }

    dismiss(id) {
      sounds.playClick();
      const inc = swarmEngine.loadIncidents().find(i => i.id === id);
      swarmEngine.markFalseAlarm(id);
      if (firebaseSync.deleteIncidentFromCloud) {
        firebaseSync.deleteIncidentFromCloud(id);
      } else if (inc) {
        firebaseSync.saveIncidentToCloud({ ...inc, status: 'FALSE_ALARM' });
      }
      this.renderIncidentQueue();
      if (this.tacticalMap) this.tacticalMap.renderActiveIncidents();
    }

    locate(id) {
      sounds.playClick();
      // On mobile, switch back to map first
      if (this.mobileView === 'queue') {
        const toggleBtn = document.getElementById('btn-admin-mobile-toggle');
        if (toggleBtn) toggleBtn.click();
      }
      const inc = swarmEngine.loadIncidents().find(i => i.id === id);
      if (inc && this.tacticalMap) {
        this.tacticalMap.focusIncident(inc);
      }
    }

    setupBroadcastModal() {
      const modal = document.getElementById('admin-broadcast-modal');
      document.getElementById('btn-open-broadcast')?.addEventListener('click', () => {
        sounds.playClick();
        modal.classList.remove('hidden');
      });
      document.getElementById('btn-close-broadcast')?.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
      document.getElementById('btn-send-broadcast')?.addEventListener('click', () => {
        const title = document.getElementById('broadcast-title-input').value.trim() || 'ALERTA OFICIAL';
        const msg = document.getElementById('broadcast-message-input').value.trim();
        const radiusMeters = parseInt(document.getElementById('broadcast-radius-select')?.value || '1000', 10);
        const active = (document.getElementById('broadcast-status-select')?.value || 'active') === 'active';
        // Perímetro centrado en el punto que el despachador está viendo en el mapa táctico (o su GPS si el mapa aún no cargó)
        const center = (this.tacticalMap && this.tacticalMap.map) ? this.tacticalMap.map.getCenter() : geoResolver.currentCoords;
        if (msg) {
          sounds.playCriticalAlarm();
          const payload = { title, message: msg, radiusMeters, centerLat: center.lat, centerLng: center.lng, active };
          swarmEngine.sendBroadcastAlert(payload);
          firebaseSync.sendBroadcastToCloud(payload);
          modal.classList.add('hidden');
        }
      });
    }

    setupSimulationBar() {
      document.getElementById('admin-sim-fight')?.addEventListener('click', async () => {
        sounds.playClick();
        const base = geoResolver.currentCoords;
        swarmEngine.reportIncident({ lat: base.lat, lng: base.lng, category: 'FIGHT', note: 'Riña callejera en cruce concurrido.', userId: 'bot1' });
        await new Promise(r => setTimeout(r, 1800));
        swarmEngine.reportIncident({ lat: base.lat + 0.00035, lng: base.lng + 0.0003, category: 'FIGHT', note: 'Confirmado por segundo testigo.', userId: 'bot2' });
      });

      document.getElementById('admin-sim-robbery')?.addEventListener('click', async () => {
        sounds.playClick();
        const base = geoResolver.currentCoords;
        swarmEngine.reportIncident({ lat: base.lat + 0.001, lng: base.lng - 0.001, category: 'ROBBERY', note: 'Asalto en proceso a transeúnte.', userId: 'botA' });
        await new Promise(r => setTimeout(r, 1500));
        swarmEngine.reportIncident({ lat: base.lat + 0.0013, lng: base.lng - 0.0009, category: 'ROBBERY', note: 'Sujetos armados en fuga.', userId: 'botB' });
      });

      document.getElementById('admin-sim-reset')?.addEventListener('click', () => {
        localStorage.removeItem(swarmEngine.STORAGE_KEY_INCIDENTS);
        localStorage.removeItem(swarmEngine.STORAGE_KEY_HISTORY);
        syncBus.emit('INCIDENT_MUTATION', { action: 'RESET' });
      });

      // Modo Pincel: pintar alertas de prueba tocando/arrastrando directamente sobre el mapa táctico
      const paintBtn = document.getElementById('btn-toggle-paint-mode');
      let paintModeOn = false;
      const paintCategories = ['ROBBERY', 'FIGHT', 'SUSPICIOUS', 'VANDALISM', 'ACCIDENT', 'MEDICAL'];
      paintBtn?.addEventListener('click', () => {
        sounds.playClick();
        paintModeOn = !paintModeOn;
        paintBtn.classList.toggle('active', paintModeOn);
        paintBtn.innerHTML = paintModeOn ? '✅ Pintando (clic para detener)' : '🖌️ Modo Pincel';
        if (!this.tacticalMap) return;
        this.tacticalMap.setPaintMode(paintModeOn, (latlng) => {
          const category = paintCategories[Math.floor(Math.random() * paintCategories.length)];
          const res = swarmEngine.reportIncident({
            lat: latlng.lat,
            lng: latlng.lng,
            category,
            note: 'Pincel de mapeo de zona (prueba de admin).',
            userId: `paint_bot_${Math.floor(Math.random() * 90000 + 10000)}`,
            forceStatus: INCIDENT_STATES.CRITICAL_SWARM
          });
          if (res && res.incident) firebaseSync.saveIncidentToCloud(res.incident);
          this.renderIncidentQueue();
          this.renderMetrics();
          this.tacticalMap.renderActiveIncidents();
          this.tacticalMap.renderHeatmap();
        });
      });
    }

    setupViewSwitcher() {
      const btnViewRadar = document.getElementById('btn-view-radar');
      const btnViewUsers = document.getElementById('btn-view-users');
      const btnViewBroadcasts = document.getElementById('btn-view-broadcasts');
      const btnViewChat = document.getElementById('btn-view-chat');
      const queuePanel = document.getElementById('admin-queue-panel');
      const mapPanel = document.getElementById('admin-map-panel');
      const categoryNav = document.getElementById('admin-category-nav');
      const usersPanel = document.getElementById('admin-users-panel');
      const broadcastsPanel = document.getElementById('admin-broadcasts-panel');
      const chatPanel = document.getElementById('admin-chat-panel');

      btnViewRadar?.addEventListener('click', () => {
        sounds.playClick();
        this.currentView = 'radar';
        btnViewRadar.classList.add('active');
        btnViewUsers?.classList.remove('active');
        btnViewBroadcasts?.classList.remove('active');
        btnViewChat?.classList.remove('active');
        queuePanel?.classList.remove('hidden');
        mapPanel?.classList.remove('hidden');
        categoryNav?.classList.remove('hidden');
        usersPanel?.classList.add('hidden');
        broadcastsPanel?.classList.add('hidden');
        chatPanel?.classList.add('hidden');
        if (this.tacticalMap && this.tacticalMap.map) {
          setTimeout(() => this.tacticalMap.map.invalidateSize(), 150);
        }
      });

      btnViewUsers?.addEventListener('click', () => {
        sounds.playClick();
        this.currentView = 'users';
        btnViewUsers.classList.add('active');
        btnViewRadar?.classList.remove('active');
        btnViewBroadcasts?.classList.remove('active');
        btnViewChat?.classList.remove('active');
        queuePanel?.classList.add('hidden');
        mapPanel?.classList.add('hidden');
        categoryNav?.classList.add('hidden');
        usersPanel?.classList.remove('hidden');
        broadcastsPanel?.classList.add('hidden');
        chatPanel?.classList.add('hidden');
        this.renderUsersDirectory();
      });

      btnViewBroadcasts?.addEventListener('click', () => {
        sounds.playClick();
        this.currentView = 'broadcasts';
        btnViewBroadcasts.classList.add('active');
        btnViewRadar?.classList.remove('active');
        btnViewUsers?.classList.remove('active');
        btnViewChat?.classList.remove('active');
        queuePanel?.classList.add('hidden');
        mapPanel?.classList.add('hidden');
        categoryNav?.classList.add('hidden');
        usersPanel?.classList.add('hidden');
        broadcastsPanel?.classList.remove('hidden');
        chatPanel?.classList.add('hidden');
        this.renderBroadcastsList();
      });

      btnViewChat?.addEventListener('click', () => {
        sounds.playClick();
        this.currentView = 'chat';
        btnViewChat.classList.add('active');
        btnViewRadar?.classList.remove('active');
        btnViewUsers?.classList.remove('active');
        btnViewBroadcasts?.classList.remove('active');
        queuePanel?.classList.add('hidden');
        mapPanel?.classList.add('hidden');
        categoryNav?.classList.add('hidden');
        usersPanel?.classList.add('hidden');
        broadcastsPanel?.classList.add('hidden');
        chatPanel?.classList.remove('hidden');
        this.renderAdminChat();
        this.renderAdminChatContacts();
      });
    }

    setupUserDirectoryEvents() {
      const searchInput = document.getElementById('admin-users-search');
      searchInput?.addEventListener('input', (e) => {
        this.userSearchQuery = e.target.value.trim().toLowerCase();
        this.renderUsersDirectory();
      });

      const roleTabs = document.querySelectorAll('.users-role-filters-bar .role-filter-tab');
      roleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          sounds.playClick();
          roleTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.userRoleFilter = tab.dataset.userRole;
          this.renderUsersDirectory();
        });
      });
    }

    renderUsersDirectory() {
      const grid = document.getElementById('admin-users-grid');
      if (!grid) return;

      const allUsers = firebaseAuth.getUsersList();

      // Update count indicators
      const countAll = document.getElementById('user-count-all');
      const countCit = document.getElementById('user-count-citizen');
      const countPat = document.getElementById('user-count-patrol');
      const countAdm = document.getElementById('user-count-admin');
      if (countAll) countAll.textContent = allUsers.length;
      if (countCit) countCit.textContent = allUsers.filter(u => (u.role || 'citizen') === 'citizen').length;
      if (countPat) countPat.textContent = allUsers.filter(u => u.role === 'patrol').length;
      if (countAdm) countAdm.textContent = allUsers.filter(u => u.role === 'admin').length;

      const filtered = allUsers.filter(u => {
        // Role filter
        if (this.userRoleFilter !== 'ALL' && (u.role || 'citizen') !== this.userRoleFilter) return false;

        // Search query
        if (!this.userSearchQuery) return true;
        const emailMatch = u.email && u.email.toLowerCase().includes(this.userSearchQuery);
        const nameMatch = u.displayName && u.displayName.toLowerCase().includes(this.userSearchQuery);
        return emailMatch || nameMatch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Sin usuarios encontrados para el filtro y búsqueda actual.</div>';
        return;
      }

      grid.innerHTML = filtered.map(u => {
        const isAdmin = u.role === 'admin';
        const isPatrol = u.role === 'patrol';
        const isSuspended = u.status === 'suspended';
        const isDisabled = u.status === 'disabled';
        const trustVal = typeof u.trustScore === 'number' ? u.trustScore : 75;

        let roleLabel = '👤 Ciudadano';
        let roleBadgeClass = 'role-citizen';
        if (isAdmin) {
          roleLabel = '🛡️ Administrador';
          roleBadgeClass = 'role-admin';
        } else if (isPatrol) {
          roleLabel = '🚓 Patrullero';
          roleBadgeClass = 'role-patrol';
        }

        let statusLabel = '🟢 Activo';
        let statusBadgeClass = 'status-active-user';
        if (isSuspended) {
          statusLabel = '🔴 Suspendido';
          statusBadgeClass = 'status-suspended-user';
        } else if (isDisabled) {
          statusLabel = '⛔ Inhabilitado';
          statusBadgeClass = 'status-disabled-user';
        }

        return `
          <div class="admin-user-card" id="user-card-${u.uid}">
            <div class="user-card-header">
              <img src="${u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`}" alt="${u.displayName}" class="user-card-avatar">
              <div class="user-card-main-info">
                <h4>${u.displayName || 'Ciudadano'}</h4>
                <p>📧 ${u.email}</p>
                <div class="user-badge-row" style="margin-top: 4px;">
                  <span class="badge-role ${roleBadgeClass}">
                    ${roleLabel}
                  </span>
                  <span class="badge-status ${statusBadgeClass}">
                    ${statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div class="user-stat-grid">
              <div class="user-stat-box">
                <span>Reputación</span>
                <strong style="color: ${trustVal >= 80 ? 'var(--color-safe)' : (trustVal >= 50 ? 'var(--color-warning)' : 'var(--color-critical)')};">
                  ⭐ ${trustVal} / 100
                </strong>
              </div>
              <div class="user-stat-box">
                <span>Alertas Reportadas</span>
                <strong>🚨 ${u.verifiedReports || 0}</strong>
              </div>
            </div>

            <div class="user-card-actions">
              <button class="btn-user-action" onclick="window.dispatcherApp.openUserModeration('${u.uid}')" style="background:var(--color-accent);color:#fff;font-weight:700;">
                ⚙️ Moderar Cuenta
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    setupUserModerationModal() {
      const modal = document.getElementById('admin-user-action-modal');
      const closeBtn = document.getElementById('btn-close-user-modal');
      closeBtn?.addEventListener('click', () => {
        sounds.playClick();
        if (modal) modal.classList.add('hidden');
      });
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.classList.add('hidden');
        });
      }
    }

    openUserModeration(uid) {
      sounds.playClick();
      const users = firebaseAuth.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (!user) return;
      this.selectedUserForModeration = user;

      const modal = document.getElementById('admin-user-action-modal');
      const body = document.getElementById('user-modal-body');
      if (!modal || !body) return;

      const isSuperAdmin = user.email && user.email.toLowerCase() === 'gabyolarte2017@gmail.com';
      const isSuspended = user.status === 'suspended';
      const isDisabled = user.status === 'disabled';
      const suspendedUntilStr = user.suspendedUntil 
        ? (user.suspendedUntil === Infinity ? 'Indefinido / Permanente' : new Date(user.suspendedUntil).toLocaleString()) 
        : 'No';

      body.innerHTML = `
        <div class="user-moderation-grid">
          <div class="user-mod-header">
            <img src="${user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}" class="user-mod-avatar">
            <div class="user-mod-meta">
              <h4>${user.displayName}</h4>
              <p>📧 ${user.email}</p>
              <div style="display:flex;gap:6px;margin-top:4px;font-size:0.75rem;">
                <span style="color:var(--color-safe);font-weight:700;">⭐ ${user.trustScore || 100} pts</span>
                <span>• Rol: <strong>${user.role?.toUpperCase()}</strong></span>
                <span>• Estado: <strong style="color:${isSuspended ? 'var(--color-critical)' : (isDisabled ? 'var(--text-muted)' : 'var(--color-safe)')};">${user.status?.toUpperCase()}</strong></span>
              </div>
              ${isSuspended ? `<p style="color:var(--color-critical);font-size:0.7rem;margin-top:2px;">⏱️ Suspendido hasta: ${suspendedUntilStr}</p>` : ''}
            </div>
          </div>

          <!-- Section 1: Role Configuration -->
          <div class="mod-section-box">
            <div class="mod-section-title">🎭 Asignación de Rol</div>
            ${isSuperAdmin ? `
              <p style="font-size:0.75rem;color:var(--color-warning);">👑 Este usuario es el Super Administrador permanente del sistema.</p>
            ` : `
              <div style="display:flex;gap:8px;">
                <button class="tactical-btn ${user.role === 'citizen' ? 'active' : ''}" onclick="window.dispatcherApp.applyUserRoleChange('${user.uid}', 'citizen')" style="flex:1;">👤 Ciudadano</button>
                <button class="tactical-btn ${user.role === 'patrol' ? 'active' : ''}" onclick="window.dispatcherApp.applyUserRoleChange('${user.uid}', 'patrol')" style="flex:1;">🚓 Patrullero</button>
                <button class="tactical-btn ${user.role === 'admin' ? 'active' : ''}" onclick="window.dispatcherApp.applyUserRoleChange('${user.uid}', 'admin')" style="flex:1;">🛡️ Administrador</button>
              </div>
            `}
          </div>

          <!-- Section 2: Reputation Points -->
          <div class="mod-section-box">
            <div class="mod-section-title">⭐ Ajustar Puntos de Reputación</div>
            <div class="rep-buttons-grid">
              <button class="btn-rep-delta pos" onclick="window.dispatcherApp.applyReputationDelta('${user.uid}', 10)">+10 pts</button>
              <button class="btn-rep-delta pos" onclick="window.dispatcherApp.applyReputationDelta('${user.uid}', 5)">+5 pts</button>
              <button class="btn-rep-delta neg" onclick="window.dispatcherApp.applyReputationDelta('${user.uid}', -5)">-5 pts</button>
              <button class="btn-rep-delta neg" onclick="window.dispatcherApp.applyReputationDelta('${user.uid}', -10)">-10 pts</button>
            </div>
          </div>

          <!-- Section 3: Suspension Duration -->
          <div class="mod-section-box">
            <div class="mod-section-title">⏱️ Suspender por Tiempo Definido</div>
            ${isSuperAdmin ? `
              <p style="font-size:0.75rem;color:var(--text-muted);">El Super Administrador no puede ser suspendido.</p>
            ` : (
              isSuspended ? `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:0.75rem;color:var(--color-critical);">Cuenta suspendida</span>
                  <button class="tactical-btn" style="background:var(--color-safe);color:#0b0f19;font-weight:700;" onclick="window.dispatcherApp.liftSuspension('${user.uid}')">
                    ✅ Reactivar / Levantar Suspensión
                  </button>
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <label style="font-size:0.72rem;color:var(--text-muted);">Duración de la Suspensión:</label>
                  <select id="user-suspend-duration-select" class="tactical-input" style="background:#0e1726;color:#fff;">
                    <option value="3600000">1 Hora</option>
                    <option value="86400000" selected>24 Horas (1 Día)</option>
                    <option value="604800000">7 Días (1 Semana)</option>
                    <option value="2592000000">30 Días (1 Mes)</option>
                    <option value="Infinity">Permanente / Indefinido</option>
                  </select>
                  <button class="tactical-btn" style="background:rgba(255,42,85,0.2);border-color:var(--color-critical);color:var(--color-critical);font-weight:700;" onclick="window.dispatcherApp.applySuspension('${user.uid}')">
                    ⚠️ Aplicar Suspensión
                  </button>
                </div>
              `
            )}
          </div>

          <!-- Section 4: Activate / Disable Account -->
          <div class="mod-section-box">
            <div class="mod-section-title">🔒 Estado de la Cuenta</div>
            ${isSuperAdmin ? `
              <p style="font-size:0.75rem;color:var(--text-muted);">Super Administrador activo permanentemente.</p>
            ` : `
              <div style="display:flex;gap:10px;">
                ${isDisabled ? `
                  <button class="tactical-btn" style="background:rgba(16,185,129,0.2);color:var(--color-safe);flex:1;" onclick="window.dispatcherApp.reactivateAccount('${user.uid}')">
                    🟢 Activar Cuenta Inhabilitada
                  </button>
                ` : `
                  <button class="tactical-btn" style="background:rgba(255,255,255,0.08);color:var(--text-muted);flex:1;" onclick="window.dispatcherApp.disableAccount('${user.uid}')">
                    ⛔ Inhabilitar Cuenta
                  </button>
                `}
              </div>
            `}
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
    }

    applyUserRoleChange(uid, newRole) {
      sounds.playClick();
      firebaseAuth.updateUserRole(uid, newRole);
      this.openUserModeration(uid);
      this.renderUsersDirectory();
    }

    applyReputationDelta(uid, delta) {
      sounds.playClick();
      firebaseAuth.adjustUserReputation(uid, delta);
      this.openUserModeration(uid);
      this.renderUsersDirectory();
    }

    applySuspension(uid) {
      sounds.playWarningPing();
      const select = document.getElementById('user-suspend-duration-select');
      const durationMs = select?.value === 'Infinity' ? Infinity : parseInt(select?.value || '86400000', 10);
      firebaseAuth.suspendUser(uid, durationMs);
      this.openUserModeration(uid);
      this.renderUsersDirectory();
    }

    liftSuspension(uid) {
      sounds.playClick();
      firebaseAuth.reactivateUser(uid);
      this.openUserModeration(uid);
      this.renderUsersDirectory();
    }

    disableAccount(uid) {
      sounds.playWarningPing();
      firebaseAuth.disableUser(uid);
      this.openUserModeration(uid);
      this.renderUsersDirectory();
    }

    reactivateAccount(uid) {
      sounds.playClick();
      firebaseAuth.reactivateUser(uid);
      this.openUserModeration(uid);
      this.renderUsersDirectory();
    }

    setupAdminChat() {
      const channelBtns = document.querySelectorAll('.admin-chat-channel-item');
      const roleChips = document.querySelectorAll('.admin-chat-role-chips .chat-role-chip');
      const chatForm = document.getElementById('admin-chat-form');
      const chatInput = document.getElementById('admin-chat-input');
      const priorityRadios = document.querySelectorAll('input[name="admin-priority"]');

      channelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          sounds.playClick();
          channelBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const channel = btn.dataset.channel;
          if (window.chatService) window.chatService.selectChannel(channel);
          this.updateAdminChatHeader(channel);
          this.renderAdminChat();
        });
      });

      roleChips.forEach(chip => {
        chip.addEventListener('click', () => {
          sounds.playClick();
          roleChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.chatRoleFilter = chip.dataset.chatRole;
          this.renderAdminChatContacts();
        });
      });

      priorityRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          document.querySelectorAll('.admin-priority-pill').forEach(p => p.classList.remove('active'));
          radio.closest('.admin-priority-pill')?.classList.add('active');
        });
      });

      chatForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput?.value.trim();
        if (!text) return;
        const selectedPriority = document.querySelector('input[name="admin-priority"]:checked')?.value || 'NORMAL';
        if (window.chatService) {
          window.chatService.sendMessage({
            text,
            priority: selectedPriority,
            currentUser: {
              uid: 'user_admin_super',
              displayName: 'CENTRAL DE DESPACHO C2',
              email: 'Gabyolarte2017@gmail.com',
              role: 'admin',
              photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gaby'
            }
          });
        }
        if (chatInput) chatInput.value = '';
        sounds.playDispatchChime();
        this.renderAdminChat();
      });

      if (window.chatService) {
        window.chatService.onMessage(() => {
          this.renderAdminChat();
        });
      }

      this.renderAdminChat();
      this.renderAdminChatContacts();
    }

    updateAdminChatHeader(channelId, contact = null) {
      const title = document.getElementById('admin-chat-active-title');
      const desc = document.getElementById('admin-chat-active-desc');
      const icon = document.getElementById('admin-chat-active-icon');
      if (contact) {
        if (title) title.textContent = `Chat Directo con ${contact.displayName || contact.email}`;
        if (desc) desc.textContent = `Canal privado 1 a 1 (${contact.role?.toUpperCase()}) • ⭐ ${contact.trustScore || 100} pts`;
        if (icon) icon.textContent = contact.role === 'patrol' ? '🚓' : '👤';
      } else if (channelId === 'emergencias') {
        if (title) title.textContent = 'Canal #emergencias-sos 🚨';
        if (desc) desc.textContent = 'Despachos críticos y llamados de auxilio en tiempo real.';
        if (icon) icon.textContent = '🚨';
      } else if (channelId === 'cuadrante') {
        if (title) title.textContent = 'Canal #cuadrante-operativo 🚓';
        if (desc) desc.textContent = 'Coordinación interna de patrullas y móviles policiales.';
        if (icon) icon.textContent = '🚓';
      } else {
        if (title) title.textContent = 'Canal #general-vecinal 💬';
        if (desc) desc.textContent = 'Transmisión bidireccional entre la central de mando, patrulleros y vecinos.';
        if (icon) icon.textContent = '💬';
      }
    }

    renderAdminChat() {
      const container = document.getElementById('admin-chat-messages-feed');
      if (!container || !window.chatService) return;
      const messages = window.chatService.getMessagesForCurrentContext('user_admin_super');

      if (messages.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--text-muted);font-size:0.85rem;">Canal limpio. Sin transmisiones en esta frecuencia.</div>';
        return;
      }

      container.innerHTML = messages.map(m => {
        const isSelf = m.senderId === 'user_admin_super' || (m.senderEmail && m.senderEmail.toLowerCase() === 'gabyolarte2017@gmail.com');
        const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isEmergency = m.priority === 'EMERGENCY';
        const isWarning = m.priority === 'WARNING';
        const priorityClass = isEmergency ? 'priority-emergency' : (isWarning ? 'priority-warning' : 'priority-normal');

        const roleBadge = m.senderRole === 'admin' 
          ? '<span class="contact-role-badge badge-role-admin">🛡️ Admin</span>'
          : (m.senderRole === 'patrol' 
            ? '<span class="contact-role-badge badge-role-patrol">🚓 Patrullero</span>'
            : '<span class="contact-role-badge badge-role-citizen">👤 Vecino</span>');

        return `
          <div class="chat-msg-row ${isSelf ? 'msg-self' : 'msg-other'}">
            <img src="${m.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=anon'}" alt="${m.senderName}" class="msg-avatar">
            <div class="msg-bubble ${priorityClass}">
              <div class="msg-meta-row">
                <span class="msg-sender-name">${isSelf ? 'C2 Despacho (Tú)' : m.senderName}</span>
                ${roleBadge}
                ${isEmergency ? '<span class="msg-priority-badge badge-p-emergency">🚨 EMERGENCIA</span>' : (isWarning ? '<span class="msg-priority-badge badge-p-warning">⚠️ AVISO</span>' : '')}
                <span class="msg-time">${timeStr}</span>
              </div>
              <div class="msg-text-content">${this.escapeHtml(m.text)}</div>
            </div>
          </div>
        `;
      }).join('');

      container.scrollTop = container.scrollHeight;
    }

    renderAdminChatContacts() {
      const listEl = document.getElementById('admin-chat-contacts-list');
      if (!listEl || !window.chatService) return;

      const contacts = window.chatService.getContacts(this.chatRoleFilter);
      if (contacts.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.75rem;">Sin contactos para este filtro.</div>';
        return;
      }

      listEl.innerHTML = contacts.map(c => {
        const isPatrol = c.role === 'patrol';
        const isAdmin = c.role === 'admin';
        const roleLabel = isAdmin ? '🛡️ Super Admin' : (isPatrol ? '🚓 Patrullero' : '👤 Ciudadano');

        return `
          <div class="admin-contact-item" onclick="window.dispatcherApp.openDirectChatAdmin('${c.uid}')">
            <img src="${c.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.uid}`}" alt="${c.displayName}" class="admin-contact-avatar">
            <div class="admin-contact-meta">
              <h6>${c.displayName || c.email}</h6>
              <span>${roleLabel} • ⭐ ${c.trustScore || 100} pts</span>
            </div>
            <span style="font-size: 0.9rem; color: var(--color-info);">💬</span>
          </div>
        `;
      }).join('');
    }

    openDirectChatAdmin(uid) {
      if (!window.chatService) return;
      const contacts = window.chatService.getContacts('ALL');
      const contact = contacts.find(c => c.uid === uid);
      if (contact) {
        window.chatService.selectDirectContact(contact);
        this.updateAdminChatHeader(null, contact);
        document.querySelectorAll('.admin-chat-channel-item').forEach(b => b.classList.remove('active'));
        this.renderAdminChat();
      }
    }

    escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
    }

    setupBulkGenerator() {
      const modal = document.getElementById('admin-bulk-modal');
      const openBtn = document.getElementById('btn-open-bulk-modal');
      const closeBtn = document.getElementById('btn-close-bulk');
      const executeBtn = document.getElementById('btn-execute-bulk');

      openBtn?.addEventListener('click', () => {
        sounds.playClick();
        modal?.classList.remove('hidden');
      });

      const closeModal = () => {
        sounds.playClick();
        modal?.classList.add('hidden');
      };

      closeBtn?.addEventListener('click', closeModal);

      executeBtn?.addEventListener('click', async () => {
        sounds.playWarningPing();
        const count = parseInt(document.getElementById('bulk-count-select')?.value || '5', 10);
        const category = document.getElementById('bulk-category-select')?.value || 'MIXED';
        const radiusM = parseInt(document.getElementById('bulk-radius-select')?.value || '500', 10);
        const consensusLevel = document.getElementById('bulk-type-select')?.value || 'CRITICAL_SWARM';

        const center = this.tacticalMap?.map?.getCenter() || geoResolver.currentCoords;
        const availableCategories = ['ROBBERY', 'FIGHT', 'SUSPICIOUS', 'VANDALISM', 'ACCIDENT', 'MEDICAL'];

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * radiusM;
          const latJitter = (dist * Math.cos(angle)) / 111000;
          const lngJitter = (dist * Math.sin(angle)) / (111000 * Math.cos(center.lat * Math.PI / 180));

          const chosenCat = (category === 'MIXED')
            ? availableCategories[Math.floor(Math.random() * availableCategories.length)]
            : category;

          const res = swarmEngine.reportIncident({
            lat: center.lat + latJitter,
            lng: center.lng + lngJitter,
            category: chosenCat,
            note: `Mapeo masivo enjambre #${i + 1}`,
            userId: `sim_bot_${Math.floor(Math.random() * 9000 + 1000)}`,
            // El nivel de consenso lo decide el admin explícitamente: sirve para mapear/calibrar zonas de prueba
            forceStatus: consensusLevel === 'CRITICAL_SWARM' ? INCIDENT_STATES.CRITICAL_SWARM : null
          });

          if (res && res.incident) {
            firebaseSync.saveIncidentToCloud(res.incident);
          }
        }

        sounds.playCriticalAlarm();
        closeModal();
        this.renderIncidentQueue();
        if (this.tacticalMap) {
          this.tacticalMap.renderActiveIncidents();
          this.tacticalMap.renderHeatmap();
        }
      });
    }

    async renderBroadcastsList() {
      const container = document.getElementById('admin-broadcasts-list');
      if (!container) return;

      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Cargando avisos de zona...</div>';

      const broadcasts = await firebaseSync.getBroadcastsFromCloud();

      if (!broadcasts || broadcasts.length === 0) {
        container.innerHTML = `
          <div style="padding:40px 20px;text-align:center;color:var(--text-muted);background:rgba(255,255,255,0.02);border-radius:12px;border:1px dashed rgba(255,255,255,0.1);">
            <span style="font-size:2rem;">📢</span>
            <p style="margin:8px 0;">No hay avisos de zona registrados actualmente.</p>
            <small>Usa el botón "Emitir Comunicado Masivo" para crear un aviso con geoperímetro.</small>
          </div>
        `;
        return;
      }

      container.innerHTML = broadcasts.map(bc => {
        const isActive = bc.active !== false;
        const timeAgo = Math.max(1, Math.round((Date.now() - (bc.timestamp || Date.now())) / 60000));
        const radius = bc.radiusMeters || 50;

        return `
          <div class="admin-broadcast-card ${isActive ? 'active' : 'disabled'}" id="bc-card-${bc.id}" style="background:rgba(18,24,38,0.9);border:1px solid ${isActive ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)'};border-radius:12px;padding:16px;margin-bottom:12px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:1.4rem;">${isActive ? '🟢' : '⚪'}</span>
                <div>
                  <strong style="color:#fff;font-size:1rem;">${bc.title || 'Alerta de Zona'}</strong>
                  <div style="font-size:0.75rem;color:var(--text-muted);">⏱️ Hace ${timeAgo} min &bull; 📍 Perímetro: ${radius}m</div>
                </div>
              </div>
              <span style="background:${isActive ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.08)'};color:${isActive ? '#00e676' : 'var(--text-muted)'};padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">
                ${isActive ? 'ACTIVO' : 'DESACTIVADO'}
              </span>
            </div>

            <div style="background:rgba(0,0,0,0.25);border-radius:8px;padding:10px 12px;color:rgba(255,255,255,0.9);font-size:0.85rem;line-height:1.4;">
              ${bc.message || ''}
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px;">
              <button class="tactical-btn" style="padding:6px 14px;font-size:0.8rem;background:${isActive ? 'rgba(255,171,0,0.15)' : 'rgba(0,230,118,0.15)'};color:${isActive ? '#ffab00' : '#00e676'};border:1px solid currentColor;" onclick="window.dispatcherApp.toggleBroadcast('${bc.id}', ${!isActive})">
                ${isActive ? '⏸️ Desactivar' : '▶️ Activar'}
              </button>
              <button class="tactical-btn" style="padding:6px 14px;font-size:0.8rem;background:rgba(255,23,68,0.15);color:#ff1744;border:1px solid currentColor;" onclick="window.dispatcherApp.deleteBroadcast('${bc.id}')">
                🗑️ Eliminar
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    async toggleBroadcast(id, active) {
      sounds.playClick();
      await firebaseSync.toggleBroadcastStatus(id, active);
      this.renderBroadcastsList();
    }

    async deleteBroadcast(id) {
      sounds.playWarningPing();
      await firebaseSync.deleteBroadcast(id);
      this.renderBroadcastsList();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.dispatcherApp = new DispatcherApp();
    });
  } else {
    window.dispatcherApp = new DispatcherApp();
  }
})();
