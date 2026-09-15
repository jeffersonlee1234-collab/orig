import { useState, useEffect } from "react"
import { X, Languages, Sun, Moon, Clock } from "lucide-react"
import { useLanguage, type Language } from "./language-context"
import { getThemePreference, setThemeMode, type ThemeMode } from "../../utils/theme"

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { language, setLanguage, t } = useLanguage()
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => getThemePreference())

  useEffect(() => {
    if (open) {
      setCurrentTheme(getThemePreference())
    }
  }, [open])

  if (!open) return null

  const languageOptions: { value: Language; label: string }[] = [
    { value: "en", label: t("english") || "English" },
    { value: "tl", label: t("tagalog") || "Tagalog" },
    { value: "bis", label: t("bisaya") || "Bisaya" },
  ]

  const handleSelectTheme = (mode: ThemeMode) => {
    setCurrentTheme(mode)
    setThemeMode(mode)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          aria-label={t("close")}
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-heading font-semibold text-foreground mb-6">
          {t("settings")}
        </h3>

        <div className="space-y-5">
          {/* Theme Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>{language === "bis" ? "Tema sa Kolor" : language === "tl" ? "Tema ng Kulay" : "Theme Mode"}</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {currentTheme === "auto"
                  ? (language === "bis" ? "Awtomatik" : language === "tl" ? "Awtomatiko" : "Auto")
                  : currentTheme === "light"
                  ? (language === "bis" ? "Puti" : language === "tl" ? "Puti" : "Light")
                  : (language === "bis" ? "Ngitngit" : language === "tl" ? "Madilim" : "Dark")}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectTheme("auto")}
                className={`h-11 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  currentTheme === "auto"
                    ? "bg-primary/15 border-primary text-primary shadow-xs"
                    : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{language === "bis" ? "Auto (Oras)" : language === "tl" ? "Auto (Oras)" : "Auto (Time)"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme("light")}
                className={`h-11 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  currentTheme === "light"
                    ? "bg-primary/15 border-primary text-primary shadow-xs"
                    : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>{language === "bis" ? "Puti" : language === "tl" ? "Puti" : "Light"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme("dark")}
                className={`h-11 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  currentTheme === "dark"
                    ? "bg-primary/15 border-primary text-primary shadow-xs"
                    : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>{language === "bis" ? "Ngitngit" : language === "tl" ? "Madilim" : "Dark"}</span>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              {currentTheme === "auto"
                ? (language === "bis"
                    ? "⏰ 6:00 AM – 6:00 PM (Puti) | 6:00 PM – 6:00 AM (Ngitngit)"
                    : language === "tl"
                    ? "⏰ 6:00 AM – 6:00 PM (Puti) | 6:00 PM – 6:00 AM (Madilim)"
                    : "⏰ 6:00 AM – 6:00 PM (Light) | 6:00 PM – 6:00 AM (Dark)")
                : currentTheme === "light"
                ? (language === "bis"
                    ? "Palaging nakaputing screen."
                    : language === "tl"
                    ? "Palaging nakaputing screen."
                    : "Always in light mode.")
                : (language === "bis"
                    ? "Palaging nakangitngit nga screen."
                    : language === "tl"
                    ? "Palaging nakaitim/madilim na screen."
                    : "Always in dark mode.")}
            </p>
          </div>

          {/* Language Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Languages className="h-4 w-4 text-primary" />
              {t("language")}
            </div>
            <div className="flex gap-2">
              {languageOptions.map((opt) => {
                const active = language === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(opt.value)}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                      active
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          {t("close")}
        </button>
      </div>
    </div>
  )
}