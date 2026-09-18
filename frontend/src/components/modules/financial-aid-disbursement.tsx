import { useState, useMemo, useEffect } from "react"
import {
  Wallet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  Banknote,
  Users,
  X,
  Printer,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import {
  FIXED_ASSISTANCE_AMOUNTS,
  resolveFixedAmount,
  type DisbursementStage,
  type SyncedDisbursementRecord,
  getSavedDisbursements,
  checkAndAutoReleaseScheduledDisbursements,
  parseAppointmentDateTime,
  getDeletedDisbursementKeys,
  isIdOrDocumentService,
} from "../../utils/financialAidSync"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import MaskedText from "../ui/masked-text"

export { FIXED_ASSISTANCE_AMOUNTS, type DisbursementStage, type SyncedDisbursementRecord }

function getInitialDisbursementsForAdmin(): SyncedDisbursementRecord[] {
  try {
    const deletedKeys = getDeletedDisbursementKeys()
    const saved = getSavedDisbursements()
    const records: SyncedDisbursementRecord[] = []
    const seenKeys = new Set<string>()

    // Load local appointments cache to map appointment dates/times immediately
    let appointmentsMap: Record<string, any> = {}
    try {
      const rawAppts =
        localStorage.getItem("cached_appointments_list") ||
        localStorage.getItem("all_appointments") ||
        localStorage.getItem("appointments")
      if (rawAppts) {
        const parsedAppts = JSON.parse(rawAppts)
        if (Array.isArray(parsedAppts)) {
          parsedAppts.forEach((a: any) => {
            const date = a.date || a.appointment_date || a.appointmentDate || a.scheduledDate
            const time = a.time || a.appointment_time || a.appointmentTime || a.scheduledTime
            const status = a.status
            const location = a.location || a.officeLocation || a.venue
            const apptObj = { ...a, date, time, status, location }
            if (a.reference_no) appointmentsMap[a.reference_no] = apptObj
            if (a.referenceNo) appointmentsMap[a.referenceNo] = apptObj
            if (a.concern) {
              const cleanConcern = String(a.concern).toLowerCase().replace(/assistance/g, "").replace(/social/g, "").trim()
              if (a.reference_no) appointmentsMap[`${a.reference_no}_${cleanConcern}`] = apptObj
              if (a.referenceNo) appointmentsMap[`${a.referenceNo}_${cleanConcern}`] = apptObj
            }
            if (a.applicant_name) appointmentsMap[a.applicant_name.toLowerCase().trim()] = apptObj
            if (a.applicantName) appointmentsMap[a.applicantName.toLowerCase().trim()] = apptObj
          })
        }
      }
    } catch {}

    let localScheduledMap: Record<string, any> = {}
    try {
      const rawSched = localStorage.getItem("all_appointments_scheduled")
      if (rawSched) localScheduledMap = JSON.parse(rawSched)
    } catch {}

    if (Array.isArray(saved) && saved.length > 0) {
      saved.forEach((s) => {
        if (!s || isIdOrDocumentService(s.assistanceType) || deletedKeys.has(s.id) || deletedKeys.has(s.applicationRef) || deletedKeys.has(s.disbursementId)) {
          return
        }
        const key = `${s.applicationRef || s.disbursementId}_${s.assistanceType}`
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          records.push(s)
        }
      })
    }

    // AICS
    try {
      const aics = JSON.parse(localStorage.getItem("aics_applications") || "[]")
      if (Array.isArray(aics)) {
        aics.forEach((app: any) => {
          if (app.status === "approved" || app.status === "completed" || app.status === "for_release" || app.status === "released") {
            const rawType = (app.assistance_type || "Medical").replace(/\s*assistance/gi, "").trim()
            const type = (rawType.charAt(0).toUpperCase() + rawType.slice(1)) + " Assistance"
            const ref = app.qc_id || app.reference_no || app.reference_number || `AICS-2026-${String(app.id || 1).padStart(4, "0")}`
            const key = `${ref}_${type}`
            if (!seenKeys.has(key) && !deletedKeys.has(ref)) {
              seenKeys.add(key)
              records.push({
                id: `remote-${app.id || ref}`,
                disbursementId: `DISB-2026-${String(app.id || 101).padStart(4, "0")}`,
                applicationRef: ref,
                applicantName: `${app.first_name || ""} ${app.middle_name || ""} ${app.last_name || ""}`.trim().toUpperCase() || "BENEFICIARY APPLICANT",
                assistanceType: type,
                fixedAmount: resolveFixedAmount(type),
                dateApproved: new Date(app.created_at || Date.now()).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
                status: (app.status === "released" || app.status === "completed") ? "RELEASED" : "PENDING",
                venue: "Quezon City Hall",
                remarks: "Automatically synced from AICS application.",
              })
            }
          }
        })
      }
    } catch {}

    // PWD / Senior
    try {
      const pwd = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
      if (Array.isArray(pwd)) {
        pwd.forEach((app: any) => {
          const isAssistance =
            app.type === "assistance" ||
            app.type === "social-assistance" ||
            String(app.category || "").toLowerCase().includes("assistance") ||
            String(app.service || "").toLowerCase().includes("assistance") ||
            String(app.assistanceType || "").toLowerCase().includes("assistance")
          if (isAssistance && (app.status === "approved" || app.status === "completed" || app.status === "for_release" || app.status === "released")) {
            const isPwdApp = String(app.category || "").toUpperCase().includes("PWD")
            const type = isPwdApp ? "PWD Social Assistance" : "Senior Social Assistance"
            const ref = app.referenceNumber || app.reference_number || "PWD-QC-2026"
            const key = `${ref}_${type}`
            if (!seenKeys.has(key) && !deletedKeys.has(ref)) {
              seenKeys.add(key)
              records.push({
                id: `remote-pwd-${app.id || ref}`,
                disbursementId: `DISB-2026-${String(app.id || ref).slice(-4).padStart(4, "0")}`,
                applicationRef: ref,
                applicantName: [app.firstName, app.middleName, app.lastName, app.suffix].filter(Boolean).join(" ").toUpperCase() || "BENEFICIARY APPLICANT",
                assistanceType: type,
                fixedAmount: 2000,
                dateApproved: new Date(app.approvedDate || app.submittedAt || Date.now()).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
                status: (app.status === "released" || app.status === "completed") ? "RELEASED" : "PENDING",
                venue: "Quezon City Hall",
                remarks: "Automatically synced from PWD/Senior application.",
              })
            }
          }
        })
      }
    } catch {}

    // Livelihood
    try {
      const liv = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
      if (Array.isArray(liv)) {
        liv.forEach((l: any) => {
          if (String(l.application_status || l.status).toLowerCase() === "approved") {
            const ref = l.reference_number || `LP-2026-${l.id}`
            const key = `${ref}_Livelihood Capital Assistance`
            if (!seenKeys.has(key) && !deletedKeys.has(ref)) {
              seenKeys.add(key)
              records.push({
                id: `remote-liv-${l.id || ref}`,
                disbursementId: `DISB-2026-${String(l.id || 101).padStart(4, "0")}`,
                applicationRef: ref,
                applicantName: `${l.first_name || ""} ${l.last_name || ""}`.trim().toUpperCase() || "BENEFICIARY",
                assistanceType: "Livelihood Capital Assistance",
                fixedAmount: 15000,
                dateApproved: new Date(l.created_at || Date.now()).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
                status: "PENDING",
                venue: "Quezon City Hall - SSDD Livelihood Center",
                remarks: "Automatically synced from Livelihood application.",
              })
            }
          }
        })
      }
    } catch {}

    // Attach appointments & evaluate auto-release
    const now = new Date()
    const processed = records.map((d) => {
      const appt = appointmentsMap[d.applicationRef] || appointmentsMap[d.applicantName.toLowerCase().trim()]
      const cachedSched =
        localScheduledMap[d.id] ||
        localScheduledMap[d.disbursementId] ||
        localScheduledMap[d.applicationRef] ||
        localScheduledMap[d.applicantName.toLowerCase().trim()]

      let finalApptDate = d.appointmentDate
      let finalApptTime = d.appointmentTime
      let finalVenue = d.venue || "Quezon City Hall"

      if (appt) {
        let fmtDate = appt.date || appt.appointment_date || appt.appointmentDate
        try {
          const dt = new Date(fmtDate)
          if (!isNaN(dt.getTime())) {
            fmtDate = dt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
          }
        } catch {}
        finalApptDate = fmtDate || finalApptDate
        finalApptTime = appt.time || appt.appointment_time || appt.appointmentTime || finalApptTime
        finalVenue = appt.location || appt.venue || finalVenue
      } else if (cachedSched) {
        finalApptDate = cachedSched.appointmentDate || cachedSched.date || finalApptDate
        finalApptTime = cachedSched.appointmentTime || cachedSched.time || finalApptTime
        finalVenue = cachedSched.venue || cachedSched.location || finalVenue
      }

      let finalStatus: DisbursementStage = d.status
      let finalReleasedDate = d.releasedDate
      let finalReleasedBy = d.releasedBy

      if (finalStatus === "PENDING" && finalApptDate) {
        const scheduledDt = parseAppointmentDateTime(finalApptDate, finalApptTime)
        if (scheduledDt && now.getTime() >= scheduledDt.getTime()) {
          finalStatus = "RELEASED"
          finalReleasedDate = finalReleasedDate || `${now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} ${finalApptTime || ""}`
          finalReleasedBy = finalReleasedBy || "Automated Scheduled Payout System / Disbursing Officer"
        }
      }

      return {
        ...d,
        appointmentDate: finalApptDate,
        appointmentTime: finalApptTime,
        venue: finalVenue,
        status: finalStatus,
        releasedDate: finalReleasedDate,
        releasedBy: finalReleasedBy,
      }
    })

    return processed
  } catch {}
  return []
}

