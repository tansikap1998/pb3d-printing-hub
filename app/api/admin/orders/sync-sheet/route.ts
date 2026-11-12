import { NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { supabaseAdmin, hasServiceRole } from "@/lib/supabaseAdmin"
import { sheetsConfigured, syncOrdersToSheet } from "@/lib/sheetsSync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// POST /api/admin/orders/sync-sheet → copy every order to Google Sheets (backfill / repair).
export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!sheetsConfigured())
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า GOOGLE_SHEETS_WEBHOOK_URL / GOOGLE_SHEETS_WEBHOOK_SECRET" }, { status: 503 })
  if (!hasServiceRole) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์" }, { status: 503 })
  const { data, error } = await supabaseAdmin().from("orders").select("*").order("created_at", { ascending: true })
  if (error) { console.error("sync-sheet list", error); return NextResponse.json({ error: "โหลดออเดอร์ไม่สำเร็จ" }, { status: 500 }) }
  const r = await syncOrdersToSheet(data)
  if (!r.ok) return NextResponse.json({ error: `ส่งไป Google Sheets ไม่สำเร็จ (${r.error})`, written: r.written }, { status: 502 })
  return NextResponse.json({ ok: true, written: r.written })
}
