import { useState, type ReactNode } from "react"

export type TabItem = {
  value: string
  label: string
  count?: number
}

export function Tabs({
  items,
  defaultValue,
  value,
  onChange,
}: {
  items: TabItem[]
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
}) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value)
  const active = value ?? internal

  const handleSelect = (v: string) => {
    if (onChange) onChange(v)
    else setInternal(v)
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
      {items.map((item) => {
        const isActive = item.value === active
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => handleSelect(item.value)}
            aria-current={isActive ? "true" : undefined}
            className={`relative h-9 px-3.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isActive
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={`text-xs rounded-md px-1.5 py-0.5 ${
                  isActive ? "bg-primary/10 text-primary" : "bg-border/60 text-muted-foreground"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  active,
  value,
  children,
}: {
  active: string
  value: string
  children: ReactNode
}) {
  if (active !== value) return null
  return <div className="animate-fade-in-up">{children}</div>
}