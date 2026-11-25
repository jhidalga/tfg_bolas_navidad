-- Bolas hechas: cuantas bolas de cada linea ya estan impresas.
-- Ejecutar una vez en Supabase, en SQL Editor, ANTES de subir la web nueva.

alter table public.detalles_pedido add column if not exists hechas integer not null default 0;

-- Los pedidos que ya estaban Completados o Entregados tienen todas sus bolas hechas
update public.detalles_pedido d
   set hechas = coalesce(d.cantidad, 1)
  from public.pedidos p
 where p.id = d.pedido_id and p.estado in ('Completado', 'Entregado') and d.hechas = 0;
