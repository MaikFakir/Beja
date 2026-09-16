/**
 * Colmena Segura - Real-Time Cross-Tab Event Bus & Synchronization Layer
 * Uses BroadcastChannel with localStorage event bridge fallback.
 */

class SyncBus {
  constructor() {
    this.channelName = 'colmena_segura_realtime_mesh';
    this.channel = null;
    this.listeners = new Map();
    this.initChannel();
  }

  initChannel() {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }

    // Storage fallback for broader browser compatibility
    window.addEventListener('storage', (event) => {
      if (event.key === this.channelName && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue);
          this.handleMessage(payload);
        } catch (e) {
          console.error('Failed to parse storage sync message', e);
        }
      }
    });
  }

  /**
   * Broadcast an event to all other tabs and windows
   * @param {string} eventName 
   * @param {any} data 
   */
  emit(eventName, data = {}) {
    const payload = {
      event: eventName,
      data,
      timestamp: Date.now(),
      senderId: this.getSenderId()
    };

    if (this.channel) {
      this.channel.postMessage(payload);
    }

    // Update storage for fallback and persistence
    try {
      localStorage.setItem(this.channelName, JSON.stringify(payload));
    } catch (e) {
      console.warn('localStorage quota or error', e);
    }

    // Trigger local listeners too
    this.triggerLocal(eventName, payload);
  }

  /**
   * Register an event listener
   * @param {string} eventName 
   * @param {Function} callback 
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
    return () => this.off(eventName, callback);
  }

  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    const callbacks = this.listeners.get(eventName).filter(cb => cb !== callback);
    this.listeners.set(eventName, callbacks);
  }

  handleMessage(payload) {
    if (!payload || !payload.event) return;
    this.triggerLocal(payload.event, payload);
  }

  triggerLocal(eventName, payload) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(cb => {
        try {
          cb(payload.data, payload);
        } catch (err) {
          console.error(`Error in event listener for ${eventName}:`, err);
        }
      });
    }

    // Also trigger global wildcard listener
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => cb(eventName, payload.data, payload));
    }
  }

  getSenderId() {
    let id = sessionStorage.getItem('colmena_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('colmena_client_id', id);
    }
    return id;
  }
}

export const syncBus = new SyncBus();
