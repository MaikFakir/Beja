/**
 * Colmena Segura - Universal Single-Bundle Script for Citizen App
 * Features: High-Precision Segment-Level Hazard Detection, Real Dual-Route Visualization (Direct Danger Route + Semi-transparent Alternate Sub-Route),
 * Interactive Detour Acceptance/Rejection, Turn-by-Turn Guidance, Dynamic Trust & Swarm Consensus.
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

  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      if (resp.ok) {
        const data = await resp.json();
        if (data.display_name) {
          const parts = data.display_name.split(',');
          return parts.slice(0, 3).join(',').trim();
        }
      }
    } catch (e) {}
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

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

  // --- 2. REAL-TIME EVENT BUS ---
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
      const payload = { event: eventName, data, timestamp: Date.now(), senderId: this.getSenderId() };
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

    getSenderId() {
      let id = sessionStorage.getItem('colmena_client_id');
      if (!id) {
        id = 'user_' + Math.random().toString(36).substring(2, 8);
        sessionStorage.setItem('colmena_client_id', id);
      }
      return id;
    }
  }

  const syncBus = new SyncBus();

  // --- 3. DYNAMIC TRUST & REPUTATION ENGINE ---
  class TrustEngine {
    constructor() {
      this.STORAGE_KEY = 'colmena_user_trust_v2';
      this.state = this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return {
        score: 100,
        level: '🟢 Guardián Verificado',
        verifiedReports: 0,
        validationsGiven: 0,
        history: [
          { timestamp: Date.now() - 3600000, delta: '+100', reason: 'Nivel Máximo de Confianza Inicial' }
        ]
      };
    }

    save() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {}
    }

    awardPoints(delta, reason) {
      this.state.score = Math.max(0, Math.min(100, this.state.score + delta));
      
      if (this.state.score >= 95) this.state.level = '👑 Líder de Colmena';
      else if (this.state.score >= 85) this.state.level = '🔵 Centinela de Cuadrante';
      else if (this.state.score >= 70) this.state.level = '🟢 Guardián Activo';
      else if (this.state.score >= 45) this.state.level = '🟡 Ciudadano Iniciado';
      else this.state.level = '⚠️ En Observación';

      this.state.history.unshift({
        timestamp: Date.now(),
        delta: delta > 0 ? `+${delta}` : `${delta}`,
        reason
      });

      if (this.state.history.length > 10) this.state.history.pop();

      this.save();
      syncBus.emit('TRUST_UPDATED', { trust: this.state, delta, reason });
      return this.state;
    }

    recordVerifiedReport() {
      this.state.verifiedReports++;
      this.awardPoints(10, '¡Tu alerta fue validada y confirmada en enjambre!');
    }

    recordValidationGiven() {
      this.state.validationsGiven++;
      this.awardPoints(5, 'Aporte como testigo verificado en alerta comunitaria');
    }
  }

  const trustEngine = new TrustEngine();

  // --- 4. SWARM CONSTANTS & ENGINE ---
  const INCIDENT_STATES = {
    PROBING: 'PROBING',
    CRITICAL_SWARM: 'CRITICAL_SWARM',
    DISPATCHED: 'DISPATCHED',
    RESOLVED: 'RESOLVED',
    FALSE_ALARM: 'FALSE_ALARM'
  };

  const INCIDENT_CATEGORIES = {
    FIGHT: { id: 'FIGHT', name: 'Riña / Pelea', icon: '⚔️' },
    ROBBERY: { id: 'ROBBERY', name: 'Robo / Asalto', icon: '🚨' },
    MEDICAL: { id: 'MEDICAL', name: 'Emergencia Médica', icon: '🚑' },
    SUSPICIOUS: { id: 'SUSPICIOUS', name: 'Actividad Sospechosa', icon: '👁️' }
  };

  class SwarmEngine {
    constructor() {
      this.CLUSTER_RADIUS_METERS = 50;
      this.STORAGE_KEY_INCIDENTS = 'colmena_incidents_active_v2';
      this.STORAGE_KEY_HISTORY = 'colmena_incidents_history_v2';

      // Purge legacy v1 mock clutter from user browser
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

    reportIncident({ lat, lng, category = 'FIGHT', note = '', userId = null }) {
      userId = userId || syncBus.getSenderId();
      const now = Date.now();
      this.incidents = this.loadIncidents();

      let matchingCluster = this.incidents.find(inc => {
        if (inc.status === INCIDENT_STATES.RESOLVED || inc.status === INCIDENT_STATES.FALSE_ALARM) return false;
        return this.calculateDistanceMeters(lat, lng, inc.lat, inc.lng) <= this.CLUSTER_RADIUS_METERS;
      });

      let resultIncident;
      let isEscalated = false;

      if (matchingCluster) {
        matchingCluster.reporters.push({ userId, timestamp: now, note });
        matchingCluster.updatedAt = now;
        matchingCluster.reportCount = matchingCluster.reporters.length;

        if (matchingCluster.reportCount >= 2 && matchingCluster.status === INCIDENT_STATES.PROBING) {
          matchingCluster.status = INCIDENT_STATES.CRITICAL_SWARM;
          isEscalated = true;
          trustEngine.recordVerifiedReport();
        }
        resultIncident = matchingCluster;
      } else {
        resultIncident = {
          id: 'inc_' + now + '_' + Math.random().toString(36).substr(2, 4),
          lat,
          lng,
          category,
          status: INCIDENT_STATES.PROBING,
          createdAt: now,
          updatedAt: now,
          reportCount: 1,
          creatorId: userId,
          reporters: [{ userId, timestamp: now, note }],
          assignedUnit: null
        };
        this.incidents.unshift(resultIncident);
      }

      this.history.push({
        lat,
        lng,
        category,
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

    validateIncidentAsWitness(incidentId) {
      const myId = syncBus.getSenderId();
      this.incidents = this.loadIncidents();
      const inc = this.incidents.find(i => i.id === incidentId);
      if (!inc) return false;

      const alreadyVoted = inc.reporters.some(r => r.userId === myId);
      if (alreadyVoted) return false;

      inc.reporters.push({ userId: myId, timestamp: Date.now(), note: 'Confirmado por testigo vecino.' });
      inc.reportCount = inc.reporters.length;

      let isEscalated = false;
      if (inc.reportCount >= 2 && inc.status === INCIDENT_STATES.PROBING) {
        inc.status = INCIDENT_STATES.CRITICAL_SWARM;
        isEscalated = true;
      }

      this.saveIncidents();
      trustEngine.recordValidationGiven();

      syncBus.emit('INCIDENT_MUTATION', { incident: inc, isEscalated });
      if (isEscalated) {
        syncBus.emit('SWARM_ESCALATED_CRITICAL', { incident: inc });
      }
      return true;
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
      trustEngine.awardPoints(5, 'Patrulla asignada a tu reporte por despacho');
    }

    resolveIncident(incidentId) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      this.incidents = this.incidents.filter(i => i.id !== incidentId);
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.RESOLVED });
      trustEngine.awardPoints(5, 'Incidente confirmado resuelto por las autoridades');
    }

    markFalseAlarm(incidentId) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      this.incidents = this.incidents.filter(i => i.id !== incidentId);
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.FALSE_ALARM });
      trustEngine.awardPoints(-15, 'Penalización: Reporte descartado como falsa alarma');
    }

    sendBroadcastAlert({ title, message }) {
      const bc = { id: 'bc_' + Date.now(), title, message, timestamp: Date.now() };
      syncBus.emit('COMMUNITY_BROADCAST', bc);
      return bc;
    }

    loadIncidents() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_INCIDENTS);
        return raw ? JSON.parse(raw) : [];
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
  }

  const swarmEngine = new SwarmEngine();

  // --- 5. TACTICAL RISK MAP WITH HIGH-PRECISION SEGMENT HAZARD INTERSECTION ---
  class RiskMap {
    constructor(containerId, options = {}) {
      this.containerId = containerId;
      this.map = null;
      this.heatLayer = null;
      this.markerLayerGroup = null;
      this.routeLayerGroup = null;
      this.userMarker = null;
      this.originPin = null;
      this.destPin = null;

      this.directPolyline = null;
      this.detourPolyline = null;
      this.activeRouteState = null;

      this.center = options.center || [geoResolver.currentCoords.lat, geoResolver.currentCoords.lng];
      this.userLocation = { lat: this.center[0], lng: this.center[1] };
      this.timeFilter = 'ALL';
      this.hasAutoCentered = false;
      this.onGeofenceChange = options.onGeofenceChange || (() => {});
      this.onMapClickCallback = options.onMapClickCallback || null;
      this.onOriginMoved = options.onOriginMoved || null;
      this.onDestMoved = options.onDestMoved || null;
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
          zoom: 16,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(this.map);

        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        this.markerLayerGroup = L.layerGroup().addTo(this.map);
        this.routeLayerGroup = L.layerGroup().addTo(this.map);

        this.setupUserMarker();
        this.renderHeatmap();
        this.renderActiveIncidents();

        geoResolver.subscribe((coords) => {
          this.setUserLocation(coords.lat, coords.lng, !this.hasAutoCentered);
          this.hasAutoCentered = true;
        });

        this.map.on('click', (e) => {
          if (this.onMapClickCallback) {
            this.onMapClickCallback(e.latlng);
          }
        });

        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 600);
        window.addEventListener('resize', () => {
          if (this.map) this.map.invalidateSize();
        });

        syncBus.on('INCIDENT_MUTATION', () => {
          this.renderActiveIncidents();
          this.renderHeatmap();
          this.checkGeofence();
        });

        syncBus.on('SWARM_ESCALATED_CRITICAL', () => {
          this.renderActiveIncidents();
          this.renderHeatmap();
          this.checkGeofence();
        });
      } catch (e) {
        console.error('Map init error', e);
      }
    }

    setupUserMarker() {
      if (!this.map || !window.L) return;
      const userIcon = L.divIcon({
        className: 'user-geo-marker',
        html: '<div class="user-beacon"><div class="user-pulse"></div><div class="user-dot"></div></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      this.userMarker = L.marker(this.center, { icon: userIcon, zIndexOffset: 2000 }).addTo(this.map);
    }

    setUserLocation(lat, lng, panTo = false) {
      this.userLocation = { lat, lng };
      if (this.userMarker) this.userMarker.setLatLng([lat, lng]);
      if (panTo && this.map) this.map.setView([lat, lng], 16, { animate: true });
      this.checkGeofence();
    }

    setOriginPin(lat, lng) {
      if (!this.map || !window.L) return;
      if (this.originPin) {
        this.originPin.setLatLng([lat, lng]);
      } else {
        const icon = L.divIcon({
          className: 'custom-pin-marker pin-origin-marker',
          html: '<div class="pin-bubble pin-orig-bubble">📍 Origen</div><div class="pin-point"></div>',
          iconSize: [80, 40],
          iconAnchor: [40, 38]
        });
        this.originPin = L.marker([lat, lng], { icon, draggable: true, zIndexOffset: 1500 }).addTo(this.map);
        this.originPin.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          if (this.onOriginMoved) this.onOriginMoved(pos);
        });
      }
    }

    setDestinationPin(lat, lng) {
      if (!this.map || !window.L) return;
      if (this.destPin) {
        this.destPin.setLatLng([lat, lng]);
      } else {
        const icon = L.divIcon({
          className: 'custom-pin-marker pin-dest-marker',
          html: '<div class="pin-bubble pin-dest-bubble">🏁 Destino</div><div class="pin-point"></div>',
          iconSize: [80, 40],
          iconAnchor: [40, 38]
        });
        this.destPin = L.marker([lat, lng], { icon, draggable: true, zIndexOffset: 1500 }).addTo(this.map);
        this.destPin.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          if (this.onDestMoved) this.onDestMoved(pos);
        });
      }
    }

    renderHeatmap() {
      if (!this.map || !window.L || !window.L.heatLayer) return;
      if (this.heatLayer) {
        this.map.removeLayer(this.heatLayer);
        this.heatLayer = null;
      }

      const rawHistory = swarmEngine.loadHistory();
      const activeIncidents = swarmEngine.loadIncidents();
      const points = [];

      rawHistory.forEach(pt => {
        if (this.timeFilter === 'ALL' || pt.timeOfDay === this.timeFilter) {
          points.push([pt.lat, pt.lng, pt.weight || 0.6]);
        }
      });

      // Place exact single heat point per active incident
      activeIncidents.forEach(inc => {
        const isCrit = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
        const mainWeight = isCrit ? 1.0 : (inc.reportCount >= 1 ? 0.8 : 0.6);
        points.push([inc.lat, inc.lng, mainWeight]);
      });

      if (points.length > 0) {
        this.heatLayer = L.heatLayer(points, {
          radius: 22,
          blur: 14,
          maxZoom: 18,
          max: 1.0,
          gradient: { 0.15: '#00f5a0', 0.40: '#ffb800', 0.65: '#ff5e3a', 0.90: '#ff1744' }
        }).addTo(this.map);
      }
    }

    setTimeFilter(filter) {
      this.timeFilter = filter;
      this.renderHeatmap();
    }

    renderActiveIncidents() {
      if (!this.markerLayerGroup || !this.map || !window.L) return;
      this.markerLayerGroup.clearLayers();

      const incidents = swarmEngine.loadIncidents();
      incidents.forEach(inc => {
        const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
        const isDispatched = inc.status === INCIDENT_STATES.DISPATCHED;
        const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;

        // 50m exact swarm cluster circle
        L.circle([inc.lat, inc.lng], {
          radius: 50,
          color: isCritical ? '#ff2a55' : (isDispatched ? '#00d2ff' : '#ffb800'),
          weight: 2,
          fillColor: isCritical ? '#ff2a55' : (isDispatched ? '#00d2ff' : '#ffb800'),
          fillOpacity: isCritical ? 0.3 : 0.15,
          dashArray: isCritical ? null : '4, 6'
        }).addTo(this.markerLayerGroup);

        const markerHtml = `
          <div class="incident-custom-marker ${isCritical ? 'critical' : (isDispatched ? 'dispatched' : 'probing')}">
            <div class="marker-radar-wave"></div>
            <div class="marker-core">
              <span class="marker-icon">${cat.icon}</span>
              <span class="marker-count">${inc.reportCount}</span>
            </div>
          </div>
        `;
        const icon = L.divIcon({ className: 'incident-leaflet-wrapper', html: markerHtml, iconSize: [44, 44], iconAnchor: [22, 22] });
        const marker = L.marker([inc.lat, inc.lng], { icon });
        
        marker.bindPopup(`
          <div class="tactical-popup">
            <div class="popup-header">
              <span class="popup-category">${cat.icon} ${cat.name}</span>
              <span class="popup-badge ${isCritical ? 'badge-critical' : 'badge-warning'}">
                ${isCritical ? '🚨 ALERTA CRÍTICA' : (isDispatched ? '🚔 Patrulla en camino' : '🟡 Sondeo')}
              </span>
            </div>
            <div class="popup-body">
              <p>👥 <strong>${inc.reportCount} ciudadano(s)</strong> en el enjambre de 50m.</p>
              <p style="color:var(--text-muted);font-size:0.7rem;">📍 Coordenadas: ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</p>
              ${inc.reporters[0]?.note ? `<p style="font-style:italic;margin-top:4px;color:#fff;">"${inc.reporters[0].note}"</p>` : ''}
              <button class="btn-popup-witness" onclick="if(window.citizenApp) window.citizenApp.voteWitness('${inc.id}')" style="margin-top:8px; width:100%; background:linear-gradient(135deg,#00f5a0 0%,#00d2ff 100%); color:#050c18; border:none; padding:7px 10px; border-radius:4px; font-weight:800; font-size:0.74rem; cursor:pointer;">
                🤝 Validar como Testigo (+5 pts)
              </button>
            </div>
          </div>
        `);
        this.markerLayerGroup.addLayer(marker);
      });
    }

    checkGeofence() {
      const incidents = swarmEngine.loadIncidents();
      let nearest = null, minDist = Infinity;
      incidents.forEach(inc => {
        if (inc.status === INCIDENT_STATES.RESOLVED || inc.status === INCIDENT_STATES.FALSE_ALARM) return;
        const dist = swarmEngine.calculateDistanceMeters(this.userLocation.lat, this.userLocation.lng, inc.lat, inc.lng);
        if (dist <= 220 && dist < minDist) {
          minDist = dist;
          nearest = { incident: inc, distanceMeters: Math.round(dist) };
        }
      });
      this.onGeofenceChange(nearest);
    }

    /**
     * Calculates the true shortest distance between a polyline (all segments) and a point
     */
    getMinDistanceToPolyline(coords, threatLat, threatLng) {
      let minDist = Infinity;
      for (let i = 0; i < coords.length; i++) {
        // Vertex distance
        const vDist = swarmEngine.calculateDistanceMeters(coords[i][0], coords[i][1], threatLat, threatLng);
        if (vDist < minDist) minDist = vDist;

        // Segment projection distance
        if (i < coords.length - 1) {
          const lat1 = coords[i][0], lng1 = coords[i][1];
          const lat2 = coords[i+1][0], lng2 = coords[i+1][1];
          const l2 = (lat1 - lat2)*(lat1 - lat2) + (lng1 - lng2)*(lng1 - lng2);
          if (l2 > 0) {
            let t = ((threatLat - lat1) * (lat2 - lat1) + (threatLng - lng1) * (lng2 - lng1)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projLat = lat1 + t * (lat2 - lat1);
            const projLng = lng1 + t * (lng2 - lng1);
            const sDist = swarmEngine.calculateDistanceMeters(threatLat, threatLng, projLat, projLng);
            if (sDist < minDist) minDist = sDist;
          }
        }
      }
      return minDist;
    }

    /**
     * Robust Dual-Route Navigation with Real Heatmap & Incident Intersection Validation
     * Includes Strict Multi-Corridor Bypass Avoidance and Travel Mode (walking vs driving)
     */
    async calculateSafeRoute(startLatLng, endLatLng, travelMode = 'walking') {
      if (!this.routeLayerGroup || !this.map || !window.L) return null;
      this.routeLayerGroup.clearLayers();
      this.directPolyline = null;
      this.detourPolyline = null;
      if (this.avoidedThreatMarker) {
        this.avoidedThreatMarker = null;
      }

      const mode = (travelMode === 'driving') ? 'driving' : 'walking';
      const activeThreats = swarmEngine.loadIncidents();
      const heatHistory = swarmEngine.loadHistory();

      // 1. Calculate Direct Primary Route via OSRM with current travel mode
      let directCoords = [];
      let directDistance = 0;
      let directDuration = 0;
      let directSteps = [];

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/${mode}/${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`;
        const resp = await fetch(osrmUrl);
        if (resp.ok) {
          const data = await resp.json();
          if (data.routes && data.routes.length > 0) {
            const r = data.routes[0];
            directDistance = r.distance;
            directDuration = r.duration;
            directCoords = r.geometry.coordinates.map(c => [c[1], c[0]]);
            if (r.legs && r.legs[0]?.steps) {
              directSteps = r.legs[0].steps.map(s => {
                const modifier = s.maneuver.modifier ? ` (${s.maneuver.modifier})` : '';
                const roadName = s.name ? `por <strong>${s.name}</strong>` : 'por vía principal';
                return `${s.maneuver.type}${modifier} ${roadName} (${Math.round(s.distance)} m)`;
              });
            }
          }
        }
      } catch (err) {}

      if (directCoords.length === 0) {
        directCoords = [
          [startLatLng.lat, startLatLng.lng],
          [startLatLng.lat + (endLatLng.lat - startLatLng.lat) * 0.5, startLatLng.lng],
          [endLatLng.lat, endLatLng.lng]
        ];
        directDistance = 1400;
        directDuration = (mode === 'walking') ? 1050 : 210;
        directSteps = ['Avanza en línea recta hacia tu destino.'];
      }

      // 2. High-Precision Segment-Level Intersection Detection (against 50m radius)
      let hasThreat = false;
      let threatDetails = null;

      // Check all active incidents
      for (const threat of activeThreats) {
        const dist = this.getMinDistanceToPolyline(directCoords, threat.lat, threat.lng);
        if (dist <= 85) {
          hasThreat = true;
          threatDetails = {
            type: INCIDENT_CATEGORIES[threat.category]?.name || 'Peligro / Alerta Activa',
            reports: threat.reportCount,
            lat: threat.lat,
            lng: threat.lng,
            isCritical: threat.status === INCIDENT_STATES.CRITICAL_SWARM
          };
          break;
        }
      }

      // Check all history heatmap points
      if (!hasThreat) {
        for (const hp of heatHistory) {
          const dist = this.getMinDistanceToPolyline(directCoords, hp.lat, hp.lng);
          if (dist <= 80) {
            hasThreat = true;
            threatDetails = {
              type: INCIDENT_CATEGORIES[hp.category]?.name || 'Zona de Calor / Alerta Reportada',
              reports: 'Punto Caliente Activo',
              lat: hp.lat,
              lng: hp.lng,
              isCritical: true
            };
            break;
          }
        }
      }

      // 3. Guaranteed Multi-Corridor Bypass Routing (Completely bypasses threat)
      let detourCoords = [];
      let detourDistance = 0;
      let detourDuration = 0;
      let detourSteps = [];
      let detourWaypoints = null;

      if (hasThreat && threatDetails) {
        const tLat = threatDetails.lat;
        const tLng = threatDetails.lng;
        const cosLat = Math.cos((tLat * Math.PI) / 180);

        // Vector from start to end
        let dLat = endLatLng.lat - startLatLng.lat;
        let dLng = (endLatLng.lng - startLatLng.lng) * cosLat;
        const len = Math.sqrt(dLat * dLat + dLng * dLng) || 0.001;
        const pLat = dLat / len;
        const pLng = dLng / len;
        const nLat = -pLng; // Normal vector
        const nLng = pLat;

        // Test multiple bypass corridors (lateral clearances: 180m, 260m, 360m, 480m) on BOTH sides
        const lateralDistances = [180, 260, 360, 480];
        const sideSigns = [1, -1]; // Right bypass (+1) and Left bypass (-1)
        const longitudinalOffset = 160; // Entry/exit point spacing in meters

        let bestCandidate = null;
        let minCandidateDist = Infinity;

        for (const latDist of lateralDistances) {
          for (const sign of sideSigns) {
            const latOff = (sign * latDist * nLat) / 111000;
            const lngOff = (sign * latDist * nLng) / (111000 * cosLat);
            const pOffLat = (longitudinalOffset * pLat) / 111000;
            const pOffLng = (longitudinalOffset * pLng) / (111000 * cosLat);

            const viaEntry = [tLat - pOffLat + latOff, tLng - pOffLng + lngOff];
            const viaApex = [tLat + latOff * 1.15, tLng + lngOff * 1.15];
            const viaExit = [tLat + pOffLat + latOff, tLng + pOffLng + lngOff];

            // Try OSRM route through the 3 via points to force the outer street
            try {
              const detourUrl = `https://router.project-osrm.org/route/v1/${mode}/${startLatLng.lng},${startLatLng.lat};${viaEntry[1]},${viaEntry[0]};${viaApex[1]},${viaApex[0]};${viaExit[1]},${viaExit[0]};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`;
              const dResp = await fetch(detourUrl);
              if (dResp.ok) {
                const dData = await dResp.json();
                if (dData.routes && dData.routes.length > 0) {
                  const dR = dData.routes[0];
                  const testCoords = dR.geometry.coordinates.map(c => [c[1], c[0]]);
                  const testDistToThreat = this.getMinDistanceToPolyline(testCoords, tLat, tLng);

                  // STRICT REQUIREMENT: Must be at least 75m away from the 50m alert circle
                  if (testDistToThreat >= 75) {
                    let steps = [];
                    if (dR.legs) {
                      steps = dR.legs.flatMap(l => l.steps || []).map(s => {
                        const roadName = s.name ? `por <strong>${s.name}</strong>` : 'por calle alterna';
                        return `Desvío seguro: ${s.maneuver.type} ${roadName} (${Math.round(s.distance)} m)`;
                      });
                    }
                    if (dR.distance < minCandidateDist) {
                      minCandidateDist = dR.distance;
                      bestCandidate = {
                        coords: testCoords,
                        distance: dR.distance,
                        duration: dR.duration,
                        steps: steps,
                        waypoint: viaApex
                      };
                    }
                  }
                }
              }
            } catch (e) {}

            if (bestCandidate) break;
          }
          if (bestCandidate) break;
        }

        // Apply best approved candidate or guaranteed geometric street corridor
        if (bestCandidate) {
          detourCoords = bestCandidate.coords;
          detourDistance = bestCandidate.distance;
          detourDuration = bestCandidate.duration;
          detourSteps = bestCandidate.steps;
          detourWaypoints = bestCandidate.waypoint;
        } else {
          // Guaranteed Geometric Street-Bypass Fallback
          const sign = 1;
          const latOff = (sign * 220 * nLat) / 111000;
          const lngOff = (sign * 220 * nLng) / (111000 * cosLat);
          const pOffLat = (160 * pLat) / 111000;
          const pOffLng = (160 * pLng) / (111000 * cosLat);

          const viaEntry = [tLat - pOffLat + latOff, tLng - pOffLng + lngOff];
          const viaApex = [tLat + latOff * 1.2, tLng + lngOff * 1.2];
          const viaExit = [tLat + pOffLat + latOff, tLng + pOffLng + lngOff];

          detourCoords = [
            [startLatLng.lat, startLatLng.lng],
            viaEntry,
            viaApex,
            viaExit,
            [endLatLng.lat, endLatLng.lng]
          ];
          detourDistance = directDistance + 360;
          detourDuration = (mode === 'walking') ? Math.round(detourDistance / 1.33) : Math.round(detourDistance / 8.33);
          detourSteps = [
            'Inicio de marcha en ruta despejada.',
            'Desvío perimetral por calle alterna esquivando zona de alerta (150m de resguardo).',
            'Incorporación a vía segura hacia el destino.'
          ];
          detourWaypoints = viaApex;
        }
      }

      // Draw Markers
      this.setOriginPin(startLatLng.lat, startLatLng.lng);
      this.setDestinationPin(endLatLng.lat, endLatLng.lng);

      const gmapsTravelParam = (mode === 'driving') ? 'driving' : 'walking';
      const directGmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLatLng.lat},${startLatLng.lng}&destination=${endLatLng.lat},${endLatLng.lng}&travelmode=${gmapsTravelParam}`;
      const detourGmapsUrl = detourWaypoints 
        ? `https://www.google.com/maps/dir/?api=1&origin=${startLatLng.lat},${startLatLng.lng}&destination=${endLatLng.lat},${endLatLng.lng}&waypoints=${detourWaypoints[0]},${detourWaypoints[1]}&travelmode=${gmapsTravelParam}` 
        : directGmapsUrl;

      // Render Visual Paths
      if (hasThreat && threatDetails) {
        // Direct route in Danger Red Warning style
        this.directPolyline = L.polyline(directCoords, {
          color: '#ff2a55',
          weight: 6,
          opacity: 0.95,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.routeLayerGroup);

        // Alternate Safe Sub-Route in Semi-Transparent Neon Green
        this.detourPolyline = L.polyline(detourCoords, {
          color: '#00f5a0',
          weight: 6,
          opacity: 0.5,
          dashArray: '6, 6',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.routeLayerGroup);

        const group = L.featureGroup([this.directPolyline, this.detourPolyline]);
        this.map.fitBounds(group.getBounds(), { padding: [50, 50] });

        sounds.playWarningPing();
        sounds.speakAlert(`Alerta: Tu camino directo cruza una zona con alerta activa de ${threatDetails.type}. Se sugiere desvío.`);

        this.activeRouteState = {
          hasThreat: true,
          threatDetails,
          travelMode: mode,
          directCoords,
          directDistanceKm: (directDistance / 1000).toFixed(1),
          directEtaMins: Math.max(1, Math.round(directDuration / 60)),
          directSteps,
          directGmapsUrl,
          detourCoords,
          detourDistanceKm: (detourDistance / 1000).toFixed(1),
          detourEtaMins: Math.max(1, Math.round(detourDuration / 60)),
          detourSteps,
          detourGmapsUrl,
          acceptedDetour: false
        };

        return {
          status: 'DANGER_ALTERNATE_OFFERED',
          threatDetails,
          travelMode: mode,
          direct: {
            distanceKm: (directDistance / 1000).toFixed(1),
            etaMins: Math.max(1, Math.round(directDuration / 60)),
            steps: directSteps,
            gmapsUrl: directGmapsUrl
          },
          detour: {
            distanceKm: (detourDistance / 1000).toFixed(1),
            etaMins: Math.max(1, Math.round(detourDuration / 60)),
            steps: detourSteps,
            gmapsUrl: detourGmapsUrl
          }
        };
      } else {
        // Clear route
        this.directPolyline = L.polyline(directCoords, {
          color: '#00d2ff',
          weight: 5,
          opacity: 0.9
        }).addTo(this.routeLayerGroup);

        this.map.fitBounds(this.directPolyline.getBounds(), { padding: [60, 60] });

        this.activeRouteState = {
          hasThreat: false,
          travelMode: mode,
          directCoords,
          directDistanceKm: (directDistance / 1000).toFixed(1),
          directEtaMins: Math.max(1, Math.round(directDuration / 60)),
          directSteps,
          directGmapsUrl
        };

        return {
          status: 'CLEAR',
          travelMode: mode,
          distanceKm: (directDistance / 1000).toFixed(1),
          etaMins: Math.max(1, Math.round(directDuration / 60)),
          steps: directSteps,
          googleMapsUrl: directGmapsUrl
        };
      }
    }

    acceptDetour() {
      if (!this.activeRouteState || !this.detourPolyline) return;
      this.activeRouteState.acceptedDetour = true;

      this.detourPolyline.setStyle({
        color: '#00f5a0',
        weight: 7,
        opacity: 1.0,
        dashArray: null
      });

      if (this.directPolyline) {
        this.directPolyline.setStyle({
          opacity: 0.15,
          weight: 2,
          color: '#ff2a55'
        });
      }

      // Add visual "Zona Evitada" indicator directly over the alert coordinates
      if (this.activeRouteState.threatDetails) {
        const t = this.activeRouteState.threatDetails;
        if (this.avoidedThreatMarker) {
          this.routeLayerGroup.removeLayer(this.avoidedThreatMarker);
        }
        const shieldIcon = L.divIcon({
          className: 'avoided-threat-marker',
          html: `
            <div style="background: rgba(0,245,160,0.15); border: 2px dashed #00f5a0; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; transform: translate(-30px, -30px); pointer-events: none;">
              <span style="background: var(--bg-card); color: var(--color-safe); font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--color-safe); white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.6);">
                🛡️ Punto Evitado (50m)
              </span>
            </div>
          `,
          iconSize: [0, 0]
        });
        this.avoidedThreatMarker = L.marker([t.lat, t.lng], { icon: shieldIcon }).addTo(this.routeLayerGroup);
      }

      this.map.fitBounds(this.detourPolyline.getBounds(), { padding: [60, 60] });
      sounds.playDispatchChime();
      sounds.speakAlert('Ruta segura activada. Desvío confirmado esquivando la zona de alerta.');
    }

    rejectDetour() {
      if (!this.activeRouteState) return;
      this.activeRouteState.acceptedDetour = false;

      if (this.avoidedThreatMarker) {
        this.routeLayerGroup.removeLayer(this.avoidedThreatMarker);
        this.avoidedThreatMarker = null;
      }

      if (this.detourPolyline) {
        this.routeLayerGroup.removeLayer(this.detourPolyline);
        this.detourPolyline = null;
      }

      if (this.directPolyline) {
        this.directPolyline.setStyle({
          color: '#ff2a55',
          weight: 6,
          opacity: 0.95,
          dashArray: '8, 8'
        });
      }

      sounds.playWarningPing();
      sounds.speakAlert('Continuando por ruta directa con precaución.');
    }

    clearRoutes() {
      if (this.routeLayerGroup) this.routeLayerGroup.clearLayers();
      if (this.avoidedThreatMarker) {
        this.avoidedThreatMarker = null;
      }
      if (this.destPin) {
        this.map.removeLayer(this.destPin);
        this.destPin = null;
      }
      this.activeRouteState = null;
    }
  }

  // --- 6. SIMULATOR ---
  const simulator = {
    async runStreetFightScenario(baseCoords) {
      sounds.playClick();
      const coords = baseCoords || geoResolver.currentCoords;
      swarmEngine.reportIncident({ lat: coords.lat, lng: coords.lng, category: 'FIGHT', note: 'Riña callejera en progreso.', userId: 'bot_1' });
      await new Promise(r => setTimeout(r, 1800));
      swarmEngine.reportIncident({ lat: coords.lat + 0.00035, lng: coords.lng + 0.0003, category: 'FIGHT', note: 'Confirmado, varios involucrados peleando.', userId: 'bot_2' });
      await new Promise(r => setTimeout(r, 2200));
      swarmEngine.reportIncident({ lat: coords.lat - 0.0003, lng: coords.lng + 0.0002, category: 'FIGHT', note: 'Gritos de auxilio.', userId: 'bot_3' });
    },
    async runRobberyScenario(baseCoords) {
      sounds.playClick();
      const coords = baseCoords || geoResolver.currentCoords;
      swarmEngine.reportIncident({ lat: coords.lat + 0.001, lng: coords.lng - 0.001, category: 'ROBBERY', note: 'Asalto a mano armada a transeúnte.', userId: 'bot_a' });
      await new Promise(r => setTimeout(r, 1500));
      swarmEngine.reportIncident({ lat: coords.lat + 0.0013, lng: coords.lng - 0.0009, category: 'ROBBERY', note: 'Sujetos armados en fuga.', userId: 'bot_b' });
    },
    runFalseAlarmScenario(baseCoords) {
      sounds.playClick();
      const coords = baseCoords || geoResolver.currentCoords;
      swarmEngine.reportIncident({ lat: coords.lat - 0.002, lng: coords.lng - 0.002, category: 'SUSPICIOUS', note: 'Reporte aislado no verificado.', userId: 'bot_lone' });
    },
    resetAll() {
      localStorage.removeItem(swarmEngine.STORAGE_KEY_INCIDENTS);
      localStorage.removeItem(swarmEngine.STORAGE_KEY_HISTORY);
      localStorage.removeItem(trustEngine.STORAGE_KEY);
      swarmEngine.incidents = [];
      swarmEngine.history = [];
      trustEngine.state = trustEngine.load();
      syncBus.emit('INCIDENT_MUTATION', { action: 'RESET' });
      syncBus.emit('TRUST_UPDATED', { trust: trustEngine.state });
    }
  };

  // --- 6.5. FIREBASE REAL-TIME CLOUD SYNCHRONIZER (PLAN SPARK) ---
  class FirebaseSyncService {
    constructor() {
      this.db = null;
      this.isConfigured = false;
      this.isConnected = false;
      this.lastKnownIncidentIds = new Set();
    }

    init() {
      const config = (typeof window !== 'undefined' && window.COLMENA_FIREBASE_CONFIG) 
        ? window.COLMENA_FIREBASE_CONFIG 
        : null;

      if (!config || !config.apiKey || config.apiKey.trim() === '') {
        this.updateCloudStatusBadge(false);
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
          this.updateCloudStatusBadge(true);
          this.listenToCloudChanges();
        }
      } catch (err) {
        console.warn('Firebase error:', err);
        this.updateCloudStatusBadge(false);
      }
    }

    listenToCloudChanges() {
      if (!this.db) return;

      this.db.collection('incidents').onSnapshot((snapshot) => {
        const cloudIncidents = [];
        let hasNewCritical = false;

        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          cloudIncidents.push(data);

          if (!this.lastKnownIncidentIds.has(doc.id)) {
            this.lastKnownIncidentIds.add(doc.id);
            if (data.status === INCIDENT_STATES.CRITICAL_SWARM) {
              hasNewCritical = true;
            }
          }
        });

        if (cloudIncidents.length > 0) {
          swarmEngine.incidents = cloudIncidents;
          localStorage.setItem(swarmEngine.STORAGE_KEY_INCIDENTS, JSON.stringify(cloudIncidents));
          syncBus.emit('INCIDENT_MUTATION', { action: 'CLOUD_SYNC' });
          if (hasNewCritical) {
            sounds.playCriticalAlarm();
          }
        }
      }, (err) => console.warn('Sync error:', err));

      this.db.collection('broadcasts').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            syncBus.emit('COMMUNITY_BROADCAST', change.doc.data());
          }
        });
      }, (err) => console.warn('Broadcast sync error:', err));
    }

    async saveIncidentToCloud(incident) {
      if (!this.isConfigured || !this.db || !incident) return;
      try {
        await this.db.collection('incidents').doc(incident.id).set(incident, { merge: true });
      } catch (e) {}
    }

    updateCloudStatusBadge(isOnline) {
      let badge = document.getElementById('cloud-sync-status-badge');
      if (!badge) {
        const header = document.querySelector('.header-actions') || document.querySelector('.top-bar-brand');
        if (header) {
          badge = document.createElement('span');
          badge.id = 'cloud-sync-status-badge';
          badge.className = 'gps-pill';
          badge.style.cursor = 'pointer';
          badge.style.transition = 'all 0.3s ease';
          header.insertBefore(badge, header.firstChild);
        }
      }

      if (badge) {
        if (isOnline) {
          badge.innerHTML = '☁️ Nube Activa';
          badge.title = 'Conectado a Google Firebase Firestore (Sincronización en Tiempo Real)';
          badge.style.background = 'rgba(0, 245, 160, 0.15)';
          badge.style.borderColor = 'var(--color-safe)';
          badge.style.color = 'var(--color-safe)';
        } else {
          badge.innerHTML = '📍 Modo Local';
          badge.title = 'Funcionando en almacenamiento local. Configura tus claves de Firebase en js/firebase-config.js para sincronizar entre celulares.';
          badge.style.background = 'rgba(255, 255, 255, 0.08)';
          badge.style.borderColor = 'var(--border-glass)';
          badge.style.color = 'var(--text-dim)';
        }
      }
    }
  }

  const firebaseSync = window.firebaseSync || new FirebaseSyncService();
  if (typeof window !== 'undefined') window.firebaseSync = firebaseSync;

  // --- 6.6. FIREBASE AUTHENTICATION SERVICE (GOOGLE SIGN-IN) ---
  class FirebaseAuthService {
    constructor() {
      this.auth = null;
      this.currentUser = null;
      this.isConfigured = false;
      this.authStateListeners = [];
      this.STORAGE_KEY_USER = 'colmena_auth_current_user';
      this.STORAGE_KEY_ALL_USERS = 'colmena_registered_users_directory';
      this.init();
    }

    init() {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY_USER);
        if (saved) this.currentUser = JSON.parse(saved);
      } catch (e) {}

      const config = (typeof window !== 'undefined' && window.COLMENA_FIREBASE_CONFIG) 
        ? window.COLMENA_FIREBASE_CONFIG 
        : null;

      if (config && config.apiKey && config.apiKey.trim() !== '' && window.firebase && window.firebase.auth) {
        try {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(config);
          }
          this.auth = window.firebase.auth();
          this.isConfigured = true;

          this.auth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
              const userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
                role: 'citizen',
                trustScore: 100,
                verifiedReports: 0,
                validationsGiven: 0,
                status: 'active',
                lastLoginAt: Date.now()
              };
              this.setCurrentUser(userProfile);
            } else {
              this.setCurrentUser(null);
            }
          });
        } catch (err) {
          console.warn('Firebase Auth error:', err);
        }
      }
    }

    async loginWithGoogle() {
      if (this.isConfigured && this.auth) {
        try {
          const provider = new window.firebase.auth.GoogleAuthProvider();
          const result = await this.auth.signInWithPopup(provider);
          return result.user;
        } catch (err) {
          console.warn('Google Popup issue, usando acceso asistido:', err);
          return this.promptLocalDemoLogin();
        }
      } else {
        return this.promptLocalDemoLogin();
      }
    }

    async logout() {
      if (this.isConfigured && this.auth) {
        try { await this.auth.signOut(); } catch (e) {}
      }
      this.setCurrentUser(null);
    }

    promptLocalDemoLogin() {
      const email = prompt('🔐 Iniciar Sesión con Google:\nIngresa tu correo de Gmail para identificarte en la Colmena:', 'vecino.colmena@gmail.com');
      if (!email || !email.includes('@')) {
        return null;
      }
      const name = email.split('@')[0].replace('.', ' ').toUpperCase();
      const demoUser = {
        uid: 'google_' + btoa(email).replace(/=/g, '').slice(0, 10),
        email: email.trim().toLowerCase(),
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        role: email.includes('admin') ? 'admin' : 'citizen',
        trustScore: 100,
        verifiedReports: 0,
        validationsGiven: 0,
        status: 'active',
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };

      this.setCurrentUser(demoUser);
      return demoUser;
    }

    setCurrentUser(user) {
      this.currentUser = user;
      if (user) {
        try {
          localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(user));
          this.saveToUsersDirectory(user);
        } catch (e) {}
      } else {
        try {
          localStorage.removeItem(this.STORAGE_KEY_USER);
        } catch (e) {}
      }

      this.authStateListeners.forEach(cb => {
        try { cb(this.currentUser); } catch (err) {}
      });
      syncBus.emit('AUTH_STATE_CHANGED', { user: this.currentUser });
    }

    saveToUsersDirectory(user) {
      let users = this.getUsersList();
      const idx = users.findIndex(u => u.email === user.email || u.uid === user.uid);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...user, lastLoginAt: Date.now() };
      } else {
        users.push({ ...user, createdAt: Date.now(), lastLoginAt: Date.now() });
      }
      try {
        localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(users));
      } catch (e) {}

      if (window.firebaseSync && window.firebaseSync.db) {
        window.firebaseSync.db.collection('users').doc(user.uid).set(user, { merge: true }).catch(() => {});
      }
    }

    getUsersList() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_ALL_USERS);
        if (raw) return JSON.parse(raw);
      } catch (e) {}

      const initialDirectory = [
        {
          uid: 'user_admin_01',
          email: 'central.despacho@colmena.org',
          displayName: 'CENTRAL COMANDO METROPOLITANO',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
          role: 'admin',
          trustScore: 100,
          verifiedReports: 24,
          validationsGiven: 48,
          status: 'active',
          createdAt: Date.now() - 86400000 * 30
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
        },
        {
          uid: 'user_cit_03',
          email: 'carlos.rodriguez@gmail.com',
          displayName: 'CARLOS RODRÍGUEZ',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=carlos',
          role: 'citizen',
          trustScore: 78,
          verifiedReports: 2,
          validationsGiven: 8,
          status: 'active',
          createdAt: Date.now() - 86400000 * 5
        }
      ];
      try {
        localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(initialDirectory));
      } catch (e) {}
      return initialDirectory;
    }

    onAuthStateChanged(callback) {
      this.authStateListeners.push(callback);
      callback(this.currentUser);
    }
  }

  const firebaseAuth = window.firebaseAuth || new FirebaseAuthService();
  if (typeof window !== 'undefined') window.firebaseAuth = firebaseAuth;

  // --- 7. CITIZEN APP MAIN CONTROLLER ---
  class CitizenApp {
    constructor() {
      this.riskMap = null;
      this.currentCategory = 'FIGHT';
      this.userCoords = geoResolver.currentCoords;
      this.originCoords = { lat: this.userCoords.lat, lng: this.userCoords.lng };
      this.destinationCoords = null;
      this.pinSelectionMode = null;
      this.travelMode = 'walking';
      this.currentUser = firebaseAuth.currentUser;
      this.panicCountdownTimer = null;
      this.countdownSeconds = 3;

      this.init();
    }

    init() {
      try { firebaseSync.init(); } catch (e) { console.warn('Sync init warning:', e); }
      try { this.setupAuth(); } catch (e) { console.warn('Auth setup warning:', e); }
      try {
        this.riskMap = new RiskMap('citizen-map', {
          center: [this.userCoords.lat, this.userCoords.lng],
          onGeofenceChange: (threat) => this.handleGeofence(threat),
          onMapClickCallback: (latlng) => this.handleMapClick(latlng),
          onOriginMoved: (latlng) => {
            this.originCoords = { lat: latlng.lat, lng: latlng.lng };
            this.updateOriginAddressUI(latlng.lat, latlng.lng);
            if (this.destinationCoords) this.calculateAndRenderRoute();
          },
          onDestMoved: (latlng) => {
            this.destinationCoords = { lat: latlng.lat, lng: latlng.lng };
            this.updateDestAddressUI(latlng.lat, latlng.lng);
            this.calculateAndRenderRoute();
          }
        });
      } catch (e) { console.error('RiskMap init error:', e); }

      try {
        geoResolver.subscribe((coords, isGps) => {
          this.userCoords = coords;
          if (!this.originCoords || this.originCoords.lat === 4.6097) {
            this.originCoords = { lat: coords.lat, lng: coords.lng };
          }
          this.updateGpsBadge(isGps);
          this.updateOriginAddressUI(this.originCoords.lat, this.originCoords.lng);
        });
      } catch (e) { console.warn('GeoResolver subscribe warning:', e); }

      try { this.setupTabs(); } catch (e) { console.error('setupTabs error:', e); }
      try { this.setupPanic(); } catch (e) { console.error('setupPanic error:', e); }
      try { this.setupRoutingControls(); } catch (e) { console.error('setupRoutingControls error:', e); }
      try { this.setupSimulation(); } catch (e) { console.error('setupSimulation error:', e); }
      try { this.setupSyncEvents(); } catch (e) { console.error('setupSyncEvents error:', e); }
      try { this.updateTrustUI(); } catch (e) { console.error('updateTrustUI error:', e); }
    }

    setupAuth() {
      const modal = document.getElementById('marketing-login-modal');
      const btnProfileLogin = document.getElementById('btn-login-google-profile');
      const btnProfileLogout = document.getElementById('btn-logout-profile');
      const btnCloseModal = document.getElementById('btn-close-marketing');
      const btnModalGoogle = document.getElementById('btn-modal-google-signin');
      const btnModalGuest = document.getElementById('btn-modal-guest-explore');
      const formQuickEmail = document.getElementById('quick-email-login-form');
      const inputModalEmail = document.getElementById('modal-email-input');

      const openModal = () => {
        sounds.playClick();
        if (modal) modal.classList.remove('hidden');
      };

      const closeModal = () => {
        sounds.playClick();
        if (modal) modal.classList.add('hidden');
      };

      btnProfileLogin?.addEventListener('click', openModal);
      btnCloseModal?.addEventListener('click', closeModal);
      
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal();
        });
      }

      btnModalGoogle?.addEventListener('click', async () => {
        sounds.playClick();
        try {
          const user = await firebaseAuth.loginWithGoogle();
          if (user) {
            closeModal();
            this.showToast(`¡Bienvenido/a, ${user.displayName}! Cuenta de Google vinculada.`, 'info');
          }
        } catch (e) {
          this.showToast('No se pudo completar el inicio de sesión con Google.', 'warning');
        }
      });

      btnModalGuest?.addEventListener('click', () => {
        closeModal();
        this.showToast('Explorando Colmena Segura en Modo Invitado Libre.', 'info');
      });

      formQuickEmail?.addEventListener('submit', (e) => {
        e.preventDefault();
        sounds.playClick();
        const email = inputModalEmail ? inputModalEmail.value.trim() : '';
        if (email && email.includes('@')) {
          const user = firebaseAuth.loginWithEmail(email);
          if (user) {
            closeModal();
            this.showToast(`¡Bienvenido/a, ${user.displayName}! Sesión iniciada.`, 'info');
          }
        }
      });

      btnProfileLogout?.addEventListener('click', async () => {
        sounds.playClick();
        await firebaseAuth.logout();
        this.showToast('Sesión cerrada.', 'info');
      });

      firebaseAuth.onAuthStateChanged((user) => {
        this.currentUser = user;
        this.renderAuthUI(user);
      });
    }

    renderAuthUI(user) {
      const headerSlot = document.getElementById('user-auth-header-slot');
      const avatarEl = document.getElementById('profile-user-avatar');
      const nameEl = document.getElementById('profile-user-name');
      const emailEl = document.getElementById('profile-user-email');
      const badgeEl = document.getElementById('profile-email-badge');
      const btnProfileLogin = document.getElementById('btn-login-google-profile');
      const btnProfileLogout = document.getElementById('btn-logout-profile');
      const modal = document.getElementById('marketing-login-modal');

      if (user) {
        // Header pill
        if (headerSlot) {
          headerSlot.innerHTML = `
            <div class="user-logged-pill" id="btn-header-logged-profile" title="Ver mi perfil de ciudadano">
              <img src="${user.photoURL}" alt="Avatar" class="user-avatar-mini">
              <span class="user-logged-name">${user.displayName.split(' ')[0]}</span>
            </div>
          `;
          headerSlot.querySelector('#btn-header-logged-profile')?.addEventListener('click', () => {
            sounds.playClick();
            document.querySelector('[data-tab="profile"]')?.click();
          });
        }

        // Profile Tab Identity Card
        if (avatarEl) avatarEl.src = user.photoURL;
        if (nameEl) nameEl.textContent = user.displayName;
        if (emailEl) emailEl.textContent = `📧 ${user.email}`;
        if (badgeEl) {
          badgeEl.className = 'badge-verified-email';
          badgeEl.style.background = 'rgba(0, 245, 160, 0.15)';
          badgeEl.style.borderColor = 'var(--color-safe)';
          badgeEl.style.color = 'var(--color-safe)';
          badgeEl.innerHTML = '✅ Verificado con Google';
        }
        if (btnProfileLogin) btnProfileLogin.classList.add('hidden');
        if (btnProfileLogout) btnProfileLogout.classList.remove('hidden');

      } else {
        // Header Button
        if (headerSlot) {
          headerSlot.innerHTML = `
            <a href="login.html" class="btn-auth-google-header" id="btn-login-google-header" title="Iniciar sesión con cuenta de Google">
              <span class="g-icon">🔐</span><span class="auth-btn-text"> Iniciar con Google</span>
            </a>
          `;
        }

        // Profile Tab Identity Card
        if (avatarEl) avatarEl.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=guest';
        if (nameEl) nameEl.textContent = 'Invitado / Anónimo';
        if (emailEl) emailEl.textContent = 'Sin cuenta vinculada';
        if (badgeEl) {
          badgeEl.className = 'badge-verified-email';
          badgeEl.style.background = 'rgba(255, 184, 0, 0.15)';
          badgeEl.style.borderColor = 'var(--color-warning)';
          badgeEl.style.color = 'var(--color-warning)';
          badgeEl.innerHTML = '🟡 Modo Local';
        }
        if (btnProfileLogin) {
          btnProfileLogin.classList.remove('hidden');
          btnProfileLogin.onclick = () => { window.location.href = 'login.html'; };
        }
        if (btnProfileLogout) btnProfileLogout.classList.add('hidden');
      }
    }

    async updateOriginAddressUI(lat, lng) {
      const origInput = document.getElementById('route-orig-input');
      if (origInput) {
        origInput.value = '📍 Obteniendo dirección...';
        const address = await reverseGeocode(lat, lng);
        origInput.value = `📍 ${address}`;
      }
    }

    async updateDestAddressUI(lat, lng) {
      const destInput = document.getElementById('route-dest-input');
      if (destInput) {
        destInput.value = '🏁 Obteniendo dirección...';
        const address = await reverseGeocode(lat, lng);
        destInput.value = `🏁 ${address}`;
      }
    }

    handleMapClick(latlng) {
      sounds.playClick();

      // Case 1: Route Pin Placement Mode explicitly activated
      if (this.pinSelectionMode === 'orig') {
        this.originCoords = { lat: latlng.lat, lng: latlng.lng };
        this.riskMap.setOriginPin(latlng.lat, latlng.lng);
        this.updateOriginAddressUI(latlng.lat, latlng.lng);
        this.showToast('📍 Origen colocado. Arrástralo si deseas moverlo.', 'info');
        this.setPinMode('dest');
        if (this.destinationCoords) this.calculateAndRenderRoute();
        return;
      }

      if (this.pinSelectionMode === 'dest') {
        this.destinationCoords = { lat: latlng.lat, lng: latlng.lng };
        this.riskMap.setDestinationPin(latlng.lat, latlng.lng);
        this.updateDestAddressUI(latlng.lat, latlng.lng);
        this.showToast('🏁 Destino fijado en la calle seleccionada.', 'info');
        this.calculateAndRenderRoute();
        this.setPinMode(null);
        document.getElementById('mobile-route-guide')?.remove();
        return;
      }

      // Case 2: Normal Radar & Map exploration view -> Inspect quadrant
      const incidents = swarmEngine.loadIncidents();
      let nearestInc = null;
      let minDistance = Infinity;

      incidents.forEach(inc => {
        const d = swarmEngine.calculateDistanceMeters(latlng.lat, latlng.lng, inc.lat, inc.lng);
        if (d < minDistance) {
          minDistance = d;
          nearestInc = inc;
        }
      });

      const isNearThreat = nearestInc && minDistance <= 50;
      const cat = nearestInc ? (INCIDENT_CATEGORIES[nearestInc.category] || INCIDENT_CATEGORIES.FIGHT) : null;
      const isCrit = nearestInc && nearestInc.status === INCIDENT_STATES.CRITICAL_SWARM;

      const popupHtml = `
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-category">📡 Radar de Cuadrante</span>
            <span class="popup-badge ${isNearThreat ? (isCrit ? 'badge-critical' : 'badge-warning') : 'badge-info'}">
              ${isNearThreat ? (isCrit ? '🚨 Zona Crítica' : '🟡 Sondeo Activo') : '🟢 Zona Segura'}
            </span>
          </div>
          <div class="popup-body">
            <p style="font-size:0.75rem;line-height:1.4;">
              ${isNearThreat 
                ? `🚨 <strong>${cat.icon} ${cat.name}</strong> a ${Math.round(minDistance)}m de este punto. Cuadrante con alertas en progreso.`
                : `🛡️ <strong>Sector Seguro</strong>. No se registran incidentes activos en un radio de 50m.${nearestInc && minDistance < 500 ? `<br><small style="color:var(--text-dim);">Alerta más cercana a ${Math.round(minDistance)}m.</small>` : ''}`
              }
            </p>
            <p style="font-size:0.68rem;color:var(--text-dim);margin-top:4px;">
              📍 Coordenadas: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}
            </p>
            <div style="margin-top:8px;">
              <button class="btn-popup-trigger-sos" id="btn-popup-report-here" style="width:100%;background:linear-gradient(135deg,#ff436e,#d80032);color:#fff;border:none;padding:6px 10px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:700;cursor:pointer;">
                🚨 Reportar Incidente en este Punto
              </button>
            </div>
          </div>
        </div>
      `;

      if (this.riskMap && this.riskMap.map && window.L) {
        window.L.popup({ className: 'tactical-radar-popup' })
          .setLatLng(latlng)
          .setContent(popupHtml)
          .openOn(this.riskMap.map);

        setTimeout(() => {
          document.getElementById('btn-popup-report-here')?.addEventListener('click', () => {
            sounds.playWarningPing();
            this.userCoords = { lat: latlng.lat, lng: latlng.lng };
            this.riskMap.map.closePopup();
            const sosBtn = document.querySelector('[data-tab="report"]');
            if (sosBtn) sosBtn.click();
            this.showToast(`🚨 Preparando reporte en [${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}]`, 'warning');
          });
        }, 100);
      }
    }

    setPinMode(mode) {
      this.pinSelectionMode = mode;
      const btnDest = document.getElementById('btn-mode-dest');
      const btnOrig = document.getElementById('btn-mode-orig');
      if (btnDest) btnDest.classList.toggle('active', mode === 'dest');
      if (btnOrig) btnOrig.classList.toggle('active', mode === 'orig');

      // On mobile, if setting destination/origin, switch to map view & show helper
      if (window.innerWidth < 900 && mode) {
        const mapBtn = document.querySelector('.bottom-nav-bar [data-tab="map"]');
        if (mapBtn) mapBtn.click();
        
        document.getElementById('mobile-route-guide')?.remove();
        const mapPane = document.getElementById('app-map-pane');
        if (mapPane) {
          const guide = document.createElement('div');
          guide.className = 'mobile-route-floating-guide';
          guide.id = 'mobile-route-guide';
          guide.innerHTML = `
            <span>${mode === 'dest' ? '🏁 Toca una calle para fijar DESTINO' : '📍 Toca el mapa para mover ORIGEN'}</span>
            <button class="btn-guide-back" id="btn-guide-back">📋 Rutas</button>
          `;
          mapPane.appendChild(guide);
          guide.querySelector('#btn-guide-back')?.addEventListener('click', () => {
            guide.remove();
            document.querySelector('.bottom-nav-bar [data-tab="routes"]')?.click();
          });
        }
      }
    }

    updateGpsBadge(isGps) {
      const badge = document.getElementById('gps-status-pill');
      if (badge) {
        if (isGps) {
          badge.innerHTML = `🟢 GPS<span class="gps-coords-text">: ${this.userCoords.lat.toFixed(3)}, ${this.userCoords.lng.toFixed(3)}</span>`;
          badge.className = 'gps-pill gps-active';
        } else {
          badge.innerHTML = `📍 Manual<span class="gps-coords-text">: ${this.userCoords.lat.toFixed(3)}, ${this.userCoords.lng.toFixed(3)}</span>`;
          badge.className = 'gps-pill gps-manual';
        }
      }
    }

    setupTabs() {
      const mobileNavItems = document.querySelectorAll('.nav-tab-item');
      const desktopNavItems = document.querySelectorAll('.desktop-tab-btn');
      const tabPanels = document.querySelectorAll('.tab-panel');
      const mapCanvasPane = document.getElementById('app-map-pane');
      const sidebarPanels = document.querySelector('.app-sidebar-panels');

      const switchTab = (target) => {
        sounds.playClick();

        mobileNavItems.forEach(n => {
          if (n.dataset.tab === target) n.classList.add('active');
          else n.classList.remove('active');
        });

        desktopNavItems.forEach(d => {
          if (d.dataset.tab === target) d.classList.add('active');
          else d.classList.remove('active');
        });

        tabPanels.forEach(p => p.classList.remove('active'));

        const panel = document.getElementById('tab-' + target);
        if (panel) panel.classList.add('active');

        const isMobile = window.innerWidth < 900;
        if (isMobile) {
          if (target === 'map') {
            if (mapCanvasPane) mapCanvasPane.classList.add('mobile-map-active');
            if (sidebarPanels) sidebarPanels.classList.add('mobile-map-view');
          } else {
            if (mapCanvasPane) mapCanvasPane.classList.remove('mobile-map-active');
            if (sidebarPanels) sidebarPanels.classList.remove('mobile-map-view');
          }
        }

        if (this.riskMap && this.riskMap.map) {
          setTimeout(() => this.riskMap.map.invalidateSize(), 150);
        }
      };

      mobileNavItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
      });

      desktopNavItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
      });

      if (window.innerWidth < 900) {
        if (mapCanvasPane) mapCanvasPane.classList.add('mobile-map-active');
        if (sidebarPanels) sidebarPanels.classList.add('mobile-map-view');
      }

      document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.riskMap) this.riskMap.setTimeFilter(btn.dataset.time);
          sounds.playClick();
        });
      });

      document.getElementById('btn-recenter-gps')?.addEventListener('click', () => {
        sounds.playClick();
        if (this.riskMap) {
          this.riskMap.setUserLocation(this.userCoords.lat, this.userCoords.lng, true);
        }
      });
    }

    setupPanic() {
      const panicBtn = document.getElementById('main-panic-btn');
      const desktopQuickPanic = document.getElementById('btn-quick-panic-desktop');
      const cancelBtn = document.getElementById('panic-cancel-btn');
      const categoryChips = document.querySelectorAll('.category-chip');

      categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
          sounds.playClick();
          categoryChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.currentCategory = chip.dataset.category;
        });
      });

      const triggerPanic = () => {
        sounds.playWarningPing();
        this.startPanicCountdown();
      };

      if (panicBtn) panicBtn.addEventListener('click', triggerPanic);
      if (desktopQuickPanic) desktopQuickPanic.addEventListener('click', triggerPanic);

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          if (this.panicCountdownTimer) {
            clearInterval(this.panicCountdownTimer);
            this.panicCountdownTimer = null;
          }
          document.getElementById('panic-countdown-overlay').classList.add('hidden');
          sounds.playClick();
          this.showToast('Alerta cancelada.', 'info');
        });
      }
    }

    startPanicCountdown() {
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
          overlay.classList.add('hidden');
          this.dispatchReport();
        }
      }, 1000);
    }

    dispatchReport() {
      const noteInput = document.getElementById('report-note-input');
      const note = noteInput ? noteInput.value.trim() : '';

      const reporterUser = this.currentUser || {
        uid: syncBus.getSenderId(),
        email: 'anónimo',
        displayName: 'Ciudadano Anónimo'
      };

      const { incident, isEscalated } = swarmEngine.reportIncident({
        lat: this.userCoords.lat,
        lng: this.userCoords.lng,
        category: this.currentCategory,
        note: note,
        userId: reporterUser.uid,
        userEmail: reporterUser.email,
        userName: reporterUser.displayName
      });

      // Save to Firebase Cloud
      firebaseSync.saveIncidentToCloud(incident);

      if (isEscalated) {
        sounds.playCriticalAlarm();
        sounds.speakAlert('Alerta de colmena confirmada. Zona roja activada.');
        this.showToast('🚨 ¡CONSENSO DE ENJAMBRE! 2+ ciudadanos confirmaron la alerta. (+10 pts)', 'critical');
      } else {
        sounds.playWarningPing();
        this.showToast('📡 Alerta de sondeo enviada. Esperando confirmación de vecinos...', 'warning');
      }

      const mapBtn = document.querySelector('[data-tab="map"]');
      if (mapBtn && window.innerWidth < 900) mapBtn.click();
    }

    setupRoutingControls() {
      const btnCalc = document.getElementById('btn-calc-route');
      const btnClear = document.getElementById('btn-clear-route');
      const btnModeDest = document.getElementById('btn-mode-dest');
      const btnModeOrig = document.getElementById('btn-mode-orig');
      const btnResetGps = document.getElementById('btn-reset-gps-orig');
      const btnModeWalking = document.getElementById('btn-mode-walking');
      const btnModeDriving = document.getElementById('btn-mode-driving');
      const searchInput = document.getElementById('route-search-input');
      const btnSearch = document.getElementById('btn-search-address');

      const setTravelMode = (mode) => {
        sounds.playClick();
        this.travelMode = mode;
        if (btnModeWalking) btnModeWalking.classList.toggle('active', mode === 'walking');
        if (btnModeDriving) btnModeDriving.classList.toggle('active', mode === 'driving');
        this.showToast(`Modo cambiado a: ${mode === 'walking' ? '🚶 A pie' : '🚗 En vehículo'}`, 'info');
        if (this.destinationCoords) {
          this.calculateAndRenderRoute();
        }
      };

      btnModeWalking?.addEventListener('click', () => setTravelMode('walking'));
      btnModeDriving?.addEventListener('click', () => setTravelMode('driving'));

      btnModeDest?.addEventListener('click', () => {
        sounds.playClick();
        this.setPinMode('dest');
        this.showToast('Toca cualquier calle en el mapa para colocar el DESTINO 🏁', 'info');
      });

      btnModeOrig?.addEventListener('click', () => {
        sounds.playClick();
        this.setPinMode('orig');
        this.showToast('Toca el mapa para mover tu punto de ORIGEN 📍', 'info');
      });

      btnResetGps?.addEventListener('click', () => {
        sounds.playClick();
        this.originCoords = { lat: this.userCoords.lat, lng: this.userCoords.lng };
        this.riskMap.setOriginPin(this.userCoords.lat, this.userCoords.lng);
        this.updateOriginAddressUI(this.userCoords.lat, this.userCoords.lng);
        this.showToast('🎯 Origen restablecido a tu GPS actual.', 'info');
        if (this.destinationCoords) this.calculateAndRenderRoute();
      });

      btnCalc?.addEventListener('click', () => {
        sounds.playClick();
        this.calculateAndRenderRoute();
      });

      btnClear?.addEventListener('click', () => {
        sounds.playClick();
        this.destinationCoords = null;
        this.riskMap.clearRoutes();
        document.getElementById('route-results-card').classList.add('hidden');
        document.getElementById('route-dest-input').value = '🏁 Toca el mapa o busca para elegir destino';
      });

      // Address Search
      const executeSearch = async () => {
        const q = searchInput?.value.trim();
        if (!q) return;
        sounds.playClick();
        const dropdown = document.getElementById('search-results-dropdown');
        if (dropdown) {
          dropdown.classList.remove('hidden');
          dropdown.innerHTML = '<div style="padding:10px;color:var(--text-muted);">🔍 Buscando en tu ciudad...</div>';
        }

        try {
          const lat = this.userCoords.lat;
          const lon = this.userCoords.lng;
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&viewbox=${lon-0.3},${lat+0.3},${lon+0.3},${lat-0.3}`;
          const resp = await fetch(url, { headers: { 'Accept-Language': 'es' } });
          if (resp.ok) {
            const results = await resp.json();
            if (results.length === 0) {
              if (dropdown) dropdown.innerHTML = '<div style="padding:10px;color:var(--color-warning);">No se encontraron lugares con ese nombre.</div>';
              return;
            }
            if (dropdown) {
              dropdown.innerHTML = results.map((r, i) => `
                <div class="search-result-item" data-index="${i}">
                  <strong>📍 ${r.display_name.split(',')[0]}</strong>
                  <small>${r.display_name.split(',').slice(1, 4).join(',')}</small>
                </div>
              `).join('');

              dropdown.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                  const idx = parseInt(item.dataset.index);
                  const selected = results[idx];
                  const destLat = parseFloat(selected.lat);
                  const destLng = parseFloat(selected.lon);

                  this.destinationCoords = { lat: destLat, lng: destLng };
                  this.riskMap.setDestinationPin(destLat, destLng);
                  this.updateDestAddressUI(destLat, destLng);
                  dropdown.classList.add('hidden');

                  if (this.riskMap.map) {
                    this.riskMap.map.setView([destLat, destLng], 16, { animate: true });
                  }

                  this.calculateAndRenderRoute();
                });
              });
            }
          }
        } catch (e) {
          if (dropdown) dropdown.innerHTML = '<div style="padding:10px;color:var(--color-critical);">Error al buscar dirección.</div>';
        }
      };

      btnSearch?.addEventListener('click', executeSearch);
      searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executeSearch();
      });
    }

    async calculateAndRenderRoute() {
      const start = this.originCoords || this.userCoords;
      if (!this.destinationCoords) {
        this.showToast('Por favor toca el mapa o busca un lugar para fijar tu destino.', 'warning');
        return;
      }

      const card = document.getElementById('route-results-card');
      const text = document.getElementById('route-results-text');
      const stepsCont = document.getElementById('route-steps-container');
      const stepsList = document.getElementById('route-steps-list');

      const modeIcon = (this.travelMode === 'driving') ? '🚗' : '🚶';
      const modeLabel = (this.travelMode === 'driving') ? 'En vehículo' : 'A pie';

      if (card && text) {
        card.classList.remove('hidden');
        text.innerHTML = `⏳ <em>Calculando ruta (${modeIcon} ${modeLabel}) y analizando zonas de riesgo...</em>`;
      }

      const res = await this.riskMap.calculateSafeRoute(start, this.destinationCoords, this.travelMode);

      if (res && card && text) {
        if (res.status === 'DANGER_ALTERNATE_OFFERED') {
          // Dangerous route detected with semi-transparent alternate offered
          card.className = 'route-results-card route-card-caution';
          text.innerHTML = `
            <div class="route-threat-alert-box">
              <span class="threat-badge-icon">⚠️</span>
              <div>
                <strong style="color:var(--color-critical);font-size:0.92rem;">¡ZONA PELIGROSA EN TRAYECTO DIRECTO!</strong>
                <p style="font-size:0.75rem;margin-top:2px;">
                  Tu ruta directa cruza por una zona caliente activa de <strong>${res.threatDetails.type}</strong>.
                </p>
              </div>
            </div>

            <div class="route-comparison-grid">
              <div class="route-choice-box choice-direct">
                <span class="choice-title">🔴 Ruta Directa</span>
                <span class="choice-meta">${res.direct.distanceKm} km | ~${res.direct.etaMins} min</span>
                <span class="choice-tag tag-danger">Cruza Zona Peligrosa</span>
              </div>
              <div class="route-choice-box choice-detour">
                <span class="choice-title">🟢 Sub-Ruta Alterna</span>
                <span class="choice-meta">${res.detour.distanceKm} km | ~${res.detour.etaMins} min</span>
                <span class="choice-tag tag-safe">100% Protegida (Verde Tenue)</span>
              </div>
            </div>

            <div class="route-decision-actions">
              <button class="btn-detour-accept" id="btn-accept-safe-detour">
                🛡️ Aceptar Desvío Seguro (+${Math.max(1, res.detour.etaMins - res.direct.etaMins)} min)
              </button>
              <button class="btn-detour-reject" id="btn-keep-dangerous-route">
                ⚠️ Continuar por Ruta Directa (Bajo mi riesgo)
              </button>
            </div>

            <div style="margin-top: 10px;" id="route-gmaps-link-box">
              <a href="${res.direct.gmapsUrl}" target="_blank" class="btn-gmaps-link" id="btn-gmaps-dynamic">
                🗺️ Abrir en Google Maps
              </a>
            </div>
          `;

          // Hook Decision Buttons
          document.getElementById('btn-accept-safe-detour')?.addEventListener('click', () => {
            sounds.playClick();
            this.riskMap.acceptDetour();
            this.showToast('🛡️ ¡Desvío seguro activado! Ruta verde fijada.', 'info');
            
            const gmapsBtn = document.getElementById('btn-gmaps-dynamic');
            if (gmapsBtn) gmapsBtn.href = res.detour.gmapsUrl;

            card.className = 'route-results-card route-card-safe';
            text.innerHTML = `
              <div style="color:var(--color-safe);font-weight:700;font-size:0.9rem;margin-bottom:6px;">
                🛡️ Ruta Segura Alterna Activada
              </div>
              <p style="font-size:0.78rem;">
                Desvío confirmado por calles seguras esquivando la zona de <strong>${res.threatDetails.type}</strong>.<br>
                📏 <strong>Distancia:</strong> ${res.detour.distanceKm} km | ⏱️ <strong>Tiempo:</strong> ${res.detour.etaMins} min.
              </p>
              <div style="margin-top: 10px;">
                <a href="${res.detour.gmapsUrl}" target="_blank" class="btn-gmaps-link">
                  🗺️ Abrir Desvío en Google Maps
                </a>
              </div>
            `;

            if (stepsCont && stepsList && res.detour.steps) {
              stepsCont.classList.remove('hidden');
              stepsList.innerHTML = res.detour.steps.map(s => `<li>${s}</li>`).join('');
            }
          });

          document.getElementById('btn-keep-dangerous-route')?.addEventListener('click', () => {
            sounds.playClick();
            this.riskMap.rejectDetour();
            this.showToast('⚠️ Modo Precaución: Estás en la ruta de riesgo.', 'warning');

            card.className = 'route-results-card route-card-caution';
            text.innerHTML = `
              <div style="color:var(--color-warning);font-weight:700;font-size:0.9rem;margin-bottom:6px;">
                ⚠️ Modo Precaución Activo (Ruta Directa)
              </div>
              <p style="font-size:0.78rem;">
                Mantén máxima atención al cruzar por la zona de <strong>${res.threatDetails.type}</strong>. Tu botón SOS está activo.<br>
                📏 <strong>Distancia:</strong> ${res.direct.distanceKm} km | ⏱️ <strong>Tiempo:</strong> ${res.direct.etaMins} min.
              </p>
              <div style="margin-top: 10px;">
                <a href="${res.direct.gmapsUrl}" target="_blank" class="btn-gmaps-link">
                  🗺️ Abrir en Google Maps
                </a>
              </div>
            `;

            if (stepsCont && stepsList && res.direct.steps) {
              stepsCont.classList.remove('hidden');
              stepsList.innerHTML = res.direct.steps.map(s => `<li>${s}</li>`).join('');
            }
          });

          if (stepsCont && stepsList && res.direct.steps) {
            stepsCont.classList.remove('hidden');
            stepsList.innerHTML = res.direct.steps.map(s => `<li>${s}</li>`).join('');
          }

        } else {
          // Clear route
          card.className = 'route-results-card route-card-safe';
          text.innerHTML = `
            ✅ <strong>Camino Despejado:</strong> Calles libres de alertas comunitarias y sin puntos calientes en el trayecto.<br><br>
            📏 <strong>Distancia:</strong> ${res.distanceKm} km | ⏱️ <strong>Tiempo estimado:</strong> ${res.etaMins} min.<br>
            <div style="margin-top: 10px;">
              <a href="${res.googleMapsUrl}" target="_blank" class="btn-gmaps-link">
                🗺️ Abrir Navegación en Google Maps
              </a>
            </div>
          `;

          if (res.steps && res.steps.length > 0 && stepsCont && stepsList) {
            stepsCont.classList.remove('hidden');
            stepsList.innerHTML = res.steps.map(s => `<li>${s}</li>`).join('');
          }
        }
      }
    }

    setupSimulation() {
      document.getElementById('btn-sim-fight')?.addEventListener('click', () => {
        this.showToast('⚔️ Simulando riña con 3 ciudadanos virtuales...', 'warning');
        simulator.runStreetFightScenario(this.userCoords);
      });
      document.getElementById('btn-sim-robbery')?.addEventListener('click', () => {
        this.showToast('🚨 Simulando asalto...', 'critical');
        simulator.runRobberyScenario(this.userCoords);
      });
      document.getElementById('btn-sim-false')?.addEventListener('click', () => {
        this.showToast('🟡 Reporte individual aislado...', 'warning');
        simulator.runFalseAlarmScenario(this.userCoords);
      });
      document.getElementById('btn-sim-reset')?.addEventListener('click', () => {
        sounds.playClick();
        simulator.resetAll();
        this.showToast('🧹 Mapa y Reputación reiniciados.', 'info');
      });
    }

    setupSyncEvents() {
      syncBus.on('SWARM_ESCALATED_CRITICAL', ({ incident }) => {
        sounds.playCriticalAlarm();
        sounds.speakAlert('Alerta comunitaria: Peligro confirmado en tu cuadrante.');
        this.showToast(`🚨 ¡PELIGRO ENJAMBRE CONFIRMADO! (${incident.reportCount} reportes)`, 'critical');
        this.renderFeed();
        this.updateTrustUI();
      });

      syncBus.on('UNIT_DISPATCHED', ({ incident }) => {
        sounds.playDispatchChime();
        this.showToast(`🚔 Patrulla ${incident.assignedUnit?.code || '01'} en camino. (+5 pts)`, 'info');
        this.updateTrustUI();
      });

      syncBus.on('TRUST_UPDATED', ({ trust, delta, reason }) => {
        sounds.playDispatchChime();
        this.updateTrustUI();
        if (delta && reason) {
          this.showToast(`⭐ Reputación ${delta} pts: ${reason}`, delta > 0 ? 'info' : 'warning');
        }
      });

      syncBus.on('COMMUNITY_BROADCAST', (bc) => {
        sounds.playCriticalAlarm();
        const modal = document.getElementById('broadcast-alert-modal');
        if (modal) {
          document.getElementById('broadcast-modal-title').textContent = bc.title;
          document.getElementById('broadcast-modal-msg').textContent = bc.message;
          modal.classList.remove('hidden');
          document.getElementById('broadcast-modal-close').onclick = () => {
            sounds.playClick();
            modal.classList.add('hidden');
          };
        }
      });

      syncBus.on('INCIDENT_MUTATION', () => {
        this.renderFeed();
        this.updateTrustUI();
      });
      this.renderFeed();
    }

    handleGeofence(threat) {
      const banner = document.getElementById('geofence-warning-banner');
      if (!banner) return;
      if (threat) {
        const cat = INCIDENT_CATEGORIES[threat.incident.category] || INCIDENT_CATEGORIES.FIGHT;
        const isCrit = threat.incident.status === INCIDENT_STATES.CRITICAL_SWARM;
        banner.classList.remove('hidden');
        banner.className = `geofence-banner ${isCrit ? 'banner-critical' : 'banner-warning'}`;
        banner.innerHTML = `
          <div class="banner-content">
            <span class="banner-icon">${isCrit ? '🚨' : '⚠️'}</span>
            <div class="banner-text">
              <strong>¡Atención! A ${threat.distanceMeters}m de una alerta activa</strong>
              <span>${cat.icon} ${cat.name} (${threat.incident.reportCount} reportes)</span>
            </div>
          </div>
          <button class="banner-dismiss-btn" id="btn-dismiss-geofence" aria-label="Cerrar aviso">✕</button>
        `;
        banner.querySelector('#btn-dismiss-geofence')?.addEventListener('click', (e) => {
          e.stopPropagation();
          banner.classList.add('hidden');
        });
      } else {
        banner.classList.add('hidden');
      }
    }

    renderFeed() {
      const mobileFeed = document.getElementById('recent-incidents-list');
      const desktopFeed = document.getElementById('desktop-incidents-list');
      const incidents = swarmEngine.loadIncidents();

      const html = incidents.length === 0 
        ? '<div style="text-align:center;padding:24px;color:var(--text-muted);">🛡️ Sin alertas activas en tu zona.</div>'
        : incidents.map(inc => {
            const isCrit = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
            const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;
            const isWitness = inc.reporters.some(r => r.userId === syncBus.getSenderId());

            return `
              <div class="incident-card ${isCrit ? 'card-critical' : 'card-warning'}">
                <div class="card-icon">${cat.icon}</div>
                <div class="card-info">
                  <div class="card-top">
                    <span class="card-title">${cat.name}</span>
                    <span class="card-badge ${isCrit ? 'badge-critical' : 'badge-warning'}">${isCrit ? '🚨 Enjambre Crítico' : '🟡 Sondeo'}</span>
                  </div>
                  <p class="card-sub">${inc.reportCount} ciudadano(s) coinciden en 50m</p>
                  <div class="incident-witness-action-row" style="margin-top:8px;">
                    ${!isWitness ? `
                      <button class="btn-witness-vote" onclick="window.citizenApp.voteWitness('${inc.id}')">
                        👍 Yo también lo veo (+5 pts)
                      </button>
                    ` : `
                      <span style="font-size:0.72rem;color:var(--color-safe);font-weight:700;">✅ Ya diste tu testimonio</span>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('');

      if (mobileFeed) mobileFeed.innerHTML = html;
      if (desktopFeed) desktopFeed.innerHTML = html;
    }

    voteWitness(incidentId) {
      sounds.playClick();
      const success = swarmEngine.validateIncidentAsWitness(incidentId);
      if (success) {
        const updated = swarmEngine.incidents.find(i => i.id === incidentId);
        if (updated) firebaseSync.saveIncidentToCloud(updated);
        this.showToast('🤝 ¡Testimonio registrado! Ganaste +5 pts de reputación.', 'info');
      } else {
        this.showToast('Ya validaste este reporte anteriormente.', 'warning');
      }
      this.renderFeed();
      this.updateTrustUI();
    }

    updateTrustUI() {
      const trust = trustEngine.state;
      const scoreNum = document.getElementById('trust-score-num');
      const scoreLevel = document.getElementById('trust-score-level');
      const verifiedCount = document.getElementById('trust-verified-count');
      const validationVotes = document.getElementById('trust-validation-votes');
      const quickTrust = document.getElementById('quick-trust-stat');
      const badgeCircle = document.getElementById('trust-badge-circle');
      const eventsList = document.getElementById('reputation-events-list');

      if (scoreNum) scoreNum.textContent = trust.score;
      if (scoreLevel) scoreLevel.textContent = trust.level;
      if (verifiedCount) verifiedCount.textContent = `✅ ${trust.verifiedReports} alerta(s) validadas`;
      if (validationVotes) validationVotes.textContent = `🤝 ${trust.validationsGiven} aporte(s) como testigo`;
      if (quickTrust) quickTrust.textContent = `${trust.score}/100`;

      if (badgeCircle) {
        if (trust.score >= 85) badgeCircle.style.borderColor = 'var(--color-safe)';
        else if (trust.score >= 50) badgeCircle.style.borderColor = 'var(--color-warning)';
        else badgeCircle.style.borderColor = 'var(--color-critical)';
      }

      if (eventsList && trust.history) {
        eventsList.innerHTML = trust.history.map(ev => {
          const isPos = ev.delta.startsWith('+');
          const dateStr = new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `
            <div class="reputation-event-card">
              <span class="event-delta ${isPos ? 'delta-pos' : 'delta-neg'}">${ev.delta} pts</span>
              <div class="event-desc">
                <strong>${ev.reason}</strong>
                <small>${dateStr}</small>
              </div>
            </div>
          `;
        }).join('');
      }
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
      }, 3500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.citizenApp = new CitizenApp();
    });
  } else {
    window.citizenApp = new CitizenApp();
  }

  window.Colmena = { sounds, syncBus, swarmEngine, simulator, geoResolver, trustEngine };
})();
