import { useState, useEffect, useRef } from "react"
import {
  Check,
  CheckCircle2,
  Upload,
  Camera,
  FileText,
  AlertCircle,
  X,
  Loader2,
  ChevronUp,
  Pencil,
  Info,
  Home,
  Search,
  RotateCcw,
} from "lucide-react"
import { useLanguage } from "../ui/language-context"
import DocumentCameraModal from "../ui/document-camera-modal"
import { API_BASE } from "../../config/api"
import { fetchPwdSeniorApplications } from "../../utils/cachedApiFetch"
import { notifyApplicationChange } from "../../utils/realtimeSync"
import { readFileAsDataUrl } from "../../utils/fileUpload"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { formatAppDate } from "./my-applications"

export interface UserProfile {
  userId?: string
  qcidNo?: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  nationality?: string
  dobMonth: string
  dobDay: string
  dobYear: string
  age?: string
  sex?: string
  civilStatus?: string
  addressHouseNo?: string
  addressStreet: string
  addressBarangay: string
  addressCityMunicipality: string
  contactNo?: string
  email?: string
}

export interface SeniorAssistanceWizardProps {
  onBack?: () => void
  userProfile?: UserProfile
  onStepChange?: (step: number) => void
}

interface RequiredDoc {
  id: string
  label: string
  description: string
  required: boolean
}

function formatSeniorId(val: string): string {
  const trimmed = val.trim().toUpperCase()
  if (trimmed.startsWith("QC-") || trimmed.startsWith("SENIOR-") || trimmed.startsWith("OSCA-")) {
    return trimmed.slice(0, 24)
  }
  const digits = val.replace(/\D/g, "").slice(0, 16)
  if (!digits) return ""
  if (digits.length <= 6) return digits
  if (digits.length <= 10) return `${digits.slice(0, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 16)}`
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
]

