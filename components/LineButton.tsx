"use client"
import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"

export const LINE_OA_URL = "https://lin.ee/R8Vd7q5"

/** Floating "ทัก LINE" button. Hidden on pages that have their own bottom bar or LINE button. */
export default function LineButton() {
  const path = usePathname() || "/"
  if (/^\/(admin|upload|quote|checkout)/.test(path)) return null
  return (
    <a href={LINE_OA_URL} target="_blank" rel="noopener noreferrer" data-testid="line-float"
      className="fixed z-[90] right-4 bottom-4 sm:right-6 sm:bottom-6 flex items-center gap-2 rounded-full bg-[#06C755] text-white shadow-xl px-4 py-3 text-sm font-semibold hover:brightness-110 print:hidden">
      <MessageCircle size={18} />
      <span>ทัก LINE ปรึกษาฟรี</span>
    </a>
  )
}
