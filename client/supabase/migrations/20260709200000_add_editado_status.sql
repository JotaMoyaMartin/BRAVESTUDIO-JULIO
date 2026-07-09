-- Reto 10K: añade el estado "editado" (🔵) al semáforo de las tarjetas del reto.
-- Estados: idea / grabado / editado / publicado
-- La constraint anterior solo permitía idea/grabado/publicado; la reemplazamos.

alter table public.content_items
  drop constraint if exists content_items_reto_status_check;

alter table public.content_items
  add constraint content_items_reto_status_check
  check (reto_status in ('idea','grabado','editado','publicado'));

-- Refresca el esquema de PostgREST para que la API detecte el nuevo valor
NOTIFY pgrst, 'reload schema';