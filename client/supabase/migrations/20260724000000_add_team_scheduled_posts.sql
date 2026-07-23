-- ─────────────────────────────────────────────────────────────────────
-- Posts programados vía Metricool desde las planificaciones del Modo Equipo.
-- Una fila por (publication_id, network). El equipo lanza la programación
-- desde PlanningWorkspace cuando la planificación está aprobada.
-- RLS solo admin (las rutas /team/api/* usan createAdminClient que la bypassa).
-- ─────────────────────────────────────────────────────────────────────

create table if not exists team_scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references profiles(id) on delete cascade,
  planning_id text not null,
  publication_id text not null,
  network text not null,
  metricool_post_id text,
  status text not null default 'pending',
  scheduled_at timestamptz,
  media_url text,
  caption text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (publication_id, network)
);

create index if not exists team_scheduled_posts_planning_idx on team_scheduled_posts(planning_id);
create index if not exists team_scheduled_posts_client_idx on team_scheduled_posts(client_user_id);

alter table team_scheduled_posts enable row level security;

drop policy if exists "admin_all_team_scheduled_posts" on team_scheduled_posts;
create policy "admin_all_team_scheduled_posts" on team_scheduled_posts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';