# Informe de Auditoría — Beja / Colmena Segura

**Fecha:** 2026-09-17
**Alcance:** Validación funcional completa de la app ciudadana (`index.html`), el panel de control (`admin.html`), el motor de reputación/consenso, el mapa/rutas, y el despliegue en GitHub Pages + Firebase.

---

## 1. Resumen ejecutivo

La app **no funcionaba prácticamente nada**, y no por un solo detalle: había **dos fallos independientes que impedían que el JavaScript arrancara por completo**, tanto en la app ciudadana como en el panel de administración. Encima de eso, varias funciones (inyector masivo, avisos por zona, reputación) tenían botones conectados a IDs que no existían, o lógica que nunca se llamaba.

Ya corregí lo que se puede corregir en código. Lo que **no** se puede arreglar solo con código (Firebase real, autenticación real de Google) queda documentado abajo como pendiente, porque requiere que tú crees un proyecto de Firebase y pegues las credenciales.

### Causa raíz #1 (la más grave): `js/bundle.js` no cargaba — la app ciudadana estaba 100% muerta

En `js/firebaseAuth.js` y en su copia duplicada dentro de `js/bundle.js`, había esta línea metida dentro de una clase:

```js
SUPER_ADMIN_EMAIL: 'gabyolarte2017@gmail.com',
```

Eso es sintaxis de objeto (`clave: valor,`), **no es válida dentro del cuerpo de una clase de JavaScript** (debía ser `SUPER_ADMIN_EMAIL = '...';`). Un navegador no puede compilar eso: lanza un `SyntaxError` y **todo el archivo `<script>` queda sin ejecutar**, de punta a punta. Confirmé que este bug está en el sitio publicado en GitHub Pages (`https://maikfakir.github.io/Beja/`), no solo en local.

Como `js/bundle.js` es el único script que trae TODA la lógica de la app ciudadana (mapa, botón de pánico, búsqueda, chat, perfil/reputación), el resultado real era: **la interfaz se veía, pero ningún botón hacía nada**. Ningún clic, ningún login, nada.

### Causa raíz #2 (igual de grave, pero distinta): `js/admin-bundle.js` se rompía apenas arrancaba — el panel de control estaba 100% muerto

Independiente del bug anterior, encontré que la clase `SwarmEngine` dentro de `js/admin-bundle.js` **llama a 5 métodos que nunca se definieron en esa clase**: `loadHistory()`, `saveHistory()`, `saveIncidents()`, `calculateDistanceMeters()` y `reportIncident()`. El constructor de esa clase llama a `this.loadHistory()` apenas se crea (`const swarmEngine = new SwarmEngine();`), así que el navegador lanzaba un error ahí mismo y **nunca llegaba a ejecutar el resto del archivo**: ni el mapa, ni el `DispatcherApp`, ni ningún botón del panel.

Es decir: aunque hubieras arreglado el bug #1, el panel de administración habría seguido completamente muerto por esta segunda razón, totalmente separada.

**Ambas causas ya están corregidas.** Con eso solucionado, el resto de los hallazgos (abajo) son bugs más chicos y localizados que también corregí.

---

## 2. Validación del panel de la app (lado ciudadano)

Pediste que el panel ciudadano tenga **solo**: mapa con zonas de calor/puntos activos, panel de alertas, botón de alerta rápida, barra de búsqueda de direcciones, soporte, y ajustes de cuenta (cerrar sesión + reputación) — nada más.

| Elemento pedido | Estado encontrado | Acción |
|---|---|---|
| Mapa + capa de calor/puntos activos | Presente (Leaflet + Leaflet.heat), pero no ejecutaba nada por la Causa raíz #1 | ✅ Arreglado (ahora corre) |
| Panel de alertas (todas las alertas) | Presente, dentro de la pestaña "Perfil/Colmena" | ✅ Ya no dependía de nada roto adicional |
| Botón de alerta rápida (SOS) | Presente (botón central + accesos rápidos) | ✅ Ya no dependía de nada roto adicional |
| Barra de búsqueda de dirección | Presente, usa Nominatim (gratis) | ✅ Ya no dependía de nada roto adicional |
| Soporte (chat) | Presente, exclusivo a Mesa de Soporte Beja | ✅ Ya no dependía de nada roto adicional, ver limitación en sección 6 |
| Ajustes de cuenta (logout + reputación) | Presente | ✅ Arreglado + mejorado (ver sección 4) |
| **Algo que NO debería estar ahí** | La pestaña de perfil tenía una caja **"🧪 Inyector de Pruebas de Enjambre & Reputación"** visible para *cualquier ciudadano*, con botones para crear incidentes falsos con "usuarios bot" y para **borrar todos los incidentes y reputación de todo el mundo** | ✅ **Eliminada** del lado ciudadano (`index.html` y `js/bundle.js`). Esa herramienta de pruebas ya existe correctamente del lado del panel de administración ("Inyector Masivo" + botones de simulación), que es donde pediste que estuviera. |

