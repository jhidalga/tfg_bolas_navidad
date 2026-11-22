-- Incidencias de registro: el alumno cuenta brevemente el motivo.
-- Ejecutar una vez en Supabase, en SQL Editor. Las incidencias antiguas se quedan sin motivo.

alter table public.incidencias_registro add column if not exists motivo text;

alter table public.incidencias_registro drop constraint if exists incidencias_motivo_largo;
alter table public.incidencias_registro add constraint incidencias_motivo_largo check (motivo is null or char_length(motivo) <= 300);
