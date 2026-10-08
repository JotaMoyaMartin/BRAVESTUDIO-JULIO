-- ═══════════════════════════════════════════════════════════════
-- CANVA SPIKE — pegar EN SUPABASE SQL EDITOR (8-oct-2026)
-- 3 tablas nuevas + 1 bucket privado. 100% aditivo, no toca nada existente.
-- ═══════════════════════════════════════════════════════════════

-- 1) Conexión Canva del equipo BRÄVE (tokens cifrados con lib/crypto.ts).
create table if not exists public.canva_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  scopes text not null default '',
  status text not null default 'active'
    check (status in ('active','token_expired','revoked','error')),
  account_metadata jsonb,
  last_refreshed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.canva_connections enable row level security;
-- Sin policies: solo service_role (server) accede. Tokens jamás al browser.

-- 2) Plantilla (diseño Canva importado con susbindings). provider/kind genéricos
-- para soportar carruseles después sin reescribir.
create table if not exists public.design_templates (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'canva',
  provider_design_id text not null,
  name text not null,
  category text,
  kind text not null default 'story' check (kind in ('story','carousel')),
  page_count int not null default 1,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  preview_storage_path text,
  dataset jsonb not null default '{}',   -- {campo: {type: text|image|chart|sheet}}
  bindings jsonb not null default '{}',  -- {campo: {behavior, label, purpose, maxLength, instructions, keepDefault}}
  source jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_design_id)
);
alter table public.design_templates enable row level security;
-- Usuarias ven solo publicadas; admin escribe via service_role.
create policy "design_templates published visibles"
  on public.design_templates for select to authenticated
  using (status = 'published');

-- 3) Proyecto de generación de una usuaria (valores + resultado PNG).
create table if not exists public.design_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.design_templates(id) on delete cascade,
  values jsonb not null default '{}',
  generated_design_id text,
  assets jsonb not null default '[]',
  status text not null default 'completed'
    check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
alter table public.design_projects enable row level security;
create policy "design_projects propios"
  on public.design_projects for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Bucket privado para los PNG generados (resultados de usuarias).
insert into storage.buckets (id, name, public)
values ('design-exports', 'design-exports', false)
on conflict (id) do nothing;