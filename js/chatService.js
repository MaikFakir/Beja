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
      this.STORAGE_KEY_GUEST_ID = 'beja_guest_chat_id';
      this.activeChannelId = 'soporte_general'; // 'soporte_general' | 'soporte_tecnico' | 'soporte_emergencias'
      this.activeDirectContact = null; // Siempre canalizado a Soporte Oficial Beja
      this.listeners = [];
      this.broadcastChannel = null;
      this._cloudSyncStarted = false;

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
     * Todos los mensajes de la conversación de UN ciudadano concreto (los que él escribió + las
     * respuestas de soporte dirigidas a él), sin importar quién los está leyendo. Si se pasa channelId,
     * además filtra por esa categoría (usado por el propio ciudadano para navegar sus 3 pestañas de tema).
     */
    getMessagesForCitizen(citizenUid, channelId = null) {
      if (!citizenUid) return [];
      const all = this.getAllMessages();
      return all
        .filter(m => m.citizenUid === citizenUid && (!channelId || m.channelId === channelId))
        .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Directorio REAL de ciudadanos que han escrito a soporte (uno por citizenUid), para que el panel
     * de CONTROL pueda elegir a una persona específica y responderle. Se enriquece con el directorio de
     * cuentas (firebaseAuth) cuando existe, y con los propios datos del mensaje para invitados sin cuenta.
     */
    getCitizenContacts(roleFilter = 'ALL') {
      const all = this.getAllMessages();
      const lastByUid = new Map();
      all.forEach(m => {
        if (!m.citizenUid) return;
        const prev = lastByUid.get(m.citizenUid);
        if (!prev || m.timestamp > prev.timestamp) lastByUid.set(m.citizenUid, m);
      });

      const ownMessages = all.filter(m => m.senderId === m.citizenUid);
      const directory = (window.firebaseAuth && typeof window.firebaseAuth.getUsersList === 'function')
        ? window.firebaseAuth.getUsersList() : [];

      const contacts = [];
      lastByUid.forEach((lastMsg, uid) => {
        const ownLatest = ownMessages.filter(m => m.citizenUid === uid).sort((a, b) => b.timestamp - a.timestamp)[0];
        const dirUser = directory.find(u => u.uid === uid);
        const role = (dirUser && dirUser.role) || (ownLatest && ownLatest.senderRole) || 'citizen';
        if (roleFilter && roleFilter !== 'ALL' && role !== roleFilter) return;

        contacts.push({
          uid,
          displayName: (dirUser && dirUser.displayName) || (ownLatest && ownLatest.senderName) || 'Ciudadano',
          email: (dirUser && dirUser.email) || (ownLatest && ownLatest.senderEmail) || '',
          photoURL: (dirUser && dirUser.photoURL) || (ownLatest && ownLatest.senderAvatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          role,
          trustScore: (dirUser && typeof dirUser.trustScore === 'number') ? dirUser.trustScore : 100,
          lastMessage: lastMsg.text,
          lastTimestamp: lastMsg.timestamp,
          lastSenderRole: lastMsg.senderRole
        });
      });

      contacts.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      return contacts;
    }

    /**
     * Suscribe el chat a Firestore (colección 'chat_messages') para que un mensaje escrito en UN
     * dispositivo (ciudadano o control) llegue en vivo a cualquier otro, sin depender de que compartan
     * navegador/localStorage. Debe llamarse DESPUÉS de que window.firebaseSync ya exista.
     */
    initCloudSync() {
      if (this._cloudSyncStarted) return;
      if (!(window.firebaseSync && window.firebaseSync.db)) return;
      this._cloudSyncStarted = true;
      try {
        window.firebaseSync.db.collection('chat_messages').orderBy('timestamp', 'asc').limit(500)
          .onSnapshot((snapshot) => {
            const cloudMessages = [];
            snapshot.forEach(doc => {
              const data = doc.data() || {};
              data.id = doc.id;
              cloudMessages.push(data);
            });

            // Combina con lo local en vez de reemplazar todo: preserva mensajes puramente locales
            // (como los de bienvenida, que nunca se suben) mientras la nube manda para todo lo demás.
            const local = this.getAllMessages();
            const cloudIds = new Set(cloudMessages.map(m => m.id));
            const localOnly = local.filter(m => !cloudIds.has(m.id));
            const merged = [...localOnly, ...cloudMessages].sort((a, b) => a.timestamp - b.timestamp);

            this.saveAllMessages(merged);
            this.notifyListeners({ action: 'CLOUD_SYNC' });
          }, (err) => console.warn('Chat cloud sync error:', err));
      } catch (e) {
        console.warn('initCloudSync error:', e);
      }
    }

    /**
     * Genera (y recuerda en este navegador) un id estable para invitados sin cuenta, para que sus
     * mensajes queden agrupados en UNA sola conversación en vez de mezclarse con la de otros invitados.
     */
    getOrCreateGuestId() {
      try {
        let gid = localStorage.getItem(this.STORAGE_KEY_GUEST_ID);
        if (!gid) {
          gid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
          localStorage.setItem(this.STORAGE_KEY_GUEST_ID, gid);
        }
        return gid;
      } catch (e) {
        return 'anon';
      }
    }

    /**
     * Guarda un mensaje (del ciudadano o de soporte) localmente, lo difunde a otras pestañas del mismo
     * navegador, lo sube a Firestore (colección 'chat_messages', 1 documento por mensaje, id compartido
     * con el local) para que llegue a CUALQUIER dispositivo, y notifica a los listeners de la UI.
     */
    _appendMessage(msgObj) {
      const messages = this.getAllMessages();
      messages.push(msgObj);
      this.saveAllMessages(messages);

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: msgObj });
        } catch (e) {}
      }

      if (window.firebaseSync && window.firebaseSync.db) {
        try {
          window.firebaseSync.db.collection('chat_messages').doc(msgObj.id).set(msgObj, { merge: true }).catch(() => {});
        } catch (e) {}
      }

      this.notifyListeners(msgObj);
      return msgObj;
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
          uid: 'usr_guest_' + this.getOrCreateGuestId(),
          displayName: 'Ciudadano (Consulta)',
          email: 'usuario.soporte@beja.local',
          role: 'citizen',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=citizen'
        };
      }

      const activeChannel = this.activeChannelId || 'soporte_general';

      const userMsgObj = {
        id: 'ticket_' + now + '_' + Math.random().toString(36).slice(2, 7),
        // citizenUid identifica la CONVERSACIÓN (siempre el ciudadano dueño del hilo), tanto en mensajes
        // que él mismo escribe como en las respuestas de soporte dirigidas a él.
        citizenUid: sender.uid,
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

      this._appendMessage(userMsgObj);

      // Disparar respuesta automática inmediata de Soporte Beja (mientras un operador humano revisa el ticket)
      this.scheduleSupportAutoReply(userMsgObj, sender);

      return userMsgObj;
    }

    /**
     * Usada por el panel de CONTROL para responder a un ciudadano ESPECÍFICO (no a un canal compartido).
     * El mensaje queda etiquetado con el citizenUid del destinatario, así que solo aparece en SU hilo.
     */
    sendSupportReply({ citizenUid, text, priority = 'NORMAL', currentUser = null }) {
      if (!citizenUid || !text || text.trim() === '') return null;
      const now = Date.now();

      const staffUser = currentUser || (window.firebaseAuth ? window.firebaseAuth.currentUser : null) || {};
      // Responder en el mismo canal/categoría en que el ciudadano escribió por última vez, si se conoce.
      const priorMsgs = this.getMessagesForCitizen(citizenUid);
      const lastCitizenMsg = [...priorMsgs].reverse().find(m => m.senderId === citizenUid);

      const replyObj = {
        id: 'rep_' + now + '_' + Math.random().toString(36).slice(2, 7),
        citizenUid,
        channelId: (lastCitizenMsg && lastCitizenMsg.channelId) || 'soporte_general',
        recipientId: citizenUid,
        recipientName: (lastCitizenMsg && lastCitizenMsg.senderName) || 'Ciudadano',
        senderId: staffUser.uid || 'beja_support_desk',
        senderName: staffUser.displayName || 'Central de Despacho C2',
        senderEmail: staffUser.email || 'soporte@beja.local',
        // Se marca 'support' (no el rol real del staff) para que tanto el ciudadano como el propio panel
        // de control reconozcan este mensaje como una respuesta OFICIAL de soporte al renderizarlo.
        senderRole: 'support',
        senderAvatar: staffUser.photoURL || 'assets/logo.svg',
        priority: (priority || 'NORMAL').toUpperCase(),
        text: text.trim(),
        timestamp: now
      };

      return this._appendMessage(replyObj);
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
          id: 'rep_' + replyNow + '_' + Math.random().toString(36).slice(2, 7),
          citizenUid: userMsg.citizenUid || userMsg.senderId,
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

        this._appendMessage(replyObj);

        if (window.Colmena && window.Colmena.sounds) {
          try { window.Colmena.sounds.playChime(); } catch(e) {}
        }
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
