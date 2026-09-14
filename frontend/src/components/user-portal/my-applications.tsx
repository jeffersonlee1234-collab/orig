import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toPng } from "html-to-image"
import {
  FileText,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Banknote,
  MapPin,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  GraduationCap,
  Package,
  Wrench,
  ExternalLink,
  Award,
  Download,
  Printer,
  IdCard,
  User,
  X,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import { cachedApiFetch } from "../../utils/cachedApiFetch"
import { getCurrentUserProfile } from "../../utils/userProfile"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import {
  FIXED_ASSISTANCE_AMOUNTS,
  resolveFixedAmount,
  getSavedDisbursements,
  checkAndAutoReleaseScheduledDisbursements,
  isIdOrDocumentService,
  isTrainingService,
} from "../../utils/financialAidSync"
import { useLanguage } from "../ui/language-context"

export type ApplicationStatus =
  | "Pending"
  | "Under Review"
  | "For Assessment"
  | "Approved"
  | "For Release"
  | "Released"
  | "Completed"
  | "Rejected"
  | "Needs Revision"

export interface ApplicationRecord {
  applicationNo: string
  assistance: string
  assistanceCategory: string
  dateApplied: string
  status: ApplicationStatus
  applicantName: string
  dateOfBirth: string
  address: string
  contactNumber: string
  email?: string
  remarks?: string
  deletedAt?: string
  sex?: string
  submittedAt?: string
  approvedDate?: string
  photoUrl?: string
  disabilityType?: string
  [key: string]: any
}

export function isTrainingApplication(app?: { assistance?: string; assistanceCategory?: string } | null) {
  if (!app) return false
  const cat = String(app.assistanceCategory || "").toLowerCase()
  const ast = String(app.assistance || "").toLowerCase()
  return (
    cat.includes("training") ||
    ast.includes("training") ||
    isTrainingService(`${cat} ${ast}`)
  )
}

export function isIdOrDocumentApplication(app?: { assistance?: string; assistanceCategory?: string } | null) {
  if (!app || isTrainingApplication(app)) return false
  return isIdOrDocumentService(`${app.assistanceCategory || ""} ${app.assistance || ""}`)
}

export function getApplicantPhotoUrl(app: any): string {
  if (!app) return ""

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
    app.profilePhoto ||
    app.image ||
    app.imageUrl ||
    app.formData?.applicantPhoto ||
    app.formData?.photoUrl ||
    app.formData?.idPhoto ||
    app.form_data?.applicantPhoto ||
    app.form_data?.photoUrl ||
    app.form_data?.idPhoto ||
    app.extra_data?.applicantPhoto ||
    app.extra_data?.photoUrl ||
    app.extra_data?.idPhoto
  if (direct && typeof direct === "string" && !direct.toLowerCase().includes("sample")) {
    if (direct.startsWith("data:") || direct.startsWith("http://") || direct.startsWith("https://") || direct.startsWith("blob:")) {
      return direct
    }
    if (direct.startsWith("/")) return `${API_BASE}${direct}`
    if (direct.startsWith("uploads/")) return `${API_BASE}/${direct}`
    return `${API_BASE}/uploads/${direct}`
  }

  // 1. Direct document list on app
  let docsList: any[] = []
  if (Array.isArray(app.documents)) docsList = app.documents
  else if (Array.isArray(app.uploaded_documents)) docsList = app.uploaded_documents
  else if (Array.isArray(app.form_data?.uploaded_documents)) docsList = app.form_data.uploaded_documents
  else if (Array.isArray(app.formData?.uploaded_documents)) docsList = app.formData.uploaded_documents

  const flatDocs: any[] = []
  for (const item of docsList) {
    if (!item) continue
    if (Array.isArray(item.files)) {
      for (const f of item.files) {
        flatDocs.push({ ...f, name: f.name || item.name || item.documentLabel || item.documentId || "" })
      }
    } else {
      flatDocs.push(item)
    }
  }

  const photoDoc = flatDocs.find((d: any) =>
    /2x2|photo|picture|id_pic|avatar/i.test(d.name || d.filename || d.documentLabel || d.documentId || "")
  )
  if (photoDoc) {
    const raw = photoDoc.dataUrl || photoDoc.previewUrl || photoDoc.data_url || photoDoc.fileUrl || photoDoc.url || photoDoc.path || photoDoc.filename
    if (raw && typeof raw === "string" && !raw.toLowerCase().includes("sample")) {
      if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("blob:")) return raw
      if (raw.startsWith("/")) return `${API_BASE}${raw}`
      return `${API_BASE}/uploads/${raw}`
    }
  }

  // 2. Search in local storage applications
  try {
    const pwdApps = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
    const match = pwdApps.find(
      (p: any) =>
        p.referenceNumber === app.applicationNo ||
        p.assignedIdNumber === app.applicationNo ||
        (p.firstName && app.applicantName && app.applicantName.toLowerCase().includes(p.firstName.toLowerCase()))
    )
    if (match?.documents && Array.isArray(match.documents)) {
      const pDoc = match.documents.find((d: any) =>
        /2x2|photo|picture|id_pic|avatar/i.test(d.name || d.filename || "")
      )
      if (pDoc) {
        const raw = pDoc.dataUrl || pDoc.previewUrl || pDoc.fileUrl || pDoc.url || pDoc.path || pDoc.filename
        if (raw && !raw.toLowerCase().includes("sample")) {
          if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("blob:")) return raw
          if (raw.startsWith("/")) return `${API_BASE}${raw}`
          return `${API_BASE}/uploads/${raw}`
        }
      }
    }
  } catch {}

  try {
    const spApps = JSON.parse(localStorage.getItem("solo_parent_applications") || "[]")
    const match = spApps.find(
      (s: any) =>
        s.reference_number === app.applicationNo ||
        s.referenceNumber === app.applicationNo ||
        s.assigned_id_number === app.applicationNo ||
        s.id === app.id
    )
    if (match?.applicantPhoto && typeof match.applicantPhoto === "string") {
      return match.applicantPhoto
    }
    if (match?.documents && Array.isArray(match.documents)) {
      const pDoc = match.documents.find((d: any) =>
        /2x2|photo|picture|id_pic|avatar/i.test(d.name || d.filename || "")
      )
      if (pDoc) {
        const raw = pDoc.dataUrl || pDoc.previewUrl || pDoc.fileUrl || pDoc.url || pDoc.path || pDoc.filename
        if (raw && !raw.toLowerCase().includes("sample")) {
          if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("blob:")) return raw
          if (raw.startsWith("/")) return `${API_BASE}${raw}`
          return `${API_BASE}/uploads/solo-parent/${raw}`
        }
      }
    }
  } catch {}

  const profile = getCurrentUserProfile()
  const pPhoto = (profile as any)?.photo || (profile as any)?.photoUrl || (profile as any)?.avatar
  if (pPhoto && typeof pPhoto === "string" && !pPhoto.toLowerCase().includes("sample")) {
    if (pPhoto.startsWith("data:") || pPhoto.startsWith("http://") || pPhoto.startsWith("https://") || pPhoto.startsWith("blob:")) return pPhoto
    if (pPhoto.startsWith("/")) return `${API_BASE}${pPhoto}`
    return `${API_BASE}/uploads/${pPhoto}`
  }

  return ""
}

const loadImageSafely = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function getEmergencyInfo(app: ApplicationRecord) {
  let localEmergencyName = ""
  let localEmergencyPhone = ""
  let localEmergencyRel = ""
  let localEmergencyAddr = ""

  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("userProfile") || localStorage.getItem("user")
    if (raw) {
      const u = JSON.parse(raw)
      const uQcid = u.qcidNumber || u.qcid_number || u.qcidNo || u.qcid || u.reference_number
      const uEmail = u.email
      if (
        (uQcid && uQcid === app.applicationNo) ||
        (uEmail && app.email && uEmail.toLowerCase() === app.email.toLowerCase()) ||
        (u.lastName && app.applicantName && app.applicantName.toLowerCase().includes(u.lastName.toLowerCase()))
      ) {
        localEmergencyName = [u.emergencyFirstName, u.emergencyLastName].filter(Boolean).join(" ") || u.emergencyName || ""
        localEmergencyPhone = u.emergencyContactNo || u.emergencyPhone || ""
        localEmergencyRel = u.emergencyRelationship || ""
        localEmergencyAddr = u.emergencyAddress || ""
      }
    }
  } catch {}

  try {
    const pwdApps = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
    const match = pwdApps.find(
      (p: any) =>
        p.referenceNumber === app.applicationNo ||
        p.assignedIdNumber === app.applicationNo ||
        (p.firstName && app.applicantName && app.applicantName.toLowerCase().includes(p.firstName.toLowerCase()))
    )
    if (match) {
      if (!localEmergencyName) localEmergencyName = [match.emergencyFirstName, match.emergencyLastName].filter(Boolean).join(" ") || match.emergencyName || match.guardianName || ""
      if (!localEmergencyPhone) localEmergencyPhone = match.emergencyContactNo || match.emergencyPhone || match.guardianContact || ""
      if (!localEmergencyRel) localEmergencyRel = match.emergencyRelationship || match.relationshipToApplicant || ""
      if (!localEmergencyAddr) localEmergencyAddr = match.emergencyResidentialAddress || match.emergencyAddress || match.guardianAddress || ""
    }
  } catch {}

  const emergencyPerson =
    (app as any).emergencyContactPerson ||
    (app as any).emergencyPerson ||
    (app as any).emergencyName ||
    localEmergencyName ||
    "CLARENCE MILLARES"

  const emergencyPhone =
    (app as any).emergencyContactNo ||
    (app as any).emergencyPhone ||
    localEmergencyPhone ||
    (app.contactNumber && app.contactNumber.length > 5 ? app.contactNumber : "09283747392")

  const emergencyRel =
    (app as any).emergencyRelationship ||
    localEmergencyRel ||
    "Relative"

  const emergencyAddr =
    (app as any).emergencyAddress ||
    localEmergencyAddr ||
    app.address ||
    "11, ACACIA ST., SAUYO, QUEZON CITY"

  return {
    emergencyPerson,
    emergencyPhone,
    emergencyRel,
    emergencyAddr,
  }
}

interface CardTheme {
  isPwd: boolean
  isSolo: boolean
  isSenior: boolean
  headerStart: string
  headerEnd: string
  subheaderBg: string
  subheaderText: string
  idTitle: string
  idSubTitle: string
  badgeText: string
  pillText: string
  officeName: string
  legalAct: string
  photoTag: string
  classification: string
}

function getCardTheme(app: ApplicationRecord): CardTheme {
  const isPwd =
    app.assistanceCategory === "PWD" ||
    app.assistance.toLowerCase().includes("pwd") ||
    app.assistance.toLowerCase().includes("disability")
  const isSolo =
    app.assistanceCategory === "Solo Parent" ||
    app.assistance.toLowerCase().includes("solo")
  const isSenior =
    app.assistanceCategory === "Senior Citizen" ||
    app.assistance.toLowerCase().includes("senior") ||
    (!isPwd && !isSolo)

  if (isPwd) {
    return {
      isPwd: true,
      isSolo: false,
      isSenior: false,
      headerStart: "#d97706",
      headerEnd: "#b45309",
      subheaderBg: "#0f172a",
      subheaderText: "#fcd34d",
      idTitle: "PERSON WITH DISABILITY ID",
      idSubTitle: "PERSONS WITH DISABILITY AFFAIRS OFFICE",
      badgeText: "QC PDAO",
      pillText: "PDAO CARD",
      officeName: "PERSONS WITH DISABILITY AFFAIRS OFFICE",
      legalAct: "Republic Act 7277 / RA 9442 — Magna Carta for PWDs",
      photoTag: "QC PDAO",
      classification: (app as any).disabilityType || "Visual Disability",
    }
  }

  if (isSolo) {
    return {
      isPwd: false,
      isSolo: true,
      isSenior: false,
      headerStart: "#1d4ed8",
      headerEnd: "#1e40af",
      subheaderBg: "#f59e0b",
      subheaderText: "#0f172a",
      idTitle: "SOLO PARENT ID CARD",
      idSubTitle: "SOLO PARENTS WELFARE DIVISION",
      badgeText: "QC SP",
      pillText: "SOLO PARENT CARD",
      officeName: "SOLO PARENTS WELFARE DIVISION",
      legalAct: "Republic Act 8972 / RA 11861 — Solo Parents' Welfare Act",
      photoTag: "QC SP",
      classification: "Solo Parent Welfare Beneficiary",
    }
  }

  // Default: Senior Citizen (OSCA)
  return {
    isPwd: false,
    isSolo: false,
    isSenior,
    headerStart: "#1d4ed8",
    headerEnd: "#1e40af",
    subheaderBg: "#f59e0b",
    subheaderText: "#0f172a",
    idTitle: "SENIOR CITIZEN OSCA ID",
    idSubTitle: "OFFICE FOR SENIOR CITIZENS AFFAIRS",
    badgeText: "QC OSCA",
    pillText: "OSCA CARD",
    officeName: "OFFICE FOR SENIOR CITIZENS AFFAIRS",
    legalAct: "Republic Act 9994 — Expanded Senior Citizens Act",
    photoTag: "QC OSCA",
    classification: "Senior Citizen Welfare Beneficiary",
  }
}

