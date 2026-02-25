"use client"

import * as React from "react"
import { createContext, useContext, useLayoutEffect, useState } from "react"
import { ThemeProviderProps } from "next-themes/dist/types"
import { APP_PREFERENCES_STORAGE_KEY } from "@/lib/appPreferences"

type Theme = "dark" | "light" | "system"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  value: _value,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawPrefs = localStorage.getItem(APP_PREFERENCES_STORAGE_KEY)
        if (rawPrefs) {
          const parsed = JSON.parse(rawPrefs) as { darkMode?: unknown }
          if (typeof parsed.darkMode === "boolean") {
            return parsed.darkMode ? "dark" : "light"
          }
        }
      } catch {
        // no-op: fall through to default theme
      }

      const savedTheme = localStorage.getItem("theme")
      if (savedTheme && (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system")) {
        return savedTheme as Theme
      }

      return defaultTheme as Theme
    }
    return defaultTheme as Theme
  })

  useLayoutEffect(() => {
    const root = window.document.documentElement
    const resolvedTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme

    const oppositeTheme = resolvedTheme === "dark" ? "light" : "dark"
    const needsThemeMutation =
      !root.classList.contains(resolvedTheme) || root.classList.contains(oppositeTheme)

    let style: HTMLStyleElement | null = null
    let removeTimer: number | null = null

    if (needsThemeMutation) {
      // Prevent visual flashing only when the effective theme actually changes.
      style = document.createElement("style")
      style.appendChild(
        document.createTextNode("*{transition:none!important;animation:none!important;}")
      )
      document.head.appendChild(style)

      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)

      removeTimer = window.setTimeout(() => {
        style?.remove()
      }, 180)
    }

    return () => {
      if (removeTimer != null) window.clearTimeout(removeTimer)
      style?.remove()
    }
  }, [theme])

  const value: ThemeContextType = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem("theme", theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
