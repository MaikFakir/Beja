/**
 * Colmena Segura - Swarm Consensus & Incident Intelligence Engine
 * Handles spatiotemporal clustering, progressive consensus states,
 * citizen trust scoring, and historical risk aggregation.
 */

import { syncBus } from './syncBus.js';

export const INCIDENT_STATES = {
  PROBING: 'PROBING',                 // 1 report: Yellow preventive radar alert
  CRITICAL_SWARM: 'CRITICAL_SWARM',   // 2+ reports: Red emergency siren alert
  DISPATCHED: 'DISPATCHED',           // Patrol / Emergency unit en route
  PATROL_ATTENDED: 'PATROL_ATTENDED', // Patrol has attended on site (Tactical Blue alert, calmed visual alarm, hotzone preserved)
  RESOLVED: 'RESOLVED',               // Handled & closed by authorities
  FALSE_ALARM: 'FALSE_ALARM'          // Dismissed / spam
};

export const INCIDENT_CATEGORIES = {
  FIGHT: { id: 'FIGHT', name: 'Riña / Pelea', icon: '⚔️', defaultSeverity: 'HIGH' },
  ROBBERY: { id: 'ROBBERY', name: 'Robo / Asalto', icon: '🚨', defaultSeverity: 'CRITICAL' },
  MEDICAL: { id: 'MEDICAL', name: 'Emergencia Médica', icon: '🚑', defaultSeverity: 'HIGH' },
  SUSPICIOUS: { id: 'SUSPICIOUS', name: 'Actividad Sospechosa', icon: '👁️', defaultSeverity: 'MEDIUM' },
  ACCIDENT: { id: 'ACCIDENT', name: 'Accidente Vial', icon: '🚗', defaultSeverity: 'MEDIUM' }
};

export class SwarmEngine {
  constructor() {
    this.CLUSTER_RADIUS_METERS = 50; // Radius for swarm grouping (50 meters)
    this.CLUSTER_WINDOW_MS = 5 * 60 * 1000; // 5 minutes window
    this.STORAGE_KEY_INCIDENTS = 'colmena_incidents_active_v2';
    this.STORAGE_KEY_HISTORY = 'colmena_incidents_history_v2';
    this.STORAGE_KEY_TRUST = 'colmena_user_trust_v1';

    // Purge legacy v1 mock clutter
    try {
      localStorage.removeItem('colmena_incidents_active_v1');
      localStorage.removeItem('colmena_incidents_history_v1');
    } catch (e) {}

    this.incidents = this.loadIncidents();
    this.history = this.loadHistory();
    this.userTrust = this.loadUserTrust();

    this.listenToSyncEvents();
  }

  listenToSyncEvents() {
    syncBus.on('INCIDENT_MUTATION', (data) => {
      this.incidents = this.loadIncidents();
      this.history = this.loadHistory();
    });
  }

  /**
   * Calculate Haversine distance in meters between two lat/lng pairs
   */
  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Trigger an alert from a citizen
   */
  reportIncident({ lat, lng, category = 'FIGHT', note = '', photoUrl = null, userId = null }) {
    userId = userId || syncBus.getSenderId();
    const now = Date.now();

    // Check if user is temporarily banned due to low trust score
    if (this.userTrust.score < 30) {
      throw new Error('Nivel de confianza insuficiente para emitir alertas. Contacte soporte.');
    }

    // Clean up expired incidents before checking
    this.cleanupExpiredIncidents();

    // Check for existing active cluster within radius
    let matchingCluster = this.incidents.find((inc) => {
      if (inc.status === INCIDENT_STATES.RESOLVED || inc.status === INCIDENT_STATES.FALSE_ALARM) return false;
      const distance = this.calculateDistanceMeters(lat, lng, inc.lat, inc.lng);
      const isWithinTime = (now - inc.updatedAt) < this.CLUSTER_WINDOW_MS;
      return distance <= this.CLUSTER_RADIUS_METERS && isWithinTime;
    });

    let resultIncident;
    let isEscalated = false;

    if (matchingCluster) {
      // Cluster exists: add reporter if not already added
      const alreadyReported = matchingCluster.reporters.some(r => r.userId === userId);
      
      matchingCluster.reporters.push({
        userId,
        timestamp: now,
        note,
        photoUrl
      });

      matchingCluster.updatedAt = now;
      matchingCluster.reportCount = matchingCluster.reporters.length;

      // Progressive escalation: If 2 or more reports and status was PROBING
      if (matchingCluster.reportCount >= 2 && matchingCluster.status === INCIDENT_STATES.PROBING) {
        matchingCluster.status = INCIDENT_STATES.CRITICAL_SWARM;
        isEscalated = true;
      }

      resultIncident = matchingCluster;
    } else {
      // Create new PROBING incident (1 report)
      resultIncident = {
        id: 'inc_' + now + '_' + Math.random().toString(36).substr(2, 5),
        lat,
        lng,
        category,
        status: INCIDENT_STATES.PROBING,
        createdAt: now,
        updatedAt: now,
        reportCount: 1,
        reporters: [{
          userId,
          timestamp: now,
          note,
          photoUrl
        }],
        assignedUnit: null,
        dispatchNotes: []
      };

      this.incidents.unshift(resultIncident);
    }

    this.saveIncidents();

    // Broadcast mutation and specific notification
    syncBus.emit('INCIDENT_MUTATION', { incident: resultIncident, isEscalated });

    if (isEscalated) {
      syncBus.emit('SWARM_ESCALATED_CRITICAL', { incident: resultIncident });
    } else if (resultIncident.reportCount === 1) {
      syncBus.emit('NEW_PROBE_ALERT', { incident: resultIncident });
    } else {
      syncBus.emit('INCIDENT_UPDATED', { incident: resultIncident });
    }

    return { incident: resultIncident, isEscalated };
  }

