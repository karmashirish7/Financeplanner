-- ============================================================
-- Finance Planner — Liabilities Table
-- Run this in the Supabase SQL Editor (project: wuddihnieenuqcopeybw)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.liabilities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('loan', 'credit_card', 'mortgage', 'student_loan', 'other')) DEFAULT 'other',
  balance          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  interest_rate    NUMERIC(6, 2),         -- annual %, optional
  minimum_payment  NUMERIC(14, 2),        -- monthly minimum, optional
  due_day          INTEGER CHECK (due_day BETWEEN 1 AND 31), -- day of month for payment, optional
  color            TEXT NOT NULL DEFAULT '#ef4444',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liabilities_user ON public.liabilities(user_id);

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liabilities_owner" ON public.liabilities
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
