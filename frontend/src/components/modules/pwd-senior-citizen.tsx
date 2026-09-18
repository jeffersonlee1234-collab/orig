import React, { useState, useEffect, useRef } from "react"
import {
  Check,
  X,
  FileText,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Paperclip,
  Image as ImageIcon,
  HeartHandshake,
  IdCard,
  Download,
} from "lucide-react"
import { toPng } from "html-to-image"
import { API_BASE } from "../../config/api"
import {
  pushUserNotification,
  getSavedDisbursements,
  saveDisbursements,
  type SyncedDisbursementRecord,
} from "../../utils/financialAidSync"
import { notifyApplicationChange, subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import MaskedText from "../ui/masked-text"

// ---- Types for collected form data from user submissions ----
interface ApplicationDocument {
  name: string
  filename?: string
  fileUrl?: string
  file?: File
  uploadedAt: string
  status: "verified" | "pending" | "rejected"
}

interface PWDApplicationSubmission {
  id: string
  submittedAt: string
  referenceNumber: string
  category: "PWD"
  type: "new" | "renewal" | "loss" | "assistance"

  // Personal Info
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  dateOfBirth: string
  age?: number | string
  sex: string
  civilStatus: string

  // Contact & Address
  contactNo: string
  cellphoneNo?: string
  email: string
  address: string

  // Disability Info
  disabilityType: string
  disabilityClass: "apparent" | "non-apparent" | string
  causeOfDisability: string
  disabilityDescription?: string
  briefDescription?: string

  // Socio-Economic / Assistance
  householdMembersCount?: string | number
  householdMembers?: string | number
  numberOfHouseholdMembers?: string | number
  monthlyHouseholdIncome?: string
  monthlyHouseholdExpenses?: string
  assistanceType?: string
  reasonForRequest?: string
  livingArrangement?: string
  pensionSource?: string

  // Family / Emergency Info
  applyingFor?: "myself" | "family"
  familyMemberName?: string
  familyRelationship?: string
  emergencyFirstName?: string
  emergencyLastName?: string
  emergencyName?: string
  emergencyContactNo?: string
  emergencyRelationship?: string
  emergencyAddress?: string
  guardianName?: string
  guardianContact?: string
  guardianAddress?: string

  // Documents
  documents: ApplicationDocument[]

  // Admin Review
  status: "pending" | "approved" | "rejected" | "needs_revision"
  assignedIdNumber?: string
  rejectionReason?: string
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

interface SeniorCitizenApplicationSubmission {
  id: string
  submittedAt: string
  referenceNumber: string
  category: "Senior Citizen"
  type: "new" | "renewal" | "loss" | "medicine-booklet" | "movie-booklet" | "social-assistance"

  // Personal Info
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  dateOfBirth: string
  age?: number | string
  sex: string
  civilStatus: string

  // Contact & Address
  cellphoneNo: string
  contactNo?: string
  email: string
  address: string

  // Optional Disability Info (if dual or mapped from unified records)
  disabilityType?: string
  disabilityClass?: string
  causeOfDisability?: string

  // Vaccination Info
  vaccinatedCovid: string

  // Family / Emergency Info
  applyingFor?: "myself" | "family"
  familyMemberName?: string
  familyRelationship?: string
  emergencyFirstName?: string
  emergencyLastName?: string
  emergencyName?: string
  emergencyContactNo?: string
  emergencyRelationship?: string
  emergencyAddress?: string
  guardianName?: string
  guardianContact?: string
  guardianAddress?: string

  // Documents
  documents: ApplicationDocument[]

  // Admin Review
  status: "pending" | "approved" | "rejected" | "needs_revision"
  assignedIdNumber?: string
  rejectionReason?: string
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

type ApplicationSubmission = PWDApplicationSubmission | SeniorCitizenApplicationSubmission

function isPWD(app: ApplicationSubmission): app is PWDApplicationSubmission {
  const cat = String(app.category || "").toLowerCase()
  const id = String(app.id || "").toLowerCase()
  const ref = String(app.referenceNumber || "").toLowerCase()
  const assigned = String(app.assignedIdNumber || "").toLowerCase()
  const type = String(app.type || "").toLowerCase()
  const service = String((app as any).service || "").toLowerCase()

  // 1. Explicit Senior Citizen or Booklet indicators mean NOT PWD
  if (
    cat.includes("senior") ||
    cat.includes("osca") ||
    type.includes("movie") ||
    type.includes("medicine") ||
    type.includes("booklet") ||
    service.includes("senior") ||
    service.includes("movie") ||
    service.includes("medicine") ||
    service.includes("booklet") ||
    id.includes("snr") ||
    ref.startsWith("osca") ||
    assigned.startsWith("osca") ||
    assigned.startsWith("mb-") ||
    assigned.startsWith("mv-")
  ) {
    return false
  }

  // 2. Otherwise check PWD markers
  if (
    cat.includes("pwd") ||
    cat.includes("disabilit") ||
    id.includes("pwd") ||
    ref.startsWith("pwd") ||
    assigned.startsWith("pwd") ||
    String((app as any).disabilityType || "").trim() !== ""
  ) {
    return true
  }

  return false
}

function safeDateIso(dateVal: any): string {
  if (!dateVal) return ""
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? "" : d.toISOString()
}

function formatSafeDate(dateVal: any): string {
  if (!dateVal) return "—"
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

function formatSafeTime(dateVal: any): string {
  if (!dateVal) return ""
  const d = new Date(dateVal)
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatSafeDateTime(dateVal: any): string {
  if (!dateVal) return "—"
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

function findExistingIdForApplicant(app: ApplicationSubmission, allApps?: ApplicationSubmission[]): string | null {
  const isPwdApp = isPWD(app)
  const candidateFields = isPwdApp
    ? [
      (app as any).existingPwdIdNumber,
      (app as any).pwdIdNumber,
      (app as any).oldPwdId,
      (app as any).existingIdNumber,
      (app as any).existing_id_number,
      app.assignedIdNumber,
      (app as any).assigned_id_number,
      (app as any).idNumber,
    ]
    : [
      (app as any).seniorIdNumber,
      (app as any).oldSeniorId,
      (app as any).oscaId,
      (app as any).existingIdNumber,
      (app as any).existing_id_number,
      app.assignedIdNumber,
      (app as any).assigned_id_number,
      (app as any).idNumber,
    ]

  for (const c of candidateFields) {
    if (c && typeof c === "string") {
      const s = c.trim()
      if (s && s !== "—" && !s.startsWith("110000")) {
        if (isPwdApp) {
          if (s.toUpperCase().startsWith("PWD-")) return s.toUpperCase()
          if (!s.toUpperCase().startsWith("SENIOR-") && !s.toUpperCase().startsWith("OSCA-") && (s.startsWith("137404-") || s.length > 5)) {
            return `PWD-${s}`
          }
        } else {
          if (s.toUpperCase().startsWith("SENIOR-") || s.toUpperCase().startsWith("OSCA-")) {
            return s.toUpperCase().replace("OSCA-", "SENIOR-")
          }
          if (!s.toUpperCase().startsWith("PWD-") && (s.startsWith("137404-") || s.length > 5)) {
            return `SENIOR-${s}`
          }
        }
      }
    }
  }

  // Look up applicant in allApps or localStorage
  let pool: any[] = allApps || []
  if (!pool.length) {
    try {
      const raw = localStorage.getItem("pwd_senior_applications")
      if (raw) pool = JSON.parse(raw)
    } catch { }
  }

  const appEmail = String(app.email || "").trim().toLowerCase()
  const appRef = String(app.referenceNumber || (app as any).reference_no || "").trim().toLowerCase()
  const appName = `${app.firstName || ""} ${app.lastName || ""}`.trim().toLowerCase()

  if (Array.isArray(pool)) {
    // 1. First look for prior approved application belonging to the same person with matching category
    const priorApproved = pool.find((a) => {
      if (!a || a.id === app.id) return false
      const aIsPwd = isPWD(a)
      if (aIsPwd !== isPwdApp) return false
      const isApproved = a.status === "approved" || a.status === "completed" || a.status === "for_release"
      if (!isApproved) return false
      const assigned = a.assignedIdNumber || (a as any).assigned_id_number
      if (!assigned || String(assigned).trim() === "" || String(assigned).trim() === "—") return false

      const aEmail = String(a.email || "").trim().toLowerCase()
      const aRef = String(a.referenceNumber || (a as any).reference_no || "").trim().toLowerCase()
      const aName = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase()

      return (
        (appEmail && aEmail && appEmail === aEmail) ||
        (appRef && aRef && (appRef === aRef || appRef.includes(aRef) || aRef.includes(appRef))) ||
        (appName && aName && appName === aName)
      )
    })

    if (priorApproved) {
      const assigned = priorApproved.assignedIdNumber || (priorApproved as any).assigned_id_number
      if (assigned) {
        if (isPwdApp) {
          return String(assigned).trim().replace(/^(SENIOR|OSCA)-/i, "PWD-")
        } else {
          return String(assigned).trim().replace(/^(PWD|OSCA)-/i, "SENIOR-")
        }
      }
    }

    // 2. Look for any prior application of same user that had an existingIdNumber with same category
    const priorWithId = pool.find((a) => {
      if (!a || a.id === app.id) return false
      const aIsPwd = isPWD(a)
      if (aIsPwd !== isPwdApp) return false
      const existing = (a as any).existingIdNumber || (a as any).existing_id_number || (a as any).seniorIdNumber || (a as any).existingPwdIdNumber || (a as any).pwdIdNumber
      if (!existing || String(existing).trim() === "" || String(existing).trim() === "—") return false

      const aEmail = String(a.email || "").trim().toLowerCase()
      const aRef = String(a.referenceNumber || (a as any).reference_no || "").trim().toLowerCase()
      const aName = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase()

      return (
        (appEmail && aEmail && appEmail === aEmail) ||
        (appRef && aRef && (appRef === aRef || appRef.includes(aRef) || aRef.includes(appRef))) ||
        (appName && aName && appName === aName)
      )
    })

    if (priorWithId) {
      const existing = (priorWithId as any).existingIdNumber || (priorWithId as any).existing_id_number || (priorWithId as any).seniorIdNumber || (priorWithId as any).existingPwdIdNumber || (priorWithId as any).pwdIdNumber
      if (existing) {
        if (isPwdApp) {
          return String(existing).trim().replace(/^(SENIOR|OSCA)-/i, "PWD-")
        } else {
          return String(existing).trim().replace(/^(PWD|OSCA)-/i, "SENIOR-")
        }
      }
    }
  }

  // If user entered a reference number that starts with PWD- or SENIOR-
  if (isPwdApp && appRef.startsWith("pwd-")) {
    return appRef.toUpperCase()
  }
  if (!isPwdApp && (appRef.startsWith("senior-") || appRef.startsWith("osca-"))) {
    return appRef.toUpperCase().replace("OSCA-", "SENIOR-")
  }

  return null
}

function getStableSequence(refOrId: string): string {
  let hash = 0
  for (let i = 0; i < refOrId.length; i++) {
    hash = (hash << 5) - hash + refOrId.charCodeAt(i)
    hash |= 0
  }
  const positive = Math.abs(hash)
  return String(100000 + (positive % 900000))
}

function generateOfficialIdNumber(app: ApplicationSubmission, allApps?: ApplicationSubmission[]): string {
  const rawType = String(app.type || "").toLowerCase()
  const rawCat = String(app.category || "").toLowerCase()
  const rawService = String((app as any).service || "").toLowerCase()
  const year = new Date().getFullYear()
  const stableSeq = getStableSequence(app.referenceNumber || app.id || "110000")
  const isPwdApp = isPWD(app)

  const isRenewalOrLoss =
    rawType.includes("renewal") ||
    rawType.includes("loss") ||
    rawType.includes("replacement") ||
    rawType === "renewal" ||
    rawType === "loss" ||
    rawType === "replacement"

  // 1. Movie Booklet
  if (
    rawType === "movie-booklet" ||
    rawType.includes("movie") ||
    rawCat.includes("movie") ||
    rawService.includes("movie")
  ) {
    const existingBooklet = (app as any).existingBookletNumber || (app as any).bookletNumber || (app as any).extra_data?.existingBookletNumber
    if (isRenewalOrLoss && existingBooklet && String(existingBooklet).trim()) {
      return String(existingBooklet).trim().replace(/^(PWD|SENIOR|OSCA)-/i, "")
    }
    return `137404-${year}-${stableSeq}`
  }

  // 2. Medicine Booklet
  if (
    rawType === "medicine-booklet" ||
    rawType.includes("medicine") ||
    rawCat.includes("medicine") ||
    rawService.includes("medicine") ||
    rawCat.includes("booklet") ||
    rawType.includes("booklet")
  ) {
    const existingBooklet = (app as any).existingBookletNumber || (app as any).bookletNumber || (app as any).extra_data?.existingBookletNumber
    if (isRenewalOrLoss && existingBooklet && String(existingBooklet).trim()) {
      return String(existingBooklet).trim().replace(/^(PWD|SENIOR|OSCA)-/i, "")
    }
    return `137404-${year}-${stableSeq}`
  }

  // Retain fixed existing ID for Renewal or Loss
  if (isRenewalOrLoss) {
    const existingId = findExistingIdForApplicant(app, allApps)
    if (existingId) {
      if (isPwdApp) {
        return existingId.toUpperCase().startsWith("PWD-") ? existingId.toUpperCase() : `PWD-${existingId.replace(/^(SENIOR|OSCA)-/i, "")}`
      } else {
        return existingId.toUpperCase().startsWith("SENIOR-") ? existingId.toUpperCase() : `SENIOR-${existingId.replace(/^(PWD|OSCA)-/i, "")}`
      }
    }
  }

  // 3. PWD ID
  if (isPwdApp) {
    if (app.assignedIdNumber) {
      const sanitized = app.assignedIdNumber.toUpperCase().replace(/^(SENIOR|OSCA)-/i, "PWD-")
      if (sanitized.startsWith("PWD-")) return sanitized
      return `PWD-${sanitized}`
    }
    return `PWD-137404-${year}-${stableSeq}`
  }

  // 4. Senior Citizen ID
  if (app.assignedIdNumber) {
    const sanitized = app.assignedIdNumber.toUpperCase().replace(/^(PWD|OSCA)-/i, "SENIOR-")
    if (sanitized.startsWith("SENIOR-")) return sanitized
    return `SENIOR-${sanitized}`
  }
  return `SENIOR-137404-${year}-${stableSeq}`
}




// =====================================================================================
// Design Tokens & GovServe Styles (Identical to Solo Parent & Child Welfare)
// =====================================================================================
const Tokens = React.memo(function Tokens() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

      .gw-root {
        --ink: #0f172a; --ink-soft: #6b7280; --ink-faint: #94a3b8;
        --paper: #f9fafb; --surface: #ffffff; --surface-sunk: #f1f3f5;
        --line: #e5e7eb; --line-soft: #eef0f2;
        --plum: #2563eb; --plum-ink: #1d4ed8; --plum-soft: #eaf1ff; --plum-line: #c7dbff;
        --brick: #0284c7; --brick-ink: #0369a1; --brick-soft: #e0f2fe; --brick-line: #bae6fd;
        --gold: #f59e0b; --gold-ink: #b45309; --gold-soft: #fef6e7; --gold-line: #fde7be;
        --forest: #22c55e; --forest-ink: #15803d; --forest-soft: #e9fbef; --forest-line: #bbf7d0;
        --redwood: #ef4444; --redwood-ink: #b91c1c; --redwood-soft: #fdeded; --redwood-line: #fcc9c9;
        --shadow-soft: 0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06);
        --shadow-medium: 0 4px 6px rgba(15,23,42,.05), 0 10px 15px rgba(15,23,42,.08);
        font-family: 'Inter', sans-serif; color: var(--ink); background: var(--paper);
        min-height: 100%;
      }

      .dark .gw-root,
      html.dark .gw-root,
      body.dark .gw-root {
        --ink: #f1f5f9; --ink-soft: #94a3b8; --ink-faint: #64748b;
        --paper: hsl(222, 47%, 8%); --surface: hsl(222, 40%, 12%); --surface-sunk: hsl(222, 35%, 16%);
        --line: hsl(222, 30%, 20%); --line-soft: hsl(222, 30%, 24%);
        --plum-soft: rgba(37, 99, 235, 0.25); --plum-line: rgba(37, 99, 235, 0.4);
        --brick-soft: rgba(2, 132, 199, 0.25); --brick-line: rgba(2, 132, 199, 0.4);
        --gold-soft: rgba(245, 158, 11, 0.25); --gold-line: rgba(245, 158, 11, 0.4);
        --forest-soft: rgba(34, 197, 94, 0.25); --forest-line: rgba(34, 197, 94, 0.4);
        --redwood-soft: rgba(239, 68, 68, 0.25); --redwood-line: rgba(239, 68, 68, 0.4);
        color: var(--ink); background: var(--paper);
      }
      .gw-serif { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; letter-spacing: -0.01em; }
      .gw-mono { font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }

      .gw-eyebrow { font-family: 'Inter', sans-serif; font-size: .68rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); }

      /* pennant tags */
      .gw-tag { display: inline-flex; align-items: center; gap: .4rem; padding: .34rem .85rem .34rem .65rem; font-size: .68rem; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; color: #fff; white-space: nowrap; clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%); }
      .gw-tag--pwd { background: var(--plum); }
      .gw-tag--senior { background: #0284c7; }
      .gw-tag--ghost { background: var(--surface-sunk); color: var(--ink-soft); border: 1px solid var(--line); clip-path: none; padding: .34rem .7rem; border-radius: 8px; }
      .gw-tag--btn { cursor: pointer; border: none; opacity: .5; transition: opacity .15s, transform .1s; }
      .gw-tag--btn:hover { opacity: .8; }
      .gw-tag--btn.is-active { opacity: 1; }

      /* stamp dots */
      .gw-dot { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
      .gw-dot--pending { background: var(--gold-soft); border: 2px dashed var(--gold); }
      .gw-dot--approved { background: var(--forest); }
      .gw-dot--rejected { background: var(--redwood); }
      .gw-dot--revision { background: var(--surface); border: 2px dashed var(--ink-faint); }

      .gw-status { display: inline-flex; align-items: center; gap: .5rem; font-size: .76rem; font-weight: 600; }
      .gw-status--pending { color: var(--gold-ink); }
      .gw-status--approved { color: var(--forest-ink); }
      .gw-status--rejected { color: var(--redwood-ink); }
      .gw-status--revision { color: var(--ink-soft); }

      .gw-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-soft); transition: box-shadow .15s ease, transform .15s ease; }
      .gw-card:hover { box-shadow: var(--shadow-medium); transform: translateY(-1px); }
      .gw-card--pwd { }
      .gw-card--senior { }

      .gw-avatar { display: flex; align-items: center; justify-content: center; border-radius: 12px; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; }
      .gw-avatar--pwd { background: linear-gradient(135deg, var(--plum), var(--plum-ink)); }
      .gw-avatar--senior { background: linear-gradient(135deg, #0284c7, #0369a1); }

      .gw-btn-primary { background: var(--plum); color: #fff; border: 1px solid var(--plum); border-radius: 12px; font-weight: 600; box-shadow: var(--shadow-soft); transition: background .15s, transform .15s; }
      .gw-btn-primary:hover { background: var(--plum-ink); transform: translateY(-1px); }
      .gw-btn-ghost { background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 12px; font-weight: 600; transition: background .15s, transform .15s; }
      .gw-btn-ghost:hover { background: var(--surface-sunk); transform: translateY(-1px); }
      .gw-btn-approve { background: var(--forest); color: #fff; border: 1px solid var(--forest); border-radius: 12px; font-weight: 600; box-shadow: var(--shadow-soft); transition: background .15s, transform .15s; }
      .gw-btn-approve:hover { background: var(--forest-ink); transform: translateY(-1px); }
      .gw-btn-reject { background: var(--redwood); color: #fff; border: 1px solid var(--redwood); border-radius: 12px; font-weight: 600; box-shadow: var(--shadow-soft); transition: background .15s, transform .15s; }
      .gw-btn-reject:hover { background: var(--redwood-ink); transform: translateY(-1px); }

      .gw-input { background: var(--surface-sunk); border: 1px solid var(--line); border-radius: 10px; color: var(--ink); }
      .gw-input:focus { outline: none; border-color: var(--plum); box-shadow: 0 0 0 3px var(--plum-soft); }
      .gw-input::placeholder { color: var(--ink-faint); }

      .gw-section-num { font-family: 'Inter', sans-serif; font-weight: 700; font-size: .68rem; color: var(--plum-ink); background: var(--plum-soft); padding: .2rem .5rem; border-radius: 6px; }
      .gw-section-rule { height: 1px; background: var(--line); flex: 1; }

      .gw-stat { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-soft); }
    `}</style>
  )
})

function displayName(app: ApplicationSubmission) {
  return [app.firstName, app.middleName, app.lastName, app.suffix]
    .filter(Boolean)
    .filter((s) => s !== "null" && s !== "undefined")
    .join(" ")
}

function initials(app: ApplicationSubmission) {
  const f = app.firstName ? app.firstName.charAt(0) : "P"
  const l = app.lastName ? app.lastName.charAt(0) : "S"
  return `${f}${l}`.toUpperCase()
}


function AvatarCircle({
  app,
  sizeClass = "h-11 w-11",
}: {
  app: ApplicationSubmission
  sizeClass?: string
}) {
  return (
    <div
      className={`${sizeClass} shrink-0 gw-avatar ${isPWD(app) ? "gw-avatar--pwd" : "gw-avatar--senior"
        } text-sm font-bold flex items-center justify-center`}
    >
      {initials(app)}
    </div>
  )
}

function subLabelForApp(app: ApplicationSubmission) {
  const type = String(app.type || "").toLowerCase()
  if (isPWD(app)) {
    switch (type) {
      case "new": return "New ID Application"
      case "renewal": return "ID Renewal"
      case "loss":
      case "replacement": return "Lost ID Replacement"
      case "assistance": return "PWD Social Assistance"
      default: return "PWD Application"
    }
  } else {
    switch (type) {
      case "new": return "New Senior ID"
      case "renewal": return "Senior ID Renewal"
      case "loss":
      case "replacement": return "Lost ID Replacement"
      case "medicine-booklet": return "Medicine Discount Booklet"
      case "movie-booklet": return "Free Movie Booklet"
      case "social-assistance":
      case "assistance": return "Senior Social Assistance"
      default: return "Senior Citizen Application"
    }
  }
}

const statusMeta = {
  pending: { dot: "gw-dot--pending", text: "gw-status--pending", label: "Pending" },
  approved: { dot: "gw-dot--approved", text: "gw-status--approved", label: "Approved" },
  rejected: { dot: "gw-dot--rejected", text: "gw-status--rejected", label: "Rejected" },
  needs_revision: { dot: "gw-dot--revision", text: "gw-status--revision", label: "Needs Revision" },
} as const

function StatusBadge({ status }: { status: ApplicationSubmission["status"] }) {
  const m = statusMeta[status] ?? statusMeta.pending
  return (
    <span className={`gw-status ${m.text}`}>
      <span className={`gw-dot ${m.dot}`} />
      {m.label}
    </span>
  )
}

function CategoryTag({ category }: { category: ApplicationSubmission["category"] }) {
  return <span className={`gw-tag ${category === "PWD" ? "gw-tag--pwd" : "gw-tag--senior"}`}>{category}</span>
}

function SectionHeading({ icon, number, children }: { icon: React.ReactNode; number: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="gw-section-num">{number}</span>
      <span style={{ color: "var(--ink-faint)" }}>{icon}</span>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>{children}</h3>
      <span className="gw-section-rule" />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{label}</p>
      <p className="font-medium mt-1 text-sm" style={{ color: "var(--ink)" }}>{value || "—"}</p>
    </div>
  )
}

function getDocImageUrl(doc: ApplicationDocument | null, app?: ApplicationSubmission | null): string {
  if (!doc) return ""

  // 0. Prefer direct base64 in doc
  const docBase64 = (doc as any).dataUrl || (doc as any).base64 || (doc as any).data
  if (docBase64 && typeof docBase64 === "string" && docBase64.startsWith("data:")) {
    return docBase64
  }

  // 1. Direct match from app.documents if provided
  if (app && Array.isArray(app.documents)) {
    const matched = app.documents.find((d: any) =>
      (d?.name && doc.name && d.name.toLowerCase() === doc.name.toLowerCase()) ||
      (d?.filename && doc.filename && d.filename.toLowerCase() === doc.filename.toLowerCase())
    )
    if (matched) {
      const matchBase64 = (matched as any).dataUrl || (matched as any).base64 || (matched as any).data
      if (matchBase64 && typeof matchBase64 === "string" && matchBase64.startsWith("data:")) {
        return matchBase64
      }
      const matchCandidate = matched.fileUrl || (matched as any).previewUrl
      if (matchCandidate && typeof matchCandidate === "string" && (matchCandidate.startsWith("data:") || matchCandidate.startsWith("http://") || matchCandidate.startsWith("https://"))) {
        return matchCandidate
      }
    }
  }
  
  // 2. Direct candidate
  const candidate =
    (doc as any).dataUrl ||
    (doc as any).base64 ||
    doc.fileUrl ||
    (doc as any).previewUrl ||
    (doc as any).url ||
    (doc as any).filePath ||
    (doc as any).path ||
    (doc as any).src

  if (candidate && typeof candidate === "string" && !candidate.toLowerCase().includes("sample")) {
    if (candidate.startsWith("data:") || candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return candidate
    }
    if (candidate.startsWith("blob:")) {
      const alt = (doc as any).dataUrl || (doc as any).base64 || (doc as any).previewUrl
      if (alt && typeof alt === "string" && (alt.startsWith("data:") || alt.startsWith("http"))) {
        return alt
      }
      return candidate
    }
    if (candidate.startsWith("/")) {
      return `${API_BASE}${candidate}`
    }
    if (candidate.startsWith("uploads/")) {
      return `${API_BASE}/${candidate}`
    }
    return `${API_BASE}/uploads/${candidate}`
  }

  // 2. Check filename if available
  const fn = doc.filename || doc.name
  if (fn && typeof fn === "string" && !fn.toLowerCase().includes("sample")) {
    if (fn.startsWith("data:") || fn.startsWith("http://") || fn.startsWith("https://")) return fn
    if (fn.startsWith("/")) return `${API_BASE}${fn}`
    if (fn.startsWith("uploads/")) return `${API_BASE}/${fn}`
    return `${API_BASE}/uploads/pwd-senior/${fn}`
  }

  // 3. Fallback to localStorage check
  try {
    const localKeys = ["pwd_senior_applications", "all_user_applications", "applications", "userProfile", "currentUser"]
    for (const k of localKeys) {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item) continue
            if (app && item.referenceNumber && app.referenceNumber && item.referenceNumber !== app.referenceNumber && item.id !== app.id) {
              continue
            }
            if (Array.isArray(item.documents)) {
              const matchedDoc = item.documents.find((d: any) =>
                (d.name && doc.name && d.name.toLowerCase() === doc.name.toLowerCase()) ||
                (d.filename && doc.filename && d.filename.toLowerCase() === doc.filename.toLowerCase())
              )
              if (matchedDoc) {
                const rawUrl = matchedDoc.dataUrl || matchedDoc.fileUrl || matchedDoc.previewUrl || matchedDoc.base64
                if (rawUrl && typeof rawUrl === "string" && (rawUrl.startsWith("data:") || rawUrl.startsWith("http"))) {
                  return rawUrl
                }
              }
            }
          }
        }
      } catch {}
    }
  } catch {}

  return ""
}

function isWebImageFormat(src: string): boolean {
  if (!src || typeof src !== "string") return false
  if (src.startsWith("data:image/") || src.startsWith("blob:")) return true
  const clean = src.split("?")[0].toLowerCase()
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".svg") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".bmp")
  )
}

export function getApplicantPhotoUrl(app: ApplicationSubmission | null | any): string {
  if (!app) return ""

  let fallbackBlob = ""

  // 1. Direct properties on the application (check all possible variants)
  const direct =
    app.applicantPhoto ||
    app.applicant_photo ||
    app.photoUrl ||
    app.photo_url ||
    app.profilePhotoUrl ||
    app.profile_photo_url ||
    app.idPhotoUrl ||
    app.id_photo_url ||
    app.avatarUrl ||
    app.avatar_url ||
    app.photo ||
    app.avatar ||
    app.idPhoto ||
    app.id_photo ||
    app.image ||
    app.imageUrl ||
    app.image_url ||
    (app as any).formData?.applicantPhoto ||
    (app as any).formData?.photoUrl ||
    (app as any).formData?.idPhoto ||
    (app as any).formData?.id_photo ||
    (app as any).form_data?.applicantPhoto ||
    (app as any).form_data?.photoUrl ||
    (app as any).form_data?.idPhoto ||
    (app as any).form_data?.id_photo ||
    (app as any).extra_data?.applicantPhoto ||
    (app as any).extra_data?.photoUrl ||
    (app as any).extra_data?.idPhoto ||
    (app as any).extra_data?.formData?.photoUrl ||
    (app as any).extra_data?.formData?.idPhoto ||
    (app as any).extraData?.photoUrl ||
    (app as any).extraData?.idPhoto
  if (direct && typeof direct === "string" && !direct.toLowerCase().includes("sample") && isWebImageFormat(direct)) {
    if (direct.startsWith("data:") || direct.startsWith("http://") || direct.startsWith("https://")) {
      return direct
    }
    if (direct.startsWith("blob:")) {
      fallbackBlob = direct
    } else if (direct.startsWith("/")) {
      return `${API_BASE}${direct}`
    } else if (direct.startsWith("uploads/")) {
      return `${API_BASE}/${direct}`
    } else {
      return `${API_BASE}/uploads/${direct}`
    }
  }

  const resolveDocSrc = (d: any): string => {
    if (!d) return ""
    if (typeof d === "string" && isWebImageFormat(d)) {
      if (d.startsWith("data:") || d.startsWith("http://") || d.startsWith("https://")) return d
      if (d.startsWith("blob:")) return d
      if (d.startsWith("/")) return `${API_BASE}${d}`
      if (d.startsWith("uploads/")) return `${API_BASE}/${d}`
      return `${API_BASE}/uploads/${d}`
    }
    const primaryData = d.dataUrl || d.base64 || d.data_url
    if (primaryData && typeof primaryData === "string" && primaryData.startsWith("data:")) return primaryData

    const rawUrl = d.previewUrl || d.fileUrl || d.url || d.path || d.filePath || d.src || d.file_path
    if (rawUrl && typeof rawUrl === "string" && isWebImageFormat(rawUrl)) {
      if (rawUrl.startsWith("data:") || rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl
      if (rawUrl.startsWith("blob:")) return rawUrl
      if (rawUrl.startsWith("/")) return `${API_BASE}${rawUrl}`
      if (rawUrl.startsWith("uploads/")) return `${API_BASE}/${rawUrl}`
      return `${API_BASE}/uploads/${rawUrl}`
    }
    if (d.filename && typeof d.filename === "string" && isWebImageFormat(d.filename) && !d.filename.toLowerCase().startsWith("sample") && !d.filename.toLowerCase().includes("samples/")) {
      return `${API_BASE}/uploads/${d.filename}`
    }
    return ""
  }

  // 2. Parse documents list
  let docsList: any[] = []
  if (Array.isArray(app.documents)) {
    docsList = app.documents
  } else if (typeof app.documents === "string") {
    try { docsList = JSON.parse(app.documents) } catch { docsList = [] }
  } else if (Array.isArray(app.extra_data?.documents)) {
    docsList = app.extra_data.documents
  } else if (Array.isArray(app.uploaded_documents)) {
    docsList = app.uploaded_documents
  } else if (Array.isArray((app as any).form_data?.uploaded_documents)) {
    docsList = (app as any).form_data.uploaded_documents
  } else if (Array.isArray((app as any).formData?.uploaded_documents)) {
    docsList = (app as any).formData.uploaded_documents
  }

  // Flatten nested structures (e.g. { files: [...] })
  const flatDocs: any[] = []
  for (const item of docsList) {
    if (!item) continue
    if (Array.isArray(item.files)) {
      for (const f of item.files) {
        flatDocs.push({
          ...f,
          name: f.name || item.name || item.documentLabel || item.documentId || "",
          filename: f.filename || item.filename || "",
        })
      }
    } else {
      flatDocs.push(item)
    }
  }

  // 3. Find explicit photo/picture doc
  const photoDoc = flatDocs.find((d) => {
    const n = String(d.name || d.documentId || d.label || d.id || d.documentType || d.type || "").toLowerCase()
    const fn = String(d.filename || "").toLowerCase()
    return (
      n.includes("photo") ||
      n.includes("picture") ||
      n.includes("2x2") ||
      n.includes("1x1") ||
      n.includes("idphoto") ||
      n.includes("avatar") ||
      n.includes("selfie") ||
      fn.includes("photo") ||
      fn.includes("picture") ||
      fn.includes("2x2") ||
      fn.includes("1x1")
    )
  })

  if (photoDoc) {
    const src = resolveDocSrc(photoDoc)
    if (src && !src.startsWith("blob:")) return src
    if (src.startsWith("blob:")) fallbackBlob = fallbackBlob || src
  }

  // 4. Any image document from flatDocs
  const anyImageDoc = flatDocs.find((d) => {
    const src = resolveDocSrc(d)
    const fn = String(d.filename || d.name || "").toLowerCase()
    return (
      src.startsWith("data:image") ||
      /\.(jpe?g|png|webp|avif|gif)$/i.test(fn) ||
      /\.(jpe?g|png|webp|avif|gif)$/i.test(src)
    )
  })
  if (anyImageDoc) {
    const src = resolveDocSrc(anyImageDoc)
    if (src && !src.startsWith("blob:")) return src
    if (src.startsWith("blob:")) fallbackBlob = fallbackBlob || src
  }

  // 5. Look across localStorage
  try {
    const localKeys = [
      "solo_parent_applications",
      "pwd_senior_applications",
      "child_welfare_applications",
      "applications",
      "all_user_applications",
      "active_applications",
      "currentUser",
      "userProfile",
      "user",
    ]
    for (const key of localKeys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const match = parsed.find((a: any) => {
            if (!a) return false
            const aRef = String(a.referenceNumber || a.reference_number || a.id || a.qcid || "").trim().toLowerCase()
            const appRef = String(app.referenceNumber || app.id || (app as any).qcid || (app as any).reference_number || "").trim().toLowerCase()
            const aEmail = String(a.email || "").trim().toLowerCase()
            const appEmail = String(app.email || "").trim().toLowerCase()
            const aName = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase()
            const appName = `${app.firstName || ""} ${app.lastName || ""}`.trim().toLowerCase()
            return (
              (appRef && aRef && (aRef === appRef || aRef.includes(appRef) || appRef.includes(aRef))) ||
              (appEmail && aEmail && aEmail === appEmail) ||
              (appName && aName && appName === aName)
            )
          })
          if (match && match !== app) {
            const mPhoto = getApplicantPhotoUrl(match)
            if (mPhoto && !mPhoto.includes("sample") && !mPhoto.startsWith("blob:")) return mPhoto
          }
        } else if (parsed && typeof parsed === "object") {
          const pRef = String(parsed.qcidNumber || parsed.qcid_number || parsed.qcidNo || parsed.qcid || parsed.reference_number || "").trim().toLowerCase()
          const appRef = String(app.referenceNumber || app.id || (app as any).qcid || (app as any).reference_number || "").trim().toLowerCase()
          const pEmail = String(parsed.email || "").trim().toLowerCase()
          const appEmail = String(app.email || "").trim().toLowerCase()
          if ((appRef && pRef && (pRef === appRef || appRef.includes(pRef))) || (appEmail && pEmail && pEmail === appEmail)) {
            const userPhoto = parsed.photoUrl || parsed.profilePhotoUrl || parsed.avatar || parsed.photo || parsed.idPhoto || parsed.applicantPhoto
            if (userPhoto && typeof userPhoto === "string" && !userPhoto.includes("sample")) {
              if (userPhoto.startsWith("data:") || userPhoto.startsWith("http://") || userPhoto.startsWith("https://")) return userPhoto
              if (userPhoto.startsWith("/")) return `${API_BASE}${userPhoto}`
              return `${API_BASE}/uploads/${userPhoto}`
            }
          }
        }
      } catch { }
    }
  } catch { }

  return fallbackBlob || ""
}

export function ApplicantPhotoDisplay({
  photoUrl,
  tag,
  isPwd,
}: {
  photoUrl?: string
  tag: string
  isPwd?: boolean
}) {
  const [imgSrc, setImgSrc] = useState<string>(photoUrl || "")
  const [retryStep, setRetryStep] = useState<number>(0)
  const [hasFailed, setHasFailed] = useState(!photoUrl || photoUrl.includes("sample"))

  useEffect(() => {
    if (photoUrl && !photoUrl.includes("sample")) {
      setImgSrc(photoUrl)
      setRetryStep(0)
      setHasFailed(false)
    } else {
      try {
        const storedProfile = JSON.parse(localStorage.getItem("userProfile") || "null")
        const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null")
        const backupPhoto = storedProfile?.profilePhotoUrl || storedProfile?.photoUrl || storedProfile?.avatar || storedUser?.profilePhotoUrl || storedUser?.photoUrl || storedUser?.avatar
        if (backupPhoto && typeof backupPhoto === "string" && backupPhoto.startsWith("data:")) {
          setImgSrc(backupPhoto)
          setHasFailed(false)
          return
        }
      } catch { }
      setImgSrc("")
      setHasFailed(true)
    }
  }, [photoUrl])

  const handleImageError = () => {
    if (!photoUrl || photoUrl.includes("sample") || photoUrl.startsWith("blob:")) {
      try {
        const storedProfile = JSON.parse(localStorage.getItem("userProfile") || "null")
        const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null")
        const backupPhoto = storedProfile?.profilePhotoUrl || storedProfile?.photoUrl || storedProfile?.avatar || storedUser?.profilePhotoUrl || storedUser?.photoUrl || storedUser?.avatar
        if (backupPhoto && typeof backupPhoto === "string" && backupPhoto.startsWith("data:") && imgSrc !== backupPhoto) {
          setImgSrc(backupPhoto)
          setHasFailed(false)
          return
        }
      } catch { }
      setHasFailed(true)
      return
    }

    const filename = photoUrl.split("/").pop() || ""
    if (retryStep === 0 && filename && !photoUrl.includes("/solo-parent/")) {
      setRetryStep(1)
      setImgSrc(`${API_BASE}/uploads/solo-parent/${filename}`)
    } else if (retryStep <= 1 && filename && !photoUrl.includes("/child-welfare/")) {
      setRetryStep(2)
      setImgSrc(`${API_BASE}/uploads/child-welfare/${filename}`)
    } else if (retryStep <= 2 && filename && !photoUrl.includes("/aics/")) {
      setRetryStep(3)
      setImgSrc(`${API_BASE}/uploads/aics/${filename}`)
    } else {
      setHasFailed(true)
    }
  }

  return (
    <div className="w-22 h-26 shrink-0 rounded-lg border-2 border-slate-300 bg-white overflow-hidden shadow-xs flex flex-col items-center justify-center relative z-10">
      {!hasFailed && imgSrc ? (
        <img
          src={imgSrc}
          alt="Applicant 2x2 Photo"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center h-full bg-slate-100 w-full">
          <User className="w-8 h-8 text-slate-400 mb-1" />
          <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-500">2x2 Photo</span>
        </div>
      )}
      <div
        className={`absolute bottom-0 inset-x-0 text-white text-[6.5px] text-center py-0.5 font-bold uppercase ${isPwd ? "bg-amber-600" : tag.includes("SOLO") || tag.includes("SSDD") ? "bg-red-900" : "bg-blue-900"
          }`}
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        {tag}
      </div>
    </div>
  )
}

function DocumentViewerModal({
  doc,
  app,
  onClose,
}: {
  doc: ApplicationDocument | null
  app?: ApplicationSubmission | null
  onClose: () => void
}) {
  if (!doc) return null
  const [src, setSrc] = useState<string>(() => getDocImageUrl(doc, app))
  const [retryStep, setRetryStep] = useState(0)

  useEffect(() => {
    setSrc(getDocImageUrl(doc, app))
    setRetryStep(0)
  }, [doc, app])

  const isImage = /\.(jpe?g|png|webp|avif|gif)$/i.test(doc.filename || doc.name || src) || (src && src.startsWith("data:image"))

  const handleImageError = () => {
    // 1. Direct base64 fallback from doc object
    const directData = (doc as any).dataUrl || (doc as any).base64 || (doc as any).data
    if (directData && typeof directData === "string" && directData.startsWith("data:") && src !== directData) {
      setSrc(directData)
      return
    }

    // 2. Direct base64 fallback from app.documents or extra_data
    if (app && Array.isArray(app.documents)) {
      const match = app.documents.find((d: any) =>
        (d?.name && doc.name && d.name.toLowerCase() === doc.name.toLowerCase()) ||
        (d?.filename && doc.filename && d.filename.toLowerCase() === doc.filename.toLowerCase())
      )
      const dataBackup = (match as any)?.dataUrl || (match as any)?.base64 || (match as any)?.data || (match as any)?.previewUrl
      if (dataBackup && typeof dataBackup === "string" && dataBackup.startsWith("data:") && src !== dataBackup) {
        setSrc(dataBackup)
        return
      }
    }

    const rawFilename = (doc.filename || doc.name || src.split("/").pop() || "").split("/").pop() || ""
    if (retryStep === 0 && rawFilename && !src.includes("/uploads/pwd-senior/")) {
      setRetryStep(1)
      setSrc(`${API_BASE}/uploads/pwd-senior/${rawFilename}`)
    } else if (retryStep <= 1 && rawFilename && !src.includes("/uploads/solo-parent/")) {
      setRetryStep(2)
      setSrc(`${API_BASE}/uploads/solo-parent/${rawFilename}`)
    } else if (retryStep <= 2 && rawFilename && !src.includes("/uploads/")) {
      setRetryStep(3)
      setSrc(`${API_BASE}/uploads/${rawFilename}`)
    } else {
      // 3. Fallback across all local storage collections
      try {
        const localKeys = ["pwd_senior_applications", "all_user_applications", "user_applications", "applications", "userProfile"]
        for (const k of localKeys) {
          const raw = localStorage.getItem(k)
          if (!raw) continue
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (Array.isArray(item?.documents)) {
                const matched = item.documents.find((d: any) =>
                  (d?.name && doc?.name && d.name.toLowerCase() === doc.name.toLowerCase()) ||
                  (d?.filename && doc?.filename && d.filename.toLowerCase() === doc.filename.toLowerCase())
                )
                const backup = matched?.dataUrl || matched?.base64 || matched?.previewUrl || matched?.fileUrl
                if (backup && typeof backup === "string" && (backup.startsWith("data:") || (backup.startsWith("http") && backup !== src))) {
                  setSrc(backup)
                  return
                }
              }
            }
          }
        }
      } catch {}
      setSrc("")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{doc.name}</h3>
            {doc.filename && <p className="text-xs text-gray-400">{doc.filename}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto py-4 flex items-center justify-center min-h-[300px] bg-gray-50 rounded-xl my-4">
          {src ? (
            isImage ? (
              <img
                src={src}
                alt={doc.name}
                crossOrigin="anonymous"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                onError={handleImageError}
              />
            ) : (
              <div className="text-center p-8">
                <FileText className="w-16 h-16 text-blue-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">{doc.filename || doc.name}</p>
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open in New Tab
                </a>
              </div>
            )
          ) : (
            <div className="text-center p-8 text-gray-400 flex flex-col items-center">
              <Paperclip className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">Walang na-upload na litrato</p>
              <p className="text-xs text-gray-400 mt-1">Walang file na na-attach para sa dokumentong ito.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}

function OfficialIdCardFront({
  app,
  isPwdApp,
  photoUrl,
  idNumber,
  appDate,
  expiryDateStr,
  cardRef,
}: {
  app: ApplicationSubmission
  isPwdApp: boolean
  photoUrl: string
  idNumber: string
  appDate: string
  expiryDateStr: string
  cardRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={cardRef}
      className="w-[500px] h-[315px] rounded-2xl overflow-hidden shadow-xl border border-slate-300 relative bg-white select-none flex flex-col justify-between"
      style={{
        background: isPwdApp
          ? "linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #eff6ff 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Header */}
      <div
        className={`px-3.5 py-2.5 flex items-center justify-between shadow-xs ${isPwdApp
            ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950"
            : "bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white"
          }`}
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className="flex items-center gap-2">
          <img src="/gov-serves-seal.png" alt="QC Seal" crossOrigin="anonymous" className="w-7 h-7 object-contain drop-shadow-xs rounded-full bg-white/20 p-0.5" />
          <div>
            <p className={`text-[7.5px] font-bold tracking-widest uppercase leading-tight ${isPwdApp ? "text-slate-800" : "text-blue-100 opacity-90"}`}>
              Republic of the Philippines
            </p>
            <p className={`text-xs font-black tracking-wide leading-tight uppercase ${isPwdApp ? "text-slate-950" : "text-white"}`}>
              GOV SERVICES
            </p>
          </div>
        </div>
        <span
          className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${isPwdApp
              ? "bg-slate-950 text-amber-300 border-slate-800 shadow-xs"
              : "bg-white/20 text-white border-white/30"
            }`}
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          {isPwdApp ? "PDAO CARD" : "OSCA CARD"}
        </span>
      </div>

      {/* Sub-header */}
      <div
        className={`py-1 text-center text-[9.5px] font-black uppercase tracking-widest ${isPwdApp
            ? "bg-slate-950 text-amber-300 border-b border-amber-500/40"
            : "bg-amber-400 text-slate-950"
          }`}
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        {isPwdApp ? "Persons with Disability Affairs Office" : "Office for Senior Citizens Affairs"}
      </div>

      {/* Details with QC Logo on right side */}
      <div className="p-3 flex gap-2.5 items-start relative">
        {/* 2x2 Photo with error fallback */}
        <ApplicantPhotoDisplay
          photoUrl={photoUrl}
          tag={`QC ${isPwdApp ? "PDAO" : "OSCA"}`}
          isPwd={isPwdApp}
        />

        {/* Details text */}
        <div className="flex-1 min-w-0 space-y-1 relative z-10">
          <div>
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">QC ID Number</span>
            <p className={`text-sm font-black font-mono tracking-wide leading-none ${isPwdApp ? "text-amber-700" : "text-blue-900"}`}>
              {idNumber}
            </p>
          </div>

          <div className="pt-0.5">
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">Cardholder Full Name</span>
            <p className="text-xs font-black text-slate-900 leading-tight uppercase truncate">{displayName(app)}</p>
          </div>

          {isPwdApp ? (
            <div className="pt-0.5">
              <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">Type of Disability</span>
              <p className="text-[9.5px] font-bold text-red-700 leading-tight truncate">{app.disabilityType || "Visual Disability"}</p>
            </div>
          ) : (
            <div className="pt-0.5">
              <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">Classification</span>
              <p className="text-[9.5px] font-bold text-emerald-800 leading-tight truncate">Senior Citizen Welfare Beneficiary</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 pt-0.5 text-[8.5px] text-slate-700">
            <div>
              <span className="text-[7px] font-semibold text-slate-400 uppercase">Birthdate:</span> {app.dateOfBirth || "—"}
            </div>
            <div>
              <span className="text-[7px] font-semibold text-slate-400 uppercase">Sex / Blood:</span> {app.sex || "Male"} / O+
            </div>
          </div>

          <div className="text-[8.5px] text-slate-700 truncate pt-0.5">
            <span className="text-[7px] font-semibold text-slate-400 uppercase">Address:</span> {app.address || "Quezon City"}
          </div>
        </div>

        {/* QC Official Logo on the right side */}
        <div className="shrink-0 flex flex-col items-center justify-center pl-1 z-10 self-center">
          <img
            src="/gov-serves-seal.png"
            alt="QC Official Seal"
            crossOrigin="anonymous"
            className="w-14 h-14 object-contain drop-shadow-md hover:scale-105 transition-transform"
          />
          <span className="text-[6px] font-black uppercase text-slate-600 tracking-tighter mt-0.5">QC SEAL</span>
        </div>
      </div>

      {/* Bottom Signatures & Barcode */}
      <div
        className="px-3 py-1.5 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between text-[7.5px]"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div>
          <p className="font-mono font-bold text-slate-700 tracking-widest text-[8.5px]">|||| | || |||| | | ||| ||||</p>
          <div className="flex items-center gap-1.5 text-[6.5px] uppercase tracking-wider font-semibold">
            <span className="text-slate-400">Issued: {appDate}</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-800 font-bold">Expires: {expiryDateStr}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="w-18 border-b border-slate-400 mx-auto mb-0.5" />
          <p className="font-bold text-slate-800 text-[7.5px] leading-tight uppercase">MA. JOSEFINA G. BELMONTE</p>
          <p className="text-[6.5px] text-slate-500 uppercase leading-none">City Mayor</p>
        </div>
      </div>
    </div>
  )
}

function OfficialIdCardBack({
  isPwdApp,
  appDate,
  expiryDateStr,
  emergencyPerson,
  emergencyPhone,
  emergencyRel,
  emergencyAddr,
  cardRef,
}: {
  isPwdApp: boolean
  appDate: string
  expiryDateStr: string
  emergencyPerson: string
  emergencyPhone: string
  emergencyRel: string
  emergencyAddr: string
  cardRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={cardRef}
      className="w-[500px] h-[315px] rounded-2xl overflow-hidden shadow-xl border border-slate-300 relative bg-white select-none flex flex-col justify-between text-slate-900"
      style={{
        background: isPwdApp
          ? "linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fefce8 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Background Watermark Seal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0">
        <img src="/gov-serves-seal.png" alt="" crossOrigin="anonymous" className="w-48 h-48 object-contain" />
      </div>

      {/* Back Header Strip */}
      <div
        className={`px-3.5 py-1.5 flex items-center justify-between shadow-xs relative z-10 ${isPwdApp
            ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950"
            : "bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white"
          }`}
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className="flex items-center gap-1.5">
          <img src="/gov-serves-seal.png" alt="QC Seal" crossOrigin="anonymous" className="w-4 h-4 object-contain rounded-full bg-white/20 p-0.5" />
          <p className="text-[8.5px] font-black uppercase tracking-wide leading-tight">
            {isPwdApp
              ? "Republic Act 7277 / RA 9442 — Magna Carta for PWDs"
              : "Republic Act 9994 — Expanded Senior Citizens Act"}
          </p>
        </div>
        <span
          className={`text-[7.5px] font-black px-2 py-0.5 rounded-full border shadow-xs ${isPwdApp
              ? "bg-slate-950 text-amber-300 border-slate-800"
              : "bg-amber-400 text-slate-950 border-amber-500"
            }`}
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          {isPwdApp ? "QC-PDAO" : "QC-OSCA"}
        </span>
      </div>

      <div className="p-3 pt-2 space-y-2 relative z-10 flex-1 flex flex-col justify-between">
        {/* Benefits / Rights List */}
        <div
          className={`rounded-lg p-2 space-y-1 text-[7.5px] text-slate-800 leading-tight border ${isPwdApp ? "bg-amber-50/80 border-amber-200/80" : "bg-blue-50/80 border-blue-200/80"
            }`}
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <p className="flex items-start gap-1">
            <span className={`font-bold shrink-0 ${isPwdApp ? "text-amber-700" : "text-blue-700"}`}>✓</span>
            <span><strong>20% Discount &amp; VAT Exemption</strong> on medicines, medical supplies, and dental services.</span>
          </p>
          <p className="flex items-start gap-1">
            <span className={`font-bold shrink-0 ${isPwdApp ? "text-amber-700" : "text-blue-700"}`}>✓</span>
            <span><strong>20% Discount</strong> on public domestic transportation (air, sea, land, MRT/LRT), hotels, and restaurants.</span>
          </p>
          <p className="flex items-start gap-1">
            <span className={`font-bold shrink-0 ${isPwdApp ? "text-amber-700" : "text-blue-700"}`}>✓</span>
            <span>Valid from <strong className="text-slate-900">{appDate}</strong> to <strong className="text-slate-900">{expiryDateStr}</strong> across all cities in the Philippines.</span>
          </p>
        </div>

        {/* Emergency Contact */}
        <div
          className={`border-t pt-1.5 ${isPwdApp ? "border-amber-200/70" : "border-blue-200/70"}`}
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <p className="text-[7.5px] font-black text-slate-800 uppercase tracking-wider mb-1">In case of emergency, please notify:</p>
          <div
            className={`grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7px] text-slate-700 bg-white/90 p-1.5 rounded-lg border shadow-xs ${isPwdApp ? "border-amber-200/60" : "border-blue-200/60"
              }`}
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          >
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Contact Person: </span>
              <span className="font-bold text-slate-900 truncate">{emergencyPerson}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Phone: </span>
              <span className={`font-mono font-bold ${isPwdApp ? "text-amber-700" : "text-blue-700"}`}>{emergencyPhone}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Relation: </span>
              <span className="font-semibold text-slate-800 truncate">{emergencyRel}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Address: </span>
              <span className="font-semibold text-slate-800 truncate">{emergencyAddr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OfficialIdCardModal({
  app,
  onClose,
}: {
  app: ApplicationSubmission | null
  onClose: () => void
  allSubmissions?: ApplicationSubmission[]
}) {
  if (!app) return null
  const isPwdApp = isPWD(app)
  const yr = new Date(app.submittedAt || Date.now()).getFullYear()
  const rawNum = String(app.referenceNumber || app.id || "000000").replace(/\D/g, "") || "100001"
  const suffix = rawNum.slice(-6).padStart(6, "0")
  const idNumber =
    (app as any).assignedIdNumber ||
    (app as any).idNumber ||
    (app as any).applicationNo ||
    (isPwdApp ? `PWD-137404-${yr}-${suffix}` : `SENIOR-137404-${yr}-${suffix}`)
  const issueDateObj = new Date((app as any).dateApproved || app.submittedAt || Date.now())
  const validIssueDate = isNaN(issueDateObj.getTime()) ? new Date() : issueDateObj
  const appDate = validIssueDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const expiryDateObj = new Date(validIssueDate)
  expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1)
  const expiryDateStr = expiryDateObj.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const [activeSide, setActiveSide] = useState<"front" | "back">("front")
  const [isDownloading, setIsDownloading] = useState(false)

  const frontDownloadRef = useRef<HTMLDivElement>(null)
  const backDownloadRef = useRef<HTMLDivElement>(null)

  const handleDownloadSide = async (mode: "front" | "back") => {
    setIsDownloading(true)
    try {
      const targetElement = mode === "front" ? frontDownloadRef.current : backDownloadRef.current
      if (targetElement) {
        const dataUrl = await toPng(targetElement, {
          pixelRatio: 3,
          cacheBust: true,
          quality: 1,
          width: 500,
          height: 315,
        })
        const link = document.createElement("a")
        link.download = `QC_${isPwdApp ? "PDAO" : "OSCA"}_${mode.toUpperCase()}_${idNumber}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error("Failed to export PNG:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  const contactNumber =
    (app as any).phone ||
    app.contactNo ||
    (app as any).contact_number ||
    (app as any).mobileNo ||
    (app as any).mobile_number ||
    (app as any).formData?.contactNo ||
    (app as any).formData?.mobileNo ||
    (app as any).extra_data?.contactNo ||
    (app as any).extra_data?.mobileNo ||
    ""

  let localEmergencyName = ""
  let localEmergencyPhone = ""
  let localEmergencyRel = ""
  let localEmergencyAddr = ""

  try {
    const rawUsers = localStorage.getItem("users")
    const allUsers = rawUsers ? JSON.parse(rawUsers) : []
    const rawActive = localStorage.getItem("active_applications")
    const activeApps = rawActive ? JSON.parse(rawActive) : []
    const combined = [...allUsers, ...activeApps]

    for (const u of combined) {
      if (!u) continue
      const uEmail = u.email || u.username
      if (
        (uEmail && app.email && uEmail.toLowerCase() === app.email.toLowerCase()) ||
        (u.lastName && app.lastName && u.lastName.toLowerCase() === app.lastName.toLowerCase())
      ) {
        localEmergencyName = [u.emergencyFirstName, u.emergencyLastName].filter(Boolean).join(" ") || u.emergencyName || ""
        localEmergencyPhone = u.emergencyContactNo || u.emergencyPhone || ""
        localEmergencyRel = u.emergencyRelationship || ""
        localEmergencyAddr = u.emergencyAddress || ""
      }
    }
  } catch { }

  const emergencyPerson =
    [(app as any).emergencyFirstName, (app as any).emergencyLastName].filter(Boolean).join(" ") ||
    (app as any).emergencyContactPerson ||
    (app as any).emergencyName ||
    (app as any).emergencyPerson ||
    (app as any).guardianName ||
    (app as any).familyMemberName ||
    localEmergencyName ||
    "—"

  const emergencyPhone =
    (app as any).emergencyContactNo ||
    (app as any).emergencyPhone ||
    (app as any).guardianContact ||
    localEmergencyPhone ||
    contactNumber ||
    "—"

  const emergencyRel =
    (app as any).emergencyRelationship ||
    (app as any).relationshipToApplicant ||
    (app as any).familyRelationship ||
    localEmergencyRel ||
    (isPwdApp ? "Guardian" : "Immediate Family")

  const emergencyAddr =
    (app as any).emergencyResidentialAddress ||
    (app as any).emergencyAddress ||
    (app as any).guardianAddress ||
    localEmergencyAddr ||
    app.address ||
    "Quezon City"

  const photoUrl = getApplicantPhotoUrl(app)

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-none">
                Official Quezon City {isPwdApp ? "Persons with Disability (PWD) ID Card" : "Senior Citizen OSCA ID Card"}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Card ID: <span className="font-mono font-bold text-blue-700">{idNumber}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl font-light leading-none p-1 cursor-pointer">×</button>
        </div>

        {/* Side Selector */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveSide("front")}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeSide === "front" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
          >
            FRONT OF ID CARD
          </button>
          <button
            onClick={() => setActiveSide("back")}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeSide === "back" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
          >
            BACK OF ID CARD (PRIVILEGES &amp; EMERGENCY)
          </button>
        </div>

        {/* Card Body Live View */}
        <div className="p-6 bg-slate-100/80 flex flex-col items-center justify-center overflow-x-auto min-h-[380px]">
          {activeSide === "front" ? (
            <OfficialIdCardFront
              app={app}
              isPwdApp={isPwdApp}
              photoUrl={photoUrl}
              idNumber={idNumber}
              appDate={appDate}
              expiryDateStr={expiryDateStr}
            />
          ) : (
            <OfficialIdCardBack
              isPwdApp={isPwdApp}
              appDate={appDate}
              expiryDateStr={expiryDateStr}
              emergencyPerson={emergencyPerson}
              emergencyPhone={emergencyPhone}
              emergencyRel={emergencyRel}
              emergencyAddr={emergencyAddr}
            />
          )}
        </div>

        {/* ── OFF-SCREEN CAPTURE CONTAINERS (Isolated with 0 offset and exact dimensions) ── */}
        <div
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "500px",
            height: "315px",
            pointerEvents: "none",
            zIndex: -999,
          }}
          aria-hidden="true"
        >
          <OfficialIdCardFront
            cardRef={frontDownloadRef}
            app={app}
            isPwdApp={isPwdApp}
            photoUrl={photoUrl}
            idNumber={idNumber}
            appDate={appDate}
            expiryDateStr={expiryDateStr}
          />
        </div>
        <div
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "500px",
            height: "315px",
            pointerEvents: "none",
            zIndex: -999,
          }}
          aria-hidden="true"
        >
          <OfficialIdCardBack
            cardRef={backDownloadRef}
            isPwdApp={isPwdApp}
            appDate={appDate}
            expiryDateStr={expiryDateStr}
            emergencyPerson={emergencyPerson}
            emergencyPhone={emergencyPhone}
            emergencyRel={emergencyRel}
            emergencyAddr={emergencyAddr}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownloadSide("front")}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Front (PNG)</span>
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownloadSide("back")}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Back (PNG)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================================
// Application Card (List Row)
// =====================================================================================
interface ApplicationCardProps {
  app: ApplicationSubmission
  onView: (app: ApplicationSubmission) => void
  onShowCard?: (app: ApplicationSubmission) => void
}

function ApplicationCard({ app, onView, onShowCard }: ApplicationCardProps) {
  const subLabel = subLabelForApp(app)
  const isSeniorBooklet = !isPWD(app) && (
    String(app.type || "").toLowerCase().includes("booklet") ||
    String(app.category || "").toLowerCase().includes("booklet") ||
    String(app.type || "").toLowerCase() === "medicine-booklet" ||
    String(app.type || "").toLowerCase() === "movie-booklet"
  )
  const isAssistance =
    app.type === "assistance" ||
    (app as any).type === "social-assistance" ||
    String(app.category || "").toLowerCase().includes("assistance") ||
    String(subLabel || "").toLowerCase().includes("assistance") ||
    String((app as any).service || "").toLowerCase().includes("assistance") ||
    String((app as any).assistanceType || "").toLowerCase().includes("assistance")

  return (
    <div
      onClick={() => onView(app)}
      className={`gw-card ${isPWD(app) ? "gw-card--pwd" : "gw-card--senior"} p-4 transition-shadow hover:shadow-sm cursor-pointer relative group`}
    >
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex">
          <AvatarCircle app={app} sizeClass="h-11 w-11" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="gw-serif text-base font-semibold" style={{ color: "var(--ink)" }}>
              {displayName(app)}
            </p>
            <CategoryTag category={app.category} />
            <span className="gw-tag gw-tag--ghost truncate max-w-56">{subLabel}</span>
          </div>
          <p className="gw-mono text-xs mb-1" style={{ color: "var(--ink-faint)" }}>REF {app.referenceNumber}</p>
          <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
            {app.submittedAt && formatSafeDate(app.submittedAt) !== "—" ? (
              <>
                Submitted {formatSafeDate(app.submittedAt)}
                {formatSafeTime(app.submittedAt) ? ` · ${formatSafeTime(app.submittedAt)}` : ""}
              </>
            ) : (
              <>Submitted —</>
            )}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>
              <Paperclip className="h-3.5 w-3.5" />
              {(app.documents || []).length} documents
            </span>
            {app.status === "approved" && app.assignedIdNumber && !isAssistance && (
              <span className="gw-mono text-xs font-semibold" style={{ color: "var(--forest-ink)" }}>
                {isSeniorBooklet
                  ? `Booklet ${app.assignedIdNumber.replace(/^(PWD|SENIOR|OSCA)-/i, "")}`
                  : isPWD(app)
                    ? `ID ${app.assignedIdNumber.replace(/^(SENIOR|OSCA)-/i, "PWD-")}`
                    : `ID ${app.assignedIdNumber.replace(/^(PWD|OSCA)-/i, "SENIOR-")}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={app.status} />
          </div>
          {onShowCard && app.status === "approved" && !isSeniorBooklet && !isAssistance && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onShowCard(app)
              }}
              className="gw-btn-ghost px-2.5 py-1.5 text-xs text-blue-700 hover:text-blue-800 border-blue-200 bg-blue-50/60 inline-flex items-center gap-1 cursor-pointer"
            >
              <IdCard className="h-3.5 w-3.5 text-blue-600" />
              View ID
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================================================
// Detailed View Modal
// =====================================================================================
interface DetailedViewProps {
  app: ApplicationSubmission
  onClose: () => void
  onApprove: (app: ApplicationSubmission, idNumber: string) => void
  onReject: (id: string, reason: string) => void
  onShowCard?: (app: ApplicationSubmission) => void
  allApplications?: ApplicationSubmission[]
}

function DetailedView({ app, onClose, onApprove, onReject, onShowCard, allApplications }: DetailedViewProps) {
  const subLabel = subLabelForApp(app)
  const contactNumber = isPWD(app) ? app.contactNo : app.cellphoneNo

  const isSeniorBooklet = !isPWD(app) && Boolean(
    String(app.type || "").toLowerCase().includes("booklet") ||
    String(app.category || "").toLowerCase().includes("booklet") ||
    String(app.type || "").toLowerCase() === "medicine-booklet" ||
    String(app.type || "").toLowerCase() === "movie-booklet" ||
    String(subLabel || "").toLowerCase().includes("booklet") ||
    String((app as any).service || "").toLowerCase().includes("booklet")
  )
  const isMovieBooklet = isSeniorBooklet && String(app.type || "").toLowerCase().includes("movie")
  const bookletTitle = isMovieBooklet ? "Free Movie Booklet" : "Medicine Discount Booklet"
  const isAssistance =
    app.type === "assistance" ||
    (app as any).type === "social-assistance" ||
    String(app.category || "").toLowerCase().includes("assistance") ||
    String(subLabel || "").toLowerCase().includes("assistance") ||
    String((app as any).service || "").toLowerCase().includes("assistance") ||
    String((app as any).assistanceType || "").toLowerCase().includes("assistance")

  const rawIdNumber = app.status === "approved" && app.assignedIdNumber ? app.assignedIdNumber : generateOfficialIdNumber(app, allApplications)
  const idNumber = isPWD(app)
    ? rawIdNumber.replace(/^(SENIOR|OSCA)-/i, "PWD-")
    : isSeniorBooklet
      ? rawIdNumber.replace(/^(PWD|SENIOR|OSCA)-/i, "")
      : rawIdNumber.replace(/^PWD-/i, "SENIOR-")

  const [rejectionReason, setRejectionReason] = useState(app.rejectionReason || "")
  const [actionMode, setActionMode] = useState<"view" | "approve" | "reject">("view")
  const [previewDoc, setPreviewDoc] = useState<ApplicationDocument | null>(null)

  let localEmergencyName = ""
  let localEmergencyPhone = ""
  let localEmergencyRel = ""
  let localEmergencyAddr = ""
  let localEmail = ""
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("userProfile") || localStorage.getItem("user")
    if (raw) {
      const u = JSON.parse(raw)
      const uQcid = u.qcidNumber || u.qcid_number || u.qcidNo || u.qcid || u.reference_number
      const uEmail = u.email
      if (
        (uQcid && uQcid === app.referenceNumber) ||
        (uEmail && app.email && uEmail.toLowerCase() === app.email.toLowerCase()) ||
        (u.lastName && app.lastName && u.lastName.toLowerCase() === app.lastName.toLowerCase())
      ) {
        localEmergencyName = [u.emergencyFirstName, u.emergencyLastName].filter(Boolean).join(" ") || u.emergencyName || ""
        localEmergencyPhone = u.emergencyContactNo || u.emergencyPhone || ""
        localEmergencyRel = u.emergencyRelationship || ""
        localEmergencyAddr = u.emergencyAddress || ""
        localEmail = u.email || ""
      }
    }
  } catch { }

  const emailAddress =
    app.email ||
    (app as any).emailAddress ||
    (app as any).registeredEmail ||
    (app as any).userEmail ||
    (app as any).extra_data?.email ||
    localEmail ||
    "—"

  const emergencyPerson =
    [(app as any).emergencyFirstName, (app as any).emergencyLastName].filter(Boolean).join(" ") ||
    (app as any).emergencyContactPerson ||
    (app as any).emergencyName ||
    (app as any).emergencyPerson ||
    (app as any).guardianName ||
    (app as any).familyMemberName ||
    localEmergencyName ||
    "—"

  const emergencyPhone =
    (app as any).emergencyContactNo ||
    (app as any).emergencyPhone ||
    (app as any).guardianContact ||
    localEmergencyPhone ||
    contactNumber ||
    "—"

  const emergencyRelation =
    (app as any).emergencyRelationship ||
    (app as any).relationshipToApplicant ||
    (app as any).familyRelationship ||
    localEmergencyRel ||
    (isPWD(app) ? "Guardian / Parent" : "Immediate Family")

  const emergencyAddress =
    (app as any).emergencyResidentialAddress ||
    (app as any).emergencyAddress ||
    (app as any).guardianAddress ||
    localEmergencyAddr ||
    app.address ||
    "—"

  let sectionNum = 0
  const nextNum = () => String(++sectionNum).padStart(2, "0")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="w-full max-w-3xl my-8 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-medium)",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ background: "var(--surface-sunk)", borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <AvatarCircle app={app} sizeClass="h-12 w-12" />
              <div className="min-w-0">
                <h2 className="gw-serif text-xl font-semibold truncate" style={{ color: "var(--ink)" }}>
                  {displayName(app)}
                </h2>
                <p className="gw-mono text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>REF {app.referenceNumber}</p>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <CategoryTag category={app.category} />
                  <span className="gw-tag gw-tag--ghost max-w-64 truncate">{subLabel}</span>
                  <StatusBadge status={app.status} />
                  {onShowCard && app.status === "approved" && !isAssistance && !isSeniorBooklet && (
                    <button
                      type="button"
                      onClick={() => onShowCard(app)}
                      className="px-3 py-1 text-xs rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <IdCard className="h-3.5 w-3.5" />
                      View ID Card
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full text-xl font-light transition-colors"
              style={{ color: "var(--ink-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto space-y-7">
          {/* Section 01: Personal Information */}
          <div>
            <SectionHeading number={nextNum()} icon={<User className="h-4 w-4" />}>Personal Information</SectionHeading>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
              <Field
                label={isAssistance ? "QC Reference Number" : "QC ID Number"}
                value={
                  <span className="font-mono font-bold text-blue-700">
                    <MaskedText
                      value={app.referenceNumber || (app as any).qcid || "—"}
                      type="id"
                      showButtonLabel
                      auditSubject={displayName(app)}
                      auditField="QCID / Reference Number"
                      auditModule="PWD & Senior Citizen"
                    />
                  </span>
                }
              />
              <Field label="Full name" value={displayName(app)} />
              <Field label="Nationality" value={(app as any).nationality || "FILIPINO"} />
              <Field
                label="Date of birth"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                    <MaskedText
                      value={app.dateOfBirth}
                      type="birthdate"
                      showButtonLabel
                      auditSubject={displayName(app)}
                      auditField="Date of Birth"
                      auditModule="PWD & Senior Citizen"
                    />
                  </span>
                }
              />
              <Field label="Age / Sex" value={`${app.age || "—"} / ${app.sex || (app as any).gender || "—"}`} />
              <Field label="Civil status" value={app.civilStatus || "—"} />
              <div className={isAssistance ? "col-span-2" : ""}>
                <Field
                  label="Phone number"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                      <MaskedText
                        value={contactNumber}
                        type="phone"
                        showButtonLabel
                        auditSubject={displayName(app)}
                        auditField="Phone Number"
                        auditModule="PWD & Senior Citizen"
                      />
                    </span>
                  }
                />
              </div>
              {!isAssistance && (
                <div>
                  <Field
                    label={
                      isSeniorBooklet
                        ? "Registered Email (for Booklet Number)"
                        : "Registered Email (for Digital ID Delivery)"
                    }
                    value={
                      <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        <MaskedText
                          value={emailAddress}
                          type="email"
                          showButtonLabel
                          auditSubject={displayName(app)}
                          auditField="Email Address"
                          auditModule="PWD & Senior Citizen"
                        />
                      </span>
                    }
                  />
                </div>
              )}
              <div className="col-span-2">
                <Field
                  label="Registered residential address"
                  value={
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--ink-faint)" }} />
                      {app.address}
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 02: Disability Information (for PWD) or Program Details */}
          {isPWD(app) && (
            <div>
              <SectionHeading number={nextNum()} icon={<HeartHandshake className="h-4 w-4" />}>
                Disability Information
              </SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                <Field label="Disability type" value={app.disabilityType || (app as any).disability_type || "—"} />
                <Field label="Cause of disability" value={app.causeOfDisability || (app as any).cause_of_disability || "—"} />
                {((app as any).bloodType || (app as any).blood_type) && (
                  <Field label="Blood type" value={(app as any).bloodType || (app as any).blood_type} />
                )}
                {((app as any).existingIdNumber || (app as any).pwdIdNumber || (app as any).oldPwdId) && (
                  <Field
                    label="Existing / Verified PWD ID"
                    value={
                      <span className="font-mono font-bold text-blue-700">
                        {(app as any).existingIdNumber || (app as any).pwdIdNumber || (app as any).oldPwdId}
                      </span>
                    }
                  />
                )}
                {((app as any).reasonForRenewal || (app as any).reasonForReplacement || (app as any).reason) && !isAssistance && (
                  <Field
                    label={app.type === "renewal" || String((app as any).applicationType).toLowerCase() === "renewal" ? "Reason for Renewal" : "Reason for Replacement / Loss"}
                    value={(app as any).reasonForRenewal || (app as any).reasonForReplacement || (app as any).reason}
                  />
                )}
                {Boolean(
                  (app as any).disabilityDescription ||
                  (app as any).briefDescription ||
                  (app as any).description ||
                  (app as any).extra_data?.disabilityDescription ||
                  (app as any).extra_data?.briefDescription ||
                  (app as any).extra_data?.description
                ) && (
                    <div className="col-span-2">
                      <Field
                        label="Brief description of disability"
                        value={
                          (app as any).disabilityDescription ||
                          (app as any).briefDescription ||
                          (app as any).description ||
                          (app as any).extra_data?.disabilityDescription ||
                          (app as any).extra_data?.briefDescription ||
                          (app as any).extra_data?.description
                        }
                      />
                    </div>
                  )}
              </div>
            </div>
          )}

          {!isPWD(app) && !isAssistance && (
            <div>
              <SectionHeading number={nextNum()} icon={<HeartHandshake className="h-4 w-4" />}>
                {isSeniorBooklet ? "Senior Citizen Booklet Details" : "Senior Citizen Program Details"}
              </SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                <Field label="Service & Application Type" value={isSeniorBooklet ? bookletTitle : subLabel} />
                {!isSeniorBooklet && (
                  <Field label="Application category" value="Senior Citizen Services" />
                )}
                {((app as any).existingIdNumber || (app as any).oldSeniorId || (app as any).oscaId || (app as any).seniorIdNumber) && (
                  <Field
                    label="Senior Citizen / OSCA ID Number"
                    value={
                      <span className="font-mono font-bold text-blue-700">
                        {(app as any).existingIdNumber || (app as any).oldSeniorId || (app as any).oscaId || (app as any).seniorIdNumber}
                      </span>
                    }
                  />
                )}
                {((app as any).existingBookletNumber || (app as any).bookletNumber || (app as any).extra_data?.existingBookletNumber || (app as any).extra_data?.bookletNumber) && (
                  <Field
                    label="Existing Booklet Number"
                    value={
                      <span className="font-mono font-bold text-emerald-700">
                        {(app as any).existingBookletNumber || (app as any).bookletNumber || (app as any).extra_data?.existingBookletNumber || (app as any).extra_data?.bookletNumber}
                      </span>
                    }
                  />
                )}
                {((app as any).reasonForRenewal || (app as any).reasonForReplacement || (app as any).reason) && (
                  <Field
                    label={app.type === "renewal" || String((app as any).applicationType).toLowerCase() === "renewal" ? "Reason for Renewal" : "Reason for Replacement / Loss"}
                    value={(app as any).reasonForRenewal || (app as any).reasonForReplacement || (app as any).reason}
                  />
                )}
              </div>
            </div>
          )}

          {/* Section: Household & Socio-Economic Information (for Social Assistance) */}
          {isAssistance && (
            <div>
              <SectionHeading number={nextNum()} icon={<HeartHandshake className="h-4 w-4" />}>
                Household &amp; Socio-Economic Information
              </SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                {((app as any).seniorIdNumber || (app as any).oscaId || (app as any).existingIdNumber) && (
                  <div className="col-span-2">
                    <Field
                      label="Senior Citizen / OSCA ID Number"
                      value={
                        <span className="font-mono font-bold text-blue-700">
                          {(app as any).seniorIdNumber || (app as any).oscaId || (app as any).existingIdNumber}
                        </span>
                      }
                    />
                  </div>
                )}
                <Field
                  label="Living arrangement"
                  value={(app as any).livingArrangement || (app as any).extra_data?.livingArrangement || "—"}
                />
                <Field
                  label="Number of household members"
                  value={
                    (app as any).familyMembersCount ||
                    (app as any).householdMembersCount ||
                    (app as any).householdMembers ||
                    (app as any).numberOfHouseholdMembers ||
                    (app as any).numHouseholdMembers ||
                    (app as any).extra_data?.familyMembersCount ||
                    (app as any).extra_data?.householdMembersCount ||
                    (app as any).extra_data?.householdMembers ||
                    (app as any).extra_data?.numberOfHouseholdMembers ||
                    "—"
                  }
                />
                <Field
                  label={isPWD(app) ? "Total monthly household income" : "Monthly family income"}
                  value={(() => {
                    const raw =
                      (app as any).monthlyIncome ||
                      (app as any).monthlyHouseholdIncome ||
                      (app as any).householdIncome ||
                      (app as any).extra_data?.monthlyIncome ||
                      (app as any).extra_data?.monthlyHouseholdIncome ||
                      "—"
                    if (typeof raw === "string") {
                      if (raw.toLowerCase().includes("walang regular") || raw.toLowerCase().includes("no income")) return "No Regular Income"
                      if (raw.toLowerCase().includes("higit") || raw.toLowerCase().includes("above 25")) return "Above ₱25,000"
                    }
                    return raw
                  })()}
                />
                <Field
                  label="Employment / pension status"
                  value={(() => {
                    const raw =
                      (app as any).employmentStatus ||
                      (app as any).pensionSource ||
                      (app as any).extra_data?.employmentStatus ||
                      (app as any).extra_data?.pensionSource ||
                      "—"
                    if (typeof raw === "string") {
                      if (raw.toLowerCase().includes("unemployed") || raw.toLowerCase().includes("walang trabaho")) return "Unemployed"
                      if (raw.toLowerCase().includes("retired") || raw.toLowerCase().includes("pensyonado")) return "Retired / Pensioner"
                      if (raw.toLowerCase().includes("self-employed") || raw.toLowerCase().includes("negosyo")) return "Self-employed / Small Business"
                      if (raw.toLowerCase().includes("part-time")) return "Part-time Worker"
                      if (raw.toLowerCase().includes("employed") || raw.toLowerCase().includes("may trabaho")) return "Employed"
                    }
                    return raw
                  })()}
                />
                {Boolean((app as any).sourceOfIncome || (app as any).extra_data?.sourceOfIncome) && (
                  <div className="col-span-2">
                    <Field
                      label="Source of income / pension"
                      value={(app as any).sourceOfIncome || (app as any).extra_data?.sourceOfIncome}
                    />
                  </div>
                )}
                {Boolean(
                  !isSeniorBooklet && !String((app as any).service || "").toLowerCase().includes("senior") &&
                  ((app as any).monthlyHouseholdExpenses ||
                    (app as any).monthlyExpenses ||
                    (app as any).householdExpenses ||
                    (app as any).extra_data?.monthlyHouseholdExpenses)
                ) && (
                    <div className="col-span-2">
                      <Field
                        label="Total monthly household expenses (₱)"
                        value={
                          (app as any).monthlyHouseholdExpenses ||
                          (app as any).monthlyExpenses ||
                          (app as any).householdExpenses ||
                          (app as any).extra_data?.monthlyHouseholdExpenses
                        }
                      />
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Section: Assistance Details (for Social Assistance) */}
          {isAssistance && (
            <div>
              <SectionHeading number={nextNum()} icon={<HeartHandshake className="h-4 w-4" />}>
                Assistance Details
              </SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                <div className="col-span-2">
                  <Field
                    label="Type of assistance requested"
                    value={
                      <span className="font-semibold text-blue-700">
                        {(app as any).assistanceType || (app as any).service || subLabel || "Social Assistance"}
                      </span>
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Field
                    label="Reason and purpose of request"
                    value={
                      (app as any).purposeOfAssistance ||
                      (app as any).reasonForRequest ||
                      (app as any).needDescription ||
                      (app as any).notes ||
                      "—"
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Emergency Contact Information (for ID Applications only, not for Booklets or Assistance) */}
          {!isAssistance && !isSeniorBooklet && (
            <div>
              <SectionHeading number={nextNum()} icon={<Phone className="h-4 w-4" />}>
                Emergency Contact Information
              </SectionHeading>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                <Field label="Emergency contact person" value={emergencyPerson} />
                <Field
                  label="Contact number"
                  value={
                    emergencyPhone !== "—" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                        {emergencyPhone}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field label="Relationship to applicant" value={emergencyRelation} />
                <div className="col-span-2">
                  <Field
                    label="Emergency residential address"
                    value={
                      emergencyAddress !== "—" ? (
                        <span className="inline-flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--ink-faint)" }} />
                          {emergencyAddress}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <SectionHeading number={nextNum()} icon={<Paperclip className="h-4 w-4" />}>
              Supporting Documents ({(app.documents || []).length})
            </SectionHeading>
            <div className="space-y-2">
              {(app.documents || []).length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 bg-slate-50 rounded-lg">No documents uploaded.</p>
              ) : (
                (app.documents || []).map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                        {/\.(jpe?g|png)$/i.test(doc.filename || doc.name) ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.uploadedAt ? formatSafeDateTime(doc.uploadedAt) : "Uploaded on file"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Decision Section inside body if active */}
          {app.status === "pending" && actionMode !== "view" && (
            <div className="border-t border-border pt-5">
              {actionMode === "approve" && (
                isAssistance ? (
                  <div className="space-y-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Confirm Social Assistance Approval
                        </label>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          Direct Aid &amp; Appointment Routing
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Approving this social assistance application will automatically forward the applicant to <strong>Appointments (for payout scheduling)</strong> and <strong>Financial Aid Disbursement (₱2,000 Aid)</strong>.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActionMode("view")}
                        className="gw-btn-ghost flex-1 h-10 text-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onApprove(app, app.referenceNumber)
                          onClose()
                        }}
                        className="gw-btn-approve flex-1 h-10 text-sm cursor-pointer"
                      >
                        Confirm Approval &amp; Forward
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Confirm {isSeniorBooklet ? bookletTitle : app.category} Approval
                        </label>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          {isSeniorBooklet ? "Official Booklet No" : "Official QC ID"}: {idNumber}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {isSeniorBooklet ? (
                          <>
                            Official Booklet Number <strong className="font-mono text-foreground">{idNumber}</strong> has been generated. Approving will automatically send this official Booklet Number directly to the applicant's registered Gmail.
                          </>
                        ) : (
                          <>
                            Official ID Number <strong className="font-mono text-foreground">{idNumber}</strong> has been assigned. Approving will automatically connect this application to <strong>Appointments</strong> for claiming/pickup schedule.
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActionMode("view")}
                        className="gw-btn-ghost flex-1 h-10 text-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onApprove(app, idNumber)
                          onClose()
                        }}
                        className="gw-btn-approve flex-1 h-10 text-sm cursor-pointer"
                      >
                        {isSeniorBooklet ? "Confirm Approval & Issue Booklet" : "Confirm Approval & Connect to Appointment"}
                      </button>
                    </div>
                  </div>
                )
              )}

              {actionMode === "reject" && (
                <div className="space-y-4 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                      Reason for Rejection *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Specify reason for rejecting this application..."
                      className="gw-input w-full mt-1.5 px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setActionMode("view")}
                      className="gw-btn-ghost flex-1 h-10 text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (rejectionReason.trim()) {
                          onReject(app.id, rejectionReason)
                          onClose()
                        }
                      }}
                      className="gw-btn-reject flex-1 h-10 text-sm cursor-pointer"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {app.status === "approved" && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 text-sm space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" />
                Approved on {formatSafeDate(app.approvedDate || (app as any).updated_at || app.submittedAt)} by {app.approvedBy || "Admin Staff"}
              </p>
              {isAssistance ? (
                <div className="pt-2 text-xs space-y-2">
                  <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Connected to Appointments (for payout schedule)
                  </p>
                  <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Forwarded to Financial Aid Disbursement (₱2,000 Fixed Aid)
                  </p>
                </div>
              ) : (
                <>
                  {app.assignedIdNumber && (
                    <p className="text-xs">
                      <strong>{isSeniorBooklet ? "Official Booklet Number:" : "Assigned ID Number:"}</strong> {app.assignedIdNumber}
                    </p>
                  )}
                  {app.notes && <p className="text-xs"><strong>Notes:</strong> {app.notes}</p>}
                  <p className="text-emerald-800 font-semibold flex items-center gap-1.5 text-xs">
                    <Mail className="h-3.5 w-3.5 text-emerald-600" />
                    Directly Sent to Registered Gmail ({app.email || "Applicant Email"})
                  </p>
                  {onShowCard && !isSeniorBooklet && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onShowCard(app)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <IdCard className="h-4 w-4" />
                        Preview &amp; Print Official QC ID Card
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {app.status === "rejected" && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200 text-sm space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <X className="h-4 w-4 text-red-600" />
                Rejected Application
              </p>
              <p className="text-xs"><strong>Reason:</strong> {app.rejectionReason || "Requirements not met."}</p>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3" style={{ background: "var(--surface-sunk)" }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="gw-btn-ghost px-5 h-10 text-sm cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex items-center gap-3">
            {app.status === "pending" && actionMode === "view" && (
              <>
                <button
                  type="button"
                  onClick={() => setActionMode("reject")}
                  className="gw-btn-reject px-4 h-10 text-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode("approve")}
                  className="gw-btn-approve px-5 h-10 text-sm inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  Approve &amp; Forward
                </button>
              </>
            )}
            {onShowCard && app.status === "approved" && !isAssistance && !isSeniorBooklet && (
              <button
                type="button"
                onClick={() => onShowCard(app)}
                className="px-4 h-10 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <IdCard className="h-4 w-4 text-blue-600" />
                View ID Card
              </button>
            )}
          </div>
        </div>
      </div>

      {previewDoc && <DocumentViewerModal doc={previewDoc} app={app} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}

import { deduplicatedFetch, clearApiCache } from "../../utils/cachedApiFetch"

export default function PWDSeniorCitizen() {
  const [applications, setApplications] = useState<ApplicationSubmission[]>(() => {
    try {
      const raw = localStorage.getItem("pwd_senior_applications")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return []
  })
  const [filterCategory, setFilterCategory] = useState<"all" | "PWD" | "Senior Citizen">("all")
  const [filterType, setFilterType] = useState<"all" | "new" | "renewal" | "loss" | "assistance">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedApp, setSelectedApp] = useState<ApplicationSubmission | null>(null)
  const [cardApp, setCardApp] = useState<ApplicationSubmission | null>(null)
  const isFetchingRef = useRef(false)

  // Fetch applications from backend and localStorage in real-time
  useEffect(() => {
    let isMounted = true

    const fetchApps = async () => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      try {
        let combined: ApplicationSubmission[] = []
        let backendFetched = false
        try {
          const data = await deduplicatedFetch(`${API_BASE}/api/pwd-senior/applications`, 4000)
          if (Array.isArray(data)) {
            combined = data.filter((a: any) =>
              a &&
              !["APP-PWD-2026-001", "APP-PWD-2026-002", "APP-PWD-2026-003"].includes(a.id) &&
              !["PWD-QC-2026-4891", "PWD-QC-2026-3109", "PWD-QC-2026-5520"].includes(a.referenceNumber)
            )
            backendFetched = true
            try {
              localStorage.setItem("pwd_senior_applications", JSON.stringify(combined))
            } catch { }
          }
        } catch (err: any) {
          if (err?.name !== "AbortError") {
            console.warn("Could not fetch PWD/Senior applications from backend:", err)
          }
        }

        // Only check localStorage if backend was offline / unreachable
        if (!backendFetched) {
          try {
            const raw = localStorage.getItem("pwd_senior_applications")
            if (raw) {
              let localApps = JSON.parse(raw)
              if (Array.isArray(localApps)) {
                combined = localApps.filter((a: any) =>
                  a &&
                  !["APP-PWD-2026-001", "APP-PWD-2026-002", "APP-PWD-2026-003"].includes(a.id) &&
                  !["PWD-QC-2026-4891", "PWD-QC-2026-3109", "PWD-QC-2026-5520"].includes(a.referenceNumber)
                )
              }
            }
          } catch { }
        }

        combined = combined.map((a: any) => {
          if (!a) return a
          const isPwd = isPWD(a)
          let resolvedDate = a.submittedAt || a.created_at || a.submitted_at || a.dateSubmitted || a.date_submitted || a.extra_data?.submittedAt || a.extra_data?.created_at
          if (!resolvedDate && a.id) {
            const match = String(a.id).match(/\b(1\d{11,12})\b/)
            if (match) {
              const d = new Date(Number(match[1]))
              if (!isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getFullYear() <= 2035) {
                resolvedDate = d.toISOString()
              }
            }
          }
          const safeSubmittedAt = safeDateIso(resolvedDate)
          let updated = { ...a, submittedAt: safeSubmittedAt || a.submittedAt || "" }
          const rawAssigned = a.assignedIdNumber || (a as any).assigned_id_number
          if (rawAssigned && typeof rawAssigned === "string") {
            if (isPwd && (rawAssigned.toUpperCase().startsWith("SENIOR-") || rawAssigned.toUpperCase().startsWith("OSCA-"))) {
              return {
                ...updated,
                assignedIdNumber: rawAssigned.replace(/^(SENIOR|OSCA)-/i, "PWD-"),
                assigned_id_number: rawAssigned.replace(/^(SENIOR|OSCA)-/i, "PWD-"),
              }
            } else if (!isPwd && !String(a.type || "").includes("booklet") && rawAssigned.toUpperCase().startsWith("PWD-")) {
              return {
                ...updated,
                assignedIdNumber: rawAssigned.replace(/^PWD-/i, "SENIOR-"),
                assigned_id_number: rawAssigned.replace(/^PWD-/i, "SENIOR-"),
              }
            }
          }
          return updated
        })

        if (isMounted) {
          setApplications(combined)
        }
      } catch (err) {
        console.warn("Error syncing applications:", err)
      } finally {
        isFetchingRef.current = false
      }
    }

    fetchApps()
    const interval = setInterval(fetchApps, 8000)
    const unsubscribe = subscribeToRealtimeChanges(fetchApps)
    window.addEventListener("focus", fetchApps)

    return () => {
      isMounted = false
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("focus", fetchApps)
    }
  }, [])

  // Persist applications to state & localStorage
  const updateApplications = (updater: (prev: ApplicationSubmission[]) => ApplicationSubmission[]) => {
    setApplications((prev) => {
      const next = updater(prev)
      try {
        localStorage.setItem("pwd_senior_applications", JSON.stringify(next))
        notifyApplicationChange("STATUS_CHANGED", "pwd_senior")
      } catch { }
      return next
    })
  }

  const handleApprove = async (targetApp: ApplicationSubmission, idNumber: string) => {
    const id = targetApp.id
    const refNo = targetApp.referenceNumber || (targetApp as any).reference_no || ""
    const targetIdentifier = id || refNo
    const approvedDate = new Date().toISOString()

    clearApiCache("/api/pwd-senior/applications")
    // Strict 1-application update only: match by exact unique application id
    updateApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
            ...app,
            status: "approved" as const,
            assignedIdNumber: idNumber,
            approvedBy: "Social Worker Admin",
            approvedDate,
          }
          : app
      )
    )

    // Sync status to backend database strictly by unique application id
    try {
      await fetch(`${API_BASE}/api/pwd-senior/applications/${encodeURIComponent(targetIdentifier)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetApp.id,
          status: "approved",
          assignedIdNumber: idNumber,
          approvedBy: "Social Worker Admin",
          approvedDate,
          referenceNumber: refNo,
          category: targetApp.category,
        }),
      })
      clearApiCache("/api/pwd-senior/applications")
    } catch (err) {
      console.warn("Failed updating backend status:", err)
    }

    // Handle Assistance Applications vs ID Applications
    const isAssistanceApp =
      targetApp.type === "assistance" ||
      (targetApp as any).type === "social-assistance" ||
      String(targetApp.category || "").toLowerCase().includes("assistance") ||
      String((targetApp as any).service || "").toLowerCase().includes("assistance") ||
      String((targetApp as any).assistanceType || "").toLowerCase().includes("assistance") ||
      (targetApp.documents || []).some((d: any) => String(d.name || "").toLowerCase().includes("indigency") || String(d.name || "").toLowerCase().includes("pwdqcid"))

    if (isAssistanceApp) {
      const assistanceName = isPWD(targetApp) ? "PWD Social Assistance" : "Senior Social Assistance"

      // 1. Sync to Financial Aid Disbursements
      try {
        const currentDisbursements = getSavedDisbursements()
        if (!currentDisbursements.some((d) => d.applicationRef === targetApp.referenceNumber)) {
          const newRecord: SyncedDisbursementRecord = {
            id: `disb-${Date.now()}`,
            disbursementId: `DISB-2026-${String(currentDisbursements.length + 1).padStart(4, "0")}`,
            applicationRef: targetApp.referenceNumber,
            applicantName: displayName(targetApp).toUpperCase(),
            assistanceType: assistanceName,
            fixedAmount: 2000,
            dateApproved: new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }),
            status: "PENDING",
            venue: "Quezon City Hall",
            remarks: "Awtomatikong pumasok mula sa PWD/Senior Social Assistance aplikasyon.",
          }
          saveDisbursements([newRecord, ...currentDisbursements])
        }
      } catch (err) {
        console.warn("Failed saving disbursement record:", err)
      }

      // 2. Sync to Appointments
      try {
        fetch(`${API_BASE}/api/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceNo: targetApp.referenceNumber,
            reference_no: targetApp.referenceNumber,
            module: isPWD(targetApp) ? "PWD" : "Senior Citizen",
            applicantName: displayName(targetApp),
            applicant_name: displayName(targetApp),
            concern: assistanceName,
            status: "pending",
          }),
        }).catch(() => { })
      } catch { }

      window.dispatchEvent(new Event("appointments_updated"))
      window.dispatchEvent(new Event("financial_disbursements_updated"))
      window.dispatchEvent(new Event("storage"))

      // 3. In-portal Bell Notification
      pushUserNotification({
        title: `${assistanceName}: Approved`,
        desc: `Congratulations! Your application for ${assistanceName} has been approved and forwarded to Appointments for payout scheduling and Financial Aid Disbursement (₱2,000).`,
        applicationRef: targetApp.referenceNumber,
        assistanceType: assistanceName,
        amount: 2000,
      })
    } else {
      // 1. Dispatch in-portal bell notification to applicant for ID cards / Booklets
      if (targetApp) {
        const rawType = String(targetApp.type || "").toLowerCase()
        const isSeniorBooklet = !isPWD(targetApp) && (
          rawType === "medicine-booklet" ||
          rawType === "movie-booklet" ||
          String(targetApp.category || "").toLowerCase().includes("booklet")
        )
        const isMovieBooklet = isSeniorBooklet && (
          rawType === "movie-booklet" ||
          String(targetApp.type || "").toLowerCase().includes("movie")
        )
        const typeLabel =
          rawType === "renewal"
            ? "Renewal"
            : rawType === "replacement" || rawType === "loss"
              ? "Replacement / Lost ID"
              : isSeniorBooklet
                ? "New Booklet"
                : "New Application"
        const serviceName = isSeniorBooklet
          ? isMovieBooklet
            ? "Free Movie Booklet"
            : "Medicine Discount Booklet"
          : isPWD(targetApp)
            ? "PWD ID"
            : "Senior Citizen ID"
        const targetEmail = targetApp.email

        pushUserNotification({
          title: `${serviceName} Application (${typeLabel}): Approved`,
          desc: isSeniorBooklet
            ? `Congratulations! Your application for ${serviceName} (${typeLabel}) has been approved. Your official Booklet Number (${idNumber}) was sent directly to your Gmail (${targetEmail || "registered email"}).`
            : `Congratulations! Your application for ${serviceName} (${typeLabel}) has been approved. Your official Digital ID (${idNumber}) was sent directly to your Gmail (${targetEmail || "registered email"}).`,
          applicationRef: targetApp.referenceNumber,
          assistanceType: isPWD(targetApp) ? "PWD Services" : "Senior Citizen Services",
        })

        // 2. Dispatch official ID / Booklet approval email directly to applicant's Gmail
        if (targetEmail && targetEmail.includes("@")) {
          if (isSeniorBooklet) {
            fetch(`${API_BASE}/api/email/send-senior-booklet`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipientEmail: targetEmail,
                recipientName: displayName(targetApp),
                bookletNumber: idNumber,
                oscaIdNumber: (targetApp as any).existingIdNumber || targetApp.referenceNumber,
                referenceNumber: targetApp.referenceNumber,
                bookletType: isMovieBooklet ? "movie" : "medicine",
                applicationType: typeLabel,
                approvedDate,
                contactNumber: targetApp.contactNo || (targetApp as any).cellphoneNo,
                address: targetApp.address,
              }),
            }).catch((err) => console.warn("Could not dispatch booklet approval email:", err))
          } else {
            const endpoint = isPWD(targetApp) ? `${API_BASE}/api/email/send-pwd-id` : `${API_BASE}/api/email/send-senior-id`
            const payload = isPWD(targetApp)
              ? {
                recipientEmail: targetEmail,
                recipientName: displayName(targetApp),
                pwdIdNumber: idNumber,
                referenceNumber: targetApp.referenceNumber,
                disabilityType: (targetApp as any).disabilityType || "Physical / Visual Disability",
                bloodType: (targetApp as any).bloodType || "O+",
                approvedDate,
                contactNumber: targetApp.contactNo || (targetApp as any).cellphoneNo,
                address: targetApp.address,
              }
              : {
                recipientEmail: targetEmail,
                recipientName: displayName(targetApp),
                seniorIdNumber: idNumber,
                referenceNumber: targetApp.referenceNumber,
                applicationType: typeLabel,
                bloodType: (targetApp as any).bloodType || "O+",
                approvedDate,
                contactNumber: targetApp.contactNo || (targetApp as any).cellphoneNo,
                address: targetApp.address,
              }

            fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch((err) => console.warn("Could not dispatch approval email:", err))
          }
        }
      }
    }
    notifyApplicationChange("APPLICATION_APPROVED", "pwd_senior", targetApp?.referenceNumber)
  }

  const handleReject = async (id: string, reason: string) => {
    const targetApp = applications.find((a) => a.id === id)
    updateApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
            ...app,
            status: "rejected" as const,
            rejectionReason: reason,
          }
          : app
      )
    )

    if (targetApp) {
      pushUserNotification({
        title: `${isPWD(targetApp) ? "PWD" : "Senior Citizen"} ID Application: Not Approved`,
        desc: `We regret to inform you that your application was not approved. Reason: ${reason || "Additional documents or verification required."}`,
        applicationRef: targetApp.referenceNumber,
        assistanceType: isPWD(targetApp) ? "PWD Services" : "Senior Citizen Services",
      })
    }

    clearApiCache("/api/pwd-senior/applications")
    // Sync rejection to backend database
    try {
      await fetch(`${API_BASE}/api/pwd-senior/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: reason,
        }),
      })
      clearApiCache("/api/pwd-senior/applications")
      notifyApplicationChange("APPLICATION_REJECTED", "pwd_senior", targetApp?.referenceNumber)
    } catch (err) {
      console.warn("Failed updating backend rejection:", err)
    }
  }




  // Filter applications
  const filteredApps = applications.filter((app) => {
    const appCat = String(app.category || "").toUpperCase()
    const matchCategory =
      filterCategory === "all" ||
      (filterCategory === "PWD" && (appCat === "PWD" || appCat.includes("DISABILITY"))) ||
      (filterCategory === "Senior Citizen" && (appCat === "SENIOR CITIZEN" || appCat.includes("SENIOR")))
    const matchStatus =
      filterStatus === "all" ||
      String(app.status || "").toLowerCase() === filterStatus.toLowerCase()

    const appType = String(app.type || "").toLowerCase()
    const matchType =
      filterType === "all" ||
      (filterType === "new" && appType === "new") ||
      (filterType === "renewal" && appType === "renewal") ||
      (filterType === "loss" && (appType === "loss" || appType === "replacement")) ||
      (filterType === "assistance" &&
        (appType.includes("assist") ||
          appType === "social-assistance" ||
          appType === "medicine-booklet" ||
          appType === "movie-booklet"))

    const q = searchTerm.trim().toLowerCase()
    const matchSearch =
      q === "" ||
      (app.firstName || "").toLowerCase().includes(q) ||
      (app.lastName || "").toLowerCase().includes(q) ||
      displayName(app).toLowerCase().includes(q) ||
      (app.referenceNumber || "").toLowerCase().includes(q) ||
      (app.assignedIdNumber || "").toLowerCase().includes(q) ||
      (app.address || "").toLowerCase().includes(q)
    return matchCategory && matchType && matchStatus && matchSearch
  })

  // Stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  }

  const categoryOptions: { label: string; value: "all" | "PWD" | "Senior Citizen" }[] = [
    { label: "All Categories", value: "all" },
    { label: "PWD", value: "PWD" },
    { label: "Senior Citizen", value: "Senior Citizen" },
  ]

  const typeOptions: { label: string; value: "all" | "new" | "renewal" | "loss" | "assistance" }[] = [
    { label: "All Types", value: "all" },
    { label: "New ID", value: "new" },
    { label: "Renewal", value: "renewal" },
    { label: "Lost / Replacement", value: "loss" },
    { label: "Social Assistance", value: "assistance" },
  ]

  const statusOptions: { label: string; value: "all" | "pending" | "approved" | "rejected" }[] = [
    { label: "All Statuses", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ]

  return (
    <div className="gw-root">
      <Tokens />
      <div className="p-4 md:p-8 space-y-7 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="gw-serif text-[2.1rem] font-semibold leading-tight" style={{ color: "var(--ink)" }}>
            PWD &amp; Senior Citizen Services
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total applications", value: stats.total, color: "var(--ink)" },
            { label: "Pending review", value: stats.pending, color: "var(--gold)" },
            { label: "Approved", value: stats.approved, color: "var(--forest)" },
            { label: "Rejected", value: stats.rejected, color: "var(--redwood)" },
          ].map((stat) => (
            <div key={stat.label} className="gw-stat p-4">
              <p className="gw-eyebrow" style={{ color: "var(--ink-faint)" }}>{stat.label}</p>
              <p className="gw-serif text-3xl font-semibold mt-2" style={{ color: "var(--ink)" }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="gw-card p-4 space-y-4">
          <div className="flex items-center gap-2 rounded-lg px-3" style={{ border: "1px solid var(--line)", background: "var(--surface-sunk)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--ink-faint)" }} />
            <input
              type="text"
              placeholder="Search by name or reference number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none"
              style={{ color: "var(--ink)" }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="gw-eyebrow mb-2" style={{ color: "var(--ink-faint)" }}>Category</p>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterCategory(opt.value)}
                    className={`gw-tag gw-tag--btn ${opt.value === "all" ? "gw-tag--ghost" : opt.value === "PWD" ? "gw-tag--pwd" : "gw-tag--senior"
                      } ${filterCategory === opt.value ? "is-active" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="gw-eyebrow mb-2" style={{ color: "var(--ink-faint)" }}>Service Type</p>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterType(opt.value)}
                    className="gw-tag gw-tag--ghost gw-tag--btn"
                    style={filterType === opt.value ? { opacity: 1, borderColor: "var(--ink-soft)", fontWeight: 700 } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="gw-eyebrow mb-2" style={{ color: "var(--ink-faint)" }}>Status</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value as any)}
                    className="gw-tag gw-tag--ghost gw-tag--btn"
                    style={filterStatus === opt.value ? { opacity: 1, borderColor: "var(--ink-soft)" } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="gw-serif text-lg font-semibold" style={{ color: "var(--ink)" }}>Applications</h2>
              <span className="gw-mono text-sm" style={{ color: "var(--ink-faint)" }}>({filteredApps.length})</span>
            </div>

          </div>

          {filteredApps.length === 0 ? (
            <div className="text-center py-16 gw-card">
              <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--ink-faint)" }} />
              <p className="gw-serif text-base font-semibold" style={{ color: "var(--ink)" }}>No applications found</p>
              <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Try a different search term or filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onView={() => setSelectedApp(app)}
                  onShowCard={() => setCardApp(app)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detailed View Modal */}
        {selectedApp && (
          <DetailedView
            app={selectedApp}
            allApplications={applications}
            onClose={() => setSelectedApp(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            onShowCard={(app) => setCardApp(app)}
          />
        )}


        {/* Official QC ID Card Modal */}
        {cardApp && (
          <OfficialIdCardModal
            app={cardApp}
            onClose={() => setCardApp(null)}
          />
        )}
      </div>
    </div>
  )
}