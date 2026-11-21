-- Anular un pedido: el alumno puede cancelar el suyo solo si sigue Pendiente.
-- Ejecutar una vez en Supabase, en SQL Editor.

create or replace function public.anular_pedido(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
    cambiadas integer;
begin
    update public.pedidos
       set estado = 'Cancelado'
     where id = p_id and user_id = auth.uid() and estado = 'Pendiente';
    get diagnostics cambiadas = row_count;
    return cambiadas > 0;
end;
$$;

revoke all on function public.anular_pedido(uuid) from public, anon;
grant execute on function public.anular_pedido(uuid) to authenticated;

-- Quitar una unidad de una linea de un pedido Pendiente (si solo queda 1, quita la linea). Recalcula el total.
-- Si era la ultima bola, el pedido pasa a Cancelado.
-- Devuelve: 'ok', 'cancelado' o 'no'.
create or replace function public.quitar_bola_pedido(p_pedido uuid, p_detalle text)
returns text language plpgsql security definer set search_path = public as $$
declare
    quedan integer;
begin
    if not exists (select 1 from public.pedidos where id = p_pedido and user_id = auth.uid() and estado = 'Pendiente') then
        return 'no';
    end if;
    if exists (select 1 from public.detalles_pedido where pedido_id = p_pedido and id::text = p_detalle and coalesce(cantidad, 1) > 1) then
        update public.detalles_pedido set cantidad = cantidad - 1 where pedido_id = p_pedido and id::text = p_detalle;
    else
        delete from public.detalles_pedido where pedido_id = p_pedido and id::text = p_detalle;
        if not found then
            return 'no';
        end if;
    end if;
    select count(*) into quedan from public.detalles_pedido where pedido_id = p_pedido;
    if quedan = 0 then
        update public.pedidos set estado = 'Cancelado' where id = p_pedido;
        return 'cancelado';
    end if;
    update public.pedidos
       set total = (select coalesce(sum(precio_unitario * coalesce(cantidad, 1)), 0) from public.detalles_pedido where pedido_id = p_pedido)
     where id = p_pedido;
    return 'ok';
end;
$$;

revoke all on function public.quitar_bola_pedido(uuid, text) from public, anon;
grant execute on function public.quitar_bola_pedido(uuid, text) to authenticated;
