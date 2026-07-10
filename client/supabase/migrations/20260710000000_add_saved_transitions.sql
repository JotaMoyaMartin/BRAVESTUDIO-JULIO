-- Transiciones Reels: guardados por usuario (mirror de saved_inspirations)
-- Requiere: public.reel_transitions ya definida

-- Tabla de guardados por usuario (join)
create table if not exists public.saved_transitions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  transition_id uuid not null references public.reel_transitions(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, transition_id)
);

-- RLS saved_transitions: usuario gestiona solo sus guardados
alter table public.saved_transitions enable row level security;

create policy "Usuarios leen sus propios guardados"
  on public.saved_transitions for select to authenticated
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propios guardados"
  on public.saved_transitions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Usuarios borran sus propios guardados"
  on public.saved_transitions for delete to authenticated
  using (auth.uid() = user_id);