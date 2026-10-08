-- STORIES DISEÑO — versión publicada de las plantillas.
-- Editing a published template does NOT break the gallery: the usuaria sees
-- published_slides (frozen at publish time). Republish overwrites + bumps
-- published_version. Empty published_slides → gallery falls back to slides.
ALTER TABLE story_design_templates
  ADD COLUMN IF NOT EXISTS published_slides jsonb,
  ADD COLUMN IF NOT EXISTS published_version int NOT NULL DEFAULT 0;