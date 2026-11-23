-- Ejecutar ANTES de activar "Confirm email" en Supabase.
-- Marca como verificadas las cuentas que ya existen, para que nadie se quede fuera.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;
