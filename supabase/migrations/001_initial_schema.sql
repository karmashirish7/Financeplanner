-- ============================================================
-- Finance Planner — Initial Schema
-- Run this in the Supabase SQL Editor (project: wuddihnieenuqcopeybw)
-- ============================================================

-- ── Categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color        TEXT NOT NULL DEFAULT '#6b7280',
  icon         TEXT NOT NULL DEFAULT '📦',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Accounts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'wallet')),
  balance      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Transactions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type         TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount       NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  date         DATE NOT NULL,
  notes        TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Assets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'other',
  value        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Goals ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  target_amount        NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  current_amount       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deadline             TIMESTAMPTZ,
  monthly_contribution NUMERIC(14, 2) NOT NULL DEFAULT 0,
  color                TEXT NOT NULL DEFAULT '#10b981',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Budgets ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, month, year)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category   ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account    ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month      ON public.budgets(user_id, year, month);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets      ENABLE ROW LEVEL SECURITY;

-- Categories: user sees only their own rows
CREATE POLICY "categories_owner" ON public.categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Accounts
CREATE POLICY "accounts_owner" ON public.accounts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Transactions
CREATE POLICY "transactions_owner" ON public.transactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Assets
CREATE POLICY "assets_owner" ON public.assets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Goals
CREATE POLICY "goals_owner" ON public.goals
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Budgets
CREATE POLICY "budgets_owner" ON public.budgets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Trigger: seed default categories for every new user
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    -- Expense categories
    (NEW.id, 'Food & Dining',   'expense', '#ef4444', '🍔'),
    (NEW.id, 'Rent',            'expense', '#f97316', '🏠'),
    (NEW.id, 'Transport',       'expense', '#eab308', '🚌'),
    (NEW.id, 'Utilities',       'expense', '#84cc16', '💡'),
    (NEW.id, 'Health',          'expense', '#06b6d4', '🏥'),
    (NEW.id, 'Entertainment',   'expense', '#8b5cf6', '🎬'),
    (NEW.id, 'Shopping',        'expense', '#ec4899', '🛍️'),
    (NEW.id, 'Education',       'expense', '#3b82f6', '📚'),
    (NEW.id, 'Other',           'expense', '#6b7280', '📦'),
    -- Income categories
    (NEW.id, 'Salary',          'income',  '#10b981', '💼'),
    (NEW.id, 'Freelance',       'income',  '#6366f1', '💻'),
    (NEW.id, 'Business',        'income',  '#f59e0b', '🏪'),
    (NEW.id, 'Interest',        'income',  '#14b8a6', '🏦'),
    (NEW.id, 'Other Income',    'income',  '#a3e635', '💰');
  RETURN NEW;
END;
$$;

-- Drop and re-create to make it idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();
