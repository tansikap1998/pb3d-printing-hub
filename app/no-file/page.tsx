"use client"

import { useState } from "react"
import Link from "next/link"
import { ImagePlus, Loader2, CheckCircle2, MessageCircle, X } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"

const LINE_URL = "https://lin.ee/R8Vd7q5"
const MAX_TOTAL = 4 * 1024 * 1024

/** Shrink phone photos so up to 5 fit in one upload (Vercel's 4.5MB limit). */
async function shrink(file: File): Promise<File> {
  if (file.size < 700 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement("canvas")
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, "image/jpeg", 0.85))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file
  } catch { return file }
}

/** "ไม่มีไฟล์ 3D": send photos / a sketch / a description to get a design or scan quote. */
export default function NoFilePage() {
  const [f, setF] = useState({ name: "", phone: "", email: "", lineId: "", service: "ออกแบบให้", description: "", size: "", quantity: "1" })
  const [photos, setPhotos] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }))

  const addPhotos = async (list: FileList | null) => {
    if (!list) return
    const next = [...photos, ...(await Promise.all(Array.from(list).filter(x => x.type.startsWith("image/")).map(shrink)))].slice(0, 5)
    setPhotos(next); setError(next.reduce((s, x) => s + x.size, 0) > MAX_TOTAL ? "รูปรวมกันใหญ่เกิน 4MB ลองลบบางรูป" : "")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      const fd = new FormData()
      Object.entries(f).forEach(([k, v]) => fd.append(k, v))
      photos.forEach(p => fd.append("photos", p))
      const r = await fetch("/api/requests", { method: "POST", body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setDone(d.id)
    } catch (e: any) { setError(e.message) }
    setBusy(false)
  }

  const input = "w-full bg-foreground/[0.04] border border-foreground/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400/50"
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <nav className="px-5 sm:px-8 py-6 flex items-center justify-between border-b border-foreground/5">
        <Link href="/" className="font-header text-3xl tracking-tighter uppercase leading-none">PB3D<span className="text-foreground/20">HUB</span></Link>
        <ThemeToggle />
      </nav>
      <main className="max-w-2xl mx-auto px-5 pt-12">
        <h1 className="font-semibold tracking-tight text-3xl mb-2">ไม่มีไฟล์ 3D?</h1>
        <p className="text-sm text-foreground/55 mb-6">
          ส่งรูปของจริง ภาพร่าง หรือเล่าว่าต้องการอะไร ร้านจะออกแบบหรือสแกนให้ แล้วส่งใบเสนอราคากลับไป
          อยากคุยก่อนก็ <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline">ทัก LINE</a> ได้เลย
        </p>

        {done ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-3" data-testid="no-file-done">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <p className="text-lg font-semibold">ส่งรายละเอียดแล้ว (เลขที่ {done})</p>
            <p className="text-sm text-foreground/60">ร้านจะติดต่อกลับพร้อมใบเสนอราคาทางช่องทางที่ให้ไว้</p>
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-500 border border-emerald-500/40 rounded-xl px-4 py-2">
              <MessageCircle size={14} />ทัก LINE เพื่อคุยต่อ
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" data-testid="no-file-form">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">ชื่อ *</span>
                <input className={input} value={f.name} onChange={set("name")} required data-testid="nf-name" /></label>
              <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">เบอร์โทร</span>
                <input className={input} value={f.phone} onChange={set("phone")} type="tel" data-testid="nf-phone" /></label>
              <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">LINE ID</span>
                <input className={input} value={f.lineId} onChange={set("lineId")} /></label>
              <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">อีเมล</span>
                <input className={input} value={f.email} onChange={set("email")} type="email" data-testid="nf-email" /></label>
            </div>
            <p className="text-xs text-foreground/40 -mt-2">ใส่เบอร์โทร LINE ID หรืออีเมล อย่างน้อยหนึ่งช่อง</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">ต้องการ</span>
                <select className={input} value={f.service} onChange={set("service")} data-testid="nf-service">
                  <option>ออกแบบให้</option><option>สแกนของจริง</option><option>ไม่แน่ใจ ขอคำแนะนำ</option>
                </select></label>
              <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">ขนาดโดยประมาณ</span>
                <input className={input} value={f.size} onChange={set("size")} placeholder="เช่น 10 × 5 × 3 cm" /></label>
              <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">จำนวน</span>
                <input className={input} value={f.quantity} onChange={set("quantity")} type="number" min={1} /></label>
            </div>
            <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">รายละเอียดงาน *</span>
              <textarea className={input} rows={5} value={f.description} onChange={set("description")} required data-testid="nf-description"
                placeholder="เช่น ฝาครอบปุ่มรีโมทแตก อยากได้ชิ้นใหม่ สีดำ ใช้งานทุกวัน" /></label>

            <div>
              <span className="text-xs text-foreground/50 mb-1.5 block">รูปของจริง / ภาพร่าง (ไม่เกิน 5 รูป)</span>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-foreground/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
                    <button type="button" aria-label="ลบรูป" onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X size={12} /></button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-foreground/15 flex items-center justify-center cursor-pointer text-foreground/40 hover:text-foreground/70">
                    <ImagePlus size={20} />
                    <input type="file" accept="image/*" multiple className="hidden" data-testid="nf-photos" onChange={e => { addPhotos(e.target.files); e.target.value = "" }} />
                  </label>
                )}
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={busy} data-testid="nf-submit"
              className="w-full py-3.5 rounded-xl bg-foreground text-background font-medium flex items-center justify-center gap-2 disabled:opacity-40">
              {busy && <Loader2 size={16} className="animate-spin" />}ส่งขอใบเสนอราคา
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
