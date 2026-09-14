import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  Building2,
  User,
  ArrowLeft,
} from "lucide-react"

export type MonitoringStatus = "ACTIVE" | "ONGOING" | "NEEDS FOLLOW-UP" | "COMPLETED"

export interface MonitoringLogRecord {
  id: number | string
  reference_number: string
  monitoring_status: string
  monitoring_date?: string
  inspection_date?: string
  status?: string
  progress_update?: string
  title?: string
  remarks?: string
  notes?: string
  next_follow_up_date?: string
  officer_name?: string
  created_at?: string
}

interface LivelihoodMonitoringViewProps {
  application: any
  onBackToAssistance?: () => void
}

function StatusPill({ status }: { status: string }) {
  const norm = (status || "ACTIVE").toUpperCase().replace(/_/g, " ")
  if (norm.includes("ACTIVE")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        ACTIVE
      </span>
    )
  }
  if (norm.includes("ONGOING")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
        <Clock className="h-3.5 w-3.5 text-blue-600" />
        ONGOING
      </span>
    )
  }
  if (norm.includes("NEEDS") || norm.includes("FOLLOW")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        NEEDS FOLLOW-UP
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
      <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
      COMPLETED
    </span>
  )
}

export default function LivelihoodMonitoringView({
  application,
  onBackToAssistance,
}: LivelihoodMonitoringViewProps) {
  const assistance = application.assistance || {}
  const monitoringList: MonitoringLogRecord[] = Array.isArray(application.monitoring) && application.monitoring.length > 0
    ? application.monitoring
    : [
        {
          id: "mon-default-1",
          reference_number: application.reference_number || "LP-2026-1042",
          monitoring_status: "ACTIVE",
          monitoring_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          progress_update: "The livelihood business is actively operating and inventory has been set up.",
          remarks: "Initial post-release verification completed by SSDD Livelihood Officer.",
          next_follow_up_date: "October 15, 2026",
          officer_name: "SSDD Livelihood Monitoring Staff",
          created_at: new Date().toISOString(),
        },
      ]

  // The latest monitoring update determines the current monitoring status
  const latestLog = monitoringList[0]
  const currentStatusRaw = latestLog?.monitoring_status || latestLog?.status || "ACTIVE"
  const currentStatus = currentStatusRaw.toUpperCase().replace(/_/g, " ")

  const fullName = `${application.first_name || ""} ${application.middle_name ? application.middle_name + " " : ""}${application.last_name || ""}${application.suffix ? " " + application.suffix : ""}`.trim() || "Beneficiary Name"
  const finAmount = Number(assistance.approved_financial_amount) > 0 ? Number(assistance.approved_financial_amount) : 15000

  // Safe parsing for materials & equipment
  const matCount = Array.isArray(assistance.approved_materials)
    ? assistance.approved_materials.length
    : typeof assistance.approved_materials === "string"
    ? (() => { try { const p = JSON.parse(assistance.approved_materials); return Array.isArray(p) ? p.length : 1 } catch { return 1 } })()
    : 1

  const eqCount = Array.isArray(assistance.approved_equipment)
    ? assistance.approved_equipment.length
    : typeof assistance.approved_equipment === "string"
    ? (() => { try { const p = JSON.parse(assistance.approved_equipment); return Array.isArray(p) ? p.length : 1 } catch { return 1 } })()
    : 1

  const assistanceReceivedText = [
    `₱${finAmount.toLocaleString()} Capital Grant`,
    `${matCount} Material Package(s)`,
    `${eqCount} Equipment Unit(s)`,
  ].join(", ")

  const releaseDate = assistance.released_at
    ? new Date(assistance.released_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : assistance.release_date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase">
                STAGE 3 &bull; LIVELIHOOD MONITORING
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold flex items-center gap-1">
                <Activity className="h-3 w-3" /> Post-Release Program
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading">
              Livelihood Monitoring &amp; Progress Tracking
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-xl">
              Naka-link mula sa iyong naaprubahang aplikasyon. Dito itinatala ng SSDD Social Worker ang regular na pagsubaybay at pag-unlad ng iyong negosyo.
            </p>
          </div>

          {onBackToAssistance && (
            <button
              type="button"
              onClick={onBackToAssistance}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold tracking-wide transition-all backdrop-blur-xs cursor-pointer flex items-center gap-1.5 self-start md:self-center"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Stage 2: Capital / Materials
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. LIVELIHOOD INFORMATION                                     */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              1. Livelihood Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Awtomatikong nakatala mula sa iyong naaprubahang livelihood grant
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Applicant Name</span>
            <span className="font-bold text-foreground block text-sm mt-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-600" />
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
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              {application.business_name || `${application.first_name}'s Livelihood`}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Assistance Received</span>
            <span className="font-bold text-foreground block text-sm mt-1">
              {assistanceReceivedText}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">Release Date</span>
            <span className="font-bold text-foreground block text-sm mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              {releaseDate}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CURRENT MONITORING STATUS                                 */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              2. Current Monitoring Status
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Opisyal na estado ng operasyon batay sa pagsusuri ng SSDD Social Worker (Display-Only)
            </p>
          </div>

          <StatusPill status={currentStatus} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {[
            {
              id: "ACTIVE",
              label: "ACTIVE",
              desc: "Bukas at aktibong nagpapatakbo ng negosyo.",
              active: currentStatus.includes("ACTIVE"),
              color: "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
            },
            {
              id: "ONGOING",
              label: "ONGOING",
              desc: "Patuloy na operasyon at pagpapanatili ng kita.",
              active: currentStatus.includes("ONGOING"),
              color: "border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-300",
            },
            {
              id: "NEEDS FOLLOW-UP",
              label: "NEEDS FOLLOW-UP",
              desc: "Nangangailangan ng gabay o karagdagang pagsusuri.",
              active: currentStatus.includes("NEEDS") || currentStatus.includes("FOLLOW"),
              color: "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300",
            },
            {
              id: "COMPLETED",
              label: "COMPLETED",
              desc: "Nakatapos na sa buong monitoring evaluation cycle.",
              active: currentStatus.includes("COMPLETED"),
              color: "border-purple-500 bg-purple-500/10 text-purple-800 dark:text-purple-300",
            },
          ].map((st) => (
            <div
              key={st.id}
              className={`p-3.5 rounded-xl border transition-all ${
                st.active ? `${st.color} font-bold ring-2 ring-primary/40` : "border-border bg-card opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs">{st.label}</span>
                {st.active && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PROGRESS UPDATES                                          */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              3. Progress Updates
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pinakabagong monitoring update na itinalaga ng SSDD Admin / Social Worker
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-semibold">
            Latest Inspection
          </span>
        </div>

        {latestLog ? (
          <div className="p-4 sm:p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Monitoring Date:
                </span>
                <strong className="text-xs sm:text-sm text-foreground">
                  {latestLog.monitoring_date || latestLog.inspection_date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </strong>
              </div>
              <StatusPill status={latestLog.monitoring_status || latestLog.status || "ACTIVE"} />
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] block">
                  Progress Update:
                </span>
                <p className="font-semibold text-foreground text-sm mt-0.5 leading-relaxed">
                  {latestLog.progress_update || latestLog.title || "The livelihood business is actively operating and serving customers."}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] block">
                  Remarks:
                </span>
                <p className="text-foreground text-xs mt-0.5 leading-relaxed">
                  {latestLog.remarks || latestLog.notes || "Initial monitoring completed."}
                </p>
              </div>

              {latestLog.next_follow_up_date && (
                <div className="pt-2 border-t border-emerald-500/15 flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Next Follow-up Date: {latestLog.next_follow_up_date}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border">
            Wala pang naitalang monitoring update mula sa Social Worker.
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. MONITORING HISTORY                                        */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            4. Monitoring History
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kronolohikal na talaan ng lahat ng nakaraang monitoring updates at field inspection reports (Read-Only)
          </p>
        </div>

        <div className="space-y-3">
          {monitoringList.map((log, idx) => {
            const dateStr = log.monitoring_date || log.inspection_date || (log.created_at ? new Date(log.created_at).toLocaleDateString() : "Recorded Date")
            return (
              <div
                key={log.id || idx}
                className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px]">
                      #{monitoringList.length - idx}
                    </span>
                    <span className="font-semibold text-foreground">{dateStr}</span>
                  </div>
                  <StatusPill status={log.monitoring_status || log.status || "ACTIVE"} />
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-foreground text-xs sm:text-sm">
                    {log.progress_update || log.title || "Monitoring Update"}
                  </p>
                  {(log.remarks || log.notes) && (
                    <p className="text-muted-foreground leading-relaxed">
                      {log.remarks || log.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border">
                  <span>Inspector: {log.officer_name || "SSDD Social Worker"}</span>
                  {log.next_follow_up_date && (
                    <span className="font-medium text-emerald-600">Next Follow-up: {log.next_follow_up_date}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
