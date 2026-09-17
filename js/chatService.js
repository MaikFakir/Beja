/**
 * Colmena Segura - Servicio de Mensajería, Radio Táctico y Panel de Contactos
 * Gestiona canales grupales, chats directos, segmentación de contactos por roles
 * (Ciudadanos, Patrulleros, Administradores) y niveles de prioridad (Emergencia, Precaución, Normal).
 */

(function() {
  'use strict';

  class ChatService {
    constructor() {
      this.STORAGE_KEY_MESSAGES = 'colmena_chat_messages_v1';
      this.activeChannelId = 'general'; // 'general' | 'emergencias' | 'cuadrante' | 'dm_{uid}'
      this.activeDirectContact = null; // null or user object
      this.listeners = [];
      this.broadcastChannel = null;

      try {
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          this.broadcastChannel = new window.BroadcastChannel('colmena_chat_bus');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'NEW_CHAT_MESSAGE') {
              this.notifyListeners(event.data.message);
            }
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }

      this.ensureInitialSeedMessages();
    }

    /**
     * Canales oficiales predeterminados del sistema
     */
    getOfficialChannels() {
      return [
        {
          id: 'general',
          name: 'Comunidad General',
          icon: '💬',
          description: 'Canal abierto para todos los vecinos, avisos comunitarios y alertas cívicas.',
          badge: 'Comunitario'
        },
        {
          id: 'emergencias',
          name: 'Emergencias SOS',
          icon: '🚨',
          description: 'Prioridad alta para incidentes en progreso, apoyo mutuo y llamados de auxilio.',
          badge: 'Prioridad'
        },
        {
          id: 'cuadrante',
          name: 'Enlace Cuadrante & Patrullas',
          icon: '🚓',
          description: 'Canal directo de coordinación operativa con las unidades policiales del sector.',
          badge: 'Oficial'
        }
      ];
    }

    /**
     * Si no hay mensajes guardados, provee un feed de bienvenida y coordinación realista
     */
    ensureInitialSeedMessages() {
      const raw = localStorage.getItem(this.STORAGE_KEY_MESSAGES);
      if (!raw || raw.trim() === '' || raw === '[]') {
        const now = Date.now();
        const initialMessages = [
          {
            id: 'msg_seed_01',
            channelId: 'general',
            senderId: 'user_admin_super',
            senderName: 'GABY OLARTE (SUPER ADMIN)',
            senderEmail: 'Gabyolarte2017@gmail.com',
            senderRole: 'admin',
            senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gaby',
            recipientId: null,
            priority: 'NORMAL',
            text: '¡Bienvenidos a la red Colmena Segura! Los reportes con 2 o más confirmaciones activan la sirena comunitaria.',
            timestamp: now - 1000 * 60 * 25
          },
          {
            id: 'msg_seed_02',
            channelId: 'general',
            senderId: 'user_patrol_01',
            senderName: 'PATRULLA CUADRANTE 04',
            senderEmail: 'patrulla.cuadrante04@policia.gov.co',
            senderRole: 'patrol',
            senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=patrol',
            recipientId: null,
            priority: 'WARNING',
            text: 'Ronda de prevención en curso por la zona comercial. Reporten cualquier anomalía por la app.',
            timestamp: now - 1000 * 60 * 18
          },
          {
            id: 'msg_seed_03',
            channelId: 'emergencias',
            senderId: 'user_patrol_01',
            senderName: 'PATRULLA CUADRANTE 04',
            senderEmail: 'patrulla.cuadrante04@policia.gov.co',
            senderRole: 'patrol',
            senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=patrol',
            recipientId: null,
            priority: 'EMERGENCY',
            text: 'Alerta prioritaria atendida en cruce principal. Sector asegurado por móvil policial.',
            timestamp: now - 1000 * 60 * 10
          },
          {
            id: 'msg_seed_04',
            channelId: 'cuadrante',
            senderId: 'user_cit_02',
            senderName: 'MARÍA GONZÁLEZ (LÍDER COMUNAL)',
            senderEmail: 'maria.gonzalez@gmail.com',
            senderRole: 'citizen',
            senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=maria',
            recipientId: null,
            priority: 'NORMAL',
            text: 'Coordinando con los comerciantes del sector para mantener las alarmas comunitarias sincronizadas.',
            timestamp: now - 1000 * 60 * 5
          }
        ];
        try {
          localStorage.setItem(this.STORAGE_KEY_MESSAGES, JSON.stringify(initialMessages));
        } catch (e) {}
      }
    }

    /**
     * Carga todos los mensajes almacenados
     */
    getAllMessages() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_MESSAGES);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    /**
     * Guarda la lista completa de mensajes
     */
    saveAllMessages(messages) {
      try {
        localStorage.setItem(this.STORAGE_KEY_MESSAGES, JSON.stringify(messages));
      } catch (e) {}
    }

    /**
     * Obtiene los mensajes correspondientes a un canal o conversación privada
     */
    getMessagesForCurrentContext(currentUserId) {
      const all = this.getAllMessages();
      if (this.activeDirectContact) {
        // Conversación 1 a 1 entre currentUserId y this.activeDirectContact.uid
        const contactUid = this.activeDirectContact.uid;
        return all.filter(m => {
          if (!m.recipientId) return false;
          return (m.senderId === currentUserId && m.recipientId === contactUid) ||
                 (m.senderId === contactUid && m.recipientId === currentUserId);
        });
      } else {
        // Canal grupal
        return all.filter(m => m.channelId === this.activeChannelId && !m.recipientId);
      }
    }

    /**
     * Envía un mensaje en el canal o chat directo activo
     */
    sendMessage({ text, priority = 'NORMAL', currentUser = null }) {
      if (!text || text.trim() === '') return null;
      const now = Date.now();

      // Resolver usuario remitente
      let sender = currentUser || (window.firebaseAuth ? window.firebaseAuth.currentUser : null);
      if (!sender) {
        sender = {
          uid: 'usr_guest_' + (window.syncBus ? window.syncBus.getSenderId() : 'anon'),
          displayName: 'Ciudadano Vecino',
          email: 'invitado@colmena.local',
          role: 'citizen',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=anon'
        };
      }

      const msgObj = {
        id: 'msg_' + now + '_' + Math.random().toString(36).substr(2, 5),
        channelId: this.activeDirectContact ? `dm_${this.activeDirectContact.uid}` : this.activeChannelId,
        recipientId: this.activeDirectContact ? this.activeDirectContact.uid : null,
        recipientName: this.activeDirectContact ? this.activeDirectContact.displayName : null,
        senderId: sender.uid,
        senderName: sender.displayName || sender.email.split('@')[0],
        senderEmail: sender.email,
        senderRole: sender.role || 'citizen',
        senderAvatar: sender.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${sender.email || 'anon'}`,
        priority: priority.toUpperCase(), // 'NORMAL' | 'WARNING' | 'EMERGENCY'
        text: text.trim(),
        timestamp: now
      };

      const messages = this.getAllMessages();
      messages.push(msgObj);
      this.saveAllMessages(messages);

      // Difundir en vivo a otras pestañas/ventanas y al bus
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: msgObj });
        } catch (e) {}
      }

      if (window.syncBus) {
        window.syncBus.emit('NEW_CHAT_MESSAGE', { message: msgObj });
      }

      this.notifyListeners(msgObj);
      return msgObj;
    }

    /**
     * Selecciona un canal grupal
     */
    selectChannel(channelId) {
      this.activeChannelId = channelId;
      this.activeDirectContact = null;
      this.notifyListeners({ action: 'CHANNEL_CHANGED', channelId });
    }

    /**
     * Selecciona un contacto para chat directo 1 a 1
     */
    selectDirectContact(userObj) {
      this.activeDirectContact = userObj;
      this.activeChannelId = `dm_${userObj.uid}`;
      this.notifyListeners({ action: 'DIRECT_CONTACT_SELECTED', contact: userObj });
    }

    /**
     * Obtiene el listado de contactos del directorio con filtro por roles
     * @param {string} roleFilter - 'ALL' | 'citizen' | 'patrol' | 'admin'
     */
    getContacts(roleFilter = 'ALL') {
      let users = [];
      if (window.firebaseAuth) {
        users = window.firebaseAuth.getUsersList();
      }
      if (!users || users.length === 0) {
        users = [
          {
            uid: 'user_admin_super',
            email: 'Gabyolarte2017@gmail.com',
            displayName: 'GABY OLARTE (SUPER ADMIN)',
            role: 'admin',
            trustScore: 100,
            status: 'active'
          },
          {
            uid: 'user_patrol_01',
            email: 'patrulla.cuadrante04@policia.gov.co',
            displayName: 'PATRULLA CUADRANTE 04',
            role: 'patrol',
            trustScore: 100,
            status: 'active'
          }
        ];
      }

      if (roleFilter === 'ALL') return users;
      return users.filter(u => (u.role || 'citizen') === roleFilter);
    }

    onMessage(callback) {
      this.listeners.push(callback);
    }

    notifyListeners(payload) {
      this.listeners.forEach(cb => {
        try { cb(payload); } catch (err) { console.warn('Chat listener err:', err); }
      });
    }
  }

  window.chatService = new ChatService();
})();
