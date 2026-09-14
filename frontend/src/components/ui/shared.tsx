import type { LucideIcon } from "lucide-react"

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-medium">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-heading font-semibold mt-1 text-foreground">{value}</p>
    </div>
  )
}

/* Semantic status colors — mapped to the docx §5 token set:
   success / warning / info / destructive / muted */
const statusColors: Record<string, string> = {
  Pending: "bg-warning/10 text-warning",
  Approved: "bg-info/10 text-info",
  Released: "bg-success/10 text-success",
  Disapproved: "bg-destructive/10 text-destructive",
  "For interview": "bg-muted text-muted-foreground",
  "For assessment": "bg-info/10 text-info",
  "Ready for release": "bg-success/10 text-success",
  "Under monitoring": "bg-info/10 text-info",
  "For home visit": "bg-muted text-muted-foreground",
  Ongoing: "bg-info/10 text-info",
  Enrolling: "bg-warning/10 text-warning",
  Completed: "bg-success/10 text-success",
  Releasing: "bg-muted text-muted-foreground",
  "On hold": "bg-destructive/10 text-destructive",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-1 rounded-md ${
        statusColors[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  )
}

// Accepts either { label, desc } (older callers) or { title, description, icon } (newer callers).
type ServiceCardProps = {
  label?: string
  desc?: string
  title?: string
  description?: string
  icon?: LucideIcon
}

export function ServiceCard({ label, desc, title, description, icon: Icon }: ServiceCardProps) {
  const heading = title ?? label ?? ""
  const body = description ?? desc ?? ""

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex gap-3 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-medium">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-semibold text-sm">
        {Icon ? <Icon className="h-4.5 w-4.5" /> : heading.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{heading}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
      </div>
    </div>
  )
}

// Accepts either "desc" or "subtitle" — different modules use different naming.
type PageHeaderProps = {
  title: string
  desc?: string
  subtitle?: string
}

export function PageHeader({ title, desc, subtitle }: PageHeaderProps) {
  const body = desc ?? subtitle ?? ""
  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold text-foreground">{title}</h1>
      {body && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{body}</p>}
    </div>
  )
}