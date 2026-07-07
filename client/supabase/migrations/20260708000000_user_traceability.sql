-- ============================================================
-- MIGRATION: User traceability + activity log + promo redemptions
-- ============================================================

-- A) Trazabilidad de activación en profiles
alter table public.profiles
  add column if not exists activated_by uuid references public.profiles(id) on delete set null,
  add column if not exists activated_at timestamptz,
  add column if not exists signup_method text not null default 'signup'
    check (signup_method in ('signup','admin_create','skool','stripe_checkout','promo'));

-- B) Historial de actividad
create table if not exists public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'account_created','access_activated','access_deactivated',
    'role_changed','promo_redeemed','stripe_subscription_created',
    'stripe_subscription_canceled','stripe_payment_failed'
  )),
  event_data jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id) on delete set null, -- quién lo hizo (null = sistema)
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_log_user on public.user_activity_log(user_id, created_at desc);
create index if not exists idx_activity_log_event on public.user_activity_log(event_type);

alter table public.user_activity_log enable row level security;
create policy "Admins leen historial de actividad"
  on public.user_activity_log for select to authenticated
  using (public.is_admin());
create policy "Sistema/admins insertan historial"
  on public.user_activity_log for insert to authenticated
  with check (public.is_admin() or auth.uid() = user_id);
-- delete/update solo service role (bypass RLS)

-- C) Canjes de promo codes
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  redeemed_at timestamptz not null default now(),
  unique (user_id, code)
);
alter table public.promo_redemptions enable row level security;
create policy "Admins leen canjes promo"
  on public.promo_redemptions for select to authenticated
  using (public.is_admin());
create policy "Usuarios canjan su propio promo"
  on public.promo_redemptions for insert to authenticated
  with check (auth.uid() = user_id);

-- D) Función helper para log (usable desde triggers y API routes)
create or replace function public.log_user_activity(
  p_user_id uuid, p_event text, p_data jsonb default null, p_actor uuid default null
) returns void as $$
begin
  insert into public.user_activity_log (user_id, event_type, event_data, actor_id)
  values (p_user_id, p_event, coalesce(p_data, '{}'::jsonb), p_actor);
end;
$$ language plpgsql security definer;

-- E) Trigger para log automático al crear cuenta
create or replace function public.log_new_user()
returns trigger as $$
begin
  perform public.log_user_activity(new.id, 'account_created',
    jsonb_build_object('email', new.email, 'signup_method', new.signup_method));
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.log_new_user();