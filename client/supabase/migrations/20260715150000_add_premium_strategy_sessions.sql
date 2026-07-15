-- Sesiones de estrategia premium (drafts + chat + publicación)
create table if not exists premium_strategy_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  admin_id uuid references profiles(id) on delete set null,
  transcription text,
  strategy_draft jsonb,
  chat_messages jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on premium_strategy_sessions(user_id);
create index on premium_strategy_sessions(status);

alter table premium_strategy_sessions enable row level security;

-- Solo admin puede ver y gestionar sesiones
create policy "admin_sessions" on premium_strategy_sessions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());