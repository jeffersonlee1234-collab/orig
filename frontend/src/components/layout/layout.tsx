import { useState, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"

export default function SocialServicesLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("theme")
      if (saved === "dark") return true
      document.documentElement.classList.remove("dark")
      return false
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
      try {
        localStorage.setItem("theme", "dark")
      } catch {}
    } else {
      document.documentElement.classList.remove("dark")
      try {
        localStorage.setItem("theme", "light")
      } catch {}
    }
  }, [dark])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          dark={dark}
          onToggleDark={() => setDark((v) => !v)}
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