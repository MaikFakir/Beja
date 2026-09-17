/**
 * Beja - Servicio Oficial de Atención al Ciudadano y Mesa de Ayuda (Soporte Exclusivo)
 * El chat opera ÚNICAMENTE como canal oficial de atención a soporte, asistencia técnica,
 * resolución de dudas de la app y reporte directo a la central de guardia.
 * NO permite mensajería entre usuarios para garantizar la privacidad y el propósito de seguridad.
 */

(function() {
  'use strict';

  class ChatService {
    constructor() {
      this.STORAGE_KEY_MESSAGES = 'beja_support_messages_v2';
      this.activeChannelId = 'soporte_general'; // 'soporte_general' | 'soporte_tecnico' | 'soporte_emergencias'
      this.activeDirectContact = null; // Siempre canalizado a Soporte Oficial Beja
      this.listeners = [];
      this.broadcastChannel = null;

      try {
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          this.broadcastChannel = new window.BroadcastChannel('beja_support_bus');
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
     * Canales oficiales de atención y soporte Beja
     */
    getOfficialChannels() {
      return [
        {
          id: 'soporte_general',
          name: 'Atención General',
          icon: '🎧',
          description: 'Canal oficial de soporte al ciudadano, orientación de la red comunitaria y consultas.',
          badge: 'Soporte 24/7'
        },
        {
          id: 'soporte_tecnico',
          name: 'Soporte Técnico',
          icon: '🛠️',
          description: 'Asistencia con el mapa interactivo, geolocalización GPS, rutas y rendimiento de la app.',
          badge: 'Técnico'
        },
        {
          id: 'soporte_emergencias',
          name: 'Asistencia de Cuadrante',
          icon: '🚨',
          description: 'Orientación para validación de alertas, enlace con el cuadrante y protocolos de seguridad.',
          badge: 'Prioridad'
        }
      ];
    }

    /**
     * Mensajes iniciales de bienvenida emitidos por el Equipo de Soporte Oficial Beja
     */
    ensureInitialSeedMessages() {
      const raw = localStorage.getItem(this.STORAGE_KEY_MESSAGES);
      if (!raw || raw.trim() === '' || raw === '[]') {
        const now = Date.now();
        const initialMessages = [
          {
            id: 'msg_sup_welcome_01',
            channelId: 'soporte_general',
            senderId: 'beja_support_desk',
            senderName: 'MESA DE SOPORTE BEJA',
            senderEmail: 'soporte@beja.local',
            senderRole: 'support',
            senderAvatar: 'assets/logo.svg',
            recipientId: null,
            priority: 'NORMAL',
            text: '👋 ¡Hola! Te damos la bienvenida a la Mesa Oficial de Atención y Soporte de Beja. Este canal es exclusivo para resolver problemas técnicos, ayudarte con la navegación segura y responder dudas sobre tu cuenta.',
            timestamp: now - 1000 * 60 * 60
          },
          {
            id: 'msg_sup_welcome_02',
            channelId: 'soporte_general',
            senderId: 'beja_support_desk',
            senderName: 'OPERADOR DE GUARDIA C2',
            senderEmail: 'guardia.soporte@beja.local',
            senderRole: 'support',
            senderAvatar: 'assets/logo.svg',
            recipientId: null,
            priority: 'NORMAL',
            text: 'ℹ️ Recuerda: Este chat conecta directamente con nuestro equipo de asistencia técnica y operadores de despacho. No es una sala pública entre usuarios. Escribe cualquier inquietud y te atenderemos al instante.',
            timestamp: now - 1000 * 60 * 30
          },
          {
            id: 'msg_sup_tech_01',
            channelId: 'soporte_tecnico',
            senderId: 'beja_support_desk',
            senderName: 'SOPORTE TÉCNICO BEJA',
            senderEmail: 'tecnico@beja.local',
            senderRole: 'support',
            senderAvatar: 'assets/logo.svg',
            recipientId: null,
            priority: 'NORMAL',
            text: '🛠️ Si tienes inconvenientes con el centrado del GPS o la carga de rutas peatonales, descríbenos tu caso aquí para enviarte la calibración adecuada.',
            timestamp: now - 1000 * 60 * 45
          },
          {
            id: 'msg_sup_sos_01',
            channelId: 'soporte_emergencias',
            senderId: 'beja_support_desk',
            senderName: 'ASISTENCIA TÁCTICA BEJA',
            senderEmail: 'cuadrante.soporte@beja.local',
            senderRole: 'support',
            senderAvatar: 'assets/logo.svg',
            recipientId: null,
            priority: 'WARNING',
            text: '🚨 ¿Dudas con la confirmación de una alerta comunitaria? Si estás en peligro inminente en la vía pública, usa el botón circular SOS central para activación inmediata.',
            timestamp: now - 1000 * 60 * 20
          }
        ];
        try {
          localStorage.setItem(this.STORAGE_KEY_MESSAGES, JSON.stringify(initialMessages));
        } catch (e) {}
      }
    }

    /**
     * Carga todos los mensajes de soporte almacenados
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
     * Obtiene los mensajes correspondientes al canal de soporte activo
     */
    getMessagesForCurrentContext(currentUserId) {
      const all = this.getAllMessages();
      // En modo soporte exclusivo, se filtran los mensajes del canal activo
      // que correspondan al canal general de soporte o al usuario actual
      const activeChannel = this.activeChannelId || 'soporte_general';
      return all.filter(m => {
        // Mensajes de bienvenida o emitidos por Soporte
        if (m.senderRole === 'support' || m.senderId === 'beja_support_desk') {
          return m.channelId === activeChannel || m.channelId === 'soporte_general' || m.recipientId === currentUserId;
        }
        // Mensajes enviados por el usuario actual
        if (m.senderId === currentUserId) {
          return m.channelId === activeChannel;
        }
        return false;
      });
    }

    /**
     * Envía una consulta o ticket a Soporte Beja
     */
    sendMessage({ text, priority = 'NORMAL', currentUser = null }) {
      if (!text || text.trim() === '') return null;
      const now = Date.now();

      // Resolver usuario remitente
      let sender = currentUser || (window.firebaseAuth ? window.firebaseAuth.currentUser : null);
      if (!sender) {
        sender = {
          uid: 'usr_guest_' + (window.syncBus ? window.syncBus.getSenderId() : 'anon'),
          displayName: 'Ciudadano (Consulta)',
          email: 'usuario.soporte@beja.local',
          role: 'citizen',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=citizen'
        };
      }

      const activeChannel = this.activeChannelId || 'soporte_general';

      const userMsgObj = {
        id: 'ticket_' + now + '_' + Math.random().toString(36).substr(2, 5),
        channelId: activeChannel,
        recipientId: 'beja_support_desk',
        recipientName: 'Mesa de Soporte Beja',
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
      messages.push(userMsgObj);
      this.saveAllMessages(messages);

      // Difundir en vivo a otras pestañas/ventanas y al bus
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: userMsgObj });
        } catch (e) {}
      }

      if (window.syncBus) {
        window.syncBus.emit('NEW_CHAT_MESSAGE', { message: userMsgObj });
      }

      this.notifyListeners(userMsgObj);

      // Disparar respuesta automática inteligente de Soporte Beja
      this.scheduleSupportAutoReply(userMsgObj, sender);

      return userMsgObj;
    }

    /**
     * Simula la atención en tiempo real de un Operador de Soporte Beja
     */
    scheduleSupportAutoReply(userMsg, sender) {
      const ticketHash = Math.floor(1000 + Math.random() * 9000);
      const queryLower = (userMsg.text || '').toLowerCase();
      let responseText = '';

      if (queryLower.includes('mapa') || queryLower.includes('gps') || queryLower.includes('ubicacion') || queryLower.includes('calle')) {
        responseText = `📍 **Soporte Técnico Beja (Ticket #${ticketHash})**: Hemos verificado tu consulta de navegación. El mapa opera con teselas de alta disponibilidad y geolocalización en tiempo real. Si tu ubicación no se centra, toca el botón de mira GPS en el borde derecho del mapa para recalibrar tu sensor.`;
      } else if (queryLower.includes('sos') || queryLower.includes('asalto') || queryLower.includes('robo') || queryLower.includes('emergencia') || queryLower.includes('peligro') || queryLower.includes('ayuda')) {
        responseText = `🚨 **Atención de Guardia Beja (Ticket Prioritario #${ticketHash})**: Si te encuentras frente a una situación de riesgo físico o delito en curso, presiona inmediatamente el botón circular **SOS** en el centro de la aplicación. Tu señal alertará a los vecinos del cuadrante y se enlazará con la Central de Despacho. Línea nacional directa de emergencia: 123.`;
      } else if (queryLower.includes('ruta') || queryLower.includes('camino') || queryLower.includes('pie') || queryLower.includes('caminar')) {
        responseText = `🛡️ **Mesa de Ayuda Beja (Ticket #${ticketHash})**: Para calcular una ruta segura a pie, usa la barra superior de búsqueda o toca 'Ver ruta segura' en la tarjeta del mapa. El motor priorizará vías iluminadas y evitará cuadrantes con incidentes reportados recientemente.`;
      } else if (queryLower.includes('login') || queryLower.includes('cuenta') || queryLower.includes('admin') || queryLower.includes('sesion') || queryLower.includes('google')) {
        responseText = `🔐 **Atención de Cuentas (Ticket #${ticketHash})**: Puedes iniciar sesión rápidamente con tu cuenta de Google mediante el botón superior. Si posees credenciales de autoridad o patrulla, tu perfil se elevará automáticamente al Centro de Mando C2.`;
      } else {
        responseText = `🎧 **Mesa de Soporte Beja (Ticket #${ticketHash})**: Gracias por contactarnos, ${sender.displayName || 'vecino'}. Hemos recibido tu mensaje en la mesa de ayuda. Un operador de guardia está gestionando tu requerimiento. Si necesitas adjuntar una ubicación o detalle adicional, escríbelo aquí mismo.`;
      }

      setTimeout(() => {
        const replyNow = Date.now();
        const replyObj = {
          id: 'rep_' + replyNow + '_' + Math.random().toString(36).substr(2, 5),
          channelId: userMsg.channelId,
          recipientId: userMsg.senderId,
          recipientName: userMsg.senderName,
          senderId: 'beja_support_desk',
          senderName: 'OPERADOR DE SOPORTE BEJA',
          senderEmail: 'soporte@beja.local',
          senderRole: 'support',
          senderAvatar: 'assets/logo.svg',
          priority: userMsg.priority === 'EMERGENCY' ? 'WARNING' : 'NORMAL',
          text: responseText,
          timestamp: replyNow
        };

        const currentMsgs = this.getAllMessages();
        currentMsgs.push(replyObj);
        this.saveAllMessages(currentMsgs);

        if (this.broadcastChannel) {
          try {
            this.broadcastChannel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: replyObj });
          } catch (e) {}
        }

        if (window.syncBus) {
          window.syncBus.emit('NEW_CHAT_MESSAGE', { message: replyObj });
        }

        if (window.Colmena && window.Colmena.sounds) {
          try { window.Colmena.sounds.playChime(); } catch(e) {}
        }

        this.notifyListeners(replyObj);
      }, 1200 + Math.random() * 800);
    }

    /**
     * Selecciona un canal o categoría de soporte
     */
    selectChannel(channelId) {
      this.activeChannelId = channelId || 'soporte_general';
      this.activeDirectContact = null;
      this.notifyListeners({ action: 'CHANNEL_CHANGED', channelId: this.activeChannelId });
    }

    /**
     * Redirige cualquier intento de contacto directo hacia la Mesa de Soporte Oficial
     */
    selectDirectContact(userObj) {
      this.activeDirectContact = {
        uid: 'beja_support_desk',
        displayName: 'Mesa de Soporte Oficial Beja',
        role: 'support'
      };
      this.notifyListeners({ action: 'DIRECT_CONTACT_SELECTED', contact: this.activeDirectContact });
    }

    /**
     * Directorio oficial: ÚNICAMENTE expone el canal de Soporte Oficial Beja.
     * Ningún usuario ordinario puede ver ni contactar privadamente a otros usuarios.
     */
    getContacts(roleFilter = 'ALL') {
      return [
        {
          uid: 'beja_support_desk',
          email: 'soporte@beja.local',
          displayName: 'Mesa Oficial de Soporte Beja 24/7',
          role: 'support',
          trustScore: 100,
          status: 'online',
          photoURL: 'assets/logo.svg'
        }
      ];
    }

    onMessage(callback) {
      this.listeners.push(callback);
    }

    notifyListeners(payload) {
      this.listeners.forEach(cb => {
        try { cb(payload); } catch (err) { console.warn('Support Chat listener err:', err); }
      });
    }
  }

  window.chatService = new ChatService();
})();
