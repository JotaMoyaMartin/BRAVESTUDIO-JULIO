-- Añade columna posts_per_week al progreso del Reto 10K
alter table public.reto_10k_progress
  add column if not exists posts_per_week int not null default 4;

-- Actualiza filas existentes sin valor explícito (el default cubre nuevas, pero aseguramos)
update public.reto_10k_progress
  set posts_per_week = 4
  where posts_per_week is null;

-- Refresca el esquema de PostgREST para que la API lo detecte
NOTIFY pgrst, 'reload schema';