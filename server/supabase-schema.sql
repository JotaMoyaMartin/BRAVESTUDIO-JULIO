-- BRÄVE Studio — Supabase Schema (idempotente)
-- Run this in your Supabase SQL editor — safe to run multiple times

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  salon_name text,
  is_active boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin', 'superadmin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Brand profiles table
create table if not exists brand_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null unique,
  raw_input text,
  salon_name text,
  city text,
  years_experience text,
  team_info text,
  services text[],
  main_services text[],
  most_profitable_service text,
  service_to_promote text,
  ideal_client text,
  ideal_client_age text,
  client_problems text,
  client_desires text,
  frequent_questions text,
  frequent_mistakes text,
  main_goal text,
  differentiation text,
  specialty text,
  content_topics text[],
  optimized_summary text,
  completion_status text not null default 'empty' check (completion_status in ('empty', 'partial', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Content items table
create table if not exists content_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('reel', 'carrusel', 'story')),
  title text not null,
  service text,
  objective text,
  format text,
  content_json jsonb not null default '{}',
  caption_with_hashtags text,
  visual_idea text,
  scheduled_date date,
  status text not null default 'library' check (status in ('library', 'scheduled', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS Policies
alter table profiles enable row level security;
alter table brand_profiles enable row level security;
alter table content_items enable row level security;

-- Anti-recursion helper: SECURITY DEFINER function that reads profiles
-- bypassing RLS. Using this inside profiles/promo_codes policies avoids the
-- "infinite recursion detected in policy" error that occurs when a policy
-- on `profiles` queries `profiles` directly.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  )
$$;

-- Drop existing policies first (idempotency)
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Admins can read all profiles" on profiles;
drop policy if exists "Admins can update all profiles" on profiles;
drop policy if exists "Superadmins can read all profiles" on profiles;
drop policy if exists "Superadmins can update all profiles" on profiles;
drop policy if exists "Users can manage own brand profile" on brand_profiles;
drop policy if exists "Users can manage own content" on content_items;
drop policy if exists "Admins can manage promo codes" on promo_codes;
drop policy if exists "Superadmins can manage promo codes" on promo_codes;

-- Profiles policies
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select using (public.is_admin());

create policy "Admins can update all profiles"
  on profiles for update using (public.is_admin());

-- Brand profiles policies
create policy "Users can manage own brand profile"
  on brand_profiles for all using (auth.uid() = user_id);

-- Content items policies
create policy "Users can manage own content"
  on content_items for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, is_active, role, access_status, access_source)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    false,
    'user',
    'inactive',
    'none'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at();

drop trigger if exists brand_profiles_updated_at on brand_profiles;
create trigger brand_profiles_updated_at before update on brand_profiles
  for each row execute procedure update_updated_at();

drop trigger if exists content_items_updated_at on content_items;
create trigger content_items_updated_at before update on content_items
  for each row execute procedure update_updated_at();

-- ============================================================
-- MIGRATION v2: SaaS access architecture
-- ============================================================

alter table profiles
  add column if not exists access_status text not null default 'inactive'
    check (access_status in ('active', 'inactive')),
  add column if not exists access_source text not null default 'none'
    check (access_source in ('manual', 'stripe', 'skool', 'promo', 'none')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text default 'none'
    check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'none')),
  add column if not exists subscription_plan text
    check (subscription_plan in ('monthly', 'yearly')),
  add column if not exists promo_code_used text;

update profiles set access_status = 'active', access_source = 'manual' where is_active = true;
update profiles set access_status = 'inactive', access_source = 'none' where is_active = false;

-- Promo codes table
create table if not exists promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  description text,
  is_active boolean not null default true,
  max_redemptions integer,
  redemptions_count integer not null default 0,
  access_days integer not null default 30,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table promo_codes enable row level security;

create policy "Admins can manage promo codes"
  on promo_codes for all using (public.is_admin());

create index if not exists idx_profiles_stripe_customer on profiles(stripe_customer_id);
create index if not exists idx_promo_codes_code on promo_codes(code);

-- ============================================================
-- MIGRATION v3: superadmin role
-- ============================================================

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('user', 'admin', 'superadmin'));

-- Para convertir tu usuario en superadmin, ejecuta:
-- update profiles set role = 'superadmin' where email = 'TU_EMAIL_AQUI';

-- ============================================================
-- MIGRATION v4: promo access expiration (lazy)
-- ============================================================

alter table profiles
  add column if not exists access_expires_at timestamptz;

-- ============================================================
-- MIGRATION v5: signup, onboarding, school codes
-- ============================================================

alter table promo_codes
  add column if not exists code_type text default 'promo' check (code_type in ('promo', 'skool'));

alter table profiles
  add column if not exists city text;

alter table profiles
  add column if not exists professional_role text;