// ── DRAW FRONT SIDE ON CANVAS (1000 x 630 px) ──
function drawFrontCard(
  ctx: CanvasRenderingContext2D,
  app: ApplicationRecord,
  theme: CardTheme,
  photoImg: HTMLImageElement | null,
  sealImg: HTMLImageElement | null,
  ox = 0,
  oy = 0
) {
  const w = 1000
  const h = 630

  const issueDateObj = new Date(app.submittedAt || Date.now())
  const validIssueDate = isNaN(issueDateObj.getTime()) ? new Date() : issueDateObj
  const appDate = validIssueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const expiryDateObj = new Date(validIssueDate)
  expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1)
  const expiryDateStr = expiryDateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  ctx.save()
  ctx.translate(ox, oy)

  // 1. Card Background & Border
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)

  const bgGrad = ctx.createLinearGradient(0, 0, w, h)
  if (theme.isPwd) {
    bgGrad.addColorStop(0, "#fffbeb")
    bgGrad.addColorStop(0.5, "#ffffff")
    bgGrad.addColorStop(1, "#fefce8")
  } else {
    bgGrad.addColorStop(0, "#eff6ff")
    bgGrad.addColorStop(0.5, "#ffffff")
    bgGrad.addColorStop(1, "#f0fdf4")
  }
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, w, h)

  // 2. Top Header Gradient (Blue / Amber)
  const headGrad = ctx.createLinearGradient(0, 0, w, 0)
  headGrad.addColorStop(0, theme.headerStart)
  headGrad.addColorStop(1, theme.headerEnd)
  ctx.fillStyle = headGrad
  ctx.fillRect(0, 0, w, 88)

  // Header QC Seal
  if (sealImg) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(60, 44, 28, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
    ctx.fill()
    ctx.drawImage(sealImg, 34, 18, 52, 52)
    ctx.restore()
  }

  // Header Titles
  ctx.fillStyle = theme.isPwd ? "#1e293b" : "#dbeafe"
  ctx.font = "bold 13px sans-serif"
  ctx.fillText("REPUBLIC OF THE PHILIPPINES", 100, 36)
  ctx.fillStyle = theme.isPwd ? "#0f172a" : "#ffffff"
  ctx.font = "900 24px sans-serif"
  ctx.fillText("GOV SERVICES", 100, 68)

  // Header Right Pill Badge
  const pillW = 180
  const pillH = 38
  const pillX = w - pillW - 30
  const pillY = 25
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)"
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(pillX, pillY, pillW, pillH, 19)
  } else {
    ctx.rect(pillX, pillY, pillW, pillH)
  }
  ctx.fill()
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = "#ffffff"
  ctx.font = "900 15px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(theme.pillText, pillX + pillW / 2, pillY + 24)
  ctx.textAlign = "left"

  // 3. Sub-header (Yellow/Amber or Dark Bar)
  ctx.fillStyle = theme.isPwd ? "#0f172a" : "#f59e0b"
  ctx.fillRect(0, 88, w, 36)
  ctx.fillStyle = theme.isPwd ? "#fcd34d" : "#0f172a"
  ctx.font = "900 14px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(theme.officeName, w / 2, 111)
  ctx.textAlign = "left"

  // 4. 2x2 Photo Box (Left)
  const photoX = 35
  const photoY = 145
  const photoW = 190
  const photoH = 245

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(photoX, photoY, photoW, photoH)
  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 2.5
  ctx.strokeRect(photoX, photoY, photoW, photoH)

  if (photoImg) {
    ctx.drawImage(photoImg, photoX, photoY, photoW, photoH - 30)
  } else {
    ctx.fillStyle = "#64748b"
    ctx.font = "bold 18px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("2x2 PHOTO", photoX + photoW / 2, photoY + 110)
    ctx.textAlign = "left"
  }

  // Photo Tag at bottom
  ctx.fillStyle = theme.isPwd ? "#d97706" : "#1e3a8a"
  ctx.fillRect(photoX, photoY + photoH - 30, photoW, 30)
  ctx.fillStyle = "#ffffff"
  ctx.font = "900 13px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(theme.photoTag, photoX + photoW / 2, photoY + photoH - 10)
  ctx.textAlign = "left"

  // 5. Details Section (Center)
  const infoX = 250
  let currY = 168

  // QC ID NUMBER
  ctx.fillStyle = "#94a3b8"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText("QC ID NUMBER", infoX, currY)
  ctx.fillStyle = theme.isPwd ? "#b45309" : "#1e3a8a"
  ctx.font = "900 24px monospace"
  ctx.fillText(app.applicationNo, infoX, currY + 26)

  // CARDHOLDER FULL NAME
  currY += 66
  ctx.fillStyle = "#94a3b8"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText("CARDHOLDER FULL NAME", infoX, currY)
  ctx.fillStyle = "#0f172a"
  ctx.font = "900 21px sans-serif"
  ctx.fillText((app.applicantName || "RESIDENT").toUpperCase(), infoX, currY + 24)

  // CLASSIFICATION
  currY += 58
  ctx.fillStyle = "#94a3b8"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText(theme.isPwd ? "TYPE OF DISABILITY" : "CLASSIFICATION", infoX, currY)
  ctx.fillStyle = theme.isPwd ? "#b91c1c" : "#065f46"
  ctx.font = "900 16px sans-serif"
  ctx.fillText(theme.classification, infoX, currY + 22)

  // BIRTHDATE & SEX / BLOOD
  currY += 54
  ctx.fillStyle = "#64748b"
  ctx.font = "bold 13px sans-serif"
  ctx.fillText(`BIRTHDATE: ${app.dateOfBirth || "—"}`, infoX, currY)
  ctx.fillText(`SEX / BLOOD: ${app.sex || "Male"} / O+`, infoX + 270, currY)

  // ADDRESS
  currY += 34
  ctx.fillStyle = "#64748b"
  ctx.font = "bold 13px sans-serif"
  ctx.fillText(`ADDRESS: ${app.address || "11 ACACIA ST., SAUYO, QUEZON CITY"}`, infoX, currY, 520)

  // 6. Right Side Authentic QC Seal
  if (sealImg) {
    ctx.drawImage(sealImg, 795, 175, 155, 155)
    ctx.fillStyle = "#475569"
    ctx.font = "900 12px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("QC SEAL", 872, 355)
    ctx.textAlign = "left"
  }

  // 7. Bottom Bar (Barcode & Mayor Signature)
  const botY = h - 85
  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(0, botY, w, 85)
  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, botY)
  ctx.lineTo(w, botY)
  ctx.stroke()

  // Barcode
  ctx.fillStyle = "#334155"
  ctx.font = "bold 20px monospace"
  ctx.fillText("|||| | || |||| | | ||| ||||", 35, botY + 36)

  // Issue / Expiry
  ctx.fillStyle = "#64748b"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText(`Issued: ${appDate}`, 35, botY + 62)
  ctx.fillStyle = "#92400e"
  ctx.font = "900 12px sans-serif"
  ctx.fillText(`• Expires: ${expiryDateStr}`, 220, botY + 62)

  // Mayor Signature Line
  ctx.strokeStyle = "#94a3b8"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(w - 320, botY + 40)
  ctx.lineTo(w - 40, botY + 40)
  ctx.stroke()

  ctx.fillStyle = "#0f172a"
  ctx.font = "900 14px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("MA. JOSEFINA G. BELMONTE", w - 180, botY + 34)
  ctx.font = "bold 11px sans-serif"
  ctx.fillStyle = "#64748b"
  ctx.fillText("CITY MAYOR", w - 180, botY + 58)
  ctx.textAlign = "left"

  ctx.restore()
}

// ── DRAW BACK SIDE ON CANVAS (1000 x 630 px) ──
function drawBackCard(
  ctx: CanvasRenderingContext2D,
  app: ApplicationRecord,
  theme: CardTheme,
  sealImg: HTMLImageElement | null,
  ox = 0,
  oy = 0
) {
  const w = 1000
  const h = 630

  const emergencyInfo = getEmergencyInfo(app)
  const issueDateObj = new Date(app.submittedAt || Date.now())
  const validIssueDate = isNaN(issueDateObj.getTime()) ? new Date() : issueDateObj
  const appDate = validIssueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const expiryDateObj = new Date(validIssueDate)
  expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1)
  const expiryDateStr = expiryDateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  ctx.save()
  ctx.translate(ox, oy)

  // 1. Background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)

  const bgGrad = ctx.createLinearGradient(0, 0, w, h)
  if (theme.isPwd) {
    bgGrad.addColorStop(0, "#fffbeb")
    bgGrad.addColorStop(0.5, "#ffffff")
    bgGrad.addColorStop(1, "#fefce8")
  } else {
    bgGrad.addColorStop(0, "#eff6ff")
    bgGrad.addColorStop(0.5, "#ffffff")
    bgGrad.addColorStop(1, "#f0fdf4")
  }
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, w, h)

  // Watermark Seal (Center Background)
  if (sealImg) {
    ctx.save()
    ctx.globalAlpha = 0.05
    ctx.drawImage(sealImg, 350, 165, 300, 300)
    ctx.restore()
  }

  // 2. Top Header
  const headGrad = ctx.createLinearGradient(0, 0, w, 0)
  headGrad.addColorStop(0, theme.headerStart)
  headGrad.addColorStop(1, theme.headerEnd)
  ctx.fillStyle = headGrad
  ctx.fillRect(0, 0, w, 68)

  if (sealImg) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(45, 34, 20, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
    ctx.fill()
    ctx.drawImage(sealImg, 27, 16, 36, 36)
    ctx.restore()
  }

  ctx.fillStyle = theme.isPwd ? "#0f172a" : "#ffffff"
  ctx.font = "900 17px sans-serif"
  ctx.fillText(theme.legalAct, 75, 41)

  // Right pill badge
  const pillW = 120
  const pillH = 34
  const pillX = w - pillW - 25
  const pillY = 17
  ctx.fillStyle = theme.isPwd ? "#0f172a" : "#fbbf24"
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(pillX, pillY, pillW, pillH, 17)
  } else {
    ctx.rect(pillX, pillY, pillW, pillH)
  }
  ctx.fill()
  ctx.fillStyle = theme.isPwd ? "#fcd34d" : "#0f172a"
  ctx.font = "900 14px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(theme.photoTag, pillX + pillW / 2, pillY + 22)
  ctx.textAlign = "left"

  // 3. Benefits Box
  const boxX = 35
  const boxY = 88
  const boxW = 930
  const boxH = 205

  ctx.fillStyle = theme.isPwd ? "rgba(254, 243, 199, 0.75)" : "rgba(239, 246, 255, 0.75)"
  ctx.strokeStyle = theme.isPwd ? "#fde68a" : "#bfdbfe"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(boxX, boxY, boxW, boxH, 16)
  } else {
    ctx.rect(boxX, boxY, boxW, boxH)
  }
  ctx.fill()
  ctx.stroke()

  let lineY = boxY + 45
  // Benefit 1
  ctx.fillStyle = theme.isPwd ? "#b45309" : "#1d4ed8"
  ctx.font = "bold 20px sans-serif"
  ctx.fillText("✓", boxX + 25, lineY)
  ctx.fillStyle = "#0f172a"
  ctx.font = "bold 16px sans-serif"
  ctx.fillText("20% Discount & VAT Exemption on medicines, medical supplies, and dental services.", boxX + 55, lineY)

  // Benefit 2
  lineY += 52
  ctx.fillStyle = theme.isPwd ? "#b45309" : "#1d4ed8"
  ctx.font = "bold 20px sans-serif"
  ctx.fillText("✓", boxX + 25, lineY)
  ctx.fillStyle = "#0f172a"
  ctx.font = "bold 16px sans-serif"
  ctx.fillText("20% Discount on public domestic transportation (air, sea, land, MRT/LRT), hotels, and restaurants.", boxX + 55, lineY)

  // Benefit 3
  lineY += 52
  ctx.fillStyle = theme.isPwd ? "#b45309" : "#1d4ed8"
  ctx.font = "bold 20px sans-serif"
  ctx.fillText("✓", boxX + 25, lineY)
  ctx.fillStyle = "#334155"
  ctx.font = "16px sans-serif"
  ctx.fillText("Valid from ", boxX + 55, lineY)
  ctx.font = "900 16px sans-serif"
  ctx.fillStyle = "#0f172a"
  ctx.fillText(appDate, boxX + 138, lineY)
  ctx.font = "16px sans-serif"
  ctx.fillStyle = "#334155"
  ctx.fillText(" to ", boxX + 285, lineY)
  ctx.font = "900 16px sans-serif"
  ctx.fillStyle = "#0f172a"
  ctx.fillText(expiryDateStr, boxX + 310, lineY)
  ctx.font = "16px sans-serif"
  ctx.fillStyle = "#334155"
  ctx.fillText(" across all cities in the Philippines.", boxX + 455, lineY)

  // 4. Divider Line
  ctx.strokeStyle = theme.isPwd ? "#fde68a" : "#bfdbfe"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(35, 318)
  ctx.lineTo(w - 35, 318)
  ctx.stroke()

  // 5. Emergency Notification Box
  const emY = 338
  ctx.fillStyle = "#0f172a"
  ctx.font = "900 14px sans-serif"
  ctx.fillText("IN CASE OF EMERGENCY, PLEASE NOTIFY:", boxX + 10, emY + 14)

  const cardY = emY + 26
  const cardH = 225
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
  ctx.strokeStyle = theme.isPwd ? "#fde68a" : "#bfdbfe"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(boxX, cardY, boxW, cardH, 16)
  } else {
    ctx.rect(boxX, cardY, boxW, cardH)
  }
  ctx.fill()
  ctx.stroke()

  // 2x2 Grid inside Emergency card
  const col1X = boxX + 30
  const col2X = boxX + 480

  // Row 1: Contact Person & Phone
  ctx.fillStyle = "#94a3b8"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText("CONTACT PERSON:", col1X, cardY + 45)
  ctx.fillStyle = "#0f172a"
  ctx.font = "900 18px sans-serif"
  ctx.fillText(emergencyInfo.emergencyPerson.toUpperCase(), col1X + 145, cardY + 45)

  ctx.fillStyle = "#94a3b8"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText("PHONE:", col2X, cardY + 45)
  ctx.fillStyle = theme.isPwd ? "#b45309" : "#1d4ed8"
  ctx.font = "900 18px monospace"
  ctx.fillText(emergencyInfo.emergencyPhone, col2X + 65, cardY + 45)

  // Row 2: Relation & Address
  ctx.fillStyle = "#94a3b8"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText("RELATION:", col1X, cardY + 115)
  ctx.fillStyle = "#1e293b"
  ctx.font = "bold 16px sans-serif"
  ctx.fillText(emergencyInfo.emergencyRel, col1X + 90, cardY + 115)

  ctx.fillStyle = "#94a3b8"
  ctx.font = "bold 12px sans-serif"
  ctx.fillText("ADDRESS:", col2X, cardY + 115)
  ctx.fillStyle = "#1e293b"
  ctx.font = "bold 15px sans-serif"
  ctx.fillText(emergencyInfo.emergencyAddr, col2X + 80, cardY + 115, 380)

  ctx.restore()
}

