-- EQUIPO BRÄVE · FASE 1 (24-oct-2026)
-- 1) Quién es del equipo y con qué rol (cuentas reales, nada de contraseñas en el código).
-- 2) Los datos del panel del equipo (planificaciones, tareas, avisos, productividad,
--    clientas) en la base de datos, compartidos por todo el equipo.
-- Pégalo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.team_members (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  member_id text unique not null,              -- id que usa el panel (p. ej. tm-nahir)
  name text not null,
  role text not null check (role in ('admin', 'cm', 'editor', 'designer')),
  created_at timestamptz not null default now()
);

-- ¿La usuaria con sesión es del equipo? (security definer: sin bucles de RLS)
create or replace function public.is_team_member() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.team_members where profile_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin'))
$$;
grant execute on function public.is_team_member() to authenticated;

create table if not exists public.team_records (
  kind text not null,                          -- planning, task, notification, client, member, prod-task…
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (kind, id)
);
create index if not exists team_records_kind_updated on public.team_records (kind, updated_at desc);

alter table public.team_members enable row level security;
alter table public.team_records enable row level security;

drop policy if exists "equipo ve al equipo" on public.team_members;
create policy "equipo ve al equipo" on public.team_members for select using (public.is_team_member());

drop policy if exists "equipo lee datos" on public.team_records;
create policy "equipo lee datos" on public.team_records for select using (public.is_team_member());
drop policy if exists "equipo crea datos" on public.team_records;
create policy "equipo crea datos" on public.team_records for insert with check (public.is_team_member());
drop policy if exists "equipo cambia datos" on public.team_records;
create policy "equipo cambia datos" on public.team_records for update using (public.is_team_member());
