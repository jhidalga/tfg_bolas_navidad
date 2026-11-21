-- Tema de la web (Normal, Navidad, San Valentin). Lo cambia un administrador desde el panel.
-- Ejecutar una vez en Supabase, en SQL Editor.

create table if not exists public.configuracion (
    clave  text primary key,
    valor  text not null check (char_length(valor) <= 60)
);

alter table public.configuracion enable row level security;

-- Todo el mundo puede leer el tema (hace falta antes de iniciar sesion)
drop policy if exists "configuracion_leer" on public.configuracion;
create policy "configuracion_leer" on public.configuracion
    for select to anon, authenticated
    using (clave = 'tema');

-- Solo los administradores lo cambian
drop policy if exists "configuracion_admin_crear" on public.configuracion;
create policy "configuracion_admin_crear" on public.configuracion
    for insert to authenticated
    with check (clave = 'tema' and valor in ('normal', 'navidad', 'sanvalentin')
        and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));

drop policy if exists "configuracion_admin_cambiar" on public.configuracion;
create policy "configuracion_admin_cambiar" on public.configuracion
    for update to authenticated
    using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador))
    with check (clave = 'tema' and valor in ('normal', 'navidad', 'sanvalentin'));

insert into public.configuracion (clave, valor) values ('tema', 'navidad') on conflict (clave) do nothing;
