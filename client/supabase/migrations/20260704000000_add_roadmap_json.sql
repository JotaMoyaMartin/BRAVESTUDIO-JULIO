-- Añade columna roadmap_json a brand_profiles para persistir la Hoja de Ruta BRÄVE
alter table public.brand_profiles
  add column if not exists roadmap_json jsonb;

comment on column public.brand_profiles.roadmap_json is
  'Hoja de Ruta BRÄVE generada por IA: fases personalizadas con tareas, estado, progreso.';