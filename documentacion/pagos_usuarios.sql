-- Pagos: el admin marca en el Resumen si una persona ya ha pagado.
-- Ejecutar una vez en Supabase, en SQL Editor.
-- Solo los administradores pueden ver y cambiar esta tabla.

create table if not exists public.pagos_usuarios (
    user_id uuid primary key references public.usuarios(id) on delete cascade,
    pagado boolean not null default false
);

alter table public.pagos_usuarios enable row level security;

drop policy if exists "pagos_admin_ver" on public.pagos_usuarios;
create policy "pagos_admin_ver" on public.pagos_usuarios
    for select to authenticated
    using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));

drop policy if exists "pagos_admin_crear" on public.pagos_usuarios;
create policy "pagos_admin_crear" on public.pagos_usuarios
    for insert to authenticated
    with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));

drop policy if exists "pagos_admin_cambiar" on public.pagos_usuarios;
create policy "pagos_admin_cambiar" on public.pagos_usuarios
    for update to authenticated
    using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador))
    with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));
