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
    this.unsubscribeIncidents = this.db.collection('incidents').onSnapshot((snapshot) => {
      const cloudIncidents = [];
      let hasNewIncident = false;

      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        cloudIncidents.push(data);

        // Detectar si es un incidente nuevo para disparar sirena comunitaria
        if (!this.lastKnownIncidentIds.has(doc.id)) {
          this.lastKnownIncidentIds.add(doc.id);
          hasNewIncident = true;
        }
      });

      // Actualizar el motor de enjambre local con los datos de la nube
      swarmEngine.incidents = cloudIncidents;
      localStorage.setItem(swarmEngine.STORAGE_KEY_INCIDENTS, JSON.stringify(cloudIncidents));

      // Emitir evento de mutación para que la vista del mapa y feeds se actualicen
      syncBus.emit('INCIDENT_MUTATION', { action: 'CLOUD_SYNC', count: cloudIncidents.length });

      if (hasNewIncident && cloudIncidents.length > 0) {
        const latest = cloudIncidents[cloudIncidents.length - 1];
        if (latest.status === INCIDENT_STATES.CRITICAL_SWARM) {
          sounds.playCriticalAlarm();
          sounds.speakAlert(`Alerta comunitaria: ${latest.category || 'Peligro'} confirmado.`);
        } else {
          sounds.playWarningPing();
        }
      }
    }, (error) => {
      console.warn('⚠️ Error en sincronización de incidentes:', error);
    });

    // 2. Escuchar transmisiones oficiales de emergencia
    this.unsubscribeBroadcasts = this.db.collection('broadcasts').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const broadcastData = change.doc.data();
          // Disparar modal de alerta oficial en todos los dispositivos
          syncBus.emit('COMMUNITY_BROADCAST', broadcastData);
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
      await this.db.collection('incidents').doc(incident.id).set(incident, { merge: true });
    } catch (err) {
      console.error('Error al guardar incidente en Firebase:', err);
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
