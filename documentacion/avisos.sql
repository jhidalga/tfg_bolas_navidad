-- Avisos emergentes de la web: un administrador publica uno desde el panel y a cada persona le sale una sola vez.
-- Ejecutar una vez en Supabase, en SQL Editor.

create table if not exists public.avisos (
    id      uuid primary key default gen_random_uuid(),
    titulo  text not null check (char_length(titulo) between 1 and 80),
    texto   text not null check (char_length(texto) between 1 and 600),
    activo  boolean not null default false,
    creado  timestamptz not null default now()
);

-- Sin politicas: solo se lee y escribe desde la API (clave de servicio)
alter table public.avisos enable row level security;
