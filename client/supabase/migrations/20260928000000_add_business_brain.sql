-- ─────────────────────────────────────────────────────────────────────
-- FASE 1 — BUSINESS BRAIN (aditiva, retrocompatible).
-- 1) brand_profiles: shows_face (restricción de producción de cámara) y
--    main_priority (prioridad ÚNICA de marketing que decide BRÄVE).
-- 2) brain_observations: aprendizaje progresivo append-only (F1: esquema
--    + escrituras manuales al editar; engine automático = Fase 2).
-- Ver docs/BUSINESS-BRAIN.md §2.
-- ─────────────────────────────────────────────────────────────────────

alter table brand_profiles
  add column if not exists shows_face text not null default ''
    constraint brand_profiles_shows_face_check
      check (shows_face in ('talk', 'appear', 'work_only', 'no', ''));

alter table brand_profiles
  add column if not exists main_priority text
    constraint brand_profiles_main_priority_check
      check (main_priority in ('citas', 'descubrir', 'reconocimiento', 'servicio', 'constancia', 'valor'));

create table if not exists brain_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('learning', 'integration', 'manual')),
  observation text not null check (char_length(observation) <= 2000),
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_brain_observations_user
  on brain_observations (user_id, created_at desc);

alter table brain_observations enable row level security;

-- Owner: solo lectura e inserción (append-only, sin update/delete).
drop policy if exists "owner_select_brain_observations" on brain_observations;
create policy "owner_select_brain_observations" on brain_observations
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "owner_insert_brain_observations" on brain_observations;
create policy "owner_insert_brain_observations" on brain_observations
  for insert to authenticated
  with check (user_id = auth.uid());

-- Admin: acceso completo (is_admin() ya existe en la base).
drop policy if exists "admin_all_brain_observations" on brain_observations;
create policy "admin_all_brain_observations" on brain_observations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';