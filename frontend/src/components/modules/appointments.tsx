import { useState, useEffect, type ReactElement } from "react"
import {
  Calendar,
  Clock,
  CheckCircle2,
  Search,
  MapPin,
} from "lucide-react"
import {
  syncAppointmentToFinancialAid,
  parseAppointmentDateTime,
  checkAndAutoReleaseScheduledDisbursements,
} from "../../utils/financialAidSync"
import { notifyApplicationChange, subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import { API_BASE } from "../../config/api"

// ---- Types ----
type ModuleKey =
  | "AICS"
  | "PWD"
  | "Senior Citizen"
  | "Solo Parent"
  | "Child Welfare"
  | "Livelihood"

type AppointmentStatus = "pending" | "scheduled" | "completed"

interface AppointmentRequest {
  id: string
  referenceNo: string
  module: ModuleKey
  applicantName: string
  submittedAt: string
  concern: string
  status: AppointmentStatus
  scheduledDate?: string
  scheduledTime?: string
  officeLocation?: string
  notes?: string
}

// ---- Empty Mock Data so only real submitted applications appear ----
const MOCK_APPOINTMENTS: AppointmentRequest[] = []

const MODULE_OPTIONS: ModuleKey[] = [
  "AICS",
  "PWD",
  "Senior Citizen",
  "Solo Parent",
  "Child Welfare",
  "Livelihood",
]

const moduleColors: Record<ModuleKey, string> = {
  AICS: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
  PWD: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60",
  "Senior Citizen": "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  "Solo Parent": "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
  "Child Welfare": "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
  Livelihood: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
}

const statusTheme: Record<AppointmentStatus, { card: string; chip: string; icon: ReactElement; label: string }> = {
  pending: {
    card: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40",
    chip: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60",
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Pending",
  },
  scheduled: {
    card: "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40",
    chip: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60",
    icon: <Calendar className="h-3.5 w-3.5" />,
    label: "Scheduled",
  },
  completed: {
    card: "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40",
    chip: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Completed",
  },
}

const DEFAULT_APPT_STATUS_THEME = {
  card: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40",
  chip: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60",
  icon: <Clock className="h-3.5 w-3.5" />,
  label: "Pending",
}

function getAppointmentStatusTheme(status?: string) {
  if (!status) return DEFAULT_APPT_STATUS_THEME
  const s = String(status).toLowerCase() as AppointmentStatus
  if (statusTheme[s]) return statusTheme[s]
  if (s.includes("sched")) return statusTheme.scheduled
  if (s.includes("comp") || s.includes("done")) return statusTheme.completed
  return {
    card: "bg-slate-50/60 border-slate-200",
    chip: "bg-slate-100 text-slate-700",
    icon: <Clock className="h-3.5 w-3.5" />,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  }
}

function getAppointmentModuleColor(mod?: string) {
  if (mod && moduleColors[mod as ModuleKey]) return moduleColors[mod as ModuleKey]
  return "bg-slate-50 text-slate-700 border-slate-200"
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

// ---- Schedule Modal ----
interface ScheduleModalProps {
  appointment: AppointmentRequest
  onClose: () => void
  onSave: (id: string, date: string, time: string, location: string, notes: string) => void
}

function ScheduleModal({ appointment, onClose, onSave }: ScheduleModalProps) {
  const [date, setDate] = useState(appointment.scheduledDate || "")
  const [time, setTime] = useState(appointment.scheduledTime || "")
  const location = appointment.officeLocation || "Quezon City Hall"

  const canSave = date.trim() !== "" && time.trim() !== ""

  const autoNotes =
    appointment.notes && !appointment.notes.includes("Awtomatikong pumasok")
      ? appointment.notes
      : `Mangyaring magtungo sa ${location} sa itinakdang petsa at oras. Dalhin ang orihinal na QCID / Valid ID para sa transaksyon sa ${appointment.concern}.`

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Set Appointment Schedule</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{appointment.applicantName} — {appointment.referenceNo}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl font-light cursor-pointer">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Time *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Office Location</label>
            <div className="w-full mt-1 px-3 py-2.5 text-sm bg-slate-50 border border-border rounded-lg text-foreground font-semibold flex items-center justify-between">
              <span>{location}</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wider">Fixed Venue</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (canSave) onSave(appointment.id, date, time, location, autoNotes)
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Confirm & Save Schedule
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Appointment Card ----
function AppointmentCard({
  appt,
  onSchedule,
  onMarkCompleted: _onMarkCompleted,
  onDelete: _onDelete,
}: {
  appt: AppointmentRequest
  onSchedule: (a: AppointmentRequest) => void
  onMarkCompleted?: (id: string) => void
  onDelete?: (id: string, ref: string) => void
}) {
  const st = getAppointmentStatusTheme(appt.status)
  return (
    <div className={`border rounded-xl p-4 ${st?.card || 'bg-slate-50/60 border-slate-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{appt.applicantName}</p>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getAppointmentModuleColor(appt.module)}`}>
              {appt.module}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1 font-mono">Ref: {appt.referenceNo}</p>
          <p className="text-sm text-foreground mb-2">{appt.concern}</p>
          <p className="text-xs text-muted-foreground">Requested: {formatDateTime(appt.submittedAt)}</p>

          {appt.status !== "pending" && appt.scheduledDate && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground bg-white/70 dark:bg-slate-900/60 rounded-lg px-3 py-2 border border-border/70 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {new Date(appt.scheduledDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {appt.scheduledTime}
              </span>
              {appt.officeLocation && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {appt.officeLocation}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${st?.chip || 'bg-slate-100 text-slate-700'}`}>
              {st?.icon}
              {st?.label}
            </span>
          </div>

          {appt.status === "pending" && (
            <button
              onClick={() => onSchedule(appt)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
              Set Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper: Robust single-key deduplicator for appointments
function getAppointmentDeduplicationKey(a: { referenceNo?: string; applicantName?: string; concern?: string; module?: string }): string {
  const cleanRef = String(a.referenceNo || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().trim()
  const cleanConcern = String(a.concern || "")
    .toLowerCase()
    .replace(/assistance/g, "")
    .replace(/social/g, "")
    .replace(/program/g, "")
    .replace(/capital/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
  if (cleanRef) {
    return `ref_${cleanRef}_${cleanConcern}`
  }
  const cleanName = String(a.applicantName || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim()
  return `name_${cleanName}_${cleanConcern}`
}

// ---- Main Component ----
export default function Appointments() {
  const [appointments, setAppointments] = useState<AppointmentRequest[]>(() => {
    try {
      const cached = localStorage.getItem("cached_appointments_list")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {}
    return MOCK_APPOINTMENTS
  })
  const [schedulingAppt, setSchedulingAppt] = useState<AppointmentRequest | null>(null)
  const [filterModule, setFilterModule] = useState<"all" | ModuleKey>("all")
  const [filterStatus, setFilterStatus] = useState<"all" | AppointmentStatus>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const isFetchingRef = useState({ current: false })[0]

  useEffect(() => {
    const fetchAppointments = async () => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      try {
        let appts: AppointmentRequest[] = []

        // Local cache for instantly scheduled/completed appointments
        let localScheduledMap: Record<string, any> = {}
        try {
          const raw = localStorage.getItem("all_appointments_scheduled")
          if (raw) localScheduledMap = JSON.parse(raw)
        } catch {}

        // Read dismissed/deleted appointments list
        let dismissedSet = new Set<string>()
        try {
          const dismissedRaw = localStorage.getItem("dismissed_appointments")
          if (dismissedRaw) {
            const parsed = JSON.parse(dismissedRaw)
            if (Array.isArray(parsed)) {
              parsed.forEach((d: string) => dismissedSet.add(String(d).trim().toLowerCase()))
            }
          }
        } catch {}

        // Fetch all endpoints concurrently in parallel
        const [
          resDbSettled,
          resAicsSettled,
          resPwdSettled,
          resLivSettled,
          resCwSettled,
        ] = await Promise.allSettled([
          fetch(`${API_BASE}/api/appointments`),
          fetch(`${API_BASE}/api/aics/applications`),
          fetch(`${API_BASE}/api/pwd-senior/applications`),
          fetch(`${API_BASE}/api/livelihood/applications`),
          fetch(`${API_BASE}/api/child-welfare/admin/all?limit=100`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          }),
        ])

        // 1. Process DB appointments
        if (resDbSettled.status === "fulfilled" && resDbSettled.value.ok) {
          try {
            const dataDb = await resDbSettled.value.json()
            if (Array.isArray(dataDb.deletedReferences)) {
              dataDb.deletedReferences.forEach((r: string) => dismissedSet.add(String(r).trim().toLowerCase()))
            }
            if (dataDb.appointments && Array.isArray(dataDb.appointments)) {
              const mapped = dataDb.appointments
                .filter((a: any) => {
                  const concern = String(a.concern || '').toLowerCase()
                  const ref = String(a.qc_id || a.qcid || a.reference_no || a.reference_number || '').trim().toLowerCase()
                  const rawId = String(a.id || '').trim().toLowerCase()
                  if (dismissedSet.has(ref) || dismissedSet.has(rawId) || dismissedSet.has(`db-appt-${rawId}`)) {
                    return false
                  }
                  if (concern.includes('id card') || concern.includes('issuance') || concern.includes('replacement') || concern.includes('renewal')) {
                    return false
                  }
                  return true
                })
                .map((a: any) => {
                  const apptId = `db-appt-${a.id}`
                  const ref = a.qc_id || a.qcid || a.reference_no || a.reference_number || ""
                  const cached = localScheduledMap[apptId] || localScheduledMap[ref] || localScheduledMap[`${ref}_${a.concern}`]
                  return {
                    id: apptId,
                    referenceNo: ref,
                    module: (a.module || "AICS") as ModuleKey,
                    applicantName: a.applicant_name,
                    submittedAt: a.created_at || new Date().toISOString(),
                    concern: a.concern,
                    status: (cached?.status || a.status || "pending") as AppointmentStatus,
                    scheduledDate: cached?.scheduledDate || a.scheduled_date,
                    scheduledTime: cached?.scheduledTime || a.scheduled_time,
                    officeLocation: cached?.officeLocation || a.office_location,
                    notes: cached?.notes || a.notes,
                  }
                })
              appts.push(...mapped)
            }
          } catch {}
        }

        // 2. Process AICS
        if (resAicsSettled.status === "fulfilled" && resAicsSettled.value.ok) {
          try {
            const data = await resAicsSettled.value.json()
            if (data.applications && Array.isArray(data.applications)) {
              data.applications.forEach((app: any) => {
                if (app.status === "approved" || app.status === "completed" || app.status === "for_release" || app.status === "released") {
                  const rawType = (app.assistance_type || "Medical").replace(/\s*assistance/gi, "").trim()
                  const cleanType = (rawType.charAt(0).toUpperCase() + rawType.slice(1)) + " Assistance"
                  const ref = app.qc_id || app.reference_no || app.reference_number || `AICS-2026-${String(app.id || 1).padStart(4, "0")}`
                  const apptId = `aics-appt-${app.id || ref}`
                  const cached = localScheduledMap[apptId] || localScheduledMap[ref] || localScheduledMap[`${ref}_${cleanType}`]
                  const isDone = app.status === "completed" || app.status === "released" || cached?.status === "completed"
                  appts.push({
                    id: apptId,
                    referenceNo: ref,
                    module: "AICS",
                    applicantName: `${app.first_name || ""} ${app.middle_name || ""} ${app.last_name || ""}`.trim().toUpperCase() || "BENEFICIARY APPLICANT",
                    submittedAt: app.created_at || new Date().toISOString(),
                    concern: cleanType,
                    status: isDone ? "completed" : ((cached?.status || "pending") as AppointmentStatus),
                    scheduledDate: cached?.scheduledDate,
                    scheduledTime: cached?.scheduledTime,
                    officeLocation: cached?.officeLocation || "Quezon City Hall",
                    notes: cached?.notes,
                  })
                }
              })
            }
          } catch {}
        }

        // 3. Process PWD / Senior
        let pwdSeniorApps: any[] = []
        if (resPwdSettled.status === "fulfilled" && resPwdSettled.value.ok) {
          try {
            pwdSeniorApps = await resPwdSettled.value.json()
          } catch {}
        }
        if (!pwdSeniorApps || pwdSeniorApps.length === 0) {
          try {
            const local = localStorage.getItem("pwd_senior_applications")
            if (local) pwdSeniorApps = JSON.parse(local)
          } catch {}
        }
        if (Array.isArray(pwdSeniorApps)) {
          pwdSeniorApps.forEach((app: any) => {
            const isAssistance =
              app.type === "assistance" ||
              app.type === "social-assistance" ||
              String(app.category || "").toLowerCase().includes("assistance") ||
              String(app.service || "").toLowerCase().includes("assistance") ||
              String(app.assistanceType || "").toLowerCase().includes("assistance")
            if (isAssistance && (app.status === "approved" || app.status === "completed" || app.status === "for_release" || app.status === "released")) {
              const isPwd = String(app.category || "").toUpperCase().includes("PWD")
              const mod: ModuleKey = isPwd ? "PWD" : "Senior Citizen"
              const concern = isPwd ? "PWD Social Assistance" : "Senior Social Assistance"
              const ref = app.referenceNumber || app.reference_number || "PWD-QC-2026"
              const apptId = `pwd-senior-appt-${app.id || ref}`
              const cached = localScheduledMap[apptId] || localScheduledMap[ref] || localScheduledMap[`${ref}_${concern}`]
              const fullName = [app.firstName || app.first_name, app.middleName || app.middle_name, app.lastName || app.last_name, app.suffix].filter(Boolean).join(" ").trim().toUpperCase() || "BENEFICIARY"
              const isDone = app.status === "completed" || app.status === "released" || cached?.status === "completed"
              appts.push({
                id: apptId,
                referenceNo: ref,
                module: mod,
                applicantName: fullName,
                submittedAt: app.submittedAt || app.created_at || new Date().toISOString(),
                concern,
                status: isDone ? "completed" : ((cached?.status || "pending") as AppointmentStatus),
                scheduledDate: cached?.scheduledDate,
                scheduledTime: cached?.scheduledTime,
                officeLocation: cached?.officeLocation || "Quezon City Hall",
                notes: cached?.notes,
              })
            }
          })
        }

        // 4. Process Livelihood
        if (resLivSettled.status === "fulfilled" && resLivSettled.value.ok) {
          try {
            const dataLiv = await resLivSettled.value.json()
            if (Array.isArray(dataLiv)) {
              dataLiv.forEach((l: any) => {
                if (String(l.application_status || l.status).toLowerCase() === "approved") {
                  const ref = l.reference_number || `LP-2026-${l.id}`
                  const apptId = `liv-appt-${l.id || ref}`
                  const concern = "Livelihood Capital Assistance"
                  const cached = localScheduledMap[apptId] || localScheduledMap[ref] || localScheduledMap[`${ref}_${concern}`]
                  const fullName = `${l.first_name || ""} ${l.last_name || ""}`.trim().toUpperCase() || "BENEFICIARY"
                  appts.push({
                    id: apptId,
                    referenceNo: ref,
                    module: "Livelihood",
                    applicantName: fullName,
                    submittedAt: l.created_at || new Date().toISOString(),
                    concern,
                    status: (cached?.status || "pending") as AppointmentStatus,
                    scheduledDate: cached?.scheduledDate,
                    scheduledTime: cached?.scheduledTime,
                    officeLocation: cached?.officeLocation || "Quezon City Hall - SSDD Livelihood Center",
                    notes: cached?.notes,
                  })
                }
              })
            }
          } catch {}
        }

        // 5. Process Child Welfare
        if (resCwSettled.status === "fulfilled" && resCwSettled.value.ok) {
          try {
            const dataCw = await resCwSettled.value.json()
            const cwApps = Array.isArray(dataCw.applications) ? dataCw.applications : []
            cwApps.forEach((c: any) => {
              const st = String(c.application_status || c.status).toLowerCase()
              if (st === "approved" || st === "for_release" || st === "released" || st === "completed") {
                const ref = c.reference_number || `CW-2026-${c.id}`
                const apptId = `cw-appt-${c.id || ref}`
                const concern = c.category_title ? `${c.category_title} (Child Welfare)` : "Child Welfare Support"
                const cached = localScheduledMap[apptId] || localScheduledMap[ref] || localScheduledMap[`${ref}_${concern}`]
                const fullName = [c.guardian_first_name, c.guardian_last_name].filter(Boolean).join(" ").trim().toUpperCase() || (c.child_name || "").toUpperCase() || "BENEFICIARY"
                const isDone = st === "released" || st === "completed" || cached?.status === "completed"
                appts.push({
                  id: apptId,
                  referenceNo: ref,
                  module: "Child Welfare",
                  applicantName: fullName,
                  submittedAt: c.created_at || new Date().toISOString(),
                  concern,
                  status: isDone ? "completed" : ((cached?.status || "pending") as AppointmentStatus),
                  scheduledDate: cached?.scheduledDate,
                  scheduledTime: cached?.scheduledTime,
                  officeLocation: cached?.officeLocation || "Quezon City Hall - SSDD Child Welfare Section",
                  notes: cached?.notes,
                })
              }
            })
          } catch {}
        }

        // Filter out any dismissed / deleted appointments
        appts = appts.filter((a) => {
          const ref = String(a.referenceNo || '').toLowerCase().trim()
          const id = String(a.id || '').toLowerCase().trim()
          const rawId = id.replace(/^(db-appt-|aics-appt-|pwd-senior-appt-|cw-appt-|liv-appt-)/, '')
          return !dismissedSet.has(ref) && !dismissedSet.has(id) && !dismissedSet.has(rawId)
        })

        // Strict single-appointment deduplication by normalized reference / applicant and concern
        const dedupedMap = new Map<string, AppointmentRequest>()
        const statusPriority: Record<AppointmentStatus, number> = { completed: 3, scheduled: 2, pending: 1 }

        appts.forEach((a) => {
          const c = (a.concern || '').toLowerCase()
          if (c.includes('id card') || c.includes('issuance') || c.includes('replacement') || c.includes('renewal')) {
            return
          }
          const key = getAppointmentDeduplicationKey(a)
          if (!dedupedMap.has(key)) {
            dedupedMap.set(key, a)
          } else {
            const existing = dedupedMap.get(key)!
            const curPrio = statusPriority[a.status] || 1
            const exPrio = statusPriority[existing.status] || 1

            const merged: AppointmentRequest = { ...existing }
            if (curPrio > exPrio) {
              merged.status = a.status
            }
            if (a.scheduledDate && (!merged.scheduledDate || curPrio >= exPrio)) {
              merged.scheduledDate = a.scheduledDate
              merged.scheduledTime = a.scheduledTime
              merged.officeLocation = a.officeLocation
              merged.notes = a.notes || merged.notes
            }
            if (a.id.startsWith('db-appt-')) {
              merged.id = a.id
            }
            if (a.concern && a.concern.length > (merged.concern || '').length) {
              merged.concern = a.concern
            }
            dedupedMap.set(key, merged)
          }
        })

        const finalAppts = Array.from(dedupedMap.values())
        if (finalAppts.length > 0) {
          setAppointments(finalAppts)
          try {
            localStorage.setItem("cached_appointments_list", JSON.stringify(finalAppts))
            localStorage.setItem("all_appointments", JSON.stringify(finalAppts))
            localStorage.setItem("appointments", JSON.stringify(finalAppts))
          } catch {}
        }
      } catch (err) {
        console.warn("Could not fetch appointments from backend:", err)
      } finally {
        isFetchingRef.current = false
      }
    }

    fetchAppointments()

    // Auto-complete appointments and auto-release disbursements when exact scheduled date/time arrives
    // and periodically re-fetch from database to keep appointments in real-time sync with all devices
    const liveTimer = setInterval(() => {
      fetchAppointments()
      checkAndAutoReleaseScheduledDisbursements()
      const now = new Date()
      setAppointments((prev) => {
        let hasChanges = false
        const updated = prev.map((a) => {
          if (a.status === "scheduled" && a.scheduledDate) {
            const dt = parseAppointmentDateTime(a.scheduledDate, a.scheduledTime)
            if (dt && now.getTime() >= dt.getTime()) {
              hasChanges = true
              try {
                const raw = localStorage.getItem("all_appointments_scheduled")
                const localMap = raw ? JSON.parse(raw) : {}
                localMap[a.id] = { status: "completed", scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime }
                localMap[a.referenceNo] = { status: "completed", scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime }
                localMap[`${a.referenceNo}_${a.concern}`] = { status: "completed", scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime }
                localStorage.setItem("all_appointments_scheduled", JSON.stringify(localMap))
              } catch {}
              fetch(`${API_BASE}/api/appointments/${encodeURIComponent(a.referenceNo)}/complete`, { method: "PUT" }).catch(() => {})
              return { ...a, status: "completed" as const }
            }
          }
          return a
        })
        return hasChanges ? updated : prev
      })
    }, 5000)

    const unsubscribeRealtime = subscribeToRealtimeChanges(() => {
      fetchAppointments()
    })

    const handleStorageChange = () => fetchAppointments()
    window.addEventListener("appointments_updated", handleStorageChange)
    window.addEventListener("storage", handleStorageChange)
    return () => {
      clearInterval(liveTimer)
      unsubscribeRealtime()
      window.removeEventListener("appointments_updated", handleStorageChange)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const handleSaveSchedule = async (id: string, date: string, time: string, location: string, notes: string) => {
    const targetAppt = appointments.find((a) => a.id === id)
    if (targetAppt) {
      // Save directly into local cache so it NEVER reverts to pending during poll
      try {
        const raw = localStorage.getItem("all_appointments_scheduled")
        const localScheduledMap = raw ? JSON.parse(raw) : {}
        const schedObj = {
          status: "scheduled",
          scheduledDate: date,
          scheduledTime: time,
          officeLocation: location,
          notes,
        }
        localScheduledMap[targetAppt.id] = schedObj
        localScheduledMap[`${targetAppt.referenceNo}_${targetAppt.concern}`] = schedObj
        localScheduledMap[targetAppt.referenceNo] = schedObj
        localStorage.setItem("all_appointments_scheduled", JSON.stringify(localScheduledMap))
      } catch {}

      // Auto-connect with Financial Aid Disbursement and User Notifications
      syncAppointmentToFinancialAid({
        referenceNo: targetAppt.referenceNo,
        applicantName: targetAppt.applicantName,
        concern: targetAppt.concern,
        date,
        time,
        location,
        notes,
      })

      // Explicit API PUT call
      try {
        await fetch(`${API_BASE}/api/appointments/${encodeURIComponent(targetAppt.referenceNo)}/schedule`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledDate: date,
            scheduledTime: time,
            officeLocation: location,
            notes,
            applicantName: targetAppt.applicantName,
            concern: targetAppt.concern,
          }),
        })
      } catch (err) {
        console.warn("Backend schedule PUT error:", err)
      }
    }

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "scheduled" as const,
              scheduledDate: date,
              scheduledTime: time,
              officeLocation: location,
              notes,
            }
          : a
      )
    )
    setSchedulingAppt(null)
  }

  const handleMarkCompleted = async (id: string) => {
    const targetAppt = appointments.find((a) => a.id === id)
    const ref = targetAppt?.referenceNo || id.replace('db-appt-', '')
    try {
      const raw = localStorage.getItem("all_appointments_scheduled")
      const localScheduledMap = raw ? JSON.parse(raw) : {}
      const compObj = { status: "completed" }
      localScheduledMap[id] = compObj
      if (targetAppt) {
        localScheduledMap[`${targetAppt.referenceNo}_${targetAppt.concern}`] = compObj
      }
      localScheduledMap[ref] = compObj
      localStorage.setItem("all_appointments_scheduled", JSON.stringify(localScheduledMap))
    } catch {}

    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "completed" as const } : a)))

    try {
      await fetch(`${API_BASE}/api/appointments/${encodeURIComponent(ref)}/complete`, { method: "PUT" })
    } catch {}
  }

  const filtered = appointments.filter((a) => {
    const matchModule = filterModule === "all" || a.module === filterModule
    const matchStatus = filterStatus === "all" || a.status === filterStatus
    const matchSearch =
      searchTerm === "" ||
      a.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())
    return matchModule && matchStatus && matchSearch
  })

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    scheduled: appointments.filter((a) => a.status === "scheduled").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: stats.total },
          { label: "Pending", value: stats.pending },
          { label: "Scheduled", value: stats.scheduled },
          { label: "Completed", value: stats.completed },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4 bg-card border border-border shadow-xs">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-bold text-foreground dark:text-white mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or reference number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Module</label>
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
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 block"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Requests ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No appointment requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onSchedule={setSchedulingAppt}
                onMarkCompleted={handleMarkCompleted}
                onDelete={async (id, ref) => {
                  if (confirm(`Burahin ang appointment request para kay ${appt.applicantName}?`)) {
                    const cleanRef = String(ref || '').trim()
                    const cleanId = String(id || '').trim()
                    const rawId = cleanId.replace(/^(db-appt-|aics-appt-|pwd-senior-appt-|cw-appt-)/, '').trim()

                    // 1. Immediately remove from frontend state
                    setAppointments((prev) =>
                      prev.filter((item) => {
                        const iRef = String(item.referenceNo || '').trim().toLowerCase()
                        const iId = String(item.id || '').trim().toLowerCase()
                        if (cleanId && iId === cleanId.toLowerCase()) return false
                        if (cleanRef && iRef === cleanRef.toLowerCase()) return false
                        if (rawId && (iId.includes(rawId.toLowerCase()) || iRef === rawId.toLowerCase())) return false
                        return true
                      })
                    )

                    // 2. Persist in dismissed localStorage
                    try {
                      const dismissedRaw = localStorage.getItem("dismissed_appointments") || "[]"
                      const dismissedList: string[] = JSON.parse(dismissedRaw)
                      if (cleanRef && !dismissedList.includes(cleanRef)) dismissedList.push(cleanRef)
                      if (cleanId && !dismissedList.includes(cleanId)) dismissedList.push(cleanId)
                      if (rawId && !dismissedList.includes(rawId)) dismissedList.push(rawId)
                      localStorage.setItem("dismissed_appointments", JSON.stringify(dismissedList))
                    } catch {}

                    // 3. Clear from local scheduled cache
                    try {
                      const raw = localStorage.getItem("all_appointments_scheduled")
                      if (raw) {
                        const localMap = JSON.parse(raw)
                        delete localMap[cleanId]
                        delete localMap[cleanRef]
                        delete localMap[rawId]
                        localStorage.setItem("all_appointments_scheduled", JSON.stringify(localMap))
                      }
                    } catch {}

                    // 4. Send DELETE to backend database
                    try {
                      await Promise.allSettled([
                        fetch(`${API_BASE}/api/appointments/${encodeURIComponent(cleanId)}`, { method: "DELETE" }),
                        fetch(`${API_BASE}/api/appointments/${encodeURIComponent(cleanRef)}`, { method: "DELETE" }),
                        fetch(`${API_BASE}/api/appointments/${encodeURIComponent(rawId)}`, { method: "DELETE" }),
                      ])
                    } catch {}

                    window.dispatchEvent(new Event("appointments_updated"))
                    notifyApplicationChange("APPLICATION_APPROVED", "appointment", cleanRef || cleanId)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {schedulingAppt && (
        <ScheduleModal
          appointment={schedulingAppt}
          onClose={() => setSchedulingAppt(null)}
          onSave={handleSaveSchedule}
        />
      )}
    </div>
  )
}