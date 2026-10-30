# ---------- 1) Build de la versión web (Expo) ----------
FROM node:20-bookworm-slim AS web
WORKDIR /app/customLayer

# Variables públicas que Expo incrusta en el bundle durante el build.
# Railway las pasa como build args si existen como variables del servicio.
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_API_URL=""
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY \
    EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    CI=1

COPY customLayer/package.json customLayer/package-lock.json ./
RUN npm ci

COPY customLayer/ ./
RUN npx expo export --platform web --output-dir dist

# ---------- 2) API (FastAPI) + estáticos ----------
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    WEB_DIR=/app/web

COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

COPY api/ api/
COPY --from=web /app/customLayer/dist /app/web

WORKDIR /app/api
# Railway inyecta PORT en tiempo de ejecución
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
