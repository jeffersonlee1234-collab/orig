import { useState, useEffect, useCallback, useRef } from "react"
import {
  History,
  CheckCircle2,
  XCircle,
  FileEdit,
  Calendar,
  UserPlus,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
  Clock,
} from "lucide-react"
import { API_BASE as APP_API_BASE } from "../../config/api"

const API_BASE = `${APP_API_BASE}/api`

type ModuleKey =
  | "AICS"
  | "PWD & Senior Citizen"
  | "Solo Parent & Child Welfare"
  | "Livelihood & Training"
  | "Financial Aid"
  | "Appointments"

type ActionType = "approved" | "rejected" | "scheduled" | "completed" | "created" | "edited"

interface ActivityEntry {
  id: string
  timestamp: string
  actor: string
  actorRole: string
  action: ActionType
  module: ModuleKey
  referenceNo: string
  subject: string
  detail?: string
  deletedAt?: string
}

const MODULE_OPTIONS: ModuleKey[] = [
  "AICS",
  "PWD & Senior Citizen",
  "Solo Parent & Child Welfare",
  "Livelihood & Training",
  "Financial Aid",
  "Appointments",
]

const moduleColors: Record<ModuleKey, string> = {
  AICS: "bg-blue-50 text-blue-700 border-blue-200",
  "PWD & Senior Citizen": "bg-purple-50 text-purple-700 border-purple-200",
  "Solo Parent & Child Welfare": "bg-rose-50 text-rose-700 border-rose-200",
  "Livelihood & Training": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Financial Aid": "bg-amber-50 text-amber-700 border-amber-200",
  Appointments: "bg-sky-50 text-sky-700 border-sky-200",
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  )}`
}

function initials(name: string) {
  const parts = name.trim().split(" ")
  return `${parts[0]?.charAt(0) ?? ""}${parts[parts.length - 1]?.charAt(0) ?? ""}`.toUpperCase()
}

// Ino-convert ang raw row mula sa backend (snake_case) papuntang ActivityEntry (camelCase)
function mapActivityRow(row: any): ActivityEntry {
  return {
    id: String(row.id),
    timestamp: row.created_at,
    actor: row.actor,
    actorRole: row.actor_role,
    action: row.action as ActionType,
    module: row.module as ModuleKey,
    referenceNo: row.reference_no,
    subject: row.subject,
    detail: row.detail || undefined,
  }
}

const actionTheme: Record<ActionType, { icon: React.ReactNode; chip: string; label: string }> = {
  approved: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    chip: "bg-emerald-100 text-emerald-700",
    label: "Approved",
  },
  rejected: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    chip: "bg-red-100 text-red-700",
    label: "Rejected",
  },
  scheduled: {
    icon: <Calendar className="h-3.5 w-3.5" />,
    chip: "bg-blue-100 text-blue-700",
    label: "Scheduled",
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    chip: "bg-teal-100 text-teal-700",
    label: "Completed",
  },
  created: {
    icon: <UserPlus className="h-3.5 w-3.5" />,
    chip: "bg-indigo-100 text-indigo-700",
    label: "Submitted",
  },
  edited: {
    icon: <FileEdit className="h-3.5 w-3.5" />,
    chip: "bg-amber-100 text-amber-700",
    label: "Edited",
  },
};

const DEFAULT_ACTION_THEME = {
  icon: <Clock className="h-3.5 w-3.5" />,
  chip: "bg-slate-100 text-slate-700 border-slate-200",
  label: "Activity",
};

function getActionTheme(action?: string) {
  if (!action) return DEFAULT_ACTION_THEME;
  const act = String(action).toLowerCase() as ActionType;
  if (actionTheme[act]) return actionTheme[act];

  if (act.includes("approve")) return actionTheme.approved;
  if (act.includes("reject")) return actionTheme.rejected;
  if (act.includes("schedule")) return actionTheme.scheduled;
  if (act.includes("complete")) return actionTheme.completed;
  if (act.includes("submit") || act.includes("create") || act.includes("register")) return actionTheme.created;
  if (act.includes("edit") || act.includes("update") || act.includes("modify")) return actionTheme.edited;

  return {
    icon: <Clock className="h-3.5 w-3.5" />,
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    label: action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, " "),
  };
}

function getModuleColor(mod?: string) {
  if (mod && moduleColors[mod as ModuleKey]) return moduleColors[mod as ModuleKey];
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function ActivityRow({
  entry,
  onDelete,
}: {
  entry: ActivityEntry
  onDelete: (entry: ActivityEntry) => void
}) {
  const at = getActionTheme(entry.action)
  return (
    <div className="group flex gap-4 px-4 py-4 border-b border-border last:border-0">
      <div className="flex flex-col items-center shrink-0">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
          {initials(entry.actor)}
        </div>
        <div className="flex-1 w-px bg-border mt-1" />
      </div>

      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-foreground">{entry.actor}</span>
          <span className="text-[11px] text-muted-foreground">{entry.actorRole}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${at.chip}`}>
            {at.icon}
            {at.label}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getModuleColor(entry.module)}`}>
            {entry.module}
          </span>
        </div>
        <p className="text-sm text-foreground">
          <span className="font-medium">{entry.subject}</span>
          <span className="text-muted-foreground"> — Ref: {entry.referenceNo}</span>
        </p>
        {entry.detail && <p className="text-xs text-muted-foreground mt-1">{entry.detail}</p>}
        <p className="text-[11px] text-muted-foreground mt-1.5">{formatDateTime(entry.timestamp)}</p>
      </div>

      <div className="shrink-0">
        <button
          type="button"
          onClick={() => onDelete(entry)}
          title="Delete entry"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function DeletedRow({
  entry,
  onRestore,
  onPermanentDelete,
}: {
  entry: ActivityEntry
  onRestore: (entry: ActivityEntry) => void
  onPermanentDelete: (entry: ActivityEntry) => void
}) {
  const at = getActionTheme(entry.action)
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
        {initials(entry.actor)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-semibold text-foreground truncate">{entry.actor}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${at.chip}`}>
            {at.icon}
            {at.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {entry.subject} — Ref: {entry.referenceNo}
        </p>
        {entry.deletedAt && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Deleted {formatDateTime(entry.deletedAt)}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onRestore(entry)}
          title="Restore"
          className="h-8 px-2.5 flex items-center gap-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
        <button
          type="button"
          onClick={() => onPermanentDelete(entry)}
          title="Delete permanently"
          className="h-8 px-2.5 flex items-center gap-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete permanently
        </button>
      </div>
    </div>
  )
}

