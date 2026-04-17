-- ============================================================
-- Finance Planner — Add updated_at to assets (idempotent)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Back-fill existing rows so updated_at = created_at
UPDATE public.assets
SET updated_at = created_at
WHERE updated_at = NOW()
  AND created_at < NOW() - INTERVAL '1 second';
