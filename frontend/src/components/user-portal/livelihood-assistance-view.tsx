import { useState, useEffect } from "react"
import {
  Banknote,
  Package,
  Wrench,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Info,
  User,
  Building2,
  FileCheck,
} from "lucide-react"

export interface MaterialItem {
  item: string
  quantity: string | number
  description?: string
  remarks?: string
}

export interface EquipmentApprovedItem {
  equipment: string
  quantity: string | number
  description?: string
  remarks?: string
}

export interface AssistanceDetails {
  id?: number | string
  reference_number: string
  assistance_status: "for_processing" | "for_release" | "released"
  approved_financial_amount: number | string
  approved_materials: MaterialItem[]
  approved_equipment: EquipmentApprovedItem[]
  release_date?: string
  release_time?: string
  release_location?: string
  instructions?: string
  released_at?: string
  released_by?: string
}

interface LivelihoodAssistanceViewProps {
  application: any
  onProceedToMonitoring?: (application: any) => void
}

// Helper: parse date and time string to Date object in Philippine Standard Time (UTC+8)
function parseDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr) return null
  try {
    let year: number, month: number, day: number
    const str = String(dateStr).trim()
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10)
      month = parseInt(isoMatch[2], 10) - 1
      day = parseInt(isoMatch[3], 10)
    } else {
      const usMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
      if (usMatch) {
        month = parseInt(usMatch[1], 10) - 1
        day = parseInt(usMatch[2], 10)
        year = parseInt(usMatch[3], 10)
      } else {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return null
        year = d.getFullYear()
        month = d.getMonth()
        day = d.getDate()
      }
    }

    let hours = 9
    let minutes = 0
    if (timeStr) {
      const match = String(timeStr).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (match) {
        hours = parseInt(match[1], 10)
        minutes = parseInt(match[2], 10)
        const ampm = match[3]?.toUpperCase()
        if (ampm === "PM" && hours < 12) hours += 12
        if (ampm === "AM" && hours === 12) hours = 0
      }
    }

    const targetUtcMs = Date.UTC(year, month, day, hours - 8, minutes, 0, 0)
    return new Date(targetUtcMs)
  } catch {
    return null
  }
}

