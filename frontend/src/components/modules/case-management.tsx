import { useState, useMemo, useEffect, type ReactElement } from "react"
import {
  FolderKanban,
  ClipboardList,
  Calendar,
  Wallet,
  Send,
  History,
  Search,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  X,
  Building,
  FileCheck,
  Activity,
  Info,
  ShieldCheck,
  Sparkles,
  Layers,
  Lock,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import { subscribeToRealtimeChanges, notifyApplicationChange } from "../../utils/realtimeSync"

// =====================================================================================
// Types
// =====================================================================================

export type ModuleKey =
  | "AICS"
  | "PWD"
  | "Senior Citizen"
  | "Solo Parent"
  | "Child Welfare"
  | "Livelihood"
  | "Training Program"

export type CaseStatus = "open" | "monitoring" | "referred" | "closed"
export type CasePriority = "high" | "medium" | "low"
export type ReferralStatus = "pending" | "accepted" | "completed" | "declined"

export interface Referral {
  id: string
  date: string
  referredTo: string
  reason: string
  referredBy: string
  status: ReferralStatus
  remarks?: string
}

export interface MonitoringLog {
  id: string
  date: string
  officer: string
  notes: string
  progressStatus: string
  nextAction?: string
}

export interface LinkedAppointment {
  id: string
  date: string
  time: string
  location: string
  status: string
}

export interface LinkedFinancialAid {
  id: string
  disbursementId: string
  assistanceType: string
  fixedAmount: number
  payoutSchedule: string
  payoutLocation: string
  status: "PENDING" | "RELEASED" | string
}

export interface TimelineEvent {
  id: string
  title: string
  detail: string
  date: string
  type: "submission" | "approval" | "appointment" | "financial" | "referral" | "monitoring" | "closure"
}

export interface CaseRecord {
  id: string
  caseNumber: string
  applicationId: string
  beneficiaryId: string
  beneficiaryName: string
  age: string
  sex: string
  civilStatus: string
  contactNo: string
  email: string
  address: string
  linkedProgram: ModuleKey
  caseType: string
  priority: CasePriority
  dateOpened: string
  assignedSocialWorker: string
  status: CaseStatus
  summary: string
  linkedAppointment: LinkedAppointment | null
  linkedFinancialAid: LinkedFinancialAid | null
  referrals: Referral[]
  monitoringLogs: MonitoringLog[]
  timeline: TimelineEvent[]
}

// =====================================================================================
// Helpers & Tokens
// =====================================================================================

const programColors: Record<ModuleKey, string> = {
  AICS: "bg-blue-50 text-blue-700 border-blue-200",
  PWD: "bg-purple-50 text-purple-700 border-purple-200",
  "Senior Citizen": "bg-amber-50 text-amber-700 border-amber-200",
  "Solo Parent": "bg-rose-50 text-rose-700 border-rose-200",
  "Child Welfare": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Livelihood: "bg-teal-50 text-teal-700 border-teal-200",
  "Training Program": "bg-indigo-50 text-indigo-700 border-indigo-200",
}

const statusMeta: Record<CaseStatus, { label: string; chip: string; dot: string; icon: ReactElement }> = {
  open: {
    label: "OPEN",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  monitoring: {
    label: "UNDER MONITORING",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: <Activity className="h-3.5 w-3.5" />,
  },
  referred: {
    label: "REFERRED",
    chip: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    icon: <Send className="h-3.5 w-3.5" />,
  },
  closed: {
    label: "CLOSED",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
}

const priorityMeta: Record<CasePriority, { label: string; chip: string }> = {
  high: { label: "HIGH", chip: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "MEDIUM", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "LOW", chip: "bg-slate-100 text-slate-700 border-slate-200" },
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
}



// =====================================================================================
// Case Details Modal Component
// =====================================================================================

interface CaseDetailsModalProps {
  c: CaseRecord
  onClose: () => void
  onUpdateStatus: (caseNumber: string, newStatus: CaseStatus, priority?: CasePriority, worker?: string, notes?: string) => Promise<void>
}

function CaseDetailsModal({ c, onClose, onUpdateStatus }: CaseDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "appointment" | "financial" | "referrals" | "monitoring" | "timeline" | "status">("overview")

  // Status update state
  const [isClosingCase, setIsClosingCase] = useState(c.status === "closed")
  const [selectedPriority, setSelectedPriority] = useState<CasePriority>(c.priority)
  const [assignedWorker, setAssignedWorker] = useState(c.assignedSocialWorker || "Admin Social Worker")
  const [statusNotes, setStatusNotes] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const handleSaveStatus = async () => {
    setIsUpdatingStatus(true)
    const targetStatus: CaseStatus = isClosingCase ? "closed" : c.status
    try {
      await onUpdateStatus(c.caseNumber, targetStatus, selectedPriority, assignedWorker, statusNotes)
      alert(`Case ${c.caseNumber} updates successfully saved.`)
    } catch (err) {
      console.error(err)
      alert("Failed to update case status.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const sm = statusMeta[c.status] || statusMeta.open
  const pm = priorityMeta[c.priority] || priorityMeta.medium

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden cursor-default"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                {c.caseNumber}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${programColors[c.linkedProgram]}`}>
                {c.linkedProgram}
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sm.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                {sm.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pm.chip}`}>
                PRIORITY: {pm.label}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 truncate">{c.beneficiaryName}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              BENEFICIARY ID: <strong className="text-slate-700">{c.beneficiaryId}</strong> • APPLICATION REF: <strong className="text-slate-700">{c.applicationId}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-100 bg-white overflow-x-auto shrink-0 scrollbar-none text-xs">
          {[
            { key: "overview", label: "Overview & Beneficiary", icon: <User className="h-3.5 w-3.5" /> },
            { key: "appointment", label: `Appointment ${c.linkedAppointment ? "✓" : ""}`, icon: <Calendar className="h-3.5 w-3.5" /> },
            { key: "financial", label: `Financial Aid ${c.linkedFinancialAid ? `(₱${c.linkedFinancialAid.fixedAmount.toLocaleString()})` : ""}`, icon: <Wallet className="h-3.5 w-3.5" /> },
            { key: "referrals", label: `Referrals (${c.referrals.length})`, icon: <Send className="h-3.5 w-3.5" /> },
            { key: "monitoring", label: `Monitoring (${c.monitoringLogs.length})`, icon: <Activity className="h-3.5 w-3.5" /> },
            { key: "timeline", label: `Case Timeline (${c.timeline.length})`, icon: <History className="h-3.5 w-3.5" /> },
            { key: "status", label: "Manage Status", icon: <ClipboardList className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Overview & Beneficiary */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Beneficiary Information */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 md:p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-blue-600" />
                    Beneficiary Information
                  </h3>
                  <span className="text-xs font-mono text-slate-500">QCID: {c.beneficiaryId}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <span className="text-slate-500">Full Name</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{c.beneficiaryName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Age &amp; Sex</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {[
                        c.age && c.age !== "—" && !isNaN(Number(c.age)) ? `${c.age} yrs old` : (c.age && c.age !== "—" ? c.age : ""),
                        c.sex && c.sex !== "—" ? c.sex : "",
                      ].filter(Boolean).join(" • ") || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Civil Status</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{c.civilStatus || "Single"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Contact Number</span>
                    <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {c.contactNo || "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Complete Address</span>
                    <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {c.address || "Quezon City"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Details */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 md:p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    Application Information
                  </h3>
                  <span className="text-xs font-mono text-slate-500">REF: {c.applicationId}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <span className="text-slate-500">Enrolled Program</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{c.linkedProgram}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Case Type / Concern</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{c.caseType}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Date Opened / Approved</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{formatDate(c.dateOpened)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned Social Worker</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{c.assignedSocialWorker}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Summary / Notes</span>
                    <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">{c.summary}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Connected Appointment */}
          {activeTab === "appointment" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Connected Appointment</h3>
                  <p className="text-xs text-slate-500">
                    Directly linked from the Appointments scheduling module for verification, claiming, or interview.
                  </p>
                </div>
              </div>

              {c.linkedAppointment ? (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Appointment ID: {c.linkedAppointment.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      STATUS: {c.linkedAppointment.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-blue-100">
                      <span className="text-slate-500">Scheduled Date &amp; Time</span>
                      <p className="font-bold text-slate-900 text-sm mt-1">
                        {formatDate(c.linkedAppointment.date)} at {c.linkedAppointment.time || "09:00 AM"}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100">
                      <span className="text-slate-500">Venue / Location</span>
                      <p className="font-semibold text-slate-900 mt-1 leading-snug">
                        {c.linkedAppointment.location}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100/60 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <span>
                      This appointment record is managed in the <strong>Appointments</strong> module. Any rescheduling or completion updates in that module are live-synced here.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-medium text-slate-600">No active appointment required or scheduled for this case.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    If this case requires in-person claiming or social worker consult, schedule it via the Appointments module.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Connected Financial Aid */}
          {activeTab === "financial" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Connected Financial Aid / Disbursement</h3>
                <p className="text-xs text-slate-500">
                  Live synchronized with the Financial Aid Disbursement module. Shows grant amount and release status.
                </p>
              </div>

              {c.linkedFinancialAid ? (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-900">
                      DISBURSEMENT ID: {c.linkedFinancialAid.disbursementId}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        c.linkedFinancialAid.status === "RELEASED"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {c.linkedFinancialAid.status === "RELEASED" ? "✓ RELEASED" : "⏳ PENDING DISBURSEMENT"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-white p-3.5 rounded-lg border border-emerald-100">
                      <span className="text-slate-500">Assistance Amount</span>
                      <p className="font-extrabold text-emerald-700 text-lg mt-1">
                        ₱{c.linkedFinancialAid.fixedAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-emerald-100">
                      <span className="text-slate-500">Assistance Category</span>
                      <p className="font-semibold text-slate-900 mt-1">{c.linkedFinancialAid.assistanceType}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-emerald-100">
                      <span className="text-slate-500">Payout Schedule</span>
                      <p className="font-semibold text-slate-900 mt-1">{c.linkedFinancialAid.payoutSchedule || "TBA"}</p>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-emerald-100 text-xs">
                    <span className="text-slate-500">Designated Payout Location</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{c.linkedFinancialAid.payoutLocation}</p>
                  </div>

                  <div className="p-3 bg-emerald-100/60 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      {c.linkedFinancialAid.status === "RELEASED"
                        ? "Assistance grant has been disbursed and verified. The financial component of this case is complete."
                        : "Assistance is queued in Financial Aid Disbursement. Upon payout release in that module, this status updates automatically to RELEASED."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <Wallet className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-medium text-slate-600">No direct cash grant or financial aid disbursement attached to this case.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    (Applicable primarily to ID issuance, certification, and training programs).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Referrals */}
          {activeTab === "referrals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">External &amp; Inter-Agency Referrals</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 uppercase">
                      Automated Network
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Coordinated inter-agency support automatically routed based on program classification and beneficiary needs.
                  </p>
                </div>
              </div>

              {/* Referrals List */}
              {c.referrals.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
                  No active referrals required for this case. All essential services provided in-house.
                </div>
              ) : (
                <div className="space-y-3">
                  {c.referrals.map((ref) => (
                    <div key={ref.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                            <Building className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{ref.referredTo}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {ref.id}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wide">
                          {ref.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {ref.reason}
                      </p>
                      {ref.remarks && (
                        <p className="text-[11px] text-slate-500 italic">
                          <strong className="text-slate-600 not-italic font-semibold">Service Remarks:</strong> {ref.remarks}
                        </p>
                      )}
                      <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Referred by: <strong className="text-slate-600">{ref.referredBy}</strong></span>
                        <span>Date Logged: <strong className="text-slate-600 font-mono">{formatDate(ref.date)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Monitoring Logs */}
          {activeTab === "monitoring" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Case Monitoring &amp; Welfare Progress</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                      Automated Welfare Tracking
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Continuous monitoring log tracking eligibility check-ins, financial aid disbursement, and community welfare stability.
                  </p>
                </div>
              </div>

              {/* Monitoring List */}
              {c.monitoringLogs.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
                  No monitoring logs recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {c.monitoringLogs.map((m) => (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                            <Activity className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            Status: <strong className="text-amber-700">{m.progressStatus}</strong>
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 font-semibold">{formatDate(m.date)}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{m.notes}</p>
                      {m.nextAction && (
                        <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2 text-xs text-amber-900">
                          <span className="font-bold">Next Action:</span> {m.nextAction}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span>Supervising Officer: <strong className="text-slate-600">{m.officer}</strong></span>
                        <span className="font-mono text-[10px] text-slate-400">LOG ID: {m.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Chronological Timeline */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Chronological Case Timeline</h3>
                <p className="text-xs text-slate-500">
                  Automated chronological trail generated strictly from authentic system milestones (Submission → Approval → Appointment → Financial Aid → Referrals → Monitoring).
                </p>
              </div>

              <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-4">
                {c.timeline.map((ev, idx) => {
                  const getIcon = () => {
                    switch (ev.type) {
                      case "submission": return <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                      case "approval": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      case "appointment": return <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                      case "financial": return <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                      case "referral": return <Send className="h-3.5 w-3.5 text-purple-600" />
                      case "monitoring": return <Activity className="h-3.5 w-3.5 text-amber-600" />
                      case "closure": return <CheckCircle2 className="h-3.5 w-3.5 text-slate-700" />
                      default: return <Clock className="h-3.5 w-3.5 text-slate-600" />
                    }
                  }

                  return (
                    <div key={ev.id || idx} className="relative group">
                      {/* Node Bullet */}
                      <div className="absolute -left-9 top-0.5 h-6 w-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-xs">
                        {getIcon()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900">{ev.title}</h4>
                          <span className="text-[11px] font-mono text-slate-400">{formatDate(ev.date)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ev.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 7: Automated Case Progression & Status Management */}
          {activeTab === "status" && (
            <div className="space-y-6">
              {/* Header with Live Badge */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Automated Case Lifecycle &amp; Status Control</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      Live Telemetry Synced
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time automated milestone tracking, inter-agency coordination health, and case closure supervision.
                  </p>
                </div>
              </div>

              {/* Visual Lifecycle Pipeline */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  Automated Milestone Progression
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {/* Step 1 */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Step 1</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">Intake &amp; Approval</p>
                    <p className="text-[11px] text-slate-500 mt-1">Application verified &amp; case file generated.</p>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Step 2</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">Financial Aid</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {c.linkedFinancialAid ? `₱${c.linkedFinancialAid.fixedAmount.toLocaleString()} Grant linked` : "Non-cash intervention"}
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-3 rounded-lg border shadow-2xs relative ${
                    c.referrals.length > 0 ? "bg-white border-emerald-200" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        c.referrals.length > 0 ? "text-emerald-700" : "text-slate-400"
                      }`}>Step 3</span>
                      {c.referrals.length > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900">Agency Referrals</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {c.referrals.length > 0 ? `${c.referrals.length} partner agencies routed` : "Direct in-house handling"}
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className={`p-3 rounded-lg border shadow-2xs relative ${
                    c.status === "closed"
                      ? "bg-white border-emerald-200"
                      : "bg-blue-50/70 border-blue-300 ring-1 ring-blue-300"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        c.status === "closed" ? "text-emerald-700" : "text-blue-700"
                      }`}>Step 4</span>
                      {c.status === "closed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900">Active Monitoring</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {c.monitoringLogs.length} follow-up check-in{c.monitoringLogs.length === 1 ? "" : "s"} logged
                    </p>
                  </div>

                  {/* Step 5 */}
                  <div className={`p-3 rounded-lg border shadow-2xs relative ${
                    c.status === "closed"
                      ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400"
                      : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        c.status === "closed" ? "text-emerald-800" : "text-slate-400"
                      }`}>Step 5</span>
                      {c.status === "closed" ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900">Case Resolution</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {c.status === "closed" ? "Stabilized & Closed" : "Pending final outcome"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Realtime Case Telemetry Summary */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-blue-900">Automated System State Analysis</p>
                  <p className="text-blue-800 leading-relaxed">
                    This case is currently marked as <strong className="uppercase font-bold">{c.status}</strong> with <strong className="uppercase font-bold">{c.priority} PRIORITY</strong>. 
                    {c.linkedFinancialAid && ` Connected cash assistance of ₱${c.linkedFinancialAid.fixedAmount.toLocaleString()} is linked to disbursement ID ${c.linkedFinancialAid.disbursementId}.`}
                    {c.referrals.length > 0 && ` ${c.referrals.length} inter-agency partner referral requests are actively tracking.`}
                    {c.monitoringLogs.length > 0 && ` ${c.monitoringLogs.length} periodic welfare check-ins have been documented by the supervising case officer.`}
                  </p>
                </div>
              </div>

              {/* Status Update & Case Supervision Form */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Supervisor Case Actions &amp; Final Resolution
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Advance the case stage, reassign supervising officers, or conclude the intervention.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-800">Current Case Stage</label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Live Auto-Synced
                      </span>
                    </div>
                    <div className="px-3 py-2 border border-slate-200 bg-slate-50/90 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${sm.dot}`} />
                        <span>{sm.label}</span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">{c.status}</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800">Case Priority</label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value as CasePriority)}
                      className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="high">HIGH — Urgent Action Required</option>
                      <option value="medium">MEDIUM — Standard Processing</option>
                      <option value="low">LOW — Maintenance / Minor</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-800">Assigned Social Worker / Case Officer</label>
                    <input
                      type="text"
                      value={assignedWorker}
                      onChange={(e) => setAssignedWorker(e.target.value)}
                      placeholder="Enter assigned case officer name"
                      className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-800">
                      {isClosingCase ? "Case Closure Summary & Evaluation *" : "Case Notes / Supervisor Action Summary"}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        isClosingCase
                          ? "Document final case outcome, verification of benefits received, and reason for case closure..."
                          : "Enter internal case remarks or next intervention steps..."
                      }
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={isClosingCase}
                        onChange={(e) => setIsClosingCase(e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Mark case as Officially Resolved &amp; Closed</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1 pl-6.5">
                      Check this box when all assistance, appointments, financial aid, and monitoring visits have been concluded.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={handleSaveStatus}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isUpdatingStatus ? (
                      "Updating..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isClosingCase ? "Save & Close Case" : "Save Case Updates"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Current Case Status: <strong className="text-slate-800 uppercase">{c.status}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================================
// Main Admin Case Management Component
// =====================================================================================

export default function CaseManagement() {
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProgram, setSelectedProgram] = useState<string>("ALL")
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL")
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL")
  const [activeCase, setActiveCase] = useState<CaseRecord | null>(null)

  // Fetch all real cases directly from Backend API (Approved Applications Integration)
  const loadCases = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/case-management/cases`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.cases && Array.isArray(data.cases)) {
          setCases(data.cases)
          // Update active case if open
          if (activeCase) {
            const updated = data.cases.find((c: CaseRecord) => c.caseNumber === activeCase.caseNumber)
            if (updated) setActiveCase(updated)
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch case records:", err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCases(false)

    // Interval polling for background changes
    const interval = setInterval(() => loadCases(true), 8000)

    // Real-time broadcast sync
    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadCases(true)
    })

    const handleFocus = () => loadCases(true)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("application_updated", handleFocus)
    window.addEventListener("appointments_updated", handleFocus)
    window.addEventListener("financial_aid_updated", handleFocus)
    window.addEventListener("child_welfare_updated", handleFocus)
    window.addEventListener("case_management_updated", handleFocus)

    return () => {
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("application_updated", handleFocus)
      window.removeEventListener("appointments_updated", handleFocus)
      window.removeEventListener("financial_aid_updated", handleFocus)
      window.removeEventListener("child_welfare_updated", handleFocus)
      window.removeEventListener("case_management_updated", handleFocus)
    }
  }, [])

  // Case Status Update Handler
  const handleUpdateStatus = async (
    caseNumber: string,
    newStatus: CaseStatus,
    priority?: CasePriority,
    worker?: string,
    notes?: string
  ) => {
    const res = await fetch(`${API_BASE}/api/case-management/case/${encodeURIComponent(caseNumber)}/status`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        status: newStatus,
        priority,
        assignedSocialWorker: worker,
        notes,
      }),
    })

    if (!res.ok) throw new Error("Failed to update case status")
    await loadCases(true)
    notifyApplicationChange("APPLICATION_APPROVED", "case", caseNumber)
  }

  // Stats calculation
  const stats = useMemo(() => {
    const total = cases.length
    const open = cases.filter((c) => c.status === "open").length
    const monitoringOrReferred = cases.filter((c) => c.status === "monitoring" || c.status === "referred").length
    const closed = cases.filter((c) => c.status === "closed").length
    return { total, open, monitoringOrReferred, closed }
  }, [cases])

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Program Filter
      if (selectedProgram !== "ALL" && c.linkedProgram !== selectedProgram) return false

      // 2. Status Filter
      if (selectedStatusTab !== "ALL") {
        if (selectedStatusTab === "MONITORING_REFERRED") {
          if (c.status !== "monitoring" && c.status !== "referred") return false
        } else if (c.status !== selectedStatusTab.toLowerCase()) {
          return false
        }
      }

      // 3. Priority Filter
      if (selectedPriority !== "ALL" && c.priority !== selectedPriority.toLowerCase()) return false

      // 4. Realtime Search Query (Instant Multi-token Search across all case fields)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const tokens = q.split(/\s+/).filter(Boolean)
        const searchableText = [
          c.beneficiaryName,
          c.caseNumber,
          c.applicationId,
          c.beneficiaryId,
          c.assignedSocialWorker,
          c.contactNo,
          c.address,
          c.linkedProgram,
          c.caseType,
          c.summary,
          c.linkedFinancialAid?.disbursementId,
          c.linkedFinancialAid?.assistanceType,
          c.linkedAppointment?.id,
          c.linkedAppointment?.location,
        ].filter(Boolean).join(" ").toLowerCase()

        const matches = tokens.every((token) => searchableText.includes(token))
        if (!matches) return false
      }

      return true
    })
  }, [cases, selectedProgram, selectedStatusTab, selectedPriority, searchQuery])

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Module Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FolderKanban className="h-4 w-4" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Case Management
            </h1>
          </div>
        </div>
      </div>


      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Approved Cases
            </span>
            <FolderKanban className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.total}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            Live synchronized across modules
          </span>
        </div>

        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Open Cases
            </span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.open}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            Awaiting payout / claiming
          </span>
        </div>

        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monitoring &amp; Referred
            </span>
            <Activity className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.monitoringOrReferred}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            Active aftercare &amp; coordination
          </span>
        </div>

        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Closed Cases
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.closed}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            Completed &amp; resolved cases
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="SEARCH BY CLIENT NAME, CASE NUMBER (CM-...), QCID, OR REFERENCE NUMBER..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            className="w-full text-xs md:text-sm bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 uppercase font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold px-1"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Program Filter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Program:</span>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Programs</option>
              <option value="AICS">AICS</option>
              <option value="PWD">PWD Services</option>
              <option value="Senior Citizen">Senior Citizen</option>
              <option value="Solo Parent">Solo Parent</option>
              <option value="Child Welfare">Child Welfare</option>
              <option value="Livelihood">Livelihood</option>
              <option value="Training Program">Training Program</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Status:</span>
            <select
              value={selectedStatusTab}
              onChange={(e) => setSelectedStatusTab(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="MONITORING">Under Monitoring</option>
              <option value="REFERRED">Referred</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="ml-auto text-slate-400 text-xs font-mono">
            Showing <strong className="text-slate-700">{filteredCases.length}</strong> of {cases.length} approved cases
          </div>
        </div>
      </div>

      {/* Cases List / Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <Clock className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Synchronizing approved case records across modules...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Case Records Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Case records only appear when an application in AICS, PWD, Senior, Solo Parent, Child Welfare, or Livelihood is <strong>APPROVED</strong>.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => {
            const sm = statusMeta[c.status] || statusMeta.open
            const pm = priorityMeta[c.priority] || priorityMeta.medium

            return (
              <div
                key={c.caseNumber}
                onClick={() => setActiveCase(c)}
                className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md hover:bg-slate-50/40 rounded-2xl p-4 md:p-5 transition-all cursor-pointer group select-none"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Beneficiary & Case Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-xs group-hover:bg-blue-600 transition-colors">
                      {c.beneficiaryName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {c.caseNumber}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${programColors[c.linkedProgram]}`}>
                          {c.linkedProgram}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pm.chip}`}>
                          {pm.label}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {c.beneficiaryName}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        QCID: {c.beneficiaryId} • REF: {c.applicationId}
                        {[
                          c.age && c.age !== "—" && !isNaN(Number(c.age)) ? `${c.age} yrs old` : (c.age && c.age !== "—" ? c.age : ""),
                          c.sex && c.sex !== "—" ? c.sex : "",
                        ].filter(Boolean).length > 0
                          ? ` • ${[
                              c.age && c.age !== "—" && !isNaN(Number(c.age)) ? `${c.age} yrs old` : (c.age && c.age !== "—" ? c.age : ""),
                              c.sex && c.sex !== "—" ? c.sex : "",
                            ].filter(Boolean).join(" • ")}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Middle Column: Connected Module Statuses */}
                  <div className="flex items-center gap-2.5 flex-wrap text-xs">
                    {/* Appointment badge */}
                    {c.linkedAppointment ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        Appt: {c.linkedAppointment.status.toUpperCase()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px]">
                        No Appt
                      </span>
                    )}

                    {/* Financial Aid badge */}
                    {c.linkedFinancialAid ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border ${
                          c.linkedFinancialAid.status === "RELEASED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        ₱{c.linkedFinancialAid.fixedAmount.toLocaleString()} ({c.linkedFinancialAid.status})
                      </span>
                    ) : null}

                    {/* Referral count badge */}
                    {c.referrals.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                        <Send className="h-3 w-3" />
                        {c.referrals.length} Ref
                      </span>
                    )}

                    {/* Monitoring count badge */}
                    {c.monitoringLogs.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                        <Activity className="h-3 w-3" />
                        {c.monitoringLogs.length} Mon
                      </span>
                    )}
                  </div>

                  {/* Right Column: Case Status (if not open) */}
                  {c.status !== "open" && (
                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${sm.chip}`}>
                        <span className={`h-2 w-2 rounded-full ${sm.dot}`} />
                        {sm.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Case Details Modal */}
      {activeCase && (
        <CaseDetailsModal
          c={activeCase}
          onClose={() => setActiveCase(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  )
}