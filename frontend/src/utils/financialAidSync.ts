import { API_BASE } from "../config/api"

export const FIXED_ASSISTANCE_AMOUNTS: Record<string, number> = {
  "Medical Assistance": 5000,
  "Funeral Assistance": 10000,
  "Educational Assistance": 3000,
  "Burial Assistance": 10000,
  "Food Assistance": 1500,
  "Transportation Assistance": 1000,
  "PWD Social Assistance": 2000,
  "Senior Social Assistance": 2000,
  "Child Welfare Support": 5000,
  "Nutritional Assistance": 5000,
  "Nutritional Assistance (Child Welfare)": 5000,
  "Child Protection Assistance": 5000,
  "Emergency Assistance": 5000,
  "Child Welfare Assistance": 5000,
  "Solo Parent Welfare Assistance": 5000,
  "Solo Parent Assistance": 5000,
  "Livelihood Capital Assistance": 15000,
  "Livelihood Assistance": 15000,
  "Livelihood Program": 15000,
}

export function resolveFixedAmount(concern: string): number {
  if (!concern) return 5000
  const c = String(concern).trim()
  if (FIXED_ASSISTANCE_AMOUNTS[c]) return FIXED_ASSISTANCE_AMOUNTS[c]
  const clean = c.replace(/\s*assistance/gi, "").trim()
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1) + " Assistance"
  if (FIXED_ASSISTANCE_AMOUNTS[formatted]) return FIXED_ASSISTANCE_AMOUNTS[formatted]

  const lower = c.toLowerCase()
  if (lower.includes("funeral") || lower.includes("burial")) return 10000
  if (lower.includes("livelihood")) return 15000
  if (lower.includes("nutrition") || lower.includes("child") || lower.includes("medical") || lower.includes("emergency") || lower.includes("solo")) return 5000
  if (lower.includes("education")) return 3000
  if (lower.includes("pwd") || lower.includes("senior")) return 2000
  if (lower.includes("food")) return 1500
  if (lower.includes("transport")) return 1000
  return 5000
}

export type DisbursementStage = "PENDING" | "RELEASED"

export interface SyncedDisbursementRecord {
  id: string
  disbursementId: string
  applicationRef: string
  applicantName: string
  assistanceType: string
  fixedAmount: number
  dateApproved: string
  status: DisbursementStage
  appointmentDate?: string
  appointmentTime?: string
  venue?: string
  releasedDate?: string
  releasedBy?: string
  remarks?: string
}

export interface UserNotificationItem {
  id: string
  title: string
  desc: string
  time: string
  unread: boolean
  applicationRef?: string
  assistanceType?: string
  amount?: number
}

// ── INITIAL SEED DATA (Empty so only real applications appear) ──
export const INITIAL_DISBURSEMENTS: SyncedDisbursementRecord[] = []

// ── CHECK IF SERVICE IS PURELY A TRAINING PROGRAM (NON-MONETARY) ──
export function isTrainingService(serviceOrConcern?: string): boolean {
  if (!serviceOrConcern) return false
  const lower = serviceOrConcern.toLowerCase()
  return (
    lower.includes("training") ||
    lower.includes("skills") ||
    lower.includes("sewing") ||
    lower.includes("cooking") ||
    lower.includes("beauty services") ||
    lower.includes("beauty care") ||
    lower.includes("computer training") ||
    lower.includes("training program")
  )
}