---

## 3. Validación del panel de control (admin.html)

Pediste: cola de incidentes, avisos por zona seleccionada, ver/habilitar/deshabilitar usuarios + dar admin + subir/bajar reputación, ver el chat de soporte, e inyección de alertas tipo "pincel" para mapear zonas.

| Elemento pedido | Estado encontrado | Acción |
|---|---|---|
| Cola de incidentes en tiempo real | El HTML/CSS existía, pero por la Causa raíz #2 el panel nunca arrancaba | ✅ Arreglado |
| Avisos por zona ("Nuevo Aviso") | El modal tiene selector de **radio de notificación** (50m/100m/300m/1km/5km) y estado, pero el código **nunca leía esos campos** — solo mandaba título y mensaje. Resultado: *todos* los ciudadanos recibían el aviso completo sin importar dónde estuvieran, sin importar el radio elegido. | ✅ Arreglado: ahora se captura el radio, el estado (activo/inactivo) y el centro geográfico (el punto que el despachador está viendo en el mapa), y el filtro de distancia del lado ciudadano ya tiene con qué comparar. |
| Ver usuarios / habilitar / deshabilitar / dar admin / subir-bajar reputación | El HTML y los botones existían y llaman a `firebaseAuth.updateUserRole()`, `.adjustUserReputation()`, `.suspendUser()`, `.disableUser()`, `.reactivateUser()` — pero la copia de `FirebaseAuthService` que vive dentro de `admin-bundle.js` **no define ninguno de esos métodos**. Antes del bug #1, esto no se notaba porque *nada* del panel arrancaba; una vez arreglado el bug #1, `admin-bundle.js` reutiliza automáticamente la instancia completa de `window.firebaseAuth` (definida en `js/firebaseAuth.js`, que sí trae esos métodos), gracias al orden de carga de los `<script>` en `admin.html`. | ✅ Funciona ahora, sin tocar nada más — quedó resuelto como efecto de arreglar la Causa raíz #1. |
| Ver el chat de quienes contactan a soporte | El chat existe y el admin puede ver y responder mensajes, **pero solo si el ciudadano escribió desde el mismo navegador/perfil que el admin** (ver sección 6: no hay backend real). | ⚠️ Funciona localmente; necesita Firebase real para funcionar entre dispositivos distintos (ver pendientes). |
| Inyector de alertas tipo "pincel", para mapear zonas y hacer pruebas | El botón visible **"⚡ Inyector Masivo"** tiene `id="btn-open-bulk-modal"` en el HTML, pero el JS escuchaba clics en `btn-bulk-incident-generator` (un id que no existe en ninguna parte) — **el botón no hacía absolutamente nada**. Además, aun abriendo el modal por otra vía, leía los ids `bulk-count`/`bulk-category`/`bulk-radius`, que tampoco existen (los reales son `bulk-count-select`/`bulk-category-select`/`bulk-radius-select`), así que siempre ignoraba lo que el admin elegía y usaba valores fijos. | ✅ Arreglado: los ids ahora coinciden, y también conecté el selector "Nivel de Consenso Inicial" (que tampoco se usaba) para que el admin pueda forzar que el incidente nazca en rojo. **Además**, agregué la herramienta de pincel que pediste explícitamente: un botón **"🖌️ Modo Pincel"** en la barra flotante del mapa de admin — al activarlo, el mapa deja de arrastrarse y cada clic (o arrastre) sobre el mapa va "pintando" alertas de prueba en esas coordenadas, ideal para mapear/calibrar zonas rápido. |

---

## 4. Lógica de reputación y consenso de enjambre

Tu explicación fue clara: usuario nuevo = poca reputación = sus alertas no pesan mucho; reputación alta = puede activar una alerta de inmediato solo; reputación media = necesita que varios usuarios medios coincidan en la misma zona; reputación baja = aunque reporte varias veces, no se le hace mucho caso.

