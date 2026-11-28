"use client"
import { ShoppingBag, ExternalLink } from "lucide-react"
import { SHOPEE_UNIT_PRICE, shopeeUnitsFor, flatRateFormula } from "@/lib/priceCalculator"

/** Shopee listing for "3D print service, ฿59 per unit" (NEXT_PUBLIC_SHOPEE_SERVICE_URL overrides). */
export const SHOPEE_SERVICE_URL =
  process.env.NEXT_PUBLIC_SHOPEE_SERVICE_URL || "https://shopee.co.th/product/9883965/24267343976"

/** "Order through Shopee: buy N units of the ฿59 listing" for the current quote. */
export default function ShopeeOrderHint({ price, ratePerGram, totalWeightG, compact = false, unitPrice = SHOPEE_UNIT_PRICE, url }: {
  price: number; ratePerGram?: number | null; totalWeightG?: number; compact?: boolean
  /** from the shop's settings */
  unitPrice?: number; url?: string
}) {
  if (!(price > 0)) return null
  const units = unitPrice === SHOPEE_UNIT_PRICE ? shopeeUnitsFor(price) : Math.max(1, Math.ceil(price / unitPrice))
  const paid = units * unitPrice
  const link = process.env.NEXT_PUBLIC_SHOPEE_SERVICE_URL || url || SHOPEE_SERVICE_URL
  return (
    <div className="rounded-2xl border border-orange-400/30 bg-orange-500/[0.06] p-4 space-y-2 text-foreground" data-testid="shopee-order-hint">
      <p className="text-sm font-semibold flex items-center gap-2"><ShoppingBag size={15} className="text-orange-500" />สั่งผ่าน Shopee ได้</p>
      <p className="text-sm leading-relaxed">
        กดสั่งสินค้า <b>“บริการพิมพ์ 3D ชิ้นละ ฿{unitPrice}”</b> จำนวน{" "}
        <b className="text-orange-500 text-base" data-testid="shopee-units">{units} ชิ้น</b>
      </p>
      <p className="text-xs text-foreground/55" data-testid="shopee-units-calc">
        {ratePerGram && totalWeightG
          ? <>{flatRateFormula(totalWeightG)} = ฿{price.toLocaleString()} → </>
          : <>ราคางาน ฿{price.toLocaleString()} → </>}
        ÷ {unitPrice} = {units} ชิ้น (ยอดใน Shopee ฿{paid.toLocaleString()} ไม่รวมค่าส่ง)
      </p>
      {!compact && (
        <p className="text-xs text-foreground/45">
          สั่งแล้วใส่เลขคำสั่งซื้อ Shopee ในหน้าชำระเงิน เพื่อให้ร้านจับคู่กับไฟล์งาน
        </p>
      )}
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" data-testid="shopee-order-link"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg px-3 py-2">
          ไปที่ Shopee <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}
