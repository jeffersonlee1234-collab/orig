import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { User, Settings, Sun, Moon, LogOut } from "lucide-react"
import { moduleRoutes } from "./routes"
import { Tooltip } from "../ui/tooltip"
import { SettingsModal } from "../ui/settings-modal"
import { ProfileModal } from "../ui/profile-modal"
import { useLanguage } from "../ui/language-context"

export function AppHeader({
  dark,
  onToggleDark,
}: {
  dark: boolean
  onToggleDark: () => void
}) {
  const { t, language } = useLanguage()
  const location = useLocation()
  const current = moduleRoutes.find((r) => r.path === location.pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpenState] = useState(() => {
    return (
      localStorage.getItem("is_profile_modal_open") === "true" ||
      sessionStorage.getItem("is_profile_modal_open") === "true"
    )
  })

  const setProfileOpen = (open: boolean) => {
    if (open) {
      localStorage.setItem("is_profile_modal_open", "true")
      sessionStorage.setItem("is_profile_modal_open", "true")
    } else {
      localStorage.removeItem("is_profile_modal_open")
      sessionStorage.removeItem("is_profile_modal_open")
    }
    setProfileOpenState(open)
  }
  const [now, setNow] = useState(new Date())
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Live clock — ticks every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const clockLocale = language === "en" ? "en-PH" : "fil-PH"
  const timeString = now.toLocaleTimeString(clockLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const dateString = now.toLocaleDateString(clockLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <>
    <header className="h-16 sticky top-0 z-40 flex items-center justify-between gap-4 px-4 md:px-6 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {current?.label ?? t("socialServicesManagement")}
        </p>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex flex-col items-end leading-tight mr-1 select-none">
          <span className="text-sm font-semibold text-foreground tabular-nums">{timeString}</span>
          <span className="text-[10px] text-muted-foreground">{dateString}</span>
        </div>

        <Tooltip label={dark ? t("switchToLightMode") : t("switchToDarkMode")}>
          <button
            aria-label="Toggle theme"
            onClick={onToggleDark}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </Tooltip>

        {/* User menu with dropdown (Log Out included) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground leading-tight">{t("socialWorker")}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t("staffRole")}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-info flex items-center justify-center text-xs font-semibold text-white shrink-0">
              SW
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-medium py-1.5 z-50">
              <button
                onClick={() => {
                  setProfileOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                {t("profile")}
              </button>
              <button
                onClick={() => {
                  setSettingsOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                {t("settings")}
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t("logOut")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    <ProfileModal
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      name="Social Worker"
      email="socialworker@gov.ph"
      role="Staff"
    />
    </>
  )
}