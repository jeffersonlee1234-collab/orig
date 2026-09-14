import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { CheckCircle2, XCircle, X } from "lucide-react"

type Toast = { id: number; message: string; variant: "success" | "error" | "info" }
type ToastContextType = { showToast: (message: string, variant?: Toast["variant"]) => void }

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, variant: Toast["variant"] = "success") => {
    const id = Date.now()
    setToasts((t) => [...t, { id, message, variant }])
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: number) => setToasts((t) => t.filter((toast) => toast.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 flex flex-col gap-2 items-center">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-xl shadow-large border text-sm font-medium animate-fade-in-up ${
              t.variant === "success"
                ? "bg-card border-success/30 text-foreground"
                : t.variant === "error"
                ? "bg-card border-destructive/30 text-foreground"
                : "bg-card border-border text-foreground"
            }`}
          >
            {t.variant === "success" && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
            {t.variant === "error" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
            <span>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}