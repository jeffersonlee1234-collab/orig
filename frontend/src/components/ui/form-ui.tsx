import type { ReactNode } from "react"

// Shared input styling + small form primitives used across the admin
// wizards (application-wizard.tsx, pwd-senior-wizard.tsx, solo-parent-wizard.tsx,
// livelihood-wizard.tsx) and the resident-facing apply forms in user-portal/.
// Centralized here so all wizards/forms stay visually consistent.

export const inputCls =
  "w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/40"

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function RadioPill<T extends string = string>({
  label,
  value,
  current,
  onChange,
}: {
  label: string
  value: T
  current: string
  onChange: (v: any) => void
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`h-10 px-4 rounded-xl text-sm font-medium border transition-colors ${
        active ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  )
}

export function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-primary"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}
