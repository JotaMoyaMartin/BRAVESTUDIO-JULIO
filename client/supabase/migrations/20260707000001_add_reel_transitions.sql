-- Transiciones Reels: galería de ideas de transiciones gestionada por admin
-- Replica del patrón de reel_inspirations (20260707000000_add_reel_inspirations.sql)
-- Requiere: public.is_admin() ya definida en el schema (server/supabase-schema.sql líneas 75-85)

-- Tabla de transiciones (gestionadas por admin)
create table if not exists public.reel_transitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null,
  description text not null,
  idea_text text,
  why_text text,
  how_text text,
  cover_image text not null,          -- URL pública en bucket 'reel-transitions'
  instagram_url text,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);

-- RLS reel_transitions
alter table public.reel_transitions enable row level security;

create policy "Cualquier usuario autenticado lee transiciones activas"
  on public.reel_transitions for select
  to authenticated using (status = 'active');

create policy "Solo admin gestiona transiciones"
  on public.reel_transitions for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage bucket para portadas (público para lectura)
insert into storage.buckets (id, name, public) values ('reel-transitions','reel-transitions', true)
  on conflict (id) do nothing;

-- Políticas del bucket
create policy "Lectura pública de portadas de transiciones"
  on storage.objects for select using (bucket_id = 'reel-transitions');

create policy "Solo admin sube portadas de transiciones"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reel-transitions' and public.is_admin());

create policy "Solo admin borra portadas de transiciones"
  on storage.objects for delete to authenticated
  using (bucket_id = 'reel-transitions' and public.is_admin());