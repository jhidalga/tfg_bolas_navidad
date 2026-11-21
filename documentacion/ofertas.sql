-- Ofertas: cada producto puede estar en oferta (con su precio anterior) y un interruptor global las apaga todas.
-- Ejecutar una vez en Supabase, en SQL Editor. Hace falta antes tema_web.sql (tabla configuracion).

alter table public.productos add column if not exists en_oferta boolean not null default true;
-- Precio de antes, el que se enseña tachado. Con 0 se enseña el doble del precio actual.
alter table public.productos add column if not exists precio_anterior numeric not null default 0 check (precio_anterior >= 0);

-- Interruptor global (si = ofertas activas, no = ninguna). Se permite en las politicas de configuracion.
drop policy if exists "configuracion_leer" on public.configuracion;
create policy "configuracion_leer" on public.configuracion
    for select to anon, authenticated
    using (clave in ('tema', 'ofertas'));

drop policy if exists "configuracion_admin_crear" on public.configuracion;
create policy "configuracion_admin_crear" on public.configuracion
    for insert to authenticated
    with check ((clave = 'tema' and valor in ('normal', 'navidad', 'sanvalentin') or clave = 'ofertas' and valor in ('si', 'no'))
        and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador));

drop policy if exists "configuracion_admin_cambiar" on public.configuracion;
create policy "configuracion_admin_cambiar" on public.configuracion
    for update to authenticated
    using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador))
    with check ((clave = 'tema' and valor in ('normal', 'navidad', 'sanvalentin')) or (clave = 'ofertas' and valor in ('si', 'no')));

insert into public.configuracion (clave, valor) values ('ofertas', 'si') on conflict (clave) do nothing;
