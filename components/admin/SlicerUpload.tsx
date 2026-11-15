"use client"
import { useEffect, useRef, useState } from "react"
import { ImageUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

const MAX_SEND = 3_000_000

/** Shrink big screenshots in the browser so the upload stays small. */
async function toUploadable(file: Blob): Promise<{ image: string; mimeType: string }> {
  const readAsDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b)
  })
  if (file.size <= MAX_SEND && ["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return { image: await readAsDataUrl(file), mimeType: file.type }
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
  const c = document.createElement("canvas")
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height)
  return { image: c.toDataURL("image/jpeg", 0.9), mimeType: "image/jpeg" }
}

const fmtHours = (h: number) => {
  const m = Math.round(h * 60)
  return `${Math.floor(m / 60)} ชม. ${m % 60} นาที`
}

/** "แนบรูปจาก slicer": AI reads total grams + print time and fills the calculator. */
export default function SlicerUpload({ onRead }: { onRead: (v: { grams: number | null; hours: number | null }) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ grams: number | null; hours: number | null; plates: number | null; note: string } | null>(null)

  const read = async (file: Blob) => {
    if (!file.type.startsWith("image/")) { setError("ต้องเป็นไฟล์รูป"); return }
    setBusy(true); setError(""); setResult(null)
    try {
      const body = await toUploadable(file)
      const r = await fetch("/api/admin/slicer-read", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setResult(d); onRead({ grams: d.grams, hours: d.hours })
    } catch (e: any) {
      setError(e.message)
    }
    setBusy(false)
  }

  // Ctrl/⌘+V a screenshot anywhere on the calculator tab
  const readRef = useRef(read); readRef.current = read
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"))
      const f = item?.getAsFile()
      if (f) { e.preventDefault(); readRef.current(f) }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [])

  return (
    <div className="rounded-2xl border border-dashed border-foreground/15 p-3 space-y-2" data-testid="slicer-upload"
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) read(f) }}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="inline-flex items-center gap-2 text-xs font-medium border border-foreground/15 rounded-lg px-3 py-2 hover:bg-foreground/5 disabled:opacity-40">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ImageUp size={13} />}
          {busy ? "AI กำลังอ่านรูป…" : "แนบรูปจาก slicer"}
        </button>
        <span className="text-xs text-foreground/40">หรือลากรูปมาวาง / กด Ctrl+V (⌘+V) วางภาพที่แคปไว้</span>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" data-testid="slicer-file"
          onChange={e => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = "" }} />
      </div>
      {result && (
        <p className="text-xs text-emerald-400 flex items-start gap-1.5" data-testid="slicer-result">
          <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
          <span>
            อ่านได้: {result.grams !== null ? `${result.grams} g` : "ไม่พบน้ำหนัก"} · {result.hours !== null ? fmtHours(result.hours) : "ไม่พบเวลา"}
            {result.plates ? ` · ${result.plates} เพลต` : ""} — เติมในช่องด้านล่างแล้ว ตรวจให้ตรงกับในรูปอีกครั้ง
          </span>
        </p>
      )}
      {error && <p className="text-xs text-red-400 flex items-start gap-1.5" data-testid="slicer-error"><AlertCircle size={13} className="shrink-0 mt-0.5" />{error}</p>}
    </div>
  )
}
