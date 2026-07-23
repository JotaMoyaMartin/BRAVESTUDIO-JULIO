-- Chat conversacional del Modo Equipo: asistente IA context-aware por clienta.
-- Una fila por (client_user_id, actor_id). messages es jsonb[] como en premium_strategy_sessions.
create table if not exists team_client_chats (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references profiles(id) on delete cascade,
  actor_id text not null,            -- u-jota, u-nahir, ... (Modo Equipo auth mock)
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_user_id, actor_id)
);

create index if not exists team_client_chats_client_actor_idx
  on team_client_chats(client_user_id, actor_id);

alter table team_client_chats enable row level security;

-- El Modo Equipo usa service-role (admin client) en las API routes, así que
-- RLS no bloquea nada en la práctica. Lo dejamos restrictivo por defecto:
-- solo admin (de perfiles) puede leer/escribir. Las rutas /team/api/* usan
-- createAdminClient() que bypassa RLS.
drop policy if exists "admin_all_team_client_chats" on team_client_chats;
create policy "admin_all_team_client_chats" on team_client_chats
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';