#  Custom Layers - Documentación del Proyecto

Bienvenido a la documentación técnica de **Custom Layers**, una plataforma integral para la gestión e impresión 3D. El sistema utiliza un modelo de despliegue unificado en la web y un despliegue nativo para dispositivos móviles.

---

##  Variables de Entorno (Desarrollo Local)

Para el desarrollo local, es necesario configurar los siguientes archivos .env:

### 1. Backend (api/.env)
Configura la conexión de la API de FastAPI con Supabase:
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_de_servicio_o_anonima

### 2. Frontend (customLayer/.env)
Configura la App para que apunte a tu servidor local (usa tu IP local, no localhost):
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_jwt

> **Nota:** Estas variables locales son exclusivas para desarrollo y no se suben al repositorio.

---

##  Instalación y Ejecución Local

### Paso 1: Backend (API)
cd api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

### Paso 2: Frontend (App/Web)
cd customLayer
npm install
npx expo start

---

##  Despliegue a Producción (Vercel + EAS)

El despliegue de producción se gestiona de forma unificada para la web y la API, y de forma nativa para móviles.

### 1. Despliegue Unificado en Vercel (API + Web)
Vercel utiliza el archivo `vercel.json` de la raíz para servir la API (FastAPI) y la versión Web de la App simultáneamente.

1. Sube tu código a GitHub.
2. En la web de Vercel (vercel.com), importa tu repositorio único.
3. **Configuración del Proyecto:**
   - **Build Command:** `cd customLayer && npm install && npx expo export` (para generar la versión web).
   - **Output Directory:** `customLayer/dist` (o la ruta donde Expo genere el build).
4. **Environment Variables (En la web de Vercel):**
   Añade TODAS las claves necesarias en el mismo proyecto:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Haz clic en **Deploy**. Ahora tu API y tu Web viven en la misma URL.

### 2. Despliegue de la Aplicación Móvil (EAS)
Para generar el archivo `.apk` de Android, usamos Expo Application Services. Las variables de producción se inyectan en el archivo `eas.json`.

1. Instala EAS CLI y loguéate:
   npm install -g eas-cli
   eas login

2. **Configuración en eas.json:**
   Añade el bloque de entorno en el perfil de construcción (ej. preview):
   "build": {
     "preview": {
       "android": { "buildType": "apk" },
       "env": {
         "EXPO_PUBLIC_API_URL": "https://tu-proyecto-unificado.vercel.app",
         "EXPO_PUBLIC_SUPABASE_URL": "https://tu-proyecto.supabase.co",
         "EXPO_PUBLIC_SUPABASE_ANON_KEY": "tu_clave_anonima_jwt"
       }
     }
   }

3. Ejecuta la compilación desde la carpeta `customLayer/`:
   eas build -p android --profile preview

4. En la pagina de EXPO con tu cuenta deberia de aparecer la aplicacion compilando, desde hay la puedes descargar cuando termine.
