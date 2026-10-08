-- STORIES DISEÑO rework: status 'archived' + favoritos por usuaria.
-- Pegar en Supabase SQL Editor.

alter table public.story_design_templates
  drop constraint if exists story_design_templates_status_check;

alter table public.story_design_templates
  add constraint story_design_templates_status_check
  check (status in ('draft','published','archived'));

create table if not exists public.story_design_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.story_design_templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

alter table public.story_design_favorites enable row level security;

drop policy if exists "Favoritos: leer los propios" on public.story_design_favorites;
create policy "Favoritos: leer los propios"
  on public.story_design_favorites for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Favoritos: crear los propios" on public.story_design_favorites;
create policy "Favoritos: crear los propios"
  on public.story_design_favorites for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Favoritos: borrar los propios" on public.story_design_favorites;
create policy "Favoritos: borrar los propios"
  on public.story_design_favorites for delete to authenticated
  using (auth.uid() = user_id);