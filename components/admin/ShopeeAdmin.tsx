"use client"
import { useCallback, useEffect, useState } from "react"
import {
  Plus, Trash2, Pencil, ExternalLink, Eye, EyeOff, Loader2, AlertCircle, Link2, X, Save, Package,
} from "lucide-react"
import { guessNameFromUrl, normalizeShopeeUrl, parseShopeeIds, type ShopeeProduct } from "@/lib/shopee"

type Form = { url: string; name: string; price: string; imageUrl: string; description: string; sortOrder: string }
const EMPTY: Form = { url: "", name: "", price: "", imageUrl: "", description: "", sortOrder: "0" }

const inputCls =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-400/40 transition-all"

export default function ShopeeAdmin() {
  const [products, setProducts] = useState<ShopeeProduct[]>([])
  const [storage, setStorage] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/shopee-products?all=1", { cache: "no-store" })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "โหลดไม่สำเร็จ")
      setProducts(d.products); setStorage(d.storage)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const urlValid = !form.url || normalizeShopeeUrl(form.url) !== null
  const ids = form.url ? parseShopeeIds(form.url) : null

  const onUrlChange = (url: string) => {
    setForm(f => ({ ...f, url, name: f.name || guessNameFromUrl(url) }))
    setError("")
  }

  const reset = () => { setForm(EMPTY); setEditingId(null); setError("") }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(""); setNotice("")
    try {
      const body = {
        url: form.url, name: form.name,
        price: form.price === "" ? null : form.price,
        imageUrl: form.imageUrl || null, description: form.description || null,
        sortOrder: Number(form.sortOrder) || 0,
      }
      const r = await fetch(editingId ? `/api/shopee-products/${editingId}` : "/api/shopee-products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "บันทึกไม่สำเร็จ")
      setNotice(editingId ? "อัปเดตสินค้าแล้ว" : "เพิ่มสินค้าแล้ว")
      reset(); await load()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const edit = (p: ShopeeProduct) => {
    setEditingId(p.id)
    setForm({
      url: p.url, name: p.name, price: p.price === null ? "" : String(p.price),
      imageUrl: p.imageUrl || "", description: p.description || "", sortOrder: String(p.sortOrder),
    })
    setNotice(""); setError("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggle = async (p: ShopeeProduct) => {
    setBusyId(p.id)
    const r = await fetch(`/api/shopee-products/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !p.active }),
    })
    if (!r.ok) setError((await r.json()).error || "อัปเดตไม่สำเร็จ")
    await load(); setBusyId(null)
  }

  const remove = async (p: ShopeeProduct) => {
    if (!confirm(`ลบ "${p.name}" ?`)) return
    setBusyId(p.id)
    const r = await fetch(`/api/shopee-products/${p.id}`, { method: "DELETE" })
    if (!r.ok) setError((await r.json()).error || "ลบไม่สำเร็จ")
    if (editingId === p.id) reset()
    await load(); setBusyId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-header text-2xl tracking-tighter">Shopee Products</h2>
        <p className="text-white/35 text-sm mt-1">
          วางลิงก์สินค้าจาก Shopee → แสดงบนหน้าแรกพร้อมปุ่ม “สั่งซื้อ” ที่พาลูกค้าไปหน้าสินค้าใน Shopee
        </p>
        {storage === "file" && (
          <p className="text-[11px] text-amber-400/80 mt-2">
            โหมดทดสอบ: บันทึกลงไฟล์บนเซิร์ฟเวอร์ (.data/) — สำหรับ production ให้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY และรัน migration 01_shopee_products.sql
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={submit} data-testid="shopee-form" className="bg-white/[0.025] border border-white/8 rounded-3xl p-6 space-y-4">
        <p className="text-xs font-medium text-white/40 flex items-center gap-2">
          {editingId ? <><Pencil size={12} />แก้ไขสินค้า</> : <><Plus size={12} />เพิ่มสินค้าใหม่</>}
        </p>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">ลิงก์สินค้า Shopee *</label>
          <div className="relative">
            <Link2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
            <input name="url" value={form.url} onChange={e => onUrlChange(e.target.value)} required
              placeholder="https://shopee.co.th/ชื่อสินค้า-i.9883965.123456789"
              className={`${inputCls} pl-10 ${!urlValid ? "border-red-400/50" : ""}`} />
          </div>
          {!urlValid && <p className="text-[11px] text-red-400 mt-1.5">ต้องเป็นลิงก์จาก shopee.co.th หรือ shp.ee</p>}
          {urlValid && ids && <p className="text-[11px] text-white/30 mt-1.5">Shop ID {ids.shopId} · Item ID {ids.itemId}</p>}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-white/40 mb-1.5 block">ชื่อสินค้า *</label>
            <input name="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              placeholder="เช่น ขาตั้งโทรศัพท์ 3D Print" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">ราคา (บาท)</label>
            <input name="price" type="number" min="0" step="0.01" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="199" className={inputCls} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-white/40 mb-1.5 block">ลิงก์รูปภาพ (คลิกขวารูปใน Shopee → คัดลอกที่อยู่รูปภาพ)</label>
            <input name="imageUrl" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://down-th.img.susercontent.com/file/..." className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">ลำดับการแสดง</label>
            <input name="sortOrder" type="number" value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">คำอธิบายสั้น</label>
          <input name="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="วัสดุ PLA · หลายสี" className={inputCls} />
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2.5 px-4 py-3 bg-red-500/8 border border-red-500/25 rounded-xl">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {notice && <p className="text-sm text-emerald-400">{notice}</p>}

        <div className="flex gap-2.5">
          <button type="submit" disabled={saving || !urlValid || !form.url || !form.name}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-medium uppercase tracking-wider flex items-center gap-2 disabled:opacity-30">
            {saving ? <Loader2 size={12} className="animate-spin" /> : editingId ? <Save size={12} /> : <Plus size={12} />}
            {editingId ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
          </button>
          {editingId && (
            <button type="button" onClick={reset}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-white/50 text-xs flex items-center gap-2 hover:text-white/80">
              <X size={12} />ยกเลิก
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="space-y-2.5" data-testid="shopee-admin-list">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-white/30" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/6 rounded-3xl">
            <Package size={36} className="text-white/10 mb-3" />
            <p className="text-white/25 text-sm">ยังไม่มีสินค้า — วางลิงก์ Shopee ด้านบนเพื่อเริ่ม</p>
          </div>
        ) : products.map(p => (
          <div key={p.id} data-testid="shopee-admin-row"
            className={`flex items-center gap-4 p-4 border rounded-2xl ${p.active ? "border-white/8 bg-white/[0.02]" : "border-white/5 bg-white/[0.01] opacity-50"}`}>
            <div className="w-14 h-14 rounded-xl bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
              {p.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <Package size={18} className="text-white/20" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-white/30 truncate">{p.url}</p>
            </div>
            <span className="font-header text-lg tracking-tighter shrink-0">{p.price !== null ? `฿${p.price.toLocaleString()}` : "—"}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <a href={p.url} target="_blank" rel="noopener noreferrer" title="เปิดใน Shopee"
                className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white"><ExternalLink size={13} /></a>
              <button onClick={() => toggle(p)} disabled={busyId === p.id} title={p.active ? "ซ่อน" : "แสดง"}
                aria-label={p.active ? "ซ่อนสินค้า" : "แสดงสินค้า"}
                className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white">
                {p.active ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button onClick={() => edit(p)} title="แก้ไข" aria-label="แก้ไขสินค้า"
                className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white"><Pencil size={13} /></button>
              <button onClick={() => remove(p)} disabled={busyId === p.id} title="ลบ" aria-label="ลบสินค้า"
                className="p-2 rounded-lg border border-red-400/20 text-red-400/70 hover:text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
