-- ─────────────────────────────────────────────────────────────────────
-- Métricas mensuales por red social, sincronizadas desde Metricool.
-- Una fila por (user_id, month, network). raw_json conserva la respuesta
-- completa por si añadimos más KPIs en el futuro sin migrar de nuevo.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists metricool_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  month date not null,  -- primer día del mes (YYYY-MM-01)
  network text not null,
  followers int,
  reach int,
  impressions int,
  engagement_rate numeric,
  posts_count int,
  raw_json jsonb,
  fetched_at timestamptz not null default now(),
  unique (user_id, month, network)
);

create index if not exists metricool_metrics_user_idx on metricool_metrics(user_id, month);

alter table metricool_metrics enable row level security;

drop policy if exists "users read own metrics" on metricool_metrics;
create policy "users read own metrics"
  on metricool_metrics for select
  using (auth.uid() = user_id);

drop policy if exists "admins all metrics" on metricool_metrics;
create policy "admins all metrics"
  on metricool_metrics for all
  using (public.is_admin());

notify pgrst, 'reload schema';