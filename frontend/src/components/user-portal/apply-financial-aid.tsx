import { useState, useEffect } from "react"
import {
  Wallet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  Info,
  MapPin,
  FileText,
} from "lucide-react"
import {
  FIXED_ASSISTANCE_AMOUNTS,
  type DisbursementStage,
  type SyncedDisbursementRecord,
  getSavedDisbursements,
  checkAndAutoReleaseScheduledDisbursements,
  parseAppointmentDateTime,
  isIdOrDocumentService,
} from "../../utils/financialAidSync"
import { API_BASE } from "../../config/api"
import { getLoggedInUserQcid, getCurrentUserProfile } from "../../utils/userProfile"
import { useLanguage } from "../ui/language-context"

export default function ApplyFinancialAid() {
  const { t } = useLanguage()
  const [disbursements, setDisbursements] = useState<SyncedDisbursementRecord[]>([])

  // Auto-sync approved disbursements and scheduled payout appointments
  useEffect(() => {
    const loadDisbursements = async () => {
      // Auto-release engine: check if any appointment time has arrived
      checkAndAutoReleaseScheduledDisbursements()

      const userProfile = getCurrentUserProfile()
      const qcId = getLoggedInUserQcid() || userProfile.qcidNo
      const userFirst = (userProfile.firstName || "").trim().toLowerCase()
      const userLast = (userProfile.lastName || "").trim().toLowerCase()
      const userFull = `${userFirst} ${userLast}`.trim().toLowerCase()

      const userRefNumbers = new Set<string>()
      if (qcId) userRefNumbers.add(qcId)

      const isUserMatch = (applicantName?: string, appRef?: string) => {
        if (appRef && qcId && (appRef.includes(qcId) || qcId.includes(appRef))) return true
        if (appRef && userRefNumbers.has(appRef)) return true
        if (!applicantName) return false
        const name = applicantName.toLowerCase().trim()
        if (userFull && (name.includes(userFull) || userFull.includes(name))) return true
        if (userLast && name.includes(userLast) && userFirst && name.includes(userFirst)) return true
        return false
      }

      let remoteRecords: SyncedDisbursementRecord[] = []
      let aicsRecords: SyncedDisbursementRecord[] = []
      let pwdSeniorRecords: SyncedDisbursementRecord[] = []

      try {
        // 1. Fetch user's approved AICS applications
        const resAics = await fetch(`${API_BASE}/api/aics/applications?qcId=${qcId}`)
        if (resAics.ok) {
          const dataAics = await resAics.json()
          if (dataAics.applications && Array.isArray(dataAics.applications)) {
            dataAics.applications.forEach((app: any) => {
              if (app.reference_number) userRefNumbers.add(app.reference_number)
              if (app.reference_no) userRefNumbers.add(app.reference_no)
              if (app.id) {
                userRefNumbers.add(String(app.id))
                userRefNumbers.add(`AICS-2026-${String(app.id).padStart(4, "0")}`)
              }
            })

            const approvedOnes = dataAics.applications.filter(
              (app: any) =>
                app.status === "approved" ||
                app.status === "for_release" ||
                app.status === "released" ||
                app.status === "completed"
            )

            aicsRecords = approvedOnes.map((app: any) => {
              const rawType = (app.assistance_type || "Medical").replace(/\s*assistance/gi, "").trim()
              const type = (rawType.charAt(0).toUpperCase() + rawType.slice(1)) + " Assistance"
              const amount = FIXED_ASSISTANCE_AMOUNTS[type] || 1000
              const isReleased = app.status === "released" || app.status === "completed"
              const ref = app.reference_number || app.reference_no || `AICS-2026-${String(app.id).padStart(4, "0")}`

              return {
                id: `user-aics-${app.id || ref}`,
                disbursementId: `DISB-2026-${String(app.id || 1).padStart(4, "0")}`,
                applicationRef: ref,
                applicantName: `${app.first_name || userProfile.firstName} ${app.last_name || userProfile.lastName}`.trim().toUpperCase(),
                assistanceType: type,
                fixedAmount: amount,
                dateApproved: new Date(app.updated_at || app.created_at || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status: isReleased ? ("RELEASED" as DisbursementStage) : ("PENDING" as DisbursementStage),
                venue: "Quezon City Hall",
                remarks: "Scheduled financial aid payout.",
              }
            })
          }
        }

        // 2. Fetch PWD / Senior Social Assistance for user
        try {
          const resPwd = await fetch(`${API_BASE}/api/pwd-senior/applications`)
          if (resPwd.ok) {
            const pwdApps = await resPwd.json()
            if (Array.isArray(pwdApps)) {
              pwdApps.forEach((app: any) => {
                const matchUser = (app.referenceNumber === qcId || app.reference_number === qcId || app.id === qcId || isUserMatch([app.firstName, app.lastName].join(" ")))
                if (matchUser) {
                  if (app.referenceNumber) userRefNumbers.add(app.referenceNumber)
                  if (app.reference_number) userRefNumbers.add(app.reference_number)
                  if (app.id) userRefNumbers.add(String(app.id))
                }
              })

              const myApprovedPwd = pwdApps.filter((app: any) => {
                const matchUser = (app.referenceNumber === qcId || app.reference_number === qcId || app.id === qcId || isUserMatch([app.firstName, app.lastName].join(" ")))
                const isAssistance =
                  app.type === "assistance" ||
                  app.type === "social-assistance" ||
                  String(app.category || "").toLowerCase().includes("assistance") ||
                  String(app.service || "").toLowerCase().includes("assistance") ||
                  String(app.assistanceType || "").toLowerCase().includes("assistance") ||
                  String(app.disabilityClass || "").toLowerCase().includes("assistance")
                return matchUser && isAssistance && (app.status === "approved" || app.status === "completed" || app.status === "for_release")
              })

              pwdSeniorRecords = myApprovedPwd.map((app: any) => {
                const isPwdApp = String(app.category || "").toUpperCase().includes("PWD")
                const assistanceType = isPwdApp ? "PWD Social Assistance" : "Senior Social Assistance"
                const ref = app.referenceNumber || app.reference_number || qcId
                return {
                  id: `user-pwd-${app.id || ref}`,
                  disbursementId: `DISB-2026-${String(app.id || ref).slice(-4).padStart(4, "0")}`,
                  applicationRef: ref,
                  applicantName: [app.firstName, app.middleName, app.lastName, app.suffix].filter(Boolean).join(" ").toUpperCase() || userFull.toUpperCase(),
                  assistanceType: assistanceType,
                  fixedAmount: 2000,
                  dateApproved: new Date(app.approvedDate || app.submittedAt || Date.now()).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                  status: (app.status === "released" || app.status === "completed") ? "RELEASED" as DisbursementStage : "PENDING" as DisbursementStage,
                  venue: "Quezon City Hall",
                  remarks: "PWD / Senior Social Assistance payout.",
                }
              })
            }
          }
        } catch {}

        // 3. Fetch Child Welfare Approved Applications for user
        try {
          const userObj = JSON.parse(localStorage.getItem("user") || "{}")
          const userId = userObj.id || qcId || "0"
          const token = localStorage.getItem("token") || localStorage.getItem("authToken") || ""
          const cwRes = await fetch(
            `${API_BASE}/api/child-welfare/user/${userId}?qcid=${encodeURIComponent(qcId)}&email=${encodeURIComponent(userProfile?.email || "")}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          )
          if (cwRes.ok) {
            const cwData = await cwRes.json()
            const cwApps = Array.isArray(cwData.applications) ? cwData.applications : []
            const approvedCw = cwApps.filter((c: any) => {
              const st = String(c.application_status || c.status).toLowerCase()
              return st === "approved" || st === "released" || st === "completed" || st === "for_release"
            })
            approvedCw.forEach((c: any) => {
              const ref = c.reference_number || `CW-2026-${c.id}`
              const supportTitle = c.category_title ? `${c.category_title} (Child Welfare)` : "Child Welfare Support"
              const amount = Number(c.approved_amount) || FIXED_ASSISTANCE_AMOUNTS[supportTitle] || 5000
              const isReleased = String(c.application_status || c.status).toLowerCase() === "released" || String(c.application_status || c.status).toLowerCase() === "completed"
              remoteRecords.push({
                id: `user-cw-${c.id || ref}`,
                disbursementId: `DISB-2026-${String(c.id || 1).padStart(4, "0")}`,
                applicationRef: ref,
                applicantName: [c.guardian_first_name, c.guardian_last_name].filter(Boolean).join(" ").toUpperCase() || userFull.toUpperCase(),
                assistanceType: supportTitle,
                fixedAmount: amount,
                dateApproved: new Date(c.updated_at || c.created_at || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status: isReleased ? ("RELEASED" as DisbursementStage) : ("PENDING" as DisbursementStage),
                venue: "Quezon City Hall - SSDD Child Welfare Section",
                remarks: "Child Welfare financial support grant.",
              })
            })
          }
        } catch {}

        // 4. Fetch from backend financial-aid endpoint (filter only records that belong to current user)
        const resDb = await fetch(`${API_BASE}/api/financial-aid`)
        if (resDb.ok) {
          const dataDb = await resDb.json()
          if (dataDb.disbursements && Array.isArray(dataDb.disbursements)) {
            const matchingDbRecords = dataDb.disbursements.filter((d: any) =>
              !isIdOrDocumentService(d.assistance_type) && isUserMatch(d.applicant_name, d.application_ref)
            )
            const dbRecords: SyncedDisbursementRecord[] = matchingDbRecords.map((d: any) => ({
              id: `db-${d.id}`,
              disbursementId: d.disbursement_id,
              applicationRef: d.application_ref,
              applicantName: d.applicant_name,
              assistanceType: d.assistance_type,
              fixedAmount: Number(d.fixed_amount) || FIXED_ASSISTANCE_AMOUNTS[d.assistance_type] || 1500,
              dateApproved: d.date_approved,
              status: d.status as DisbursementStage,
              appointmentDate: d.appointment_date,
              appointmentTime: d.appointment_time,
              venue: d.venue,
              releasedDate: d.released_date,
              releasedBy: d.released_by,
              remarks: d.remarks,
            }))
            remoteRecords.push(...dbRecords)
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote approved disbursements:", err)
      }

      const now = new Date()

      // Fetch appointments & read local schedule cache to bridge schedule & completed status
      let appointmentsMap: Record<string, any> = {}
      try {
        const resAppts = await fetch(`${API_BASE}/api/appointments`)
        if (resAppts.ok) {
          const dataAppts = await resAppts.json()
          if (dataAppts.appointments && Array.isArray(dataAppts.appointments)) {
            dataAppts.appointments.forEach((a: any) => {
              if (a.reference_no) appointmentsMap[a.reference_no] = a
              if (a.applicant_name) appointmentsMap[a.applicant_name.toLowerCase().trim()] = a
            })
          }
        }
      } catch {}

      let localScheduledMap: Record<string, any> = {}
      try {
        const rawSched = localStorage.getItem("all_appointments_scheduled")
        if (rawSched) localScheduledMap = JSON.parse(rawSched)
      } catch {}

      // Filter localDisbursements to only current user
      const localDisbursements = getSavedDisbursements().filter((l) =>
        isUserMatch(l.applicantName, l.applicationRef)
      )

      // ── DEDUPLICATION & LATEST APPROVED SELECTION ──
      // Group by applicationRef or (assistanceType + applicantName)
      const recordMap = new Map<string, SyncedDisbursementRecord>()

      const processCandidate = (r: SyncedDisbursementRecord) => {
        if (!r || isIdOrDocumentService(r.assistanceType)) return
        const key = (r.applicationRef || "").trim() || `${r.assistanceType.toLowerCase().trim()}_${r.applicantName.toLowerCase().trim()}`
        if (!key) return

        if (!recordMap.has(key)) {
          recordMap.set(key, r)
        } else {
          const existing = recordMap.get(key)!
          // Prefer RELEASED status over PENDING
          const isRReleased = r.status === "RELEASED"
          const isExReleased = existing.status === "RELEASED"

          if (isRReleased && !isExReleased) {
            recordMap.set(key, { ...existing, ...r, status: "RELEASED" })
          } else if (r.appointmentDate && !existing.appointmentDate) {
            recordMap.set(key, { ...existing, ...r })
          } else {
            // Keep the latest date
            const timeR = new Date(r.dateApproved || r.releasedDate || 0).getTime()
            const timeEx = new Date(existing.dateApproved || existing.releasedDate || 0).getTime()
            if (timeR >= timeEx) {
              recordMap.set(key, { ...existing, ...r })
            }
          }
        }
      }

      // Add in order of priority: DB records, AICS records, PWD/Senior records, Local records
      remoteRecords.forEach(processCandidate)
      aicsRecords.forEach(processCandidate)
      pwdSeniorRecords.forEach(processCandidate)
      localDisbursements.forEach(processCandidate)

      // Enhance with appointments schedule & auto-released status
      let combined = Array.from(recordMap.values()).map((d) => {
        const appt = appointmentsMap[d.applicationRef] || appointmentsMap[d.applicantName?.toLowerCase()?.trim()]
        const cachedSched = localScheduledMap[d.applicationRef] || localScheduledMap[d.applicantName?.toLowerCase()?.trim()]

        const finalApptDate = d.appointmentDate || appt?.scheduled_date || cachedSched?.scheduledDate || null
        const finalApptTime = d.appointmentTime || appt?.scheduled_time || cachedSched?.scheduledTime || null
        const finalVenue = d.venue || appt?.office_location || cachedSched?.officeLocation || "Quezon City Hall"
        const isApptCompleted = appt?.status === "completed" || cachedSched?.status === "completed"

        let isTimeReached = false
        if (finalApptDate) {
          const dt = parseAppointmentDateTime(finalApptDate, finalApptTime)
          if (dt && now.getTime() >= dt.getTime()) {
            isTimeReached = true
          }
        }

        const isReleased = d.status === "RELEASED" || isApptCompleted || (Boolean(finalApptDate) && isTimeReached)

        return {
          ...d,
          appointmentDate: finalApptDate,
          appointmentTime: finalApptTime,
          venue: finalVenue,
          status: isReleased ? ("RELEASED" as DisbursementStage) : ("PENDING" as DisbursementStage),
          releasedDate: isReleased
            ? d.releasedDate || (finalApptDate && finalApptTime ? `${finalApptDate} ${finalApptTime}` : `${now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} ${finalApptTime || now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`)
            : undefined,
          releasedBy: isReleased
            ? d.releasedBy || "Automated Scheduled Payout System / Disbursing Officer"
            : undefined,
        }
      })

      // Sort with LATEST APPROVED record at the top!
      combined.sort((a, b) => {
        const timeA = new Date(a.dateApproved || a.appointmentDate || 0).getTime()
        const timeB = new Date(b.dateApproved || b.appointmentDate || 0).getTime()
        return timeB - timeA
      })

      setDisbursements(combined)
    }

    loadDisbursements()

    // Real-time live check every 2 seconds
    const liveTimer = setInterval(() => {
      loadDisbursements()
    }, 2000)

    const handleSync = () => loadDisbursements()
    window.addEventListener("financial_disbursements_updated", handleSync)
    window.addEventListener("appointments_updated", handleSync)
    window.addEventListener("storage", handleSync)

    return () => {
      clearInterval(liveTimer)
      window.removeEventListener("financial_disbursements_updated", handleSync)
      window.removeEventListener("appointments_updated", handleSync)
      window.removeEventListener("storage", handleSync)
    }
  }, [])

  const getStageBadge = (status: DisbursementStage, hasAppointment?: boolean) => {
    if (status === "RELEASED") {
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700/80",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        label: "RELEASED",
      }
    }
    if (hasAppointment) {
      return {
        bg: "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700/80",
        icon: <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
        label: "APPOINTMENT SCHEDULED",
      }
    }
    return {
      bg: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700/80",
      icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />,
      label: "PENDING RELEASE",
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Financial Aid & Cash Assistance
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          {t("financialAidOverviewTitle") || "Financial Aid Overview"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t("financialAidSubtitle") || "Awtomatikong nakatala rito ang inyong naaprubahang ayuda, itinakdang halaga, at iskedyul ng payout appointment sa City Hall."}
        </p>
      </div>

      {/* ── AUTOMATIC INTEGRATION NOTICE BANNER ── */}
      <div className="bg-blue-50/80 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h3 className="text-sm font-bold text-blue-950 dark:text-white">
            {t("autoConnectNoticeTitle") || "Awtomatikong Nakakabit ang Appointment at Ayuda"}
          </h3>
          <p className="text-blue-900/90 dark:text-slate-300 leading-relaxed">
            {t("autoConnectNoticeDesc") || "Hindi na kailangan mag-set ng halaga o magsumite ulit. Kapag na-aprubahan ng Admin ang inyong aplikasyon, awtomatikong lalabas ang itinakdang Fixed Amount at ang petsa/oras ng inyong Payout Appointment."}
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── ACTIVE DISBURSEMENTS LIST ── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {t("myDisbursementsTitle", { count: String(disbursements.length) }) || `Aking mga Ayuda at Payout Record (${disbursements.length})`}
          </h2>
        </div>

        {disbursements.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800 dark:text-white">{t("noDisbursementsTitle") || "Walang Kasalukuyang Ayuda Record"}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                {t("noDisbursementsDesc") || "Wala ka pang naisusumiteng aplikasyon para sa ayuda. Mag-apply para sa Medical, Transportation, Food, o iba pang AICS serbisyo upang awtomatikong pumasok dito ang iyong disbursement record."}
              </p>
            </div>
            <a
              href="/portal/aics/medical"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>{t("applyForAssistance") || "Mag-apply ng AICS Assistance"}</span>
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {disbursements.map((d) => {
              const hasAppt = Boolean(d.appointmentDate)
              const dt = parseAppointmentDateTime(d.appointmentDate, d.appointmentTime)
              const isTimeReached = Boolean(dt && new Date().getTime() >= dt.getTime())
              const effectiveStatus: DisbursementStage = (d.status === "RELEASED" || isTimeReached) ? "RELEASED" : "PENDING"
              const isReleased = effectiveStatus === "RELEASED"
              const badge = getStageBadge(effectiveStatus, hasAppt)

            return (
              <div
                key={d.id || d.disbursementId}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-5"
              >
                {/* Top Voucher Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400">
                        {d.disbursementId}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 dark:text-slate-400">
                        • Application Ref: <strong className="text-gray-700 dark:text-slate-200">{d.applicationRef}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{d.assistanceType}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold block">
                        {t("approvedFixedAmount") || "Approved Fixed Amount"}
                      </span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        ₱{d.fixedAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── APPOINTMENT & STATUS DETAILS ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Appointment Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {t("payoutApptSchedule") || "Payout Appointment Schedule"}
                    </span>
                    {d.appointmentDate ? (
                      <div>
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                          {d.appointmentDate}
                        </p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {d.appointmentTime || "10:00 AM"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Inihahanda pa ng Admin ang inyong iskedyul ng appointment.
                      </p>
                    )}
                  </div>

                  {/* Payout Location Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      {t("payoutLocationVenue") || "Payout Location / Venue"}
                    </span>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {d.venue || "Quezon City Hall"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Social Services Development Department Counter
                    </p>
                  </div>
                </div>

                {/* Status Stepper */}
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 dark:text-slate-200">{t("financialAidStatusLabel") || "Katayuan ng Ayuda:"}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div
                      className={`p-3 rounded-xl border text-center transition-all ${
                        !isReleased
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 font-extrabold shadow-2xs ring-1 ring-amber-500/30"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold"
                      }`}
                    >
                      <span className="text-[10px] block text-slate-500 dark:text-slate-400 uppercase font-semibold">Step 1</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{t("step1PendingScheduled") || "STEP 1: PENDING / SCHEDULED"}</span>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{t("step1PendingDesc") || "Go to City Hall on the scheduled day"}</p>
                    </div>

                    <div
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isReleased
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-extrabold shadow-2xs ring-1 ring-emerald-500/30"
                          : "bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      <span className="text-[10px] block text-slate-500 dark:text-slate-400 uppercase font-semibold">Step 2</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{t("step2Released") || "STEP 2: RELEASED"}</span>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{t("step2ReleasedDesc") || "Financial aid has been disbursed"}</p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    {t("payoutReminderNotice") || (
                      <>
                        <span className="font-bold text-gray-900 dark:text-white">Appointment Reminder:</span> Please bring your <strong className="text-gray-900 dark:text-white">QCitizen ID</strong> or 1 Valid Government-Issued ID along with original copies of your documents at the designated payout time.
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}