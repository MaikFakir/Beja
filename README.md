# 🐝 Colmena Segura 🚨
> **Red Ciudadana de Seguridad en Enjambre, Mapa de Riesgo y Rutas Seguras**

Colmena Segura es una plataforma web progresiva (PWA) de seguridad colaborativa inspirada en la inteligencia de enjambre. Permite a comunidades y ciudadanos reportar incidentes en tiempo real, validar alertas mediante consenso geolocalizado, consultar mapas de calor de riesgo y navegar mediante rutas seguras estilo Waze.

---

## 🌟 Características Principales

- **🗺️ Mapa de Calor y Radar en Tiempo Real**:
  - Visualización interactiva con Leaflet y Leaflet.heat.
  - Geolocalización en vivo del usuario con precisión GPS.
  - Indicadores visuales de alertas activas, tipo de incidente y nivel de gravedad.

- **🚨 Reporte Rápido y Botón SOS**:
  - Envío de incidentes clasificados (robo, agresión, sospechoso, accidente, etc.).
  - Botón de pánico SOS instantáneo.
  - Efectos sonoros y retroalimentación háptica.

- **🐝 Inteligencia de Enjambre (Swarm Consensus)**:
  - Algoritmo de validación de incidentes por cercanía y votos comunitarios.
  - Sistema de reputación de ciudadanos para prevenir reportes falsos.

- **🛡️ Rutas Seguras & Prevención**:
  - Cálculo de trayectos evitando zonas de alto calor delictivo o incidentes recientes.

- **📊 Centro de Despacho y Monitoreo Administrativo (`admin.html`)**:
  - Panel de control para autoridades, líderes comunitarios o personal de seguridad.
  - Estadísticas en tiempo real, filtros por cuadrante y resolución de alertas.

- **🔐 Autenticación y Sincronización en la Nube con Google Firebase**:
  - Inicio de sesión con Google (`login.html`).
  - Sincronización multi-dispositivo en tiempo real (Cloud Firestore / Realtime Database).
  - Modo Offline/Local disponible automáticamente en caso de no contar con conexión a Firebase.

---

## 📁 Estructura del Proyecto

```text
colmena-segura/
├── index.html            # Aplicación principal del ciudadano (Mapa, SOS, Rutas, Perfil)
├── admin.html            # Panel de monitoreo y despacho para administradores
├── login.html            # Portal de inicio de sesión con Google
├── manifest.json         # Configuración de Progressive Web App (PWA)
├── css/
│   ├── styles.css        # Estilos principales de la interfaz ciudadana
│   ├── admin.css         # Estilos del panel de control
│   ├── login.css         # Estilos de la pantalla de autenticación
│   └── design-tokens.css # Variables CSS de color, espaciado y tipografía
└── js/
    ├── app.js            # Controlador principal de la UI ciudadana
    ├── riskMap.js        # Lógica del mapa interactivo y capas de calor
    ├── swarmEngine.js    # Motor de consenso y lógica de enjambre
    ├── admin.js          # Lógica del panel de administración
    ├── firebaseAuth.js   # Manejador de autenticación con Firebase
    ├── firebaseSync.js   # Sincronización de alertas en la nube
    ├── firebase-config.js# Credenciales y configuración de Firebase
    ├── simulator.js      # Generador y simulador de incidentes de prueba
    ├── soundEffects.js   # Efectos de audio y alarmas
    └── syncBus.js        # Bus de eventos de sincronización local
```

---

## 🚀 Inicio Rápido

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU-USUARIO/colmena-segura.git
   cd colmena-segura
   ```

2. **Ejecutar localmente:**
   Puedes abrir `index.html` directamente en tu navegador o usar cualquier servidor estático local, por ejemplo con Node.js / Python:
   ```bash
   # Opción con npx (Live Server / serve)
   npx serve .

   # O con Python 3
   python -m http.server 8080
   ```

3. **Abrir en el navegador:**
   - App Ciudadana: `http://localhost:8080/index.html`
   - Centro de Control: `http://localhost:8080/admin.html`
   - Iniciar Sesión: `http://localhost:8080/login.html`

---

## ⚙️ Configuración de Firebase (Opcional)

Si deseas utilizar tu propio proyecto de Firebase:
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Authentication** (Google Sign-In) y **Firestore Database**.
3. Copia tus credenciales en `js/firebase-config.js`.

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta `LICENSE` para más información.
