import type { CostBreakdown, ChannelPrice, SellPricingSettings, MarketPrice } from "./sellPricing"
import { listingText, packageWeight, type CopyOutput } from "./aiCopy"

// One row of the "PB3D Product 2027" sheet tab: everything the calculator and
// the AI copywriter worked out for a product.

export interface CatalogInput {
  id: string
  name: string
  category: string
  materialName: string
  grams: number
  hours: number
  cost: CostBreakdown
  channels: ChannelPrice[]
  settings: SellPricingSettings
  market: MarketPrice | null
  ai?: { copy: CopyOutput; pick: number; packagingG: number } | null
}

const COST_LABELS: Record<keyof CostBreakdown["included"], string> = {
  electricity: "ค่าไฟ", depreciation: "ค่าเสื่อมเครื่อง", packaging: "ค่าแพ็กเกจ", other: "ค่าอื่น ๆ",
}

export function catalogRecord(i: CatalogInput): Record<string, string | number | null> {
  const shopee = i.channels.find(c => /shopee/i.test(c.channel.name)) ?? i.channels[0]
  const copy = i.ai?.copy
  const title = copy ? copy.titles[i.ai!.pick] ?? copy.titles[0] ?? "" : ""
  return {
    id: i.id,
    name: i.name || title,
    category: i.category,
    material: i.materialName,
    material_rate: i.cost.materialRate,
    grams: i.grams,
    print_hours: i.hours,
    material_cost: i.cost.material,
    electricity: i.cost.included.electricity ? i.cost.electricity : 0,
    depreciation: i.cost.included.depreciation ? i.cost.depreciation : 0,
    packaging: i.cost.included.packaging ? i.cost.packaging : 0,
    other: i.cost.included.other ? i.cost.other : 0,
    cost_items: ["ค่าวัสดุ", ...(Object.keys(COST_LABELS) as (keyof typeof COST_LABELS)[])
      .filter(k => i.cost.included[k]).map(k => COST_LABELS[k])].join(", "),
    total_cost: i.cost.total,
    min_profit: `${i.settings.minProfitPct}% ${i.settings.profitBasis === "cost" ? "ของต้นทุน" : "ของราคาขาย"}`,
    shopee_min: shopee?.minPrice ?? null,
    shopee_recommended: shopee?.recommended ?? null,
    shopee_launch: shopee?.launch ?? null,
    channel_prices: i.channels.map(c => `${c.channel.name} ${c.recommended ?? "-"}`).join(" · "),
    market_typical: i.market?.typical ?? null,
    title,
    short_description: copy?.short_description ?? "",
    description: copy ? listingText(copy) : "",
    hashtags: copy?.hashtags.join(" ") ?? "",
    package_weight_kg: i.ai ? Number(packageWeight(i.grams, i.ai.packagingG).kg) : null,
  }
}
