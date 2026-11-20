-- Incidencias de registro: quien no puede registrarse avisa y un admin puede permitir su correo.
-- Ejecutar una vez en Supabase, en SQL Editor.

create table if not exists public.incidencias_registro (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    nombre      text not null check (char_length(nombre)    <= 120),
    apellido1   text not null check (char_length(apellido1) <= 120),
    apellido2   text not null check (char_length(apellido2) <= 120),
    curso       text not null check (char_length(curso)     <= 120),
    correo      text not null check (char_length(correo)    <= 200),
    estado      text not null default 'Pendiente' check (estado in ('Pendiente', 'Aprobada', 'Rechazada'))
);

alter table public.incidencias_registro enable row level security;

-- Cualquiera puede crear una incidencia, siempre en estado Pendiente
drop policy if exists "incidencias_crear" on public.incidencias_registro;
create policy "incidencias_crear" on public.incidencias_registro
    for insert to anon, authenticated
    with check (estado = 'Pendiente');

-- Solo los administradores las ven, las cambian y las borran
drop policy if exists "incidencias_admin_ver" on public.incidencias_registro;
create policy "incidencias_admin_ver" on public.incidencias_registro
    for select to authenticated
    using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));

drop policy if exists "incidencias_admin_cambiar" on public.incidencias_registro;
create policy "incidencias_admin_cambiar" on public.incidencias_registro
    for update to authenticated
    using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));

drop policy if exists "incidencias_admin_borrar" on public.incidencias_registro;
create policy "incidencias_admin_borrar" on public.incidencias_registro
    for delete to authenticated
    using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));

-- Funciones que usa la web sin dar acceso a la tabla: solo devuelven si/no
create or replace function public.correo_permitido(p_correo text)
returns boolean language sql security definer set search_path = public as $$
    select exists (
        select 1 from public.incidencias_registro
        where lower(correo) = lower(p_correo) and estado = 'Aprobada'
    );
$$;

create or replace function public.incidencia_pendiente(p_correo text)
returns boolean language sql security definer set search_path = public as $$
    select exists (
        select 1 from public.incidencias_registro
        where lower(correo) = lower(p_correo) and estado = 'Pendiente'
    );
$$;

grant execute on function public.correo_permitido(text)    to anon, authenticated;
grant execute on function public.incidencia_pendiente(text) to anon, authenticated;
