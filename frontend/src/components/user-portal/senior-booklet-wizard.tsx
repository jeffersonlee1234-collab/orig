import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Check,
  CheckCircle2,
  Upload,
  Camera,
  FileText,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Info,
  Pencil,
} from "lucide-react"
import DocumentCameraModal from "../ui/document-camera-modal"
import { useLanguage } from "../ui/language-context"
import { API_BASE } from "../../config/api"
import { fetchPwdSeniorApplications } from "../../utils/cachedApiFetch"
import { notifyApplicationChange } from "../../utils/realtimeSync"
import { readFileAsDataUrl } from "../../utils/fileUpload"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { formatAppDate } from "./my-applications"

export interface UserProfile {
  qcidNo?: string
  firstName?: string
  middleName?: string
  lastName?: string
  suffix?: string
  nationality?: string
  dobMonth?: string
  dobDay?: string
  dobYear?: string
  age?: string
  sex?: string
  civilStatus?: string
  addressHouseNo?: string
  addressStreet?: string
  addressBarangay?: string
  addressCity?: string
  contactNo?: string
  email?: string
  emergencyFirstName?: string
  emergencyLastName?: string
  emergencyContactNo?: string
  emergencyRelationship?: string
}

export interface SeniorBookletWizardProps {
  bookletType?: "medicine" | "movie"
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

function formatFileSize(bytes: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatSeniorNumber(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 16)
  if (digits.length <= 6) return digits
  if (digits.length <= 10) return `${digits.slice(0, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 16)}`
}

export default function SeniorBookletWizard({
  bookletType = "medicine",
  onBack,
  userProfile: propUserProfile,
  onStepChange,
}: SeniorBookletWizardProps) {
  const { t } = useLanguage()
  const [profile, setProfile] = useState(() => (propUserProfile || getCurrentUserProfile()) as any)

  useEffect(() => {
    const handleProfileUpdate = () => {
      const p = getCurrentUserProfile() as any
      setProfile(p)
      if (p) {
        setFormData((prev) => ({
          ...prev,
          qcidNo: p.qcidNo || p.qcidNumber || prev.qcidNo,
          firstName: p.firstName || prev.firstName,
          middleName: p.middleName || prev.middleName,
          lastName: p.lastName || prev.lastName,
          suffix: p.suffix || prev.suffix,
          nationality: p.nationality || p.nationality || "FILIPINO",
          dobMonth: p.dobMonth || prev.dobMonth,
          dobDay: p.dobDay || prev.dobDay,
          dobYear: p.dobYear || prev.dobYear,
          age: String(p.age || prev.age || ""),
          sex: p.sex || p.gender || prev.sex,
          civilStatus: p.civilStatus || prev.civilStatus,
          addressHouseNo: p.addressHouseNo || p.houseNo || prev.addressHouseNo,
          addressStreet: p.addressStreet || p.street || prev.addressStreet,
          addressBarangay: p.addressBarangay || p.barangay || prev.addressBarangay,
          addressCity: p.addressCity || p.city || prev.addressCity,
          contactNumber: String(p.contactNo || p.mobileNumber || prev.contactNumber || "").replace(/\s+/g, ""),
          emailAddress: p.email || prev.emailAddress,
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
  const isMedicine = bookletType === "medicine"
  const title = isMedicine ? (t("navSeniorMedicineBooklet") || "Medicine Discount Booklet") : (t("navSeniorMovieBooklet") || "Free Movie Booklet")

  const STEPS = [
    { id: 1, label: t("wizardChecklist") || "COMPLETE CHECKLIST" },
    { id: 2, label: t("wizardPersonal") || "PERSONAL INFORMATION" },
    { id: 3, label: t("pwdStepDocuments")?.toUpperCase() || "UPLOAD DOCUMENTS" },
    { id: 4, label: t("wizardReview") || "REVIEW & SUBMIT" },
  ]

  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [attemptedNext, setAttemptedNext] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedApp, setBlockedApp] = useState<any>(null)
  const [bypassedBlock, setBypassedBlock] = useState(false)
  const bypassedBlockRef = useRef(false)
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3)
  const [referenceNumber, setReferenceNumber] = useState("")
  const [submissionDate, setSubmissionDate] = useState("")

  useEffect(() => {
    if (isBlocked && !bypassedBlock) {
      onStepChange?.(0)
    } else {
      onStepChange?.(step)
    }
  }, [step, isBlocked, bypassedBlock, onStepChange])

  // Reload / Navigation warning protection
  useEffect(() => {
    if (step > 1 && !submitted) {
      ;(window as any).__isFormDirty = true
    } else {
      ;(window as any).__isFormDirty = false
    }
    return () => {
      ;(window as any).__isFormDirty = false
    }
  }, [step, submitted])

  // Auto-redirect to pending status screen (Pic 2) after 3 seconds on submitted
  useEffect(() => {
    if (!submitted) return

    setRedirectCountdown(3)
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsBlocked(true)
          setSubmitted(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [submitted])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step > 1 && !submitted) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [step, submitted])

  // STEP 1 Checklist
  const [isResident, setIsResident] = useState(false)
  const [isSenior, setIsSenior] = useState(false)
  const [hasSeniorId, setHasSeniorId] = useState(false)
  const [hasPriorBooklet, setHasPriorBooklet] = useState<"yes" | "no" | "">("")
  const [applicationType, setApplicationType] = useState<"new" | "renewal" | "replacement">("new")

  // ID Verification state
  const [oscaIdInput, setOscaIdInput] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isIdVerified, setIsIdVerified] = useState(false)
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; file: File } | null>(null)

  // Renewal / Replacement fields
  const [bookletNumber, setBookletNumber] = useState("")
  const [renewalReason, setRenewalReason] = useState("Renewal due")
  const [replacementReason, setReplacementReason] = useState("Lost")

  const combinedRequestType =
    applicationType === "renewal"
      ? renewalReason === "Renewal due"
        ? "renewal:due"
        : "renewal:full"
      : replacementReason === "Damaged / Torn"
      ? "replacement:damaged"
      : replacementReason === "Stolen"
      ? "replacement:stolen"
      : "replacement:lost"

  const handleCombinedRequestChange = (val: string) => {
    if (val.startsWith("renewal")) {
      setApplicationType("renewal")
      if (val === "renewal:due") {
        setRenewalReason("Renewal due")
      } else {
        setRenewalReason("Booklet pages are full")
      }
    } else {
      setApplicationType("replacement")
      if (val === "replacement:damaged") {
        setReplacementReason("Damaged / Torn")
      } else if (val === "replacement:stolen") {
        setReplacementReason("Stolen")
      } else {
        setReplacementReason("Lost")
      }
    }
  }

  // STEP 2 Personal Information
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [formData, setFormData] = useState(() => {
    const prof: any = propUserProfile || getCurrentUserProfile() || {}
    return {
      qcidNo: prof.qcidNo || prof.qcidNumber || getLoggedInUserQcid(),
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
      addressBarangay: prof.addressBarangay || prof.barangay || "Sauyo",
      addressCity: prof.addressCity || prof.city || "QUEZON CITY",
      contactNumber: String(prof.contactNo || prof.mobileNumber || "").replace(/\s+/g, ""),
      emailAddress: prof.email || "",
      emergencyFirstName: prof.emergencyFirstName || "",
      emergencyLastName: prof.emergencyLastName || "",
      emergencyContactNo: prof.emergencyContactNo || "",
      emergencyRelationship: prof.emergencyRelationship || "",
      certified: false,
    }
  })

  // STEP 3 Uploaded Files
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const [cameraDoc, setCameraDoc] = useState<{ id: string; label: string } | null>(null)

  // Dynamic Required Documents according to application type
  const getRequiredDocuments = (): RequiredDoc[] => {
    if (isMedicine) {
      if (applicationType === "new") {
        return [
          {
            id: "seniorId",
            label: "Senior Citizen / OSCA ID",
            description: "Malinaw na kopya ng inyong OSCA / QC Senior Citizen ID (harapan at likod).",
            required: true,
          },
          {
            id: "validGovId",
            label: "Valid Government-issued ID",
            description: "Passport, UMID, Driver's License, Postal ID, o Voter's Certificate.",
            required: true,
          },
          {
            id: "idPhoto",
            label: "Recent 2×2 / ID Picture",
            description: "Kamakailang 2x2 colored photo na may puting background.",
            required: true,
          },
          {
            id: "proofOfResidency",
            label: "Proof of Residency (kung required)",
            description: "Barangay Certificate of Residency o kamakailang utility bill sa Quezon City.",
            required: true,
          },
          {
            id: "prescription",
            label: "Prescription / Medical Document",
            description: "Kasalukuyang reseta ng doktor o medical certificate para sa maintenance medications.",
            required: true,
          },
        ]
      } else if (applicationType === "renewal") {
        return [
          {
            id: "seniorId",
            label: "Senior Citizen / OSCA ID",
            description: "Malinaw na kopya ng inyong OSCA / QC Senior Citizen ID (harapan at likod).",
            required: true,
          },
          {
            id: "existingBooklet",
            label: "Existing Medicine Discount Booklet",
            description: "Kopya o larawan ng inyong lumang booklet na puno na ang pahina o paso na.",
            required: true,
          },
          {
            id: "prescription",
            label: "Updated / Valid Prescription",
            description: "Reseta ng doktor para sa kasalukuyang maintenance medications.",
            required: true,
          },
        ]
      } else {
        // replacement
        return [
          {
            id: "seniorId",
            label: "Senior Citizen / OSCA ID",
            description: "Malinaw na kopya ng inyong OSCA / QC Senior Citizen ID (harapan at likod).",
            required: true,
          },
          {
            id: "validGovId",
            label: "Valid Government-issued ID",
            description: "Passport, UMID, Driver's License, Postal ID, o Voter's Certificate.",
            required: true,
          },
          {
            id: "affidavitOrDamaged",
            label: replacementReason === "Lost" ? "Affidavit of Loss" : "Damaged Medicine Discount Booklet",
            description:
              replacementReason === "Lost"
                ? "Notarized Affidavit of Loss na nagpapatunay na nawala ang booklet."
                : "Malinaw na larawan ng nasirang Medicine Discount Booklet.",
            required: true,
          },
          {
            id: "idPhoto",
            label: "Recent 2×2 / ID Picture",
            description: "Recent photo para sa paglalabas ng bagong booklet.",
            required: true,
          },
        ]
      }
    } else {
      // Movie Booklet
      return [
        {
          id: "seniorId",
          label: "Senior Citizen / OSCA ID",
          description: "Kopya ng inyong QC Senior Citizen ID.",
          required: true,
        },
        {
          id: "validGovId",
          label: "Valid Government-issued ID",
          description: "Valid ID na may larawan at address.",
          required: true,
        },
        {
          id: "idPhoto",
          label: "Recent 2×2 / ID Picture",
          description: "Recent 2x2 ID picture na may white background.",
          required: true,
        },
        {
          id: "proofOfResidency",
          label: "Proof of Residency",
          description: "Barangay Certificate of Residency o Indigency.",
          required: true,
        },
      ]
    }
  }

  const currentRequiredDocs = getRequiredDocuments()

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

  // Real-time Active Application Status & Booklet sync
  useEffect(() => {
    let isMounted = true

    const syncRealtimeStatus = async () => {
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
        const currentQcid = (userProfile?.qcidNo || formData.qcidNo || "").trim()
        const oscaNum = (verifiedSeniorId || oscaIdInput || "").trim()
        const cleanOsca = oscaNum.replace(/\D/g, "")
        const userFirst = (formData.firstName || userProfile?.firstName || "").toLowerCase().trim()
        const userLast = (formData.lastName || userProfile?.lastName || "").toLowerCase().trim()
        const lastRef = localStorage.getItem(isMedicine ? "last_medicine_booklet_ref" : "last_movie_booklet_ref")
        const lastId = localStorage.getItem(isMedicine ? "last_medicine_booklet_app_id" : "last_movie_booklet_app_id")

        const isUserMatch = (a: any) => {
          if (!a) return false
          if (lastRef && String(a.referenceNumber || a.reference_number || "").trim() === lastRef) return true
          if (lastId && String(a.id || "").trim() === lastId) return true

          const aEmail = String(a.email || "").toLowerCase().trim()
          const aRef = String(a.referenceNumber || a.reference_number || "").trim()
          const aQcid = String(a.qcid || a.qc_id || "").trim()
          const aExisting = String(a.existingIdNumber || a.existing_id_number || "").trim()
          const aAssigned = String(a.assignedIdNumber || a.assigned_id_number || "").trim()
          const aFirst = String(a.firstName || a.first_name || "").toLowerCase().trim()
          const aLast = String(a.lastName || a.last_name || "").toLowerCase().trim()

          if (userEmail && aEmail && userEmail === aEmail) return true
          if (currentQcid && (aRef.includes(currentQcid) || aQcid === currentQcid || aAssigned === currentQcid)) return true
          if (userFirst && userLast && aFirst === userFirst && aLast === userLast) return true

          if (cleanOsca && cleanOsca.length >= 6) {
            const cExist = aExisting.replace(/\D/g, "")
            const cAssigned = aAssigned.replace(/\D/g, "")
            const cRef = aRef.replace(/\D/g, "")
            const cQcid = aQcid.replace(/\D/g, "")
            if (cExist && (cExist.includes(cleanOsca) || cleanOsca.includes(cExist))) return true
            if (cAssigned && cAssigned.includes(cleanOsca)) return true
            if (cRef && cRef.includes(cleanOsca)) return true
            if (cQcid && cQcid.includes(cleanOsca)) return true
          }

          return false
        }

        // 1. Check if user has an active or approved application for this booklet type (pending prioritized)
        const matchingBookletApps = allApps
          .filter((a) => {
            if (!a) return false
            const appType = String(a.type || a.service || a.extra_data?.type || "").toLowerCase()
            const appCategory = String(a.category || a.extra_data?.category || "").toLowerCase()
            const isTargetType = isMedicine
              ? appType.includes("medicine") || appCategory.includes("medicine")
              : appType.includes("movie") || appCategory.includes("movie")
            if (!isTargetType) return false
            return isUserMatch(a)
          })
          .sort((a, b) => {
            const timeA = new Date(a.submitted_at || a.created_at || a.submittedAt || 0).getTime()
            const timeB = new Date(b.submitted_at || b.created_at || b.submittedAt || 0).getTime()
            return timeB - timeA
          })

        const matchedPending = matchingBookletApps.find((a) => {
          const status = String(a.status || "pending").toLowerCase()
          return status === "pending" || status === "under_review" || status === "assessment" || status === "for_assessment"
        })

        const matchedApproved = matchingBookletApps.find((a) => {
          const status = String(a.status || "").toLowerCase()
          return status === "approved" || status === "completed" || status === "for_release" || status === "released"
        })

        const targetBookletApp = matchedApproved || matchedPending || null

        if (targetBookletApp) {
          setBlockedApp(targetBookletApp)
          if (!submitted && !isBlocked && !bypassedBlockRef.current) {
            setIsBlocked(true)
          }
        } else {
          if (isBlocked && !submitted && !bypassedBlockRef.current) {
            setIsBlocked(false)
            setBlockedApp(null)
          }
        }
      } catch (err) {
        console.warn("Real-time sync error:", err)
      }
    }

    syncRealtimeStatus()
    const interval = setInterval(syncRealtimeStatus, 8000)

    const handleStorageUpdate = () => syncRealtimeStatus()
    window.addEventListener("storage", handleStorageUpdate)
    window.addEventListener("pwd_senior_applications_updated", handleStorageUpdate)
    window.addEventListener("applications_updated", handleStorageUpdate)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("storage", handleStorageUpdate)
      window.removeEventListener("pwd_senior_applications_updated", handleStorageUpdate)
      window.removeEventListener("applications_updated", handleStorageUpdate)
    }
  }, [isMedicine, userProfile, formData.emailAddress, formData.qcidNo, oscaIdInput, submitted, isBlocked])

  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifiedSeniorName, setVerifiedSeniorName] = useState<string>("")
  const [verifiedSeniorId, setVerifiedSeniorId] = useState<string>("")
  const [expectedBookletNumber, setExpectedBookletNumber] = useState<string>("")

  const handleVerifyId = async () => {
    setVerifyError(null)
    const typed = (oscaIdInput || "").trim().toUpperCase()
    const cleanDigits = typed.replace(/\D/g, "")
    const isBookletInput = typed.startsWith("MB-") || typed.startsWith("MV-") || typed.includes("MB") || typed.includes("MV")

    // Validation: either 16 digits Senior ID, or valid Booklet Number / sequence
    if (!isBookletInput && cleanDigits.length !== 16 && cleanDigits.length < 6) {
      setIsIdVerified(false)
      setVerifyError(
        t("seniorIdExactLengthError") ||
        "Please enter a valid 16-digit Senior Citizen ID (e.g. 137404-2026-516915) or Official Booklet Number (e.g. MB-2026-516915)."
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

      const cleanTypedNormalized = cleanDigits
      const userProfileQcidDigits = (userProfile?.qcidNo || formData.qcidNo || "").replace(/\D/g, "")

      // Search across all applications for matching Senior ID or Booklet Number
      const matchedApp = allApps.find((a) => {
        if (!a) return false
        const cat = String(a.category || a.service || "").toUpperCase()
        const isSenior = cat.includes("SENIOR") || cat === "SENIOR CITIZEN" || String(a.service || "").toLowerCase().includes("senior")
        if (!isSenior) return false

        const aAssignedClean = String(a.assignedIdNumber || a.assigned_id_number || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const aRefClean = String(a.referenceNumber || a.reference_number || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const aExistingClean = String(a.existingIdNumber || a.existing_id_number || a.seniorIdNumber || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const aQcidClean = String(a.qcid || a.qcidNo || a.qc_id || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const cleanTyped = typed.replace(/[^A-Z0-9]/gi, "").toUpperCase()

        const assignedDigits = String(a.assignedIdNumber || a.assigned_id_number || "").replace(/\D/g, "")
        const refDigits = String(a.referenceNumber || a.reference_number || "").replace(/\D/g, "")
        const assignedStr = String(a.assignedIdNumber || a.assigned_id_number || "").toUpperCase()
        const existingBk = String(a.existingBookletNumber || a.bookletNumber || "").toUpperCase()
        const existingId = String(a.existingIdNumber || a.existing_id_number || "").replace(/\D/g, "")

        // 1. Booklet match: MB-2026-XXXXXX / MV-2026-XXXXXX
        if (isBookletInput || (cleanTypedNormalized.length >= 6 && cleanTypedNormalized.length <= 10)) {
          if (assignedStr.includes(typed) || typed.includes(assignedStr) || existingBk.includes(typed) || typed.includes(existingBk)) {
            return true
          }
          if (cleanDigits.length >= 6 && (assignedDigits.endsWith(cleanDigits) || refDigits.endsWith(cleanDigits))) {
            return true
          }
        }

        // 2. Senior Citizen ID exact match (alphanumeric or exact digits)
        const matchExactClean = (aAssignedClean && aAssignedClean === cleanTyped) ||
          (aRefClean && aRefClean === cleanTyped) ||
          (aExistingClean && aExistingClean === cleanTyped) ||
          (aQcidClean && aQcidClean === cleanTyped)

        const matchAssigned = assignedDigits.length >= 6 && (assignedDigits === cleanTypedNormalized || (cleanTypedNormalized.length >= 16 && assignedDigits.endsWith(cleanTypedNormalized)))
        const matchRef = refDigits.length >= 6 && (refDigits === cleanTypedNormalized || (cleanTypedNormalized.length >= 16 && refDigits.endsWith(cleanTypedNormalized)))
        const matchExisting = existingId.length >= 6 && (existingId === cleanTypedNormalized || (cleanTypedNormalized.length >= 16 && existingId.endsWith(cleanTypedNormalized)))

        return Boolean(matchExactClean || matchAssigned || matchRef || matchExisting)
      })

      const isProfileMatch = (userProfileQcidDigits.length >= 16 && userProfileQcidDigits === cleanTypedNormalized) ||
        (userProfile && String((userProfile as any).seniorIdNumber || "").replace(/\D/g, "") === cleanTypedNormalized)

      // Check if this senior citizen already has an approved or active application for this booklet
      const existingBookletApp = allApps.find((a) => {
        if (!a) return false
        const aType = String(a.type || a.service || a.extra_data?.type || "").toLowerCase()
        const aCat = String(a.category || a.extra_data?.category || "").toLowerCase()
        const isTarget = isMedicine
          ? aType.includes("medicine") || aCat.includes("medicine")
          : aType.includes("movie") || aCat.includes("movie")
        if (!isTarget) return false

        const aStatus = String(a.status || "").toLowerCase()
        const isValidStatus = aStatus === "approved" || aStatus === "completed" || aStatus === "for_release" || aStatus === "pending" || aStatus === "under_review"
        if (!isValidStatus) return false

        const aExistingDigits = String(a.existingIdNumber || a.existing_id_number || "").replace(/\D/g, "")
        const aAssignedDigits = String(a.assignedIdNumber || a.assigned_id_number || "").replace(/\D/g, "")
        const aRefDigits = String(a.referenceNumber || a.reference_number || "").replace(/\D/g, "")
        const aQcidDigits = String(a.qcid || a.qc_id || "").replace(/\D/g, "")

        if (cleanTypedNormalized.length >= 6) {
          if (aExistingDigits && (aExistingDigits.includes(cleanTypedNormalized) || cleanTypedNormalized.includes(aExistingDigits))) return true
          if (aAssignedDigits && (aAssignedDigits.includes(cleanTypedNormalized) || cleanTypedNormalized.includes(aAssignedDigits))) return true
          if (aRefDigits && aRefDigits.includes(cleanTypedNormalized)) return true
          if (aQcidDigits && aQcidDigits.includes(cleanTypedNormalized)) return true
        }

        if (matchedApp) {
          const mFirst = String(matchedApp.firstName || matchedApp.first_name || "").toLowerCase().trim()
          const mLast = String(matchedApp.lastName || matchedApp.last_name || "").toLowerCase().trim()
          const af = String(a.firstName || a.first_name || "").toLowerCase().trim()
          const al = String(a.lastName || a.last_name || "").toLowerCase().trim()
          if (mFirst && mLast && af === mFirst && al === mLast) return true
        }
        return false
      })

      if (existingBookletApp && !bypassedBlockRef.current) {
        setBlockedApp(existingBookletApp)
        setIsBlocked(true)
        setIsIdVerified(true)
        setIsVerifying(false)
        return
      }

      if (matchedApp) {
        const foundName = [
          matchedApp.firstName || matchedApp.first_name,
          matchedApp.middleName || matchedApp.middle_name,
          matchedApp.lastName || matchedApp.last_name,
          matchedApp.suffix
        ].filter(Boolean).join(" ").trim().toUpperCase()

        const seniorId = matchedApp.existingIdNumber || matchedApp.existing_id_number || matchedApp.referenceNumber || matchedApp.assignedIdNumber || oscaIdInput
        let foundBooklet = ""
        const rawAssigned = String(matchedApp.assignedIdNumber || matchedApp.assigned_id_number || "")
        const rawExisting = String(matchedApp.existingBookletNumber || matchedApp.bookletNumber || matchedApp.existing_booklet_number || "")
        if (isMedicine) {
          if (rawAssigned.startsWith("MB-") || rawAssigned.length >= 8) foundBooklet = rawAssigned
          else if (rawExisting.startsWith("MB-") || rawExisting.length >= 8) foundBooklet = rawExisting
          else if (matchedApp.medicineBookletNumber) foundBooklet = matchedApp.medicineBookletNumber
        } else {
          if (rawAssigned.startsWith("MV-") || rawAssigned.length >= 8) foundBooklet = rawAssigned
          else if (rawExisting.startsWith("MV-") || rawExisting.length >= 8) foundBooklet = rawExisting
          else if (matchedApp.movieBookletNumber) foundBooklet = matchedApp.movieBookletNumber
        }

        // Also look through allApps for prior booklet records for this senior
        const priorBookletRecord = allApps.find((a) => {
          if (!a) return false
          const cat = String(a.category || a.service || a.extra_data?.category || "").toLowerCase()
          const typ = String(a.type || a.service || a.extra_data?.type || a.assistanceType || "").toLowerCase()
          const isTargetBooklet = isMedicine
            ? (cat.includes("medicine") || typ.includes("medicine") || a.assistanceType === "medicine-booklet")
            : (cat.includes("movie") || typ.includes("movie") || a.assistanceType === "movie-booklet")
          if (!isTargetBooklet) return false

          const mFirst = String(matchedApp.firstName || matchedApp.first_name || "").toLowerCase().trim()
          const mLast = String(matchedApp.lastName || matchedApp.last_name || "").toLowerCase().trim()
          const af = String(a.firstName || a.first_name || "").toLowerCase().trim()
          const al = String(a.lastName || a.last_name || "").toLowerCase().trim()

          const mRef = String(matchedApp.referenceNumber || matchedApp.reference_number || "").replace(/[^A-Z0-9]/gi, "")
          const aRef = String(a.referenceNumber || a.reference_number || "").replace(/[^A-Z0-9]/gi, "")
          const aExt = String(a.existingIdNumber || a.existing_id_number || "").replace(/[^A-Z0-9]/gi, "")
          const typedClean = oscaIdInput.replace(/[^A-Z0-9]/gi, "")

          return (
            (mFirst && mLast && af === mFirst && al === mLast) ||
            (mRef && aRef && mRef === aRef) ||
            (mRef && aExt && mRef === aExt) ||
            (typedClean && (aRef === typedClean || aExt === typedClean))
          )
        })

        if (priorBookletRecord) {
          const pNum = String(priorBookletRecord.assignedIdNumber || priorBookletRecord.assigned_id_number || priorBookletRecord.bookletNumber || priorBookletRecord.existingBookletNumber || "").trim()
          if (pNum) foundBooklet = pNum
        }

        if (!foundBooklet && (rawExisting || rawAssigned)) {
          foundBooklet = rawExisting || rawAssigned
        }

        setIsIdVerified(true)
        setVerifyError(null)
        setVerifiedSeniorName(foundName || "SENIOR CITIZEN BENEFICIARY")
        setVerifiedSeniorId(seniorId)
        setExpectedBookletNumber(foundBooklet)

        let bMonth = matchedApp.dobMonth || ""
        let bDay = matchedApp.dobDay || ""
        let bYear = matchedApp.dobYear || ""
        if (matchedApp.dateOfBirth && (!bMonth || !bYear)) {
          const parts = String(matchedApp.dateOfBirth).split("T")[0].split("-")
          if (parts.length === 3) {
            bYear = parts[0]
            bMonth = parts[1]
            bDay = parts[2]
          }
        }

        setFormData((prev) => ({
          ...prev,
          qcidNo: matchedApp.qcid || matchedApp.qcidNo || matchedApp.referenceNumber || prev.qcidNo,
          firstName: String(matchedApp.firstName || matchedApp.first_name || prev.firstName).toUpperCase(),
          middleName: String(matchedApp.middleName || matchedApp.middle_name || prev.middleName || "").toUpperCase(),
          lastName: String(matchedApp.lastName || matchedApp.last_name || prev.lastName).toUpperCase(),
          suffix: matchedApp.suffix || prev.suffix || "",
          nationality: matchedApp.nationality || prev.nationality || "FILIPINO",
          dobMonth: bMonth || prev.dobMonth,
          dobDay: bDay || prev.dobDay,
          dobYear: bYear || prev.dobYear,
          age: matchedApp.age || prev.age || "65",
          sex: matchedApp.sex || matchedApp.gender || prev.sex || "Female",
          civilStatus: matchedApp.civilStatus || prev.civilStatus || "Single",
          addressHouseNo: matchedApp.houseNo || matchedApp.addressHouseNo || prev.addressHouseNo,
          addressStreet: matchedApp.street || matchedApp.addressStreet || prev.addressStreet,
          addressBarangay: matchedApp.barangay || matchedApp.addressBarangay || prev.addressBarangay,
          addressCity: matchedApp.city || matchedApp.addressCity || prev.addressCity || "QUEZON CITY",
          contactNumber: matchedApp.contactNo || matchedApp.cellphoneNo || matchedApp.contactNumber || prev.contactNumber,
          emailAddress: matchedApp.email || prev.emailAddress,
        }))
      } else if (isProfileMatch) {
        const profileName = [userProfile?.firstName, userProfile?.middleName, userProfile?.lastName].filter(Boolean).join(" ").trim().toUpperCase()
        const seniorId = userProfile?.qcidNo || (userProfile as any)?.seniorIdNumber || oscaIdInput
        setIsIdVerified(true)
        setVerifyError(null)
        setVerifiedSeniorName(profileName || "SENIOR CITIZEN BENEFICIARY")
        setVerifiedSeniorId(seniorId)
        setExpectedBookletNumber("")
      } else {
        setIsIdVerified(false)
        setExpectedBookletNumber("")
        setVerifyError(
          t("seniorIdNotFoundError") ||
          "Record was not found. Please verify your Senior Citizen ID Number (16-digit) or Existing Booklet Number (137404-2026-516915)."
        )
      }
    } catch (err) {
      console.warn("Error verifying Senior ID:", err)
      setIsIdVerified(false)
      setExpectedBookletNumber("")
      setVerifyError(
        t("seniorIdVerifyGeneralError") ||
        "An error occurred while verifying the record. Please try again."
      )
    } finally {
      setIsVerifying(false)
    }
  }

  // Booklet Number validation against registered/expected booklet number
  const cleanBooklet = (bookletNumber || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  const cleanExpected = (expectedBookletNumber || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  const cleanDigitsBooklet = (bookletNumber || "").replace(/\D/g, "")
  const cleanDigitsExpected = (expectedBookletNumber || "").replace(/\D/g, "")

  const isBookletNumberMatch = Boolean(
    isIdVerified &&
    hasPriorBooklet === "yes" &&
    bookletNumber.trim() !== "" &&
    cleanBooklet.length >= 4 &&
    cleanExpected &&
    (
      cleanBooklet === cleanExpected ||
      (cleanExpected.length >= 6 && cleanExpected.endsWith(cleanBooklet)) ||
      (cleanBooklet.length >= 6 && cleanBooklet.endsWith(cleanExpected)) ||
      (cleanDigitsBooklet.length >= 6 && cleanDigitsExpected.length >= 6 && (cleanDigitsBooklet === cleanDigitsExpected || cleanDigitsExpected.endsWith(cleanDigitsBooklet)))
    )
  )

  const isExistingBookletValid = hasPriorBooklet === "no" || (isIdVerified && isBookletNumberMatch)

  // Step validations
  const isStep1Valid =
    isResident &&
    isSenior &&
    hasSeniorId &&
    hasPriorBooklet !== "" &&
    oscaIdInput.trim() !== "" &&
    isIdVerified &&
    isExistingBookletValid

  const isStep2Valid =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.dobMonth !== "" &&
    formData.dobDay !== "" &&
    formData.dobYear !== "" &&
    formData.sex !== "" &&
    formData.civilStatus !== "" &&
    formData.contactNumber.trim() !== "" &&
    formData.addressBarangay !== ""

  const isStep3Valid = currentRequiredDocs.every((doc) => !doc.required || !!uploadedFiles[doc.id])

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

  // Submits after modal confirmation
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)

    const qcid = userProfile?.qcidNo || formData.qcidNo || "110000116932100"
    const refNum = oscaIdInput.trim() || qcid
    const appId = `APP-SNR-BK-${Date.now()}`
    const subDate = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const newApp = {
      id: appId,
      referenceNumber: refNum,
      category: "Senior Citizen",
      type: isMedicine ? "medicine-booklet" : "movie-booklet",
      applicationType,
      existingIdNumber: verifiedSeniorId || oscaIdInput.trim(),
      existingBookletNumber: hasPriorBooklet === "yes" ? bookletNumber.trim() : "",
      bookletNumber: hasPriorBooklet === "yes" ? bookletNumber.trim() : "",
      reasonForRenewal: applicationType === "renewal" ? renewalReason : undefined,
      reasonForReplacement: applicationType === "replacement" ? replacementReason : undefined,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      suffix: formData.suffix,
      dateOfBirth: `${formData.dobYear}-${formData.dobMonth.padStart(2, "0")}-${formData.dobDay.padStart(2, "0")}`,
      age: formData.age,
      sex: formData.sex,
      civilStatus: formData.civilStatus,
      contactNo: formData.contactNumber,
      cellphoneNo: formData.contactNumber,
      email: formData.emailAddress,
      address: `${formData.addressHouseNo} ${formData.addressStreet}, ${formData.addressBarangay}, ${formData.addressCity}`,
      houseNo: formData.addressHouseNo,
      street: formData.addressStreet,
      barangay: formData.addressBarangay,
      city: formData.addressCity,
      status: "pending",
      submittedAt: new Date().toISOString(),
      documents: await Promise.all(
        Object.entries(uploadedFiles).map(async ([id, file]) => {
          const dataUrl = file ? await readFileAsDataUrl(file, 1000, 0.75) : ""
          return {
            id,
            name: file.name,
            filename: file.name,
            fileUrl: dataUrl || "",
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            status: "verified",
          }
        })
      ),
    }

    try {
      // 1. Submit to backend API first
      await fetch(`${API_BASE}/api/pwd-senior/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp),
      })

      // 2. Save to localStorage safely
      try {
        const existing = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
        localStorage.setItem("pwd_senior_applications", JSON.stringify([newApp, ...existing.slice(0, 5)]))
        localStorage.setItem(isMedicine ? "last_medicine_booklet_ref" : "last_movie_booklet_ref", refNum)
        localStorage.setItem(isMedicine ? "last_medicine_booklet_app_id" : "last_movie_booklet_app_id", appId)
      } catch {
        const lightApp = {
          ...newApp,
          documents: newApp.documents.map((d: any) => ({ ...d, fileUrl: d.filename })),
        }
        localStorage.setItem("pwd_senior_applications", JSON.stringify([lightApp]))
      }

      // Dispatch real-time event
      notifyApplicationChange("APPLICATION_SUBMITTED", "pwd_senior", refNum)
    } catch (err) {
      console.warn("Failed saving application to backend API:", err)
      notifyApplicationChange("APPLICATION_SUBMITTED", "pwd_senior", refNum)
    }

    // Trigger storage and update events
    window.dispatchEvent(new Event("pwd_senior_applications_updated"))
    window.dispatchEvent(new Event("storage"))

    setTimeout(() => {
      setReferenceNumber(refNum)
      setSubmissionDate(subDate)
      setIsSubmitting(false)
      setSubmitted(true)
    }, 1000)
  }

  // ---- PENDING STATE (Identical to Solo Parent) ----
  const isAppApproved =
    String(blockedApp?.status || "").toLowerCase() === "approved" ||
    String(blockedApp?.status || "").toLowerCase() === "completed" ||
    String(blockedApp?.status || "").toLowerCase() === "for_release"

  if (isBlocked && !isAppApproved && !bypassedBlock) {
    const serviceTitle = isMedicine ? "Medicine Discount Booklet" : "Free Movie Booklet"

    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            ← Back
          </button>
        )}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Info className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            You Have an Existing Pending Application
          </h2>
          <p className="text-sm text-gray-500 max-w-sm">
            You already have a pending application for {serviceTitle}. Please wait for the evaluation before submitting a new application.
          </p>
        </div>
      </div>
    )
  }

  // Blocked Screen (Approved Status)
  if (isAppApproved && !bypassedBlock) {
    const displayRef =
      blockedApp?.referenceNumber ||
      blockedApp?.reference_no ||
      blockedApp?.reference_number ||
      blockedApp?.id ||
      referenceNumber ||
      oscaIdInput ||
      userProfile?.qcidNo ||
      formData.qcidNo ||
      "110000572516915"
    const assignedBookletNo =
      blockedApp?.assignedIdNumber ||
      blockedApp?.assigned_id_number ||
      blockedApp?.bookletNumber ||
      blockedApp?.existingBookletNumber ||
      bookletNumber
    const rawDate = blockedApp?.submittedAt || blockedApp?.submitted_at || blockedApp?.created_at || blockedApp?.dateSubmitted
    const displayDate = formatAppDate(rawDate, blockedApp)

    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-150 py-8">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5 cursor-pointer mb-2"
          >
            ← Back
          </button>
        )}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div
            className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
              isAppApproved
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-500"
            }`}
          >
            {isAppApproved ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <Info className="h-8 w-8 text-amber-500" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isAppApproved
                ? "Application Approved"
                : "You Have an Active Application"}
            </h2>
            <p className="text-sm text-gray-500 max-w-md mt-1 leading-relaxed">
              {isAppApproved
                ? `Your application for ${title} has been officially approved! Your official booklet number has been issued and sent to your registered email.`
                : `Your application for ${title} has been successfully submitted and is currently pending review. Please wait for an OSCA officer's assessment before submitting a new application.`}
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-gray-500 font-medium">
                Application Reference No.:
              </span>
              <span className="font-mono font-bold text-blue-600">
                {displayRef}
              </span>
            </div>
            {assignedBookletNo && (
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">
                  Official Booklet Number:
                </span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {assignedBookletNo}
                </span>
              </div>
            )}
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
              <span className="font-semibold text-gray-700">{displayDate}</span>
            </div>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                navigate("/portal/financial-aid")
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
            >
              VIEW IN FINANCIAL AID / DISBURSEMENT
            </button>
            <button
              type="button"
              onClick={() => {
                bypassedBlockRef.current = true
                setBypassedBlock(true)
                setIsBlocked(false)
                setBlockedApp(null)
                setStep(1)
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Submit Another Application (Apply Again)
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
        <div className="bg-white border border-border rounded-2xl p-6 md:p-8 text-center shadow-lg space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" /> Application Submitted Successfully!
            </span>
            <h2 className="text-2xl font-bold text-foreground">
              Application Successfully Received
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your {title} application has been successfully submitted and is currently being reviewed.
            </p>
          </div>

          {/* Reference Card */}
          <div className="border border-border rounded-xl p-5 max-w-md mx-auto space-y-2.5 text-left bg-gray-50/60">
            <div className="flex justify-between items-center text-xs text-foreground border-b border-border/80 pb-2">
              <span className="font-semibold text-muted-foreground">Application Reference No.:</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{referenceNumber}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-semibold text-foreground">{title}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Application Type:</span>
              <span className="font-semibold text-foreground uppercase">
                {applicationType === "new" ? "NEW BOOKLET" : applicationType === "renewal" ? "RENEWAL" : "REPLACEMENT"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">OSCA ID No.:</span>
              <span className="font-mono font-semibold text-foreground">{oscaIdInput}</span>
            </div>
            {applicationType !== "new" && bookletNumber && (
              <div className="flex justify-between items-center text-xs text-foreground">
                <span className="text-muted-foreground">Booklet Number:</span>
                <span className="font-mono text-foreground">{bookletNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Applicant:</span>
              <span className="font-semibold text-foreground">
                {formData.firstName} {formData.middleName ? `${formData.middleName} ` : ""}{formData.lastName}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Date:</span>
              <span className="text-foreground">{submissionDate}</span>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 max-w-md mx-auto flex items-center justify-center gap-2.5 text-center">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <p>
              You may check your Notifications for status updates regarding your application.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3b82f6]" />
            <span>
              Automatically redirecting to application status in {redirectCountdown} second{redirectCountdown === 1 ? "" : "s"}...
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Main Wizard Card matching Pic 2 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white relative shadow-xs">
        {/* Step indicator connected numbered circles */}
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
                {s.id < step ? <Check className="h-4 w-4 stroke-[3]" /> : s.id}
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
              className={`flex-1 px-4 py-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                s.id === step
                  ? "bg-blue-600 text-white"
                  : s.id < step
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Step Body */}
        <div className="p-6 sm:p-8 space-y-7 border-t border-gray-100">
          {/* ──────────────── STEP 1: COMPLETE CHECKLIST ──────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
                  SERVICE AND PRIMARY REQUIREMENTS
                </h2>
              </div>

              <div className="space-y-4">
                <CustomCheckbox
                  checked={isResident}
                  onChange={setIsResident}
                  label="Are you a resident of Quezon City? *"
                />
                <CustomCheckbox
                  checked={isSenior}
                  onChange={setIsSenior}
                  label="Are you 60 years old or above (Senior Citizen)? *"
                />
                <CustomCheckbox
                  checked={hasSeniorId}
                  onChange={setHasSeniorId}
                  label="Do you have a valid Senior Citizen / OSCA ID? *"
                />
              </div>

              {/* Blue Info Alert Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    {t("seniorBookletAlertTitle", { title: title.toUpperCase() }) || `${title.toUpperCase()} — PRIMARY REQUIREMENTS`}
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {t("seniorBookletAlertDesc") || "Complete the primary qualifications and prepare your Senior Citizen / OSCA ID to apply."}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-foreground mb-1 font-bold uppercase tracking-wide">
                  {`HAVE YOU ALREADY RECEIVED ${title.toUpperCase()}? *`}
                </p>
                <label className="text-xs mb-2 block font-medium text-blue-700">
                  Choose Status **
                </label>
                <div className="flex items-center gap-8">
                  <label className="flex items-center gap-2 text-sm text-[#3b82f6] cursor-pointer select-none">
                    <input
                      type="radio"
                      name="hasPriorBooklet"
                      checked={hasPriorBooklet === "yes"}
                      onChange={() => {
                        setHasPriorBooklet("yes")
                        setApplicationType("renewal")
                      }}
                      className="h-4 w-4 accent-[#3b82f6]"
                    />
                    <span className="text-gray-900">Yes, I already received {title.toLowerCase()}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#3b82f6] cursor-pointer select-none">
                    <input
                      type="radio"
                      name="hasPriorBooklet"
                      checked={hasPriorBooklet === "no"}
                      onChange={() => {
                        setHasPriorBooklet("no")
                        setApplicationType("new")
                        setBookletNumber("")
                      }}
                      className="h-4 w-4 accent-[#3b82f6]"
                    />
                    <span className="text-gray-900">Not yet</span>
                  </label>
                </div>
              </div>

              {hasPriorBooklet !== "" && (
                <div className="space-y-4 pt-2">

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                      Senior Citizen / OSCA ID Number *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5 max-w-md">
                      <input
                        type="text"
                        value={oscaIdInput}
                        onChange={(e) => {
                          const val = formatSeniorNumber(e.target.value)
                          setOscaIdInput(val)
                          setIsIdVerified(false)
                          setVerifyError(null)
                        }}
                        placeholder={t("seniorIdNumberPlaceholder") || "e.g. 137404-2026-XXXXXX"}
                        maxLength={18}
                        className={`w-full h-11 rounded-lg border px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none font-mono transition-all ${
                          isIdVerified
                            ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20"
                            : verifyError
                            ? "border-red-400 bg-red-50/20 ring-2 ring-red-400/20"
                            : "border-gray-300 bg-white focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyId}
                        disabled={isVerifying || !oscaIdInput.trim()}
                        className={`px-5 h-11 rounded-lg text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isIdVerified
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#3b82f6] hover:bg-blue-700"
                        }`}
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>VERIFYING...</span>
                          </>
                        ) : isIdVerified ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>VERIFIED</span>
                          </>
                        ) : (
                          <span>VERIFY RECORD</span>
                        )}
                      </button>
                    </div>

                    {verifyError && (
                      <div className="border border-red-200 bg-red-50 rounded-lg p-3 flex items-start gap-2.5 text-xs text-red-800 max-w-md mt-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">{t("idVerificationErrorTitle") || "Invalid ID / Booklet Number"}</p>
                          <p className="mt-0.5 text-red-700">{verifyError}</p>
                        </div>
                      </div>
                    )}

                    {isIdVerified && (
                      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3.5 space-y-1.5 text-xs font-semibold text-emerald-800 max-w-md mt-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{verifiedSeniorName || "SENIOR CITIZEN BENEFICIARY"}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-[11px] pt-1 border-t border-emerald-200/60 font-mono">
                          <div>
                            <span className="text-gray-500 font-sans block text-[10px] uppercase">Senior Citizen ID:</span>
                            <span className="text-blue-800 font-bold">{verifiedSeniorId || oscaIdInput || "137404-2026-516915"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {hasPriorBooklet === "yes" && (
                    <div className="space-y-4 max-w-md pt-1 animate-in fade-in">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-gray-700 uppercase">
                            {isMedicine ? "Existing Medicine Discount Booklet Number *" : "Existing Free Movie Booklet Number *"}
                          </label>
                          {isIdVerified && bookletNumber.trim() && isBookletNumberMatch && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-in fade-in">
                              <Check className="w-3 h-3" /> MATCHED
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={bookletNumber}
                          onChange={(e) => {
                            setBookletNumber(e.target.value.toUpperCase())
                          }}
                          placeholder={isMedicine ? (t("seniorMedicineBookletPlaceholder") || "e.g. MB-2026-XXXXXX") : (t("seniorMovieBookletPlaceholder") || "e.g. MV-2026-XXXXXX")}
                          maxLength={24}
                          className={`w-full h-11 rounded-lg border px-3 text-sm text-gray-900 placeholder:text-gray-400 font-mono outline-none transition-all ${
                            !isIdVerified || (bookletNumber.trim() && !isBookletNumberMatch)
                              ? "border-red-400 bg-red-50/20 ring-2 ring-red-400/20"
                              : isIdVerified && bookletNumber.trim() && isBookletNumberMatch
                              ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20"
                              : "border-gray-300 bg-white focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                          }`}
                        />
                        {!isIdVerified && (
                          <div className="flex items-start gap-1.5 text-xs text-amber-700 mt-1.5 font-medium animate-in fade-in">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <span>{t("seniorVerifyIdFirstForBooklet") || "Pakiverify muna ang Senior Citizen / OSCA ID sa itaas upang masuri ang inyong opisyal na booklet record."}</span>
                          </div>
                        )}
                        {isIdVerified && bookletNumber.trim() !== "" && !isBookletNumberMatch && (
                          <div className="flex items-start gap-2 border border-red-200 bg-red-50 p-2.5 rounded-lg text-xs text-red-700 mt-2 animate-in fade-in">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">{t("bookletMismatchErrorTitle") || "Booklet Number Mismatch"}</p>
                              <p className="mt-0.5">
                                {t("bookletMismatchErrorDesc") ||
                                  "The entered booklet number does not match the official booklet number on record. Please make sure they match exactly to proceed."}
                              </p>
                            </div>
                          </div>
                        )}
                        {attemptedNext && !bookletNumber.trim() && (
                          <p className="text-xs text-red-600 mt-1 font-medium">
                            {t("bookletRequiredError", { bookletType: isMedicine ? "Medicine Discount Booklet" : "Free Movie Booklet" }) ||
                              `Please enter your existing ${isMedicine ? "Medicine Discount Booklet" : "Free Movie Booklet"} Number.`}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                          Type of Request &amp; Reason *
                        </label>
                        <select
                          value={combinedRequestType}
                          onChange={(e) => handleCombinedRequestChange(e.target.value)}
                          className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        >
                          <optgroup label="Renewal">
                            <option value="renewal:full">Renewal — Booklet pages are full</option>
                            <option value="renewal:due">Renewal — Renewal due / Expired</option>
                          </optgroup>
                          <optgroup label="Replacement">
                            <option value="replacement:lost">Replacement — Lost Booklet</option>
                            <option value="replacement:damaged">Replacement — Damaged / Torn</option>
                            <option value="replacement:stolen">Replacement — Stolen</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── STEP 2: PERSONAL INFORMATION ──────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
                    Personal Information
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Please review your personal information verified from your official Senior Citizen record.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEditingInfo ? "Lock Information" : "Edit Information"}</span>
                  </button>
                </div>
              </div>

              {/* IMPORTANT REMINDER BOX matching Pic 3 */}
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-600">Important reminder</p>
                  <p className="text-blue-600/90 mt-0.5">
                    Please make sure your personal information is correct and complete. If any detail is missing or incorrect, please contact the Office for Senior Citizens Affairs (OSCA) to update your records. Accurate information is important for fast and smooth processing of your booklet request.
                  </p>
                </div>
              </div>

              {/* Applicant QCID Profile Information Grid matching Pic 3 */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">QC ID *</label>
                    <input
                      type="text"
                      value={formData.qcidNo}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">First name *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Middle name</label>
                    <input
                      type="text"
                      value={formData.middleName}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Last name *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Suffix (Jr., Sr., III, etc.)</label>
                    <input
                      type="text"
                      value={formData.suffix}
                      placeholder="Suffix (Jr., Sr., III, etc.)"
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Nationality *</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Date of birth *</label>
                    <input
                      type="text"
                      value={`${formData.dobMonth}/${formData.dobDay}/${formData.dobYear}`}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Age *</label>
                    <input
                      type="text"
                      value={formData.age}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Gender *</label>
                    <input
                      type="text"
                      value={formData.sex}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Civil status *</label>
                    <input
                      type="text"
                      value={formData.civilStatus}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">House/Building number *</label>
                    <input
                      type="text"
                      value={formData.addressHouseNo}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Street name *</label>
                    <input
                      type="text"
                      value={formData.addressStreet}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Barangay *</label>
                    <input
                      type="text"
                      value={formData.addressBarangay}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Phone number *</label>
                    <input
                      type="text"
                      value={formData.contactNumber}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1 font-mono"
                    />
                  </div>
                </div>

                {/* Existing Senior Citizen ID / OSCA ID */}
                <div className="pt-4 border-t border-gray-200 space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Existing Senior Citizen ID / OSCA ID *
                  </label>
                  <input
                    type="text"
                    value={oscaIdInput || "110000116932100"}
                    readOnly
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed font-mono mt-1"
                  />
                </div>
              </div>

              {attemptedNext && !isStep2Valid && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Pakikumpleto ang lahat ng kinakailangang impormasyon sa Step 2 bago magpatuloy sa susunod na hakbang.</span>
                </div>
              )}
            </div>
          )}

          {/* ──────────────── STEP 3: REQUIREMENTS / DOCUMENT UPLOAD ──────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">
                  Document Requirements ({applicationType === "new" ? "Bagong Booklet" : applicationType === "renewal" ? "Renewal" : "Replacement"})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  I-upload ang mga kaukulang dokumento. Tiyaking malinaw at madaling mabasa ang mga ito.
                </p>
              </div>

              {/* Renewal photo note */}
              {applicationType === "renewal" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Pinadaling Dokumento para sa Renewal:</span>
                    Hindi na kailangang mag-upload ng bagong 2×2 ID photo dahil rehistrado na ang inyong verified profile sa talaan ng OSCA.
                  </div>
                </div>
              )}

              {attemptedNext && !isStep3Valid && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Kailangang i-upload ang lahat ng required na dokumento bago magpatuloy.</span>
                </div>
              )}

              <div className="space-y-4">
                {currentRequiredDocs.map((doc) => {
                  const file = uploadedFiles[doc.id]
                  const inputId = `upload-doc-${doc.id}`

                  return (
                    <div
                      key={doc.id}
                      className={`border rounded-xl p-4 md:p-5 transition-colors ${
                        file ? "border-emerald-300 bg-emerald-50/30" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                          {doc.label} {doc.required && <span className="text-red-500">*</span>}
                          {file && (
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white shrink-0">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground">{doc.description}</p>

                      <p className="text-[11px] text-muted-foreground mt-2">
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
                          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {t("uploadPhotoBtn") || "UPLOAD PHOTO"}
                        </label>

                        <button
                          type="button"
                          onClick={() => setCameraDoc(doc)}
                          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {t("takePhotoCameraBtn") || "KUMUHA NG LARAWAN (CAMERA)"}
                        </button>
                      </div>

                      {file && (
                        <div className="flex flex-wrap gap-3 pt-4">
                          <div className="relative w-40 border border-border rounded-lg bg-white p-3 flex flex-col items-center text-center shadow-xs">
                            <button
                              type="button"
                              onClick={() => removeFile(doc.id)}
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer"
                              aria-label={`Alisin ang ${file.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="h-12 w-12 rounded-md overflow-hidden border border-border mb-2 flex items-center justify-center bg-gray-50">
                              <FileThumbnail file={file} className="h-full w-full object-cover" />
                            </div>
                            <p className="text-xs font-medium text-foreground truncate w-full">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ──────────────── STEP 4: REVIEW & SUBMIT ──────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">SURIIN ANG IYONG APLIKASYON</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pakisuri ang buod ng inyong aplikasyon bago mag-submit.
                </p>
              </div>

              {/* Application Details */}
              <div className="border border-border rounded-xl p-4 md:p-5 bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">Application Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Service:</span>
                    <span className="font-bold text-foreground">{title}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Application Type:</span>
                    <span className="font-bold text-foreground uppercase">
                      {applicationType === "new" ? "Bagong Booklet" : applicationType === "renewal" ? "Renewal" : "Replacement"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">OSCA ID:</span>
                    <span className="font-mono font-bold text-foreground">{oscaIdInput}</span>
                  </div>
                  {applicationType !== "new" && (
                    <div>
                      <span className="text-muted-foreground block">Booklet Number:</span>
                      <span className="font-mono font-bold text-foreground">{bookletNumber}</span>
                    </div>
                  )}
                  {applicationType === "renewal" && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block">Reason for Renewal:</span>
                      <span className="font-semibold text-foreground">{renewalReason}</span>
                    </div>
                  )}
                  {applicationType === "replacement" && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block">Reason for Replacement:</span>
                      <span className="font-semibold text-foreground">{replacementReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="border border-border rounded-xl p-4 md:p-5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">Personal Information</h4>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    I-edit
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Name:</span>
                    <span className="font-bold text-foreground">{formData.firstName} {formData.middleName} {formData.lastName} {formData.suffix}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Birth Date:</span>
                    <span className="font-semibold text-foreground">{formData.dobMonth}/{formData.dobDay}/{formData.dobYear}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Age &amp; Gender:</span>
                    <span className="font-semibold text-foreground">{formData.age} yrs old, {formData.sex}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Contact Number:</span>
                    <span className="font-semibold text-foreground">{formData.contactNumber}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block">Address:</span>
                    <span className="font-semibold text-foreground">{formData.addressHouseNo} {formData.addressStreet}, Brgy. ${formData.addressBarangay}, ${formData.addressCity}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block">Senior Citizen / OSCA ID:</span>
                    <span className="font-semibold text-foreground font-mono">{oscaIdInput || "110000116932100"} (Verified)</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="border border-border rounded-xl p-4 md:p-5 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">Documents</h4>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    I-edit
                  </button>
                </div>
                <div className="space-y-4">
                  {currentRequiredDocs.map((doc) => {
                    const file = uploadedFiles[doc.id]
                    const uploaded = Boolean(file)
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
                          <p className="text-xs text-red-500 mt-1">Walang nai-upload na dokumento</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 sm:px-8 py-5">
          {step === 1 ? (
            <div />
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="px-6 h-10 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors cursor-pointer"
            >
              BACK
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className={`flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold transition-colors select-none ${
                canGoNext
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>NEXT</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(true)
              }}
              className="px-8 h-10 rounded-lg text-xs font-bold transition-colors shadow-sm select-none bg-[#3b82f6] text-white hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-1.5"
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
                onClick={handleConfirmSubmit}
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

function CustomCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm cursor-pointer select-none group">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`flex items-center justify-center h-4.5 w-4.5 mt-0.5 rounded-[3px] shrink-0 border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 ${
          checked ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 group-hover:border-blue-400"
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
      </span>
      <span className="leading-snug text-slate-800 dark:text-white font-medium text-sm">{label}</span>
    </label>
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
