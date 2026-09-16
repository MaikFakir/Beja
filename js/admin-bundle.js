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
          trust.history.unshift({ timestamp: Date.now(), delta: '-15', reason: 'Penalización: Reporte descartado como falsa alarma' });
          if (trust.history.length > 10) trust.history.pop();
          localStorage.setItem('colmena_user_trust_v2', JSON.stringify(trust));
          syncBus.emit('TRUST_UPDATED', { trust, delta: -15, reason: 'Penalización por reporte falso' });
        }
      } catch (e) {}
    }

    sendBroadcastAlert({ title, message }) {
      const bc = { id: 'bc_' + Date.now(), title, message, timestamp: Date.now() };
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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(this.map);

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
        const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;

        // 50m swarm influence radius
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

        const popupContent = `
          <div class="tactical-popup">
            <div class="popup-header">
              <span class="popup-category">${cat.icon} ${cat.name}</span>
              <span class="popup-badge ${isCritical ? 'badge-critical' : 'badge-warning'}">
                ${isCritical ? '🚨 ENJAMBRE CRÍTICO' : (isDispatched ? '🚔 EN CAMINO' : '🟡 SONDEO')}
              </span>
            </div>
            <div class="popup-body">
              <p>👥 <strong>${inc.reportCount} ciudadano(s)</strong> coinciden en 200m.</p>
              <p style="color:var(--text-muted);font-size:0.72rem;">📍 Coordenadas: ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</p>
              ${inc.reporters[0]?.note ? `<p style="font-style:italic;margin:4px 0;">"${inc.reporters[0].note}"</p>` : ''}
              ${inc.assignedUnit ? `<p style="color:var(--color-info);font-weight:700;">🚔 ${inc.assignedUnit.code} (ETA ~${inc.assignedUnit.etaMinutes}m)</p>` : ''}
            </div>
            <div style="display:flex;gap:4px;margin-top:8px;">
              ${!isDispatched ? `
                <button class="btn-tactical btn-dispatch" onclick="window.dispatcherApp.dispatch('${inc.id}')">🚔 Despachar</button>
              ` : `
                <button class="btn-tactical btn-resolve" onclick="window.dispatcherApp.resolve('${inc.id}')">✅ Resolver</button>
              `}
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
      if (!this.isConfigured || !this.db || !broadcastData) return;
      try {
        await this.db.collection('broadcasts').add({
          ...broadcastData,
          timestamp: Date.now()
        });
      } catch (e) {}
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
      this.mobileView = 'map'; // 'map' or 'queue'
      this.currentView = 'radar'; // 'radar' or 'users'
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
      try { this.setupBroadcastModal(); } catch (e) { console.error('setupBroadcastModal error:', e); }
      try { this.setupSimulationBar(); } catch (e) { console.error('setupSimulationBar error:', e); }
      try { this.setupCategoryFilters(); } catch (e) { console.error('setupCategoryFilters error:', e); }
      try { this.setupMobileSwitcher(); } catch (e) { console.error('setupMobileSwitcher error:', e); }
      try { this.setupViewSwitcher(); } catch (e) { console.error('setupViewSwitcher error:', e); }
      try { this.setupUserDirectoryEvents(); } catch (e) { console.error('setupUserDirectoryEvents error:', e); }
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

    renderIncidentQueue() {
      const queue = document.getElementById('admin-incident-queue');
      if (!queue) return;

      const rawIncidents = swarmEngine.loadIncidents();
      const incidents = rawIncidents.filter(inc => {
        if (this.selectedFilter === 'ALL') return true;
        return inc.category === this.selectedFilter;
      });

      if (incidents.length === 0) {
        queue.innerHTML = `
          <div class="admin-empty-queue">
            <span style="font-size: 2.2rem;">🛡️</span>
            <p>Sin incidentes activos para el filtro seleccionado.</p>
            <small>La colmena de seguridad está monitoreando en vivo en tu ciudad.</small>
          </div>
        `;
        return;
      }

      queue.innerHTML = incidents.map(inc => {
        const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
        const isDispatched = inc.status === INCIDENT_STATES.DISPATCHED;
        const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;
        const timeElapsedMins = Math.max(1, Math.round((Date.now() - inc.createdAt) / 60000));

        return `
          <div class="admin-incident-card ${isCritical ? 'admin-card-critical' : (isDispatched ? 'admin-card-dispatched' : 'admin-card-probing')}">
            <div class="card-header-tactical">
              <div class="header-left">
                <span class="badge-status-tactical ${isCritical ? 'status-critical' : (isDispatched ? 'status-info' : 'status-warning')}">
                  ${isCritical ? '🔴 ENJAMBRE CRÍTICO' : (isDispatched ? '🔵 DESPACHADO' : '🟡 SONDEO PREVENTIVO')}
                </span>
                <span class="incident-code">#${inc.id.slice(-5).toUpperCase()}</span>
              </div>
              <span class="incident-time">⏱️ Hace ${timeElapsedMins} min</span>
            </div>

            <div class="card-body-tactical">
              <div class="category-row">
                <span>${cat.icon}</span>
                <strong>${cat.name}</strong>
                <span class="swarm-tally">👥 ${inc.reportCount} en 200m</span>
              </div>
              <p style="color:var(--text-dim);font-size:0.7rem;margin-top:2px;">📍 Zona: ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</p>
              ${inc.reporters[0]?.note ? `<div class="reporter-notes">"${inc.reporters[0].note}"</div>` : ''}
              ${inc.assignedUnit ? `<div class="dispatched-unit-info">🚔 ${inc.assignedUnit.code} (ETA ~${inc.assignedUnit.etaMinutes}m)</div>` : ''}
            </div>

            <div class="card-actions-tactical">
              ${!isDispatched ? `
                <button class="btn-tactical btn-dispatch" onclick="window.dispatcherApp.dispatch('${inc.id}')">🚔 Despachar</button>
              ` : `
                <button class="btn-tactical btn-resolve" onclick="window.dispatcherApp.resolve('${inc.id}')">✅ Resuelto</button>
              `}
              <button class="btn-tactical btn-locate" onclick="window.dispatcherApp.locate('${inc.id}')">📍 Ver Mapa</button>
              <button class="btn-tactical btn-dismiss" onclick="window.dispatcherApp.dismiss('${inc.id}')">❌ Falsa</button>
            </div>
          </div>
        `;
      }).join('');
    }

    dispatch(id) {
      sounds.playDispatchChime();
      swarmEngine.dispatchUnit(id, {
        code: 'PATRULLA-DELTA-' + Math.floor(Math.random() * 70 + 10),
        etaMinutes: Math.floor(Math.random() * 4 + 2)
      });
      const updated = swarmEngine.loadIncidents().find(i => i.id === id);
      if (updated) firebaseSync.saveIncidentToCloud(updated);
    }

    resolve(id) {
      sounds.playClick();
      const inc = swarmEngine.loadIncidents().find(i => i.id === id);
      swarmEngine.resolveIncident(id);
      if (inc) firebaseSync.saveIncidentToCloud({ ...inc, status: 'RESOLVED' });
    }

    dismiss(id) {
      sounds.playClick();
      const inc = swarmEngine.loadIncidents().find(i => i.id === id);
      swarmEngine.markFalseAlarm(id);
      if (inc) firebaseSync.saveIncidentToCloud({ ...inc, status: 'FALSE_ALARM' });
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
        if (msg) {
          sounds.playCriticalAlarm();
          swarmEngine.sendBroadcastAlert({ title, message: msg });
          firebaseSync.sendBroadcastToCloud({ title, message: msg });
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
    }

    setupViewSwitcher() {
      const btnViewRadar = document.getElementById('btn-view-radar');
      const btnViewUsers = document.getElementById('btn-view-users');
      const queuePanel = document.getElementById('admin-queue-panel');
      const mapPanel = document.getElementById('admin-map-panel');
      const categoryNav = document.getElementById('admin-category-nav');
      const usersPanel = document.getElementById('admin-users-panel');

      btnViewRadar?.addEventListener('click', () => {
        sounds.playClick();
        this.currentView = 'radar';
        btnViewRadar.classList.add('active');
        btnViewUsers?.classList.remove('active');
        queuePanel?.classList.remove('hidden');
        mapPanel?.classList.remove('hidden');
        categoryNav?.classList.remove('hidden');
        usersPanel?.classList.add('hidden');
        if (this.tacticalMap && this.tacticalMap.map) {
          setTimeout(() => this.tacticalMap.map.invalidateSize(), 150);
        }
      });

      btnViewUsers?.addEventListener('click', () => {
        sounds.playClick();
        this.currentView = 'users';
        btnViewUsers.classList.add('active');
        btnViewRadar?.classList.remove('active');
        queuePanel?.classList.add('hidden');
        mapPanel?.classList.add('hidden');
        categoryNav?.classList.add('hidden');
        usersPanel?.classList.remove('hidden');
        this.renderUsersDirectory();
      });
    }

    setupUserDirectoryEvents() {
      const searchInput = document.getElementById('admin-users-search');
      searchInput?.addEventListener('input', (e) => {
        this.userSearchQuery = e.target.value.trim().toLowerCase();
        this.renderUsersDirectory();
      });
    }

    renderUsersDirectory() {
      const grid = document.getElementById('admin-users-grid');
      if (!grid) return;

      const allUsers = firebaseAuth.getUsersList();
      const filtered = allUsers.filter(u => {
        if (!this.userSearchQuery) return true;
        const emailMatch = u.email && u.email.toLowerCase().includes(this.userSearchQuery);
        const nameMatch = u.displayName && u.displayName.toLowerCase().includes(this.userSearchQuery);
        return emailMatch || nameMatch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Sin usuarios encontrados con esa búsqueda.</div>';
        return;
      }

      grid.innerHTML = filtered.map(u => {
        const isAdmin = u.role === 'admin';
        const isSuspended = u.status === 'suspended';
        const trustVal = u.trustScore || 75;

        return `
          <div class="admin-user-card" id="user-card-${u.uid}">
            <div class="user-card-header">
              <img src="${u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`}" alt="${u.displayName}" class="user-card-avatar">
              <div class="user-card-main-info">
                <h4>${u.displayName || 'Ciudadano'}</h4>
                <p>📧 ${u.email}</p>
                <div class="user-badge-row" style="margin-top: 4px;">
                  <span class="badge-role ${isAdmin ? 'role-admin' : 'role-citizen'}">
                    ${isAdmin ? '🛡️ Despachador / Admin' : '👤 Ciudadano'}
                  </span>
                  <span class="badge-status ${isSuspended ? 'status-suspended-user' : 'status-active-user'}">
                    ${isSuspended ? '🔴 Suspendido' : '🟢 Activo'}
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
              <button class="btn-user-action" onclick="window.dispatcherApp.toggleUserRole('${u.uid}')" title="Alternar entre Ciudadano y Administrador">
                🔄 ${isAdmin ? 'Hacer Ciudadano' : 'Hacer Admin'}
              </button>
              <button class="btn-user-action btn-user-suspend" onclick="window.dispatcherApp.toggleUserStatus('${u.uid}')" title="Suspender o Reactivar cuenta">
                ${isSuspended ? '✅ Reactivar' : '⚠️ Suspender'}
              </button>
              <button class="btn-user-action" onclick="window.dispatcherApp.resetUserReputation('${u.uid}')" title="Restablecer nivel de confianza">
                ⭐ Restablecer
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    toggleUserRole(uid) {
      sounds.playClick();
      const users = firebaseAuth.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (user) {
        user.role = user.role === 'admin' ? 'citizen' : 'admin';
        firebaseAuth.saveUsersList(users);
        if (window.firebaseSync && window.firebaseSync.db) {
          window.firebaseSync.db.collection('users').doc(uid).set(user, { merge: true }).catch(() => {});
        }
        this.renderUsersDirectory();
      }
    }

    toggleUserStatus(uid) {
      sounds.playClick();
      const users = firebaseAuth.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (user) {
        user.status = user.status === 'suspended' ? 'active' : 'suspended';
        firebaseAuth.saveUsersList(users);
        if (window.firebaseSync && window.firebaseSync.db) {
          window.firebaseSync.db.collection('users').doc(uid).set(user, { merge: true }).catch(() => {});
        }
        this.renderUsersDirectory();
      }
    }

    resetUserReputation(uid) {
      sounds.playClick();
      const users = firebaseAuth.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (user) {
        user.trustScore = 75;
        firebaseAuth.saveUsersList(users);
        if (window.firebaseSync && window.firebaseSync.db) {
          window.firebaseSync.db.collection('users').doc(uid).set(user, { merge: true }).catch(() => {});
        }
        this.renderUsersDirectory();
      }
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