// ── CHECK IF SERVICE IS PURELY AN ID / BOOKLET APPLICATION (NOT CASH AID) ──
export function isIdOrDocumentService(serviceOrConcern?: string): boolean {
  if (!serviceOrConcern) return false
  if (isTrainingService(serviceOrConcern)) return false
  const lower = serviceOrConcern.toLowerCase()
  if (
    lower.includes("social assistance") ||
    lower.includes("financial assistance") ||
    lower.includes("cash assistance") ||
    lower.includes("medical assistance") ||
    lower.includes("funeral assistance") ||
    lower.includes("educational assistance") ||
    lower.includes("food assistance") ||
    lower.includes("material assistance") ||
    lower.includes("transportation assistance") ||
    lower.includes("burial assistance") ||
    lower.includes("child welfare") ||
    lower.includes("nutritional") ||
    lower.includes("child protection") ||
    lower.includes("emergency assistance") ||
    lower.includes("livelihood")
  ) {
    return false
  }

  return (
    lower.includes("id") ||
    lower.includes("booklet") ||
    (lower.includes("solo parent") && !lower.includes("child welfare") && !lower.includes("assistance")) ||
    lower.includes("pwd") ||
    lower.includes("senior")
  )
}

// ── DELETED DISBURSEMENTS TRACKER ──
export function getDeletedDisbursementKeys(): Set<string> {
  try {
    const raw = localStorage.getItem("deleted_financial_disbursement_keys")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch {}
  return new Set()
}

export function markDisbursementAsDeleted(keys: string[]) {
  try {
    const deleted = getDeletedDisbursementKeys()
    keys.forEach((k) => {
      if (k && k.trim()) deleted.add(k.trim())
    })
    localStorage.setItem("deleted_financial_disbursement_keys", JSON.stringify(Array.from(deleted)))
  } catch {}
}

export async function deleteFinancialAidDisbursement(record: {
  id?: string
  disbursementId?: string
  applicationRef?: string
  applicantName?: string
}) {
  const keysToDelete = [
    record.id,
    record.disbursementId,
    record.applicationRef,
  ].filter(Boolean) as string[]

  // 1. Mark in permanent deleted blacklist to prevent re-generation from auto-sync
  markDisbursementAsDeleted(keysToDelete)

  // 2. Remove from localStorage
  try {
    const raw = localStorage.getItem("all_financial_disbursements")
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        const next = list.filter((item: any) => {
          const idMatch = keysToDelete.includes(item.id) || keysToDelete.includes(item.disbursementId) || keysToDelete.includes(item.applicationRef)
          return !idMatch
        })
        localStorage.setItem("all_financial_disbursements", JSON.stringify(next))
      }
    }
  } catch {}

  // 3. Delete from backend tables
  try {
    const cleanAppRef = (record.applicationRef || "")
      .replace(/^db-appt-/, "")
      .replace(/^aics-appt-/, "")
      .replace(/^pwd-senior-appt-/, "")

    const requests: Promise<any>[] = []
    if (record.id) requests.push(fetch(`${API_BASE}/api/financial-aid/${encodeURIComponent(record.id)}`, { method: "DELETE" }))
    if (record.disbursementId) requests.push(fetch(`${API_BASE}/api/financial-aid/${encodeURIComponent(record.disbursementId)}`, { method: "DELETE" }))
    if (record.applicationRef) {
      requests.push(fetch(`${API_BASE}/api/financial-aid/${encodeURIComponent(record.applicationRef)}`, { method: "DELETE" }))
      requests.push(fetch(`${API_BASE}/api/financial-aid/cleanup-user/${encodeURIComponent(record.applicationRef)}`, { method: "DELETE" }))
    }
    if (record.applicantName) {
      requests.push(fetch(`${API_BASE}/api/financial-aid/cleanup-user/${encodeURIComponent(record.applicantName.trim())}`, { method: "DELETE" }))
    }
    if (cleanAppRef && cleanAppRef !== record.applicationRef) {
      requests.push(fetch(`${API_BASE}/api/financial-aid/${encodeURIComponent(cleanAppRef)}`, { method: "DELETE" }))
      requests.push(fetch(`${API_BASE}/api/aics/applications/${encodeURIComponent(cleanAppRef)}`, { method: "DELETE" }))
      requests.push(fetch(`${API_BASE}/api/pwd-senior/applications/${encodeURIComponent(cleanAppRef)}`, { method: "DELETE" }))
    }

    await Promise.allSettled(requests)
  } catch (err) {
    console.warn("Error deleting disbursement from backend:", err)
  }

  // 4. Notify all components
  window.dispatchEvent(new Event("financial_disbursements_updated"))
  window.dispatchEvent(new Event("storage"))
}

