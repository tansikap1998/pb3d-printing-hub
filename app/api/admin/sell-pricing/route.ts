import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { db, SheetsNotConfigured, backendErrorResponse } from "@/lib/sheetsDb"
import {
  DEFAULT_SELL_PRICING, DEFAULT_MARKET_PRICES, sanitizeSettings, sanitizeMarket, type MarketPrice,
} from "@/lib/sellPricing"

export const dynamic = "force-dynamic"

const KEY = "sellPricing"
// bump when DEFAULT_MARKET_PRICES gains categories, so existing sheets get them once
const MARKET_VERSION_KEY = "marketDefaultsVersion"
const MARKET_VERSION = "2"
// Older Code.gs deployments don't know the new actions yet
const isOldScript = (e: unknown) => /unknown action/.test(String((e as Error)?.message ?? ""))
const OLD_SCRIPT_NOTE = "Apps Script ยังเป็นเวอร์ชันเก่า: วาง Code.gs ใหม่แล้ว Deploy → New version เพื่อบันทึกค่าและราคาตลาดลงชีต"

// GET → { settings, market, source, notes }
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const notes: string[] = []
  let settings = DEFAULT_SELL_PRICING, settingsSource: "sheet" | "default" = "default"
  let market: MarketPrice[] = DEFAULT_MARKET_PRICES, marketSource: "sheet" | "default" = "default"

  try {
    const raw = await db.settings.get(KEY)
    if (raw) { settings = sanitizeSettings(JSON.parse(raw)); settingsSource = "sheet" }
  } catch (e) {
    if (e instanceof SheetsNotConfigured) notes.push("ยังไม่ได้ตั้งค่า Google Sheets: ใช้ค่าเริ่มต้นและบันทึกไม่ได้")
    else if (isOldScript(e)) notes.push(OLD_SCRIPT_NOTE)
    else if (e instanceof SyntaxError) notes.push("ค่าที่บันทึกในแท็บ Settings อ่านไม่ได้: ใช้ค่าเริ่มต้นแทน")
    else return backendErrorResponse(e, "sell-pricing settings")
  }

  try {
    const rows = sanitizeMarket(await db.market.list())
    if (rows.length) {
      market = rows; marketSource = "sheet"
      // once per defaults version: add categories that are new in the starter list
      if ((await db.settings.get(MARKET_VERSION_KEY)) !== MARKET_VERSION) {
        const added = await db.market.append(DEFAULT_MARKET_PRICES).catch(e => {
          if (isOldScript(e)) { notes.push(OLD_SCRIPT_NOTE); return -1 }
          throw e
        })
        if (added >= 0) {
          await db.settings.set(MARKET_VERSION_KEY, MARKET_VERSION)
          if (added > 0) {
            market = sanitizeMarket(await db.market.list())
            notes.push(`เพิ่มหมวดสินค้าใหม่ ${added} หมวดในแท็บ MarketPrices แล้ว (ราคาประมาณ แก้ได้ในชีต)`)
          }
        }
      }
    }
    else {
      // first use: copy the starter reference prices into the MarketPrices tab
      await db.market.seed(DEFAULT_MARKET_PRICES)
      await db.settings.set(MARKET_VERSION_KEY, MARKET_VERSION)
      notes.push("สร้างแท็บ MarketPrices พร้อมราคาอ้างอิงเริ่มต้นแล้ว: แก้ไขตามราคาที่สำรวจจริงได้เลย")
    }
  } catch (e) {
    if (isOldScript(e)) { if (!notes.includes(OLD_SCRIPT_NOTE)) notes.push(OLD_SCRIPT_NOTE) }
    else if (!(e instanceof SheetsNotConfigured)) return backendErrorResponse(e, "sell-pricing market")
  }

  return NextResponse.json(
    { settings, market, source: { settings: settingsSource, market: marketSource }, notes },
    { headers: { "Cache-Control": "no-store" } }
  )
}

// PUT { settings } → saved (cleaned) settings
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const settings = sanitizeSettings(body?.settings)
  try {
    await db.settings.set(KEY, JSON.stringify(settings))
    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    if (isOldScript(e)) return NextResponse.json({ error: OLD_SCRIPT_NOTE }, { status: 409 })
    return backendErrorResponse(e, "sell-pricing save")
  }
}
