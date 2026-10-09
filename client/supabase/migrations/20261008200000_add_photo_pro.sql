-- FOTO PRO — Retoque Pro: jobs de edición fotográfica con IA.
-- Pegar en Supabase SQL Editor.

create table if not exists public.photo_edit_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_path text not null,
  result_path text,
  mode text not null check (mode in ('face','hair','background','general')),
  intensity int not null check (intensity >= 1 and intensity <= 5),
  provider text,
  provider_job_id text,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  error_code text,
  error_message text,
  saved boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists photo_edit_jobs_user_created_idx
  on public.photo_edit_jobs (user_id, created_at desc);

alter table public.photo_edit_jobs enable row level security;

drop policy if exists "Fotos: gestionar los propios jobs" on public.photo_edit_jobs;
create policy "Fotos: gestionar los propios jobs"
  on public.photo_edit_jobs for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);