// ── GET DISBURSEMENTS ──
export function getSavedDisbursements(): SyncedDisbursementRecord[] {
  try {
    const deletedKeys = getDeletedDisbursementKeys()
    const raw = localStorage.getItem("all_financial_disbursements")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Filter out dummy sample records (d1 to d8), pure ID services, and deleted keys
        const realOnes = parsed.filter(
          (p) =>
            p &&
            !["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"].includes(p.id) &&
            !isIdOrDocumentService(p.assistanceType) &&
            !isTrainingService(p.assistanceType) &&
            !deletedKeys.has(p.id) &&
            !deletedKeys.has(p.disbursementId) &&
            !deletedKeys.has(p.applicationRef)
        )

        // Deduplicate records by applicationRef or assistanceType
        const recordMap = new Map<string, SyncedDisbursementRecord>()
        realOnes.forEach((r) => {
          const key = (r.applicationRef || r.disbursementId || r.id || "").trim()
          if (!key) return
          // Ensure correct fixed amount is applied
          const correctAmount = resolveFixedAmount(r.assistanceType)
          const recordWithCorrectAmount: SyncedDisbursementRecord = {
            ...r,
            fixedAmount: (r.fixedAmount && r.fixedAmount !== 1000) ? r.fixedAmount : correctAmount,
          }

          if (!recordMap.has(key)) {
            recordMap.set(key, recordWithCorrectAmount)
          } else {
            const existing = recordMap.get(key)!
            // Prefer RELEASED over PENDING, or newer date
            if (r.status === "RELEASED" && existing.status !== "RELEASED") {
              recordMap.set(key, { ...recordWithCorrectAmount, status: "RELEASED" })
            } else if (r.appointmentDate && !existing.appointmentDate) {
              recordMap.set(key, recordWithCorrectAmount)
            }
          }
        })

        return Array.from(recordMap.values())
      }
    }
  } catch (e) {
    console.warn("Could not parse disbursements from localStorage:", e)
  }
  return []
}

// ── CLEAR ALL DISBURSEMENTS ──
export function clearAllDisbursements() {
  try {
    localStorage.removeItem("all_financial_disbursements")
    localStorage.removeItem("deleted_financial_disbursement_keys")
    window.dispatchEvent(new Event("financial_disbursements_updated"))
    window.dispatchEvent(new Event("storage"))
  } catch (e) {}
}

// ── SAVE DISBURSEMENTS ──
export function saveDisbursements(records: SyncedDisbursementRecord[]) {
  try {
    // Deduplicate before saving
    const recordMap = new Map<string, SyncedDisbursementRecord>()
    records.forEach((r) => {
      const key = (r.applicationRef || r.disbursementId || r.id || "").trim()
      if (!key) return
      if (!recordMap.has(key)) {
        recordMap.set(key, r)
      } else {
        const existing = recordMap.get(key)!
        if (r.status === "RELEASED" && existing.status !== "RELEASED") {
          recordMap.set(key, r)
        } else if (r.appointmentDate && !existing.appointmentDate) {
          recordMap.set(key, r)
        }
      }
    })
    const cleanList = Array.from(recordMap.values())
    localStorage.setItem("all_financial_disbursements", JSON.stringify(cleanList))
    window.dispatchEvent(new Event("financial_disbursements_updated"))
    window.dispatchEvent(new Event("storage"))
  } catch (e) {
    console.warn("Could not save disbursements to localStorage:", e)
  }
}

