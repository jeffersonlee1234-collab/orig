import { Check, type LucideIcon } from "lucide-react"

export type WizardStep = { label: string; icon: LucideIcon }

// Shared step-progress header used by every admin processing wizard
// (AICS, PWD & Senior, Solo Parent, Livelihood) so the flows look and
// behave consistently.
export function WizardStepper({ steps, step }: { steps: WizardStep[]; step: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft overflow-x-auto">
      <div className="flex items-center min-w-150">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                    isDone
                      ? "bg-success text-white"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                    i < step ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
