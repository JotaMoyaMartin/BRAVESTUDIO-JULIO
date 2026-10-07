-- STORIES DISEÑO — Fase 2: packs y plantillas (autoría admin → publicación → catálogo usuaria)
-- Pegar en Supabase SQL Editor (patrón reel_inspirations; requiere public.is_admin()).

create table if not exists public.story_design_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  goal text not null check (goal in ('vender','captar','educar','fidelizar','autoridad')),
  description text not null,
  flow_type text not null default 'single-goal' check (flow_type in ('single-goal','sequence-launch','nurture','capture')),
  story_count integer not null default 0,
  published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_design_templates (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.story_design_packs(id) on delete cascade,
  slug text not null,
  title text not null,
  category text not null,
  description text not null,
  recommended_use text not null default '',
  cover_image text,
  is_locked boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  sort integer not null default 0,
  tags text[] not null default '{}',
  default_style jsonb not null default '{}'::jsonb,
  slides jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pack_id, slug)
);

create index if not exists story_design_templates_pack_idx
  on public.story_design_templates (pack_id, sort);

-- RLS
alter table public.story_design_packs enable row level security;
alter table public.story_design_templates enable row level security;

create policy "Usuarias leen packs publicados"
  on public.story_design_packs for select to authenticated
  using (published = true);

create policy "Solo admin gestiona packs"
  on public.story_design_packs for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Usuarias leen plantillas publicadas de packs publicados"
  on public.story_design_templates for select to authenticated
  using (
    status = 'published' and exists (
      select 1 from public.story_design_packs p
      where p.id = pack_id and p.published = true
    )
  );

create policy "Solo admin gestiona plantillas"
  on public.story_design_templates for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Nota: el admin CRUD no depende de estas políticas — usa el client de
-- servicio (lib/supabase/admin) en /api/stories-diseno/admin, igual que
-- inspiraciones. Las políticas cubren las lecturas directas desde la app.