**Lo que encontré:** el motor de consenso (`SwarmEngine.reportIncident` / `voteIncidentVerdict`) escalaba una alerta a "Enjambre Crítico" únicamente con la regla *"2 usuarios distintos reportaron en el mismo radio de 50m"* — **sin mirar la reputación de nadie, nunca**. Un usuario con reputación 100 reportando solo no activaba nada; dos cuentas nuevas con reputación mínima activaban la alerta igual que dos vecinos de alta reputación. Esto contradice exactamente la lógica que pediste.

También encontré que existían **dos números de reputación desconectados entre sí**: uno interno de la sesión del navegador (`trustEngine`, usado para el medidor "Tu Reputación" del perfil) y otro en la ficha de la cuenta (`firebaseAuth.currentUser.trustScore`, que es el que ve y ajusta el admin en "Moderar Cuenta"). Ganabas puntos reportando/validando, pero eso **nunca se reflejaba en la ficha que ve el admin**, y viceversa: si el admin te subía/bajaba puntos, tu propio medidor de perfil no cambiaba.

**Correcciones aplicadas (en `js/bundle.js` y `js/admin-bundle.js`):**

1. **Peso por reputación real.** Cada reporte/testimonio ahora pesa según la reputación de quien lo hace:
   - Reputación **≥ 85** → peso `1.0` → **una sola alerta activa el Enjambre Crítico de inmediato**.
   - Reputación **45–84** (media) → peso `0.5` → se necesitan **2 ciudadanos medios** coincidiendo en la misma zona para que la alerta se active.
   - Reputación **< 45** (baja, típico de cuenta nueva) → peso `0.15` → aunque la misma persona reporte varias veces, casi no suma (se necesitarían ~7 reportes de baja reputación para llegar al umbral solos), y un mismo usuario repitiendo reporte en la misma zona **ya no se cuenta dos veces**.
   - Umbral de activación: suma de pesos ≥ `1.0` (configurable en `SwarmEngine.CONSENSUS_ESCALATION_THRESHOLD`).
2. **Usuario nuevo = reputación inicial baja, no 100.** Antes, cualquier cuenta nueva (por Google o por correo) arrancaba con 100/100 — literalmente lo opuesto a "usuario nuevo tiene poca reputación". Ahora arranca en **40/100** (categoría "baja"), y debe ganarse la confianza reportando/validando correctamente. Las cuentas ya existentes conservan su puntaje.
3. **Un solo número de reputación.** Cuando ganas puntos en la app (alerta validada, testimonio, etc.), eso ahora también se aplica a la ficha de tu cuenta (`firebaseAuth.adjustUserReputation`), la misma que ve y puede ajustar el admin. El medidor de "Tu Reputación" en el perfil ahora muestra ese mismo número de cuenta, no un contador local aparte.
4. Corregí también un bug menor donde un usuario con reputación exactamente en `0` se mostraba/calculaba como si tuviera 75 (por usar `trustScore || 75`, y `0` es "falsy" en JavaScript).

**Nota:** esto usa el número de reputación *de la cuenta que inició sesión*. Los botones de simulación del admin (bots de prueba) no tienen una cuenta real, así que por defecto se les asigna reputación "media" (igual que antes de este cambio), para no romper las demostraciones existentes.

---

## 5. Notificaciones y avisos que "no se quedaban cerrados"

Tu reporte: cerrabas una alerta/aviso y, al volver a abrir la app, reaparecía.

**Lo que encontré:** el banner de "estás cerca de una alerta" (el que aparece arriba del mapa con la ✕ para cerrarlo) guardaba qué avisos habías cerrado en `sessionStorage`, que **se borra solo con cerrar la pestaña/navegador**. Es decir: cerrabas el aviso, cerrabas la app, la volvías a abrir, y como `sessionStorage` empezó de cero, el aviso volvía a aparecer aunque la alerta siguiera siendo exactamente la misma.

Además, aunque no se cerrara el navegador: una vez cerrabas el aviso de una alerta, quedaba oculto **para siempre** en esa sesión — incluso si esa misma alerta se enfriaba y **luego un vecino distinto la volvía a reportar** (una reactivación genuina), el aviso no volvía a aparecer, cuando sí debería.

**Corrección aplicada (`js/bundle.js`):**
- El cierre del aviso ahora se guarda en `localStorage` (persiste entre sesiones/reaperturas de la app) junto con la fecha/hora en que lo cerraste.
- Al decidir si mostrar el aviso, ahora se compara esa fecha de cierre contra la fecha del evento más reciente de la alerta (reactivación o escalamiento). **Si la alerta tiene algo nuevo después de que la cerraste, vuelve a avisar; si no, se mantiene cerrada.** Esto es exactamente lo que pediste: "que no aparezca... hasta que alguien más la vuelva a reportar".

