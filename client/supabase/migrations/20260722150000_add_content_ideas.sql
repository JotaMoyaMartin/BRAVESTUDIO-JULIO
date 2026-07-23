-- ─────────────────────────────────────────────────────────────────────
-- Ideas propuestas para el Plan de Contenidos estratégico de clientas premium
--
-- Flujo: CM/admin usa el Modo Equipo → "Generar ideas con IA" → se crean
-- ideas con status='propuesta' → la CM confirma/descarta → para cada idea
-- confirmada se genera un guion BRÄVE que vive en content_items(tag='premium-script')
-- y se enlaza aquí via script_id. La clienta premium las ve en /plan-contenidos
-- y marca como 'hecha' cuando completa la pieza.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists content_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  order_idx int not null default 0,
  title text not null,
  type text not null check (type in ('reel','carrusel','story')),
  pillar text,
  objective text,
  service text,
  hook_idea text,
  status text not null default 'propuesta'
    check (status in ('propuesta','confirmada','descartada','guion_listo','hecha')),
  script_id uuid,  -- referencia a content_items.id cuando se genere el guion
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_ideas_user_idx on content_ideas(user_id, order_idx);

alter table content_ideas enable row level security;

drop policy if exists "users read own ideas" on content_ideas;
create policy "users read own ideas"
  on content_ideas for select
  using (auth.uid() = user_id);

drop policy if exists "users write own ideas" on content_ideas;
create policy "users write own ideas"
  on content_ideas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admins all ideas" on content_ideas;
create policy "admins all ideas"
  on content_ideas for all
  using (public.is_admin());

notify pgrst, 'reload schema';