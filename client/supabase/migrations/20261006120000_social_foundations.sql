-- ─────────────────────────────────────────────────────────────────────
-- FASE 1 — INSTAGRAM CONECTADO (fundaciones sociales, aditiva).
-- 5 tablas: conexión (token cifrado), métricas diarias, media, log de
-- sincronización y diagnoses (F3 la llenará; aquí solo esquema).
-- RLS owner-only (auth.uid() = user_id) + admin vía public.is_admin()
-- ya existente en la base.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null
    constraint social_connections_provider_check
      check (provider in ('instagram', 'tiktok', 'google_business')),
  provider_account_id text not null,
  username text,
  avatar_url text,
  account_type text,
  -- Token long-lived cifrado AES-256-GCM (lib/crypto.ts). NUNCA en claro.
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active'
    constraint social_connections_status_check
      check (status in ('active', 'token_expired', 'revoked', 'error')),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_social_connections_user
  on social_connections (user_id, provider);

alter table social_connections enable row level security;

drop policy if exists "owner_all_social_connections" on social_connections;
create policy "owner_all_social_connections" on social_connections
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "admin_all_social_connections" on social_connections;
create policy "admin_all_social_connections" on social_connections
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────

create table if not exists social_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null,
  date date not null,
  followers int,
  reach int,
  views int,
  total_interactions int,
  accounts_engaged int,
  follows int,
  unfollows int,
  profile_links_taps int,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, provider, date)
);

create index if not exists idx_social_metrics_daily_user
  on social_metrics_daily (user_id, provider, date);

alter table social_metrics_daily enable row level security;

drop policy if exists "owner_select_social_metrics_daily" on social_metrics_daily;
create policy "owner_select_social_metrics_daily" on social_metrics_daily
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "owner_insert_social_metrics_daily" on social_metrics_daily;
create policy "owner_insert_social_metrics_daily" on social_metrics_daily
  for insert to authenticated
  with check (user_id = auth.uid());

-- Owner necesita delete para desconectar (borrado completo de sus datos).
drop policy if exists "owner_delete_social_metrics_daily" on social_metrics_daily;
create policy "owner_delete_social_metrics_daily" on social_metrics_daily
  for delete to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────

create table if not exists social_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null,
  media_id text not null,
  media_type text,
  media_product_type text,
  caption text,
  posted_at timestamptz,
  permalink text,
  thumbnail_url text,
  metrics jsonb not null default '{}',
  themes jsonb,
  fetched_at timestamptz not null default now(),
  unique (user_id, provider, media_id)
);

create index if not exists idx_social_media_user
  on social_media (user_id, provider, posted_at desc nulls last);

alter table social_media enable row level security;

drop policy if exists "owner_select_social_media" on social_media;
create policy "owner_select_social_media" on social_media
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "owner_insert_social_media" on social_media;
create policy "owner_insert_social_media" on social_media
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "owner_delete_social_media" on social_media;
create policy "owner_delete_social_media" on social_media
  for delete to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────

create table if not exists social_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text,
  kind text,
  result text,
  error jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_sync_log_user
  on social_sync_log (user_id, created_at desc);

alter table social_sync_log enable row level security;

drop policy if exists "owner_select_social_sync_log" on social_sync_log;
create policy "owner_select_social_sync_log" on social_sync_log
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "owner_insert_social_sync_log" on social_sync_log;
create policy "owner_insert_social_sync_log" on social_sync_log
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "owner_delete_social_sync_log" on social_sync_log;
create policy "owner_delete_social_sync_log" on social_sync_log
  for delete to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- social_diagnoses — F3 escribe aquí (motor de diagnóstico). F1: esquema.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists social_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  provider text,
  payload jsonb,
  generated_at timestamptz
);

alter table social_diagnoses enable row level security;

drop policy if exists "owner_all_social_diagnoses" on social_diagnoses;
create policy "owner_all_social_diagnoses" on social_diagnoses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "admin_all_social_diagnoses" on social_diagnoses;
create policy "admin_all_social_diagnoses" on social_diagnoses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';