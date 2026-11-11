"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

/** Dark / light switch. Drop it into any nav bar. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === "dark"
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={isDark ? "เปลี่ยนเป็นโหมดสว่าง (Light mode)" : "เปลี่ยนเป็นโหมดมืด (Dark mode)"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border border-foreground/10 text-foreground/60 hover:text-foreground hover:border-foreground/25 transition-colors ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