// ── ADD USER NOTIFICATION ──
export function pushUserNotification(notif: {
  title: string
  desc: string
  applicationRef?: string
  assistanceType?: string
  amount?: number
}) {
  try {
    const raw = localStorage.getItem("all_user_notifications")
    const existing: UserNotificationItem[] = raw ? JSON.parse(raw) : []

    // Strict deduplication check: avoid duplicate notifications for same application and title
    if (notif.applicationRef) {
      const isDuplicate = existing.some(
        (e) =>
          String(e.applicationRef || "").trim() === String(notif.applicationRef || "").trim() &&
          e.title === notif.title
      )
      if (isDuplicate) return
    }

    const newNotif: UserNotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: notif.title,
      desc: notif.desc,
      time: new Date().toLocaleString("en-PH"),
      unread: true,
      applicationRef: notif.applicationRef,
      assistanceType: notif.assistanceType,
      amount: notif.amount,
    }
    localStorage.setItem("all_user_notifications", JSON.stringify([newNotif, ...existing]))
    try {
      let qcidNo: string | null = null
      let userEmail: string | null = null
      try {
        const stored = localStorage.getItem("user_profile")
        if (stored) {
          const parsed = JSON.parse(stored)
          qcidNo = parsed.qcidNumber || parsed.qcidNo || null
          userEmail = parsed.email || null
        }
      } catch {}

      fetch(`${API_BASE}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: notif.applicationRef || qcidNo || null,
          qcid: qcidNo,
          email: userEmail,
          title: notif.title,
          description: notif.desc,
          applicationRef: notif.applicationRef || null,
        }),
      }).catch(() => {})
    } catch (_) {}

    window.dispatchEvent(new Event("user_notifications_updated"))
    window.dispatchEvent(new Event("storage"))
  } catch (e) {
    console.warn("Could not save user notification:", e)
  }
}

// ── SYNC: WHEN ADMIN SCHEDULES/UPDATES APPOINTMENT ──
export function syncAppointmentToFinancialAid(params: {
  referenceNo: string
  applicantName: string
  concern: string
  date: string
  time: string
  location: string
  notes?: string
}) {
  // If the appointment concern is an ID application or Training Program, do not treat as cash payout
  if (isIdOrDocumentService(params.concern) || isTrainingService(params.concern)) {
    return
  }

  const currentDisbursements = getSavedDisbursements()
  let found = false

  const fixedAmount = resolveFixedAmount(params.concern)
  const rawConcern = params.concern.replace(/\s*assistance/gi, "").trim()
  const formattedConcern = params.concern.includes("Assistance") ? params.concern : (rawConcern.charAt(0).toUpperCase() + rawConcern.slice(1) + " Assistance")

  // Format date to human readable e.g. August 31, 2026
  let formattedDate = params.date
  try {
    const d = new Date(params.date)
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
    }
  } catch {}

  const updatedDisbursements = currentDisbursements.map((d) => {
    if (
      d.applicationRef === params.referenceNo ||
      (d.applicantName.toLowerCase().trim() === params.applicantName.toLowerCase().trim() &&
        d.status === "PENDING" &&
        d.assistanceType.toLowerCase().includes(rawConcern.toLowerCase()))
    ) {
      found = true
      return {
        ...d,
        applicationRef: params.referenceNo,
        appointmentDate: formattedDate,
        appointmentTime: params.time,
        venue: params.location || "Quezon City Hall",
      }
    }
    return d
  })

  // If not found, create new connected disbursement record!
  if (!found) {
    const newId = `DISB-2026-${String(currentDisbursements.length + 1).padStart(4, "0")}`
    const newRecord: SyncedDisbursementRecord = {
      id: `disb-${Date.now()}`,
      disbursementId: newId,
      applicationRef: params.referenceNo,
      applicantName: params.applicantName.toUpperCase(),
      assistanceType: formattedConcern,
      fixedAmount: fixedAmount,
      dateApproved: new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }),
      status: "PENDING",
      appointmentDate: formattedDate,
      appointmentTime: params.time,
      venue: params.location || "Quezon City Hall",
      remarks: params.notes || "Scheduled appointment for financial aid payout.",
    }
    updatedDisbursements.unshift(newRecord)
  }

  saveDisbursements(updatedDisbursements)

  // Send User Notification for Scheduled Payout Appointment
  pushUserNotification({
    title: "Payout Appointment Scheduled",
    desc: `Your Financial Aid payout appointment has been scheduled.\nDate: ${formattedDate}\nTime: ${params.time}\nLocation: ${params.location || "Quezon City Hall"}\nAmount: ₱${fixedAmount.toLocaleString()}`,
    applicationRef: params.referenceNo,
    assistanceType: formattedConcern,
    amount: fixedAmount,
  })

  // Asynchronously sync to Backend PostgreSQL
  try {
    fetch(`${API_BASE}/api/appointments/${encodeURIComponent(params.referenceNo)}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledDate: formattedDate,
        scheduledTime: params.time,
        officeLocation: params.location || "Quezon City Hall",
        notes: params.notes,
        applicantName: params.applicantName,
        concern: formattedConcern,
      }),
    }).catch(() => {})
  } catch {}
}

