-- Banco de Ganchos: favoritos por usuario.
-- Los ganchos son datos estáticos (lib/ganchos.ts), no filas de BD —
-- aquí se guarda un snapshot del gancho estrellado por la usuaria.

create table if not exists public.saved_ganchos (
  user_id uuid not null references public.profiles(id) on delete cascade,
  gancho_id text not null,
  category_id text not null,
  text text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, gancho_id)
);

-- RLS: usuario gestiona solo sus favoritos
alter table public.saved_ganchos enable row level security;

create policy "Usuarios leen sus propios favoritos"
  on public.saved_ganchos for select to authenticated
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propios favoritos"
  on public.saved_ganchos for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Usuarios borran sus propios favoritos"
  on public.saved_ganchos for delete to authenticated
  using (auth.uid() = user_id);