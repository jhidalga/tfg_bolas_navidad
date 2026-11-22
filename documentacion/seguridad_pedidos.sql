-- Seguridad de pedidos: que nadie pueda saltarse la web y escribir datos raros directamente.
-- Ejecutar una vez en Supabase, en SQL Editor.

-- 1. Un pedido nuevo siempre empieza Pendiente. Antes un usuario podia crearlo ya como Entregado.
drop policy if exists "pedidos: crear propio" on public.pedidos;
create policy "pedidos: crear propio" on public.pedidos
    for insert to authenticated
    with check (user_id = auth.uid() and estado = 'Pendiente');

-- 2. Cantidades razonables en el carrito y en los pedidos (not valid: no revisa las filas que ya existen).
alter table public.carrito drop constraint if exists carrito_cantidad_valida;
alter table public.carrito add constraint carrito_cantidad_valida check (cantidad between 1 and 20) not valid;

alter table public.detalles_pedido drop constraint if exists detalles_cantidad_valida;
alter table public.detalles_pedido add constraint detalles_cantidad_valida check (cantidad between 1 and 20) not valid;

-- 3. Totales no negativos.
alter table public.pedidos drop constraint if exists pedidos_total_valido;
alter table public.pedidos add constraint pedidos_total_valido check (total >= 0) not valid;