/**
 * Generate and download a high-resolution authentic Quezon City Digital ID Card PNG
 */
export async function downloadIdCardAsImage(
  app: ApplicationRecord,
  photoUrl?: string,
  mode: "front" | "back" = "front"
) {
  const theme = getCardTheme(app)

  // Preload Images Safely
  const [sealImg, photoImg] = await Promise.all([
    loadImageSafely("/gov-serves-seal.png"),
    photoUrl ? loadImageSafely(photoUrl) : Promise.resolve(null),
  ])

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  canvas.width = 1000
  canvas.height = 630

  if (mode === "front") {
    drawFrontCard(ctx, app, theme, photoImg, sealImg, 0, 0)
    const link = document.createElement("a")
    link.download = `QC_ID_FRONT_${app.applicationNo}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  } else {
    drawBackCard(ctx, app, theme, sealImg, 0, 0)
    const link = document.createElement("a")
    link.download = `QC_ID_BACK_${app.applicationNo}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }
}

function ApplicantPhotoDisplay({
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
      } catch {}
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
      } catch {}
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
        className={`absolute bottom-0 inset-x-0 text-white text-[6.5px] text-center py-0.5 font-bold uppercase ${
          isPwd ? "bg-amber-600" : tag.includes("SOLO") || tag.includes("SSDD") ? "bg-red-900" : "bg-blue-900"
        }`}
      >
        {tag}
      </div>
    </div>
  )
}

/**
 * Dedicated Official Digital ID Card Modal matching official QC OSCA & PDAO standards
 */
