"use client"
import { createContext, useCallback, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light"
export const THEME_STORAGE_KEY = "pb3d_theme"

/** Runs before first paint (inlined in <head>) so the page never flashes the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='dark'}var c=document.documentElement.classList;c.remove('light','dark');c.add(t)}catch(e){document.documentElement.classList.add('dark')}})()`

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "dark", setTheme: () => {}, toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("light") ? "light" : "dark")
  }, [])

  const setTheme = useCallback((t: Theme) => {
    const c = document.documentElement.classList
    c.remove("light", "dark"); c.add(t)
    try { localStorage.setItem(THEME_STORAGE_KEY, t) } catch {}
    setThemeState(t)
  }, [])

  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme])

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
