-- ─────────────────────────────────────────────────────────────────────
-- Credenciales Metricool por clienta premium.
-- La CM/admin las configura en el Modo Equipo (screen Métricas).
-- Se usan para sincronizar metricool_metrics vía API de Metricool (plan Advanced).
-- user_token se guarda en texto plano por ahora (RLS lo protege del resto de users).
-- ─────────────────────────────────────────────────────────────────────

create table if not exists metricool_config (
  user_id uuid primary key references profiles(id) on delete cascade,
  blog_id text not null,
  user_token text not null,
  metricool_user_id text not null,  -- userId numérico de Metricool
  networks text[] not null default array['instagram'],
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table metricool_config enable row level security;

drop policy if exists "users read own config" on metricool_config;
create policy "users read own config"
  on metricool_config for select
  using (auth.uid() = user_id);

drop policy if exists "users update own config" on metricool_config;
create policy "users update own config"
  on metricool_config for update
  using (auth.uid() = user_id);

drop policy if exists "admins all config" on metricool_config;
create policy "admins all config"
  on metricool_config for all
  using (public.is_admin());

notify pgrst, 'reload schema';