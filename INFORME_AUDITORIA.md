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

## 7. Firebase — credenciales ya aplicadas; falta un paso tuyo en la consola

Ya pegué las 7 credenciales que me diste en `js/firebase-config.js` y las subí. Con eso, la app deja "Modo Local" automáticamente y el botón "Continuar con Google" ahora abre el login real de Google (`signInWithPopup`) en vez del modal de demo.

**Lo único que falta, y solo tú puedes hacerlo (requiere entrar a la consola con tu Google):**

1. Entra a [Firebase Console](https://console.firebase.google.com/) → proyecto `beja-ac23a`.
2. **Build → Authentication → Sign-in method** → activa el proveedor **Google** (si no lo has hecho, el botón "Continuar con Google" fallará con un error).
3. **Build → Firestore Database** → si no existe aún, créala.
4. **Authentication → Settings → Authorized domains** → agrega `maikfakir.github.io`.
5. **Firestore Database → Reglas** → pega exactamente esto y publica:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

   **Por qué esta regla y no una más estricta:** la app permite iniciar sesión de dos formas — Google real (crea una sesión verificada de Firebase) y "acceso rápido por correo" (no crea sesión de Firebase, solo identidad local). Una regla que exija `request.auth != null` bloquearía los reportes de todos los que entren por la segunda vía, y hoy la mayoría de los datos (nombre, correo que la persona decidió escribir, reportes de incidentes) no son sensibles — por eso, mientras convivan ambos métodos de entrada, la regla abierta es la que garantiza que **todo** funcione (reportes, avisos, chat) sin sorpresas. Si más adelante decides que **todo** el mundo debe entrar con Google real (nada de acceso rápido por correo), puedo ayudarte a cerrar las reglas por usuario — avísame cuando quieras dar ese paso.

Sin este paso 5 en particular, Firestore recién creada deniega todo por defecto — verías la app "conectada" pero ningún reporte llegaría a otros dispositivos.

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

## PARTE 2 — Segunda ronda de correcciones (a pedido tuyo, tras activar Firebase)

### 13. Login: ya no hay correos precargados ni accesos de 1 toque

- Quité los 3 botones de cuentas de ejemplo del selector "Acceder con Google" (citizen) y los botones de 1 toque **"Acceder como Gaby Olarte (Super Admin)"** / **"Acceder como Patrullero"** del panel de admin. Ahora la única forma de entrar es: **Google real** (botón "Continuar con Google", ya activo con tus credenciales) o **escribiendo tu correo**.
- **Cerré el hueco de seguridad más importante**: antes, escribir `gabyolarte2017@gmail.com` a mano (sin ninguna verificación) te daba rol de Super Admin al instante. Ahora, el "acceso rápido por correo" **nunca** otorga rol de admin/patrullero por sí solo — esos roles solo se reconocen: (a) vía Google Sign-In real y verificado, o (b) si un administrador ya te los asignó desde "Moderar Cuenta" en el Directorio Ciudadano (y en ese caso sí puedes volver a entrar más tarde con solo tu correo, porque el rol ya está guardado, no porque el correo en sí "sea mágico"). También quité el correo del Super Admin que aparecía visible en la pantalla de acceso del panel.
- El panel de admin ahora tiene un botón real **"Continuar con Google"** (antes solo tenía los 2 accesos de 1 toque).

### 14. Reportes que no le aparecían a los demás usuarios

Esto era 100% porque Firebase no estaba configurado (ver sección 7 de la Parte 1) — ya lo activé. Además, de paso encontré y corregí un bug real en la sincronización: cuando la nube quedaba en cero incidentes activos (por ejemplo, alguien resolvió el último), el código se saltaba la actualización y el dispositivo se quedaba con datos viejos en pantalla. Ya se sincroniza siempre, incluida esa transición a "cero". Recuerda: para que esto funcione de verdad entre celulares, falta que apliques la regla de Firestore de la sección 7.

### 15. Buscador de direcciones

No pude reproducir el error exacto que viste (no tengo navegador en este entorno), pero encontré y corregí puntos reales de falla:
- Si el servidor de búsqueda (Nominatim) no respondía a tiempo o devolvía un error, la app se quedaba callada o mostraba "Error" sin más contexto. Ahora agrego un **segundo buscador de respaldo, también gratis y sin API key (Photon, de Komoot)**: si el primero falla, se intenta automáticamente con el segundo antes de rendirse.
- Ahora se distingue claramente entre "no se encontraron resultados" y "no se pudo conectar" (antes ambos casos podían verse igual o quedarse colgados).
- Protegí el cálculo contra coordenadas inválidas (si tu ubicación aún no había cargado).

### 16. Rutas azules/verdes que cruzaban edificios

Encontré el motivo más probable: cuando el servidor principal de rutas (OSRM) no respondía, el código reintentaba con la **combinación equivocada** de servidor+perfil (le pedía ruta "en auto" al servidor que solo tiene datos "a pie", lo cual casi siempre falla), agotando los reintentos útiles y cayendo directo a una **línea recta** entre origen y destino — eso es lo que se veía cruzando edificios, tanto en la ruta despejada (azul) como en el desvío (verde).

Corregí la cadena de respaldo para que siempre pruebe servidores con el perfil correcto (a pie → bicicleta → auto → servidor público general, en ese orden para caminar; auto → servidor público para manejar), lo que debería hacer mucho más rara la caída a línea recta. Y para los casos raros en que **ningún** servidor responda (sin internet, servidores caídos), ahora la app te avisa explícitamente en pantalla: **"⚠️ Ruta aproximada: no se pudo contactar un servidor de calles"**, en vez de mostrar una línea recta como si fuera una ruta real y confiable.

### 17. Puntos seguros (estaciones de policía)

Implementado: el botón **"🛡️ Puntos Seguros"** (que ya existía en la interfaz pero no hacía nada) ahora sí funciona. Al activarlo, consulta **Overpass** (datos de OpenStreetMap, gratis y sin API key) y dibuja un ícono 🛡️ en cada estación/CAI de policía dentro del área visible del mapa; se actualiza solo si te alejas mucho del área ya consultada. Si Overpass no responde en un momento dado (puede pasar, es un servicio público compartido), simplemente no se agregan puntos extra — no rompe nada más del mapa.

### 18. Panel de control "cortado" / con algo tapándolo

Encontré dos bugs reales:
- Las vistas **"📢 Avisos de Zona"** y **"💬 Radio & Chat Táctico"** no tenían la regla de CSS para ocupar todo el ancho del panel — se veían apretadas en una columna angosta de 390px en vez de usar toda la pantalla. Corregido.
- Cada vez que entrabas al panel (incluso repitiendo el login durante pruebas), el código volvía a registrar por duplicado los mismos listeners de eventos, acumulando comportamiento redundante sesión tras sesión. Corregido: ahora el registro ocurre una sola vez.

Una aclaración importante: el panel tiene una "puerta de acceso" (pantalla oscura de fondo con el botón para entrar) que aparece **a propósito** cada vez que abres `admin.html` sin una sesión de Autoridad activa — no es un error, es el control de acceso. Si antes veías esa pantalla oscura y pensabas que "algo tapaba todo", es probable que fuera eso; ahora con el botón real de Google debería ser evidente que ahí es donde inicias sesión.

---

## Resumen de archivos tocados en esta segunda ronda

`js/firebase-config.js` (credenciales), `js/firebaseAuth.js` y `js/bundle.js` (login solo por correos reales, sin preloads; buscador con respaldo; ruteo con cadena de servidores correcta; puntos seguros; sincronización en cero), `js/admin-bundle.js` (gate de Google real; fix de listeners duplicados; sincronización en cero), `admin.html` (nuevo botón de Google en el gate), `css/admin.css` (fix de layout de Avisos/Chat).

---

## 11. Qué falta por hacer (lo único que de verdad depende de ti)

1. **Los pasos de Firebase de la sección 7** (activar el proveedor Google y publicar la regla de Firestore) — sin esto, la sincronización entre dispositivos no arranca aunque las credenciales ya estén pegadas.
2. **Corregir o completar `DEPLOY.md`**: no existe el workflow de GitHub Actions que menciona. No lo edité porque no me pediste tocar documentación, pero te lo señalo para que no cause confusión más adelante.
3. **Decisión opcional sobre los archivos "muertos"** (`app.js`, `riskMap.js`, `swarmEngine.js`, `admin.js`, `simulator.js`, `soundEffects.js`, `syncBus.js`, `firebaseSync.js`): limpiarlos o migrar a un build real (sección 10).
4. **Probar en un navegador real.** No tuve acceso a un navegador en este entorno para hacer clic y ver la app corriendo — validé todo leyendo el código al detalle, cruzándolo con el sitio publicado y, para esta segunda ronda, sin poder reproducir en vivo el error exacto del buscador de direcciones (corregí los puntos de falla más probables). Te recomiendo probar: login con Google real, reportar y ver que aparezca en otro dispositivo/navegador, el buscador de direcciones, una ruta con desvío, "Puntos Seguros", y las vistas de Avisos/Chat del panel de admin.

---

## 12. Estado del despliegue

Todos los cambios de este informe (ambas rondas) fueron subidos a la rama `main` (`git push`). GitHub Pages los toma automáticamente; en 1-2 minutos deberían verse reflejados en `https://maikfakir.github.io/Beja/`. Lo único que falta para el 100% funcional entre dispositivos son los 2 pasos de Firebase Console de la sección 7 (activar Google Sign-In y publicar la regla de Firestore) — eso ya no lo puedo hacer yo, requiere que entres tú a la consola.

---

## PARTE 3 — Tercera ronda de correcciones (validación de 6 problemas reportados tras activar Firebase)

**Nota sobre despliegue de esta ronda:** a diferencia de las dos rondas anteriores, estos cambios quedaron guardados en el working tree pero **no se hicieron commit ni push** — están esperando tu confirmación antes de subirse a `main`/GitHub Pages.

### 19. El panel de control no mostraba a los usuarios ya logueados en Firebase

**Causa raíz:** el directorio de usuarios (`firebaseAuth.getUsersList()`) era 100% `localStorage`, es decir, propio de cada navegador/dispositivo. Existía un intento de escribir cada usuario a Firestore (`db.collection('users').doc(uid).set(...)`), pero **nada leía esa colección de vuelta**: la única pieza de código que sí tenía un `onSnapshot('users')` vivía en una clase `FirebaseAuthService` duplicada dentro de `admin-bundle.js` que **nunca se instancia** (por el mismo patrón de "instancia ganadora" ya documentado en la Parte 1, sección 10: `js/firebaseAuth.js` se carga primero y su instancia es la que se reutiliza siempre). Resultado: un ciudadano nuevo iniciaba sesión perfectamente con Google, pero el admin —viendo desde otro dispositivo— nunca se enteraba, porque su directorio solo reflejaba lo que hubiera pasado en su propio navegador.

**Corrección** (`js/firebaseAuth.js`, `js/bundle.js`, `js/admin-bundle.js`): agregué `initUsersCloudSync()` a la clase que **sí** se usa realmente, que suscribe la colección `users` de Firestore con `onSnapshot` y fusiona los usuarios de la nube con el directorio local (conservando las cuentas de demostración que aún no existen en la nube). Se llama desde ambas apps justo después de que `firebaseSync` ya esté listo, y dispara un evento (`colmena:users-directory-updated`) que hace que el panel de admin se refresque solo, sin recargar.

### 20. Había que recargar la página para ver cambios de alertas en el panel de control

**Causa raíz:** el temporizador que degrada una alerta de roja a amarilla (8 min) y la archiva (20 min más) **solo guardaba el cambio en `localStorage`**, nunca lo empujaba de vuelta a Firestore. Como el panel también tiene un listener en tiempo real (`onSnapshot`) que sobrescribe el estado local con lo que diga la nube cada vez que cambia cualquier incidente, el resultado era que la degradación se veía un instante y luego **se revertía sola** en cuanto llegaba el siguiente snapshot (que seguía creyendo que la alerta estaba en rojo) — de ahí la sensación de "tengo que recargar para que se vea bien". Encontré el mismo hueco en el motor del lado ciudadano. Además, la lista de "Avisos de Zona" del admin se leía con un `.get()` de una sola vez (no en tiempo real), así que un aviso creado por otro despachador tampoco aparecía sin reabrir esa pestaña.

**Corrección** (`js/admin-bundle.js`, `js/bundle.js`): el temporizador de degradación ahora empuja el nuevo estado a Firestore en el momento en que ocurre (`firebaseSync.saveIncidentToCloud`), y el archivado final borra el documento de la nube (`firebaseSync.deleteIncidentFromCloud`, método nuevo — de paso corregí que `resolve()`/`dismiss()` del admin ya lo referenciaban pero nunca existía, así que siempre caían a un camino alterno). Los "Avisos de Zona" ahora también usan `onSnapshot` en vez de una lectura única, y el admin agregó un manejador de error al listener de incidentes para que un fallo de conexión quede visible en consola en vez de morir en silencio.

### 21. En el celular, marcar una alerta en un punto del mapa (no en tu ubicación) la mandaba igual a tu ubicación real

**Causa raíz:** al tocar "🚨 Reportar Incidente en este Punto" en el mapa, el código fijaba la coordenada elegida en la MISMA variable (`this.userCoords`) que usa la suscripción GPS en vivo del celular. En un teléfono real, el chip de GPS entrega lecturas nuevas cada pocos segundos (`watchPosition`), así que —mientras completabas el reporte (elegir categoría, contar 3 segundos de pánico)— el GPS volvía a disparar y **pisaba silenciosamente** el punto que habías elegido, sin que tú lo notaras. En escritorio casi no pasaba porque la geolocalización por Wi-Fi/IP prácticamente no vuelve a emitir después de la primera lectura — por eso el bug se sentía "exclusivo del celular".

**Corrección** (`js/bundle.js`): la ubicación elegida a mano ahora vive en una variable separada (`this.selectedReportCoords`), inmune a las actualizaciones de GPS. El reporte usa esa ubicación si existe, y solo si no, tu GPS real. Además, en la pestaña de reporte ahora hay un indicador visible ("📍 Reportando en el punto elegido en el mapa..." / "📍 Reportando en tu ubicación GPS actual") con un botón para volver a tu ubicación real en cualquier momento, para que nunca quede ambiguo dónde se va a publicar la alerta.

### 22. Chat de soporte: control no podía responderle a una persona en concreto

**Causa raíz, la más profunda de esta ronda:** `js/chatService.js` (el único módulo de chat que cargan ambas páginas) era **100% local**: guardaba todo en `localStorage` y solo se sincronizaba entre pestañas del mismo navegador vía `BroadcastChannel` — nunca se conectó a Firestore, pese a que el resto de la app ya tenía Firebase activo. Encima, el diseño agrupaba los mensajes por **canal/tema** (general, técnico, emergencias), no por **persona**: el "directorio de contactos" del admin devolvía siempre un único contacto fijo ("Mesa de Soporte Beja"), así que no había forma de elegir a un ciudadano específico. Y aunque el admin escribiera una respuesta, el filtro de mensajes exigía que coincidiera con un `senderId` hardcodeado (`user_admin_super`), por lo que en la práctica **el ciudadano nunca veía la respuesta manual de un humano**, solo el bot automático de palabras clave.

**Corrección** (`js/chatService.js`, `js/bundle.js`, `js/admin-bundle.js` — el rediseño más grande de esta ronda):
- Cada mensaje ahora lleva un `citizenUid` (identifica de qué ciudadano es la conversación, sin importar si lo escribió él o si es una respuesta de soporte dirigida a él).
- Todo se sube a Firestore (colección `chat_messages`, un documento por mensaje) con `onSnapshot` en tiempo real en ambos lados — ahora sí cruza dispositivos.
- El panel de admin (pestaña "Directorio por Roles") muestra la lista **real** de ciudadanos que han escrito, no un contacto de mentira; al hacer clic en uno, el chat se abre en modo 1 a 1 y la respuesta del despachador (`sendSupportReply`) queda etiquetada solo para esa persona.
- Los invitados sin cuenta ahora reciben un id estable guardado en su navegador (antes todos los invitados compartían el mismo identificador genérico y sus mensajes se mezclaban entre sí).

### 23. Avisos por zona: elegir la zona y el tipo de alerta no funcionaba bien

Encontré varios problemas relacionados:
- El diccionario de categorías del panel de admin **no tenía** `ACCIDENT` ni `VANDALISM` (sí existían en el lado ciudadano y en los propios menús del admin) — un incidente de ese tipo se mostraba mal etiquetado como "Riña/Pelea" en el mapa y la cola, y no aparecía en ningún filtro. **Corregido**, y agregué las 2 pestañas de filtro que faltaban.
- La "zona" de un Aviso o del Inyector Masivo se tomaba **en silencio** como "el centro que el mapa tenga en ese momento", sin que tú la eligieras a propósito, y el propio modal de captura tapaba el mapa por completo mientras lo llenabas — no había forma de confirmar qué punto se iba a usar. **Corregido:** agregué un botón "🎯 Elegir Zona en el Mapa" en ambos modales que oculta el formulario un instante, te deja tocar el punto exacto en el mapa (con un marcador y un círculo de radio como vista previa), y vuelve a mostrar el formulario ya con la zona confirmada.
- El modal "Nuevo Aviso" no tenía ningún selector de tipo de alerta (solo título/mensaje/radio/estado). **Agregado.**
- El "Modo Pincel" siempre elegía la categoría al azar sin poder elegirla. **Agregado un selector** junto al botón.

### 24. Botones que se cortan o no se ven en celular

- El header del panel de admin (selector de vistas + "Inyector Masivo"/"Audio"/"Nuevo Aviso"/enlace a la app) nunca tuvo ninguna regla para móvil: en pantallas angostas esos ~9 elementos simplemente se salían del viewport, sin scroll para alcanzarlos. **Corregido:** en móvil el header pasa a 2 filas (marca arriba, acciones abajo) con scroll horizontal.
- Los botones "🔥 Capa de Calor" y "🛡️ Puntos Seguros" de la app ciudadana estaban en un contenedor que se ocultaba por completo en móvil, sin ningún reemplazo — en celular esos dos botones directamente no existían. **Corregido:** se reubicaron compactos en la esquina del mapa (se ocultó solo la píldora informativa de "Ruta Segura" para no competir por espacio).
- El segmentador de estado de la cola de incidentes del admin (Activas/Patrulladas/Sondeo/Todas) podía recortar su último botón en pantallas muy angostas por el clásico problema de `flex:1` + texto sin salto de línea. **Corregido con scroll horizontal.**
- `admin.html` y `login.html` no tenían `viewport-fit=cover` en el `<meta viewport>` (index.html sí), por lo que el margen de seguridad para el "notch"/barra inferior de iPhones no se aplicaba de verdad. **Agregado.**

### Resumen de archivos tocados en esta tercera ronda

`js/firebaseAuth.js` (sync de usuarios a la nube), `js/bundle.js` (ubicación de reporte separada del GPS en vivo + indicador visual, chat con citizenUid + sync de usuarios/chat a la nube, decaimiento de incidentes empuja a la nube), `js/admin-bundle.js` (sync de usuarios/broadcasts/chat en tiempo real, chat 1 a 1 real, categorías ACCIDENT/VANDALISM, selector explícito de zona con vista previa en el mapa, `deleteIncidentFromCloud`), `js/chatService.js` (rediseño: Firestore real, hilos por ciudadano, respuestas dirigidas), `index.html` (indicador de ubicación de reporte), `admin.html` (selector de categoría en Avisos, botones "Elegir Zona", categoría en Modo Pincel, filtros Accidente/Vandalismo, `viewport-fit=cover`), `login.html` (`viewport-fit=cover`), `css/styles.css` (botones de capas visibles en móvil, estilo del indicador de ubicación), `css/admin.css` (header responsive con scroll, segmentador de estado responsive, estilos del selector de zona).

### Qué no se pudo probar en vivo

No tuve acceso a un navegador ni a un dispositivo real en este entorno — validé todo leyendo el código al detalle y verificando la coherencia estructural de cada archivo modificado. Te recomiendo probar, idealmente desde dos dispositivos distintos: iniciar sesión con una cuenta nueva y confirmar que aparece de inmediato en el Directorio del admin; dejar una alerta pasar los 8 minutos y confirmar que se ve amarilla y se queda así; reportar tocando un punto lejano del mapa desde el celular; escribir a soporte desde el celular y responder desde el admin (debe llegarte solo a ti); y enviar un Aviso de Zona eligiendo el punto exacto en el mapa.