function calculateAge(monthStr: string, dayStr: string, yearStr: string): string {
  if (!monthStr || !dayStr || !yearStr) return ""
  let mIdx = MONTHS.indexOf(monthStr.toUpperCase())
  if (mIdx === -1 && !isNaN(parseInt(monthStr, 10))) {
    mIdx = parseInt(monthStr, 10) - 1
  }
  if (mIdx === -1) return ""
  const birthDate = new Date(parseInt(yearStr), mIdx, parseInt(dayStr))
  const today = new Date(2026, 7, 29)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age > 0 ? String(age) : ""
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-xs">
      <div className="flex items-center justify-between bg-gray-50/80 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-blue-600 transition-colors"
        >
          <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`} />
          {title}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Pencil className="h-3 w-3" />
          I-EDIT
        </button>
      </div>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}

function ReviewCheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2 text-xs md:text-sm text-foreground">
      <span
        className={`flex items-center justify-center h-4 w-4 rounded-full shrink-0 mt-0.5 ${
          ok ? "bg-emerald-500" : "bg-red-500"
        }`}
      >
        {ok ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </span>
      <span>{label}</span>
    </div>
  )
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value || "—"}</p>
    </div>
  )
}

export default function SeniorSocialAssistanceWizard({ onBack, userProfile: propUserProfile, onStepChange }: SeniorAssistanceWizardProps) {
  const { language, t } = useLanguage()
  const [profile, setProfile] = useState(() => (propUserProfile || getCurrentUserProfile()) as any)

  useEffect(() => {
    const handleProfileUpdate = () => {
      const p = getCurrentUserProfile() as any
      setProfile(p)
      if (p) {
        setFormData((prev) => ({
          ...prev,
          qcidNumber: p.qcidNo || p.qcidNumber || prev.qcidNumber,
          firstName: p.firstName || prev.firstName,
          middleName: p.middleName || prev.middleName,
          lastName: p.lastName || prev.lastName,
          suffix: p.suffix || prev.suffix,
          nationality: p.nationality || prev.nationality || "FILIPINO",
          dobMonth: p.dobMonth || prev.dobMonth,
          dobDay: p.dobDay || prev.dobDay,
          dobYear: p.dobYear || prev.dobYear,
          age: String(p.age || prev.age || ""),
          sex: p.sex || p.gender || prev.sex,
          civilStatus: p.civilStatus || prev.civilStatus,
          addressHouseNo: p.addressHouseNo || p.houseNo || prev.addressHouseNo,
          addressStreet: p.addressStreet || p.street || prev.addressStreet,
          barangay: p.addressBarangay || p.barangay || prev.barangay,
          contactNumber: String(p.contactNo || p.mobileNumber || prev.contactNumber || "").replace(/\s+/g, ""),
          emailAddress: p.email || prev.emailAddress,
          signatureName: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
        }))
      }
    }
    window.addEventListener("user_profile_updated", handleProfileUpdate)
    window.addEventListener("storage", handleProfileUpdate)
    return () => {
      window.removeEventListener("user_profile_updated", handleProfileUpdate)
      window.removeEventListener("storage", handleProfileUpdate)
    }
  }, [])

  const userProfile = propUserProfile || profile || (getCurrentUserProfile() as any)

  const STEPS = [
    { id: 1, label: t("wizardChecklist").toUpperCase() },
    { id: 2, label: t("wizardPersonal").toUpperCase() },
    { id: 3, label: t("pwdStepDocuments").toUpperCase() },
    { id: 4, label: t("wizardReview").toUpperCase() },
  ]

  const [step, setStep] = useState(1)
  const [returnToReview, setReturnToReview] = useState(false)
  const [attemptedNext, setAttemptedNext] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [latestSubmittedApp, setLatestSubmittedApp] = useState<any | null>(null)
  const [referenceNumber, setReferenceNumber] = useState("")
  const [submissionDate, setSubmissionDate] = useState("")
  const [isEditingInfo] = useState(false)
  const bypassedActiveAppRef = useRef(false)
  const dismissedAppRefCurrent = useRef<string | null>(null)

  // Checklist State (Step 1)
  const [isResident, setIsResident] = useState(false)
  const [isSenior, setIsSenior] = useState(false)
  const [hasSeniorId, setHasSeniorId] = useState(false)
  const [isIndigentOrInNeed, setIsIndigentOrInNeed] = useState(false)

  // Form Data (Step 1 & Step 2)
  const [formData, setFormData] = useState(() => {
    const prof: any = propUserProfile || getCurrentUserProfile() || {}
    const fullName = `${prof.firstName || ""} ${prof.lastName || ""}`.trim()
    return {
      seniorIdNumber: "",

      // Step 2: Personal (from QCID profile)
      qcidNumber: prof.qcidNo || prof.qcidNumber || getLoggedInUserQcid(),
      firstName: prof.firstName || prof.first_name || "",
      middleName: prof.middleName || prof.middle_name || "",
      lastName: prof.lastName || prof.last_name || "",
      suffix: prof.suffix || "",
      nationality: prof.nationality || "FILIPINO",
      dobMonth: prof.dobMonth || prof.birthMonth || "",
      dobDay: prof.dobDay || prof.birthDay || "",
      dobYear: prof.dobYear || prof.birthYear || "",
      age: String(prof.age || ""),
      sex: prof.sex || prof.gender || "Female",
      civilStatus: prof.civilStatus || "Single",
      addressHouseNo: prof.addressHouseNo || prof.houseNo || "",
      addressStreet: prof.addressStreet || prof.street || "",
      barangay: prof.addressBarangay || prof.barangay || "Sauyo",
      contactNumber: String(prof.contactNo || prof.mobileNumber || "").replace(/\s+/g, ""),
      emailAddress: prof.email || "",

      // Step 2: Household & Need
      livingArrangement: "Alone",
      familyMembersCount: "1",
      monthlyIncome: "Below ₱5,000",
      employmentStatus: "Retired / Pensioner",
      sourceOfIncome: "",
      purposeOfAssistance: "",
      needDescription: "Living independently and requesting financial assistance for maintenance medicine.",

      // Step 4 & 5
      signatureName: fullName,
      agreedToCertification: false,
      districtOffice: "main",
    }
  })

  // Reload / Navigation warning protection — only active starting Step 2
  const isFormDirty = !submitted && step > 1

  useEffect(() => {
    ;(window as any).__isFormDirty = isFormDirty
    return () => {
      ;(window as any).__isFormDirty = false
    }
  }, [isFormDirty])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step > 1 && !submitted) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      ;(window as any).__isFormDirty = false
    }
  }, [step, submitted])

  useEffect(() => {
    if (submitted) {
      onStepChange?.(0)
    } else {
      onStepChange?.(step)
    }
  }, [step, submitted, onStepChange])

  // Real-time active application & approval state sync
  useEffect(() => {
    let isMounted = true

    const syncRealtimeApp = async () => {
      if (!isMounted) return
      try {
        let allApps: any[] = []
        let backendFetched = false
        try {
          const data = await fetchPwdSeniorApplications()
          if (Array.isArray(data) && data.length > 0) {
            allApps = data
            backendFetched = true
            try {
              localStorage.setItem("pwd_senior_applications", JSON.stringify(data))
            } catch {}
          }
        } catch {}

        if (!backendFetched) {
          const localKeys = ["pwd_senior_applications", "applications", "all_user_applications", "active_applications"]
          for (const k of localKeys) {
            try {
              const local = JSON.parse(localStorage.getItem(k) || "[]")
              if (Array.isArray(local)) {
                for (const la of local) {
                  if (la && !allApps.some((a) => (a.id && a.id === la.id) || (a.referenceNumber && a.referenceNumber === la.referenceNumber))) {
                    allApps.push(la)
                  }
                }
              }
            } catch {}
          }
        }

        const userEmail = (userProfile?.email || formData.emailAddress || "").toLowerCase().trim()
        const currentQcid = (userProfile?.qcidNo || formData.qcidNumber || "").trim()
        const userFirst = (formData.firstName || userProfile?.firstName || "").toLowerCase().trim()
        const userLast = (formData.lastName || userProfile?.lastName || "").toLowerCase().trim()

        const isUserMatch = (a: any) => {
          if (!a) return false
          const aEmail = String(a.email || "").toLowerCase().trim()
          const aRef = String(a.referenceNumber || a.reference_number || "").trim()
          const aQcid = String(a.qcid || a.qc_id || "").trim()
          const aExisting = String(a.existingIdNumber || a.existing_id_number || a.seniorIdNumber || "").trim()
          const aAssigned = String(a.assignedIdNumber || a.assigned_id_number || "").trim()
          const aFirst = String(a.firstName || a.first_name || "").toLowerCase().trim()
          const aLast = String(a.lastName || a.last_name || "").toLowerCase().trim()

          if (userEmail && aEmail && userEmail === aEmail) return true
          if (currentQcid && (aRef.includes(currentQcid) || aQcid === currentQcid || aAssigned === currentQcid || aExisting === currentQcid)) return true
          if (userFirst && userLast && aFirst === userFirst && aLast === userLast) return true
          return false
        }

        const activeAssistanceApp = allApps.find((a) => {
          if (!a) return false
          const appType = String(a.type || a.service || a.extra_data?.type || "").toLowerCase()
          const appCat = String(a.category || a.extra_data?.category || "").toLowerCase()
          const appAssistance = String(a.assistanceType || a.extra_data?.assistanceType || "").toLowerCase()
          const isSeniorAssistance =
            (appType.includes("assistance") || appCat.includes("assistance") || appAssistance.includes("assistance")) &&
            (appCat.includes("senior") || appType.includes("senior") || String(a.service || "").toLowerCase().includes("senior") || !appCat.includes("pwd"))

          if (!isSeniorAssistance) return false
          const status = String(a.status || "").toLowerCase()
          if (status !== "pending" && status !== "under_review" && status !== "approved" && status !== "completed" && status !== "for_release") return false
          return isUserMatch(a)
        })

        if (bypassedActiveAppRef.current) return

        if (activeAssistanceApp) {
          const activeRef = String(activeAssistanceApp.referenceNumber || activeAssistanceApp.reference_number || "").trim()
          if (dismissedAppRefCurrent.current && (dismissedAppRefCurrent.current === activeRef || dismissedAppRefCurrent.current === "all")) {
            return
          }
          setLatestSubmittedApp(activeAssistanceApp)
          setSubmitted(true)
          setReferenceNumber(activeRef)
          const dateStr = activeAssistanceApp.submittedAt || activeAssistanceApp.created_at || activeAssistanceApp.dateSubmitted
          if (dateStr) {
            setSubmissionDate(new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }))
          }
        }
      } catch (err) {
        console.warn("Real-time sync error:", err)
      }
    }

    syncRealtimeApp()
    const interval = setInterval(syncRealtimeApp, 8000)

    const handleUpdate = () => syncRealtimeApp()
    window.addEventListener("storage", handleUpdate)
    window.addEventListener("pwd_senior_applications_updated", handleUpdate)
    window.addEventListener("applications_updated", handleUpdate)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("storage", handleUpdate)
      window.removeEventListener("pwd_senior_applications_updated", handleUpdate)
      window.removeEventListener("applications_updated", handleUpdate)
    }
  }, [userProfile, formData.emailAddress, formData.qcidNumber, formData.firstName, formData.lastName])

  // Uploaded Files (Step 3)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const [cameraDoc, setCameraDoc] = useState<RequiredDoc | null>(null)
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; file: File } | null>(null)

  const requiredDocuments: RequiredDoc[] = [
    {
      id: "seniorId",
      label: t("docSeniorOscaIdTitle") || "SENIOR CITIZEN ID / OSCA ID",
      description: t("docSeniorOscaIdDesc") || "Malinaw na kopya ng inyong OSCA / QC Senior Citizen ID (harapan at likod).",
      required: true,
    },
    {
      id: "validGovId",
      label: t("docValidGovIdTitle") || "VALID GOVERNMENT-ISSUED ID",
      description: t("docValidGovIdDesc") || "Passport, UMID, Driver's License, Postal ID, o Voter's Certificate.",
      required: true,
    },
    {
      id: "proofOfResidency",
      label: t("docBarangayIndigencyTitle") || "BARANGAY CERTIFICATE OF RESIDENCY O INDIGENCY",
      description: t("docBarangayIndigencyDesc") || "Katibayan ng paninirahan o indigency mula sa inyong barangay.",
      required: true,
    },
    {
      id: "idPhoto",
      label: t("docIdPhotoTitle") || "2×2 O RECENT ID PICTURE",
      description: t("docIdPhotoDesc") || "Kamakailang 2x2 ID picture na may puting background.",
      required: true,
    },
    {
      id: "proofOfIncome",
      label: t("docProofOfIncomeTitle") || "PROOF OF INCOME (KUNG MAYROON)",
      description: t("docProofOfIncomeDesc") || "Certificate of Indigency, Pension Voucher, o payslip kung may regular na pensyon.",
      required: false,
    },
    {
      id: "medicalPrescription",
      label: t("docMedicalPrescriptionTitle") || "MEDICAL CERTIFICATE / RESETA (KUNG MEDICAL-RELATED)",
      description: t("docMedicalPrescriptionDesc") || "Medical abstract, reseta ng doktor, o hospital bill kung medikal ang hinihiling.",
      required: false,
    },
    {
      id: "otherDocs",
      label: t("docOtherDocsTitle") || "OTHER SUPPORTING DOCUMENTS (OPTIONAL)",
      description: t("docOtherDocsDesc") || "Iba pang katibayan o dokumento na sumusuporta sa inyong aplikasyon.",
      required: false,
    },
  ]

  const [isVerifying, setIsVerifying] = useState(false)
  const [isIdVerified, setIsIdVerified] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifiedSeniorName, setVerifiedSeniorName] = useState<string>("")

  const handleVerifyId = async () => {
    setVerifyError(null)
    const typed = (formData.seniorIdNumber || "").trim().toUpperCase()
    const cleanTyped = typed.replace(/[^A-Z0-9]/gi, "").toUpperCase()
    const cleanDigits = typed.replace(/\D/g, "")

    if (!typed || (cleanDigits.length < 5 && cleanTyped.length < 5)) {
      setIsIdVerified(false)
      setVerifyError(
        t("seniorIdExactLengthError") ||
        "Pakilagay ang inyong valid na Senior Citizen / OSCA ID Number."
      )
      return
    }

    setIsVerifying(true)
    try {
      let allApps: any[] = []
      try {
        const res = await fetch(`${API_BASE}/api/pwd-senior/applications`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) allApps = data
        }
      } catch {}

      const localKeys = ["pwd_senior_applications", "applications", "all_user_applications", "active_applications"]
      for (const k of localKeys) {
        try {
          const local = JSON.parse(localStorage.getItem(k) || "[]")
          if (Array.isArray(local)) {
            for (const la of local) {
              if (la && !allApps.some((a) => (a.id && a.id === la.id) || (a.referenceNumber && a.referenceNumber === la.referenceNumber))) {
                allApps.push(la)
              }
            }
          }
        } catch {}
      }

      // Strict matching against registered Senior Citizen records (New App, Renewal, or existing ID)
      const matchedApp = allApps.find((a) => {
        if (!a) return false
        const cat = String(a.category || a.service || a.serviceCategory || "").toUpperCase()
        const isSenior = cat.includes("SENIOR") || cat === "SENIOR CITIZEN" || String(a.service || "").toLowerCase().includes("senior")
        if (!isSenior) return false

        const aAssignedClean = String(a.assignedIdNumber || a.assigned_id_number || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const aRefClean = String(a.referenceNumber || a.reference_number || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const aExistingClean = String(a.existingIdNumber || a.existing_id_number || a.seniorIdNumber || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const aQcidClean = String(a.qcid || a.qcidNo || a.qc_id || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()

        const aAssignedDigits = aAssignedClean.replace(/\D/g, "")
        const aRefDigits = aRefClean.replace(/\D/g, "")
        const aExistingDigits = aExistingClean.replace(/\D/g, "")
        const aQcidDigits = aQcidClean.replace(/\D/g, "")

        // 1. Strict exact alphanumeric match (all characters must match exactly)
        if (aAssignedClean && aAssignedClean === cleanTyped) return true
        if (aRefClean && aRefClean === cleanTyped) return true
        if (aExistingClean && aExistingClean === cleanTyped) return true
        if (aQcidClean && aQcidClean === cleanTyped) return true

        // 2. Exact full 16-digit or exact sequence match
        if (cleanDigits.length >= 6) {
          if (aAssignedDigits && (aAssignedDigits === cleanDigits || (cleanDigits.length >= 16 && aAssignedDigits.endsWith(cleanDigits)))) return true
          if (aRefDigits && (aRefDigits === cleanDigits || (cleanDigits.length >= 16 && aRefDigits.endsWith(cleanDigits)))) return true
          if (aExistingDigits && (aExistingDigits === cleanDigits || (cleanDigits.length >= 16 && aExistingDigits.endsWith(cleanDigits)))) return true
          if (aQcidDigits && aQcidDigits === cleanDigits) return true
        }

        return false
      })

      const userProfileClean = String(userProfile?.qcidNo || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
      const userProfileSeniorClean = String((userProfile as any)?.seniorIdNumber || (userProfile as any)?.assignedIdNumber || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
      const isProfileMatch = (userProfileClean && userProfileClean === cleanTyped) || (userProfileSeniorClean && userProfileSeniorClean === cleanTyped)

      if (matchedApp) {
        const foundName = [
          matchedApp.firstName || matchedApp.first_name,
          matchedApp.middleName || matchedApp.middle_name,
          matchedApp.lastName || matchedApp.last_name,
          matchedApp.suffix,
        ].filter(Boolean).join(" ").trim().toUpperCase()

        setIsIdVerified(true)
        setVerifyError(null)
        setVerifiedSeniorName(foundName || "SENIOR CITIZEN BENEFICIARY")

        // Auto-fill applicant details from verified Senior ID
        const bMonth = matchedApp.dobMonth || ""
        const bDay = matchedApp.dobDay || ""
        const bYear = matchedApp.dobYear || ""
        let compAge = matchedApp.age || ""
        if (bMonth && bDay && bYear && bYear.length === 4) {
          const calc = calculateAge(bMonth, bDay, bYear)
          if (calc) compAge = calc
        }

        setFormData((prev) => ({
          ...prev,
          firstName: matchedApp.firstName || matchedApp.first_name || prev.firstName,
          middleName: matchedApp.middleName || matchedApp.middle_name || prev.middleName,
          lastName: matchedApp.lastName || matchedApp.last_name || prev.lastName,
          suffix: matchedApp.suffix || prev.suffix,
          dobMonth: bMonth || prev.dobMonth,
          dobDay: bDay || prev.dobDay,
          dobYear: bYear || prev.dobYear,
          age: compAge || prev.age,
          sex: matchedApp.sex || matchedApp.gender || prev.sex,
          civilStatus: matchedApp.civilStatus || prev.civilStatus,
          contactNumber: (matchedApp.contactNo || matchedApp.cellphoneNo || matchedApp.contactNumber || prev.contactNumber || "").replace(/\s+/g, ""),
          emailAddress: matchedApp.email || prev.emailAddress,
          addressHouseNo: matchedApp.houseNo || matchedApp.addressHouseNo || prev.addressHouseNo,
          addressStreet: matchedApp.street || matchedApp.addressStreet || prev.addressStreet,
          barangay: matchedApp.barangay || matchedApp.addressBarangay || prev.barangay,
        }))
      } else if (isProfileMatch) {
        const profileName = [userProfile?.firstName, userProfile?.middleName, userProfile?.lastName].filter(Boolean).join(" ").trim().toUpperCase()
        setIsIdVerified(true)
        setVerifyError(null)
        setVerifiedSeniorName(profileName || "SENIOR CITIZEN BENEFICIARY")
      } else {
        setIsIdVerified(false)
        setVerifyError(
          t("seniorIdNotFoundError") ||
          "Hindi nahanap ang Senior Citizen / OSCA ID sa opisyal na talaan ng New App / Senior ID. Kapag may nabagong numero, ito ay ituturing na invalid."
        )
      }
    } catch (err) {
      console.warn("Verification error:", err)
      setIsIdVerified(false)
      setVerifyError(
        t("seniorIdVerifyGeneralError") ||
        "May naganap na error habang bine-verify ang Senior Citizen ID. Pakisubukang muli."
      )
    } finally {
      setIsVerifying(false)
    }
  }

  const updateField = (field: string, val: string | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: val }
      if (field === "dobMonth" || field === "dobDay" || field === "dobYear") {
        next.age = calculateAge(
          field === "dobMonth" ? (val as string) : next.dobMonth,
          field === "dobDay" ? (val as string) : next.dobDay,
          field === "dobYear" ? (val as string) : next.dobYear
        )
      }
      return next
    })
  }

  const handleFileUpload = (docId: string, file: File) => {
    setUploadedFiles((prev) => ({ ...prev, [docId]: file }))
  }

  const removeFile = (docId: string) => {
    setUploadedFiles((prev) => {
      const copy = { ...prev }
      delete copy[docId]
      return copy
    })
  }

  // Step Validations
  const isStep1Valid =
    isResident &&
    isSenior &&
    hasSeniorId &&
    isIndigentOrInNeed &&
    formData.seniorIdNumber.trim() !== "" &&
    isIdVerified

  const isStep2Valid =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.dobMonth !== "" &&
    formData.dobDay !== "" &&
    formData.dobYear !== "" &&
    formData.sex !== "" &&
    formData.civilStatus !== "" &&
    formData.contactNumber.trim() !== "" &&
    formData.addressStreet.trim() !== "" &&
    formData.barangay !== "" &&
    formData.familyMembersCount.trim() !== "" &&
    formData.monthlyIncome !== "" &&
    formData.sourceOfIncome.trim() !== "" &&
    formData.employmentStatus !== "" &&
    formData.livingArrangement !== "" &&
    formData.purposeOfAssistance.trim() !== ""

  const isStep3Valid = requiredDocuments.every((doc) => !doc.required || !!uploadedFiles[doc.id])

  const isStep4Valid = true

  const canGoNext =
    step === 1
      ? isStep1Valid
      : step === 2
      ? isStep2Valid
      : step === 3
      ? isStep3Valid
      : isStep4Valid

  const goNext = () => {
    setAttemptedNext(true)
    if (step === 1 && !isStep1Valid) return
    if (step === 2 && !isStep2Valid) return
    if (step === 3 && !isStep3Valid) return
    setAttemptedNext(false)
    if (returnToReview) {
      setStep(4)
      setReturnToReview(false)
      return
    }
    setStep((prev) => Math.min(prev + 1, 4))
  }

  const goBack = () => {
    setAttemptedNext(false)
    if (step === 1) {
      onBack?.()
      return
    }
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    const qcid = userProfile?.qcidNo || formData.qcidNumber || "110000116932100"
    setReferenceNumber(qcid)
    setSubmissionDate(
      new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    )

    const newApp = {
      id: `APP-SNR-AST-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      referenceNumber: qcid,
      qcid: qcid,
      seniorIdNumber: formData.seniorIdNumber,
      oscaId: formData.seniorIdNumber,
      category: "Senior Citizen",
      type: "social-assistance",
      firstName: formData.firstName || userProfile?.firstName || "CLARISA MAE",
      middleName: formData.middleName || userProfile?.middleName || "GALIAS",
      lastName: formData.lastName || userProfile?.lastName || "DIMAL",
      suffix: formData.suffix || "",
      dateOfBirth: `${formData.dobYear || "1960"}-${(formData.dobMonth || "10").padStart(2, "0")}-${(formData.dobDay || "29").padStart(2, "0")}`,
      age: formData.age || "65",
      sex: formData.sex || "Female",
      civilStatus: formData.civilStatus || "Single",
      contactNo: formData.contactNumber || userProfile?.contactNo || "09000000000",
      cellphoneNo: formData.contactNumber || userProfile?.contactNo || "09000000000",
      email: formData.emailAddress || userProfile?.email || "dimalmae@gmail.com",
      houseNo: formData.addressHouseNo || userProfile?.addressHouseNo || "11",
      street: formData.addressStreet || userProfile?.addressStreet || "OLD CABUYAO SAMPALOK ST",
      barangay: formData.barangay || userProfile?.addressBarangay || "Sauyo",
      city: "QUEZON CITY",
      address: `${formData.addressHouseNo || "11"} ${formData.addressStreet || "OLD CABUYAO SAMPALOK ST"} ${formData.barangay || "Sauyo"}, QUEZON CITY`.trim(),
      householdMembersCount: formData.familyMembersCount || "1",
      householdMembers: formData.familyMembersCount || "1",
      numberOfHouseholdMembers: formData.familyMembersCount || "1",
      familyMembersCount: formData.familyMembersCount || "1",
      monthlyHouseholdIncome: formData.monthlyIncome || "Below ₱5,000",
      monthlyIncome: formData.monthlyIncome || "Below ₱5,000",
      livingArrangement: formData.livingArrangement || "Alone",
      employmentStatus: formData.employmentStatus || "Retired / Pensyonado",
      pensionSource: formData.employmentStatus || "Retired / Pensyonado",
      sourceOfIncome: formData.sourceOfIncome || "",
      purposeOfAssistance: formData.purposeOfAssistance || "",
      reasonForRequest: formData.purposeOfAssistance || "Financial Support",
      needDescription: formData.purposeOfAssistance || "",
      assistanceType: "Social Assistance / Pension",
      applyingFor: "myself",
      extra_data: {
        seniorIdNumber: formData.seniorIdNumber,
        oscaId: formData.seniorIdNumber,
        livingArrangement: formData.livingArrangement,
        familyMembersCount: formData.familyMembersCount,
        monthlyIncome: formData.monthlyIncome,
        employmentStatus: formData.employmentStatus,
        sourceOfIncome: formData.sourceOfIncome,
        purposeOfAssistance: formData.purposeOfAssistance,
      },
      documents: await Promise.all(
        Object.keys(uploadedFiles).map(async (k) => {
          const f = uploadedFiles[k]
          const dataUrl = f ? await readFileAsDataUrl(f, 1000, 0.75) : ""
          return {
            name: k,
            filename: f?.name || "doc.jpg",
            fileUrl: dataUrl || "",
            uploadedAt: new Date().toISOString(),
            status: "verified",
          }
        })
      ),
      status: "pending",
    }

    try {
      // 1. Submit to backend API first
      await fetch(`${API_BASE}/api/pwd-senior/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp),
      })

      // 2. Safe localStorage
      try {
        const existing = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
        localStorage.setItem("pwd_senior_applications", JSON.stringify([newApp, ...existing.slice(0, 5)]))
      } catch {
        const lightApp = {
          ...newApp,
          documents: newApp.documents.map((d: any) => ({ ...d, fileUrl: d.filename })),
        }
        localStorage.setItem("pwd_senior_applications", JSON.stringify([lightApp]))
      }
      window.dispatchEvent(new Event("pwd_senior_applications_updated"))

      // Dispatch real-time event to Admin dashboard
      notifyApplicationChange("APPLICATION_SUBMITTED", "pwd_senior", qcid)
    } catch {
      notifyApplicationChange("APPLICATION_SUBMITTED", "pwd_senior", qcid)
    }

    bypassedActiveAppRef.current = false
    dismissedAppRefCurrent.current = null

    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 1000)
  }

  if (submitted) {
    const isAppApproved = String(latestSubmittedApp?.status || "").toLowerCase() === "approved" || String(latestSubmittedApp?.status || "").toLowerCase() === "completed" || String(latestSubmittedApp?.status || "").toLowerCase() === "for_release"
    const displayRef = latestSubmittedApp?.referenceNumber || latestSubmittedApp?.reference_no || latestSubmittedApp?.reference_number || referenceNumber || (userProfile as any)?.qcidNo || "110000116932100"
    const rawDate = latestSubmittedApp?.submittedAt || latestSubmittedApp?.submitted_at || latestSubmittedApp?.created_at || latestSubmittedApp?.dateSubmitted
    const displayDate = formatAppDate(rawDate, latestSubmittedApp)

    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-150">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isAppApproved ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-500"}`}>
            {isAppApproved ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <Info className="h-8 w-8 text-amber-500" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isAppApproved ? "Application Approved" : "You Have an Active Application"}
            </h2>
            <p className="text-sm text-gray-500 max-w-md mt-1 leading-relaxed">
              {isAppApproved
                ? "Your application for Senior Citizen Social Assistance has been officially approved! You can check your scheduled appointment or payout release status in Financial Aid / My Applications."
                : "Your application for Senior Citizen Social Assistance has been successfully submitted and is currently pending review. Please wait for a Social Worker's assessment before submitting a new application."}
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-gray-500 font-medium">Application Reference No.:</span>
              <span className="font-mono font-bold text-blue-600">{displayRef}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-gray-500 font-medium">Status:</span>
              {isAppApproved ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Under Review (Pending)
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Date Filed:</span>
              <span className="font-semibold text-gray-700">
                {displayDate}
              </span>
            </div>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false)
                setStep(1)
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>
                {language === "en"
                  ? "RE-APPLY (SUBMIT NEW APPLICATION)"
                  : language === "bis"
                  ? "MAG-APPLY PAG-USAB (RE-APPLY)"
                  : "MAG-APPLY MULI (RE-APPLY APPLICATION)"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem("pwd_senior_reapplying_senior_social-assistance")
                  localStorage.removeItem("pwd_senior_reapplying")
                } catch {}
                window.location.href = "/portal/financial-aid"
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-colors cursor-pointer uppercase tracking-wider"
            >
              {language === "tl"
                ? "TINGNAN SA FINANCIAL AID / APPLICATION HISTORY"
                : language === "bis"
                ? "TAN-AWA SA FINANCIAL AID / APPLICATION HISTORY"
                : "VIEW IN FINANCIAL AID / APPLICATION HISTORY"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      {/* Main Wizard Card with 5-Step Indicator */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        {/* Step indicator dots */}
        <div className="flex items-center px-6 pt-6 pb-4">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div
                className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  s.id === step
                    ? "bg-blue-600 text-white"
                    : s.id < step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s.id < step ? <Check className="h-4 w-4" /> : s.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-2 ${s.id < step ? "bg-blue-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Tab labels bar */}
        <div className="flex gap-2 border-b border-border bg-gray-50 p-2 overflow-x-auto">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                s.id === step
                  ? "bg-blue-600 text-white shadow-xs"
                  : s.id < step
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Current Step Sub-Header */}
        <div className="px-6 pt-4 pb-2">
          <h2 className="text-lg font-bold text-foreground">{STEPS[step - 1]?.label}</h2>
        </div>

        {/* Step Body */}
        <div className="p-6 md:p-8 min-h-[380px]">
          {/* ──────────────── STEP 1: CHECKLIST ──────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">
                  MGA KINAKAILANGAN AT KWALIPIKASYON (ELIGIBILITY CHECKLIST)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pakisagot ang mga katanungan sa ibaba upang maberipika ang inyong kwalipikasyon para sa Senior Citizen Social Assistance.
                </p>
              </div>

              {attemptedNext && !isStep1Valid && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Kailangang kumpirmahin ang lahat ng katanungan at i-verify ang inyong Senior Citizen / OSCA ID number.</span>
                </div>
              )}

              {/* Blue Info Alert Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Tulong Panlipunan ng Quezon City SSDD at OSCA
                  </h4>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    Ang programang ito ay naglalayong magkaloob ng ayuda, gamot, assistive devices, at suportang medikal sa mga kapus-palad o nangangailangang senior citizens ng lungsod.
                  </p>
                </div>
              </div>

              {/* Eligibility Checkboxes */}
              <div className="space-y-3 bg-gray-50/60 border border-border rounded-xl p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isResident}
                    onChange={(e) => setIsResident(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className={`text-sm ${attemptedNext && !isResident ? "text-red-600 font-semibold" : "text-blue-700"}`}>
                    Ikaw ba ay isang lehitimong residente ng Quezon City? <span className="text-red-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSenior}
                    onChange={(e) => setIsSenior(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className={`text-sm ${attemptedNext && !isSenior ? "text-red-600 font-semibold" : "text-blue-700"}`}>
                    Ikaw ba ay 60 taong gulang na pataas? <span className="text-red-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSeniorId}
                    onChange={(e) => setHasSeniorId(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className={`text-sm ${attemptedNext && !hasSeniorId ? "text-red-600 font-semibold" : "text-blue-700"}`}>
                    Mayroon ka na bang opisyal na QC Senior Citizen / OSCA ID? <span className="text-red-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIndigentOrInNeed}
                    onChange={(e) => setIsIndigentOrInNeed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className={`text-sm ${attemptedNext && !isIndigentOrInNeed ? "text-red-600 font-semibold" : "text-blue-700"}`}>
                    Kabilang ka ba sa kapus-palad o indigent na sektor na nangangailangan ng agarang tulong? <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              {/* Senior Citizen ID Number input */}
              <div className="bg-slate-50 border border-blue-200 rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Senior Citizen / OSCA ID Number <span className="text-red-500">*</span>
                  </label>
                  {isIdVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" /> OSCA ID Verified
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={formData.seniorIdNumber}
                    onChange={(e) => {
                      const formatted = formatSeniorId(e.target.value)
                      updateField("seniorIdNumber", formatted)
                      setIsIdVerified(false)
                      setVerifyError(null)
                    }}
                    placeholder={t("seniorIdNumberPlaceholder") || "e.g. 137404-2026-XXXXXX"}
                    maxLength={18}
                    className={`flex-1 border rounded-lg px-3 py-2.5 text-sm font-mono transition-all focus:outline-none ${
                      isIdVerified
                        ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 text-gray-900"
                        : verifyError
                        ? "border-red-400 bg-red-50/20 ring-2 ring-red-400/20 text-gray-900"
                        : "border-border bg-white focus:ring-2 focus:ring-blue-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyId}
                    disabled={!formData.seniorIdNumber.trim() || isVerifying}
                    className={`px-5 py-2.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 ${
                      isIdVerified
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : isIdVerified ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>VERIFIED</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>VERIFY ID</span>
                      </>
                    )}
                  </button>
                </div>
                {verifyError && (
                  <div className="border border-red-200 bg-red-50 rounded-lg p-3 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{t("idVerificationErrorTitle") || "Invalid ID Number"}</p>
                      <p className="mt-0.5 text-red-700">{verifyError}</p>
                    </div>
                  </div>
                )}
                {attemptedNext && !formData.seniorIdNumber.trim() && (
                  <p className="text-xs text-red-500">Kailangang ilagay ang inyong Senior Citizen / OSCA ID Number.</p>
                )}
                {attemptedNext && formData.seniorIdNumber.trim() !== "" && !isIdVerified && !verifyError && (
                  <p className="text-xs text-red-500">Pakipindot ang VERIFY ID at tiyaking verified ang ID bago magpatuloy.</p>
                )}
                {isIdVerified && (
                  <div className="mt-1 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t("seniorIdRecordFound", { name: verifiedSeniorName || formData.seniorIdNumber })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── STEP 2: PERSONAL & HOUSEHOLD INFO ──────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">{(t("pwdPersonalInfoHeader") || "PERSONAL INFORMATION").toUpperCase()}</h3>
              </div>

              {/* IMPORTANT REMINDER BOX */}
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-600">{t("importantReminder") || "IMPORTANT REMINDER"}</p>
                  <p className="text-blue-600/90 mt-0.5 text-xs">
                    {t("qcidReminderNote") || "Please make sure the information on your QCID is correct and complete. If any detail is missing or incorrect, contact the QCID Team to update your QCID records before continuing your application. Accurate information is important for fast and smooth processing of your service."}
                  </p>
                </div>
              </div>

              {attemptedNext && !isStep2Valid && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Mangyaring punan ang lahat ng kinakailangang fields na may pulang asterisko (*).</span>
                </div>
              )}

              {/* Applicant QCID Profile Information Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("qcIdLabel") || "QC ID"} *</label>
                    <input
                      type="text"
                      value={formData.qcidNumber}
                      onChange={(e) => updateField("qcidNumber", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Senior Citizen / OSCA ID Number *</label>
                    <input
                      type="text"
                      value={formData.seniorIdNumber}
                      onChange={(e) => updateField("seniorIdNumber", e.target.value)}
                      placeholder="e.g. 137404-2026-XXXXXX"
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("firstNameLabel") || "First name"} *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("middleNameLabel") || "Middle name"}</label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => updateField("middleName", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("lastNameLabel") || "Last name"} *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("suffixLabel") || "Suffix (Jr., Sr., III, etc.)"}</label>
                    <input
                      type="text"
                      value={formData.suffix}
                      onChange={(e) => updateField("suffix", e.target.value)}
                      placeholder={t("suffixLabel") || "Suffix (Jr., Sr., etc.)"}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("nationalityLabel") || "Nationality"} *</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => updateField("nationality", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("birthDateLabel") || "Date of birth"} *</label>
                    <input
                      type="text"
                      value={`${formData.dobMonth}/${formData.dobDay}/${formData.dobYear}`}
                      onChange={(e) => {
                        const parts = e.target.value.split("/")
                        if (parts.length === 3) {
                          updateField("dobMonth", parts[0])
                          updateField("dobDay", parts[1])
                          updateField("dobYear", parts[2])
                        }
                      }}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("ageLabel") || "Age"} *</label>
                    <input
                      type="text"
                      value={formData.age}
                      onChange={(e) => updateField("age", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("genderLabel") || "Gender"} *</label>
                    <input
                      type="text"
                      value={formData.sex}
                      onChange={(e) => updateField("sex", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("civilStatusLabel") || "Civil status"} *</label>
                    <input
                      type="text"
                      value={formData.civilStatus}
                      onChange={(e) => updateField("civilStatus", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("houseNumberLabel") || "House/Building number"} *</label>
                    <input
                      type="text"
                      value={formData.addressHouseNo}
                      onChange={(e) => updateField("addressHouseNo", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("streetNameLabel") || "Street name"} *</label>
                    <input
                      type="text"
                      value={formData.addressStreet}
                      onChange={(e) => updateField("addressStreet", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("barangayLabel") || "Barangay"} *</label>
                    <input
                      type="text"
                      value={formData.barangay}
                      onChange={(e) => updateField("barangay", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("phoneNumberLabel") || "Phone number"} *</label>
                    <input
                      type="text"
                      value={formData.contactNumber}
                      onChange={(e) => updateField("contactNumber", e.target.value)}
                      readOnly={!isEditingInfo}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Household & Economic Situation */}
              <div className="border-t border-border pt-4 space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600" />
                  <span>{t("seniorHouseholdSituationTitle") || "Kalagayan ng Sambahayan at Kabuhayan"}</span>
                </h4>

                {/* Living Arrangement */}
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide block mb-2">
                    {t("seniorLivingArrangementLabel") || "Kaayusan sa Tirahan (Living Arrangement)"} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        id: "Alone",
                        label: t("seniorLivingAloneTitle") || "Alone (Mag-isa)",
                        desc: t("seniorLivingAloneDesc") || "Nakatira nang mag-isa sa tahanan",
                      },
                      {
                        id: "With Family",
                        label: t("seniorLivingFamilyTitle") || "With Family (Kasama ang Pamilya)",
                        desc: t("seniorLivingFamilyDesc") || "Kasama ang mga anak, apo, o asawa",
                      },
                      {
                        id: "With Caregiver",
                        label: t("seniorLivingCaregiverTitle") || "With Caregiver (Kasama ang Tagapag-alaga)",
                        desc: t("seniorLivingCaregiverDesc") || "May tagapag-alaga na nag-aasikaso",
                      },
                    ].map((opt) => {
                      const isSelected = formData.livingArrangement === opt.id
                      return (
                        <div
                          key={opt.id}
                          onClick={() => updateField("livingArrangement", opt.id)}
                          className={`border rounded-xl p-3.5 cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                              : "border-border hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{opt.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide block mb-1">
                      {t("seniorFamilyMembersCountLabel") || "Bilang ng Kasapi sa Bahay"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.familyMembersCount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 2)
                        updateField("familyMembersCount", val)
                      }}
                      placeholder="1"
                      maxLength={2}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide block mb-1">
                      {t("seniorMonthlyFamilyIncomeLabel") || "Buwanang Kita ng Pamilya"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.monthlyIncome}
                      onChange={(e) => updateField("monthlyIncome", e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {[
                        { value: "Below ₱5,000", label: t("seniorIncomeBelow5k") || "Below ₱5,000" },
                        { value: "₱5,000 - ₱10,000", label: t("seniorIncome5kTo10k") || "₱5,000 – ₱10,000" },
                        { value: "₱10,001 - ₱20,000", label: t("seniorIncome10kTo20k") || "₱10,001 – ₱20,000" },
                      ].map((inc) => (
                        <option key={inc.value} value={inc.value}>{inc.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide block mb-1">
                      {t("seniorEmploymentPensionStatusLabel") || "Katayuan sa Trabaho / Pensyon"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.employmentStatus}
                      onChange={(e) => updateField("employmentStatus", e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {[
                        { value: "Retired / Pensioner", label: t("seniorEmpRetired") || "Retired / Pensioner" },
                        { value: "Unemployed", label: t("seniorEmpUnemployed") || "Unemployed" },
                        { value: "Self-employed / Small Business", label: t("seniorEmpSelfEmployed") || "Self-employed / Small Business" },
                        { value: "Part-time Worker", label: t("seniorEmpPartTime") || "Part-time Worker" },
                        { value: "Employed", label: t("seniorEmpEmployed") || "Employed" },
                      ].map((emp) => (
                        <option key={emp.value} value={emp.value}>{emp.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide block mb-1 ${attemptedNext && !formData.sourceOfIncome.trim() ? "text-red-600 font-semibold" : "text-foreground"}`}>
                    {t("seniorSourceOfIncomeLabel") || "Pinagkukunan ng Kita / Pensyon"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sourceOfIncome}
                    onChange={(e) => updateField("sourceOfIncome", e.target.value)}
                    placeholder={t("seniorSourceOfIncomePlaceholder") || "Maliit na pensyon at tulong mula sa mga kamag-anak"}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      attemptedNext && !formData.sourceOfIncome.trim()
                        ? "border-red-400 focus:ring-red-300 bg-red-50"
                        : "border-border bg-white focus:ring-blue-400"
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide block mb-1 ${attemptedNext && !formData.purposeOfAssistance.trim() ? "text-red-600 font-semibold" : "text-foreground"}`}>
                    {t("seniorPurposeOfAssistanceLabel") || "Dahilan at Layunin ng Kahilingan"} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.purposeOfAssistance}
                    onChange={(e) => updateField("purposeOfAssistance", e.target.value)}
                    placeholder={t("seniorPurposeOfAssistancePlaceholder") || "Pambili ng maintenance medicine para sa hypertension at diabetes, at pambayad sa pang-araw-araw na pangangailangan."}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      attemptedNext && !formData.purposeOfAssistance.trim()
                        ? "border-red-400 focus:ring-red-300 bg-red-50"
                        : "border-border bg-white focus:ring-blue-400"
                    }`}
                  />
                </div>
              </div>

              {attemptedNext && !isStep2Valid && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{t("seniorFillAllRequiredFieldsError") || "Mangyaring punan ang lahat ng kinakailangang fields na may pulang asterisko (*)."}</span>
                </div>
              )}
            </div>
          )}

          {/* ──────────────── STEP 3: DOCUMENTS / FILE UPLOAD ──────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">{t("fileUploadHeader") || "File upload"}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("fileUploadDesc1") || "Make sure to upload the appropriate documents for each category and verify that all details match the information on your QC ID."}
              </p>

              {attemptedNext && !isStep3Valid && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>All required documents must be uploaded before continuing.</span>
                </div>
              )}

              <div className="space-y-6 pt-2">
                {requiredDocuments.map((doc) => {
                  const file = uploadedFiles[doc.id]
                  const inputId = `upload-doc-${doc.id}`
                  const missing = attemptedNext && doc.required && !file

                  return (
                    <div key={doc.id}>
                      <div
                        className={`border rounded-xl p-5 transition-colors ${
                          file
                            ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 dark:border-emerald-500/30"
                            : missing
                            ? "border-red-500/40 bg-red-500/10 dark:bg-red-950/30 dark:border-red-500/30"
                            : "border-border bg-card/60 dark:bg-slate-900/40"
                        }`}
                      >
                        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground uppercase tracking-wide">
                          {doc.label} {doc.required ? <span className="text-red-500">*</span> : <span className="text-muted-foreground font-normal text-[10px] lowercase">(opsyonal)</span>}
                          {file && (
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white shrink-0">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>

                        <p className="text-xs text-muted-foreground mt-2">
                          {t("allowedFileTypesCameraNote") || "Allowed file types: JPG, JPEG, PNG, WEBP (o kumuha gamit ang Camera)"}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                          <input
                            type="file"
                            id={inputId}
                            accept=".jpg,.jpeg,.png,.webp,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleFileUpload(doc.id, f)
                              e.target.value = ""
                            }}
                          />
                          <label
                            htmlFor={inputId}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {t("uploadPhotoBtn") || "UPLOAD PHOTO"}
                          </label>

                          <button
                            type="button"
                            onClick={() => setCameraDoc(doc)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            {t("takePhotoCameraBtn") || "KUMUHA NG LARAWAN (CAMERA)"}
                          </button>
                        </div>

                        {file && (
                          <div className="flex flex-wrap gap-3 pt-4">
                            <div className="relative w-40 border border-border rounded-lg bg-card dark:bg-slate-900/90 shadow-sm p-3 flex flex-col items-center text-center shadow-xs">
                              <button
                                type="button"
                                onClick={() => removeFile(doc.id)}
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer"
                                aria-label={`Alisin ang ${file.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <div className="h-12 w-12 rounded-md overflow-hidden border border-border mb-2 flex items-center justify-center bg-muted/40 dark:bg-slate-800">
                                <FileThumbnail file={file} className="h-full w-full object-cover" />
                              </div>
                              <p className="text-xs font-medium text-foreground truncate w-full">{file.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                        )}

                        {missing && (
                          <p className="text-xs text-red-500 mt-2">
                            {t("pwdStillNeedsUploadNote") || "Kailangan pang mag-upload ng dokumento para sa kinakailangang item na ito."}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ──────────────── STEP 4: REVIEW & SUBMIT ──────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-foreground">{(t("pwdReviewHeader") || "REVIEW INFORMATION").toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">{t("pwdReviewDesc") || "Pakisuri nang mabuti ang lahat ng impormasyon at uploaded documents bago isumite ang aplikasyon."}</p>
              </div>

              {/* Section 1: Checklist & Assistance */}
              <ReviewSection title="Mga Kinakailangan at Tulong na Hinihiling" onEdit={() => { setReturnToReview(true); setStep(1) }}>
                <div className="divide-y divide-border">
                  <ReviewCheckItem ok={isResident} label="Lehitimong residente ng Quezon City" />
                  <ReviewCheckItem ok={isSenior} label="60 taong gulang na pataas (Senior Citizen)" />
                  <ReviewCheckItem ok={hasSeniorId} label={`May QC Senior Citizen / OSCA ID: ${formData.seniorIdNumber}`} />
                  <ReviewCheckItem ok={isIndigentOrInNeed} label="Kabilang sa kapus-palad o nangangailangang sektor" />
                </div>
              </ReviewSection>

              {/* Section 2: Personal & Household */}
              <ReviewSection title="Personal na Impormasyon at Kalagayan ng Tahanan" onEdit={() => { setReturnToReview(true); setStep(2) }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <ReviewField label="QC ID" value={formData.qcidNumber} />
                  <ReviewField label="Senior Citizen / OSCA ID" value={formData.seniorIdNumber} />
                  <ReviewField
                    label="Buong Pangalan"
                    value={`${formData.firstName} ${formData.middleName} ${formData.lastName} ${formData.suffix}`}
                  />
                  <ReviewField
                    label="Petsa ng Kapanganakan"
                    value={`${formData.dobMonth} ${formData.dobDay}, ${formData.dobYear}`}
                  />
                  <ReviewField label="Edad at Kasarian" value={`${formData.age} taong gulang, ${formData.sex}`} />
                  <ReviewField label="Katayuang Sibil" value={formData.civilStatus} />
                  <ReviewField label="Barangay" value={formData.barangay} />
                  <div className="sm:col-span-2">
                    <ReviewField label="Kumpletong Address" value={`${formData.addressHouseNo ? `${formData.addressHouseNo} ` : ""}${formData.addressStreet}, Brgy. ${formData.barangay}, Quezon City`} />
                  </div>
                  <ReviewField label="Contact Number" value={formData.contactNumber} />
                  <ReviewField label="Living Arrangement" value={formData.livingArrangement} />
                  <ReviewField label="Kasama sa Bahay" value={`${formData.familyMembersCount} miyembro`} />
                  <ReviewField label="Buwanang Kita" value={formData.monthlyIncome} />
                  <ReviewField label="Trabaho / Pensyon" value={formData.employmentStatus} />
                  <div className="sm:col-span-2">
                    <ReviewField label="Pinagkukunan ng Kita" value={formData.sourceOfIncome} />
                  </div>
                  <div className="sm:col-span-2">
                    <ReviewField label="Layunin ng Kahilingan" value={formData.purposeOfAssistance} />
                  </div>
                </div>
              </ReviewSection>

              {/* Section 3: Documents */}
              <ReviewSection title="Mga Dokumentong Na-upload" onEdit={() => { setReturnToReview(true); setStep(3) }}>
                <div className="space-y-4">
                  {requiredDocuments.map((doc) => {
                    const file = uploadedFiles[doc.id]
                    const uploaded = Boolean(file)
                    if (!uploaded && !doc.required) return null

                    return (
                      <div key={doc.id}>
                        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                          {doc.label} {doc.required && <span className="text-red-500">*</span>}
                          {uploaded ? (
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 shrink-0">
                              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                            </span>
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                        </p>
                        {uploaded ? (
                          <div className="mt-2 space-y-2">
                            <button
                              type="button"
                              onClick={() => setPreviewDocModal({ title: doc.label, file })}
                              className="w-full max-w-md border border-border hover:border-blue-400 rounded-lg overflow-hidden text-left bg-white cursor-pointer transition-colors shadow-xs"
                            >
                              <div className="h-28 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                <FileThumbnail file={file} className="h-full w-full object-cover" />
                              </div>
                              <div className="px-3 py-2 text-center border-t border-border bg-white">
                                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>
                              </div>
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">{t("noFileUploadedYet") || "Walang nai-upload na dokumento"}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ReviewSection>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between border-t border-border bg-gray-50 px-6 py-4">
          {step === 1 && !onBack ? (
            <div />
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-white border border-border text-foreground hover:bg-gray-100 cursor-pointer transition-colors"
            >
              {t("backButton").toUpperCase()}
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className={`flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
                canGoNext
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>{t("nextButton").toUpperCase()}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAttemptedNext(true)
                if (!isStep4Valid) return
                setShowConfirmModal(true)
              }}
              disabled={!isStep4Valid}
              className={`px-8 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2 ${
                isStep4Valid
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>SUBMIT APPLICATION</span>
            </button>
          )}
        </div>
      </div>

      {/* 🔔 CONFIRMATION DIALOG / MODAL BEFORE SUBMIT */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-border"
          >
            {/* Modal Header */}
            <div className="p-6 pb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Review Before Submission</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Please make sure that all information and uploaded documents are correct. You can still go back and make changes before submitting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                aria-label="Isara"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-gray-50 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  setStep(4)
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-white transition-colors cursor-pointer"
              >
                ← GO BACK &amp; EDIT
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  handleFinalSubmit()
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>YES, SUBMIT APPLICATION</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📸 Document Camera Capture Modal */}
      <DocumentCameraModal
        isOpen={Boolean(cameraDoc)}
        onClose={() => setCameraDoc(null)}
        docTitle={cameraDoc?.label}
        onCapture={(file) => {
          if (cameraDoc) {
            handleFileUpload(cameraDoc.id, file)
          }
        }}
      />

      {/* 👁️ UPLOADED DOCUMENT FULL PREVIEW MODAL */}
      {previewDocModal && (
        <UploadedDocPreviewModal
          title={previewDocModal.title}
          file={previewDocModal.file}
          onClose={() => setPreviewDocModal(null)}
        />
      )}
    </div>
  )
}

function FileThumbnail({ file, className }: { file: File; className?: string }) {
  const [src, setSrc] = useState<string>("")
  const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp|jfif|bmp|gif)$/i.test(file.name)

  useEffect(() => {
    if (!isImg) return
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file, isImg])

  if (isImg && src) {
    return <img src={src} alt={file.name} className={className || "h-full w-full object-cover"} />
  }
  return <FileText className="h-8 w-8 text-muted-foreground" />
}

function UploadedDocPreviewModal({
  title,
  file,
  onClose,
}: {
  title: string
  file: File | null
  onClose: () => void
}) {
  if (!file) return null
  const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|jfif|bmp|gif)$/i.test(file.name)
  const [previewUrl, setPreviewUrl] = useState<string>("")

  useEffect(() => {
    if (!isImage) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file, isImage])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide truncate pr-2">{title}</h4>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 max-h-[65vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
          {isImage && previewUrl ? (
            <img src={previewUrl} alt={title} className="max-w-full max-h-[55vh] rounded-lg border border-border object-contain shadow-xs" />
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <FileText className="h-12 w-12 text-blue-500" />
              <p className="text-sm font-medium">{file.name}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground truncate bg-white">
          {file.name}
        </div>
      </div>
    </div>
  )
}
