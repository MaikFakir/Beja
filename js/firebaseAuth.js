/**
 * Colmena Segura - Servicio Universal de Autenticación con Google (Firebase Auth)
 * Permite inicio de sesión con cuentas de Google/Gmail, verificación de identidad
 * y gestión de perfiles de ciudadanos y administradores.
 */

(function() {
  'use strict';

  class FirebaseAuthService {
    constructor() {
      this.auth = null;
      this.currentUser = null;
      this.isConfigured = false;
      this.authStateListeners = [];
      this.STORAGE_KEY_USER = 'colmena_auth_current_user';
      this.STORAGE_KEY_ALL_USERS = 'colmena_registered_users_directory';
      this._usersCloudSyncStarted = false;

      this.init();
    }

    /**
     * Suscribe el directorio de usuarios a Firestore (colección 'users') para que el panel de
     * administración vea en tiempo real a CUALQUIER ciudadano que inicie sesión desde CUALQUIER
     * dispositivo, no solo a los que ya iniciaron sesión en el mismo navegador del admin.
     * Debe llamarse DESPUÉS de que window.firebaseSync ya exista (bundle.js/admin-bundle.js lo crean
     * al arrancar), por eso no se invoca aquí en el constructor sino explícitamente desde afuera.
     */
    initUsersCloudSync() {
      if (this._usersCloudSyncStarted) return;
      if (!(window.firebaseSync && window.firebaseSync.db)) return;
      this._usersCloudSyncStarted = true;
      try {
        window.firebaseSync.db.collection('users').onSnapshot((snapshot) => {
          const cloudUsers = [];
          snapshot.forEach(doc => {
            const data = doc.data() || {};
            data.uid = doc.id;
            cloudUsers.push(data);
          });
          if (cloudUsers.length === 0) return;

          // La nube manda para cualquier usuario que ya tenga documento ahí; conservamos localmente
          // solo las cuentas de demostración que aún no existen en Firestore (para no perder el directorio de ejemplo).
          const localUsers = this.getUsersList();
          const merged = cloudUsers.slice();
          localUsers.forEach(lu => {
            const existsInCloud = cloudUsers.some(cu =>
              cu.uid === lu.uid || (cu.email && lu.email && cu.email.toLowerCase() === lu.email.toLowerCase())
            );
            if (!existsInCloud) merged.push(lu);
          });

          this.saveUsersList(merged);
          try {
            window.dispatchEvent(new CustomEvent('colmena:users-directory-updated', { detail: { users: merged } }));
          } catch (e) {}
        }, (err) => console.warn('Users cloud sync error:', err));
      } catch (e) {
        console.warn('initUsersCloudSync error:', e);
      }
    }

    init() {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY_USER);
        if (saved) {
          this.currentUser = JSON.parse(saved);
        }
      } catch (e) {}

      const config = window.COLMENA_FIREBASE_CONFIG || null;

      if (config && config.apiKey && config.apiKey.trim() !== '' && window.firebase && window.firebase.auth) {
        try {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(config);
          }
          this.auth = window.firebase.auth();
          this.isConfigured = true;

          this.auth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
              this.applyFirebaseUser(firebaseUser);
            }
            // Preserves local session (localStorage) when Firebase cloud user is null
          });
        } catch (err) {
          console.warn('Firebase Auth error:', err);
        }
      }
    }

    /**
     * Bloquea el acceso a cuentas inhabilitadas o suspendidas (con la suspensión aún vigente).
     * El Super Administrador nunca queda bloqueado.
     */
    checkAccountAccess(existing, isSuperAdmin) {
      if (isSuperAdmin || !existing) return { blocked: false };
      if (existing.status === 'disabled') {
        return { blocked: true, reason: 'Tu cuenta fue inhabilitada por un administrador. Contacta a soporte si crees que esto es un error.' };
      }
      if (existing.status === 'suspended' && existing.suspendedUntil && existing.suspendedUntil > Date.now()) {
        const untilStr = existing.suspendedUntil === Infinity ? 'de forma indefinida' : ('hasta ' + new Date(existing.suspendedUntil).toLocaleString());
        return { blocked: true, reason: `Tu cuenta está suspendida ${untilStr}. Motivo: ${existing.suspendReason || 'moderación comunitaria'}.` };
      }
      return { blocked: false };
    }

    /**
     * Construye/actualiza el perfil local a partir de un usuario real autenticado con Firebase
     * (Google Sign-In). Respeta el bloqueo de cuentas inhabilitadas/suspendidas.
     */
    applyFirebaseUser(firebaseUser) {
      const isSuper = firebaseUser.email && firebaseUser.email.toLowerCase() === this.SUPER_ADMIN_EMAIL.toLowerCase();
      const directory = this.getUsersList();
      const existing = directory.find(u => u.uid === firebaseUser.uid || (u.email && firebaseUser.email && u.email.toLowerCase() === firebaseUser.email.toLowerCase()));

      const access = this.checkAccountAccess(existing, isSuper);
      if (access.blocked) {
        try { this.auth && this.auth.signOut(); } catch (e) {}
        alert('🔒 Acceso denegado: ' + access.reason);
        return null;
      }

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
      return userProfile;
    }

    async loginWithGoogle() {
      // Firebase real configurado: inicio de sesión real de Google (ventana emergente oficial)
      if (this.isConfigured && this.auth && window.firebase && window.firebase.auth) {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        const result = await this.auth.signInWithPopup(provider);
        return this.applyFirebaseUser(result.user);
      }
      // Firebase no configurado todavía: modo local/demo con selector de cuentas de prueba
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

          // Account items click
          const items = modal.querySelectorAll('.google-account-item');
          items.forEach(item => {
            item.onclick = () => {
              const email = item.dataset.email;
              const user = this.loginWithEmail(email);
              cleanup();
              resolve(user);
            };
          });

          // Custom account drawer
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

          // Close button
          const btnClose = modal.querySelector('#btn-close-google-chooser');
          if (btnClose) {
            btnClose.onclick = (e) => {
              e.preventDefault();
              cleanup();
              resolve(null);
            };
          }

          // Backdrop click
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

    promptLocalDemoLogin() {
      return this.openGoogleChooser();
    }

    SUPER_ADMIN_EMAIL = 'gabyolarte2017@gmail.com';

    loginWithEmail(email) {
      if (!email || !email.includes('@')) return null;
      const cleanEmail = email.trim().toLowerCase();
      const isSuperAdmin = cleanEmail === this.SUPER_ADMIN_EMAIL;

      // Check existing user record in directory
      const directory = this.getUsersList();
      const existing = directory.find(u => u.email && u.email.toLowerCase() === cleanEmail);

      // El acceso rápido por correo (sin verificación real) NUNCA otorga rol de admin/patrullero por sí solo,
      // ni aunque coincida con el correo del Super Admin: esos roles solo se reconocen vía Google Sign-In real
      // (applyFirebaseUser) o cuando un admin ya se los asignó desde el panel (y quedaron guardados en el directorio).
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

      // Check if user suspension expired
      if (userObj.status === 'suspended' && userObj.suspendedUntil && userObj.suspendedUntil <= Date.now()) {
        userObj.status = 'active';
        userObj.suspendedUntil = null;
        userObj.suspendReason = null;
      }

      // Cuentas inhabilitadas o con una suspensión aún vigente no pueden iniciar sesión
      const access = this.checkAccountAccess(userObj, isSuperAdmin);
      if (access.blocked) {
        alert('🔒 Acceso denegado: ' + access.reason);
        return null;
      }

      this.setCurrentUser(userObj);
      return userObj;
    }

    openLoginModal() {
      const modal = document.getElementById('marketing-login-modal');
      if (modal) {
        modal.classList.remove('hidden');
      }
    }

    async logout() {
      if (this.isConfigured && this.auth) {
        try { await this.auth.signOut(); } catch (e) {}
      }
      this.setCurrentUser(null);
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

      if (window.syncBus) {
        window.syncBus.emit('AUTH_STATE_CHANGED', { user: this.currentUser });
      }
    }

    saveToUsersDirectory(user) {
      let users = this.getUsersList();
      const idx = users.findIndex(u => (u.email && u.email.toLowerCase() === user.email.toLowerCase()) || u.uid === user.uid);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...user, lastLoginAt: Date.now() };
      } else {
        users.push({ ...user, createdAt: Date.now(), lastLoginAt: Date.now() });
      }
      this.saveUsersList(users);

      if (window.firebaseSync && window.firebaseSync.db) {
        window.firebaseSync.db.collection('users').doc(user.uid).set(user, { merge: true }).catch(() => {});
      }
    }

    saveUsersList(users) {
      try {
        localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(users));
      } catch (e) {}
      if (window.syncBus) {
        window.syncBus.emit('USER_DIRECTORY_UPDATED', { users });
      }
    }

    getUsersList() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_ALL_USERS);
        if (raw) {
          const list = JSON.parse(raw);
          // Ensure Super Admin Gabyolarte2017@gmail.com is always present and retains admin role
          const superAdminIdx = list.findIndex(u => u.email && u.email.toLowerCase() === this.SUPER_ADMIN_EMAIL);
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
          suspendedUntil: null,
          createdAt: Date.now() - 86400000 * 30
        },
        {
          uid: 'user_patrol_01',
          email: 'patrulla.cuadrante04@policia.gov.co',
          displayName: 'PATRULLA CUADRANTE 04 (AGENTE MORALES)',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=patrol',
          role: 'patrol',
          trustScore: 100,
          verifiedReports: 42,
          validationsGiven: 84,
          status: 'active',
          suspendedUntil: null,
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
          suspendedUntil: null,
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
          suspendedUntil: null,
          createdAt: Date.now() - 86400000 * 5
        }
      ];
      try {
        localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(initialDirectory));
      } catch (e) {}
      return initialDirectory;
    }

    updateUserRole(uid, newRole) {
      const users = this.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (!user) return false;
      if (user.email && user.email.toLowerCase() === this.SUPER_ADMIN_EMAIL && newRole !== 'admin') {
        return false; // Cannot demote superadmin
      }
      user.role = newRole;
      this.saveUsersList(users);
      if (this.currentUser && this.currentUser.uid === uid) {
        this.currentUser.role = newRole;
        localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      }
      return true;
    }

    suspendUser(uid, durationMs, reason = 'Suspensión temporal por moderación') {
      const users = this.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (!user) return false;
      if (user.email && user.email.toLowerCase() === this.SUPER_ADMIN_EMAIL) {
        return false; // Cannot suspend superadmin
      }
      user.status = 'suspended';
      user.suspendedUntil = durationMs === Infinity ? Infinity : (Date.now() + durationMs);
      user.suspendReason = reason;
      this.saveUsersList(users);
      if (this.currentUser && this.currentUser.uid === uid) {
        this.currentUser.status = 'suspended';
        this.currentUser.suspendedUntil = user.suspendedUntil;
        localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      }
      return true;
    }

    reactivateUser(uid) {
      const users = this.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (!user) return false;
      user.status = 'active';
      user.suspendedUntil = null;
      user.suspendReason = null;
      this.saveUsersList(users);
      if (this.currentUser && this.currentUser.uid === uid) {
        this.currentUser.status = 'active';
        this.currentUser.suspendedUntil = null;
        localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      }
      return true;
    }

    disableUser(uid) {
      const users = this.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (!user) return false;
      if (user.email && user.email.toLowerCase() === this.SUPER_ADMIN_EMAIL) {
        return false;
      }
      user.status = 'disabled';
      this.saveUsersList(users);
      if (this.currentUser && this.currentUser.uid === uid) {
        this.currentUser.status = 'disabled';
        localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      }
      return true;
    }

    adjustUserReputation(uid, delta) {
      const users = this.getUsersList();
      const user = users.find(u => u.uid === uid);
      if (!user) return false;
      user.trustScore = Math.max(0, Math.min(100, (typeof user.trustScore === 'number' ? user.trustScore : 75) + delta));
      this.saveUsersList(users);
      if (this.currentUser && this.currentUser.uid === uid) {
        this.currentUser.trustScore = user.trustScore;
        localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      }
      return true;
    }

    onAuthStateChanged(callback) {
      this.authStateListeners.push(callback);
      callback(this.currentUser);
    }
  }

  window.firebaseAuth = new FirebaseAuthService();
})();