// Helper: safely parse JSON or array
function parseJsonArray<T>(val: any): T[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function LivelihoodAssistanceView({
  application,
  onProceedToMonitoring,
}: LivelihoodAssistanceViewProps) {
  // 1-second real-time tick to guarantee live transition exactly when scheduled time arrives
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Linked assistance details from application or default
  const assistance: AssistanceDetails = application.assistance || {
    reference_number: application.reference_number || "LP-2026-1042",
    assistance_status: "for_processing",
    approved_financial_amount: application.estimated_amount || 15000,
    approved_materials: [
      { item: "Starter Livelihood Supply Pack", quantity: "1 set", description: "Essential starter inventory and supplies" },
    ],
    approved_equipment: [
      { equipment: "Operational Kit / Tools", quantity: "1 unit", description: "Basic tools for livelihood operation" },
    ],
    release_date: "To be announced",
    release_time: "8:00 AM - 4:00 PM",
    release_location: "Quezon City Hall - SSDD Livelihood Center",
    instructions: "Please bring a valid ID and your Livelihood Application Reference Number.",
  }

  const approvedMaterials = parseJsonArray<MaterialItem>(assistance.approved_materials)
  const approvedEquipment = parseJsonArray<EquipmentApprovedItem>(assistance.approved_equipment)

  // Real-time scheduled date/time comparison
  const scheduledDt = parseDateTime(assistance.release_date, assistance.release_time)
  const isPastOrNow = scheduledDt !== null && Date.now() >= scheduledDt.getTime()
  const rawStatus = (assistance.assistance_status || "for_processing").toLowerCase()

  const currentStatus: "for_processing" | "for_release" | "released" =
    rawStatus === "released" || (rawStatus === "for_release" && isPastOrNow)
      ? "released"
      : rawStatus === "for_release"
      ? "for_release"
      : "for_processing"
  const fullName = `${application.first_name || ""} ${application.middle_name ? application.middle_name + " " : ""}${application.last_name || ""}${application.suffix ? " " + application.suffix : ""}`.trim() || "Beneficiary Name"
  const financialAmount = Number(assistance.approved_financial_amount) || 15000

  const requestedAssistance = Array.isArray(application.assistance_needed) && application.assistance_needed.length > 0
    ? application.assistance_needed.join(", ")
    : typeof application.assistance_needed === "string"
    ? (function() {
        try {
          const p = JSON.parse(application.assistance_needed)
          return Array.isArray(p) ? p.join(", ") : application.assistance_needed
        } catch {
          return application.assistance_needed
        }
      })()
    : "Capital / Materials Grant"

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase">
                STAGE 2 &bull; CAPITAL / MATERIALS ASSISTANCE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Approved Application
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading">
              Capital &amp; Materials Assistance
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-xl">
              Naka-link mula sa iyong naaprubahang livelihood application. Dito nakatala ang opisyal na aprubadong pondo, materyales, kagamitan, at schedule ng release.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 sm:text-right shrink-0">
            <span className="text-[10px] text-white/70 uppercase font-semibold block">Application Reference</span>
            <div className="mt-0.5">
              <span className="font-mono text-base font-bold text-white">{application.reference_number}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. APPLICATION INFORMATION                                    */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <FileCheck className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              1. Application Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Awtomatikong kinuha mula sa iyong naaprubahang livelihood application
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Applicant Name</span>
            <span className="font-bold text-foreground block text-sm mt-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              {fullName}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Reference Number</span>
            <span className="font-mono font-bold text-foreground block text-sm mt-1">
              {application.reference_number}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Livelihood Type</span>
            <span className="font-bold text-foreground block text-sm mt-1">
              {application.livelihood_type || "Sari-Sari Store"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Business Name</span>
            <span className="font-bold text-foreground block text-sm mt-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              {application.business_name || `${application.first_name}'s Livelihood`}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Business Status</span>
            <span className="font-bold text-foreground block text-sm mt-1">
              {application.livelihood_status || "New Livelihood"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Requested Assistance Type</span>
            <span className="font-bold text-foreground block text-sm mt-1">
              {requestedAssistance}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. APPROVED ASSISTANCE                                       */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                2. Approved Assistance
              </h3>
              <p className="text-xs text-muted-foreground">
                Talaan ng mga aprubadong tulong pangkabuhayan na itinalaga ng SSDD Admin (Read-Only)
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-semibold">
            Display-Only
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* A. Financial / Capital Assistance */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    A. Financial / Capital Assistance
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Approved Seed Capital</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-emerald-500/30 text-center my-3">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider block">
                  Approved Amount
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                  ₱{financialAmount.toLocaleString()}.00
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Direct disbursement through SSDD Payout Unit
            </p>
          </div>

          {/* B. Materials / Supplies */}
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    B. Materials / Supplies
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Approved Starter Items &amp; Quantity</p>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                {approvedMaterials && approvedMaterials.length > 0 ? (
                  approvedMaterials.map((mat, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-card border border-border text-xs flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground">{mat.item}</p>
                        {(mat.description || mat.remarks) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{mat.description || mat.remarks}</p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">
                        {mat.quantity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Walang nakatalagang karagdagang materyales.
                  </p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Starter livelihood inventory supplies
            </p>
          </div>

          {/* C. Equipment */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    C. Equipment
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Approved Tools &amp; Equipment</p>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                {approvedEquipment && approvedEquipment.length > 0 ? (
                  approvedEquipment.map((eq, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-card border border-border text-xs flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground">{eq.equipment}</p>
                        {(eq.description || eq.remarks) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{eq.description || eq.remarks}</p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold text-xs shrink-0">
                        {eq.quantity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Walang kasamang equipment sa package na ito.
                  </p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Standard operational business equipment
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. ASSISTANCE STATUS                                         */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              3. Assistance Status
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kasalukuyang estado ng pagpoproseso at paglabas ng tulong (Display-Only)
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              currentStatus === "released"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                : currentStatus === "for_release"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
            }`}
          >
            {currentStatus === "released" && "✓ RELEASED"}
            {currentStatus === "for_release" && "● FOR RELEASE"}
            {currentStatus === "for_processing" && "⏳ FOR PROCESSING"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Status 1: FOR PROCESSING */}
          <div
            className={`p-4 rounded-xl border ${
              currentStatus === "for_processing"
                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStatus === "for_processing"
                    ? "bg-amber-500 text-white animate-pulse"
                    : "bg-emerald-500 text-white"
                }`}
              >
                {currentStatus === "for_processing" ? "1" : "✓"}
              </span>
              <p className="font-bold text-sm text-foreground">FOR PROCESSING</p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Inihahanda ng tanggapan ang voucher, procurement ng materyales, at pagkumpleto ng iskedyul.
            </p>
          </div>

          {/* Status 2: FOR RELEASE */}
          <div
            className={`p-4 rounded-xl border ${
              currentStatus === "for_release"
                ? "border-blue-600 bg-blue-500/10 ring-1 ring-blue-600"
                : currentStatus === "released"
                ? "border-border bg-card"
                : "border-border bg-muted/20 opacity-60"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStatus === "for_release"
                    ? "bg-blue-600 text-white animate-pulse"
                    : currentStatus === "released"
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStatus === "released" ? "✓" : "2"}
              </span>
              <p className="font-bold text-sm text-foreground">FOR RELEASE</p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Handa na ang pondo at kagamitan para sa opisyal na paglabas batay sa itinakdang iskedyul.
            </p>
          </div>

          {/* Status 3: RELEASED */}
          <div
            className={`p-4 rounded-xl border ${
              currentStatus === "released"
                ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                : "border-border bg-muted/20 opacity-60"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStatus === "released"
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </span>
              <p className="font-bold text-sm text-foreground">RELEASED</p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Matagumpay nang naibigay ang puhunan at kagamitan. Aktibo na ang Livelihood Monitoring.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. RELEASE & APPOINTMENT INFORMATION                         */}
      {/* ============================================================ */}
      {currentStatus === "for_processing" && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                4. Appointment &amp; Release Scheduling
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nakatala na ang iyong aprubadong ayuda sa Financial Aid Disbursements
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> For Scheduling
            </span>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                Takdang Petsa at Oras ng Payout
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ang petsa, oras, at venue ng release/payout ay itinatakda sa pamamagitan ng <strong>Appointments</strong> module. Maaari kang mag-book o maghintay sa abiso ng tanggapan.
              </p>
            </div>
            <a
              href="/user-portal/appointments"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              Go to Appointments &rarr;
            </a>
          </div>
        </div>
      )}

      {(currentStatus === "for_release" || currentStatus === "released") && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                4. Release &amp; Appointment Information
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Opisyal na iskedyul at mga dapat tandaan sa pagkuha ng tulong-pangkabuhayan
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                currentStatus === "released"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-blue-500/10 text-blue-600"
              }`}
            >
              {currentStatus === "released" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Released
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" /> Scheduled Appointment
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/20 border border-border flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground">Appointment Date</span>
                <p className="font-bold text-sm text-foreground mt-0.5">{assistance.release_date || "To be announced"}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border flex items-start gap-3">
              <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground">Appointment Time</span>
                <p className="font-bold text-sm text-foreground mt-0.5">{assistance.release_time || "8:00 AM - 4:00 PM"}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border flex items-start gap-3 sm:col-span-2 lg:col-span-1">
              <MapPin className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground">Release Venue</span>
                <p className="font-bold text-xs text-foreground mt-0.5 leading-relaxed">
                  {assistance.release_location || "Quezon City Hall - SSDD Livelihood Center"}
                </p>
              </div>
            </div>
          </div>

          {/* Release Instructions */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Info className="h-4 w-4" /> Release Instructions
            </h4>
            <p className="text-xs text-foreground leading-relaxed font-medium">
              {assistance.instructions || "Please bring a valid ID and your Livelihood Application Reference Number."}
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pt-1">
              <li>Please bring a valid ID and your Livelihood Application Reference Number.</li>
              <li>Magdala ng orihinal na QCID at 1 valid government-issued identification card.</li>
              <li>Tiyaking personal na magtungo ang nakatalang benepisyaryo sa itinakdang oras at lokasyon.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Action to proceed to Stage 3 if Released */}
      {currentStatus === "released" && onProceedToMonitoring && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md animate-in fade-in duration-200">
          <div className="space-y-1 text-center sm:text-left">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              Unlocked &bull; Stage 3
            </span>
            <h4 className="text-base sm:text-lg font-bold">
              Livelihood Monitoring is Now Active
            </h4>
            <p className="text-xs text-white/85">
              Nai-release na ang iyong tulong. Maaari mo nang tingnan ang iyong monitoring status at progress updates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onProceedToMonitoring(application)}
            id="btn-proceed-monitoring"
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-white text-emerald-800 hover:bg-white/90 text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            Go to Livelihood Monitoring
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