// ── SYNC: WHEN ADMIN CONFIRMS FINANCIAL AID RELEASE ──
export function syncFinancialAidRelease(recordId: string, details: {
  releasedDate: string
  releasedBy: string
  venue: string
  remarks?: string
}) {
  const currentDisbursements = getSavedDisbursements()
  let releasedRecord: SyncedDisbursementRecord | null = null

  const updated = currentDisbursements.map((d) => {
    if (d.id === recordId || d.disbursementId === recordId) {
      releasedRecord = {
        ...d,
        status: "RELEASED" as DisbursementStage,
        releasedDate: details.releasedDate,
        releasedBy: details.releasedBy,
        venue: details.venue,
        remarks: details.remarks || d.remarks,
      }
      return releasedRecord
    }
    return d
  })

  saveDisbursements(updated)

  if (releasedRecord) {
    const rec = releasedRecord as SyncedDisbursementRecord
    // Send User Notification for Released Aid
    pushUserNotification({
      title: "Financial Aid Released",
      desc: `Your Financial Aid (${rec.assistanceType} — ₱${rec.fixedAmount.toLocaleString()}) has been released successfully. Date: ${details.releasedDate}.`,
      applicationRef: rec.applicationRef,
      assistanceType: rec.assistanceType,
      amount: rec.fixedAmount,
    })

    // Asynchronously sync to Backend PostgreSQL
    try {
      fetch(`${API_BASE}/api/financial-aid/${encodeURIComponent(recordId)}/release`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releasedDate: details.releasedDate,
          releasedBy: details.releasedBy,
          venue: details.venue,
          remarks: details.remarks,
        }),
      }).catch(() => {})
    } catch {}
  }
}

// ── HELPER: PARSE APPOINTMENT DATETIME ──
export function parseAppointmentDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr) return null
  try {
    let year: number, month: number, day: number

    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10)
      month = parseInt(isoMatch[2], 10) - 1
      day = parseInt(isoMatch[3], 10)
    } else {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      year = d.getFullYear()
      month = d.getMonth()
      day = d.getDate()
    }

    let hours = 9
    let minutes = 0

    if (timeStr) {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (match) {
        hours = parseInt(match[1], 10)
        minutes = parseInt(match[2], 10)
        const ampm = match[3]?.toUpperCase()
        if (ampm === "PM" && hours < 12) hours += 12
        if (ampm === "AM" && hours === 12) hours = 0
      }
    }

    return new Date(year, month, day, hours, minutes, 0, 0)
  } catch {
    return null
  }
}

