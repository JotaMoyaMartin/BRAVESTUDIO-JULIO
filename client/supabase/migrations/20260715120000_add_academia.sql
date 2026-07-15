-- Academia BRÄVE: módulos, lecciones (Loom) y progreso

-- Módulos (categorías personalizables)
create table if not exists academia_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clases (lecciones dentro de módulos)
create table if not exists academia_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references academia_modules(id) on delete cascade,
  title text not null,
  description text,
  loom_url text not null,
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Progreso por usuaria
create table if not exists academia_lesson_progress (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references academia_lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- RLS
alter table academia_modules enable row level security;
alter table academia_lessons enable row level security;
alter table academia_lesson_progress enable row level security;

-- Lectura: usuarias autenticadas pueden ver módulos y lecciones activas
create policy "read_modules" on academia_modules for select to authenticated using (status = 'active');
create policy "read_lessons" on academia_lessons for select to authenticated using (status = 'active');

-- Escritura: solo admin
create policy "admin_write_modules" on academia_modules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_lessons" on academia_lessons for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Progreso: cada usuaria gestiona el suyo
create policy "user_progress_read" on academia_lesson_progress for select to authenticated using (auth.uid() = user_id);
create policy "user_progress_write" on academia_lesson_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "user_progress_update" on academia_lesson_progress for update to authenticated using (auth.uid() = user_id);