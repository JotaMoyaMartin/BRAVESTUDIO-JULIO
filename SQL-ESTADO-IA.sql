-- ESTADO DE LA IA (23-oct-2026)
-- Registro de fallos de la IA para el panel de admin y los avisos por email.
-- Pégalo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.ai_status_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  ok boolean not null default false,
  section text,
  reason text,
  detail text,
  model text,
  user_id uuid
);

create index if not exists ai_status_log_created_idx on public.ai_status_log (created_at desc);

-- Solo el servidor (service role) lee y escribe: sin políticas para las usuarias.
alter table public.ai_status_log enable row level security;

-- Limpieza: borra registros de más de 30 días cada vez que se ejecute.
delete from public.ai_status_log where created_at < now() - interval '30 days';
