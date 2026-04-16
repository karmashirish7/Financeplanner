-- ============================================================
-- Metal Rates — Daily scraped gold/silver rates from fenegosida.org
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Table: precious_metal_rates ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.precious_metal_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metal         TEXT NOT NULL CHECK (metal IN ('gold', 'silver')),
  rate_per_tola NUMERIC(12, 2) NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metal, date)
);

ALTER TABLE public.precious_metal_rates ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read rates (they are shared/public data, not personal)
DO $$ BEGIN
  CREATE POLICY "metal_rates_select" ON public.precious_metal_rates
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only the service role (edge function) can insert / update — no policy needed for that.

-- ── Add tola-quantity columns to assets ──────────────────────
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS quantity_tola NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS rate_mode     TEXT NOT NULL DEFAULT 'auto'
    CHECK (rate_mode IN ('auto', 'manual'));

-- ============================================================
-- pg_cron schedule: 11:00 AM NPT = 05:15 UTC
-- ============================================================
-- Prerequisites (enable once in Supabase Dashboard → Database → Extensions):
--   • pg_cron
--   • pg_net
--
-- Then run this block after replacing YOUR_SERVICE_ROLE_KEY:
--
-- SELECT cron.schedule(
--   'scrape-metal-rates-daily',
--   '15 5 * * *',
--   $$
--   SELECT net.http_post(
--     url     := 'https://wuddihnieenuqcopeybw.supabase.co/functions/v1/scrape-metal-rates',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body    := '{}'::jsonb
--   )::text;
--   $$
-- );
--
-- To remove the schedule later:
-- SELECT cron.unschedule('scrape-metal-rates-daily');
