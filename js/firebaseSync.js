/**
 * Colmena Segura - Adaptador de Sincronización en Tiempo Real con Firebase Firestore
 * Plan Spark (100% Gratis de Google)
 */

import { FIREBASE_CONFIG } from './firebase-config.js';
import { syncBus } from './syncBus.js';
import { swarmEngine, INCIDENT_STATES } from './swarmEngine.js';
import { sounds } from './soundEffects.js';

class FirebaseSyncService {
  constructor() {
    this.db = null;
    this.isConfigured = false;
    this.isConnected = false;
    this.unsubscribeIncidents = null;
    this.unsubscribeBroadcasts = null;
    this.lastKnownIncidentIds = new Set();
  }

  /**
   * Inicializa la conexión a Firebase Firestore si las credenciales están presentes
   */
  init() {
    const config = (typeof window !== 'undefined' && window.COLMENA_FIREBASE_CONFIG) 
      ? window.COLMENA_FIREBASE_CONFIG 
      : FIREBASE_CONFIG;

    if (!config || !config.apiKey || config.apiKey.trim() === '') {
      console.log('ℹ️ Colmena Segura: Modo Local Activo (Firebase no configurado aún).');
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
        console.log('✅ Colmena Segura: Conectado a Google Firebase Firestore (Plan Spark).');
        this.updateCloudStatusBadge(true);
        this.listenToCloudChanges();
      }
    } catch (err) {
      console.warn('⚠️ Error al inicializar Firebase Firestore:', err);
      this.updateCloudStatusBadge(false);
    }
  }

  /**
   * Escucha en tiempo real los incidentes reportados por cualquier usuario en la nube
   */
  listenToCloudChanges() {
    if (!this.db) return;

    // 1. Escuchar colección de incidentes
    let isInitialIncidentsLoad = true;
    this.unsubscribeIncidents = this.db.collection('incidents').onSnapshot((snapshot) => {
      const cloudIncidents = [];
      const dismissedIds = swarmEngine.getDismissedIds ? swarmEngine.getDismissedIds() : [];

      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;

        // Skip resolved, false alarm, or dismissed incidents
        if (data.status === INCIDENT_STATES.RESOLVED || data.status === INCIDENT_STATES.FALSE_ALARM || dismissedIds.includes(doc.id)) {
          return;
        }

        cloudIncidents.push(data);
      });

      // Actualizar el motor de enjambre local con los datos de la nube
      swarmEngine.incidents = cloudIncidents;
      localStorage.setItem(swarmEngine.STORAGE_KEY_INCIDENTS, JSON.stringify(cloudIncidents));

      // Emitir evento de mutación para que la vista del mapa y feeds se actualicen
      syncBus.emit('INCIDENT_MUTATION', { action: 'CLOUD_SYNC', count: cloudIncidents.length });

      if (isInitialIncidentsLoad) {
        // En arranque inicial: registrar IDs conocidos y SOLO sonar alarma si el evento ACABA de ocurrir (<= 3 min) y no ha sido notificado en esta sesión
        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          this.lastKnownIncidentIds.add(doc.id);
          if (data.status === INCIDENT_STATES.CRITICAL_SWARM) {
            const eventTime = data.reactivatedAt || data.updatedAt || data.createdAt || 0;
            if (swarmEngine.shouldNotifyAlert(doc.id, eventTime)) {
              sounds.playCriticalAlarm();
              sounds.speakAlert(`Alerta comunitaria: ${data.category || 'Peligro'} confirmado.`);
              swarmEngine.recordAlertNotified(doc.id, eventTime);
            }
          }
        });
        isInitialIncidentsLoad = false;
        return;
      }

      // Actualizaciones en vivo mientras la app está abierta
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          data.id = change.doc.id;
          if (data.status === INCIDENT_STATES.CRITICAL_SWARM) {
            const eventTime = data.reactivatedAt || data.updatedAt || data.createdAt || Date.now();
            if (swarmEngine.shouldNotifyAlert(data.id, eventTime)) {
              sounds.playCriticalAlarm();
              sounds.speakAlert(`Alerta comunitaria: ${data.category || 'Peligro'} confirmado.`);
              swarmEngine.recordAlertNotified(data.id, eventTime);
            }
          }
        }
      });
    }, (error) => {
      console.warn('⚠️ Error en sincronización de incidentes:', error);
    });

    // 2. Escuchar transmisiones oficiales de emergencia
    let initialBroadcastLoad = true;
    this.unsubscribeBroadcasts = this.db.collection('broadcasts').onSnapshot((snapshot) => {
      if (initialBroadcastLoad) {
        snapshot.forEach(doc => {
          const broadcastData = doc.data();
          const bcId = doc.id || broadcastData.id;
          const eventTime = broadcastData.timestamp || 0;
          if (broadcastData.active !== false && swarmEngine.shouldNotifyAlert(bcId, eventTime)) {
            syncBus.emit('COMMUNITY_BROADCAST', { ...broadcastData, id: bcId });
          }
        });
        initialBroadcastLoad = false;
        return;
      }

      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const broadcastData = change.doc.data();
          const bcId = change.doc.id || broadcastData.id;
          const eventTime = broadcastData.timestamp || Date.now();
          if (broadcastData.active !== false && swarmEngine.shouldNotifyAlert(bcId, eventTime)) {
            syncBus.emit('COMMUNITY_BROADCAST', { ...broadcastData, id: bcId });
          }
        }
      });
    });
  }

  /**
   * Guarda o actualiza un incidente en la nube de Firebase
   */
  async saveIncidentToCloud(incident) {
    if (!this.isConfigured || !this.db) return;
    try {
      if (incident.status === INCIDENT_STATES.RESOLVED || incident.status === INCIDENT_STATES.FALSE_ALARM) {
        await this.deleteIncidentFromCloud(incident.id);
      } else {
        await this.db.collection('incidents').doc(incident.id).set(incident, { merge: true });
      }
    } catch (err) {
      console.error('Error al guardar incidente en Firebase:', err);
    }
  }

  /**
   * Elimina un incidente resuelto o falso de Firestore para que no resurja
   */
  async deleteIncidentFromCloud(incidentId) {
    if (!this.isConfigured || !this.db) return;
    try {
      await this.db.collection('incidents').doc(incidentId).delete();
    } catch (err) {
      console.warn('Error al eliminar incidente de Firebase:', err);
    }
  }

  /**
   * Envía un comunicado de emergencia a todos los dispositivos conectados
   */
  async sendBroadcastToCloud(broadcastData) {
    if (!this.isConfigured || !this.db) return;
    try {
      await this.db.collection('broadcasts').add({
        ...broadcastData,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Error al enviar transmisión a Firebase:', err);
    }
  }

  /**
   * Muestra un distintivo sutil de estado de la nube en la barra superior
   */
  updateCloudStatusBadge(isOnline) {
    let badge = document.getElementById('cloud-sync-status-badge');
    if (!badge) {
      const header = document.querySelector('.header-badges-group') || document.querySelector('.top-bar-brand');
      if (header) {
        badge = document.createElement('span');
        badge.id = 'cloud-sync-status-badge';
        badge.className = 'badge-trust';
        badge.style.cursor = 'pointer';
        badge.style.transition = 'all 0.3s ease';
        header.appendChild(badge);
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
        badge.title = 'Funcionando en almacenamiento local del navegador (Pega tus claves de Firebase para activar sincronización entre celulares)';
        badge.style.background = 'rgba(255, 255, 255, 0.08)';
        badge.style.borderColor = 'var(--border-glass)';
        badge.style.color = 'var(--text-dim)';
      }
    }
  }
}

export const firebaseSync = new FirebaseSyncService();
if (typeof window !== 'undefined') {
  window.firebaseSync = firebaseSync;
}
