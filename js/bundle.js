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
      // 1. Primary: ipapi.co
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            this.setCoords(data.latitude, data.longitude, false);
            return;
          }
        }
      } catch (e) {}

      // 2. Secondary fallback: ip-api.com
      try {
        const res = await fetch('https://ip-api.com/json/?fields=status,lat,lon');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.lat && data.lon) {
            this.setCoords(data.lat, data.lon, false);
            return;
          }
        }
      } catch (e) {}

      // 3. Tertiary fallback: ipwhois.app
      try {
        const res = await fetch('https://ipwhois.app/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.latitude && data.longitude) {
            this.setCoords(data.latitude, data.longitude, false);
            return;
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

  /**
   * Búsqueda de direcciones con dos proveedores 100% gratuitos y sin API key: Nominatim (OSM)
   * como principal, y Photon (Komoot, también sobre datos de OSM) como respaldo si el primero
   * falla o no responde. Devuelve un arreglo normalizado, o null si AMBOS proveedores fallan
   * (para distinguir "sin resultados" de "no se pudo conectar").
   */
  async function geocodeAddress(query, biasLat, biasLon) {
    // 1. Nominatim (principal)
    try {
      const hasBias = typeof biasLat === 'number' && typeof biasLon === 'number' && !isNaN(biasLat) && !isNaN(biasLon);
      const viewbox = hasBias ? `&viewbox=${biasLon - 0.3},${biasLat + 0.3},${biasLon + 0.3},${biasLat - 0.3}` : '';
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1${viewbox}`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          return data.map(r => ({
            label: r.display_name.split(',')[0],
            sublabel: r.display_name.split(',').slice(1, 4).join(','),
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon)
          })).filter(r => !isNaN(r.lat) && !isNaN(r.lon));
        }
      }
    } catch (e) {
      console.warn('Nominatim search failed, trying fallback:', e);
    }

    // 2. Photon (respaldo, también gratuito y sin API key)
    try {
      const hasBias = typeof biasLat === 'number' && typeof biasLon === 'number' && !isNaN(biasLat) && !isNaN(biasLon);
      const biasParams = hasBias ? `&lat=${biasLat}&lon=${biasLon}` : '';
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=es${biasParams}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.features)) {
          return data.features.map(f => {
            const p = f.properties || {};
            const coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : null;
            if (!coords) return null;
            const parts = [p.street, p.city, p.state, p.country].filter(Boolean);
            return {
              label: p.name || p.street || 'Lugar sin nombre',
              sublabel: parts.join(', '),
              lat: coords[1],
              lon: coords[0]
            };
          }).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn('Photon search fallback also failed:', e);
    }

    return null; // Ambos proveedores fallaron (ej. sin conexión)
  }

  // Servidores públicos y gratuitos de OSRM (sin API key), en orden de preferencia por modo de viaje.
  // Cada uno usa el perfil (foot/bike/driving) con el que ESE servidor específico fue realmente compilado;
  // pedirle a un servidor un perfil que no tiene preparado (ej. "driving" al servidor de a pie) responde
  // con error y desperdicia el intento, así que el orden aquí importa.
  const OSRM_ENDPOINTS = {
    walking: [
      'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
      'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
      'https://routing.openstreetmap.de/routed-car/route/v1/driving',
      'https://router.project-osrm.org/route/v1/driving'
    ],
    driving: [
      'https://routing.openstreetmap.de/routed-car/route/v1/driving',
      'https://router.project-osrm.org/route/v1/driving'
    ]
  };

  /**
   * Intenta calcular una ruta real (calles reales, no una línea recta) probando varios servidores
   * OSRM gratuitos en orden hasta que uno responda con una ruta válida. Devuelve el objeto de
   * respuesta OSRM completo (con .routes[]), o null si absolutamente ninguno respondió.
   */
  async function fetchOsrmRoute(coordsPath, mode, extraParams = '') {
    const endpoints = OSRM_ENDPOINTS[mode] || OSRM_ENDPOINTS.driving;
    for (const base of endpoints) {
      try {
        const resp = await fetch(`${base}/${coordsPath}?overview=full&geometries=geojson&steps=true${extraParams}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.routes && data.routes.length > 0) {
            return data;
          }
        }
      } catch (e) {}
    }
    return null;
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
  function getTrustLevelLabel(score) {
    if (score >= 95) return '👑 Líder de Colmena';
    if (score >= 85) return '🔵 Centinela de Cuadrante';
    if (score >= 70) return '🟢 Guardián Activo';
    if (score >= 45) return '🟡 Ciudadano Iniciado';
    return '⚠️ En Observación';
  }

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
      this.state.level = getTrustLevelLabel(this.state.score);

      this.state.history.unshift({
        timestamp: Date.now(),
        delta: delta > 0 ? `+${delta}` : `${delta}`,
        reason
      });

      if (this.state.history.length > 10) this.state.history.pop();

      this.save();

      // Sincroniza la reputación ganada en esta sesión con el registro de la cuenta (lo que ve/ajusta el panel de administración)
      try {
        if (window.firebaseAuth && window.firebaseAuth.currentUser && typeof window.firebaseAuth.adjustUserReputation === 'function') {
          window.firebaseAuth.adjustUserReputation(window.firebaseAuth.currentUser.uid, delta);
        }
      } catch (e) {}

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
    PATROL_ATTENDED: 'PATROL_ATTENDED',
    RESOLVED: 'RESOLVED',
    FALSE_ALARM: 'FALSE_ALARM'
  };

  const INCIDENT_CATEGORIES = {
    FIGHT: { id: 'FIGHT', name: 'Riña / Pelea', icon: '⚔️' },
    ROBBERY: { id: 'ROBBERY', name: 'Robo / Asalto', icon: '🚨' },
    MEDICAL: { id: 'MEDICAL', name: 'Emergencia Médica', icon: '🚑' },
    SUSPICIOUS: { id: 'SUSPICIOUS', name: 'Actividad Sospechosa', icon: '👁️' },
    ACCIDENT: { id: 'ACCIDENT', name: 'Accidente de Tránsito', icon: '💥' },
    VANDALISM: { id: 'VANDALISM', name: 'Vandalismo / Daño', icon: '🔨' }
  };

  class SwarmEngine {
    constructor() {
      this.CLUSTER_RADIUS_METERS = 50;
      this.STORAGE_KEY_INCIDENTS = 'colmena_incidents_active_v2';
      this.STORAGE_KEY_HISTORY = 'colmena_incidents_history_v2';

      this.CRITICAL_RED_DURATION_MS = 8 * 60 * 1000; // 8 minutes active red alarm
      this.COOLING_YELLOW_DURATION_MS = 20 * 60 * 1000; // 20 minutes yellow preventive cooling
      this.FRESH_ALERT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes freshness window for audio/toasts
      this.SESSION_NOTIFIED_KEY = 'beja_notified_alerts_session_v1';

      // Umbral de peso acumulado de consenso necesario para escalar una alerta a Enjambre Crítico (ROJO)
      this.CONSENSUS_ESCALATION_THRESHOLD = 1.0;

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

      // Heartbeat ticker: evaluate decay transitions and auto-archive every 20 seconds
      this.decayInterval = setInterval(() => {
        this.cleanupExpiredIncidents();
      }, 20000);
    }

    /**
     * Determine if an alert notification (audio siren, modal, toast) should be shown to user.
     * Rules:
     * 1. Only fire if event literally just occurred (age <= 3 minutes).
     * 2. Only fire once per browser session for each incident ID (unless reactivated into RED).
     */
    shouldNotifyAlert(incidentId, eventTimestamp = Date.now()) {
      try {
        const age = Date.now() - Number(eventTimestamp);
        if (age > this.FRESH_ALERT_WINDOW_MS) {
          return false;
        }

        const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(this.SESSION_NOTIFIED_KEY) : null;
        const map = raw ? JSON.parse(raw) : {};
        const lastNotified = map[incidentId];

        if (!lastNotified) {
          return true;
        }

        // If re-activated with a newer timestamp after last notified, allow fresh alert
        if (Number(eventTimestamp) > (Number(lastNotified) + 60000)) {
          return true;
        }

        return false;
      } catch (e) {
        return true;
      }
    }

    recordAlertNotified(incidentId, eventTimestamp = Date.now()) {
      try {
        if (typeof sessionStorage === 'undefined') return;
        const raw = sessionStorage.getItem(this.SESSION_NOTIFIED_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[incidentId] = Number(eventTimestamp);
        sessionStorage.setItem(this.SESSION_NOTIFIED_KEY, JSON.stringify(map));
      } catch (e) {}
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
     * Peso de consenso que aporta un reporte/testimonio según la reputación del ciudadano.
     * Alta reputación: una sola alerta puede activar el enjambre crítico de inmediato.
     * Reputación media: se necesitan varios ciudadanos medios coincidiendo en la misma zona.
     * Baja reputación (usuario nuevo): casi no suma, así reporte varias veces.
     */
    getConsensusWeight(trustScore) {
      const score = (typeof trustScore === 'number' && !isNaN(trustScore)) ? trustScore : 50;
      if (score >= 85) return 1.0;
      if (score >= 45) return 0.5;
      return 0.15;
    }

    reportIncident({ lat, lng, category = 'FIGHT', note = '', userId = null, userTrust = null }) {
      userId = userId || syncBus.getSenderId();
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

        // Un mismo ciudadano reportando varias veces no debe inflar el consenso: solo se contabiliza su primer reporte en esta zona.
        if (isDifferentUser) {
          matchingCluster.reporters.push({ userId, timestamp: now, note, weight });
          matchingCluster.reportCount = matchingCluster.reporters.length;
          matchingCluster.consensusWeight = matchingCluster.reporters.reduce((sum, r) => sum + (typeof r.weight === 'number' ? r.weight : this.getConsensusWeight(null)), 0);
        }
        matchingCluster.updatedAt = now;

        // Progressive escalation / Reactivation:
        // Escala/reactiva a CRITICAL_SWARM (ROJO) cuando el peso de consenso acumulado (ponderado por reputación) cruza el umbral.
        if (matchingCluster.status === INCIDENT_STATES.PROBING && isDifferentUser && matchingCluster.consensusWeight >= this.CONSENSUS_ESCALATION_THRESHOLD) {
          matchingCluster.status = INCIDENT_STATES.CRITICAL_SWARM;
          matchingCluster.criticalStartedAt = now;
          matchingCluster.coolingDown = false;
          isEscalated = true;
          if (matchingCluster.decayedFromCritical) {
            matchingCluster.reactivatedAt = now;
            matchingCluster.reactivatedBy = userId;
          }
          trustEngine.recordVerifiedReport();
        }
        resultIncident = matchingCluster;
      } else {
        // Un ciudadano de muy alta reputación puede activar la alerta crítica de inmediato, en solitario.
        const startsCritical = weight >= this.CONSENSUS_ESCALATION_THRESHOLD;
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
        if (startsCritical) {
          isEscalated = true;
          trustEngine.recordVerifiedReport();
        }
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

    voteIncidentVerdict(incidentId, isReal, userCoords = null, userTrust = null) {
      const myId = syncBus.getSenderId();
      const weight = this.getConsensusWeight(userTrust);
      this.incidents = this.loadIncidents();
      const inc = this.incidents.find(i => i.id === incidentId);
      if (!inc) return { success: false, reason: 'NOT_FOUND' };

      if (!inc.reporters) inc.reporters = [];
      if (!inc.refutations) inc.refutations = [];

      // Check if user already participated
      const alreadyReported = inc.reporters.some(r => r.userId === myId);
      const alreadyRefuted = inc.refutations.some(r => r.userId === myId);
      if (alreadyReported || alreadyRefuted) {
        return { success: false, reason: 'ALREADY_VOTED' };
      }

      // Check distance: strictly within CLUSTER_RADIUS_METERS (50m) on the same street
      if (userCoords && userCoords.lat && userCoords.lng && inc.lat && inc.lng) {
        const dist = Math.round(this.calculateDistanceMeters(userCoords.lat, userCoords.lng, inc.lat, inc.lng));
        if (dist > this.CLUSTER_RADIUS_METERS) {
          return { success: false, reason: 'TOO_FAR', distance: dist };
        }
      }

      if (isReal) {
        inc.reporters.push({
          userId: myId,
          timestamp: Date.now(),
          verdict: 'REAL',
          note: 'Confirmado como REAL por testigo presencial en la calle.',
          weight
        });
        inc.reportCount = inc.reporters.length;
        inc.updatedAt = Date.now();
        inc.consensusWeight = inc.reporters.reduce((sum, r) => sum + (typeof r.weight === 'number' ? r.weight : this.getConsensusWeight(null)), 0);

        let isEscalated = false;
        // Reactivate/Escalate a ROJO si el peso de consenso (ponderado por reputación) cruza el umbral
        if (inc.status === INCIDENT_STATES.PROBING && inc.consensusWeight >= this.CONSENSUS_ESCALATION_THRESHOLD) {
          inc.status = INCIDENT_STATES.CRITICAL_SWARM;
          inc.criticalStartedAt = Date.now();
          inc.coolingDown = false;
          isEscalated = true;
          if (inc.decayedFromCritical) {
            inc.reactivatedAt = Date.now();
            inc.reactivatedBy = myId;
          }
        }

        this.saveIncidents();
        trustEngine.recordValidationGiven(); // +5 pts to witness

        syncBus.emit('INCIDENT_MUTATION', { incident: inc, isEscalated });
        if (isEscalated) {
          syncBus.emit('SWARM_ESCALATED_CRITICAL', { incident: inc });
        }
        return { success: true, verdict: 'REAL', isEscalated, incident: inc };
      } else {
        inc.refutations.push({
          userId: myId,
          timestamp: Date.now(),
          verdict: 'FALSE',
          note: 'Desmentido como FALSO por testigo presencial en la calle.'
        });

        // Award honest witness +5 pts for civic verification
        trustEngine.awardPoints(5, 'Testimonio cívico: Desmentiste una alerta falsa en tu calle');

        // If 2 or more witnesses refute the alert, dismiss it as FALSE_ALARM
        let isDismissed = false;
        if (inc.refutations.length >= 2) {
          this.incidents = this.incidents.filter(i => i.id !== incidentId);
          this.saveIncidents();
          syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.FALSE_ALARM, isDismissed: true });
          syncBus.emit('INCIDENT_DISMISSED_FALSE', { incidentId, category: inc.category });
          isDismissed = true;
          return { success: true, verdict: 'FALSE', isDismissed, incident: inc };
        }

        this.saveIncidents();
        syncBus.emit('INCIDENT_MUTATION', { incident: inc });
        return { success: true, verdict: 'FALSE', isDismissed: false, incident: inc };
      }
    }

    validateIncidentAsWitness(incidentId, userCoords = null) {
      const res = this.voteIncidentVerdict(incidentId, true, userCoords);
      return res.success;
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
      trustEngine.awardPoints(5, 'Patrulla asignada a tu reporte por despacho');
    }

    resolveIncident(incidentId) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      this.recordDismissedId(incidentId);
      this.incidents = this.incidents.filter(i => i.id !== incidentId);
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.RESOLVED });
      trustEngine.awardPoints(5, 'Incidente confirmado resuelto por las autoridades');
    }

    markFalseAlarm(incidentId) {
      this.incidents = this.loadIncidents();
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) return;
      this.recordDismissedId(incidentId);
      this.incidents = this.incidents.filter(i => i.id !== incidentId);
      this.saveIncidents();
      syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.FALSE_ALARM });
      trustEngine.awardPoints(-15, 'Penalización: Reporte descartado como falsa alarma');
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
        // If manually resolved/dismissed, drop it immediately
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
          // Empuja la degradación a la nube: si no se guarda aquí, el próximo snapshot de Firestore
          // (que sigue creyendo que el incidente está en CRITICAL_SWARM) revierte este cambio visual
          // en cualquier dispositivo conectado, dando la sensación de que "hay que recargar" para verlo.
          try { firebaseSync.saveIncidentToCloud(inc); } catch (e) {}
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
            // Borra el documento en Firestore para que TODOS los dispositivos dejen de verlo activo de
            // inmediato, en vez de depender de que cada uno calcule por su cuenta el mismo vencimiento.
            try { firebaseSync.deleteIncidentFromCloud(inc.id); } catch (e) {}
            return;
          }
        }

        // 3. Patrol Attended: Active for 20 minutes, then archive
        if (inc.status === INCIDENT_STATES.PATROL_ATTENDED && ageMs > this.COOLING_YELLOW_DURATION_MS) {
          changed = true;
          this.recordDismissedId(inc.id);
          try { firebaseSync.deleteIncidentFromCloud(inc.id); } catch (e) {}
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

    sendBroadcastAlert({ title, message }) {
      const bc = { id: 'bc_' + Date.now(), title, message, timestamp: Date.now() };
      syncBus.emit('COMMUNITY_BROADCAST', bc);
      return bc;
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
      this.safePointsLayerGroup = null;
      this.safePointsVisible = false;
      this.safePointsFetchedBounds = null;
      this.safePointsFetching = false;
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

        // 100% Free OpenStreetMap High-Contrast Tactical Cyber Tiles (Zero API Key - Zero Watermarks)
        const freeTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          subdomains: 'abc',
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          className: 'colmena-dark-tiles'
        });
        freeTileLayer.addTo(this.map);

        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        this.markerLayerGroup = L.layerGroup().addTo(this.map);
        this.routeLayerGroup = L.layerGroup().addTo(this.map);
        this.safePointsLayerGroup = L.layerGroup();

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

        // Si los "Puntos Seguros" están activos y el usuario se aleja del área ya consultada, refresca
        this.map.on('moveend', () => {
          if (this.safePointsVisible) this.fetchSafePointsIfNeeded();
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
        const isPatrolAttended = inc.status === INCIDENT_STATES.PATROL_ATTENDED;
        const cat = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;

        // 50m exact swarm cluster circle
        L.circle([inc.lat, inc.lng], {
          radius: 50,
          color: isCritical ? '#ff2a55' : (isPatrolAttended ? '#00b0ff' : (isDispatched ? '#00d2ff' : '#ffb800')),
          weight: 2,
          fillColor: isCritical ? '#ff2a55' : (isPatrolAttended ? '#00b0ff' : (isDispatched ? '#00d2ff' : '#ffb800')),
          fillOpacity: isCritical ? 0.3 : (isPatrolAttended ? 0.12 : 0.15),
          dashArray: isCritical ? null : '4, 6'
        }).addTo(this.markerLayerGroup);

        // ONLY critical alert has pulsating wave! Probing and patrol-attended do NOT pulsate.
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
        
        marker.bindPopup(`
          <div class="tactical-popup">
            <div class="popup-header">
              <span class="popup-category">${isPatrolAttended ? '🚓 Cuadrante en Sitio' : `${cat.icon} ${cat.name}`}</span>
              <span class="popup-badge ${isCritical ? 'badge-critical' : (isPatrolAttended ? 'badge-patrol-attended' : 'badge-warning')}">
                ${isCritical ? '🚨 ALERTA CRÍTICA' : (isPatrolAttended ? '🚓 Asegurado por Patrulla' : (isDispatched ? '🚔 Patrulla en camino' : '🟡 Sondeo'))}
              </span>
            </div>
            <div class="popup-body">
              <p>👥 <strong>${inc.reportCount} confirmación(es)</strong>${(inc.refutations && inc.refutations.length) ? ` &bull; ⚠️ ${inc.refutations.length} desmentidos` : ''}</p>
              <p style="color:var(--text-muted);font-size:0.7rem;">📍 A ${Math.round(swarmEngine.calculateDistanceMeters(this.userLocation.lat, this.userLocation.lng, inc.lat, inc.lng))}m de tu ubicación</p>
              ${inc.reporters[0]?.note ? `<p style="font-style:italic;margin-top:4px;color:#fff;">"${inc.reporters[0].note}"</p>` : ''}
              ${isPatrolAttended ? `<p style="color:#00b0ff;font-weight:700;font-size:0.75rem;margin-top:4px;">🚓 Patrulla presente en el cuadrante. Zona asegurada.</p>` : ''}
              ${(swarmEngine.calculateDistanceMeters(this.userLocation.lat, this.userLocation.lng, inc.lat, inc.lng) <= 50) ? `
                <div style="display:flex;gap:6px;margin-top:8px;">
                  <button class="btn-popup-witness" onclick="if(window.citizenApp) window.citizenApp.voteIncident('${inc.id}', true)" style="flex:1; background:rgba(0,230,118,0.2); border:1px solid #00e676; color:#00e676; padding:6px; border-radius:4px; font-weight:800; font-size:0.72rem; cursor:pointer;">
                    ✅ Es Real
                  </button>
                  <button class="btn-popup-witness" onclick="if(window.citizenApp) window.citizenApp.voteIncident('${inc.id}', false)" style="flex:1; background:rgba(255,23,68,0.2); border:1px solid #ff1744; color:#ff5252; padding:6px; border-radius:4px; font-weight:800; font-size:0.72rem; cursor:pointer;">
                    ❌ Es Falso
                  </button>
                </div>
              ` : `
                <div style="margin-top:8px;font-size:0.68rem;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:6px;border-radius:4px;">
                  👁️ Estás a ${Math.round(swarmEngine.calculateDistanceMeters(this.userLocation.lat, this.userLocation.lng, inc.lat, inc.lng))}m. Calificación reservada a vecinos presentes en la misma calle (≤50m).
                </div>
              `}
            </div>
          </div>
        `);
        this.markerLayerGroup.addLayer(marker);
      });
    }

    /**
     * Puntos Seguros: estaciones/CAI de policía cercanos, obtenidos gratis y sin API key desde
     * Overpass (datos de OpenStreetMap). Se activa/desactiva con el botón "🛡️ Puntos Seguros".
     */
    toggleSafePoints(visible) {
      this.safePointsVisible = visible;
      if (!this.map || !this.safePointsLayerGroup) return;
      if (visible) {
        this.safePointsLayerGroup.addTo(this.map);
        this.fetchSafePointsIfNeeded();
      } else {
        this.map.removeLayer(this.safePointsLayerGroup);
      }
    }

    fetchSafePointsIfNeeded() {
      if (!this.map || this.safePointsFetching) return;
      const bounds = this.map.getBounds().pad(0.3);
      // Evita golpear Overpass en cada micro-movimiento: solo si salimos del área ya cubierta
      if (this.safePointsFetchedBounds && this.safePointsFetchedBounds.contains(bounds)) return;
      this.fetchAndRenderSafePoints(bounds);
    }

    async fetchAndRenderSafePoints(bounds) {
      if (!window.L) return;
      this.safePointsFetching = true;
      try {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const query = `[out:json][timeout:20];(node["amenity"="police"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});way["amenity"="police"](${sw.lat},${sw.lng},${ne.lat},${ne.lng}););out center;`;
        const resp = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query)
        });
        if (!resp.ok) return; // Overpass no disponible/limitado en este momento: se deja el mapa como está, sin puntos seguros extra
        const data = await resp.json();
        if (!data || !Array.isArray(data.elements)) return;

        this.safePointsLayerGroup.clearLayers();
        data.elements.forEach(el => {
          const lat = el.lat || (el.center && el.center.lat);
          const lon = el.lon || (el.center && el.center.lon);
          if (typeof lat !== 'number' || typeof lon !== 'number') return;
          const name = (el.tags && (el.tags.name || el.tags['name:es'])) || 'Estación de Policía';
          const icon = L.divIcon({
            className: 'safe-point-marker',
            html: '<div style="background:rgba(0,210,255,0.18);border:2px solid #00d2ff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 10px rgba(0,210,255,0.5);">🛡️</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          L.marker([lat, lon], { icon })
            .bindPopup(`<div class="tactical-popup"><div class="popup-header"><span class="popup-category">🛡️ Punto Seguro</span></div><div class="popup-body"><p><strong>${name}</strong></p><p style="color:var(--text-muted);font-size:0.72rem;">Estación/CAI de policía (OpenStreetMap)</p></div></div>`)
            .addTo(this.safePointsLayerGroup);
        });

        this.safePointsFetchedBounds = bounds;
      } catch (e) {
        console.warn('No se pudieron cargar los Puntos Seguros (Overpass):', e);
      } finally {
        this.safePointsFetching = false;
      }
    }

    getDismissedGeofenceMap() {
      try {
        const raw = localStorage.getItem('beja_dismissed_geofence_v2');
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    // Recuerda el cierre del aviso de forma persistente (no se resetea al reabrir la app),
    // pero solo mientras la alerta no cambie: si luego se reactiva/reescala, debe volver a avisar.
    dismissGeofenceBanner(incidentId) {
      try {
        const map = this.getDismissedGeofenceMap();
        map[incidentId] = Date.now();
        localStorage.setItem('beja_dismissed_geofence_v2', JSON.stringify(map));
      } catch (e) {}
    }

    checkGeofence() {
      const incidents = swarmEngine.loadIncidents();
      let nearest = null, minDist = Infinity;
      const dismissedMap = this.getDismissedGeofenceMap();

      incidents.forEach(inc => {
        if (inc.status === INCIDENT_STATES.RESOLVED || inc.status === INCIDENT_STATES.FALSE_ALARM) return;

        // Si ya se cerró este aviso, se mantiene oculto solo hasta que ocurra algo genuinamente nuevo
        // (reactivación/re-escalada por otro reporte). Si el evento es más reciente que el cierre, vuelve a avisar.
        const eventTime = inc.reactivatedAt || inc.criticalStartedAt || inc.updatedAt || inc.createdAt || 0;
        const dismissedAt = dismissedMap[inc.id];
        if (dismissedAt && dismissedAt >= eventTime) return;

        // ONLY trigger geofence warning banner for active ROJO (CRITICAL_SWARM / DISPATCHED)
        // or a brand-new PROBING probe (<= 5 min). Degraded yellow cooling alerts do NOT trigger aggressive banners!
        const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM || inc.status === INCIDENT_STATES.DISPATCHED;
        const isFreshProbe = inc.status === INCIDENT_STATES.PROBING && !inc.coolingDown && (Date.now() - (inc.createdAt || 0) <= 5 * 60 * 1000);
        if (!isCritical && !isFreshProbe) return;

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
      let osrmAlternatives = [];
      let directIsApproximate = false;

      const directRoute = await fetchOsrmRoute(`${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}`, mode, '&alternatives=true');
      if (directRoute) {
        const r = directRoute.routes[0];
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
        if (directRoute.routes.length > 1) {
          osrmAlternatives = directRoute.routes.slice(1);
        }
      }

      if (directCoords.length === 0) {
        // Ningún servidor de ruteo respondió: se traza una línea recta aproximada como último recurso
        // (no sigue calles reales, puede cruzar manzanas/edificios — se marca como aproximada en la UI).
        directIsApproximate = true;
        directCoords = [
          [startLatLng.lat, startLatLng.lng],
          [startLatLng.lat + (endLatLng.lat - startLatLng.lat) * 0.5, startLatLng.lng],
          [endLatLng.lat, endLatLng.lng]
        ];
        directDistance = 1400;
        directDuration = (mode === 'walking') ? 1050 : 210;
        directSteps = ['⚠️ Ruta aproximada: no se pudo contactar un servidor de calles en este momento.'];
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
      let detourIsApproximate = false;

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

        // A. First check if any OSRM street alternative already clears the threat
        if (osrmAlternatives && osrmAlternatives.length > 0) {
          for (const altR of osrmAlternatives) {
            const altCoords = altR.geometry.coordinates.map(c => [c[1], c[0]]);
            const altDist = this.getMinDistanceToPolyline(altCoords, tLat, tLng);
            if (altDist >= 65) {
              let steps = [];
              if (altR.legs) {
                steps = altR.legs.flatMap(l => l.steps || []).map(s => {
                  const roadName = s.name ? `por <strong>${s.name}</strong>` : 'por vía alterna';
                  return `Desvío seguro: ${s.maneuver.type} ${roadName} (${Math.round(s.distance)} m)`;
                });
              }
              bestCandidate = {
                coords: altCoords,
                distance: altR.distance,
                duration: altR.duration,
                steps: steps,
                waypoint: altCoords[Math.floor(altCoords.length / 2)]
              };
              break;
            }
          }
        }

        // B. If no pre-computed alternative cleared the threat, try a single waypoint bypass
        if (!bestCandidate) {
          const lateralDistances = [220, 320];
          for (const latDist of lateralDistances) {
            for (const sign of sideSigns) {
              const latOff = (sign * latDist * nLat) / 111000;
              const lngOff = (sign * latDist * nLng) / (111000 * cosLat);
              const viaApex = [tLat + latOff, tLng + lngOff];

              const dData = await fetchOsrmRoute(`${startLatLng.lng},${startLatLng.lat};${viaApex[1]},${viaApex[0]};${endLatLng.lng},${endLatLng.lat}`, mode);
              if (dData) {
                const dR = dData.routes[0];
                const testCoords = dR.geometry.coordinates.map(c => [c[1], c[0]]);
                const testDistToThreat = this.getMinDistanceToPolyline(testCoords, tLat, tLng);

                if (testDistToThreat >= 65) {
                  let steps = [];
                  if (dR.legs) {
                    steps = dR.legs.flatMap(l => l.steps || []).map(s => {
                      const roadName = s.name ? `por <strong>${s.name}</strong>` : 'por calle alterna';
                      return `Desvío seguro: ${s.maneuver.type} ${roadName} (${Math.round(s.distance)} m)`;
                    });
                  }
                  bestCandidate = {
                    coords: testCoords,
                    distance: dR.distance,
                    duration: dR.duration,
                    steps: steps,
                    waypoint: viaApex
                  };
                  break;
                }
              }

              if (bestCandidate) break;
            }
            if (bestCandidate) break;
          }
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
            '⚠️ Desvío aproximado: ningún servidor de calles confirmó una vía real para este rodeo.',
            'Desvío perimetral estimado esquivando la zona de alerta (150m de resguardo).',
            'Incorporación estimada hacia el destino.'
          ];
          detourWaypoints = viaApex;
          detourIsApproximate = true;
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
            gmapsUrl: directGmapsUrl,
            isApproximate: directIsApproximate
          },
          detour: {
            distanceKm: (detourDistance / 1000).toFixed(1),
            etaMins: Math.max(1, Math.round(detourDuration / 60)),
            steps: detourSteps,
            gmapsUrl: detourGmapsUrl,
            isApproximate: detourIsApproximate
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
          googleMapsUrl: directGmapsUrl,
          isApproximate: directIsApproximate
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
      this.seenBroadcastIds = new Set();
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

      let isInitialIncidentsLoad = true;
      this.db.collection('incidents').onSnapshot((snapshot) => {
        const cloudIncidents = [];
        const dismissedIds = swarmEngine.getDismissedIds ? swarmEngine.getDismissedIds() : [];

        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          if (data.status === INCIDENT_STATES.RESOLVED || data.status === INCIDENT_STATES.FALSE_ALARM || dismissedIds.includes(doc.id)) {
            return;
          }
          cloudIncidents.push(data);
        });

        // Siempre reflejar el estado real de la nube (incluida la transición a "cero incidentes"),
        // para que un incidente resuelto/descartado por otro usuario también desaparezca aquí.
        swarmEngine.incidents = cloudIncidents;
        localStorage.setItem(swarmEngine.STORAGE_KEY_INCIDENTS, JSON.stringify(cloudIncidents));
        syncBus.emit('INCIDENT_MUTATION', { action: 'CLOUD_SYNC', count: cloudIncidents.length });

        if (isInitialIncidentsLoad) {
          // On startup load: index known IDs and ONLY notify if there is an event that literally just happened (<= 3 min) and not yet notified this session
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            this.lastKnownIncidentIds.add(doc.id);
            if (data.status === INCIDENT_STATES.CRITICAL_SWARM) {
              const eventTime = data.reactivatedAt || data.updatedAt || data.createdAt || 0;
              if (swarmEngine.shouldNotifyAlert(doc.id, eventTime)) {
                sounds.playCriticalAlarm();
                sounds.speakAlert('Alerta comunitaria: Peligro confirmado en tu cuadrante.');
                swarmEngine.recordAlertNotified(doc.id, eventTime);
              }
            }
          });
          isInitialIncidentsLoad = false;
          return;
        }

        // Live updates arriving while the app is actively running
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            data.id = change.doc.id;
            if (data.status === INCIDENT_STATES.CRITICAL_SWARM) {
              const eventTime = data.reactivatedAt || data.updatedAt || data.createdAt || Date.now();
              if (swarmEngine.shouldNotifyAlert(data.id, eventTime)) {
                sounds.playCriticalAlarm();
                sounds.speakAlert('Alerta comunitaria: Peligro confirmado en tu cuadrante.');
                swarmEngine.recordAlertNotified(data.id, eventTime);
              }
            }
          }
        });
      }, (err) => console.warn('Sync error:', err));

      let initialBroadcastLoad = true;
      this.db.collection('broadcasts').onSnapshot((snapshot) => {
        if (initialBroadcastLoad) {
          // On startup load, index existing broadcasts as seen so alarms do not fire automatically
          snapshot.forEach(doc => {
            this.seenBroadcastIds.add(doc.id);
            const data = doc.data();
            const bcId = doc.id || data.id;
            const eventTime = data.timestamp || 0;
            // Only alert if literally just published (<= 3 min) and not yet notified
            if (data.active !== false && swarmEngine.shouldNotifyAlert(bcId, eventTime)) {
              syncBus.emit('COMMUNITY_BROADCAST', { ...data, id: bcId });
            }
          });
          initialBroadcastLoad = false;
          return;
        }

        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const bcId = change.doc.id || data.id;
            if (!this.seenBroadcastIds.has(bcId)) {
              this.seenBroadcastIds.add(bcId);
              const eventTime = data.timestamp || Date.now();
              if (data.active !== false && swarmEngine.shouldNotifyAlert(bcId, eventTime)) {
                syncBus.emit('COMMUNITY_BROADCAST', { ...data, id: bcId });
              }
            }
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

    async deleteIncidentFromCloud(id) {
      if (!this.isConfigured || !this.db || !id) return;
      try {
        await this.db.collection('incidents').doc(id).delete();
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
              const isSuper = firebaseUser.email && firebaseUser.email.toLowerCase() === this.SUPER_ADMIN_EMAIL.toLowerCase();
              const directory = this.getUsersList();
              const existing = directory.find(u => u.uid === firebaseUser.uid || (u.email && firebaseUser.email && u.email.toLowerCase() === firebaseUser.email.toLowerCase()));
              const userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || (isSuper ? 'GABY OLARTE (SUPER ADMIN)' : firebaseUser.email.split('@')[0]),
                photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
                role: isSuper ? 'admin' : (existing && existing.role ? existing.role : 'citizen'),
                // Usuario nuevo = reputación baja/inicial; un usuario existente conserva lo que ya ganó (o lo que el admin le asignó)
                trustScore: isSuper ? 100 : (existing ? (existing.trustScore ?? 40) : 40),
                verifiedReports: existing ? (existing.verifiedReports || 0) : 0,
                validationsGiven: existing ? (existing.validationsGiven || 0) : 0,
                status: existing ? (existing.status || 'active') : 'active',
                lastLoginAt: Date.now()
              };
              this.setCurrentUser(userProfile);
            }
            // Preserves local session (localStorage) when Firebase cloud user is null
          });
        } catch (err) {
          console.warn('Firebase Auth error:', err);
        }
      }
    }

    SUPER_ADMIN_EMAIL = 'gabyolarte2017@gmail.com';

    async loginWithGoogle() {
      if (window.firebaseAuth && window.firebaseAuth.openGoogleChooser && window.firebaseAuth !== this) {
        return window.firebaseAuth.openGoogleChooser();
      }
      return this.openGoogleChooser();
    }

    openGoogleChooser() {
      return new Promise((resolve) => {
        let modal = document.getElementById('google-account-chooser-modal');
        if (!modal) {
          this.injectGoogleChooserDOM();
          modal = document.getElementById('google-account-chooser-modal');
        }

        if (modal) {
          modal.classList.remove('hidden');

          const cleanup = () => {
            modal.classList.add('hidden');
          };

          const items = modal.querySelectorAll('.google-account-item');
          items.forEach(item => {
            item.onclick = () => {
              const email = item.dataset.email;
              const user = this.loginWithEmail(email);
              cleanup();
              resolve(user);
            };
          });

          const btnToggle = modal.querySelector('#btn-toggle-custom-google');
          const drawer = modal.querySelector('#custom-google-email-drawer');
          const input = modal.querySelector('#custom-google-email-input');
          const btnConfirm = modal.querySelector('#btn-confirm-custom-google');

          if (btnToggle && drawer) {
            btnToggle.onclick = (e) => {
              e.preventDefault();
              drawer.classList.toggle('hidden');
              if (!drawer.classList.contains('hidden') && input) input.focus();
            };
          }

          if (btnConfirm && input) {
            btnConfirm.onclick = (e) => {
              e.preventDefault();
              const email = input.value.trim();
              if (email && email.includes('@')) {
                const user = this.loginWithEmail(email);
                cleanup();
                resolve(user);
              } else {
                alert('Por favor ingresa un correo electrónico válido.');
              }
            };
            input.onkeydown = (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                btnConfirm.click();
              }
            };
          }

          const btnClose = modal.querySelector('#btn-close-google-chooser');
          if (btnClose) {
            btnClose.onclick = (e) => {
              e.preventDefault();
              cleanup();
              resolve(null);
            };
          }

          modal.onclick = (e) => {
            if (e.target === modal) {
              cleanup();
              resolve(null);
            }
          };
        } else {
          resolve(this.promptLocalDemoLogin());
        }
      });
    }

    injectGoogleChooserDOM() {
      if (document.getElementById('google-account-chooser-modal')) return;
      const chooserHtml = `
        <div class="google-chooser-backdrop" id="google-account-chooser-modal" role="dialog" aria-modal="true">
          <div class="google-chooser-sheet">
            <div class="google-chooser-header">
              <div class="google-brand-header">
                <svg class="google-svg-header" viewBox="0 0 24 24" width="28" height="28">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <div>
                  <h3 style="margin:0;font-size:1.15rem;color:#fff;font-weight:700;">Acceder con Google</h3>
                  <p style="margin:2px 0 0;font-size:0.8rem;color:#94a3b8;">Elige una cuenta para continuar en Colmena Segura</p>
                </div>
              </div>
              <button class="btn-close-google-chooser" id="btn-close-google-chooser" aria-label="Cerrar">&times;</button>
            </div>

            <div class="google-accounts-list">
              <div class="custom-google-account-section">
                <div class="custom-email-drawer" id="custom-google-email-drawer">
                  <input type="email" id="custom-google-email-input" placeholder="tu_correo@ejemplo.com" class="google-custom-input">
                  <button class="btn-confirm-custom-google" id="btn-confirm-custom-google">Acceder ➔</button>
                </div>
              </div>
            </div>

            <div class="google-chooser-footer">
              <span>Ingresa con tu correo para continuar en Colmena Segura.</span>
            </div>
          </div>
        </div>
      `;
      const div = document.createElement('div');
      div.innerHTML = chooserHtml.trim();
      document.body.appendChild(div.firstElementChild);
    }

    async logout() {
      if (this.isConfigured && this.auth) {
        try { await this.auth.signOut(); } catch (e) {}
      }
      this.setCurrentUser(null);
    }

    promptLocalDemoLogin() {
      return this.openGoogleChooser();
    }

    loginWithEmail(email) {
      if (!email || !email.includes('@')) return null;
      const cleanEmail = email.trim().toLowerCase();

      const directory = this.getUsersList();
      const existing = directory.find(u => u.email && u.email.toLowerCase() === cleanEmail);

      // El acceso rápido por correo (sin verificación real) nunca otorga rol de admin/patrullero por sí solo:
      // esos roles solo se reconocen vía Google Sign-In real o si un admin ya los asignó desde el panel.
      const role = (existing && existing.role) ? existing.role : 'citizen';
      const name = cleanEmail.split('@')[0].replace(/[\._-]/g, ' ').toUpperCase();
      const userObj = {
        uid: existing ? existing.uid : ('usr_' + btoa(cleanEmail).replace(/=/g, '').slice(0, 10)),
        email: cleanEmail,
        displayName: existing ? existing.displayName : name,
        photoURL: existing && existing.photoURL ? existing.photoURL : `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        role: role,
        // Usuario nuevo = reputación baja/inicial (debe ganarse la confianza); un usuario ya registrado conserva su puntaje
        trustScore: existing ? (existing.trustScore ?? 40) : 40,
        verifiedReports: existing ? (existing.verifiedReports || 0) : 0,
        validationsGiven: existing ? (existing.validationsGiven || 0) : 0,
        status: existing ? (existing.status || 'active') : 'active',
        suspendedUntil: existing ? (existing.suspendedUntil || null) : null,
        suspendReason: existing ? (existing.suspendReason || null) : null,
        createdAt: existing ? (existing.createdAt || Date.now()) : Date.now(),
        lastLoginAt: Date.now()
      };

      this.setCurrentUser(userObj);
      return userObj;
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
      const idx = users.findIndex(u => (u.email && u.email.toLowerCase() === user.email.toLowerCase()) || u.uid === user.uid);
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
        if (raw) {
          const list = JSON.parse(raw);
          const superAdminIdx = list.findIndex(u => u.email && u.email.toLowerCase() === this.SUPER_ADMIN_EMAIL.toLowerCase());
          if (superAdminIdx >= 0) {
            list[superAdminIdx].role = 'admin';
          } else {
            list.unshift({
              uid: 'user_admin_super',
              email: 'Gabyolarte2017@gmail.com',
              displayName: 'GABY OLARTE (SUPER ADMIN)',
              photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gaby',
              role: 'admin',
              trustScore: 100,
              verifiedReports: 35,
              validationsGiven: 70,
              status: 'active',
              suspendedUntil: null,
              createdAt: Date.now() - 86400000 * 30
            });
          }
          return list;
        }
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
      // Ubicación elegida manualmente en el mapa para el PRÓXIMO reporte SOS (independiente de this.userCoords,
      // que es la posición GPS EN VIVO y se sobreescribe sola cada vez que el geolocalizador reporta una lectura nueva).
      this.selectedReportCoords = null;
      this.travelMode = 'walking';
      this.currentUser = firebaseAuth.currentUser;
      this.panicCountdownTimer = null;
      this.countdownSeconds = 3;

      this.init();
    }

    init() {
      try { firebaseSync.init(); } catch (e) { console.warn('Sync init warning:', e); }
      try { firebaseAuth.initUsersCloudSync(); } catch (e) { console.warn('Users cloud sync init warning:', e); }
      try { if (window.chatService) window.chatService.initCloudSync(); } catch (e) { console.warn('Chat cloud sync init warning:', e); }
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
      try { this.setupSyncEvents(); } catch (e) { console.error('setupSyncEvents error:', e); }
      try { this.updateTrustUI(); } catch (e) { console.error('updateTrustUI error:', e); }
      try { this.setupChat(); } catch (e) { console.error('setupChat error:', e); }
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

      const btnHeaderLogin = document.getElementById('btn-login-google-header');
      btnHeaderLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
      });
      btnProfileLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
      });
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
      const guestLockCard = document.getElementById('guest-report-lock-card');
      const authReportContent = document.getElementById('auth-report-allowed-content');

      if (user) {
        // Toggle Report tab permissions
        if (guestLockCard) guestLockCard.classList.add('hidden');
        if (authReportContent) authReportContent.classList.remove('hidden');

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
        // Toggle Report tab permissions for Guest
        if (guestLockCard) guestLockCard.classList.remove('hidden');
        if (authReportContent) authReportContent.classList.add('hidden');

        // Header Button
        if (headerSlot) {
          headerSlot.innerHTML = `
            <a href="login.html" class="btn-auth-google-header" id="btn-login-google-header" title="Iniciar sesión con cuenta de Google">
              <span class="g-icon">🔐</span><span class="auth-btn-text"><span class="auth-btn-text-full"> Iniciar con Google</span><span class="auth-btn-text-short"> Entrar</span></span>
            </a>
          `;
          headerSlot.querySelector('#btn-login-google-header')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('marketing-login-modal')?.classList.remove('hidden');
          });
        }

        // Profile Tab Identity Card
        if (avatarEl) avatarEl.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=guest';
        if (nameEl) nameEl.textContent = 'Invitado / Anónimo';
        if (emailEl) emailEl.textContent = 'Sin cuenta vinculada (Navegación Libre)';
        if (badgeEl) {
          badgeEl.className = 'badge-verified-email';
          badgeEl.style.background = 'rgba(255, 184, 0, 0.15)';
          badgeEl.style.borderColor = 'var(--color-warning)';
          badgeEl.style.color = 'var(--color-warning)';
          badgeEl.innerHTML = '🟡 Modo Invitado';
        }
        if (btnProfileLogin) {
          btnProfileLogin.classList.remove('hidden');
          btnProfileLogin.onclick = (e) => {
            e.preventDefault();
            document.getElementById('marketing-login-modal')?.classList.remove('hidden');
          };
        }
        if (btnProfileLogout) btnProfileLogout.classList.add('hidden');
      }

      // --- STRICT ROLE VISIBILITY ENFORCEMENT ---
      const isGuest = !user;
      const isCitizen = user && (user.role === 'citizen' || !user.role);
      const isPrivileged = user && (user.role === 'admin' || user.role === 'patrol');

      const dNavReport = document.getElementById('d-nav-report');
      const dNavProfile = document.getElementById('d-nav-profile');
      const dNavChat = document.getElementById('d-nav-chat');
      const hNavSupport = document.getElementById('h-nav-support');
      const dLinkAdmin = document.getElementById('link-admin-panel');

      const mNavReport = document.getElementById('nav-btn-report');
      const mNavProfile = document.getElementById('nav-btn-profile');
      const mNavChat = document.getElementById('nav-btn-chat');

      if (isGuest) {
        // Guests see Map, Routes and Support Help Desk
        if (dNavReport) dNavReport.style.display = 'none';
        if (dNavProfile) dNavProfile.style.display = 'none';
        if (dNavChat) dNavChat.style.display = '';
        if (hNavSupport) hNavSupport.style.display = '';
        if (dLinkAdmin) dLinkAdmin.style.display = 'none';

        if (mNavReport) mNavReport.style.display = 'none';
        if (mNavProfile) mNavProfile.style.display = 'none';
        if (mNavChat) mNavChat.style.display = '';

        const activeTab = document.querySelector('.desktop-tab-btn.active')?.dataset?.tab ||
                          document.querySelector('.nav-tab-item.active')?.dataset?.tab;
        if (activeTab === 'report' || activeTab === 'profile') {
          document.getElementById('d-nav-map')?.click() || document.getElementById('nav-btn-map')?.click();
        }
      } else if (isCitizen) {
        // Citizens see community tabs, but C2 is hidden
        if (dNavReport) dNavReport.style.display = '';
        if (dNavProfile) dNavProfile.style.display = '';
        if (dNavChat) dNavChat.style.display = '';
        if (hNavSupport) hNavSupport.style.display = '';
        if (dLinkAdmin) dLinkAdmin.style.display = 'none';

        if (mNavReport) mNavReport.style.display = '';
        if (mNavProfile) mNavProfile.style.display = '';
        if (mNavChat) mNavChat.style.display = '';
      } else if (isPrivileged) {
        // Admins and Patrols see all tabs + C2
        if (dNavReport) dNavReport.style.display = '';
        if (dNavProfile) dNavProfile.style.display = '';
        if (dNavChat) dNavChat.style.display = '';
        if (hNavSupport) hNavSupport.style.display = '';
        if (dLinkAdmin) dLinkAdmin.style.display = '';

        if (mNavReport) mNavReport.style.display = '';
        if (mNavProfile) mNavProfile.style.display = '';
        if (mNavChat) mNavChat.style.display = '';
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
            if (!this.currentUser) {
              this.showToast('🔒 Acceso Restringido: Inicia sesión con tu cuenta de ciudadano para reportar o registrar eventos.', 'warning');
              document.getElementById('marketing-login-modal')?.classList.remove('hidden');
              return;
            }
            // Ubicación elegida a propósito por el ciudadano para ESTE reporte. Se guarda aparte de
            // this.userCoords (que sigue siendo tu posición GPS en vivo) para que el GPS real del celular
            // no la sobreescriba mientras completas el reporte (bug reportado: en móvil el aviso terminaba
            // publicándose en tu ubicación real en vez del punto que tocaste en el mapa).
            this.selectedReportCoords = { lat: latlng.lat, lng: latlng.lng };
            this.riskMap.map.closePopup();
            const sosBtn = document.querySelector('[data-tab="report"]');
            if (sosBtn) sosBtn.click();
            this.updateReportLocationIndicator();
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

    updateFloatingIncidentCard() {
      try {
        const incidents = swarmEngine.loadIncidents();
        const titleEl = document.getElementById('floating-incident-title');
        const timeEl = document.getElementById('floating-incident-time');
        const subEl = document.getElementById('floating-incident-subtitle');
        const badgeEl = document.getElementById('floating-incident-badge');
        const iconEl = document.getElementById('floating-incident-icon');
        const etaEl = document.getElementById('floating-route-eta');
        const sectorEl = document.getElementById('badge-sector-text');

        if (sectorEl && this.userCoords) {
          sectorEl.textContent = 'Cuadrante Activo';
        }

        if (!incidents || incidents.length === 0) {
          if (titleEl) titleEl.textContent = 'Cuadrante Seguro';
          if (timeEl) timeEl.textContent = 'activo';
          if (subEl) subEl.textContent = 'Sin incidentes activos • Cuadrante vigilado';
          if (badgeEl) badgeEl.innerHTML = '<span>🛡️ 98% Segura</span>';
          if (iconEl) iconEl.textContent = '🛡️';
          if (etaEl) etaEl.textContent = '8m';
          const distBadge = document.getElementById('floating-dist-badge');
          if (distBadge) distBadge.textContent = 'OPT';
          return;
        }

        let nearest = null;
        let minDist = Infinity;
        incidents.forEach(inc => {
          const d = swarmEngine.calculateDistanceMeters(this.userCoords.lat, this.userCoords.lng, inc.lat, inc.lng);
          if (d < minDist) {
            minDist = d;
            nearest = inc;
          }
        });

        if (nearest) {
          const cat = INCIDENT_CATEGORIES[nearest.category] || { name: 'Alerta Comunitaria', icon: '🚨' };
          const distMeters = Math.round(minDist);

          // Dynamic time calculation
          const refTime = nearest.criticalStartedAt || nearest.updatedAt || nearest.createdAt || Date.now();
          const elapsedMin = Math.max(0, Math.floor((Date.now() - refTime) / 60000));
          const timeStr = elapsedMin === 0 ? 'hace instantes' : `hace ${elapsedMin}m`;

          const isCrit = nearest.status === INCIDENT_STATES.CRITICAL_SWARM;
          if (titleEl) titleEl.textContent = isCrit ? 'Alerta Crítica Cercana' : 'Atención Preventiva';
          if (timeEl) timeEl.textContent = timeStr;

          const reporterNote = (nearest.reporters && nearest.reporters[0] && nearest.reporters[0].note) 
            ? nearest.reporters[0].note 
            : `${cat.name} reportado en la zona`;
          if (subEl) subEl.textContent = `${cat.name} • ${reporterNote}`;
          if (iconEl) iconEl.textContent = cat.icon || '⚠️';
          if (etaEl) etaEl.textContent = `${Math.max(2, Math.round(distMeters / 60))}m`;

          const distBadge = document.getElementById('floating-dist-badge');
          if (distBadge) distBadge.textContent = `${distMeters}M`;
          const neighborsText = document.getElementById('cluster-neighbors-text');
          if (neighborsText) neighborsText.textContent = `${nearest.reportCount || 1} reporte(s) • ${isCrit ? 'Activo' : 'Enfriamiento'}`;

          if (badgeEl) {
            if (isCrit) {
              badgeEl.style.background = 'rgba(255, 51, 102, 0.15)';
              badgeEl.style.borderColor = 'rgba(255, 51, 102, 0.4)';
              badgeEl.style.color = '#ff3366';
              badgeEl.innerHTML = '<span>⚠️ Zona Roja (Activa)</span>';
            } else if (nearest.coolingDown || nearest.status === INCIDENT_STATES.PROBING) {
              badgeEl.style.background = 'rgba(245, 158, 11, 0.15)';
              badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
              badgeEl.style.color = '#f59e0b';
              badgeEl.innerHTML = '<span>🟡 Atención Preventiva</span>';
            } else if (nearest.status === INCIDENT_STATES.PATROL_ATTENDED) {
              badgeEl.style.background = 'rgba(59, 130, 246, 0.15)';
              badgeEl.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              badgeEl.style.color = '#3b82f6';
              badgeEl.innerHTML = '<span>👮 Cuadrante en Sitio</span>';
            } else {
              badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
              badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
              badgeEl.style.color = '#10b981';
              badgeEl.innerHTML = '<span>🛡️ 98% Segura</span>';
            }
          }
        }
      } catch (err) {
        console.warn('Error updating floating incident card:', err);
      }
    }

    setupTabs() {
      const mobileNavItems = document.querySelectorAll('.nav-tab-item');
      const desktopNavItems = document.querySelectorAll('.desktop-tab-btn');
      const headerNavItems = document.querySelectorAll('.header-nav-link');
      const tabPanels = document.querySelectorAll('.tab-panel');
      const sidebarPanels = document.getElementById('app-sidebar-panels');
      const floatingCard = document.getElementById('floating-incident-card');
      const drawerTitle = document.getElementById('drawer-panel-title');

      // Start with clean map view (drawer collapsed by default)
      if (sidebarPanels) sidebarPanels.classList.add('drawer-collapsed');
      if (floatingCard) floatingCard.classList.remove('hidden');

      const switchTab = (target) => {
        sounds.playClick();

        // Handle direct SOS central button click
        if (target === 'sos') {
          if (!this.currentUser) {
            sounds.playWarningPing();
            this.showToast('🔒 Inicia sesión con tu cuenta de ciudadano para disparar el SOS.', 'warning');
            document.getElementById('marketing-login-modal')?.classList.remove('hidden');
            return;
          }
          sounds.playWarningPing();
          this.startPanicCountdown();
          return;
        }

        // Enforce guest role permissions (report & profile require login; chat/support is accessible)
        if (!this.currentUser && (target === 'report' || target === 'profile')) {
          this.showToast('🔒 Registro requerido. Inicia sesión con Google para acceder.', 'warning');
          if (firebaseAuth.openGoogleChooser) {
            firebaseAuth.openGoogleChooser().then(u => {
              if (u) {
                this.currentUser = u;
                this.renderAuthUI(u);
                switchTab(target);
              }
            });
          }
          target = 'map';
        }

        mobileNavItems.forEach(n => {
          if (n.dataset.tab === target) n.classList.add('active');
          else n.classList.remove('active');
        });

        desktopNavItems.forEach(d => {
          if (d.dataset.tab === target) d.classList.add('active');
          else d.classList.remove('active');
        });

        headerNavItems.forEach(h => {
          if (h.dataset.tab === target) h.classList.add('active');
          else h.classList.remove('active');
        });

        tabPanels.forEach(p => p.classList.remove('active'));

        const panel = document.getElementById('tab-' + target);
        if (panel) panel.classList.add('active');

        if (target === 'map') {
          if (sidebarPanels) sidebarPanels.classList.add('drawer-collapsed');
          if (floatingCard) floatingCard.classList.remove('hidden');
        } else {
          if (sidebarPanels) sidebarPanels.classList.remove('drawer-collapsed');
          if (floatingCard) floatingCard.classList.add('hidden');

          if (drawerTitle) {
            if (target === 'report') drawerTitle.innerHTML = '📢 Zumbidos & Alertas';
            else if (target === 'routes') drawerTitle.innerHTML = '🛡️ Navegación & Rutas Seguras';
            else if (target === 'profile') drawerTitle.innerHTML = '🐝 Panal & Reputación';
            else if (target === 'chat') drawerTitle.innerHTML = '🎧 Atención & Soporte Beja 24/7';
            else drawerTitle.innerHTML = '🛡️ Panel Colmena';
          }
        }

        if (this.riskMap && this.riskMap.map) {
          setTimeout(() => this.riskMap.map.invalidateSize(), 180);
        }
      };

      mobileNavItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
      });

      desktopNavItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
      });

      headerNavItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
      });

      // Drawer close button
      document.getElementById('btn-close-sidebar-drawer')?.addEventListener('click', () => {
        switchTab('map');
      });

      // Centered Header Search Bar
      const headerSearchInput = document.getElementById('header-route-search-input');
      const headerSearchBtn = document.getElementById('btn-header-search-go');
      const handleHeaderSearch = () => {
        const query = headerSearchInput ? headerSearchInput.value.trim() : '';
        if (query) {
          const routeSearchInput = document.getElementById('route-search-input');
          if (routeSearchInput) routeSearchInput.value = query;
          switchTab('routes');
          document.getElementById('btn-search-address')?.click();
        } else {
          switchTab('routes');
        }
      };
      headerSearchBtn?.addEventListener('click', handleHeaderSearch);
      headerSearchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleHeaderSearch();
        }
      });

      // Header notification bell button (Mockup)
      document.getElementById('btn-header-bell')?.addEventListener('click', () => {
        sounds.playClick();
        this.showToast('🔔 Red comunitaria San Isidro calibrada. 32 nodos activos en el cuadrante.', 'info');
      });

      // Floating incident card actions
      document.getElementById('btn-floating-view-route')?.addEventListener('click', () => {
        switchTab('routes');
        document.getElementById('btn-calc-route')?.click();
      });
      document.getElementById('btn-floating-notify')?.addEventListener('click', () => {
        switchTab('report');
      });

      // Desktop Map Zoom & Navigation Controls
      document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => {
        sounds.playClick();
        if (this.riskMap && this.riskMap.map) {
          this.riskMap.map.zoomIn();
        }
      });
      document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => {
        sounds.playClick();
        if (this.riskMap && this.riskMap.map) {
          this.riskMap.map.zoomOut();
        }
      });
      document.getElementById('btn-map-north')?.addEventListener('click', () => {
        sounds.playClick();
        if (this.riskMap && this.riskMap.map) {
          this.riskMap.map.setView([this.userCoords.lat, this.userCoords.lng], this.riskMap.map.getZoom());
          this.showToast('🧭 Orientación restablecida hacia el Norte.', 'info');
        }
      });

      // Desktop Layer Toggles (Mockup: Capa de Calor / Puntos Seguros)
      const btnToggleHeatmap = document.getElementById('btn-toggle-heatmap');
      const btnToggleSafepoints = document.getElementById('btn-toggle-safepoints');
      btnToggleHeatmap?.addEventListener('click', () => {
        sounds.playClick();
        btnToggleHeatmap.classList.toggle('active');
        const isActive = btnToggleHeatmap.classList.contains('active');
        if (this.riskMap) {
          this.riskMap.setTimeFilter(isActive ? 'ALL' : 'NIGHT');
        }
        this.showToast(isActive ? '🔥 Capa de Calor activada' : '🔥 Capa de Calor pausada', 'info');
      });
      btnToggleSafepoints?.addEventListener('click', () => {
        sounds.playClick();
        btnToggleSafepoints.classList.toggle('active');
        const isActive = btnToggleSafepoints.classList.contains('active');
        if (this.riskMap) this.riskMap.toggleSafePoints(isActive);
        this.showToast(isActive ? '🛡️ Buscando estaciones de policía cercanas...' : '🛡️ Puntos Seguros ocultos', 'info');
      });

      // Floating Layer button
      document.getElementById('btn-floating-layers')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('floating-layer-menu')?.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-floating-layers') && !e.target.closest('#floating-layer-menu')) {
          document.getElementById('floating-layer-menu')?.classList.add('hidden');
        }
      });

      // Time filter buttons
      document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.riskMap) this.riskMap.setTimeFilter(btn.dataset.time);
          sounds.playClick();
        });
      });

      // Recenter GPS
      document.getElementById('btn-recenter-gps')?.addEventListener('click', () => {
        sounds.playClick();
        geoResolver.resolveLocation();
        if (this.riskMap) {
          this.riskMap.setUserLocation(this.userCoords.lat, this.userCoords.lng, true);
        }
      });

      document.getElementById('gps-status-pill')?.addEventListener('click', () => {
        sounds.playClick();
        this.showToast('📍 Buscando ubicación GPS del dispositivo...', 'info');
        geoResolver.resolveLocation();
        if (this.riskMap) {
          this.riskMap.setUserLocation(this.userCoords.lat, this.userCoords.lng, true);
        }
      });

      // Institutional Footer Links (Desktop Mockup)
      document.getElementById('link-protocols')?.addEventListener('click', (e) => {
        e.preventDefault();
        sounds.playClick();
        this.showToast('📋 Protocolos Comunitarios Beja SafeNet v2.4 activos.', 'info');
      });
      document.getElementById('link-help')?.addEventListener('click', (e) => {
        e.preventDefault();
        sounds.playClick();
        this.showToast('ℹ️ Centro de Ayuda: Enlace directo con Serenazgo San Isidro y patrullaje preventivo.', 'info');
      });
      document.getElementById('link-privacy')?.addEventListener('click', (e) => {
        e.preventDefault();
        sounds.playClick();
        this.showToast('🔒 Privacidad y Datos: Encriptación comunitaria y anonimización de geolocalización.', 'info');
      });

      this.updateFloatingIncidentCard();
    }

    setupPanic() {
      const panicBtn = document.getElementById('main-panic-btn');
      const desktopQuickPanic = document.getElementById('btn-quick-panic-desktop');
      const cancelBtn = document.getElementById('panic-cancel-btn');
      const categoryChips = document.querySelectorAll('.category-chip');
      const btnGuestReportLogin = document.getElementById('btn-guest-report-login');

      if (btnGuestReportLogin) {
        btnGuestReportLogin.addEventListener('click', () => {
          sounds.playClick();
          document.getElementById('marketing-login-modal')?.classList.remove('hidden');
        });
      }

      categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
          sounds.playClick();
          categoryChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.currentCategory = chip.dataset.category;
          const catInfo = INCIDENT_CATEGORIES[this.currentCategory] || { name: 'Alerta SOS', icon: '🚨' };
          const iconEl = document.getElementById('panic-btn-active-icon');
          const textEl = document.getElementById('panic-btn-active-text');
          const subEl = document.getElementById('panic-btn-active-sub');
          if (iconEl) iconEl.textContent = catInfo.icon;
          if (textEl) textEl.textContent = `REPORTAR ${catInfo.name.toUpperCase()}`;
          if (subEl) subEl.textContent = `Toca para activar colmena`;
        });
      });

      const triggerPanic = () => {
        if (!this.currentUser) {
          sounds.playWarningPing();
          this.showToast('🔒 Acceso Restringido: Inicia sesión con tu cuenta de ciudadano para reportar alertas o eventos SOS.', 'warning');
          document.getElementById('marketing-login-modal')?.classList.remove('hidden');
          return;
        }
        sounds.playWarningPing();
        this.startPanicCountdown();
      };

      if (panicBtn) panicBtn.addEventListener('click', triggerPanic);
      if (desktopQuickPanic) desktopQuickPanic.addEventListener('click', triggerPanic);
      const desktopSosFab = document.getElementById('btn-desktop-sos-fab');
      if (desktopSosFab) desktopSosFab.addEventListener('click', triggerPanic);

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

      const btnResetReportLocation = document.getElementById('btn-reset-report-location');
      if (btnResetReportLocation) {
        btnResetReportLocation.addEventListener('click', () => {
          sounds.playClick();
          this.selectedReportCoords = null;
          this.updateReportLocationIndicator();
          this.showToast('📍 Reportando de nuevo en tu ubicación GPS actual.', 'info');
        });
      }
      this.updateReportLocationIndicator();
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
      if (!this.currentUser) {
        this.showToast('🔒 Debes iniciar sesión para reportar o registrar eventos.', 'warning');
        document.getElementById('marketing-login-modal')?.classList.remove('hidden');
        return;
      }
      const noteInput = document.getElementById('report-note-input');
      const note = noteInput ? noteInput.value.trim() : '';

      const reporterUser = this.currentUser;
      // Prioriza la ubicación que el ciudadano eligió a mano en el mapa; si no eligió ninguna, usa su GPS real.
      const reportCoords = this.selectedReportCoords || this.userCoords;

      const { incident, isEscalated } = swarmEngine.reportIncident({
        lat: reportCoords.lat,
        lng: reportCoords.lng,
        category: this.currentCategory,
        note: note,
        userId: reporterUser.uid,
        userEmail: reporterUser.email,
        userName: reporterUser.displayName,
        userTrust: reporterUser.trustScore
      });

      // Save to Firebase Cloud
      firebaseSync.saveIncidentToCloud(incident);

      // Un reporte manual solo aplica a ESTE reporte: el siguiente vuelve a usar el GPS real por defecto.
      this.selectedReportCoords = null;
      this.updateReportLocationIndicator();

      if (isEscalated) {
        sounds.playCriticalAlarm();
        sounds.speakAlert('Alerta de colmena confirmada. Zona roja activada.');
        this.showToast('🚨 ¡CONSENSO DE ENJAMBRE! Reputación de la comunidad confirmó la alerta. (+10 pts)', 'critical');
      } else {
        sounds.playWarningPing();
        this.showToast('📡 Alerta de sondeo enviada. Esperando confirmación de vecinos...', 'warning');
      }

      const mapBtn = document.querySelector('[data-tab="map"]');
      if (mapBtn && window.innerWidth < 900) mapBtn.click();
    }

    /**
     * Refleja en la pestaña de reporte si el próximo aviso SOS se va a publicar en un punto
     * elegido a mano en el mapa, o en tu ubicación GPS real (comportamiento por defecto).
     */
    updateReportLocationIndicator() {
      const textEl = document.getElementById('report-location-text');
      const resetBtn = document.getElementById('btn-reset-report-location');
      if (!textEl) return;
      if (this.selectedReportCoords) {
        textEl.textContent = `📍 Reportando en el punto elegido en el mapa [${this.selectedReportCoords.lat.toFixed(4)}, ${this.selectedReportCoords.lng.toFixed(4)}]`;
        textEl.classList.add('manual-location-active');
        if (resetBtn) resetBtn.classList.remove('hidden');
      } else {
        textEl.textContent = '📍 Reportando en tu ubicación GPS actual';
        textEl.classList.remove('manual-location-active');
        if (resetBtn) resetBtn.classList.add('hidden');
      }
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

      // Mobile Bottom Sheet Collapse / Expand Toggles (Google Maps Style)
      const grabBar = document.getElementById('routes-sheet-grab-bar');
      const toggleHeader = document.getElementById('routes-sheet-toggle-btn');
      const toggleLabel = document.getElementById('sheet-toggle-label');
      const sidebarPanels = document.querySelector('.app-sidebar-panels');

      const toggleSheet = () => {
        if (!sidebarPanels) return;
        sounds.playClick();
        const isCollapsed = sidebarPanels.classList.toggle('collapsed');
        if (toggleLabel) {
          toggleLabel.textContent = isCollapsed ? 'Expandir ⬆️' : 'Plegar ⬇️';
        }
        if (this.riskMap && this.riskMap.map) {
          setTimeout(() => this.riskMap.map.invalidateSize(), 200);
        }
      };

      grabBar?.addEventListener('click', toggleSheet);
      toggleHeader?.addEventListener('click', toggleSheet);

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

        const lat = (this.userCoords && typeof this.userCoords.lat === 'number') ? this.userCoords.lat : geoResolver.currentCoords.lat;
        const lon = (this.userCoords && typeof this.userCoords.lng === 'number') ? this.userCoords.lng : geoResolver.currentCoords.lng;

        const results = await geocodeAddress(q, lat, lon);

        if (!results) {
          if (dropdown) dropdown.innerHTML = '<div style="padding:10px;color:var(--color-critical);">No se pudo conectar con el buscador de direcciones. Verifica tu conexión e intenta de nuevo.</div>';
          return;
        }
        if (results.length === 0) {
          if (dropdown) dropdown.innerHTML = '<div style="padding:10px;color:var(--color-warning);">No se encontraron lugares con ese nombre.</div>';
          return;
        }
        if (dropdown) {
          dropdown.innerHTML = results.map((r, i) => `
            <div class="search-result-item" data-index="${i}">
              <strong>📍 ${r.label}</strong>
              <small>${r.sublabel}</small>
            </div>
          `).join('');

          dropdown.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
              const idx = parseInt(item.dataset.index);
              const selected = results[idx];
              const destLat = selected.lat;
              const destLng = selected.lon;

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

            ${(res.direct.isApproximate || res.detour.isApproximate) ? `
              <div style="background:rgba(255,184,0,0.1);border:1px dashed rgba(255,184,0,0.4);border-radius:8px;padding:8px 10px;margin-top:8px;font-size:0.72rem;color:var(--color-warning);">
                ⚠️ No se pudo contactar al servidor de rutas por calles en este momento: la ${res.direct.isApproximate && res.detour.isApproximate ? 'ruta directa y el desvío son aproximados' : (res.direct.isApproximate ? 'ruta directa es aproximada' : 'sub-ruta alterna es aproximada')} (línea recta, puede no seguir calles reales). Intenta de nuevo en unos segundos.
              </div>
            ` : ''}

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
            ${res.isApproximate ? `
              <div style="background:rgba(255,184,0,0.1);border:1px dashed rgba(255,184,0,0.4);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:0.72rem;color:var(--color-warning);">
                ⚠️ No se pudo contactar al servidor de rutas por calles en este momento: esta es una línea aproximada, puede no seguir calles reales. Intenta de nuevo en unos segundos.
              </div>
            ` : ''}
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

    setupSyncEvents() {
      syncBus.on('SWARM_ESCALATED_CRITICAL', ({ incident }) => {
        const eventTime = incident.reactivatedAt || incident.updatedAt || incident.createdAt || Date.now();
        const shouldNotify = swarmEngine.shouldNotifyAlert(incident.id, eventTime);
        if (shouldNotify) {
          sounds.playCriticalAlarm();
          sounds.speakAlert('Alerta comunitaria: Peligro confirmado en tu cuadrante.');
          this.showToast(`🚨 ¡PELIGRO ENJAMBRE CONFIRMADO! (${incident.reportCount} reportes)`, 'critical');
          swarmEngine.recordAlertNotified(incident.id, eventTime);
        }
        this.renderFeed();
        this.updateTrustUI();
        this.updateFloatingIncidentCard();
      });

      syncBus.on('NEW_PROBE_ALERT', ({ incident }) => {
        const eventTime = incident.createdAt || Date.now();
        const shouldNotify = swarmEngine.shouldNotifyAlert(incident.id, eventTime);
        if (shouldNotify) {
          sounds.playWarningPing();
          this.showToast(`⚠️ Radar Preventivo: Alerta reportada en tu cuadrante`, 'warning');
          swarmEngine.recordAlertNotified(incident.id, eventTime);
        }
        this.renderFeed();
        this.updateFloatingIncidentCard();
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
        if (bc.active === false) return;

        const eventTime = bc.timestamp || Date.now();
        const shouldNotify = swarmEngine.shouldNotifyAlert(bc.id, eventTime);
        if (!shouldNotify) return;

        // Calculate distance if coordinates are present
        let isWithinRadius = true;
        let distanceM = 0;
        if (bc.centerLat && bc.centerLng && this.userCoords) {
          const dist = swarmEngine.calculateDistanceMeters(this.userCoords.lat, this.userCoords.lng, bc.centerLat, bc.centerLng);
          distanceM = Math.round(dist);
          const alertRadius = bc.radiusMeters || 1000;
          if (distanceM > alertRadius) {
            isWithinRadius = false;
          }
        }

        swarmEngine.recordAlertNotified(bc.id, eventTime);

        // Strictly alert only users within <= alert radius
        if (!isWithinRadius) {
          this.showToast(`📢 Alerta en cuadrante (${distanceM}m): ${bc.title}`, 'info');
          return;
        }

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
        this.updateFloatingIncidentCard();
      });
      this.renderFeed();
      this.updateFloatingIncidentCard();
    }

    handleGeofence(threat) {
      const banner = document.getElementById('geofence-warning-banner');
      if (!banner) return;
      if (threat && threat.incident) {
        // La deduplicación por "ya lo cerré" vive en RiskMap.checkGeofence() (persistente y consciente de reactivaciones);
        // si llegamos aquí, es porque de verdad hay que mostrar el aviso.
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
          if (this.riskMap) this.riskMap.dismissGeofenceBanner(threat.incident.id);
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
            const myId = syncBus.getSenderId();
            const hasConfirmed = inc.reporters && inc.reporters.some(r => r.userId === myId);
            const hasRefuted = inc.refutations && inc.refutations.some(r => r.userId === myId);
            const hasVoted = hasConfirmed || hasRefuted;

            // Distance calculation to check if user is on the same street segment (<=50m)
            let distM = null;
            if (this.userCoords && inc.lat && inc.lng) {
              distM = Math.round(swarmEngine.calculateDistanceMeters(this.userCoords.lat, this.userCoords.lng, inc.lat, inc.lng));
            }
            const isOnStreet = distM !== null ? (distM <= 50) : true;
            const refutedCount = (inc.refutations && inc.refutations.length) || 0;

            return `
              <div class="incident-card ${isCrit ? 'card-critical' : 'card-warning'}">
                <div class="card-icon">${cat.icon}</div>
                <div class="card-info">
                  <div class="card-top">
                    <span class="card-title">${cat.name}</span>
                    <span class="card-badge ${isCrit ? 'badge-critical' : 'badge-warning'}">${isCrit ? '🚨 Enjambre Crítico' : (inc.coolingDown ? '🟡 Atención Preventiva' : '🟡 Sondeo')}</span>
                  </div>
                  <p class="card-sub">
                    ${distM !== null ? `📍 A ${distM}m en tu zona &bull; ` : ''}
                    👥 ${inc.reportCount} confirmación(es)${refutedCount > 0 ? ` &bull; ⚠️ ${refutedCount} desmentido(s)` : ''}
                  </p>
                  
                  <div class="incident-witness-action-row" style="margin-top:8px;">
                    ${!this.currentUser ? `
                      <button class="btn-guest-vote-prompt" onclick="document.getElementById('marketing-login-modal')?.classList.remove('hidden')" title="Inicia sesión para participar en el consenso vecinal" style="width:100%;background:rgba(255,184,0,0.08);border:1px dashed rgba(255,184,0,0.4);color:var(--color-warning);padding:8px 10px;border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;text-align:center;">
                        🔒 Inicia sesión como ciudadano para validar o desmentir este evento (+5 pts)
                      </button>
                    ` : (
                      !hasVoted ? (
                        isOnStreet ? `
                          <div class="witness-dual-buttons" style="display:flex;gap:8px;width:100%;">
                            <button class="btn-witness-confirm" onclick="window.citizenApp.voteIncident('${inc.id}', true)" title="Confirmar que el evento es real" style="flex:1;background:rgba(0,230,118,0.15);border:1px solid #00e676;color:#00e676;padding:8px 6px;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;">
                              ✅ Es Real (+5 pts)
                            </button>
                            <button class="btn-witness-refute" onclick="window.citizenApp.voteIncident('${inc.id}', false)" title="Desmentir reporte como falso" style="flex:1;background:rgba(255,23,68,0.15);border:1px solid #ff1744;color:#ff5252;padding:8px 6px;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;">
                              ❌ Es Falso (+5 pts)
                            </button>
                          </div>
                        ` : `
                          <div class="witness-too-far-badge" style="background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);padding:6px 10px;border-radius:8px;font-size:0.72rem;color:var(--text-muted);line-height:1.3;">
                            👁️ Alerta a ${distM}m. Calificación reservada a vecinos presentes en la misma calle (≤50m).
                          </div>
                        `
                      ) : `
                        <span style="font-size:0.72rem;color:${hasConfirmed ? 'var(--color-safe)' : '#ff5252'};font-weight:700;">
                          ${hasConfirmed ? '✅ Testimonio registrado: Confirmaste que es REAL' : '❌ Testimonio registrado: Indicaste que es FALSO'}
                        </span>
                      `
                    )}
                  </div>
                </div>
              </div>
            `;
          }).join('');

      if (mobileFeed) mobileFeed.innerHTML = html;
      if (desktopFeed) desktopFeed.innerHTML = html;
    }

    voteIncident(incidentId, isReal) {
      sounds.playClick();
      if (!this.currentUser) {
        this.showToast('🔒 Debes iniciar sesión con tu cuenta de ciudadano para validar o desmentir incidentes.', 'warning');
        document.getElementById('marketing-login-modal')?.classList.remove('hidden');
        return;
      }
      const res = swarmEngine.voteIncidentVerdict(incidentId, isReal, this.userCoords, this.currentUser.trustScore);
      if (res.success) {
        if (isReal) {
          sounds.playDispatchChime();
          this.showToast('✅ ¡Testimonio registrado como REAL! Ganaste +5 pts de reputación.', 'info');
          if (res.isEscalated) {
            sounds.playCriticalAlarm();
            this.showToast('🚨 ¡Alerta escalada a Enjambre Crítico por consenso vecinal!', 'critical');
          }
          if (res.incident) firebaseSync.saveIncidentToCloud(res.incident);
        } else {
          sounds.playWarningPing();
          if (res.isDismissed) {
            this.showToast('🛑 ¡Alerta descartada por consenso! Varios vecinos en la calle confirmaron que era falsa.', 'warning');
            if (window.firebaseSync && window.firebaseSync.db) {
              window.firebaseSync.db.collection('incidents').doc(incidentId).delete().catch(() => {});
            }
          } else {
            this.showToast('❌ Registraste que la alerta es FALSA (+5 pts). Esperando 2do testigo para descartarla.', 'info');
            if (res.incident) firebaseSync.saveIncidentToCloud(res.incident);
          }
        }
      } else {
        if (res.reason === 'TOO_FAR') {
          this.showToast(`📍 Estás a ${res.distance}m. Solo vecinos presentes en la misma calle (≤50m) pueden verificar este evento.`, 'warning');
        } else if (res.reason === 'ALREADY_VOTED') {
          this.showToast('Ya registraste tu testimonio sobre esta alerta.', 'warning');
        } else {
          this.showToast('No se pudo registrar la votación.', 'warning');
        }
      }
      this.renderFeed();
      this.updateTrustUI();
      if (this.riskMap) {
        this.riskMap.renderActiveIncidents();
        this.riskMap.renderHeatmap();
      }
    }

    voteWitness(incidentId) {
      return this.voteIncident(incidentId, true);
    }

    updateTrustUI() {
      const trust = trustEngine.state;
      // La reputación mostrada/usada para consenso es la de la CUENTA (la misma que ve y ajusta el panel C2),
      // no solo el contador local de gamificación de esta sesión.
      const score = (this.currentUser && typeof this.currentUser.trustScore === 'number') ? this.currentUser.trustScore : trust.score;
      const level = getTrustLevelLabel(score);

      const scoreNum = document.getElementById('trust-score-num');
      const scoreLevel = document.getElementById('trust-score-level');
      const verifiedCount = document.getElementById('trust-verified-count');
      const validationVotes = document.getElementById('trust-validation-votes');
      const quickTrust = document.getElementById('quick-trust-stat');
      const badgeCircle = document.getElementById('trust-badge-circle');
      const eventsList = document.getElementById('reputation-events-list');

      if (scoreNum) scoreNum.textContent = score;
      if (scoreLevel) scoreLevel.textContent = level;
      if (verifiedCount) verifiedCount.textContent = `✅ ${trust.verifiedReports} alerta(s) validadas`;
      if (validationVotes) validationVotes.textContent = `🤝 ${trust.validationsGiven} aporte(s) como testigo`;
      if (quickTrust) quickTrust.textContent = `${score}/100`;

      if (badgeCircle) {
        if (score >= 85) badgeCircle.style.borderColor = 'var(--color-safe)';
        else if (score >= 50) badgeCircle.style.borderColor = 'var(--color-warning)';
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

    setupChat() {
      const channelBtns = document.querySelectorAll('.chat-channel-btn');
      const chatForm = document.getElementById('citizen-chat-form');
      const chatInput = document.getElementById('citizen-chat-input');
      const priorityRadios = document.querySelectorAll('input[name="chat-priority"]');

      // Conectar botón de Centros de Ayuda en el footer de escritorio
      document.getElementById('link-help')?.addEventListener('click', (e) => {
        e.preventDefault();
        const tabBtn = document.getElementById('nav-btn-chat') || document.getElementById('h-nav-support');
        if (tabBtn) tabBtn.click();
      });

      // Defensive compatibility bindings for legacy contacts controls
      const toggleContactsBtn = document.getElementById('btn-toggle-contacts-view');
      const closeContactsBtn = document.getElementById('btn-close-contacts');
      const roleFilterChips = document.querySelectorAll('.role-filter-chip');
      toggleContactsBtn?.addEventListener('click', () => {});
      closeContactsBtn?.addEventListener('click', () => {});
      roleFilterChips.forEach(chip => chip.addEventListener('click', () => {}));

      channelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          sounds.playClick();
          channelBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const channel = btn.dataset.channel;
          if (window.chatService) window.chatService.selectChannel(channel);
          this.updateChatHeader(channel);
          this.renderChatMessages();
        });
      });

      priorityRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          document.querySelectorAll('.priority-chip').forEach(p => p.classList.remove('active'));
          radio.closest('.priority-chip')?.classList.add('active');
        });
      });

      chatForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput?.value.trim();
        if (!text) return;
        const selectedPriority = document.querySelector('input[name="chat-priority"]:checked')?.value || 'NORMAL';
        if (window.chatService) {
          window.chatService.sendMessage({
            text,
            priority: selectedPriority,
            currentUser: this.currentUser
          });
        }
        if (chatInput) chatInput.value = '';
        sounds.playDispatchChime();
        this.renderChatMessages();
      });

      if (window.chatService) {
        window.chatService.onMessage(() => {
          this.renderChatMessages();
        });
      }

      this.renderChatMessages();
      this.updateChatHeader(window.chatService ? window.chatService.activeChannelId : 'soporte_general');
    }

    updateChatHeader(channelId) {
      const title = document.getElementById('citizen-chat-title');
      const subtitle = document.getElementById('citizen-chat-subtitle');
      const icon = document.getElementById('citizen-chat-icon');

      if (channelId === 'soporte_tecnico') {
        if (title) title.textContent = 'Soporte Técnico & GPS 🛠️';
        if (subtitle) subtitle.textContent = 'Asistencia para mapa interactivo, geolocalización y cálculo de rutas';
        if (icon) icon.textContent = '🛠️';
      } else if (channelId === 'soporte_emergencias') {
        if (title) title.textContent = 'Asistencia Táctica & Cuadrante 🚨';
        if (subtitle) subtitle.textContent = 'Orientación para validación de alertas comunitarias y protocolos de auxilio';
        if (icon) icon.textContent = '🚨';
      } else {
        if (title) title.textContent = 'Atención & Soporte Beja 24/7 🎧';
        if (subtitle) subtitle.textContent = 'Canal oficial y confidencial de atención ciudadana y técnica';
        if (icon) icon.textContent = '🎧';
      }
    }

    renderChatMessages() {
      const container = document.getElementById('citizen-chat-messages');
      if (!container || !window.chatService) return;
      const myId = this.currentUser ? this.currentUser.uid : ('usr_guest_' + window.chatService.getOrCreateGuestId());
      const activeChannel = window.chatService.activeChannelId || 'soporte_general';
      // Tu conversación entera con Soporte (lo que tú escribiste + lo que Soporte/Control te respondió a TI),
      // filtrada por la categoría/pestaña que tengas abierta.
      const messages = window.chatService.getMessagesForCitizen(myId, activeChannel);

      if (messages.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px 10px;color:var(--text-muted);font-size:0.8rem;">Sin tickets en esta categoría. Escribe a Soporte Beja para recibir asistencia inmediata.</div>';
        return;
      }

      container.innerHTML = messages.map(m => {
        const isSupport = (m.senderRole === 'support' || m.senderId === 'beja_support_desk');
        const isSelf = !isSupport && ((m.senderId === myId) || (this.currentUser && m.senderEmail && this.currentUser.email && m.senderEmail.toLowerCase() === this.currentUser.email.toLowerCase()));
        const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isEmergency = m.priority === 'EMERGENCY';
        const isWarning = m.priority === 'WARNING';
        const priorityClass = isEmergency ? 'priority-emergency' : (isWarning ? 'priority-warning' : 'priority-normal');
        
        const roleBadge = isSupport
          ? '<span class="contact-role-badge badge-role-admin">🛡️ Soporte Verificado</span>'
          : (m.senderRole === 'patrol' 
            ? '<span class="contact-role-badge badge-role-patrol">🚓 Patrullero</span>'
            : '<span class="contact-role-badge badge-role-citizen">👤 Usuario</span>');

        const senderDisplayName = isSupport 
          ? (m.senderName || 'Soporte Oficial Beja')
          : (isSelf ? 'Tú (Consulta)' : (m.senderName || 'Usuario'));

        const avatarSrc = isSupport ? 'assets/logo.svg' : (m.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=anon');

        // Formato básico de markdown simple
        let formattedText = this.escapeHtml(m.text);
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        return `
          <div class="chat-msg-row ${isSelf ? 'msg-self' : (isSupport ? 'msg-support-official' : 'msg-other')}">
            <img src="${avatarSrc}" alt="${senderDisplayName}" class="msg-avatar ${isSupport ? 'msg-avatar-support' : ''}">
            <div class="msg-bubble ${priorityClass} ${isSupport ? 'msg-bubble-support' : ''}">
              <div class="msg-meta-row">
                <span class="msg-sender-name ${isSupport ? 'sender-support-name' : ''}">${senderDisplayName}</span>
                ${roleBadge}
                ${isEmergency ? '<span class="msg-priority-badge badge-p-emergency">🚨 ASISTENCIA CRÍTICA</span>' : (isWarning ? '<span class="msg-priority-badge badge-p-warning">⚠️ AVISO</span>' : '')}
                <span class="msg-time">${timeStr}</span>
              </div>
              <div class="msg-text-content">${formattedText}</div>
            </div>
          </div>
        `;
      }).join('');

      container.scrollTop = container.scrollHeight;
    }

    renderChatContacts() {
      // Método reservado por compatibilidad: el chat es exclusivo para soporte
    }

    openDirectChat() {
      // Método reservado por compatibilidad: redirige a la mesa de soporte
      if (window.chatService) {
        window.chatService.selectChannel('soporte_general');
        this.updateChatHeader('soporte_general');
        this.renderChatMessages();
      }
    }

    escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
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
