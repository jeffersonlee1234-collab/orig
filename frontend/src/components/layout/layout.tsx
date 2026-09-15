import { useState, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"
import { getInitialTheme, applyTheme, getThemePreference, getEffectiveTheme, setThemeMode } from "../../utils/theme"

export default function SocialServicesLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dark, setDark] = useState(() => getInitialTheme())

  useEffect(() => {
    const syncTheme = () => {
      const mode = getThemePreference()
      const effectiveDark = getEffectiveTheme(mode)
      setDark(effectiveDark)
      applyTheme(effectiveDark, false)
    }

    syncTheme()

    // Real-time automatic check every 15 seconds (handles 6:00 AM / 6:00 PM transitions)
    const interval = setInterval(syncTheme, 15000)
    window.addEventListener("theme_changed", syncTheme)
    window.addEventListener("storage", syncTheme)

    return () => {
      clearInterval(interval)
      window.removeEventListener("theme_changed", syncTheme)
      window.removeEventListener("storage", syncTheme)
    }
  }, [])

  const handleToggleDark = () => {
    const nextDark = !dark
    setThemeMode(nextDark ? "dark" : "light")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          dark={dark}
          onToggleDark={handleToggleDark}
        />
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto animate-fade-in-up bg-background text-foreground"
          style={{ scrollbarGutter: "stable" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}