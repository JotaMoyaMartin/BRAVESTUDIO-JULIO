-- Añade done_at a content_items para el ecosistema de "realizadas" del Reto 10K
-- content_items.status es TEXT sin check constraint, así que 'done' se admite sin tocar constraints.
alter table public.content_items
  add column if not exists done_at timestamptz;

-- Refresca el esquema de PostgREST para que la API detecte la nueva columna
NOTIFY pgrst, 'reload schema';