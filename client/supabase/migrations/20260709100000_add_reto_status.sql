-- Reto 10K: estado propio de las tarjetas del reto (idea / grabado / publicado)
-- Se añade a content_items para que las ideas generadas dentro del reto
-- tengan un semáforo independiente del status general (library/scheduled/done).
-- El calendario y la biblioteca generales siguen funcionando vía scheduled_date y status.

alter table public.content_items
  add column if not exists reto_status text
  check (reto_status in ('idea','grabado','publicado'));

-- Refresca el esquema de PostgREST para que la API detecte la nueva columna
NOTIFY pgrst, 'reload schema';