Sobre la vida de una alerta en general (tu segunda pregunta: que no esté siempre activa hasta que alguien la reporte de nuevo): **esa lógica ya existía y es correcta** — una alerta roja ("Enjambre Crítico") se degrada sola a amarilla ("Sondeo/preventiva") después de 8 minutos si nadie más la confirma, y de amarilla se archiva al mapa de calor histórico tras 20 minutos más. Solo que, por la Causa raíz #2, esto **nunca corría en el panel de administración** (el temporizador vivía en una clase que ni siquiera lograba construirse). Ya corre en ambos lados.

---

## 6. Autenticación con Google — implementada, y ahora sí bloquea cuentas inhabilitadas/suspendidas

El README y la pantalla de login prometen "Inicia sesión con tu cuenta de Google", pero no había ninguna llamada real a `signInWithPopup`/`GoogleAuthProvider` de Firebase — solo un modal hecho a mano con 3 cuentas de ejemplo o cualquier correo escrito a mano, sin verificación.

**Ya lo implementé** (`js/firebaseAuth.js`): `loginWithGoogle()` ahora, si detecta que pegaste credenciales reales de Firebase, abre la ventana emergente **oficial** de Google (`signInWithPopup` + `GoogleAuthProvider`) y valida la identidad de verdad. Mientras no pegues las credenciales, sigue funcionando igual que antes (modal de demo con cuentas de prueba), para que nada se rompa hoy. En el momento en que agregues tus credenciales de Firebase (sección 7), el botón "Continuar con Google" pasa a ser un login real sin que tengas que tocar nada más.

También corregí algo que encontré de paso: **suspender o inhabilitar una cuenta desde el panel de admin no impedía que esa persona siguiera usando la app** — solo cambiaba una etiqueta visual en el directorio. Ahora, tanto el login por correo como el login real de Google **bloquean el acceso** si la cuenta está inhabilitada, o suspendida y la suspensión sigue vigente, mostrando el motivo. El Super Administrador nunca se bloquea a sí mismo.

Una aclaración honesta que sigue vigente: cualquiera que escriba `gabyolarte2017@gmail.com` en el login por correo (el modo "acceso rápido", no el de Google) sigue entrando como Super Admin sin contraseña — eso es así por diseño del modo demo. Una vez actives Google Sign-In real, lo más seguro es dejar de anunciar/usar el acceso rápido por correo para roles de autoridad, o restringirlo solo a `localhost` durante pruebas.

---

## 7. Firebase — lo que necesito de ti para dejarlo al 100%