export default function FinancialAidDisbursement() {
  const [disbursements, setDisbursements] = useState<SyncedDisbursementRecord[]>(() => getInitialDisbursementsForAdmin())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL")
  const [selectedDetailsRecord, setSelectedDetailsRecord] = useState<SyncedDisbursementRecord | null>(null)
  const [revealedAmounts, setRevealedAmounts] = useState<Record<string, boolean>>({})

  const toggleAmount = (id: string) => {
    setRevealedAmounts((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Auto-sync submitted applications from Backend, LocalStorage, and Appointments Bridge
  useEffect(() => {
    let isSyncing = false
    const syncAll = async () => {
      if (isSyncing) return
      isSyncing = true
      try {
        // Auto-release engine: check if any appointment time has arrived
        checkAndAutoReleaseScheduledDisbursements()

        const deletedKeys = getDeletedDisbursementKeys()
        const localDisbursements = getSavedDisbursements()
        let remoteRecords: SyncedDisbursementRecord[] = []
        let appointmentsMap: Record<string, any> = {}

        // Fetch all endpoints concurrently in parallel
        const [
          resDbSettled,
          resAicsSettled,
          resPwdSettled,
          resLivSettled,
          resCwSettled,
          resApptsSettled,
        ] = await Promise.allSettled([
          fetch(`${API_BASE}/api/financial-aid`),
          fetch(`${API_BASE}/api/aics/applications`),
          fetch(`${API_BASE}/api/pwd-senior/applications`),
          fetch(`${API_BASE}/api/livelihood/applications`),
          fetch(`${API_BASE}/api/child-welfare/admin/all?limit=100`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          }),
          fetch(`${API_BASE}/api/appointments`),
        ])

        // 1. Process DB records
        if (resDbSettled.status === "fulfilled" && resDbSettled.value.ok) {
          try {
            const dataDb = await resDbSettled.value.json()
            if (dataDb.disbursements && Array.isArray(dataDb.disbursements)) {
              const dbRecords: SyncedDisbursementRecord[] = dataDb.disbursements
                .filter((d: any) => {
                  const dbId = `db-${d.id}`
                  return (
                    !deletedKeys.has(dbId) &&
                    !deletedKeys.has(String(d.id)) &&
                    !deletedKeys.has(d.disbursement_id) &&
                    !deletedKeys.has(d.application_ref)
                  )
                })
                .map((d: any) => ({
                  id: `db-${d.id}`,
                  disbursementId: d.disbursement_id,
                  applicationRef: d.application_ref,
                  applicantName: d.applicant_name,
                  assistanceType: d.assistance_type,
                  fixedAmount: Number(d.fixed_amount) > 0
                    ? ((Number(d.fixed_amount) === 1000 && (String(d.assistance_type).toLowerCase().includes("nutrition") || String(d.assistance_type).toLowerCase().includes("child") || String(d.assistance_type).toLowerCase().includes("solo")))
                        ? 5000
                        : Number(d.fixed_amount))
                    : resolveFixedAmount(d.assistance_type),
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
          } catch {}
        }

        // 2. Process AICS
        if (resAicsSettled.status === "fulfilled" && resAicsSettled.value.ok) {
          try {
            const data = await resAicsSettled.value.json()
            if (data.applications && Array.isArray(data.applications)) {
              const rejectedRefs = new Set<string>()
              const approvedApps = data.applications.filter((app: any) => {
                const ref = app.qc_id || app.reference_no || app.reference_number || "110000116932100"
                const idStr = `remote-${app.id || app.qc_id || app.reference_no}`
                const disbId = `DISB-2026-${String(app.id || 101).padStart(4, "0")}`
                if (deletedKeys.has(ref) || deletedKeys.has(idStr) || deletedKeys.has(disbId) || deletedKeys.has(String(app.id))) {
                  return false
                }
                if (app.status === "rejected" || app.status === "pending") {
                  rejectedRefs.add(ref)
                  return false
                }
                return app.status === "approved" || app.status === "completed" || app.status === "for_release"
              })

              const aicsRecords = approvedApps.map((app: any) => {
                const rawType = (app.assistance_type || "Medical").replace(/\s*assistance/gi, "").trim()
                const type = (rawType.charAt(0).toUpperCase() + rawType.slice(1)) + " Assistance"
                const amount = resolveFixedAmount(type)
                const isReleased = String(app.status || "").toLowerCase() === "released"

                return {
                  id: `remote-${app.id || app.qc_id || app.reference_no}`,
                  disbursementId: `DISB-2026-${String(app.id || 101).padStart(4, "0")}`,
                  applicationRef: app.qc_id || app.reference_no || app.reference_number || "110000116932100",
                  applicantName: `${app.first_name || ""} ${app.middle_name || ""} ${app.last_name || ""}`.trim().toUpperCase() || "BENEFICIARY APPLICANT",
                  assistanceType: type,
                  fixedAmount: amount,
                  dateApproved: new Date(app.created_at || Date.now()).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  status: isReleased ? ("RELEASED" as DisbursementStage) : ("PENDING" as DisbursementStage),
                  venue: "Quezon City Hall",
                  remarks: "Automatically generated from submitted application.",
                }
              })

              aicsRecords.forEach((ar: any) => {
                if (!remoteRecords.some((rr) => rr.applicationRef === ar.applicationRef || rr.disbursementId === ar.disbursementId)) {
                  remoteRecords.push(ar)
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

        if (Array.isArray(pwdSeniorApps) && pwdSeniorApps.length > 0) {
          const approvedPwdApps = pwdSeniorApps.filter((app: any) => {
            const ref = app.referenceNumber || app.reference_number || "PWD-QC-2026"
            const idStr = `remote-pwd-${app.id || ref}`
            const disbId = `DISB-2026-${String(app.id || ref).slice(-4).padStart(4, "0")}`
            if (deletedKeys.has(ref) || deletedKeys.has(idStr) || deletedKeys.has(disbId) || deletedKeys.has(String(app.id))) {
              return false
            }

            const isAssistance =
              app.type === "assistance" ||
              app.type === "social-assistance" ||
              String(app.category || "").toLowerCase().includes("assistance") ||
              String(app.service || "").toLowerCase().includes("assistance") ||
              String(app.assistanceType || "").toLowerCase().includes("assistance")

            if (isAssistance) {
              return app.status === "approved" || app.status === "completed" || app.status === "for_release"
            }
            return false
          })

          const pwdRecords: SyncedDisbursementRecord[] = approvedPwdApps.map((app: any) => {
            const fullName =
              [app.firstName, app.middleName, app.lastName, app.suffix].filter(Boolean).join(" ") ||
              [app.first_name, app.middle_name, app.last_name, app.suffix].filter(Boolean).join(" ") ||
              "APPLICANT"
            const isPwdApp = String(app.category || "").toUpperCase().includes("PWD")
            const assistanceType = isPwdApp ? "PWD Social Assistance" : "Senior Social Assistance"
            const isReleased = String(app.status || "").toLowerCase() === "released"
            const ref = app.referenceNumber || app.reference_number || "PWD-QC-2026"

            return {
              id: `remote-pwd-${app.id || ref}`,
              disbursementId: `DISB-2026-${String(app.id || ref).slice(-4).padStart(4, "0")}`,
              applicationRef: ref,
              applicantName: fullName.toUpperCase(),
              assistanceType: assistanceType,
              fixedAmount: 2000,
              dateApproved: new Date(app.approvedDate || app.submittedAt || Date.now()).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              status: isReleased ? ("RELEASED" as DisbursementStage) : ("PENDING" as DisbursementStage),
              venue: "Quezon City Hall",
              remarks: "Automatically generated from PWD/Senior Social Assistance application.",
            }
          })

          pwdRecords.forEach((pr) => {
            if (!remoteRecords.some((rr) => rr.applicationRef === pr.applicationRef || rr.disbursementId === pr.disbursementId)) {
              remoteRecords.push(pr)
            }
          })
        }

        // 4. Process Livelihood
        if (resLivSettled.status === "fulfilled" && resLivSettled.value.ok) {
          try {
            const dataLiv = await resLivSettled.value.json()
            if (Array.isArray(dataLiv)) {
              const approvedLiv = dataLiv.filter((l: any) => String(l.application_status || l.status).toLowerCase() === "approved")
              approvedLiv.forEach((l: any) => {
                const ref = l.reference_number || `LP-2026-${l.id}`
                const idStr = `remote-liv-${l.id || ref}`
                const disbId = `DISB-2026-${String(l.id || 101).padStart(4, "0")}`
                if (deletedKeys.has(ref) || deletedKeys.has(idStr) || deletedKeys.has(disbId) || deletedKeys.has(String(l.id))) {
                  return
                }

                if (!remoteRecords.some((rr) => rr.applicationRef === ref)) {
                  const fullName = `${l.first_name || ""} ${l.last_name || ""}`.trim().toUpperCase() || "BENEFICIARY"
                  remoteRecords.push({
                    id: `remote-liv-${l.id || ref}`,
                    disbursementId: disbId,
                    applicationRef: ref,
                    applicantName: fullName,
                    assistanceType: "Livelihood Capital Assistance",
                    fixedAmount: 15000,
                    dateApproved: new Date(l.created_at || Date.now()).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                    status: "PENDING" as DisbursementStage,
                    venue: "Quezon City Hall - SSDD Livelihood Center",
                    remarks: "Automatically generated from approved Livelihood application.",
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
            const approvedCw = cwApps.filter((c: any) => {
              const st = String(c.application_status || c.status).toLowerCase()
              return st === "approved" || st === "for_release" || st === "released" || st === "completed"
            })
            approvedCw.forEach((c: any) => {
              const ref = c.reference_number || `CW-2026-${c.id}`
              const idStr = `remote-cw-${c.id || ref}`
              const disbId = `DISB-2026-${String(c.id || 101).padStart(4, "0")}`
              if (deletedKeys.has(ref) || deletedKeys.has(idStr) || deletedKeys.has(disbId) || deletedKeys.has(String(c.id))) {
                return
              }

              if (!remoteRecords.some((rr) => rr.applicationRef === ref)) {
                const fullName =
                  [c.guardian_first_name, c.guardian_last_name].filter(Boolean).join(" ").toUpperCase() ||
                  c.child_name?.toUpperCase() ||
                  "BENEFICIARY"
                const supportTitle = c.category_title ? `${c.category_title} (Child Welfare)` : "Child Welfare Support"
                const amount = Number(c.approved_amount) || FIXED_ASSISTANCE_AMOUNTS[supportTitle] || 5000
                const isReleased = String(c.application_status || c.status).toLowerCase() === "released"
                remoteRecords.push({
                  id: idStr,
                  disbursementId: disbId,
                  applicationRef: ref,
                  applicantName: fullName,
                  assistanceType: supportTitle,
                  fixedAmount: amount,
                  dateApproved: new Date(c.updated_at || c.created_at || Date.now()).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  status: isReleased ? ("RELEASED" as DisbursementStage) : ("PENDING" as DisbursementStage),
                  venue: "Quezon City Hall - SSDD Child Welfare Section",
                  remarks: "Automatically generated from Child Welfare Assistance application.",
                })
              }
            })
          } catch {}
        }

        // 6. Process Appointments
        if (resApptsSettled.status === "fulfilled" && resApptsSettled.value.ok) {
          try {
            const dataAppts = await resApptsSettled.value.json()
            if (dataAppts.appointments && Array.isArray(dataAppts.appointments)) {
              dataAppts.appointments.forEach((a: any) => {
                if (a.reference_no) appointmentsMap[a.reference_no] = a
                if (a.applicant_name) appointmentsMap[a.applicant_name.toLowerCase().trim()] = a
              })
            }
          } catch {}
        }

        const now = new Date()

        let localScheduledMap: Record<string, any> = {}
        try {
          const rawSched = localStorage.getItem("all_appointments_scheduled")
          if (rawSched) localScheduledMap = JSON.parse(rawSched)
        } catch {}

        // Merge: remote records from database take precedence over local cache
        let merged = [...remoteRecords]
        localDisbursements.forEach((l) => {
          if (!merged.some((m) => m.applicationRef === l.applicationRef || m.disbursementId === l.disbursementId)) {
            merged.push(l)
          }
        })

        // Filter against deleted keys
        merged = merged.filter(
          (d) =>
            !deletedKeys.has(d.id) &&
            !deletedKeys.has(d.disbursementId) &&
            !deletedKeys.has(d.applicationRef)
        )

        // Attach schedule from appointments/cache and check real-time auto-release
        merged = merged.map((d) => {
          const baseRef = (d.applicationRef || "").split("-")[0].trim()
          const cleanAssistance = String(d.assistanceType).toLowerCase().replace(/assistance/g, "").replace(/social/g, "").trim()

          const appt =
            appointmentsMap[`${d.applicationRef}_${cleanAssistance}`] ||
            appointmentsMap[`${baseRef}_${cleanAssistance}`] ||
            appointmentsMap[`${d.applicantName.toLowerCase().trim()}_${cleanAssistance}`] ||
            appointmentsMap[d.applicationRef] ||
            appointmentsMap[baseRef] ||
            appointmentsMap[d.applicantName.toLowerCase().trim()]

          const cachedSched =
            localScheduledMap[d.id] ||
            localScheduledMap[d.disbursementId] ||
            localScheduledMap[`${d.applicationRef}_${d.assistanceType}`] ||
            localScheduledMap[`${baseRef}_${d.assistanceType}`] ||
            localScheduledMap[`${d.applicantName.toLowerCase().trim()}_${d.assistanceType}`] ||
            localScheduledMap[d.applicationRef] ||
            localScheduledMap[baseRef] ||
            localScheduledMap[d.applicantName.toLowerCase().trim()]

          const existingSaved = localDisbursements.find(
            (x) =>
              ((x.applicationRef && (x.applicationRef === d.applicationRef || x.applicationRef === baseRef)) ||
                (x.applicantName && x.applicantName.toLowerCase().trim() === d.applicantName.toLowerCase().trim())) &&
              (x.assistanceType === d.assistanceType || x.disbursementId === d.disbursementId)
          )

          const hasValidAppt = Boolean(appt?.scheduled_date && appt?.status !== "pending")
          const hasValidCached = Boolean(cachedSched?.scheduledDate && cachedSched?.status !== "pending")

          const finalApptDate = hasValidAppt
            ? appt.scheduled_date
            : hasValidCached
            ? cachedSched.scheduledDate
            : existingSaved?.appointmentDate || d.appointmentDate || null

          const finalApptTime = hasValidAppt
            ? appt.scheduled_time
            : hasValidCached
            ? cachedSched.scheduledTime
            : existingSaved?.appointmentTime || d.appointmentTime || null

          const finalVenue =
            appt?.office_location ||
            cachedSched?.officeLocation ||
            existingSaved?.venue ||
            d.venue ||
            "Quezon City Hall"

          let isTimeReached = false
          if (finalApptDate && finalApptTime) {
            const dt = parseAppointmentDateTime(finalApptDate, finalApptTime)
            if (dt && now.getTime() >= dt.getTime()) {
              isTimeReached = true
            }
          }

          const isApptDone = Boolean(finalApptDate) && (appt?.status === "completed" || cachedSched?.status === "completed")
          const wasAlreadyReleased = existingSaved?.status === "RELEASED" || d.status === "RELEASED"
          const isReleased = wasAlreadyReleased || isApptDone || (Boolean(finalApptDate) && isTimeReached)

          return {
            ...d,
            appointmentDate: finalApptDate,
            appointmentTime: finalApptTime,
            venue: finalVenue,
            status: isReleased ? ("RELEASED" as DisbursementStage) : ("PENDING" as DisbursementStage),
            releasedDate: isReleased
              ? d.releasedDate || existingSaved?.releasedDate || (finalApptDate && finalApptTime ? `${finalApptDate} ${finalApptTime}` : `${now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} ${finalApptTime || now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`)
              : undefined,
            releasedBy: isReleased
              ? d.releasedBy || existingSaved?.releasedBy || "Automated Scheduled Payout System / Disbursing Officer"
              : undefined,
          }
        })

        setDisbursements(merged)
        saveDisbursements(merged)
      } finally {
        isSyncing = false
      }
    }

    syncAll()

    // Interval checker (15s) with in-flight protection
    const autoReleaseInterval = setInterval(() => {
      syncAll()
    }, 15000)

    let debounceTimer: any = null
    const handleStorageChange = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        syncAll()
      }, 350)
    }

    const unsubscribe = subscribeToRealtimeChanges(() => {
      handleStorageChange()
    })

    window.addEventListener("financial_disbursements_updated", handleStorageChange)
    window.addEventListener("appointments_updated", handleStorageChange)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      clearTimeout(debounceTimer)
      clearInterval(autoReleaseInterval)
      unsubscribe()
      window.removeEventListener("financial_disbursements_updated", handleStorageChange)
      window.removeEventListener("appointments_updated", handleStorageChange)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // Filtered disbursements
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter((d) => {
      const matchStatus =
        selectedStatusTab === "ALL" || d.status === selectedStatusTab
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        d.applicantName.toLowerCase().includes(q) ||
        d.disbursementId.toLowerCase().includes(q) ||
        d.applicationRef.toLowerCase().includes(q) ||
        d.assistanceType.toLowerCase().includes(q)

      return matchStatus && matchSearch
    })
  }, [disbursements, selectedStatusTab, searchQuery])

  // KPIs
  const totalDisbursed = disbursements
    .filter((d) => d.status === "RELEASED")
    .reduce((sum, d) => sum + d.fixedAmount, 0)

  const pendingAmount = disbursements
    .filter((d) => d.status === "PENDING")
    .reduce((sum, d) => sum + d.fixedAmount, 0)

  const pendingCount = disbursements.filter((d) => d.status === "PENDING").length
  const releasedCount = disbursements.filter((d) => d.status === "RELEASED").length

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Financial Aid Disbursement
          </h1>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              await fetch(`${API_BASE}/api/financial-aid/cleanup`, { method: "POST" })
            } catch {}
            localStorage.removeItem("all_financial_disbursements")
            localStorage.removeItem("deleted_financial_disbursement_keys")
            window.dispatchEvent(new Event("financial_disbursements_updated"))
            window.location.reload()
          }}
          className="text-xs text-gray-400 hover:text-red-600 transition-colors cursor-pointer self-start sm:self-auto"
        >
          Reset / Clear Test Data
        </button>
      </div>

      {/* ── STATS SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Released</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">
            ₱{totalDisbursed.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            ✓ {releasedCount} beneficiaries paid
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Pending Release</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">
            ₱{pendingAmount.toLocaleString()}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">
            {pendingCount} pending payouts
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Records</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">
            {disbursements.length}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">
            Disbursement entries
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Status Flow</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm font-extrabold text-gray-900 mt-2">
            PENDING → RELEASED
          </p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-1">
            Auto-synced with Appointment Schedule
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── FIXED AMOUNT RATES TABLE ── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h2 className="text-xs font-bold uppercase text-gray-700 flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-emerald-600" />
            Configured Fixed Amount Rates
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            Automated Rates
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(FIXED_ASSISTANCE_AMOUNTS).map(([type, amount]) => (
            <div
              key={type}
              className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-left space-y-0.5 hover:border-blue-300 transition-colors"
            >
              <p className="text-[11px] text-gray-600 font-semibold truncate" title={type}>
                {type}
              </p>
              <p className="text-base font-extrabold text-blue-700">
                ₱{amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── DISBURSEMENT RECORDS TABLE ── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden space-y-0">
        {/* Top Controls */}
        <div className="p-4 sm:p-5 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                Financial Aid Disbursement Records
              </h3>
              <p className="text-xs text-gray-500">
                Automatically connected to appointments and auto-releases on the scheduled payout time.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID / Beneficiary name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-9 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              />
            </div>
          </div>

          {/* Status Filter Tabs & Cleanup Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {["ALL", "PENDING", "RELEASED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedStatusTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    selectedStatusTab === tab
                      ? "bg-[#3b82f6] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  {tab} {tab === "PENDING" ? `(${pendingCount})` : tab === "RELEASED" ? `(${releasedCount})` : `(${disbursements.length})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px]">
                <th className="px-4 py-3">Disbursement ID</th>
                <th className="px-4 py-3">Applicant Name</th>
                <th className="px-4 py-3">Assistance Type</th>
                <th className="px-4 py-3">Fixed Amount</th>
                <th className="px-4 py-3">Appointment Schedule</th>
                <th className="px-4 py-3">Payout Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDisbursements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    No disbursement records match the filter.
                  </td>
                </tr>
              ) : (
                filteredDisbursements.map((d) => {
                  const isPending = d.status === "PENDING"
                  const isRevealed = Boolean(revealedAmounts[d.id])

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-700">
                        {d.disbursementId}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900 uppercase">
                        {d.applicantName}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">
                        {d.assistanceType}
                      </td>
                      <td className="px-4 py-3.5 font-black text-emerald-700 text-sm">
                        {!isRevealed ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono tracking-wider text-gray-400 select-none">₱••••••</span>
                            <button
                              type="button"
                              onClick={() => toggleAmount(d.id)}
                              className="p-1 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Click to reveal payout amount"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span>₱{d.fixedAmount.toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => toggleAmount(d.id)}
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Click to hide payout amount"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-800 font-medium">
                        {d.appointmentDate ? (
                           <div className="space-y-0.5">
                            <span className="block text-gray-900 font-semibold">{d.appointmentDate}</span>
                            <span className="text-[11px] text-blue-700 font-bold">{d.appointmentTime || "10:00 AM"}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Pending Appointment</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        <span className="truncate block max-w-[160px]" title={d.venue || "Quezon City Hall"}>
                          {d.venue || "Quezon City Hall"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isPending
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {isPending ? (
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          )}
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailsRecord(d)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs hover:shadow-xs"
                            title="View full disbursement details"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: VIEW DETAILS ── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedDetailsRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase">
                  Disbursement Details
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedDetailsRecord.disbursementId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailsRecord(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500">Applicant:</span>
                <span className="font-bold text-gray-900 uppercase">
                  {selectedDetailsRecord.applicantName}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500">Assistance:</span>
                <span className="font-semibold text-gray-800">
                  {selectedDetailsRecord.assistanceType}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500">Fixed Amount:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {!revealedAmounts[`modal-${selectedDetailsRecord.id}`] ? (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <span className="tracking-wider text-gray-400 select-none">₱••••••</span>
                      <button
                        type="button"
                        onClick={() => toggleAmount(`modal-${selectedDetailsRecord.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline ml-1 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Show
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span>₱{selectedDetailsRecord.fixedAmount.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => toggleAmount(`modal-${selectedDetailsRecord.id}`)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-semibold underline ml-1 cursor-pointer inline-flex items-center gap-1"
                      >
                        <EyeOff className="w-3 h-3" />
                        Hide
                      </button>
                    </span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500">Application Reference / QCID:</span>
                <span className="font-mono text-blue-700 font-semibold">
                  <MaskedText
                    value={selectedDetailsRecord.applicationRef}
                    type="id"
                    showButtonLabel
                    auditSubject={selectedDetailsRecord.applicantName}
                    auditField="Application Ref / QCID"
                    auditModule="Financial Aid Disbursement"
                    referenceNo={selectedDetailsRecord.disbursementId}
                  />
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500">Appointment Schedule:</span>
                <span className="text-blue-700 font-bold">
                  {selectedDetailsRecord.appointmentDate || "August 31, 2026"} – {selectedDetailsRecord.appointmentTime || "10:00 AM"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500">Payout Location:</span>
                <span className="text-gray-900 font-medium">
                  {selectedDetailsRecord.venue || "Quezon City Hall"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500">Status:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    selectedDetailsRecord.status === "PENDING"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300"
                  }`}
                >
                  {selectedDetailsRecord.status}
                </span>
              </div>

              {selectedDetailsRecord.releasedDate && (
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-500">Date Released:</span>
                  <span className="font-semibold text-emerald-700">
                    {selectedDetailsRecord.releasedDate}
                  </span>
                </div>
              )}

              {selectedDetailsRecord.releasedBy && (
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-500">Disbursed By:</span>
                  <span className="font-medium text-gray-800">
                    {selectedDetailsRecord.releasedBy}
                  </span>
                </div>
              )}

              {selectedDetailsRecord.remarks && (
                <div className="bg-gray-50 rounded-xl p-3 text-[11px] text-gray-600 space-y-1">
                  <span className="font-bold text-gray-700 block">Notes / Remarks:</span>
                  <p>{selectedDetailsRecord.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailsRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