export default function ActivityLog() {
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [recentlyDeleted, setRecentlyDeleted] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterModule, setFilterModule] = useState<"all" | ModuleKey>("all")
  const [filterAction, setFilterAction] = useState<"all" | ActionType>("all")

  const [showTrash, setShowTrash] = useState(false)
  const [toast, setToast] = useState<ActivityEntry | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ActivityEntry | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [trashLoading, setTrashLoading] = useState(false)
  const [trashErrorMsg, setTrashErrorMsg] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${API_BASE}/activity-log`)
      if (!res.ok) throw new Error("Failed to fetch activity log")
      const data = await res.json()
      setActivity((data.activity || []).map(mapActivityRow))
    } catch (err) {
      console.error(err)
      setErrorMsg("Hindi makuha ang activity log. Siguraduhing tumatakbo ang backend server.")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDeletedActivity = useCallback(async () => {
    setTrashLoading(true)
    setTrashErrorMsg(null)
    try {
      const res = await fetch(`${API_BASE}/activity-log/deleted`)
      if (!res.ok) throw new Error("Failed to fetch deleted activity log")
      const data = await res.json()
      setRecentlyDeleted(
        (data.activity || []).map((row: any) => ({
          ...mapActivityRow(row),
          deletedAt: row.deleted_at,
        }))
      )
    } catch (err) {
      console.error(err)
      setTrashErrorMsg("Hindi makuha ang trash. Siguraduhing tumatakbo ang backend server.")
    } finally {
      setTrashLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  // Kunin ang laman ng trash mula sa backend tuwing bubuksan ito,
  // para sync sa totoong data (hindi lang local state).
  useEffect(() => {
    if (showTrash) {
      fetchDeletedActivity()
    }
  }, [showTrash, fetchDeletedActivity])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // Soft delete: alisin agad sa main list (optimistic), ilagay sa "recently deleted".
  // Kung mabigo ang request sa backend, ibabalik sa main list at may error message.
  const handleSoftDelete = useCallback(async (entry: ActivityEntry) => {
    setActivity((prev) => prev.filter((a) => a.id !== entry.id))
    setRecentlyDeleted((prev) => [{ ...entry, deletedAt: new Date().toISOString() }, ...prev])

    setToast(entry)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 6000)

    try {
      const res = await fetch(`${API_BASE}/activity-log/${entry.id}/soft-delete`, { method: "PATCH" })
      if (!res.ok) throw new Error("soft-delete failed")
    } catch (err) {
      console.error(err)
      // i-rollback ang optimistic update
      setRecentlyDeleted((prev) => prev.filter((a) => a.id !== entry.id))
      setActivity((prev) =>
        [...prev, entry].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      )
      setToast(null)
      setErrorMsg("Hindi na-delete ang entry. Siguraduhing tumatakbo ang backend server.")
    }
  }, [])

  // Undo mula sa toast, o Restore mula sa trash panel — parehong balik sa main list
  const handleRestore = useCallback(async (entry: ActivityEntry) => {
    setRecentlyDeleted((prev) => prev.filter((a) => a.id !== entry.id))
    setActivity((prev) => {
      const { deletedAt, ...restored } = entry
      const next = [restored, ...prev]
      return next.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    })
    setToast(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)

    try {
      const res = await fetch(`${API_BASE}/activity-log/${entry.id}/restore`, { method: "PATCH" })
      if (!res.ok) throw new Error("restore failed")
    } catch (err) {
      console.error(err)
      // i-rollback ang optimistic update
      setActivity((prev) => prev.filter((a) => a.id !== entry.id))
      setRecentlyDeleted((prev) => [entry, ...prev])
      setTrashErrorMsg("Hindi na-restore ang entry. Siguraduhing tumatakbo ang backend server.")
    }
  }, [])

  // Permanenteng pagbura — kailangan muna ng confirmation
  const requestPermanentDelete = useCallback((entry: ActivityEntry) => {
    setConfirmTarget(entry)
  }, [])

  const confirmPermanentDelete = useCallback(async () => {
    if (!confirmTarget) return
    const entry = confirmTarget
    setRecentlyDeleted((prev) => prev.filter((a) => a.id !== entry.id))
    setConfirmTarget(null)

    try {
      const res = await fetch(`${API_BASE}/activity-log/${entry.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("permanent delete failed")
    } catch (err) {
      console.error(err)
      setRecentlyDeleted((prev) => [entry, ...prev])
      setTrashErrorMsg("Hindi na-permanently delete ang entry. Siguraduhing tumatakbo ang backend server.")
    }
  }, [confirmTarget])

  const filtered = activity.filter((entry) => {
    const matchModule = filterModule === "all" || entry.module === filterModule
    const matchAction = filterAction === "all" || entry.action === filterAction
    const matchSearch =
      searchTerm === "" ||
      entry.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.actor.toLowerCase().includes(searchTerm.toLowerCase())
    return matchModule && matchAction && matchSearch
  })

  const todayStr = new Date().toDateString()
  const stats = {
    total: activity.length,
    approved: activity.filter((a) => a.action === "approved").length,
    rejected: activity.filter((a) => a.action === "rejected").length,
    today: activity.filter((a) => new Date(a.timestamp).toDateString() === todayStr).length,
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-foreground">
          {showTrash ? "Recently Deleted" : "Activity Log"}
        </h1>
        <button
          type="button"
          onClick={() => setShowTrash((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showTrash
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground border-border hover:bg-muted"
          }`}
        >
          {showTrash ? (
            <>
              <History className="h-4 w-4" />
              Back to Activity Log
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Recently Deleted
              {recentlyDeleted.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold">
                  {recentlyDeleted.length}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {showTrash ? (
        /* Trash view — pinapalitan ang buong content habang naka-open ang Recently Deleted */
        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              {trashLoading
                ? "Loading..."
                : `${recentlyDeleted.length} ${recentlyDeleted.length === 1 ? "deleted entry" : "deleted entries"}`}
            </h2>
          </div>
          {trashErrorMsg && (
            <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{trashErrorMsg}</div>
          )}
          {!trashLoading && recentlyDeleted.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Trash is empty.</p>
            </div>
          ) : (
            <div>
              {recentlyDeleted.map((entry) => (
                <DeletedRow
                  key={entry.id}
                  entry={entry}
                  onRestore={handleRestore}
                  onPermanentDelete={requestPermanentDelete}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {errorMsg && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{errorMsg}</div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <History className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Total entries</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Approved</p>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{stats.approved}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <XCircle className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Rejected</p>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Today</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.today}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, reference no., or staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Module
                </label>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value as any)}
                  className="mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 block"
                >
                  <option value="all">All Modules</option>
                  {MODULE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Action</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value as any)}
                  className="mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 block"
                >
                  <option value="all">All Actions</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="created">Submitted</option>
                  <option value="edited">Edited</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                {loading ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`}
              </h2>
            </div>

            {!loading && filtered.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No activity found.</p>
              </div>
            ) : (
              <div>
                {filtered.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} onDelete={handleSoftDelete} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-foreground text-background px-4 py-3 rounded-xl shadow-lg text-sm">
            <span>
              Nabura ang entry ni <strong>{toast.actor}</strong> — {toast.referenceNo}
            </span>
            <button
              type="button"
              onClick={() => handleRestore(toast)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background/15 hover:bg-background/25 font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-background/15"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm permanent delete modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-lg max-w-sm w-full p-5">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Delete permanently?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Hindi na ito maibabalik pa. Permanenteng mabubura ang entry ni{" "}
              <strong className="text-foreground">{confirmTarget.actor}</strong> — Ref:{" "}
              {confirmTarget.referenceNo}.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}