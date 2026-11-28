import { db } from "./sheetsDb"
import { DEFAULT_QUOTE_CONFIG, sanitizeQuoteConfig, type QuoteConfig } from "./quoteConfig"

export const QUOTE_CONFIG_KEY = "quoteConfig"

let cache: { at: number; cfg: QuoteConfig } | null = null

/** Settings from the sheet (cached 60 s per server instance); defaults when missing or unreachable. */
export async function getQuoteConfig({ fresh = false } = {}): Promise<{ cfg: QuoteConfig; source: "sheet" | "default" }> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return { cfg: cache.cfg, source: "sheet" }
  try {
    const raw = await db.settings.get(QUOTE_CONFIG_KEY)
    if (raw) {
      const cfg = sanitizeQuoteConfig(JSON.parse(raw))
      cache = { at: Date.now(), cfg }
      return { cfg, source: "sheet" }
    }
  } catch { /* sheet not set up, old script or bad JSON → defaults */ }
  return { cfg: DEFAULT_QUOTE_CONFIG, source: "default" }
}

export function clearQuoteConfigCache() { cache = null }

/** What browsers may see: everything except the shop's notification address. */
export function publicQuoteConfig(cfg: QuoteConfig) {
  return { ...cfg, contact: { ...cfg.contact, shopEmail: "" } }
}
