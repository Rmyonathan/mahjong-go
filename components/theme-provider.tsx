"use client"

import * as React from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "mahjong-go-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("light")

  const applyTheme = React.useCallback((next: Theme) => {
    const root = document.documentElement
    root.classList.toggle("dark", next === "dark")
    root.style.colorScheme = next
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const initial: Theme = stored === "dark" ? "dark" : "light"
    setThemeState(initial)
    applyTheme(initial)
  }, [applyTheme])

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next)
      applyTheme(next)
    },
    [applyTheme],
  )

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  const value = React.useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme harus dipakai di dalam ThemeProvider")
  }
  return ctx
}
