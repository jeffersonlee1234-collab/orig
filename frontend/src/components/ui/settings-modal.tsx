import { X, Languages } from "lucide-react"
import { useLanguage, type Language } from "./language-context"

/*
  Shared Settings modal — opened from the user-menu dropdown in both
  app-header.tsx (staff) and user-header/user-layout.tsx (resident).
  Currently exposes the Language toggle (English / Tagalog / Bisaya). Extend
  with more sections (notifications, etc.) as needed.
*/

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { language, setLanguage, t } = useLanguage()

  if (!open) return null

  const options: { value: Language; label: string }[] = [
    { value: "en", label: t("english") },
    { value: "tl", label: t("tagalog") },
    { value: "bis", label: t("bisaya") },
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
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
          aria-label={t("close")}
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-heading font-semibold text-foreground mb-6">
          {t("settings")}
        </h3>

        {/* Language section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Languages className="h-4 w-4 text-primary" />
            {t("language")}
          </div>
          <div className="flex gap-2">
            {options.map((opt) => {
              const active = language === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium border transition-colors ${
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

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors"
        >
          {t("close")}
        </button>
      </div>
    </div>
  )
}