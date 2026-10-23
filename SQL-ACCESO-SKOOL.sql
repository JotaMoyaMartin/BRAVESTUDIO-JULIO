-- ACCESO SKOOL (23-oct-2026)
-- Lista de miembros de Skool: quien está aquí como «activo» entra en la app
-- solo con su email. Se rellena desde Admin → Skool (subiendo la exportación).
-- Pégalo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.skool_members (
  email text primary key,
  name text,
  status text not null default 'activo' check (status in ('activo', 'baja')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  removed_at timestamptz
);

create index if not exists skool_members_status_idx on public.skool_members (status);

create table if not exists public.skool_imports (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  total int not null default 0,
  nuevas int not null default 0,
  bajas int not null default 0,
  by_email text
);

-- Solo el servidor (service role) lee y escribe: sin políticas para usuarias.
alter table public.skool_members enable row level security;
alter table public.skool_imports enable row level security;