  /**
   * Dispatch authority unit to incident
   */
  dispatchUnit(incidentId, unitData = { code: 'PATRULLA-04', etaMinutes: 4 }) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;

    incident.status = INCIDENT_STATES.DISPATCHED;
    incident.assignedUnit = {
      ...unitData,
      dispatchedAt: Date.now()
    };
    incident.updatedAt = Date.now();

    this.saveIncidents();
    syncBus.emit('INCIDENT_MUTATION', { incident });
    syncBus.emit('UNIT_DISPATCHED', { incident });
    return incident;
  }

  /**
   * Register patrol attended / on-site: switches incident to tactical BLUE,
   * calms audible/visual alarms, but preserves the hotzone record on the map.
   */
  patrolIncident(incidentId, unitData = { code: 'PATRULLA-04', officer: 'Agente Morales' }) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;

    incident.status = INCIDENT_STATES.PATROL_ATTENDED;
    incident.patrolUnit = {
      ...unitData,
      attendedAt: Date.now()
    };
    incident.updatedAt = Date.now();

    this.saveIncidents();
    syncBus.emit('INCIDENT_MUTATION', { incident });
    syncBus.emit('PATROL_ATTENDED', { incident });
    return incident;
  }

  /**
   * Attend incident by a police patrol / security unit
   * Turns the alert into TACTICAL BLUE (calms visual alarm, silences siren, preserves hotzone in history)
   */
  patrolIncident(incidentId, unitData = { code: 'PATRULLA-CUADRANTE', etaMinutes: 0 }) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;

    incident.status = INCIDENT_STATES.PATROL_ATTENDED;
    incident.patrolAttendedAt = Date.now();
    incident.attendedBy = unitData;
    incident.updatedAt = Date.now();

    // Preserve the incident hotzone in historical risk heatmap without aggressive alarm
    this.history.push({
      lat: incident.lat,
      lng: incident.lng,
      category: incident.category,
      weight: 0.35, // Soft calm weight: preserves hotzone data without visual clutter
      timestamp: Date.now(),
      timeOfDay: new Date().getHours() >= 19 || new Date().getHours() <= 5 ? 'NIGHT' : 'DAY'
    });
    this.saveHistory();
    this.saveIncidents();

    syncBus.emit('INCIDENT_MUTATION', { incident, status: INCIDENT_STATES.PATROL_ATTENDED });
    syncBus.emit('PATROL_ATTENDED_INCIDENT', { incident });
    return incident;
  }

  /**
   * Mark incident as resolved
   */
  resolveIncident(incidentId, resolutionNotes = 'Atendido por cuadrante de seguridad') {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;

    incident.status = INCIDENT_STATES.RESOLVED;
    incident.resolvedAt = Date.now();
    incident.resolutionNotes = resolutionNotes;
    incident.updatedAt = Date.now();

    // Track dismissed/resolved ID permanently so it never re-appears on page reload
    this.recordDismissedId(incidentId);

    // Reward reporters with Trust Score points
    if (incident.reporters) {
      incident.reporters.forEach(r => {
        this.updateTrustScore(r.userId, +10);
      });
    }

    // Add to historical risk dataset for dynamic heatmaps
    this.history.push({
      lat: incident.lat,
      lng: incident.lng,
      category: incident.category,
      weight: Math.min(1.0, 0.4 + (incident.reportCount * 0.2)),
      timestamp: incident.createdAt,
      timeOfDay: new Date(incident.createdAt).getHours() >= 19 || new Date(incident.createdAt).getHours() <= 5 ? 'NIGHT' : 'DAY'
    });
    this.saveHistory();

    // Remove from active incidents list
    this.incidents = this.incidents.filter(i => i.id !== incidentId);
    this.saveIncidents();

    syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.RESOLVED });
    syncBus.emit('INCIDENT_RESOLVED', { incidentId });
    return incident;
  }

  /**
   * Mark incident as false alarm
   */
  markFalseAlarm(incidentId) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return null;

    // Track dismissed/resolved ID permanently so it never re-appears on page reload
    this.recordDismissedId(incidentId);

    // Penalize reporters
    if (incident.reporters) {
      incident.reporters.forEach(r => {
        this.updateTrustScore(r.userId, -30);
      });
    }

    this.incidents = this.incidents.filter(i => i.id !== incidentId);
    this.saveIncidents();

    syncBus.emit('INCIDENT_MUTATION', { incidentId, status: INCIDENT_STATES.FALSE_ALARM });
    syncBus.emit('INCIDENT_DISMISSED', { incidentId });
    return true;
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

  /**
   * Broadcast emergency announcement to a sector
   */
  sendBroadcastAlert({ title, message, radiusMeters = 1000, centerLat, centerLng }) {
    const broadcast = {
      id: 'bc_' + Date.now(),
      title,
      message,
      radiusMeters,
      centerLat,
      centerLng,
      timestamp: Date.now()
    };

    syncBus.emit('COMMUNITY_BROADCAST', broadcast);
    return broadcast;
  }

  /**
   * User trust score management
   */
  updateTrustScore(userId, delta) {
    if (userId === syncBus.getSenderId()) {
      this.userTrust.score = Math.max(0, Math.min(100, this.userTrust.score + delta));
      this.userTrust.totalReports += 1;
      if (delta > 0) this.userTrust.verifiedReports += 1;
      this.saveUserTrust();
      syncBus.emit('TRUST_UPDATED', this.userTrust);
    }
  }

  /**
   * Precise Lifecycle & Expiration Engine:
   * - Probing (1 unconfirmed report): Dissolves after 10 minutes (prevents false lingering).
   * - Critical Swarm (2+ reports): Auto-archives to history after 30 minutes.
   * - Patrol Attended (Blue alert): Stays visible for 20 minutes to inform the community, then auto-archives to history.
   */
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

      const ageMs = now - (inc.updatedAt || inc.createdAt);

      // 1. Probing (1 report): Expire after 10 minutes if no second confirmation
      if (inc.status === INCIDENT_STATES.PROBING && ageMs > 10 * 60 * 1000) {
        changed = true;
        this.recordDismissedId(inc.id);
        return;
      }

      // 2. Critical Swarm & Dispatched: Auto-archive after 30 minutes
      if ((inc.status === INCIDENT_STATES.CRITICAL_SWARM || inc.status === INCIDENT_STATES.DISPATCHED) && ageMs > 30 * 60 * 1000) {
        changed = true;
        this.history.push({
          lat: inc.lat,
          lng: inc.lng,
          category: inc.category,
          weight: 0.6,
          timestamp: inc.createdAt,
          timeOfDay: new Date(inc.createdAt).getHours() >= 19 || new Date(inc.createdAt).getHours() <= 5 ? 'NIGHT' : 'DAY'
        });
        this.recordDismissedId(inc.id);
        return;
      }

      // 3. Patrol Attended: Active for 20 minutes, then archive
      if (inc.status === INCIDENT_STATES.PATROL_ATTENDED && ageMs > 20 * 60 * 1000) {
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
    }
  }

  loadIncidents() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_INCIDENTS);
      let list = raw ? JSON.parse(raw) : [];
      const dismissed = this.getDismissedIds();
      // Filter out any dismissed, resolved, or false alarm incidents
      list = list.filter(i => !dismissed.includes(i.id) && i.status !== INCIDENT_STATES.RESOLVED && i.status !== INCIDENT_STATES.FALSE_ALARM);
      return list;
    } catch (e) {
      return [];
    }
  }

  saveIncidents() {
    try {
      localStorage.setItem(this.STORAGE_KEY_INCIDENTS, JSON.stringify(this.incidents));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }

  loadHistory() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  saveHistory() {
    try {
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.history));
    } catch (e) {}
  }

  loadUserTrust() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_TRUST);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      score: 100,
      level: 'Guardián Confiable',
      totalReports: 0,
      verifiedReports: 0
    };
  }

  saveUserTrust() {
    try {
      localStorage.setItem(this.STORAGE_KEY_TRUST, JSON.stringify(this.userTrust));
    } catch (e) {}
  }

  /**
   * Default seed for historical crime & risk hotspots (lat/lng around a vibrant metropolitan core)
   */
  getInitialHistoricalSeed() {
    return [];
  }
}

export const swarmEngine = new SwarmEngine();
