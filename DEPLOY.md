# 🚀 Guía de Despliegue en GitHub Pages y Configuración de Google Firebase

Este documento describe los sencillos pasos para publicar **Colmena Segura (Beja)** de forma 100% gratuita utilizando **GitHub Pages** y la autenticación con Google mediante **Firebase (Plan Spark)**.

---

## 🌐 1. Publicación en GitHub Pages (Hosting Gratuito)

Tu repositorio ya cuenta con el flujo de automatización configurado en [deploy-pages.yml](file:///.github/workflows/deploy-pages.yml).

### Pasos en GitHub:
1. Ve a tu repositorio en GitHub: **`https://github.com/MaikFakir/Beja`**.
2. Haz clic en **Settings** (Configuración) en el menú superior del repositorio.
3. En la barra lateral izquierda, selecciona **Pages** (dentro de la sección *Code and automation*).
4. En **Build and deployment**:
   - **Source**: Selecciona **GitHub Actions**.
5. ¡Listo! Cada vez que subas cambios (`git push`) a la rama `main`, tu aplicación se desplegará automáticamente en:
   👉 **`https://maikfakir.github.io/Beja/`**

> **Nota:** Todos los enlaces, estilos, scripts e imágenes utilizan rutas relativas, por lo que la aplicación funciona de forma transparente tanto en local como en la subruta `/Beja/`.

---

## 🔐 2. Configurar Google Firebase para GitHub Pages

Tu aplicación ya tiene configurado el proyecto de Firebase **`beja-ac23a`** en [firebase-config.js](file:///js/firebase-config.js).

Para que el inicio de sesión con Google (**Google Sign-In**) y la sincronización funcionen sin restricciones de seguridad en la nube:

### Pasos en la Consola de Firebase:
1. Ingresa a la consola: **[https://console.firebase.google.com/project/beja-ac23a/authentication/settings](https://console.firebase.google.com/project/beja-ac23a/authentication/settings)**.
2. Ve al apartado **Authentication** > pestaña **Settings** (Configuración).
3. Busca la sección **Authorized domains** (Dominios autorizados).
4. Haz clic en **Add domain** (Agregar dominio) y añade:
   - `maikfakir.github.io`
   - `localhost` (para pruebas locales)
5. Guarda los cambios.

Ambos servicios (GitHub Pages y Firebase Auth / Firestore en modo Spark) son **100% gratuitos** y no requieren ingresar tarjeta de crédito.

---

## 💻 3. Ejecución en Servidor Local

Mientras trabajas localmente, puedes ejecutar el servidor estático en cualquier momento:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Y abrir en tu navegador:
- **App Ciudadana:** [http://localhost:8080/](http://localhost:8080/)
- **Despacho Central (Admin):** [http://localhost:8080/admin.html](http://localhost:8080/admin.html)
- **Portal de Acceso:** [http://localhost:8080/login.html](http://localhost:8080/login.html)
