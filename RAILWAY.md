# Despliegue en Railway

La API (FastAPI) y la versión web (Expo) se despliegan en **un único servicio** de Railway mediante el `Dockerfile` de la raíz:

1. Se genera la web con `npx expo export --platform web` (modo SPA, `web.output = "single"`).
2. Se instala la API de Python y se copia la web generada.
3. Uvicorn sirve `/api/*` y el resto de rutas devuelve la web (con fallback a `index.html`).

La base de datos sigue en Supabase, así que no hace falta añadir ninguna base de datos en Railway.

## Archivos

| Archivo | Uso |
|---|---|
| `Dockerfile` | Build multi-etapa: Node 20 (web) y Python 3.12 (API) |
| `.dockerignore` | Excluye `node_modules`, `.env`, `.git`, etc. |
| `railway.json` | Usa el Dockerfile y define el healthcheck en `/api/health` |

## Variables del servicio (Railway → Service → Variables)

| Variable | Valor | Cuándo se usa |
|---|---|---|
| `SUPABASE_URL` | `https://<proyecto>.supabase.co` | Runtime (API) |
| `SUPABASE_KEY` | clave de Supabase que usa la API | Runtime (API) |
| `EXPO_PUBLIC_SUPABASE_URL` | igual que `SUPABASE_URL` | Build (web) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | clave `anon` de Supabase | Build (web) |

`EXPO_PUBLIC_API_URL` **no** hace falta en la web: si está vacía, la web llama a `/api` en su mismo dominio.
Railway pasa automáticamente las variables del servicio como build args al Dockerfile.
`PORT` lo inyecta Railway; no lo definas.

## Opción A: desde GitHub (recomendada)

1. Sube la rama a GitHub (`git push -u origin deploy/railway`) o mézclala en la rama que quieras desplegar.
2. En <https://railway.com/new>, elige **Deploy from GitHub repo** y selecciona el repositorio.
3. En **Settings → Source**, elige la rama (`deploy/railway`, `develop` o `main`).
4. Añade las variables de la tabla anterior.
5. En **Settings → Networking**, pulsa **Generate Domain**.
6. Abre `https://<dominio>.up.railway.app` (web) y `https://<dominio>.up.railway.app/api/health` (debe devolver `{"status":"ok"}`).

## Opción B: con la CLI de Railway

```bash
npm i -g @railway/cli
railway login
railway init            # crea el proyecto
railway up              # sube el código y despliega usando el Dockerfile
railway variables --set "SUPABASE_URL=..." --set "SUPABASE_KEY=..." \
  --set "EXPO_PUBLIC_SUPABASE_URL=..." --set "EXPO_PUBLIC_SUPABASE_ANON_KEY=..."
railway domain          # genera la URL pública
railway up              # vuelve a desplegar para que el build use las variables
```

## App móvil (EAS)

Cuando tengas la URL de Railway, cambia `EXPO_PUBLIC_API_URL` en `customLayer/eas.json` (perfil `preview`) de `https://customlayer.vercel.app` a `https://<dominio>.up.railway.app` y recompila la APK:

```bash
cd customLayer
eas build -p android --profile preview
```

## Probar la imagen en local

```bash
docker build -t tfg-railway --build-arg EXPO_PUBLIC_SUPABASE_URL=... --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY=... .
docker run --rm -p 8000:8000 -e SUPABASE_URL=... -e SUPABASE_KEY=... tfg-railway
```