function OfficialFrontCardView({
  app,
  theme,
  photoUrl,
  appDate,
  expiryDateStr,
  cardRef,
}: {
  app: ApplicationRecord
  theme: CardTheme
  photoUrl: string
  appDate: string
  expiryDateStr: string
  cardRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={cardRef}
      className="w-[500px] h-[315px] rounded-2xl overflow-hidden shadow-xl border border-slate-300 relative bg-white select-none text-slate-900 flex flex-col justify-between"
      style={{
        background: theme.isPwd
          ? "linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fefce8 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)",
      }}
    >
      {/* Top Header */}
      <div>
        <div
          className={`px-3.5 py-2 flex items-center justify-between shadow-xs ${
            theme.isPwd
              ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950"
              : "bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <img
              src="/gov-serves-seal.png"
              alt="QC Seal"
              crossOrigin="anonymous"
              className="w-7 h-7 object-contain drop-shadow-xs rounded-full bg-white/20 p-0.5"
            />
            <div>
              <p className={`text-[7.5px] font-bold tracking-widest uppercase leading-tight ${theme.isPwd ? "text-slate-800" : "text-blue-100 opacity-90"}`}>
                Republic of the Philippines
              </p>
              <p className={`text-xs font-black tracking-wide leading-tight uppercase ${theme.isPwd ? "text-slate-950" : "text-white"}`}>
                GOV SERVICES
              </p>
            </div>
          </div>
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              theme.isPwd
                ? "bg-slate-950 text-amber-300 border-slate-800 shadow-xs"
                : "bg-white/20 text-white border-white/30"
            }`}
          >
            {theme.pillText}
          </span>
        </div>

        {/* Sub-header */}
        <div
          className={`py-1 text-center text-[9.5px] font-black uppercase tracking-widest ${
            theme.isPwd
              ? "bg-slate-950 text-amber-300 border-b border-amber-500/40"
              : "bg-amber-400 text-slate-950"
          }`}
        >
          {theme.officeName}
        </div>
      </div>

      {/* Middle Details with QC Logo on right side */}
      <div className="px-3.5 py-2 flex gap-3 items-center relative flex-1">
        {/* 2x2 Photo with error fallback */}
        <ApplicantPhotoDisplay
          photoUrl={photoUrl}
          tag={theme.photoTag}
          isPwd={theme.isPwd}
        />

        {/* Details text */}
        <div className="flex-1 min-w-0 space-y-1 relative z-10">
          <div>
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">QC ID NUMBER</span>
            <p className={`text-sm font-black font-mono tracking-wide leading-none ${theme.isPwd ? "text-amber-700" : "text-blue-900"}`}>
              {app.applicationNo}
            </p>
          </div>

          <div className="pt-0.5">
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">CARDHOLDER FULL NAME</span>
            <p className="text-xs font-black text-slate-900 leading-tight uppercase truncate">{app.applicantName || "RESIDENT"}</p>
          </div>

          <div className="pt-0.5">
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">
              {theme.isPwd ? "TYPE OF DISABILITY" : "CLASSIFICATION"}
            </span>
            <p className={`text-[9.5px] font-bold leading-tight truncate ${theme.isPwd ? "text-red-700" : "text-emerald-800"}`}>
              {theme.classification}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 pt-0.5 text-[8.5px] text-slate-700">
            <div>
              <span className="text-[7px] font-semibold text-slate-400 uppercase">Birthdate:</span> {app.dateOfBirth || "—"}
            </div>
            <div>
              <span className="text-[7px] font-semibold text-slate-400 uppercase">Sex / Blood:</span> {app.sex || "Male"} / O+
            </div>
          </div>

          <div className="text-[8.5px] text-slate-700 truncate pt-0.5">
            <span className="text-[7px] font-semibold text-slate-400 uppercase">Address:</span> {app.address || "11 ACACIA ST., SAUYO, QUEZON CITY"}
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
      <div className="px-3.5 py-1.5 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between text-[7.5px]">
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

function OfficialBackCardView({
  theme,
  emergencyInfo,
  appDate,
  expiryDateStr,
  cardRef,
}: {
  theme: CardTheme
  emergencyInfo: ReturnType<typeof getEmergencyInfo>
  appDate: string
  expiryDateStr: string
  cardRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={cardRef}
      className="w-[500px] h-[315px] rounded-2xl overflow-hidden shadow-xl border border-slate-300 relative bg-white select-none flex flex-col justify-between text-slate-900"
      style={{
        background: theme.isPwd
          ? "linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fefce8 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)",
      }}
    >
      {/* Background Watermark Seal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0">
        <img src="/gov-serves-seal.png" alt="" crossOrigin="anonymous" className="w-48 h-48 object-contain" />
      </div>

      {/* Back Header Strip */}
      <div
        className={`px-3.5 py-1.5 flex items-center justify-between shadow-xs relative z-10 ${
          theme.isPwd
            ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950"
            : "bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <img
            src="/gov-serves-seal.png"
            alt="QC Seal"
            crossOrigin="anonymous"
            className="w-4 h-4 object-contain rounded-full bg-white/20 p-0.5"
          />
          <p className="text-[8.5px] font-black uppercase tracking-wide leading-tight">
            {theme.legalAct}
          </p>
        </div>
        <span
          className={`text-[7.5px] font-black px-2 py-0.5 rounded-full border shadow-xs ${
            theme.isPwd
              ? "bg-slate-950 text-amber-300 border-slate-800"
              : "bg-amber-400 text-slate-950 border-amber-500"
          }`}
        >
          {theme.photoTag}
        </span>
      </div>

      <div className="p-3 space-y-2 relative z-10 flex-1 flex flex-col justify-between">
        {/* Benefits / Rights List */}
        <div
          className={`rounded-xl p-2.5 space-y-1 text-[7.5px] text-slate-800 leading-tight border ${
            theme.isPwd ? "bg-amber-50/80 border-amber-200/80" : "bg-blue-50/80 border-blue-200/80"
          }`}
        >
          <p className="flex items-start gap-1.5">
            <span className={`font-bold shrink-0 ${theme.isPwd ? "text-amber-700" : "text-blue-700"}`}>✓</span>
            <span><strong>20% Discount &amp; VAT Exemption</strong> on medicines, medical supplies, and dental services.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className={`font-bold shrink-0 ${theme.isPwd ? "text-amber-700" : "text-blue-700"}`}>✓</span>
            <span><strong>20% Discount</strong> on public domestic transportation (air, sea, land, MRT/LRT), hotels, and restaurants.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className={`font-bold shrink-0 ${theme.isPwd ? "text-amber-700" : "text-blue-700"}`}>✓</span>
            <span>Valid from <strong className="text-slate-900">{appDate}</strong> to <strong className="text-slate-900">{expiryDateStr}</strong> across all cities in the Philippines.</span>
          </p>
        </div>

        {/* Emergency Contact */}
        <div className={`border-t pt-1.5 ${theme.isPwd ? "border-amber-200/70" : "border-blue-200/70"}`}>
          <p className="text-[7.5px] font-black text-slate-800 uppercase tracking-wider mb-1">In case of emergency, please notify:</p>
          <div
            className={`grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7px] text-slate-700 bg-white/90 p-2 rounded-xl border shadow-xs ${
              theme.isPwd ? "border-amber-200/60" : "border-blue-200/60"
            }`}
          >
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Contact Person: </span>
              <span className="font-bold text-slate-900 truncate">{emergencyInfo.emergencyPerson}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Phone: </span>
              <span className={`font-mono font-bold ${theme.isPwd ? "text-amber-700" : "text-blue-700"}`}>{emergencyInfo.emergencyPhone}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Relation: </span>
              <span className="font-semibold text-slate-800 truncate">{emergencyInfo.emergencyRel}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Address: </span>
              <span className="font-semibold text-slate-800 truncate">{emergencyInfo.emergencyAddr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Dedicated Official Digital ID Card Modal matching official QC OSCA & PDAO standards
 */
function DigitalIdCardModal({
  app,
  onClose,
}: {
  app: ApplicationRecord
  onClose: () => void
}) {
  const photoUrl = getApplicantPhotoUrl(app)
  const theme = getCardTheme(app)
  const emergencyInfo = getEmergencyInfo(app)
  const [activeSide, setActiveSide] = useState<"front" | "back">("front")
  const [isDownloading, setIsDownloading] = useState(false)

  const frontDownloadRef = useRef<HTMLDivElement>(null)
  const backDownloadRef = useRef<HTMLDivElement>(null)

  const issueDateObj = new Date(app.submittedAt || Date.now())
  const validIssueDate = isNaN(issueDateObj.getTime()) ? new Date() : issueDateObj
  const appDate = validIssueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const expiryDateObj = new Date(validIssueDate)
  expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1)
  const expiryDateStr = expiryDateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })


  const handleDownloadSide = async (mode: "front" | "back") => {
    setIsDownloading(true)
    try {
      const targetElement = mode === "front" ? frontDownloadRef.current : backDownloadRef.current
      if (targetElement) {
        // High-resolution rasterization centered perfectly with exact 500x315 dimensions
        const dataUrl = await toPng(targetElement, {
          pixelRatio: 3,
          cacheBust: true,
          quality: 1,
          width: 500,
          height: 315,
        })
        const link = document.createElement("a")
        link.download = `QC_ID_${mode.toUpperCase()}_${app.applicationNo}.png`
        link.href = dataUrl
        link.click()
      } else {
        await downloadIdCardAsImage(app, photoUrl, mode)
      }
    } catch (err) {
      console.warn("DOM to PNG failed, falling back to canvas:", err)
      await downloadIdCardAsImage(app, photoUrl, mode)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <IdCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-none">
                Official Quezon City {theme.isPwd ? "Persons with Disability (PWD) ID Card" : theme.isSolo ? "Solo Parent ID Card" : "Senior Citizen OSCA ID Card"}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                Card ID: <span className="text-blue-600 font-bold">{app.applicationNo}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── UNDERLINE NAVIGATION TABS ── */}
        <div className="border-b border-gray-200 px-6 flex gap-6 bg-white">
          <button
            type="button"
            onClick={() => setActiveSide("front")}
            className={`py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
              activeSide === "front"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            FRONT OF ID CARD
          </button>
          <button
            type="button"
            onClick={() => setActiveSide("back")}
            className={`py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
              activeSide === "back"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            BACK OF ID CARD (PRIVILEGES &amp; EMERGENCY)
          </button>
        </div>

        {/* ── CARD LIVE PREVIEWS ── */}
        <div className="p-6 bg-slate-100/70 flex items-center justify-center min-h-[380px] overflow-x-auto">
          {activeSide === "front" ? (
            <OfficialFrontCardView
              app={app}
              theme={theme}
              photoUrl={photoUrl}
              appDate={appDate}
              expiryDateStr={expiryDateStr}
            />
          ) : (
            <OfficialBackCardView
              theme={theme}
              emergencyInfo={emergencyInfo}
              appDate={appDate}
              expiryDateStr={expiryDateStr}
            />
          )}
        </div>

        {/* ── OFF-SCREEN CAPTURE CONTAINERS (Bound directly with 0 offset and exact dimensions) ── */}
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
          <OfficialFrontCardView
            cardRef={frontDownloadRef}
            app={app}
            theme={theme}
            photoUrl={photoUrl}
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
          <OfficialBackCardView
            cardRef={backDownloadRef}
            theme={theme}
            emergencyInfo={emergencyInfo}
            appDate={appDate}
            expiryDateStr={expiryDateStr}
          />
        </div>

        {/* ── MODAL FOOTER ACTION BAR ── */}
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

export default function MyApplications() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active")
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [deletedApplications, setDeletedApplications] = useState<ApplicationRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null)
  const [idCardApp, setIdCardApp] = useState<ApplicationRecord | null>(null)

  // Dialog modal states
  const [appToDelete, setAppToDelete] = useState<ApplicationRecord | null>(null)
  const [appToPermanentDelete, setAppToPermanentDelete] = useState<ApplicationRecord | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: "success" | "danger" } | null>(null)

  const showToast = (text: string, type: "success" | "danger" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // 1. SOFT DELETE (Move to Deleted)
  const handleConfirmDelete = async () => {
    if (!appToDelete) return
    setIsProcessing(true)
    const appNo = appToDelete.applicationNo
    const appAssistance = appToDelete.assistance
    const deletedRecord: ApplicationRecord = {
      ...appToDelete,
      deletedAt: new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }

    try {
      await fetch(`${API_BASE}/api/user-applications/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNo: appNo,
          referenceNo: appNo,
          category: appToDelete.assistanceCategory,
          assistance: appAssistance,
          applicantName: appToDelete.applicantName,
          email: appToDelete.email,
          dateOfBirth: appToDelete.dateOfBirth,
          address: appToDelete.address,
          contactNumber: appToDelete.contactNumber,
          status: appToDelete.status,
          dateApplied: appToDelete.dateApplied,
          reason: "Deleted by user from Application History",
          payload: deletedRecord,
        }),
      })

      // Update LocalStorage deleted items
      try {
        const storedDeleted: ApplicationRecord[] = JSON.parse(
          localStorage.getItem("deleted_user_applications") || "[]"
        )
        const updatedDeleted = [
          deletedRecord,
          ...storedDeleted.filter((d) => d.applicationNo !== appNo || d.assistance !== appAssistance),
        ]
        localStorage.setItem("deleted_user_applications", JSON.stringify(updatedDeleted))
      } catch {}

      // Update UI state immediately
      setApplications((prev) => prev.filter((a) => !(a.applicationNo === appNo && a.assistance === appAssistance)))
      setDeletedApplications((prev) => [
        deletedRecord,
        ...prev.filter((d) => !(d.applicationNo === appNo && d.assistance === appAssistance)),
      ])

      if (selectedApp?.applicationNo === appNo && selectedApp?.assistance === appAssistance) {
        setSelectedApp(null)
      }
      showToast(`Moved ${appAssistance} to Deleted Applications.`)
    } catch (err) {
      console.error("Failed deleting application:", err)
      showToast("An error occurred while deleting application.", "danger")
    } finally {
      setIsProcessing(false)
      setAppToDelete(null)
    }
  }

  // 2. RESTORE APPLICATION
  const handleRestore = async (app: ApplicationRecord) => {
    setIsProcessing(true)
    const appNo = app.applicationNo
    const appAssistance = app.assistance

    try {
      await fetch(`${API_BASE}/api/user-applications/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNo: appNo,
          referenceNo: appNo,
          category: app.assistanceCategory,
          assistance: appAssistance,
          applicantName: app.applicantName,
        }),
      })

      // Clean from LocalStorage deleted
      try {
        const storedDeleted: ApplicationRecord[] = JSON.parse(
          localStorage.getItem("deleted_user_applications") || "[]"
        )
        const updatedDeleted = storedDeleted.filter(
          (d) => !(d.applicationNo === appNo && d.assistance === appAssistance)
        )
        localStorage.setItem("deleted_user_applications", JSON.stringify(updatedDeleted))
      } catch {}

      // Update UI state
      setDeletedApplications((prev) =>
        prev.filter((d) => !(d.applicationNo === appNo && d.assistance === appAssistance))
      )
      setApplications((prev) => [
        app,
        ...prev.filter((a) => !(a.applicationNo === appNo && a.assistance === appAssistance)),
      ])

      if (selectedApp?.applicationNo === appNo && selectedApp?.assistance === appAssistance) {
        setSelectedApp(null)
      }
      showToast(`Successfully restored ${appAssistance} to active applications.`)
    } catch (err) {
      console.error("Failed restoring application:", err)
      showToast("Could not restore application at this time.", "danger")
    } finally {
      setIsProcessing(false)
    }
  }

  // 3. PERMANENT DELETE (Hard Delete from Database)
  const handleConfirmPermanentDelete = async () => {
    if (!appToPermanentDelete) return
    setIsProcessing(true)
    const appNo = appToPermanentDelete.applicationNo
    const appAssistance = appToPermanentDelete.assistance

    try {
      await fetch(`${API_BASE}/api/user-applications/permanent-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNo: appNo,
          referenceNo: appNo,
          category: appToPermanentDelete.assistanceCategory,
          assistance: appAssistance,
          applicantName: appToPermanentDelete.applicantName,
        }),
      })

      // Clean local storage caches completely
      try {
        const localPwd = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
        localStorage.setItem(
          "pwd_senior_applications",
          JSON.stringify(
            localPwd.filter((p: any) => p.assignedIdNumber !== appNo && p.referenceNumber !== appNo && p.id !== appNo)
          )
        )
      } catch {}

      try {
        const localLiv = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
        localStorage.setItem(
          "livelihood_applications",
          JSON.stringify(localLiv.filter((l: any) => l.reference_number !== appNo && l.qcid !== appNo))
        )
      } catch {}

      try {
        const localTrn = JSON.parse(localStorage.getItem("training_applications") || "[]")
        localStorage.setItem(
          "training_applications",
          JSON.stringify(localTrn.filter((t: any) => t.reference_number !== appNo && t.qcid !== appNo))
        )
      } catch {}

      try {
        const storedDeleted: ApplicationRecord[] = JSON.parse(
          localStorage.getItem("deleted_user_applications") || "[]"
        )
        const updatedDeleted = storedDeleted.filter(
          (d) => !(d.applicationNo === appNo && d.assistance === appAssistance)
        )
        localStorage.setItem("deleted_user_applications", JSON.stringify(updatedDeleted))
      } catch {}

      // Update UI state
      setDeletedApplications((prev) =>
        prev.filter((d) => !(d.applicationNo === appNo && d.assistance === appAssistance))
      )
      setApplications((prev) => prev.filter((a) => !(a.applicationNo === appNo && a.assistance === appAssistance)))

      if (selectedApp?.applicationNo === appNo && selectedApp?.assistance === appAssistance) {
        setSelectedApp(null)
      }
      showToast(`Permanently deleted ${appAssistance} from database.`, "danger")
    } catch (err) {
      console.error("Failed permanent deletion:", err)
      showToast("An error occurred during permanent deletion.", "danger")
    } finally {
      setIsProcessing(false)
      setAppToPermanentDelete(null)
    }
  }

  const isFetchingUserAppsRef = useRef(false)

  // Load active and deleted applications
  useEffect(() => {
    let isMounted = true

    const fetchUserApps = async () => {
      if (isFetchingUserAppsRef.current) return
      isFetchingUserAppsRef.current = true

      try {
        checkAndAutoReleaseScheduledDisbursements()

        const userProfile = getCurrentUserProfile()
        const qcId = (userProfile.qcidNo || "").trim()
        const userId = userProfile.id || localStorage.getItem("userId") || "1"
        const userEmail = (userProfile.email || "").trim().toLowerCase()
        const userFirst = (userProfile.firstName || "").trim().toLowerCase()
        const userLast = (userProfile.lastName || "").trim().toLowerCase()
        const userFull = `${userFirst} ${userLast}`.trim()

        const isUserMatch = (app: any): boolean => {
          if (!app) return false
          if (app.is_archived === true) return false

          // 1. Exact Email Match
          const appEmail = String(
            app.email ||
            app.guardian_email ||
            app.guardianEmail ||
            app.applicantInfo?.email ||
            app.applicant_info?.email ||
            app.formData?.email ||
            app.form_data?.email ||
            ""
          ).trim().toLowerCase()
          if (userEmail && appEmail && userEmail === appEmail) return true

          // 2. User ID Match
          const appUserId = String(app.user_id || app.userId || "").trim().toLowerCase()
          if (userId && appUserId && String(userId) === appUserId && String(userId) !== "0" && String(userId) !== "null" && String(userId) !== "undefined") {
            return true
          }

          // 3. QCID / Reference Number Match
          const appQc = String(
            app.qc_id ||
            app.qcid ||
            app.qcidNo ||
            app.qcidNumber ||
            app.qcid_number ||
            app.reference_no ||
            app.reference_number ||
            app.referenceNumber ||
            app.assignedIdNumber ||
            app.assigned_id_number ||
            app.solo_parent_id_number ||
            ""
          ).trim().toLowerCase()

          if (qcId && appQc && (appQc === qcId.toLowerCase() || appQc.includes(qcId.toLowerCase()) || qcId.toLowerCase().includes(appQc))) {
            return true
          }

          // 4. Full Name Match (Matches both first and last name of the user)
          const appFirst = String(
            app.firstName ||
            app.first_name ||
            app.guardian_first_name ||
            app.guardianFirstName ||
            app.applicantInfo?.firstName ||
            app.applicant_info?.firstName ||
            ""
          ).trim().toLowerCase()

          const appLast = String(
            app.lastName ||
            app.last_name ||
            app.guardian_last_name ||
            app.guardianLastName ||
            app.applicantInfo?.lastName ||
            app.applicant_info?.lastName ||
            ""
          ).trim().toLowerCase()

          const appFullName = String(
            app.full_name ||
            app.fullName ||
            app.applicantName ||
            app.applicant_name ||
            app.child_name ||
            app.childName ||
            app.applicantInfo?.fullName ||
            app.applicant_info?.fullName ||
            `${appFirst} ${appLast}`
          ).trim().toLowerCase()

          if (userFull && appFullName) {
            const firstWord = userFirst.split(" ")[0] || ""
            const lastWord = userLast.split(" ").pop() || ""

            if (firstWord && lastWord) {
              if (appFullName.includes(firstWord) && appFullName.includes(lastWord)) return true
              if (
                (appFirst.includes(firstWord) || firstWord.includes(appFirst)) &&
                (appLast.includes(lastWord) || lastWord.includes(appLast))
              ) {
                return true
              }
            } else if (firstWord) {
              if (appFullName.includes(firstWord) || appFirst.includes(firstWord)) return true
            }
          }

          return false
        }

        // Fetch deleted list from backend & local storage
        let initialDeleted: ApplicationRecord[] = []
        try {
          const storedDel = localStorage.getItem("deleted_user_applications")
          if (storedDel) initialDeleted = JSON.parse(storedDel)
        } catch {}

        try {
          const delData = await cachedApiFetch<any>(
            `${API_BASE}/api/user-applications/deleted?email=${encodeURIComponent(userEmail)}&qcid=${encodeURIComponent(
              qcId
            )}&name=${encodeURIComponent(userFirst + " " + userLast)}`,
            undefined,
            4000
          )
          if (delData?.applications && Array.isArray(delData.applications)) {
            const mappedDel: ApplicationRecord[] = delData.applications.map((d: any) => ({
              applicationNo: d.referenceNo || d.applicationId || "N/A",
              assistance: d.assistanceTitle || d.payload?.assistance || "Social Assistance",
              assistanceCategory: d.category || d.payload?.assistanceCategory || "General",
              dateApplied: d.payload?.dateApplied || new Date(d.archivedAt || Date.now()).toLocaleDateString("en-PH"),
              status: d.status || d.payload?.status || "Approved",
              applicantName:
                d.applicantName || d.payload?.applicantName || `${userProfile.firstName} ${userProfile.lastName}`,
              dateOfBirth: d.payload?.dateOfBirth || userProfile.birthDateDisplay,
              address:
                d.payload?.address ||
                `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
              contactNumber: d.payload?.contactNumber || userProfile.mobileNumber,
              email: d.email || userProfile.email,
              deletedAt: new Date(d.archivedAt || Date.now()).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            }))

            // Merge unique
            const mapKeys = new Set(initialDeleted.map((i) => i.applicationNo + i.assistance))
            mappedDel.forEach((m) => {
              if (!mapKeys.has(m.applicationNo + m.assistance)) {
                initialDeleted.push(m)
              }
            })
          }
        } catch (err) {
          console.warn("Could not fetch deleted applications:", err)
        }

        if (isMounted) {
          setDeletedApplications(initialDeleted)
        }
        const deletedKeySet = new Set(initialDeleted.map((d) => (d.applicationNo + "::" + d.assistance).toLowerCase()))

        const token = sessionStorage.getItem("token") || localStorage.getItem("token") || ""
        const sessionToken = sessionStorage.getItem("sessionToken") || localStorage.getItem("sessionToken") || ""
        const authHeaders: Record<string, string> = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(sessionToken ? { "x-session-token": sessionToken } : {}),
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        }

        let allFoundApps: ApplicationRecord[] = []

        // 1. AICS Applications
        try {
          const data = await cachedApiFetch<any>(`${API_BASE}/api/aics/applications?qcId=${encodeURIComponent(qcId)}`, { headers: authHeaders }, 4000)
          if (data?.applications && Array.isArray(data.applications)) {
            const mappedAics: ApplicationRecord[] = data.applications
              .filter(isUserMatch)
              .map((app: any) => {
                const rawType = (app.assistance_type || "Transportation").replace(/\s*assistance/gi, "").trim()
                const cleanAssistance = rawType.charAt(0).toUpperCase() + rawType.slice(1) + " Assistance"

                return {
                  applicationNo: app.qc_id || app.reference_no || app.reference_number || qcId,
                  assistance: cleanAssistance,
                  assistanceCategory: "AICS",
                  dateApplied: new Date(app.created_at || Date.now()).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                  status:
                    app.status === "approved"
                      ? "Approved"
                      : app.status === "released"
                      ? "Released"
                      : app.status === "for_release"
                      ? "For Release"
                      : app.status === "assessment"
                      ? "For Assessment"
                      : "Under Review",
                  applicantName: app.full_name || `${userProfile.firstName} ${userProfile.lastName}`,
                  dateOfBirth: app.birth_date || userProfile.birthDateDisplay,
                  address:
                    app.address ||
                    `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                  contactNumber: app.contact_number || userProfile.mobileNumber,
                  email: app.email || userProfile.email,
                }
              })
            allFoundApps.push(...mappedAics)
          }
        } catch (err) {
          console.warn("Could not fetch AICS applications:", err)
        }

        // 2. PWD & Senior Citizen Applications
        try {
          let apiPwdApps: any[] = []
          try {
            const pwdData = await cachedApiFetch<any>(`${API_BASE}/api/pwd-senior/applications`, { headers: authHeaders }, 4000)
            if (Array.isArray(pwdData)) {
              apiPwdApps = pwdData
            }
          } catch {}

          let localPwdApps: any[] = []
          try {
            localPwdApps = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
          } catch {}

          let pwdApps: any[] = []
          if (Array.isArray(apiPwdApps) && apiPwdApps.length > 0) {
            pwdApps = apiPwdApps
            try {
              localStorage.setItem("pwd_senior_applications", JSON.stringify(apiPwdApps))
            } catch {}
          } else if (Array.isArray(apiPwdApps)) {
            pwdApps = []
            try {
              localStorage.setItem("pwd_senior_applications", JSON.stringify([]))
            } catch {}
          } else {
            pwdApps = Array.isArray(localPwdApps) ? localPwdApps : []
          }

          const mappedPwd: ApplicationRecord[] = (pwdApps || [])
            .filter(isUserMatch)
            .map((p: any) => {
              const isPwd =
                String(p.category || "").toUpperCase() === "PWD" ||
                String(p.category || "").toLowerCase().includes("disability")
              const typeStr = String(p.type || "new").toLowerCase()
              const serviceTitle = isPwd
                ? typeStr === "assistance"
                  ? "PWD Social Assistance"
                  : typeStr === "renewal"
                  ? "Persons with Disability (PWD) ID Renewal"
                  : typeStr === "loss" || typeStr === "replacement"
                  ? "Persons with Disability (PWD) ID Replacement"
                  : "Persons with Disability (PWD) ID"
                : typeStr === "medicine-booklet"
                ? "Senior Citizen Medicine Booklet"
                : typeStr === "movie-booklet"
                ? "Senior Citizen Movie Booklet"
                : typeStr === "social-assistance"
                ? "Senior Citizen Social Assistance"
                : typeStr === "renewal"
                ? "Senior Citizen ID Renewal"
                : typeStr === "loss" || typeStr === "replacement"
                ? "Senior Citizen ID Replacement"
                : "Senior Citizen ID"

              let appStatus: ApplicationStatus = "Pending"
              if (p.status === "approved") appStatus = "Approved"
              else if (p.status === "released") appStatus = "Released"
              else if (p.status === "for_release") appStatus = "For Release"
              else if (p.status === "under_review" || p.status === "review") appStatus = "Under Review"

              const isBooklet =
                String(p.type || "").toLowerCase().includes("booklet") ||
                String(p.category || "").toLowerCase().includes("booklet")

              return {
                applicationNo: p.assignedIdNumber || p.referenceNumber || p.qcidNo || qcId,
                assistance: serviceTitle,
                assistanceCategory: isPwd ? "PWD" : "Senior Citizen",
                dateApplied: new Date(p.submittedAt || p.created_at || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status: appStatus,
                applicantName: [p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean).join(" "),
                dateOfBirth: p.dateOfBirth || userProfile.birthDateDisplay,
                address:
                  p.address ||
                  `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                contactNumber: p.contactNo || p.cellphoneNo || userProfile.mobileNumber,
                email: p.email || userProfile.email,
                remarks:
                  p.status === "approved"
                    ? isBooklet
                      ? `Approved. Official Booklet Number: ${p.assignedIdNumber || "Sent to your registered Gmail"}`
                      : `Approved. Assigned ID Number: ${p.assignedIdNumber || "Available at office"}`
                    : p.status === "rejected"
                    ? `Review required: ${p.rejectionReason || "Incomplete documentation."}`
                    : "Currently being reviewed by social worker.",
              }
            })
          allFoundApps.push(...mappedPwd)
        } catch (err) {
          console.warn("Could not fetch PWD/Senior applications:", err)
        }

        // 3. Solo Parent Applications
        try {
          let spApps: any[] = []
          try {
            const spData = await cachedApiFetch<any>(
              `${API_BASE}/api/solo-parent/user/${userId || "0"}?qcid=${encodeURIComponent(qcId)}&email=${encodeURIComponent(userEmail)}&firstName=${encodeURIComponent(userFirst)}&lastName=${encodeURIComponent(userLast)}`,
              { headers: authHeaders },
              4000
            )
            spApps = spData?.applications || (Array.isArray(spData) ? spData : [])
          } catch {}

          // Fallback check all admin apps if none found
          if (!spApps || spApps.length === 0) {
            try {
              const allSp = await cachedApiFetch<any>(`${API_BASE}/api/solo-parent/applications`, { headers: authHeaders }, 4000)
              const listAll = allSp?.applications || (Array.isArray(allSp) ? allSp : [])
              spApps = listAll.filter(isUserMatch)
            } catch {}
          }

          if (!spApps || spApps.length === 0) {
            try {
              const local = localStorage.getItem("solo_parent_applications")
              if (local) spApps = JSON.parse(local)
            } catch {}
          }

          if (Array.isArray(spApps) && spApps.length > 0) {
            const mappedSp: ApplicationRecord[] = spApps
              .filter(isUserMatch)
              .map((app: any) => ({
                applicationNo: app.reference_number || app.referenceNumber || app.assigned_id_number || app.solo_parent_id_number || qcId,
                assistance: `Solo Parent ID (${(app.application_type || app.applicationType || "New").charAt(0).toUpperCase() + (app.application_type || app.applicationType || "New").slice(1)})`,
                assistanceCategory: "Solo Parent",
                dateApplied: new Date(app.created_at || app.submittedAt || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status:
                  app.application_status === "approved" || app.status === "approved"
                    ? "Approved"
                    : app.application_status === "released" || app.status === "released"
                    ? "Released"
                    : app.application_status === "for_release" || app.status === "for_release"
                    ? "For Release"
                    : "Under Review",
                applicantName:
                  [app.first_name || app.firstName, app.last_name || app.lastName].filter(Boolean).join(" ") ||
                  `${userProfile.firstName} ${userProfile.lastName}`,
                dateOfBirth: userProfile.birthDateDisplay,
                address:
                  app.address ||
                  `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                contactNumber: app.contact_no || app.contact_number || app.contactNo || userProfile.mobileNumber,
                email: app.email || userProfile.email,
                remarks:
                  app.admin_notes ||
                  (app.application_status === "approved" || app.status === "approved"
                    ? app.assigned_id_number || app.solo_parent_id_number
                      ? `Approved. Official ID: ${app.assigned_id_number || app.solo_parent_id_number}`
                      : "Application approved"
                    : "Under review"),
              }))
            allFoundApps.push(...mappedSp)
          }
        } catch (err) {
          console.warn("Could not fetch Solo Parent applications:", err)
        }

        // 4. Child Welfare Applications
        try {
          let cwApps: any[] = []
          try {
            const cwData = await cachedApiFetch<any>(
              `${API_BASE}/api/child-welfare/user/${userId}?qcid=${encodeURIComponent(qcId)}&email=${encodeURIComponent(userEmail)}&firstName=${encodeURIComponent(userFirst)}&lastName=${encodeURIComponent(userLast)}`,
              { headers: authHeaders },
              4000
            )
            cwApps = cwData?.applications || (Array.isArray(cwData) ? cwData : [])
          } catch {}

          // Fallback check all admin apps if none found
          if (!cwApps || cwApps.length === 0) {
            try {
              const allCw = await cachedApiFetch<any>(`${API_BASE}/api/child-welfare/admin/all`, { headers: authHeaders }, 4000)
              const listAll = allCw?.applications || (Array.isArray(allCw) ? allCw : [])
              cwApps = listAll.filter(isUserMatch)
            } catch {}
          }

          if (!cwApps || cwApps.length === 0) {
            try {
              const local = localStorage.getItem("child_welfare_applications")
              if (local) cwApps = JSON.parse(local)
            } catch {}
          }

          if (Array.isArray(cwApps) && cwApps.length > 0) {
            const mappedCw: ApplicationRecord[] = cwApps
              .filter(isUserMatch)
              .map((app: any) => ({
                applicationNo: app.reference_number || app.referenceNumber || qcId,
                assistance: app.category_title || app.classification_title || "Child Welfare Assistance",
                assistanceCategory: "Child Welfare",
                dateApplied: new Date(app.created_at || app.submittedAt || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status:
                  app.application_status === "approved" || app.status === "approved"
                    ? "Approved"
                    : app.application_status === "released" || app.status === "released" || app.application_status === "completed" || app.status === "completed"
                    ? "Released"
                    : app.application_status === "rejected" || app.status === "rejected"
                    ? "Rejected"
                    : "Under Review",
                applicantName: app.child_name || app.childName || [app.guardian_first_name, app.guardian_last_name].filter(Boolean).join(" ") || "Beneficiary Child",
                dateOfBirth: userProfile.birthDateDisplay,
                address:
                  app.address ||
                  `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                contactNumber: app.guardian_contact_no || app.parentContactNo || app.contact_number || userProfile.mobileNumber,
                email: app.guardian_email || app.email || userProfile.email,
                remarks:
                  app.application_status === "approved" || app.status === "approved"
                    ? `Aprubado para sa Ayuda (₱${(Number(app.approved_amount) || 5000).toLocaleString()}) - Nakatala sa Financial Aid & Appointments`
                    : app.application_status === "released" || app.status === "released"
                    ? `Na-release na ang Ayuda (₱${(Number(app.approved_amount) || 5000).toLocaleString()})`
                    : app.application_status === "rejected" || app.status === "rejected"
                    ? (app.rejection_reason ? `Tinanggihan: ${app.rejection_reason}` : "Tinanggihan")
                    : "Kasalukuyang sinusuri (Under review)",
              }))
            allFoundApps.push(...mappedCw)
          }
        } catch (err) {
          console.warn("Could not fetch Child Welfare applications:", err)
        }

        // 5. Livelihood Applications
        try {
          let livApps: any[] = []
          try {
            const lData = await cachedApiFetch<any>(`${API_BASE}/api/livelihood/applications`, { headers: authHeaders }, 4000)
            livApps = lData?.applications || (Array.isArray(lData) ? lData : [])
          } catch {}

          if (livApps.length === 0 && (qcId || userId)) {
            try {
              const lData2 = await cachedApiFetch<any>(`${API_BASE}/api/livelihood/applications?qcid=${encodeURIComponent(qcId || userId)}`, { headers: authHeaders }, 4000)
              livApps = lData2?.applications || (Array.isArray(lData2) ? lData2 : [])
            } catch {}
          }

          try {
            const localLiv = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
            if (Array.isArray(localLiv) && localLiv.length > 0) {
              for (const la of localLiv) {
                const exists = livApps.some(
                  (a: any) =>
                    (a.id && la.id && a.id === la.id) ||
                    (a.reference_number && la.reference_number && a.reference_number === la.reference_number)
                )
                if (!exists) {
                  livApps.push(la)
                }
              }
            }
          } catch {}

          if (Array.isArray(livApps) && livApps.length > 0) {
            const mappedLiv: ApplicationRecord[] = livApps
              .filter(isUserMatch)
              .map((l: any) => {
                const isRel =
                  l.assistance?.release_status === "RELEASED" ||
                  l.assistance?.assistance_status === "released" ||
                  l.status === "Released" ||
                  l.status === "released" ||
                  l.application_status === "released" ||
                  (Array.isArray(l.monitoring) && l.monitoring.length > 0)

                const isForRel =
                  l.assistance?.assistance_status === "FOR RELEASE" ||
                  l.assistance?.assistance_status === "for_release" ||
                  l.status === "For Release" ||
                  l.status === "for_release" ||
                  l.application_status === "for_release"

                const isAppr =
                  l.application_status === "approved" ||
                  l.status === "Approved" ||
                  l.status === "approved"

                const isRej =
                  l.application_status === "rejected" ||
                  l.status === "rejected"

                const isRev =
                  l.application_status === "needs_revision" ||
                  l.status === "needs_revision"

                const statusVal: ApplicationStatus = isRel
                  ? "Released"
                  : isForRel
                  ? "For Release"
                  : isAppr
                  ? "Approved"
                  : "Under Review"

                return {
                  applicationNo: l.reference_number || l.referenceNumber || l.qcid || qcId,
                  assistance: l.proposed_business_name || l.business_name || l.businessName
                    ? `Livelihood: ${l.proposed_business_name || l.business_name || l.businessName}`
                    : l.livelihood_type
                    ? `Livelihood: ${l.livelihood_type}`
                    : "Livelihood Assistance",
                  assistanceCategory: "Livelihood",
                  dateApplied: new Date(l.created_at || Date.now()).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                  status: statusVal,
                  applicantName:
                    l.applicant_name ||
                    [l.first_name || l.firstName, l.last_name || l.lastName].filter(Boolean).join(" ") ||
                    `${userProfile.firstName} ${userProfile.lastName}`,
                  dateOfBirth: userProfile.birthDateDisplay,
                  address:
                    l.address ||
                    l.business_location ||
                    `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                  contactNumber: l.phone_number || l.contact_number || userProfile.mobileNumber,
                  email: l.email || userProfile.email,
                  remarks:
                    isRel
                      ? "Assistance Released — Active in Livelihood Monitoring"
                      : isForRel
                      ? "Approved & Set for Release — Appointment Scheduled"
                      : isAppr
                      ? "Application Approved — Capital & Materials Allocation"
                      : isRej
                      ? (l.rejection_reason ? `Rejected: ${l.rejection_reason}` : "Application Rejected")
                      : isRev
                      ? "Needs Revision — Please update documentary requirements"
                      : "Under Review by SSDD Livelihood Committee",
                }
              })
            allFoundApps.push(...mappedLiv)
          }
        } catch (err) {
          console.warn("Could not fetch Livelihood applications:", err)
        }

        // 6. Training Applications
        try {
          let trnApps: any[] = []
          try {
            const tData = await cachedApiFetch<any>(`${API_BASE}/api/training/applications`, { headers: authHeaders }, 4000)
            trnApps = Array.isArray(tData) ? tData : tData?.applications || []
          } catch {}

          if (trnApps.length === 0 && (qcId || userId)) {
            try {
              const tData2 = await cachedApiFetch<any>(`${API_BASE}/api/training/applications?qcid=${encodeURIComponent(qcId || userId)}`, { headers: authHeaders }, 4000)
              trnApps = Array.isArray(tData2) ? tData2 : tData2?.applications || []
            } catch {}
          }

          try {
            const localTrn = JSON.parse(localStorage.getItem("training_applications") || "[]")
            if (Array.isArray(localTrn) && localTrn.length > 0) {
              for (const lt of localTrn) {
                const exists = trnApps.some(
                  (a: any) =>
                    (a.id && lt.id && String(a.id) === String(lt.id)) ||
                    (a.referenceNumber && lt.referenceNumber && a.referenceNumber === lt.referenceNumber) ||
                    (a.reference_number && lt.reference_number && a.reference_number === lt.reference_number)
                )
                if (!exists) {
                  trnApps.push(lt)
                }
              }
            }
          } catch {}

          if (Array.isArray(trnApps) && trnApps.length > 0) {
            const mappedTrn: ApplicationRecord[] = trnApps
              .filter(isUserMatch)
              .map((t: any) => {
                const isAppr = t.status === "approved" || t.status === "Approved" || t.status === "enrolled" || t.status === "Enrolled"
                const isRel = t.status === "completed" || t.status === "Completed" || (t.attendance?.completed === true)
                const isRej = t.status === "rejected" || t.status === "Rejected"
                const isRev = t.status === "needs_revision" || t.status === "needs-revision"

                const statusVal: ApplicationStatus = isRel
                  ? "Released"
                  : isAppr
                  ? "Approved"
                  : isRej
                  ? "Rejected"
                  : isRev
                  ? "Needs Revision"
                  : "Under Review"

                const courseName = t.trainingName || t.training_name || t.program_title || t.course_title || t.training_course || "Skills Training"

                return {
                  applicationNo: t.referenceNumber || t.reference_number || t.qcid || qcId,
                  assistance: `Gov Services Training: ${courseName}`,
                  assistanceCategory: "Training Program",
                  dateApplied: new Date(t.submittedAt || t.submitted_at || t.created_at || Date.now()).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                  status: statusVal,
                  applicantName:
                    t.applicantInfo?.fullName ||
                    t.applicant_info?.fullName ||
                    [t.applicantInfo?.firstName || t.applicant_info?.firstName || t.first_name, t.applicantInfo?.lastName || t.applicant_info?.lastName || t.last_name].filter(Boolean).join(" ") ||
                    `${userProfile.firstName} ${userProfile.lastName}`,
                  dateOfBirth: userProfile.birthDateDisplay,
                  address:
                    t.applicantInfo?.address ||
                    t.applicant_info?.address ||
                    `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                  contactNumber: t.applicantInfo?.contactNo || t.applicant_info?.contactNo || t.contact_number || userProfile.mobileNumber,
                  email: t.applicantInfo?.email || t.applicant_info?.email || t.email || userProfile.email,
                  remarks: isRel
                    ? `Training Completed & Certificate Issued (${t.certificate?.certificateNo || "Gov Services Certificate"})`
                    : isAppr
                    ? `Approved — Training Scheduled at ${t.schedule?.trainingLocation || "Gov Services Skills Development Center"}`
                    : isRej
                    ? (t.rejectionReason || t.rejection_reason ? `Rejected: ${t.rejectionReason || t.rejection_reason}` : "Training Application Rejected")
                    : isRev
                    ? (t.revisionNotes || t.revision_notes ? `Needs Revision: ${t.revisionNotes || t.revision_notes}` : "Needs Revision — Please review details")
                    : "Under Review by Gov Services Skills Coordinator",
                }
              })
            allFoundApps.push(...mappedTrn)
          }
        } catch (err) {
          console.warn("Could not fetch Training applications:", err)
        }

        // Sort newest applications first so latest submissions appear right at the top
        allFoundApps.sort((a, b) => {
          const timeA = new Date(a.dateApplied).getTime() || 0
          const timeB = new Date(b.dateApplied).getTime() || 0
          return timeB - timeA
        })

        // Filter out any active applications that are already in deleted list
        const filteredActive = allFoundApps.filter(
          (app) => !deletedKeySet.has((app.applicationNo + "::" + app.assistance).toLowerCase())
        )

        if (isMounted) {
          setApplications(filteredActive)
        }
      } finally {
        isFetchingUserAppsRef.current = false
      }
    }

    fetchUserApps()
    const interval = setInterval(fetchUserApps, 8000)
    const handleUpdate = () => fetchUserApps()

    const unsubscribe = subscribeToRealtimeChanges(() => {
      fetchUserApps()
    })

    window.addEventListener("storage", handleUpdate)
    window.addEventListener("pwd_senior_applications_updated", handleUpdate)
    window.addEventListener("solo_parent_applications_updated", handleUpdate)
    window.addEventListener("livelihood_status_updated", handleUpdate)
    window.addEventListener("livelihood_applications_updated", handleUpdate)
    window.addEventListener("training_applications_updated", handleUpdate)
    window.addEventListener("applications_updated", handleUpdate)
    window.addEventListener("user_notifications_updated", handleUpdate)
    window.addEventListener("appointments_updated", handleUpdate)
    window.addEventListener("financial_disbursements_updated", handleUpdate)

    return () => {
      isMounted = false
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("storage", handleUpdate)
      window.removeEventListener("pwd_senior_applications_updated", handleUpdate)
      window.removeEventListener("solo_parent_applications_updated", handleUpdate)
      window.removeEventListener("livelihood_status_updated", handleUpdate)
      window.removeEventListener("livelihood_applications_updated", handleUpdate)
      window.removeEventListener("training_applications_updated", handleUpdate)
      window.removeEventListener("applications_updated", handleUpdate)
      window.removeEventListener("user_notifications_updated", handleUpdate)
      window.removeEventListener("appointments_updated", handleUpdate)
      window.removeEventListener("financial_disbursements_updated", handleUpdate)
    }
  }, [])

  const currentList = activeTab === "active" ? applications : deletedApplications

  const filteredApplications = currentList.filter((app) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      app.applicationNo.toLowerCase().includes(q) ||
      app.assistance.toLowerCase().includes(q) ||
      app.applicantName.toLowerCase().includes(q) ||
      app.status.toLowerCase().includes(q) ||
      app.assistanceCategory.toLowerCase().includes(q)
    )
  })

  // STATUS HELPERS
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "Under Review":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
          label: "Under Review",
        }
      case "For Assessment":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
          label: "For Assessment",
        }
      case "Approved":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: "Approved",
        }
      case "For Release":
        return {
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />,
          label: "For Release",
        }
      case "Released":
        return {
          bg: "bg-teal-50 text-teal-800 border-teal-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />,
          label: "Released",
        }
      case "Rejected":
        return {
          bg: "bg-red-50 text-red-800 border-red-200",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
          label: "Rejected",
        }
      case "Needs Revision":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: "Needs Revision",
        }
      case "Pending":
      default:
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
          label: "Pending",
        }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ── VIEW APPLICATION PAGE (Detail Screen)
  // ═══════════════════════════════════════════════════════════════════════
  if (selectedApp) {
    const currentStatus = selectedApp.status
    const isDeletedItem = deletedApplications.some(
      (d) => d.applicationNo === selectedApp.applicationNo && d.assistance === selectedApp.assistance
    )
    const badge = getStatusBadge(currentStatus)

    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* Top Back Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <button
            onClick={() => setSelectedApp(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("backToMyApplications") || "Back to My Applications"}</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Application Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
            >
              {badge.icon}
              {badge.label}
            </span>

            {isDeletedItem ? (
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleRestore(selectedApp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setAppToPermanentDelete(selectedApp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanent Delete</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAppToDelete(selectedApp)}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                title="Delete Application"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Page Title */}
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {t("applicationDetailsTitle") || "View Application Details"}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {selectedApp.assistance}
          </h1>
          <p className="text-sm text-gray-500">
            Detailed information and official status of your submitted social service request.
          </p>
        </div>

        {/* Card 1: Overview & Ref No */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Reference / QC ID Number
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-blue-700">
                  {selectedApp.applicationNo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  isTrainingApplication(selectedApp) || selectedApp.assistanceCategory === "Livelihood"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {isTrainingApplication(selectedApp) ? "Training Program" : selectedApp.assistanceCategory}
              </span>
              <span className="text-xs text-gray-400">
                Date Applied: <strong>{selectedApp.dateApplied}</strong>
              </span>
            </div>
          </div>

          {/* Applicant Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2">
            <div>
              <span className="text-gray-400 block font-medium">Full Name:</span>
              <span className="font-bold text-gray-900 text-sm uppercase">{selectedApp.applicantName}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Date of Birth:</span>
              <span className="font-medium text-gray-900">{selectedApp.dateOfBirth}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Contact Number:</span>
              <span className="font-mono font-medium text-gray-900">{selectedApp.contactNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Email Address:</span>
              <span className="font-medium text-gray-900 truncate block">{selectedApp.email || "N/A"}</span>
            </div>
          </div>

          <div className="text-xs pt-2 border-t border-gray-100">
            <span className="text-gray-400 block font-medium">Address:</span>
            <span className="font-medium text-gray-900">{selectedApp.address}</span>
          </div>
        </div>

        {/* Card 2: Official ID Record OR Financial Aid & Payout Appointment */}
        {(() => {
          const isApprovedOrReleased =
            selectedApp.status === "Approved" || selectedApp.status === "For Release" || selectedApp.status === "Released"
          const isTrainingApp = isTrainingApplication(selectedApp)
          const isIdApp = isIdOrDocumentApplication(selectedApp)

          if (!isApprovedOrReleased) {
            return (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-xs flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-amber-900">
                  <p className="font-bold text-sm text-amber-950">
                    {isTrainingApp
                      ? "Kasalukuyang Sinusuri ang Training Program Aplikasyon (Pending / Under Review)"
                      : isIdApp
                      ? "Kasalukuyang Sinusuri ang ID Aplikasyon (Pending / Under Review)"
                      : "Kasalukuyang Sinusuri ang Aplikasyon (Pending / Under Review)"}
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    {isTrainingApp
                      ? "Ang inyong aplikasyon sa libreng pagsasanay ay sinusuri ng SSDD Skills Training Division. Awtomatikong magkakaroon ng Training Schedule at Module access kapag na-aprubahan."
                      : isIdApp
                      ? "Ang inyong ID aplikasyon at mga isinumiteng dokumento ay pinoproseso at sinusuri pa ng Social Worker / Verification Officer. Awtomatikong magkakaroon ng Official ID Record at Digital ID kapag na-aprubahan na ito."
                      : "Ang inyong aplikasyon ay pinoproseso at sinusuri pa ng Social Worker. Awtomatikong magkakaroon ng Fixed Financial Aid record at appointment schedule para sa payout kapag na-aprubahan na ito."}
                  </p>
                </div>
              </div>
            )
          }

          if (isTrainingApp) {
            const isCompleted = selectedApp.status === "Released" || selectedApp.status === "Approved" || selectedApp.status === "Completed"
            const stageTitle = isCompleted
              ? "STAGE 2: SKILLS TRAINING COMPLETED & ACCREDITED"
              : "STAGE 1: VOCATIONAL TRAINING ENROLLMENT & SCHEDULE"

            const stageBadge = isCompleted
              ? "✓ Training Completed / Certificate Available"
              : "Enrolled & In Training"

            return (
              <div className="bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-slate-800 pb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-blue-950 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {stageTitle}
                  </h3>
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                    {stageBadge}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Enrolled Vocational Course</span>
                    <span className="text-sm font-extrabold text-blue-950 dark:text-white block">{selectedApp.assistance}</span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Official Government Skills Program</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Program Tuition / Fee</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 100% Free / Full Scholarship
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Libreng pagsasanay at learning materials</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Accreditation &amp; Certificate</span>
                    <span className="text-sm font-extrabold text-blue-900 dark:text-white block flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Certificate of Completion
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Accredited ng Quezon City SSDD</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-100/60 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-blue-950 dark:text-slate-200">
                  <p className="leading-relaxed">
                    Maaari mong buksan ang <strong>Training Program</strong> module upang makita ang iyong class schedule, attendance record, at opisyal na Certificate of Completion.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/portal/apply-livelihood?category=training")}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Buksan ang Training Module</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          }



          const isLivelihoodApp =
            !isTrainingApp &&
            (selectedApp.assistanceCategory === "Livelihood" ||
             selectedApp.assistance.toLowerCase().includes("livelihood"))

          if (isLivelihoodApp) {
            const isRel = selectedApp.status === "Released"
            const isForRel = selectedApp.status === "For Release"
            const isAppr = selectedApp.status === "Approved"

            const stageTitle = isRel
              ? "STAGE 3: LIVELIHOOD MONITORING & OPERATIONS"
              : isForRel
              ? "STAGE 2: CAPITAL ASSISTANCE & APPOINTMENT SCHEDULE"
              : isAppr
              ? "STAGE 2: CAPITAL & MATERIALS ALLOCATION"
              : "STAGE 1: APPLICATION REVIEW"

            const stageBadge = isRel
              ? "✓ Livelihood Active & Released"
              : isForRel
              ? "Scheduled for Release"
              : isAppr
              ? "Approved for Capital Grant"
              : "Under Review"

            return (
              <div className="bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-slate-800 pb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-blue-950 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {stageTitle}
                  </h3>
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                    {stageBadge}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Capital Seed Grant</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">₱15,000.00</span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Financial assistance grant for business setup</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Materials &amp; Supplies</span>
                    <span className="text-sm font-extrabold text-blue-900 dark:text-white block flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Starter Supply Pack
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Official business inventory package</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Tools &amp; Equipment</span>
                    <span className="text-sm font-extrabold text-blue-900 dark:text-white block flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Operational Kit / Equipment
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Tools for daily business operations</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-100/60 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-blue-950 dark:text-slate-200">
                  <p className="leading-relaxed">
                    Maaari mong buksan ang <strong>Livelihood Program</strong> module upang makita ang buong detalye ng iyong capital, appointment schedule, at monitoring progress.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/portal/apply-livelihood?category=livelihood")}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Buksan ang Livelihood Module</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          }

          if (isIdApp) {
            const photoUrl = getApplicantPhotoUrl(selectedApp)
            const theme = getCardTheme(selectedApp)

            return (
              <div className="bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-slate-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <IdCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-sm font-bold text-blue-950 dark:text-white">
                        OFFICIAL 2-SIDED DIGITAL ID CARD &amp; RECORD
                      </h3>
                      <p className="text-[11px] text-slate-500">Napatunayan at aktibong ID ng Pamahalaang Lungsod Quezon</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                      ✓ ID Active &amp; Valid
                    </span>
                    <button
                      type="button"
                      onClick={() => setIdCardApp(selectedApp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Open Fullscreen ID</span>
                    </button>
                  </div>
                </div>

                {/* Front & Back Preview Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Front Side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        HARAP (FRONT SIDE)
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadIdCardAsImage(selectedApp, photoUrl, "front")}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Front</span>
                      </button>
                    </div>

                    <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white select-none">
                      {/* Header */}
                      <div
                        className="px-3.5 py-2 flex items-center justify-between text-white"
                        style={{ background: `linear-gradient(to right, ${theme.headerStart}, ${theme.headerEnd})` }}
                      >
                        <div className="flex items-center gap-2">
                          <img src="/gov-serves-seal.png" alt="QC Seal" className="w-7 h-7 object-contain drop-shadow-xs rounded-full bg-white/20 p-0.5" />
                          <div>
                            <p className="text-[7px] font-bold tracking-widest uppercase opacity-90 leading-tight">Republic of the Philippines</p>
                            <p className="text-[11px] font-black tracking-wide leading-tight uppercase">GOV SERVICES • QUEZON CITY</p>
                          </div>
                        </div>
                        <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                          {theme.idTitle}
                        </span>
                      </div>

                      {/* Subheader */}
                      <div
                        className="py-1 text-center text-[8.5px] font-black uppercase tracking-widest"
                        style={{ backgroundColor: theme.subheaderBg, color: theme.subheaderText }}
                      >
                        {theme.idSubTitle}
                      </div>

                      {/* Details & Photo */}
                      <div className="p-3 flex gap-2.5 items-start relative bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
                        <div className="w-20 h-24 shrink-0 rounded-lg border-2 border-slate-300 bg-white overflow-hidden shadow-xs flex flex-col items-center justify-center relative z-10">
                          {photoUrl ? (
                            <img src={photoUrl} alt="Cardholder" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <User className="w-8 h-8 text-slate-300 mb-1" />
                              <span className="text-[7px] font-bold uppercase tracking-wider">2x2 Photo</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-slate-900/90 text-white text-[6.5px] text-center py-0.5 font-bold uppercase">
                            {theme.badgeText}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1 relative z-10 text-slate-900">
                          <div>
                            <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Assigned ID Number</span>
                            <p className="text-xs font-black text-blue-600 font-mono tracking-wide leading-none">{selectedApp.applicationNo}</p>
                          </div>

                          <div className="pt-0.5">
                            <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Cardholder Full Name</span>
                            <p className="text-[11px] font-black text-slate-900 leading-tight uppercase truncate">{selectedApp.applicantName}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-1 pt-0.5 text-[8px] text-slate-700">
                            <div>
                              <span className="text-[6.5px] font-semibold text-slate-400 uppercase">Birthdate:</span> {selectedApp.dateOfBirth || "—"}
                            </div>
                            <div>
                              <span className="text-[6.5px] font-semibold text-slate-400 uppercase">Contact:</span> {selectedApp.contactNumber || "—"}
                            </div>
                          </div>

                          <div className="text-[8px] text-slate-700 truncate pt-0.5">
                            <span className="text-[6.5px] font-semibold text-slate-400 uppercase">Address:</span> {selectedApp.address || "Quezon City"}
                          </div>
                        </div>

                        {/* QC Official Seal on right */}
                        <div className="shrink-0 flex flex-col items-center justify-center pl-1 z-10 self-center">
                          <img src="/gov-serves-seal.png" alt="QC Official Seal" className="w-12 h-12 object-contain drop-shadow-md" />
                          <span className="text-[5.5px] font-black uppercase text-slate-600 tracking-tighter mt-0.5">AUTHENTIC</span>
                        </div>
                      </div>

                      {/* Bottom Barcode & Signature */}
                      <div className="px-3 py-1.5 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between text-[7px]">
                        <div>
                          <p className="font-mono font-bold text-slate-700 tracking-widest text-[7.5px]">|||| | || |||| | | ||| ||||</p>
                          <span className="text-slate-400 text-[6px] uppercase font-semibold">Active &amp; Ready</span>
                        </div>
                        <div className="text-center">
                          <div className="w-16 border-b border-slate-400 mx-auto mb-0.5" />
                          <p className="font-bold text-slate-800 text-[6.5px] leading-tight uppercase">HON. MA. JOSEFINA G. BELMONTE</p>
                          <p className="text-[5.5px] text-slate-500 uppercase leading-none">City Mayor, Quezon City</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        LIKOD (BACK SIDE)
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadIdCardAsImage(selectedApp, photoUrl, "back")}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Back</span>
                      </button>
                    </div>

                    <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white select-none relative">
                      {/* Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
                        <img src="/gov-serves-seal.png" alt="QC Watermark" className="w-36 h-36 object-contain" />
                      </div>

                      {/* Header */}
                      <div
                        className="px-3.5 py-1.5 flex items-center justify-between text-white"
                        style={{ background: `linear-gradient(to right, ${theme.headerStart}, ${theme.headerEnd})` }}
                      >
                        <div className="flex items-center gap-1.5">
                          <img src="/gov-serves-seal.png" alt="QC Seal" className="w-5 h-5 object-contain drop-shadow-xs rounded-full bg-white/20 p-0.5" />
                          <p className="text-[7.5px] font-black tracking-wide leading-tight uppercase">QUEZON CITY SOCIAL SERVICES DEVELOPMENT DEPARTMENT</p>
                        </div>
                      </div>

                      {/* Back Body */}
                      <div className="p-3 grid grid-cols-2 gap-2 text-[7.5px] text-slate-800 relative z-10">
                        <div className="p-2 rounded-lg bg-slate-50/90 border border-slate-200 space-y-1">
                          <p className="text-[7px] font-black text-red-600 uppercase">🚨 EMERGENCY CONTACT</p>
                          <p><strong className="text-slate-400 font-semibold block text-[6px]">PERSON:</strong> {selectedApp.applicantName}</p>
                          <p><strong className="text-slate-400 font-semibold block text-[6px]">PHONE:</strong> {selectedApp.contactNumber || "122"}</p>
                          <div className="border border-slate-300 rounded p-1 text-center bg-white mt-1">
                            <div className="w-16 border-b border-slate-400 mx-auto mt-2 mb-0.5" />
                            <span className="text-[5.5px] font-bold uppercase text-slate-400">CARDHOLDER SIGNATURE</span>
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50/90 border border-slate-200 space-y-1">
                          <p className="text-[7px] font-black text-blue-900 uppercase">⚖️ STATUTORY PRIVILEGES</p>
                          <p className="leading-tight text-[6.5px]">20% discount &amp; privileges pursuant to {theme.legalAct}.</p>
                          <div className="p-1 rounded bg-blue-50 border border-blue-200 text-[6px] text-blue-950 mt-1">
                            <strong className="block">IF FOUND, RETURN TO:</strong>
                            <span>{theme.officeName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom */}
                      <div className="px-3 py-1 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between text-[6.5px]">
                        <p className="font-mono font-bold text-slate-700">QC-SSDD: {selectedApp.applicationNo}</p>
                        <p className="text-slate-400 uppercase">Official Document</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => downloadIdCardAsImage(selectedApp, photoUrl, "front")}
                    className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Front (PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadIdCardAsImage(selectedApp, photoUrl, "back")}
                    className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Back (PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIdCardApp(selectedApp)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>View &amp; Print Official ID</span>
                  </button>
                </div>
              </div>
            )
          }

          const rawType = (selectedApp.assistance || "").replace(/\s*assistance/gi, "").trim()
          const formattedType = rawType.charAt(0).toUpperCase() + rawType.slice(1) + " Assistance"
          const fixedAmt = FIXED_ASSISTANCE_AMOUNTS[formattedType] || FIXED_ASSISTANCE_AMOUNTS[selectedApp.assistance] || 1000

          const savedDisbursements = getSavedDisbursements()
          const matchDisb = savedDisbursements.find(
            (d) =>
              d.applicationRef === selectedApp.applicationNo ||
              (d.applicantName && d.applicantName.toLowerCase().trim() === selectedApp.applicantName.toLowerCase().trim())
          )

          const apptDate = matchDisb?.appointmentDate || new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
          const apptTime = matchDisb?.appointmentTime || "10:00 AM"
          const payoutVenue = matchDisb?.venue || "Quezon City Hall"

          return (
            <div className="bg-slate-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  FINANCIAL AID &amp; PAYOUT APPOINTMENT
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  Automatically Linked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-emerald-100 dark:border-slate-700 space-y-1">
                  <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Fixed Amount</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₱{fixedAmt.toLocaleString()}</span>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">Standard rate based on assistance category</p>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-emerald-100 dark:border-slate-700 space-y-1">
                  <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Appointment Schedule</span>
                  <span className="text-sm font-extrabold text-gray-900 dark:text-white block">{apptDate}</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {apptTime}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-emerald-100 dark:border-slate-700 space-y-1">
                  <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Payout Location</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white block">{payoutVenue}</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" /> SSDD Payout Counter
                  </span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setSelectedApp(null)}
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            ← {t("backToMyApplications") || "Back to Applications"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-[#3b82f6] hover:bg-blue-600 text-white text-sm font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Print Receipt / Details
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ── MY APPLICATIONS LIST (Main View & Deleted View)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* ── TOP HEADER (Main View vs Deleted View) ── */}
      {activeTab === "deleted" ? (
        <div className="space-y-4 border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToMyApplications") || "Back to Application History"}</span>
            </button>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deleted Applications ({deletedApplications.length})</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                Trash / Deleted Items
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Deleted Applications
              </h1>
              <p className="text-sm text-gray-500">
                You can restore deleted applications or permanently remove them from the database.
              </p>
            </div>

            {/* Search Input for Deleted View */}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t("searchApplicationsPlaceholder") || "Search deleted applications..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              User Application Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t("myApplicationsTitle") || "Application History"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t("searchApplicationsPlaceholder") || "Search application no., assistance, or name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-xs"
              />
            </div>

            {/* Deleted Applications Entry Button */}
            <button
              type="button"
              onClick={() => setActiveTab("deleted")}
              className="shrink-0 flex items-center gap-2 px-3.5 h-10 rounded-xl text-xs font-bold bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 border border-gray-200 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
              title="View deleted applications"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="hidden md:inline">Deleted Applications</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                {deletedApplications.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── APPLICATION CARDS LIST ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            {activeTab === "active" ? "Total Applications" : "Total Deleted"}:{" "}
            <strong>{filteredApplications.length}</strong>
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>

        {filteredApplications.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              {activeTab === "active" ? <FileText className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <h3 className="text-sm font-bold text-gray-700">
              {activeTab === "active" ? "No Applications Found" : "No Deleted Applications"}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeTab === "active"
                ? "You have no submitted applications or no records match your search."
                : "No applications found in the trash."}
            </p>
          </div>
        ) : (
          filteredApplications.map((app) => {
            const badge = getStatusBadge(app.status)
            const isDeleted = activeTab === "deleted"

            return (
              <div
                key={app.applicationNo + app.assistance}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  isDeleted ? "border-red-200/80 dark:border-red-900/60 hover:border-red-300 bg-red-50/10 dark:bg-red-950/10" : "border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                        {app.applicationNo}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium border ${
                          isTrainingApplication(app) || app.assistanceCategory === "Livelihood"
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700"
                        }`}
                      >
                        {isTrainingApplication(app) ? "Training Program" : app.assistanceCategory}
                      </span>
                      {isDeleted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800">
                          Deleted on: {app.deletedAt || "Recently"}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{app.assistance}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 block">Applicant:</span>
                    <span className="font-semibold text-gray-900 dark:text-white uppercase">{app.applicantName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 block">Date Applied:</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">{app.dateApplied}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 block">Contact Number:</span>
                    <span className="font-mono text-gray-800 dark:text-slate-200">{app.contactNumber}</span>
                  </div>
                </div>

                {/* ── CONNECTED ID RECORD OR FINANCIAL AID & PAYOUT BANNER (Only when Approved / For Release / Released) ── */}
                {(() => {
                  const isApprovedOrReleased =
                    app.status === "Approved" || app.status === "For Release" || app.status === "Released"

                  if (!isApprovedOrReleased) {
                    return null
                  }

                  const isTrainingApp = isTrainingApplication(app)
                  const isIdApp = isIdOrDocumentApplication(app)

                  if (isTrainingApp) {
                    const isCompleted = app.status === "Released" || app.status === "Approved" || app.status === "Completed"
                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800/80">
                                Skills Training Program
                              </span>
                              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                                {app.applicationNo}
                              </span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              Enrolled Course: <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">{app.assistance}</span>
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>
                                {isCompleted
                                  ? "✓ Natapos ang Pagsasanay • May Opisyal na Certificate of Completion"
                                  : "Libreng Vocational Training • Regular Attendance Record"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">Training Status</span>
                          <span className="text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-800/80 inline-block mt-0.5">
                            {isCompleted ? "✓ COMPLETED & CERTIFIED" : "ENROLLED / IN PROGRESS"}
                          </span>
                        </div>
                      </div>
                    )
                  }

                  if (isIdApp) {
                    const isPwd =
                      app.assistanceCategory === "PWD" ||
                      app.assistance.toLowerCase().includes("pwd") ||
                      app.assistance.toLowerCase().includes("disability")
                    const isSenior =
                      app.assistanceCategory === "Senior Citizen" ||
                      app.assistance.toLowerCase().includes("senior")
                    const officeName = isPwd
                      ? "Persons with Disability Affairs Division (PDAO)"
                      : isSenior
                      ? "Office of Senior Citizens Affairs (OSCA)"
                      : "Solo Parent Welfare Division"

                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800/80">
                                Official ID Record
                              </span>
                              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                                {app.applicationNo}
                              </span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              Assigned ID Number: <span className="text-blue-600 dark:text-blue-400 font-mono font-black text-sm">{app.applicationNo}</span>
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Issuing Office: <strong className="text-gray-900 dark:text-white">{officeName}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 md:justify-end shrink-0 pt-1 md:pt-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadIdCardAsImage(app, getApplicantPhotoUrl(app))
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:hover:bg-blue-900/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Download ID as PNG image"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PNG</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIdCardApp(app)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            title="View & Print Official ID Card"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View &amp; Print ID</span>
                          </button>
                        </div>
                      </div>
                    )
                  }

                  const isLivelihoodApp =
                    !isTrainingApp &&
                    (app.assistanceCategory === "Livelihood" ||
                     app.assistance.toLowerCase().includes("livelihood"))

                  if (isLivelihoodApp) {
                    const isReleased = app.status === "Released"
                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800/80">
                                Livelihood Grant Package
                              </span>
                              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                                {app.applicationNo}
                              </span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              Approved Capital Grant: <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₱15,000</span> + Starter Pack &amp; Tools
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <Package className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Package Inclusions: <strong className="text-gray-900 dark:text-white">₱15,000 Seed Capital • Starter Pack • Equipment Kit</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">{isReleased ? "Grant Status" : "Capital Seed"}</span>
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₱15,000</span>
                          {isReleased ? (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/80 block mt-0.5">
                              ✓ In Monitoring
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800/80 block mt-0.5">
                              Approved Package
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  }

                  const fixedAmt = resolveFixedAmount(app.assistance)

                  const savedDisbursements = getSavedDisbursements()
                  const matchDisb = savedDisbursements.find(
                    (d) =>
                      d.applicationRef === app.applicationNo ||
                      (d.applicantName && d.applicantName.toLowerCase().trim() === app.applicantName.toLowerCase().trim())
                  )

                  const apptDate = matchDisb?.appointmentDate || new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                  const apptTime = matchDisb?.appointmentTime || "10:00 AM"
                  const payoutVenue = matchDisb?.venue || "Quezon City Hall"

                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/80">
                              Financial Aid Record
                            </span>
                            <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                              {matchDisb?.disbursementId || `DISB-${app.applicationNo.slice(-4)}`}
                            </span>
                          </div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            Approved Fixed Amount: <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₱{fixedAmt.toLocaleString()}</span>
                          </p>
                          <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Payout Appointment: <strong className="text-gray-900 dark:text-white">{apptDate} – {apptTime}</strong> ({payoutVenue})</span>
                          </p>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">Fixed Amount</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₱{fixedAmt.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Official record of Quezon City Social Services</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isDeleted ? (
                      /* ── DELETED ACTIONS (RESTORE & PERMANENT DELETE) ── */
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRestore(app)}
                          className="px-4 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                          title="Restore application to active list"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setAppToPermanentDelete(app)}
                          className="px-4 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
                          title="Permanently delete from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Permanent Delete</span>
                        </button>
                      </>
                    ) : (
                      /* ── ACTIVE ACTIONS (DELETE & VIEW) ── */
                      <>
                        <button
                          type="button"
                          onClick={() => setAppToDelete(app)}
                          className="px-3.5 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                          title="Delete Application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="flex-1 sm:flex-initial px-5 h-10 rounded-xl bg-[#3b82f6] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-sm"
                        >
                          <span>VIEW APPLICATION</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── 1. SOFT DELETE CONFIRMATION MODAL ── */}
      {appToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.7)" }}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-gray-900">Delete Application?</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to delete the application for <strong className="text-gray-900">{appToDelete.assistance}</strong> ({appToDelete.applicationNo})?
              </p>
              <p className="text-[11px] text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-left">
                Note: This application will be moved to <strong>"Deleted Applications"</strong> where you can restore it or permanently delete it.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setAppToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. PERMANENT DELETE CONFIRMATION MODAL ── */}
      {appToPermanentDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.75)" }}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-red-300 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-red-950">Permanently Delete Application?</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-gray-900">{appToPermanentDelete.assistance}</strong> ({appToPermanentDelete.applicationNo})?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 text-left font-medium space-y-1">
                <span className="font-bold flex items-center gap-1 text-red-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Warning: This action cannot be undone!
                </span>
                <p>
                  This record will be permanently purged from the PostgreSQL database, storage, and official portal.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setAppToPermanentDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Permanently deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION BANNER ── */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-white text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "danger" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toastMessage.type === "danger" ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ── DIGITAL ID CARD PREVIEW & PRINT MODAL ── */}
      {idCardApp && (
        <DigitalIdCardModal
          app={idCardApp}
          onClose={() => setIdCardApp(null)}
        />
      )}
    </div>
  )
}
