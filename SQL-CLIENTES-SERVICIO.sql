-- CLIENTES DEL SERVICIO (24-oct-2026)
-- Lo que la clienta envía a su equipo: material (fotos/vídeos) e ideas.
-- (Lo que el equipo publica sale de la planificación del panel del equipo.)
-- Pégalo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.equipo_peticiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('material', 'idea')),
  titulo text,
  mensaje text,
  archivos jsonb not null default '[]',
  origen jsonb,
  estado text not null default 'nueva' check (estado in ('nueva', 'en-marcha', 'hecha')),
  respuesta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipo_peticiones_user on public.equipo_peticiones (user_id, created_at desc);
create index if not exists equipo_peticiones_estado on public.equipo_peticiones (estado, created_at desc);

alter table public.equipo_peticiones enable row level security;

-- Cada clienta ve solo lo suyo. El equipo trabaja desde el admin (servidor).
drop policy if exists "ver mis peticiones" on public.equipo_peticiones;
create policy "ver mis peticiones" on public.equipo_peticiones for select using (auth.uid() = user_id);
