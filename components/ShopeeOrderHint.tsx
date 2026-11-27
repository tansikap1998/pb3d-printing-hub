"use client"
import { ShoppingBag, ExternalLink } from "lucide-react"
import { SHOPEE_UNIT_PRICE, shopeeUnitsFor, FLAT_RATE } from "@/lib/priceCalculator"

/** Shopee listing for "3D print service, ฿59 per unit" (set NEXT_PUBLIC_SHOPEE_SERVICE_URL in Vercel). */
export const SHOPEE_SERVICE_URL = process.env.NEXT_PUBLIC_SHOPEE_SERVICE_URL || ""

/** "Order through Shopee: buy N units of the ฿59 listing" for the current quote. */
export default function ShopeeOrderHint({ price, ratePerGram, totalWeightG, compact = false }: {
  price: number; ratePerGram?: number | null; totalWeightG?: number; compact?: boolean
}) {
  if (!(price > 0)) return null
  const units = shopeeUnitsFor(price)
  const paid = units * SHOPEE_UNIT_PRICE
  return (
    <div className="rounded-2xl border border-orange-400/30 bg-orange-500/[0.06] p-4 space-y-2 text-foreground" data-testid="shopee-order-hint">
      <p className="text-sm font-semibold flex items-center gap-2"><ShoppingBag size={15} className="text-orange-500" />สั่งผ่าน Shopee ได้</p>
      <p className="text-sm leading-relaxed">
        กดสั่งสินค้า <b>“บริการพิมพ์ 3D ชิ้นละ ฿{SHOPEE_UNIT_PRICE}”</b> จำนวน{" "}
        <b className="text-orange-500 text-base" data-testid="shopee-units">{units} ชิ้น</b>
      </p>
      <p className="text-xs text-foreground/55" data-testid="shopee-units-calc">
        {ratePerGram && totalWeightG
          ? <>{totalWeightG.toLocaleString()} g × {ratePerGram} ฿/g = ฿{price.toLocaleString()} → </>
          : <>ราคาชิ้นงาน ฿{price.toLocaleString()} → </>}
        ÷ {SHOPEE_UNIT_PRICE} = {units} ชิ้น (ยอดใน Shopee ฿{paid.toLocaleString()} ไม่รวมค่าส่ง)
      </p>
      {!compact && (
        <p className="text-xs text-foreground/45">
          PLA / PETG คิดกรัมละ {FLAT_RATE.perG} บาท · ตั้งแต่ {FLAT_RATE.bulkFromG} g ขึ้นไป กรัมละ {FLAT_RATE.bulkPerG} บาท
          · สั่งแล้วใส่เลขคำสั่งซื้อ Shopee ในช่องด้านล่าง เพื่อให้ร้านจับคู่กับไฟล์งาน
        </p>
      )}
      {SHOPEE_SERVICE_URL && (
        <a href={SHOPEE_SERVICE_URL} target="_blank" rel="noopener noreferrer" data-testid="shopee-order-link"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg px-3 py-2">
          ไปที่ Shopee <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}
