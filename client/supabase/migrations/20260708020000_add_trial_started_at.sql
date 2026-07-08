-- Track when a user first started a trial to prevent repeat trials
alter table public.profiles
  add column if not exists trial_started_at timestamptz;