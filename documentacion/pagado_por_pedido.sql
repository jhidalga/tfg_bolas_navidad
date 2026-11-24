-- Pagado por pedido: antes el pago era de la persona y un pedido nuevo salia ya pagado.
-- Ahora cada pedido tiene su propio Pagado. Ejecutar una vez en Supabase, en SQL Editor.

alter table public.pedidos add column if not exists pagado boolean not null default false;

-- Los pedidos de personas que ya estaban marcadas como pagadas se quedan pagados
update public.pedidos p
   set pagado = true
  from public.pagos_usuarios g
 where g.user_id = p.user_id and g.pagado and p.estado <> 'Cancelado' and not p.pagado;

-- Solo un administrador (o el servidor) puede cambiar el Pagado de un pedido
create or replace function public.solo_admin_cambia_pagado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.pagado is distinct from old.pagado
       and auth.uid() is not null
       and not exists (select 1 from public.usuarios u where u.id = auth.uid() and u.administrador) then
        raise exception 'Solo un administrador puede cambiar el pago';
    end if;
    return new;
end;
$$;

drop trigger if exists pedidos_solo_admin_pagado on public.pedidos;
create trigger pedidos_solo_admin_pagado before update on public.pedidos
    for each row execute function public.solo_admin_cambia_pagado();

-- Un pedido pagado no se puede anular ni cambiar desde la cuenta del alumno
create or replace function public.anular_pedido(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
    cambiadas integer;
begin
    update public.pedidos
       set estado = 'Cancelado'
     where id = p_id and user_id = auth.uid() and estado = 'Pendiente' and not pagado;
    get diagnostics cambiadas = row_count;
    return cambiadas > 0;
end;
$$;

create or replace function public.quitar_bola_pedido(p_pedido uuid, p_detalle text)
returns text language plpgsql security definer set search_path = public as $$
declare
    quedan integer;
begin
    if not exists (select 1 from public.pedidos where id = p_pedido and user_id = auth.uid() and estado = 'Pendiente' and not pagado) then
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
