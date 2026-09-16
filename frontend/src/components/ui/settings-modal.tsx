import { X, Languages } from "lucide-react"
import { useLanguage, type Language } from "./language-context"

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { language, setLanguage, t } = useLanguage()

  if (!open) return null

  const languageOptions: { value: Language; label: string }[] = [
    { value: "en", label: t("english") || "English" },
    { value: "tl", label: t("tagalog") || "Tagalog" },
    { value: "bis", label: t("bisaya") || "Bisaya" },
  ]

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
          {/* Language Section */}
          <div className="space-y-2">
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