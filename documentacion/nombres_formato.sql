-- Los nombres siempre con la primera letra de cada palabra en mayúscula y el resto en minúscula.
-- "de", "del", "la", "las", "los" e "y" quedan en minúscula si no van al principio.
-- Ejecutar una vez en Supabase, en SQL Editor. Arregla los nombres que ya existen
-- y vigila los nuevos y los que se editen. No borra nada.

create or replace function public.normalizar_nombre(p text)
returns text language plpgsql immutable as $$
declare
    palabras text[];
    salida text[] := '{}';
    w text;
    i int := 0;
begin
    if p is null then return null; end if;
    palabras := regexp_split_to_array(lower(btrim(p)), '\s+');
    foreach w in array palabras loop
        i := i + 1;
        if i > 1 and w in ('de', 'del', 'la', 'las', 'los', 'y') then
            salida := salida || w;
        else
            salida := salida || initcap(w);
        end if;
    end loop;
    return array_to_string(salida, ' ');
end $$;

create or replace function public.usuarios_normalizar_nombre()
returns trigger language plpgsql as $$
begin
    new.nombre := public.normalizar_nombre(new.nombre);
    return new;
end $$;

drop trigger if exists usuarios_nombre_formato on public.usuarios;
create trigger usuarios_nombre_formato
before insert or update of nombre on public.usuarios
for each row execute function public.usuarios_normalizar_nombre();

-- Arregla los que ya existen
update public.usuarios set nombre = public.normalizar_nombre(nombre)
where nombre is distinct from public.normalizar_nombre(nombre);
