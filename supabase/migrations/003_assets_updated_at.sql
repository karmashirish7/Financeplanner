-- ============================================================
-- Finance Planner — Add updated_at to assets (idempotent)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
