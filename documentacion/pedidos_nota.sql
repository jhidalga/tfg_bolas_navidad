alter table public.pedidos
  add column if not exists nota text
  check (nota is null or char_length(nota) <= 200);