// ── TIME-BASED AUTO-RELEASE ENGINE ──
export function checkAndAutoReleaseScheduledDisbursements(): number {
  const currentDisbursements = getSavedDisbursements()
  const now = new Date()
  let releasedCount = 0

  const updated = currentDisbursements.map((d) => {
    if (d.status === "PENDING" && d.appointmentDate) {
      const scheduledDt = parseAppointmentDateTime(d.appointmentDate, d.appointmentTime)
      if (scheduledDt && now.getTime() >= scheduledDt.getTime()) {
        releasedCount++
        const formattedReleaseDate = now.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        const finalReleaseTime = d.appointmentTime || now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })

        // Send User Notification for Auto-Released Aid
        pushUserNotification({
          title: "Financial Aid Released",
          desc: `Your Financial Aid (${d.assistanceType} — ₱${d.fixedAmount.toLocaleString()}) has been automatically released at the scheduled appointment time (${d.appointmentDate} – ${finalReleaseTime}).`,
          applicationRef: d.applicationRef,
          assistanceType: d.assistanceType,
          amount: d.fixedAmount,
        })

        return {
          ...d,
          status: "RELEASED" as DisbursementStage,
          releasedDate: `${formattedReleaseDate} ${finalReleaseTime}`,
          releasedBy: "Automated Scheduled Payout System / Disbursing Officer",
          remarks: `Automatically released at scheduled appointment time (${d.appointmentDate} - ${finalReleaseTime}).`,
        }
      }
    }
    return d
  })

  if (releasedCount > 0) {
    saveDisbursements(updated)
  }

  return releasedCount
}

// ── UTILITY: CLEANUP USER TEST DATA (RENZ) ──
export async function cleanupRenzTestData() {
  try {
    // 1. Backend cleanup calls
    await Promise.allSettled([
      fetch(`${API_BASE}/api/cleanup-user/110000572516915`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/cleanup-user/renz`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/cleanup-user/millares`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/aics/applications/cleanup-user/110000572516915`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/aics/applications/cleanup-user/renz`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/aics/cleanup-user/110000572516915`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/aics/cleanup-user/renz`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/appointments/cleanup-user/110000572516915`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/appointments/cleanup-user/renz`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/financial-aid/cleanup-user/110000572516915`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/financial-aid/cleanup-user/renz`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/pwd-senior/applications/cleanup-user/110000572516915`, { method: "DELETE" }),
      fetch(`${API_BASE}/api/pwd-senior/applications/cleanup-user/renz`, { method: "DELETE" }),
    ])
  } catch {}

  // 2. LocalStorage cleanup
  const storageKeys = [
    "all_financial_disbursements",
    "all_appointments_scheduled",
    "pwd_senior_applications",
    "aics_applications",
    "all_user_applications",
    "active_applications",
    "all_user_notifications",
    "citizen_applications",
    "user_applications",
    "dismissed_senior_assistance_ref"
  ]

  for (const k of storageKeys) {
    try {
      const raw = localStorage.getItem(k)
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          const filtered = list.filter((item: any) => {
            const str = JSON.stringify(item).toLowerCase()
            return !str.includes("renz") && !str.includes("110000572516915") && !str.includes("millares")
          })
          localStorage.setItem(k, JSON.stringify(filtered))
        } else if (typeof list === "object" && list !== null) {
          const newObj = { ...list }
          Object.keys(newObj).forEach((objKey) => {
            if (
              objKey.toLowerCase().includes("renz") ||
              objKey.includes("110000572516915") ||
              objKey.toLowerCase().includes("millares")
            ) {
              delete newObj[objKey]
            }
          })
          localStorage.setItem(k, JSON.stringify(newObj))
        }
      }
    } catch {}
  }

  // 3. Dispatch events
  window.dispatchEvent(new Event("financial_disbursements_updated"))
  window.dispatchEvent(new Event("appointments_updated"))
  window.dispatchEvent(new Event("pwd_senior_applications_updated"))
  window.dispatchEvent(new Event("aics_applications_updated"))
  window.dispatchEvent(new Event("applications_updated"))
  window.dispatchEvent(new Event("storage"))
}

