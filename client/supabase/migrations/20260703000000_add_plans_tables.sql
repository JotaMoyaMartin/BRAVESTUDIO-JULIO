-- ─────────────────────────────────────────────────────────────────
-- Plans + Plan Price History
-- Dynamic plan/pricing management for admin, landing, and checkout.
-- ─────────────────────────────────────────────────────────────────

-- ── plans ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name               TEXT NOT NULL CHECK (name IN ('monthly', 'yearly')),
  display_name       TEXT NOT NULL,
  "interval"         TEXT NOT NULL CHECK ("interval" IN ('month', 'year')),
  currency           TEXT NOT NULL CHECK (currency IN ('eur', 'usd')),
  current_price      NUMERIC(10,2) NOT NULL,
  original_price     NUMERIC(10,2),
  stripe_product_id  TEXT,
  stripe_price_id    TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  is_visible         BOOLEAN NOT NULL DEFAULT true,
  trial_days         INT NOT NULL DEFAULT 3,
  badge_text         TEXT,
  description        TEXT,
  features           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, currency)
);

-- ── plan_price_history ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_price_history (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id             BIGINT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  old_price           NUMERIC(10,2),
  new_price           NUMERIC(10,2),
  old_stripe_price_id TEXT,
  new_stripe_price_id TEXT,
  changed_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plans_currency_active
  ON public.plans(currency, is_active);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id
  ON public.plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_plan_history_plan_id
  ON public.plan_price_history(plan_id);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_price_history ENABLE ROW LEVEL SECURITY;

-- Public can read visible + active plans (for landing/pricing).
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT
  USING (is_visible = true AND is_active = true);

-- Admin/superadmin can do everything with plans.
DROP POLICY IF EXISTS "plans_admin_all" ON public.plans;
CREATE POLICY "plans_admin_all" ON public.plans
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- History: admin can read + insert.
DROP POLICY IF EXISTS "plan_history_admin_read" ON public.plan_price_history;
CREATE POLICY "plan_history_admin_read" ON public.plan_price_history
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "plan_history_admin_insert" ON public.plan_price_history;
CREATE POLICY "plan_history_admin_insert" ON public.plan_price_history
  FOR INSERT
  WITH CHECK (public.is_admin());

-- ── updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plans_touch_updated_at ON public.plans;
CREATE TRIGGER plans_touch_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();