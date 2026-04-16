/**
 * scrape-metal-rates — Supabase Edge Function
 *
 * Scrapes today's Fine Gold and Silver tola rates from fenegosida.org,
 * upserts them into `precious_metal_rates`, then updates every user's
 * gold/silver asset that is set to "auto" rate mode.
 *
 * Scheduled via pg_cron at 05:15 UTC (11:00 AM Nepal Time, UTC+5:45).
 * Can also be triggered manually from the app via supabase.functions.invoke().
 *
 * Deploy:
 *   npx supabase functions deploy scrape-metal-rates --project-ref wuddihnieenuqcopeybw
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FENEGOSIDA    = 'https://www.fenegosida.org/'

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    // ── 1. Fetch the page ──────────────────────────────────
    const res = await fetch(FENEGOSIDA, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        'Accept':     'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    })
    if (!res.ok) throw new Error(`fenegosida.org returned HTTP ${res.status}`)
    const html = await res.text()

    // ── 2. Strip HTML → plain text ─────────────────────────
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')

    // ── 3. Parse tola rates ────────────────────────────────
    //  Matches: "FINE GOLD (9999) per 1 tola : रु 302800"
    //           "FINE GOLD (9999) per 1 tola : Nrs 302800"
    const goldRe   = /FINE\s+GOLD\s*(?:\([^)]*\))?\s*per\s+1\s+tola\s*[:\-]?\s*(?:Nrs|रु|Rs?\.?)\s*([\d,]+)/i
    const silverRe = /SILVER\s*per\s+1\s+tola\s*[:\-]?\s*(?:Nrs|रु|Rs?\.?)\s*([\d,]+)/i

    const parse = (re: RegExp): number | null => {
      const m = text.match(re)
      if (!m) return null
      const n = parseInt(m[1].replace(/,/g, ''), 10)
      return n > 0 ? n : null
    }

    const goldRate   = parse(goldRe)
    const silverRate = parse(silverRe)

    console.log(`[scrape-metal-rates] gold=${goldRate} silver=${silverRate}`)

    if (!goldRate && !silverRate) {
      throw new Error('Could not parse any tola rates from fenegosida.org — site layout may have changed.')
    }

    // ── 4. Upsert into precious_metal_rates ────────────────
    const today  = new Date().toISOString().split('T')[0]
    const upsert = []
    if (goldRate)   upsert.push({ metal: 'gold',   rate_per_tola: goldRate,   date: today })
    if (silverRate) upsert.push({ metal: 'silver', rate_per_tola: silverRate, date: today })

    const { error: rateErr } = await supabase
      .from('precious_metal_rates')
      .upsert(upsert, { onConflict: 'metal,date' })
    if (rateErr) throw rateErr

    // ── 5. Update all auto-mode assets ────────────────────
    for (const { metal, rate_per_tola } of upsert) {
      const { data: autoAssets, error: fetchErr } = await supabase
        .from('assets')
        .select('id, quantity_tola')
        .eq('type', metal)
        .eq('rate_mode', 'auto')
        .not('quantity_tola', 'is', null)
        .gt('quantity_tola', 0)

      if (fetchErr) { console.error(fetchErr); continue }

      if (autoAssets && autoAssets.length > 0) {
        await Promise.all(autoAssets.map(a =>
          supabase.from('assets').update({
            value:      Math.round(Number(a.quantity_tola) * rate_per_tola),
            updated_at: new Date().toISOString(),
          }).eq('id', a.id)
        ))
        console.log(`[scrape-metal-rates] updated ${autoAssets.length} ${metal} asset(s)`)
      }
    }

    return Response.json({ success: true, goldRate, silverRate, date: today })
  } catch (err: any) {
    console.error('[scrape-metal-rates]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})