- **GitHub Pages sí está funcionando.** Verifiqué que `https://maikfakir.github.io/Beja/` sirve el contenido más reciente de la rama `main`. El `DEPLOY.md` dice que hay un flujo `.github/workflows/deploy-pages.yml`, pero **ese archivo no existe** en el repositorio — Pages debe estar configurado como "Deploy from a branch" (rama `main`, carpeta raíz) desde Settings → Pages, no por Actions. No es un error, solo la documentación no coincide con la configuración real.
- **Firebase NO está configurado.** `js/firebase-config.js` tiene todas las credenciales vacías, a pesar de que `DEPLOY.md` dice que el proyecto `beja-ac23a` ya está listo. Esto es lo único que de verdad no puedo hacer yo por ti: **crear el proyecto requiere entrar con tu cuenta de Google al navegador**, algo a lo que no tengo acceso desde aquí. Necesito que hagas esto (10 minutos, gratis, sin tarjeta):

  1. Entra a [Firebase Console](https://console.firebase.google.com/) con tu cuenta de Google.
  2. Si el proyecto `beja-ac23a` que menciona `DEPLOY.md` ya existe en tu lista de proyectos, ábrelo. Si no existe, crea uno nuevo (cualquier nombre).
  3. En el menú lateral: **Build → Authentication → Sign-in method** → activa el proveedor **Google**.
  4. En el menú lateral: **Build → Firestore Database** → "Crear base de datos" → modo producción (le pondremos las reglas de abajo).
  5. En **Project settings** (el ícono de engranaje) → pestaña **General** → baja hasta "Tus apps" → clic en el ícono `</>` (Web) → regístrala con cualquier nombre → Firebase te va a mostrar un bloque `const firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
  6. **Copia esos 7 valores y pégamelos aquí en el chat** (o pégalos tú mismo directamente en `js/firebase-config.js`, reemplazando las comillas vacías) — son datos públicos de configuración, no son secretos, así que no hay problema en compartirlos.
  7. En **Authentication → Settings → Authorized domains**, agrega `maikfakir.github.io` (y déjalo con `localhost`, que ya suele venir agregado).
  8. En **Firestore Database → Reglas**, pega esto (ya asume que activaste Google Sign-In real en el paso 3):

     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /users/{uid} {
           allow read: if true;
           allow write: if request.auth != null && request.auth.uid == uid;
         }
         match /incidents/{incidentId} {
           allow read: if true;
           allow write: if request.auth != null;
         }
         match /broadcasts/{broadcastId} {
           allow read: if true;
           allow write: if request.auth != null;
         }
       }
     }
     ```
     Esto permite que cualquier persona autenticada con Google reporte/valide incidentes y que cada uno solo pueda escribir su propio perfil de usuario. Restringir "solo el admin puede enviar avisos de zona" de forma 100% segura requeriría además "custom claims" vía una Cloud Function — es un paso opcional más avanzado que puedo ayudarte a montar después si lo quieres, no es necesario para que todo funcione hoy.

  Con esos 7 valores pegados en `js/firebase-config.js`, sin tocar nada más: la app deja el "Modo Local" automáticamente, el login de Google pasa a ser real, y **incidentes, avisos de zona y chat empiezan a sincronizarse entre todos los celulares y el panel de admin**. Dime cuando tengas esos valores (o pégalos aquí) y hago el cambio y el push yo mismo.

  Mientras tanto, hoy sin Firebase configurado: un incidente reportado en un celular no lo ve nadie más, los avisos de zona no llegan a otros dispositivos, y el chat de soporte solo funciona si ciudadano y admin están en el mismo navegador.

---

## 8. Mapa y rutas — confirmado: no requieren ninguna API de pago

Como pediste validarlo explícitamente: revisé el mapa y el ruteo a fondo, tanto en la app ciudadana como en el panel de admin.

- **Mosaicos del mapa:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` — OpenStreetMap gratuito, sin API key.
- **Cálculo de rutas (a pie / en auto):** servidores públicos gratuitos de OSRM (`routing.openstreetmap.de`, con respaldo en `router.project-osrm.org`) — sin API key.
- **Búsqueda de direcciones / geocodificación inversa:** Nominatim (`nominatim.openstreetmap.org`) — sin API key.
- **Ubicación por IP (respaldo si el GPS falla):** `ipapi.co`, `ip-api.com`, `ipwhois.app` — todos gratuitos, sin API key.

Todo funciona sin tarjeta ni cuenta de pago. La única salvedad honesta: son servicios públicos compartidos y gratuitos, sin garantía de servicio (SLA) — si el uso crece mucho, podrían limitar peticiones por volumen, pero para el tamaño de este proyecto no debería ser un problema, y no requiere ningún cambio de código.

---

## 9. Resumen de archivos modificados

| Archivo | Qué se corrigió |
|---|---|
| `js/firebaseAuth.js` | Sintaxis inválida de clase (bug raíz #1); reputación inicial de cuenta nueva 100→40; bug donde una reputación de exactamente 0 se trataba como "ausente" y se subía a 75 al ajustarla; **login real de Google** (`signInWithPopup`) cuando Firebase esté configurado; bloqueo de acceso a cuentas inhabilitadas/suspendidas vigentes. |
| `js/bundle.js` | Misma sintaxis inválida (bug raíz #1, copia duplicada); consenso de enjambre ponderado por reputación; reputación inicial 100→40 (dos lugares); unificación del número de reputación mostrado con el de la cuenta; persistencia correcta del cierre de avisos de proximidad (localStorage + consciente de reactivación); eliminado el inyector de pruebas visible para ciudadanos. |
| `js/admin-bundle.js` | Métodos faltantes en `SwarmEngine` que rompían el arranque completo del panel (bug raíz #2); consenso de enjambre ponderado por reputación (misma lógica que el lado ciudadano); ids del "Inyector Masivo" corregidos + conexión del selector de nivel de consenso; captura de radio/centro/estado en "Nuevo Aviso"; bug de `active` siempre forzado a `true` al enviar un aviso; mismo bug de reputación 0→75 al mostrarla en el directorio; nueva herramienta "🖌️ Modo Pincel" para pintar alertas de prueba directamente sobre el mapa. |
| `index.html` | Eliminada la caja de pruebas "Inyector de Enjambre & Reputación" del panel ciudadano. |
| `admin.html` | Agregado el botón "🖌️ Modo Pincel" junto al inyector existente. |
| `css/admin.css` | Estilo `.active` para el botón de pincel. |
| `login.html` | Ya no redirige a `index.html` como si el login hubiera funcionado cuando en realidad fue bloqueado (cuenta inhabilitada/suspendida). |

No se tocó `js/app.js`, `js/riskMap.js`, `js/swarmEngine.js`, `js/admin.js`, `js/simulator.js`, `js/soundEffects.js`, `js/syncBus.js`, `js/firebaseSync.js` — ver la nota siguiente sobre por qué.

---

## 10. Algo que vale la pena que sepas (no es un bug, es un riesgo a futuro)

El proyecto tiene dos juegos de archivos:

- Los "reales"/legibles por módulo: `js/app.js`, `js/riskMap.js`, `js/swarmEngine.js`, `js/admin.js`, `js/simulator.js`, `js/soundEffects.js`, `js/syncBus.js`, `js/firebaseSync.js`.
- Los que **realmente se cargan** en `index.html` y `admin.html`: `js/bundle.js` y `js/admin-bundle.js`.

Ninguna de las dos páginas HTML carga los archivos modulares — cargan solo los "bundle". Pero los archivos modulares **no están vacíos ni son un build automático**: `js/admin.js` no se ha tocado desde el primer commit del proyecto, mientras que `js/admin-bundle.js` sí tiene todos los cambios recientes. Esto sugiere que en algún momento alguien editó `admin.js` esperando ver el cambio reflejado en el sitio, y no pasó nada — porque el sitio no lee ese archivo. Es muy probable que parte de la sensación de "esto no funciona" que tenías viniera de ahí: cambios que sí se guardaban, pero en el archivo equivocado.

No borré esos archivos porque no me pediste limpieza de repositorio y podrían tener valor histórico, pero te recomiendo (a futuro, cuando tengas tiempo) decidir entre: (a) borrarlos para evitar confusión, o (b) migrar a un proceso de build real que genere los bundles a partir de los módulos, para que editar sea seguro en un solo lugar. Además, dentro de `js/firebaseSync.js` (uno de los archivos huérfanos) hay un bug propio: usa `import`/`export` de módulos ES pero se referencia con una etiqueta `<script>` normal en ningún HTML — está descartado, no afecta nada hoy, pero si algún día alguien decide "activarlo" tal cual, tampoco funcionaría.

---

## 11. Qué falta por hacer (lo único que de verdad depende de ti)

1. **Los 8 pasos de Firebase de la sección 7.** Es lo único que realmente me falta para dejar el proyecto al 100%: yo no puedo crear el proyecto de Firebase porque requiere entrar con tu cuenta de Google en un navegador. En cuanto me pases (o pegues tú mismo) los 7 valores de configuración, activo la sincronización real entre dispositivos y el login real de Google con un solo push más.
2. **Corregir o completar `DEPLOY.md`**: no existe el workflow de GitHub Actions que menciona. No lo edité porque no me pediste tocar documentación, pero te lo señalo para que no cause confusión más adelante.
3. **Decisión opcional sobre los archivos "muertos"** (`app.js`, `riskMap.js`, `swarmEngine.js`, `admin.js`, `simulator.js`, `soundEffects.js`, `syncBus.js`, `firebaseSync.js`): limpiarlos o migrar a un build real (sección 10).
4. **Probar en un navegador real.** No tuve acceso a un navegador en este entorno para hacer clic y ver la app corriendo — validé todo leyendo el código al detalle y cruzándolo con el sitio publicado, más una verificación independiente de cada hallazgo antes de corregir. Te recomiendo, una vez publicado, probar el flujo completo: login, reportar una alerta, validarla desde otra pestaña/usuario, y el "Modo Pincel" nuevo en el panel de admin.

---

## 12. Estado del despliegue

Todos los cambios de este informe fueron subidos a la rama `main` (`git push`). GitHub Pages los toma automáticamente; en 1-2 minutos deberían verse reflejados en `https://maikfakir.github.io/Beja/`. Lo único que falta para dejar el 100% funcional entre dispositivos son los 7 valores de Firebase (sección 7) — en cuanto los tenga, hago el último push.
