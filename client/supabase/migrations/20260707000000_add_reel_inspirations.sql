-- Inspiración Reels: galería de ideas gestionada por admin + guardados por usuario
-- Requiere: public.is_admin() ya definida en el schema (server/supabase-schema.sql líneas 75-85)

-- Tabla de inspiraciones (gestionadas por admin)
create table if not exists public.reel_inspirations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null,
  description text not null,
  idea_text text,
  why_text text,
  how_text text,
  cover_image text not null,          -- URL pública en bucket 'reel-inspirations'
  instagram_url text,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);

-- Tabla de guardados por usuario (join)
create table if not exists public.saved_inspirations (
  user_id uuid not null references public.profiles(id) on delete cascade,
  inspiration_id uuid not null references public.reel_inspirations(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, inspiration_id)
);

-- RLS reel_inspirations
alter table public.reel_inspirations enable row level security;

create policy "Cualquier usuario autenticado lee inspiraciones activas"
  on public.reel_inspirations for select
  to authenticated using (status = 'active');

create policy "Solo admin gestiona inspiraciones"
  on public.reel_inspirations for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- RLS saved_inspirations: usuario gestiona solo sus guardados
alter table public.saved_inspirations enable row level security;

create policy "Usuarios leen sus propios guardados"
  on public.saved_inspirations for select to authenticated
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propios guardados"
  on public.saved_inspirations for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Usuarios borran sus propios guardados"
  on public.saved_inspirations for delete to authenticated
  using (auth.uid() = user_id);

-- Storage bucket para portadas (público para lectura)
insert into storage.buckets (id, name, public) values ('reel-inspirations','reel-inspirations', true)
  on conflict (id) do nothing;

-- Políticas del bucket
create policy "Lectura pública de portadas"
  on storage.objects for select using (bucket_id = 'reel-inspirations');

create policy "Solo admin sube portadas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reel-inspirations' and public.is_admin());

create policy "Solo admin borra portadas"
  on storage.objects for delete to authenticated
  using (bucket_id = 'reel-inspirations' and public.is_admin());