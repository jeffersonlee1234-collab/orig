import { useState, useEffect } from "react"
import {
  Check,
  CheckCircle2,
  FileText,
  Upload,
  Camera,
  X,
  Pencil,
  Info,
  ShieldCheck,
  User,
  IdCard,
  Search,
  AlertCircle,
} from "lucide-react"
import DocumentCameraModal from "../ui/document-camera-modal"
import { API_BASE } from "../../config/api"
import { useLanguage } from "../ui/language-context"
import { notifyApplicationChange } from "../../utils/realtimeSync"

interface DocumentItem {
  id: string
  label: string
  required: boolean
  description: string
  sampleImage?: string
}

// Requirements para sa NEW Application
const NEW_DOCUMENTS: DocumentItem[] = [
  {
    id: "birthCertificate",
    label: "Proof of Age / Birth Certificate",
    required: true,
    description: "PSA Birth Certificate o valid document na nagpapatunay ng edad (60+).",
    sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg",
  },
  {
    id: "proofOfResidency",
    label: "Proof of Residency",
    required: true,
    description: "Barangay Certificate of Residency o Utility Bill sa Quezon City.",
    sampleImage: "/samples/PROOF OF RESIDENCE.webp",
  },
  {
    id: "validId",
    label: "Valid Government-issued ID",
    required: true,
    description: "Anumang government ID na may larawan at lagda (Passport, SSS, UMID, Postal ID, atbp.).",
    sampleImage: "/samples/sample_valid_id.png",
  },
  {
    id: "idPhoto",
    label: "Recent 2×2 / ID Picture",
    required: true,
    description: "Kuhang litrato na may puting background (white background), kuha sa loob ng nakalipas na 6 buwan.",
    sampleImage: "/samples/ID PICTURE (2X2).webp",
  },
  {
    id: "qcidDoc",
    label: "QCID (kung mayroon)",
    required: false,
    description: "QC Citizen ID card (opsyonal kung mayroon nang QCID).",
    sampleImage: "/samples/QC ID NG PASYENTE.jpg",
  },
]

// Requirements para sa RENEWAL Application
const RENEWAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "oldSeniorId",
    label: "Lumang / Expired Senior Citizen ID (Old ID)",
    required: true,
    description: "Malinaw na kopya o litrato ng harap at likod ng lumang Senior Citizen / OSCA ID.",
    sampleImage: "/samples/OLD SOLO ID.jpg",
  },
  {
    id: "idPhoto",
    label: "Recent 2×2 / ID Picture",
    required: true,
    description: "Kasalukuyang 2×2 ID Picture na may puting background, kuha sa nakaraang 6 buwan.",
    sampleImage: "/samples/ID PICTURE (2X2).webp",
  },
  {
    id: "proofOfResidency",
    label: "Barangay Certificate of Residency",
    required: true,
    description: "Katibayan ng paninirahan sa Quezon City (lalo na kung nagbago ang tirahan).",
    sampleImage: "/samples/PROOF OF RESIDENCE.webp",
  },
  {
    id: "validId",
    label: "Valid Government ID (Back-up ID)",
    required: true,
    description: "Anumang karagdagang valid ID para sa pagpapatunay ng pagkakakilanlan.",
    sampleImage: "/samples/sample_valid_id.png",
  },
]

// Requirements para sa REPLACEMENT / LOST ID
const LOSS_DOCUMENTS: DocumentItem[] = [
  {
    id: "affidavitOfLoss",
    label: "Notarized Affidavit of Loss",
    required: true,
    description: "Notaryadong Affidavit of Loss na nagsasaad kung paano nawala o nasira ang Senior Citizen ID.",
    sampleImage: "/samples/AFFIDAVIT OF LOSS.webp",
  },
  {
    id: "validId",
    label: "Valid Government-issued ID",
    required: true,
    description: "Valid government ID na may larawan at lagda (Passport, Postal ID, SSS, Driver's License).",
    sampleImage: "/samples/sample_valid_id.png",
  },
  {
    id: "idPhoto",
    label: "Recent 2×2 / ID Picture",
    required: true,
    description: "Kasalukuyang 2×2 ID Picture na may puting background.",
    sampleImage: "/samples/ID PICTURE (2X2).webp",
  },
  {
    id: "proofOfResidency",
    label: "Barangay Certificate of Residency",
    required: true,
    description: "Barangay Certificate na nagpapatunay na residente ka pa rin ng Quezon City.",
    sampleImage: "/samples/PROOF OF RESIDENCE.webp",
  },
]

import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { readFileAsDataUrl } from "../../utils/fileUpload"

function generateReference(qcid?: string) {
  if (qcid && qcid.trim() && qcid !== "110000116932100") return qcid.trim()
  return getLoggedInUserQcid()
}

function formatSeniorId(val: string): string {
  const digits = val.replace(/^(SENIOR|OSCA)-?/i, "").replace(/^(SENIOR|OSCA)\s*-\s*/i, "").replace(/\D/g, "").slice(0, 16)
  if (!digits) return ""
  if (digits.length <= 6) return digits
  if (digits.length <= 10) return `${digits.slice(0, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 16)}`
}

function calculateAge(month: string, day: string, year: string): string {
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return ""
  const today = new Date()
  let age = today.getFullYear() - y
  const birthDate = new Date(y, m - 1, d)
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age >= 0 ? String(age) : ""
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
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
      <span className="leading-snug text-slate-800 dark:text-white text-sm font-medium">{label}</span>
    </label>
  )
}

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
  bloodType?: string
  emergencyFirstName?: string
  emergencyLastName?: string
  emergencyContactNo?: string
  emergencyRelationship?: string
  emergencyAddress?: string
}


interface SeniorCitizenApplicationWizardProps {
  onBack?: () => void
  userProfile?: UserProfile
  initialIdStatus?: "new" | "renewal" | "loss"
  onStepChange?: (step: number) => void
}

export default function SeniorCitizenApplicationWizard({
  onBack,
  userProfile: propUserProfile,
  initialIdStatus = "new",
  onStepChange,
}: SeniorCitizenApplicationWizardProps) {
  const { t } = useLanguage()
  const [profile, setProfile] = useState<UserProfile>(() => (propUserProfile || getCurrentUserProfile()) as any)

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
          contactNo: String(p.contactNo || p.mobileNumber || prev.contactNo || "").replace(/\s+/g, ""),
          houseNo: p.addressHouseNo || p.houseNo || prev.houseNo,
          street: p.addressStreet || p.street || prev.street,
          barangay: p.addressBarangay || p.barangay || prev.barangay,
          city: p.addressCity || p.city || prev.city,
          email: p.email || prev.email,
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
  const appFlow = initialIdStatus || "new"

  const WIZARD_TABS = [
    t("wizardChecklist") || "COMPLETE CHECKLIST",
    t("wizardPersonal") || "PERSONAL INFORMATION",
    t("pwdStepDocuments")?.toUpperCase() || "SAMPLE DOCUMENTS",
    t("wizardReview") || "REVIEW & SUBMIT",
  ]

  const [step, setStep] = useState(1)
  const [returnToReview, setReturnToReview] = useState(false)
  const [attemptedNext, setAttemptedNext] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [latestApprovedApp, setLatestApprovedApp] = useState<any>(null)
  const [blockedApp, setBlockedApp] = useState<any>(null)

  useEffect(() => {
    if ((latestApprovedApp && appFlow === "new") || isBlocked) {
      onStepChange?.(0)
    } else {
      onStepChange?.(step)
    }
  }, [step, latestApprovedApp, isBlocked, appFlow, onStepChange])

  // Reset wizard to Step 1 whenever flow/type changes or an application becomes approved
  useEffect(() => {
    setStep(1)
    setReturnToReview(false)
    setAttemptedNext(false)
    setIsIdVerified(false)
    setVerifyError(null)
    setReasonForRenewal("")
    setReasonForReplacement("")
    setIsResidencyChecked(false)
    setIsAgeChecked(false)
    setIsDeclarationChecked(false)
  }, [initialIdStatus])

  useEffect(() => {
    if (latestApprovedApp) {
      setStep(1)
      setReturnToReview(false)
      setAttemptedNext(false)
    }
  }, [latestApprovedApp?.id, latestApprovedApp?.status])

  // Step 1: Checklist state
  const [isResidencyChecked, setIsResidencyChecked] = useState(false)
  const [isAgeChecked, setIsAgeChecked] = useState(false)
  const [isDeclarationChecked, setIsDeclarationChecked] = useState(false)

  // Step 1: Existing ID / Verification state for Renewal & Lost ID
  const [existingIdNumber, setExistingIdNumber] = useState("")
  const [isIdVerified, setIsIdVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [reasonForReplacement, setReasonForReplacement] = useState("")
  const [reasonForRenewal, setReasonForRenewal] = useState("")

  const fetchAllSeniorApps = async (): Promise<any[]> => {
    let allApps: any[] = []
    try {
      const res = await fetch(`${API_BASE}/api/pwd-senior/applications`)
      if (res.ok) {
        const apps = await res.json()
        if (Array.isArray(apps)) allApps = apps
      }
    } catch {}

    const localKeys = ["pwd_senior_applications", "applications", "all_user_applications", "active_applications"]
    for (const k of localKeys) {
      try {
        const saved = localStorage.getItem(k)
        if (saved) {
          const localApps = JSON.parse(saved)
          if (Array.isArray(localApps)) {
            const ids = new Set(allApps.map((a) => a.id || a.referenceNumber))
            for (const la of localApps) {
              if (!ids.has(la.id || la.referenceNumber)) allApps.push(la)
            }
          }
        }
      } catch {}
    }
    return allApps
  }

  const handleVerifyId = async () => {
    setVerifyError(null)
    const typed = (existingIdNumber || "").trim()
    const cleanTyped = typed.replace(/[^a-z0-9]/gi, "").toLowerCase()
    const cleanDigits = typed.replace(/\D/g, "")

    if (cleanDigits.length !== 16) {
      setVerifyError(
        t("seniorIdExactLengthError") ||
        "Senior Citizen ID Number must be exactly 16 digits."
      )
      setIsIdVerified(false)
      return
    }

    setIsVerifying(true)
    try {
      const apps = await fetchAllSeniorApps()

      // Look for matching registered Senior Citizen record with EXACT 16 digits
      const matchedApp = apps.find((a) => {
        if (!a) return false
        const cat = String(a.category || a.service || "").trim().toUpperCase()
        const isSeniorCategory = cat.includes("SENIOR") || cat === "SENIOR CITIZEN" || String(a.service || "").toLowerCase().includes("senior")
        if (!isSeniorCategory) return false

        const aAssignedClean = String(a.assignedIdNumber || a.assigned_id_number || "").replace(/[^a-z0-9]/gi, "").toLowerCase()
        const aRefClean = String(a.referenceNumber || a.reference_no || a.reference_number || "").replace(/[^a-z0-9]/gi, "").toLowerCase()
        const aExistingClean = String(a.existingIdNumber || a.existing_id_number || a.seniorIdNumber || "").replace(/[^a-z0-9]/gi, "").toLowerCase()
        const aQcidClean = String(a.qcid || a.qcidNo || a.qc_id || "").replace(/[^a-z0-9]/gi, "").toLowerCase()
        const assignedDigits = String(a.assignedIdNumber || a.assigned_id_number || "").replace(/\D/g, "")
        const refDigits = String(a.referenceNumber || a.reference_no || a.reference_number || "").replace(/\D/g, "")
        const existingDigits = String(a.existingIdNumber || a.existing_id_number || a.seniorIdNumber || "").replace(/\D/g, "")

        // STRICT EXACT MATCH: All characters or full sequence must match exactly
        const matchExactClean = (aAssignedClean && aAssignedClean === cleanTyped) ||
          (aRefClean && aRefClean === cleanTyped) ||
          (aExistingClean && aExistingClean === cleanTyped) ||
          (aQcidClean && aQcidClean === cleanTyped)

        const matchDigits = cleanDigits.length >= 6 && (
          (assignedDigits.length >= 6 && (assignedDigits === cleanDigits || (cleanDigits.length >= 16 && assignedDigits.endsWith(cleanDigits)))) ||
          (refDigits.length >= 6 && (refDigits === cleanDigits || (cleanDigits.length >= 16 && refDigits.endsWith(cleanDigits)))) ||
          (existingDigits.length >= 6 && (existingDigits === cleanDigits || (cleanDigits.length >= 16 && existingDigits.endsWith(cleanDigits))))
        )

        return Boolean(matchExactClean || matchDigits)
      })

      if (matchedApp) {
        const officialId = (matchedApp.assignedIdNumber || matchedApp.referenceNumber || existingIdNumber).replace("OSCA-", "SENIOR-")
        setIsIdVerified(true)
        setVerifyError(null)
        setExistingIdNumber(officialId)

        const applicantFullAddress = matchedApp.address || `${matchedApp.houseNo || ""} ${matchedApp.street || ""}, Brgy. ${matchedApp.barangay || "Sauyo"}, QUEZON CITY`.trim()

        const emPerson = matchedApp.emergencyContactPerson || matchedApp.emergencyName || matchedApp.emergencyContact || matchedApp.emergencyPerson || ""
        let emFirst = matchedApp.emergencyFirstName || ""
        let emLast = matchedApp.emergencyLastName || ""
        if (emPerson && (!emFirst || !emLast || emFirst.toUpperCase() === "JUAN" || emLast.toUpperCase() === "DIMAL" || emFirst.toUpperCase() === "DESIGNATED EMERGENCY")) {
          const parts = emPerson.trim().split(/\s+/)
          if (parts.length > 1) {
            emFirst = parts.slice(0, -1).join(" ")
            emLast = parts[parts.length - 1]
          } else {
            emFirst = emPerson
            emLast = ""
          }
        }
        if (!emFirst && !emLast) {
          emFirst = userProfile?.emergencyFirstName || ""
          emLast = userProfile?.emergencyLastName || ""
        }

        const emContact = matchedApp.emergencyContactNo || matchedApp.emergencyPhone || matchedApp.emergencyContactNumber || matchedApp.emergencyNumber || matchedApp.cellphoneNo || matchedApp.contactNo || userProfile?.emergencyContactNo || ""
        const emRel = matchedApp.emergencyRelationship || matchedApp.relationshipToApplicant || userProfile?.emergencyRelationship || ""
        let emAddr = matchedApp.emergencyResidentialAddress || matchedApp.emergencyAddress || userProfile?.emergencyAddress || ""
        if (!emAddr || emAddr.trim().toLowerCase() === "quezon city") {
          emAddr = applicantFullAddress
        }

        const birthMonth = matchedApp.dobMonth || ""
        const birthDay = matchedApp.dobDay || ""
        const birthYear = matchedApp.dobYear || ""
        let computedAge = matchedApp.age || ""
        if (birthMonth && birthDay && birthYear && birthYear.length === 4) {
          const calc = calculateAge(birthMonth, birthDay, birthYear)
          if (calc) computedAge = calc
        }

        setFormData((prev) => ({
          ...prev,
          qcidNumber: matchedApp.qcid || matchedApp.qcidNo || matchedApp.referenceNumber || prev.qcidNumber,
          firstName: matchedApp.firstName || prev.firstName,
          middleName: matchedApp.middleName || prev.middleName,
          lastName: matchedApp.lastName || prev.lastName,
          suffix: matchedApp.suffix || prev.suffix,
          nationality: matchedApp.nationality || prev.nationality || "FILIPINO",
          dobMonth: birthMonth || prev.dobMonth,
          dobDay: birthDay || prev.dobDay,
          dobYear: birthYear || prev.dobYear,
          age: computedAge || prev.age || "",
          sex: matchedApp.sex || matchedApp.gender || prev.sex,
          civilStatus: matchedApp.civilStatus || prev.civilStatus,
          bloodType: matchedApp.bloodType || prev.bloodType || "O+",
          contactNo: (matchedApp.contactNo || matchedApp.cellphoneNo || matchedApp.contactNumber || prev.contactNo || "").replace(/\s+/g, ""),
          email: matchedApp.email || prev.email,
          houseNo: matchedApp.houseNo || matchedApp.addressHouseNo || prev.houseNo || "",
          street: matchedApp.street || matchedApp.addressStreet || prev.street || "",
          barangay: matchedApp.barangay || matchedApp.addressBarangay || prev.barangay || "Sauyo",
          city: matchedApp.city || matchedApp.addressCity || prev.city || "QUEZON CITY",
          emergencyFirstName: emFirst,
          emergencyLastName: emLast,
          emergencyContactNo: (emContact || prev.emergencyContactNo || "").replace(/\s+/g, ""),
          emergencyRelationship: emRel,
          emergencyAddress: emAddr,
        }))
      } else {
        setIsIdVerified(false)
        setVerifyError(
          t("seniorIdNotFoundError") ||
          "Senior Citizen ID was not found in the official records. Please verify the official ID Number received in your email or on your issued Senior ID card."
        )
      }
    } catch {
      setIsIdVerified(false)
      setVerifyError(
        t("seniorIdVerifyGeneralError") ||
        "An error occurred while verifying the Senior Citizen ID. Please try again."
      )
    } finally {
      setIsVerifying(false)
    }
  }

  const step1Valid =
    isResidencyChecked &&
    isAgeChecked &&
    isDeclarationChecked &&
    (appFlow === "new" ||
      (isIdVerified &&
        (existingIdNumber || "").trim() !== "" &&
        ((appFlow === "renewal" && reasonForRenewal !== "") ||
          (appFlow === "loss" && reasonForReplacement !== ""))))

  // Step 2: Personal Information state
  const [formData, setFormData] = useState(() => {
    const prof: any = propUserProfile || getCurrentUserProfile() || {}
    return {
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
      contactNo: (prof.contactNo || prof.mobileNumber || "").replace(/\s+/g, ""),
      houseNo: prof.addressHouseNo || prof.houseNo || "",
      street: prof.addressStreet || prof.street || "",
      barangay: prof.addressBarangay || prof.barangay || "Sauyo",
      city: prof.addressCity || prof.city || "QUEZON CITY",
      email: prof.email || "",
      bloodType: prof.bloodType || "O+",
      psaReference: "",
      qcidNumber: prof.qcidNo || prof.qcidNumber || getLoggedInUserQcid(),
      emergencyFirstName: prof.emergencyFirstName || "",
      emergencyLastName: prof.emergencyLastName || "",
      emergencyContactNo: prof.emergencyContactNo || "",
      emergencyRelationship: prof.emergencyRelationship || "",
      emergencyAddress: prof.emergencyAddress || "",
      // Family member application fields
      familyFirstName: "",
      familyMiddleName: "",
      familyLastName: "",
      familySuffix: "",
      familyDobMonth: "",
      familyDobDay: "",
      familyDobYear: "",
      familyAge: "",
      familySex: "",
      familyCivilStatus: "",
      familyContactNo: "",
      familyAddressHouseNo: "",
      familyAddressStreet: "",
      familyAddressBarangay: "",
      familyAddressCity: "QUEZON CITY",
      familyEmergencyFirstName: "",
      familyEmergencyLastName: "",
      familyEmergencyContactNo: "",
      familyEmergencyRelationship: "",
    }
  })

  // Recalculate age on date of birth change (myself)
  useEffect(() => {
    if (formData.dobMonth && formData.dobDay && formData.dobYear.length === 4) {
      const computedAge = calculateAge(formData.dobMonth, formData.dobDay, formData.dobYear)
      setFormData((prev) => ({ ...prev, age: computedAge }))
    }
  }, [formData.dobMonth, formData.dobDay, formData.dobYear])

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const step2Valid =
    appFlow !== "new"
      ? true
      : (formData.emergencyFirstName || "").trim() !== "" &&
        (formData.emergencyLastName || "").trim() !== "" &&
        (formData.emergencyContactNo || "").replace(/\D/g, "").length >= 10 &&
        (formData.emergencyRelationship || "").trim() !== "" &&
        (formData.emergencyAddress || "").trim() !== ""

  // Step 3: Documents state
  const currentRequirements =
    appFlow === "renewal"
      ? RENEWAL_DOCUMENTS
      : appFlow === "loss"
      ? LOSS_DOCUMENTS
      : NEW_DOCUMENTS

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})
  const [cameraDoc, setCameraDoc] = useState<DocumentItem | null>(null)
  const [selectedSampleDoc, setSelectedSampleDoc] = useState<DocumentItem | null>(null)
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; file: File } | null>(null)

  // Reload / Navigation warning protection — active from Step 2 onwards
  const isFormDirty = !isSubmitted && step > 1

  useEffect(() => {
    if (isFormDirty) {
      ;(window as any).__isFormDirty = true
    } else {
      ;(window as any).__isFormDirty = false
    }
    return () => {
      ;(window as any).__isFormDirty = false
    }
  }, [isFormDirty])

  // Check if there is an active application for this user (Real-time syncing)
  useEffect(() => {
    let isMounted = true

    const checkActiveApp = async () => {
      const expectedType =
        appFlow === "renewal"
          ? "renewal"
          : appFlow === "loss"
          ? "replacement"
          : "new"

      const prof = getCurrentUserProfile()
      const loggedQcid = (getLoggedInUserQcid() || userProfile?.qcidNo || prof?.qcidNo || prof?.qcidNumber || "").trim().toLowerCase()
      const email = (userProfile?.email || prof?.email || "").trim().toLowerCase()
      const userLastName = (userProfile?.lastName || prof?.lastName || "").trim().toLowerCase()
      const userFirstName = (userProfile?.firstName || prof?.firstName || "").trim().toLowerCase()

      const checkUserMatches = (a: any) => {
        if (!a) return false
        const aEmail = (a.email || "").trim().toLowerCase()
        const aRef = (a.referenceNumber || a.reference_no || a.qcid || a.qcidNo || a.qcid_number || "").trim().toLowerCase()
        const aAssigned = (a.assignedIdNumber || "").trim().toLowerCase()
        const aCat = String(a.category || "").toUpperCase()
        const aLastName = (a.lastName || "").trim().toLowerCase()
        const aFirstName = (a.firstName || "").trim().toLowerCase()

        const isSeniorCategory = aCat.includes("SENIOR") || aCat === "SENIOR CITIZEN" || String(a.service || "").toLowerCase().includes("senior")
        if (!isSeniorCategory) return false

        const isQcidMatch = loggedQcid && (aRef === loggedQcid || aAssigned === loggedQcid || aRef.includes(loggedQcid) || loggedQcid.includes(aRef))
        const isEmailMatch = email && aEmail && aEmail === email
        const isNameMatch = userLastName && aLastName && userLastName === aLastName && (!userFirstName || !aFirstName || userFirstName === aFirstName)

        return Boolean(isQcidMatch || isEmailMatch || isNameMatch)
      }

      let allUserSeniorApps: any[] = []
      let backendFetched = false

      // 1. Fetch from backend API
      try {
        const res = await fetch(`${API_BASE}/api/pwd-senior/applications`)
        if (res.ok && isMounted) {
          const apps = await res.json()
          if (Array.isArray(apps)) {
            allUserSeniorApps = apps.filter(checkUserMatches)
            backendFetched = true
            try {
              localStorage.setItem("pwd_senior_applications", JSON.stringify(apps))
            } catch {}
          }
        }
      } catch {}

      // 2. Check localStorage only if offline / backend not fetched
      if (!backendFetched && isMounted) {
        const localKeys = ["pwd_senior_applications", "applications", "all_user_applications", "active_applications"]
        for (const k of localKeys) {
          try {
            const saved = localStorage.getItem(k)
            if (saved) {
              const apps = JSON.parse(saved)
              if (Array.isArray(apps)) {
                const userApps = apps.filter(checkUserMatches)
                for (const ua of userApps) {
                  if (
                    ua &&
                    !allUserSeniorApps.some(
                      (ba) =>
                        (ba.id && ba.id === ua.id) ||
                        (ba.referenceNumber && ba.referenceNumber === ua.referenceNumber)
                    )
                  ) {
                    allUserSeniorApps.push(ua)
                  }
                }
              }
            }
          } catch {}
        }
      }

      if (!isMounted) return

      // Prioritized Match Resolvers
      const pendingFlow = allUserSeniorApps.find((a) => {
        if (a.status !== "pending" && a.status !== "under_review") return false
        if (expectedType === "replacement") return a.type === "replacement" || a.type === "loss"
        if (expectedType === "renewal") return a.type === "renewal"
        return a.type === "new" || !a.type
      })

      const pendingAny = allUserSeniorApps.find(
        (a) => a.status === "pending" || a.status === "under_review"
      )

      const approvedFlow = allUserSeniorApps.find((a) => {
        if (a.status !== "approved" && a.status !== "completed" && a.status !== "for_release")
          return false
        if (expectedType === "replacement") return a.type === "replacement" || a.type === "loss"
        if (expectedType === "renewal") return a.type === "renewal"
        return a.type === "new" || !a.type
      })

      const approvedAny = allUserSeniorApps.find(
        (a) => a.status === "approved" || a.status === "completed" || a.status === "for_release"
      )

      // PRIORITY 1: Pending application for this specific flow (e.g. renewal under review)
      if (pendingFlow) {
        setBlockedApp(pendingFlow)
        setLatestApprovedApp(null)
        setIsBlocked(true)
      }
      // PRIORITY 2: Any other pending Senior Citizen application under review
      else if (pendingAny) {
        setBlockedApp(pendingAny)
        setLatestApprovedApp(null)
        setIsBlocked(true)
      }
      // PRIORITY 3: Approved application for this specific flow
      else if (approvedFlow) {
        setBlockedApp(approvedFlow)
        setLatestApprovedApp(approvedFlow)
        setIsBlocked(true)
      }
      // PRIORITY 4: If flow is "new" and already has an approved Senior ID, block "new"
      else if (expectedType === "new" && approvedAny) {
        setBlockedApp(approvedAny)
        setLatestApprovedApp(approvedAny)
        setIsBlocked(true)
      }
      // OTHERWISE: Allow user to fill out Renewal, Replacement, or Booklet form
      else {
        setBlockedApp(null)
        setLatestApprovedApp(null)
        setIsBlocked(false)
      }
    }

    checkActiveApp()
    const interval = setInterval(checkActiveApp, 1500)
    window.addEventListener("pwd_senior_applications_updated", checkActiveApp)
    window.addEventListener("storage", checkActiveApp)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("pwd_senior_applications_updated", checkActiveApp)
      window.removeEventListener("storage", checkActiveApp)
    }
  }, [userProfile?.qcidNo, userProfile?.email, appFlow])

  // Set blocked on submit
  useEffect(() => {
    if (!isSubmitted) return
    setIsBlocked(true)
  }, [isSubmitted])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isFormDirty])

  const handleFileUpload = (docId: string, files: File[]) => {
    if (!files || files.length === 0) return
    setUploadedFiles((prev) => ({
      ...prev,
      [docId]: [files[0]],
    }))
  }

  const handleRemoveFile = (docId: string, index: number) => {
    setUploadedFiles((prev) => {
      const nextList = [...(prev[docId] || [])]
      nextList.splice(index, 1)
      return { ...prev, [docId]: nextList }
    })
  }

  // All mandatory documents must have at least 1 file
  const step3Valid = currentRequirements.filter((d) => d.required).every(
    (d) => (uploadedFiles[d.id]?.length ?? 0) > 0
  )

  // Step 4: Review & Submission
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [referenceNo, setReferenceNo] = useState("")

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    const refNum = generateReference(userProfile?.qcidNo)

    try {
      const existing = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
      const documentItems = await Promise.all(
        Object.keys(uploadedFiles).map(async (k) => {
          const f = uploadedFiles[k]?.[0]
          const dataUrl = f ? await readFileAsDataUrl(f) : ""
          return {
            name: k,
            filename: f?.name || "doc.jpg",
            fileUrl: dataUrl || "",
            uploadedAt: new Date().toISOString(),
            status: "verified",
          }
        })
      )

      const newApp = {
        id: `APP-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        referenceNumber: refNum,
        category: "Senior Citizen",
        type: appFlow === "renewal" ? "renewal" : appFlow === "loss" ? "replacement" : "new",
        firstName: formData.firstName || userProfile.firstName,
        middleName: formData.middleName || userProfile.middleName || "",
        lastName: formData.lastName || userProfile.lastName,
        suffix: formData.suffix || "",
        dateOfBirth: `${formData.dobYear || "1955"}-${(formData.dobMonth || "01").padStart(2, "0")}-${(formData.dobDay || "01").padStart(2, "0")}`,
        age: formData.age || "60",
        sex: formData.sex || userProfile?.sex || (userProfile as any)?.gender || "Male",
        civilStatus: formData.civilStatus || "Married",
        cellphoneNo: formData.contactNo || userProfile?.contactNo || "09175552233",
        contactNo: formData.contactNo || userProfile?.contactNo || "09175552233",
        email: formData.email || userProfile?.email || "senior@quezoncity.gov.ph",
        houseNo: formData.houseNo || userProfile?.addressHouseNo || "11",
        street: formData.street || userProfile?.addressStreet || "OLD CABUYAO SAMPALOK ST",
        barangay: formData.barangay || userProfile?.addressBarangay || "Sauyo",
        city: formData.city || userProfile?.addressCity || "QUEZON CITY",
        address: `${formData.houseNo || userProfile?.addressHouseNo || "11"} ${formData.street || userProfile?.addressStreet || "OLD CABUYAO SAMPALOK ST"} ${formData.barangay || userProfile?.addressBarangay || "Sauyo"}, QUEZON CITY`.trim(),
        applyingFor: "myself",
        existingIdNumber: existingIdNumber || latestApprovedApp?.assignedIdNumber || latestApprovedApp?.referenceNumber || "",
        seniorIdNumber: existingIdNumber || latestApprovedApp?.assignedIdNumber || latestApprovedApp?.referenceNumber || "",
        reasonForRenewal: appFlow === "renewal" ? reasonForRenewal : "",
        reasonForReplacement: appFlow === "loss" ? reasonForReplacement : "",
        emergencyLastName: formData.emergencyLastName || userProfile?.emergencyLastName || "",
        emergencyFirstName: formData.emergencyFirstName || userProfile?.emergencyFirstName || "",
        emergencyName: [formData.emergencyFirstName || userProfile?.emergencyFirstName, formData.emergencyLastName || userProfile?.emergencyLastName].filter(Boolean).join(" ").trim(),
        emergencyContactPerson: [formData.emergencyFirstName || userProfile?.emergencyFirstName, formData.emergencyLastName || userProfile?.emergencyLastName].filter(Boolean).join(" ").trim(),
        emergencyContactNo: formData.emergencyContactNo || userProfile?.emergencyContactNo || "",
        emergencyPhone: formData.emergencyContactNo || userProfile?.emergencyContactNo || "",
        emergencyRelationship: formData.emergencyRelationship || userProfile?.emergencyRelationship || "",
        relationshipToApplicant: formData.emergencyRelationship || userProfile?.emergencyRelationship || "",
        emergencyAddress: formData.emergencyAddress || `${formData.houseNo || userProfile?.addressHouseNo || "11"} ${formData.street || userProfile?.addressStreet || "OLD CABUYAO SAMPALOK ST"} ${formData.barangay || userProfile?.addressBarangay || "Sauyo"}, QUEZON CITY`.trim(),
        emergencyResidentialAddress: formData.emergencyAddress || `${formData.houseNo || userProfile?.addressHouseNo || "11"} ${formData.street || userProfile?.addressStreet || "OLD CABUYAO SAMPALOK ST"} ${formData.barangay || userProfile?.addressBarangay || "Sauyo"}, QUEZON CITY`.trim(),
        documents: documentItems,
        status: "pending",
      }
      localStorage.setItem("pwd_senior_applications", JSON.stringify([newApp, ...existing]))

      // Send to real backend API so it syncs across all windows, devices, and Incognito mode
      fetch(`${API_BASE}/api/pwd-senior/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp),
      }).catch((err) => console.warn("Backend sync failed, saved locally:", err))

      // Dispatch real-time event to Admin dashboard
      notifyApplicationChange("APPLICATION_SUBMITTED", "pwd_senior", refNum)
    } catch (e) {
      console.error("Failed saving senior application to localStorage:", e)
      notifyApplicationChange("APPLICATION_SUBMITTED", "pwd_senior", refNum)
    }

    setTimeout(() => {
      setReferenceNo(refNum)
      setIsSubmitting(false)
      setIsSubmitted(true)
      setStep(1)
      setReturnToReview(false)
    }, 1200)
  }

  const fullName = [
    formData.firstName,
    formData.middleName,
    formData.lastName,
    formData.suffix,
  ]
    .filter(Boolean)
    .join(" ")

  const fullAddress = `${[formData.houseNo, formData.street].filter(Boolean).join(" ")}, Brgy. ${formData.barangay}, ${formData.city}`

  const flowBadgeTitle =
    appFlow === "new"
      ? "New Application"
      : appFlow === "renewal"
      ? "Renewal Application"
      : "Replacement / Lost ID"

  // Auto-redirect submitted state to blocked/active status card
  useEffect(() => {
    if (!isSubmitted) return
    const timer = setTimeout(() => {
      setIsSubmitted(false)
      setIsBlocked(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [isSubmitted])

  // ---- BLOCKED / APPROVED state ----
  const targetApp = blockedApp || latestApprovedApp
  const isAppApproved =
    String(targetApp?.status || "").toLowerCase() === "approved" ||
    String(targetApp?.status || "").toLowerCase() === "completed" ||
    String(targetApp?.status || "").toLowerCase() === "for_release"

  // ---- PENDING STATE (Identical to Solo Parent) ----
  if (isBlocked && !isAppApproved) {
    const serviceTitle =
      appFlow === "renewal"
        ? "Senior Citizen ID Renewal"
        : appFlow === "loss"
        ? "Senior Citizen ID Replacement"
        : "Senior Citizen ID"

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

  // ---- APPROVED state ----
  if (isAppApproved || (latestApprovedApp && appFlow === "new")) {

    const serviceTitle =
      appFlow === "renewal"
        ? "Senior Citizen ID Renewal"
        : appFlow === "loss"
        ? "Senior Citizen ID Replacement"
        : "Senior Citizen ID"

    const displayRef =
      targetApp?.referenceNumber ||
      targetApp?.reference_no ||
      targetApp?.reference_number ||
      targetApp?.id ||
      userProfile?.qcidNo ||
      formData.qcidNumber ||
      existingIdNumber ||
      "110000572516915"

    const assignedIdNo = (targetApp?.assignedIdNumber || targetApp?.assigned_id_number || "").replace("OSCA-", "SENIOR-")

    const displayDate = targetApp?.submittedAt || targetApp?.created_at || targetApp?.dateSubmitted
      ? new Date(targetApp.submittedAt || targetApp.created_at || targetApp.dateSubmitted).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })

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
                ? `Your application for ${serviceTitle} has been officially approved! You already have an active Senior Citizen ID. If you need to renew or replace your ID, please choose an option below.`
                : `Your application for ${serviceTitle} has been successfully submitted and is currently pending review. Please wait for an OSCA officer's assessment before submitting a new application.`}
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
            {assignedIdNo && (
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">
                  Official Senior ID Number:
                </span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {assignedIdNo}
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
            {isAppApproved ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/portal/apply-pwd-senior?category=senior&type=renewal"
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  Apply for Renewal (Renewal SENIOR ID)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/portal/apply-pwd-senior?category=senior&type=loss"
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Apply for Replacement / Lost ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    ;(window as any).__isFormDirty = false
                    window.location.href = "/portal/my-applications"
                  }}
                  className="w-full py-2 px-4 rounded-xl text-gray-500 hover:text-gray-800 text-xs font-medium transition-colors cursor-pointer"
                >
                  View in Application History
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    ;(window as any).__isFormDirty = false
                    window.location.href = "/portal/my-applications"
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
                >
                  VIEW IN APPLICATION HISTORY
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── SUBMISSION SUCCESS / PENDING SCREEN ──
  if (isSubmitted) {
    const serviceTitle =
      appFlow === "renewal"
        ? "Renewal SENIOR ID"
        : appFlow === "loss"
        ? "Replacement / Lost SENIOR ID"
        : "New App SENIOR ID"

    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-150">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Info className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {t("hasPendingAppTitle") || "You Have an Active Application"}
            </h2>
            <p className="text-sm text-gray-500 max-w-md mt-1 leading-relaxed">
              Your application for {serviceTitle} has been successfully submitted and is currently pending review. Please wait for a Social Worker's assessment before submitting a new application.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-gray-500 font-medium">{t("appRefNoLabel") || "Application Reference No.:"}</span>
              <span className="font-mono font-bold text-blue-600">
                {referenceNo || userProfile?.qcidNo || "110000572516915"}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-gray-500 font-medium">{t("appStatusLabel") || "Status:"}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                {t("statusPendingBadge") || "• Under Review (Pending)"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">{t("dateFiledLabel") || "Date Filed:"}</span>
              <span className="font-semibold text-gray-700">
                {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>

          <div className="w-full pt-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/portal/my-applications"
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
            >
              {t("viewMyApplications") || "VIEW IN MY APPLICATIONS"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* ── MAIN AICS-STYLE WHITE BOX ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white relative shadow-xs">
        {/* ── STEPPER CONNECTED NUMBERED CIRCLES ── */}
        <div className="flex items-center px-6 pt-6 pb-4">
          {WIZARD_TABS.map((_, i) => {
            const stepNum = i + 1
            const isCompleted = step > stepNum
            const isCurrent = step === stepNum

            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isCompleted
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
                </div>
                {i < WIZARD_TABS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 transition-colors ${
                      step > stepNum ? "bg-blue-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* ── STEPPER TABS BAR ── */}
        <div className="flex gap-2 border-b border-border bg-gray-50 p-2 overflow-x-auto">
          {WIZARD_TABS.map((label, i) => {
            const stepNum = i + 1
            const isCurrent = step === stepNum
            const isCompleted = step > stepNum

            return (
              <div
                key={label}
                className={`flex-1 px-4 py-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : isCompleted
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {label}
              </div>
            )
          })}
        </div>

        {/* ── STEP BODY CONTAINER ── */}
        <div className="p-6 sm:p-8 space-y-7 border-t border-gray-100">
          {/* ──────────────── STEP 1: COMPLETE CHECKLIST ──────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
                  {appFlow === "new"
                    ? (t("seniorChecklistTitle") || "SERVICE AND PRIMARY REQUIREMENTS")
                    : appFlow === "renewal"
                    ? (t("seniorRenewalChecklistTitle") || "RENEWAL OF SENIOR CITIZEN ID — PRIMARY REQUIREMENTS")
                    : (t("seniorLossChecklistTitle") || "REPLACEMENT / LOST SENIOR CITIZEN ID — PRIMARY REQUIREMENTS")}
                </h2>
              </div>

              <div className="space-y-3.5 pt-1">
                <CustomCheckbox
                  checked={isResidencyChecked}
                  onChange={setIsResidencyChecked}
                  label={`${t("seniorResidentCheck") || "Are you a legitimate resident of Quezon City?"} *`}
                />

                <CustomCheckbox
                  checked={isAgeChecked}
                  onChange={setIsAgeChecked}
                  label={`${t("seniorAgeCheck") || "Are you 60 years of age or older?"} *`}
                />

                <CustomCheckbox
                  checked={isDeclarationChecked}
                  onChange={setIsDeclarationChecked}
                  label={
                    appFlow === "new"
                      ? "Do you have no existing Senior Citizen ID? *"
                      : appFlow === "renewal"
                      ? "Do you have an existing or expired Senior Citizen ID for renewal? *"
                      : "Was your Senior Citizen ID lost or damaged, and in need of replacement? *"
                  }
                />
              </div>

              {/* ID Verification Field para sa Renewal at Lost ID */}
              {appFlow !== "new" && (
                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-800 tracking-wide flex items-center gap-1.5">
                      <IdCard className="w-4 h-4 text-[#3b82f6]" />
                      SENIOR CITIZEN ID NUMBER *
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                      <div className={`flex items-center flex-1 rounded-lg border overflow-hidden transition-all ${
                        isIdVerified
                          ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20"
                          : "border-gray-300 bg-white focus-within:ring-2 focus-within:ring-[#3b82f6]/40 focus-within:border-[#3b82f6]"
                      }`}>
                        <span className={`px-3 py-2.5 font-mono font-bold text-xs border-r select-none transition-colors ${
                          isIdVerified
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-gray-100 text-gray-600 border-gray-300"
                        }`}>
                          SENIOR-
                        </span>
                        <input
                          type="text"
                          value={existingIdNumber.replace(/^(SENIOR|OSCA)-?/i, "")}
                          onChange={(e) => {
                            const formatted = formatSeniorId(e.target.value)
                            setExistingIdNumber(formatted ? `SENIOR-${formatted}` : "")
                            setIsIdVerified(false)
                            setVerifyError(null)
                          }}
                          placeholder="137404-2026-516915"
                          maxLength={18}
                          className="flex-1 h-11 px-3.5 bg-transparent text-sm font-mono text-gray-900 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyId}
                        disabled={!(existingIdNumber || "").trim() || isVerifying}
                        className={`px-5 py-2.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 ${
                          isIdVerified
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        }`}
                      >
                        {isIdVerified ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>VERIFIED</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5" />
                            <span>{isVerifying ? "Verifying..." : "VERIFY ID"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isIdVerified && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1 animate-in fade-in duration-150">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Senior Citizen ID Verified Successfully</span>
                      </div>
                    )}

                    {verifyError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-in fade-in duration-150">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Invalid Senior Citizen ID: </span>
                          {verifyError}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reason for Renewal or Replacement when verified */}
                  {isIdVerified && (
                    <div className="pt-3 border-t border-gray-200 space-y-2.5 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold uppercase text-gray-800 tracking-wide">
                        {appFlow === "renewal" ? "Reason for Renewal *" : "Reason for Replacement *"}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-5">
                        {appFlow === "renewal" ? (
                          <>
                            <label className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="reasonForRenewal"
                                value="Expired / Due for Renewal"
                                checked={reasonForRenewal === "Expired / Due for Renewal"}
                                onChange={() => setReasonForRenewal("Expired / Due for Renewal")}
                                className="h-4 w-4 accent-[#3b82f6] cursor-pointer"
                              />
                              <span className="font-medium">Expired / Due for Renewal</span>
                            </label>
                            <label className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="reasonForRenewal"
                                value="Updated Information"
                                checked={reasonForRenewal === "Updated Information"}
                                onChange={() => setReasonForRenewal("Updated Information")}
                                className="h-4 w-4 accent-[#3b82f6] cursor-pointer"
                              />
                              <span className="font-medium">Updated Information</span>
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="reasonForReplacement"
                                value="Lost / Nawala"
                                checked={reasonForReplacement === "Lost / Nawala"}
                                onChange={() => setReasonForReplacement("Lost / Nawala")}
                                className="h-4 w-4 accent-[#3b82f6] cursor-pointer"
                              />
                              <span className="font-medium">Lost / Missing</span>
                            </label>
                            <label className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="reasonForReplacement"
                                value="Damaged / Nasira"
                                checked={reasonForReplacement === "Damaged / Nasira"}
                                onChange={() => setReasonForReplacement("Damaged / Nasira")}
                                className="h-4 w-4 accent-[#3b82f6] cursor-pointer"
                              />
                              <span className="font-medium">Damaged / Defaced</span>
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Information Box */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5">
                <Info className="w-5 h-5 text-[#3b82f6] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-blue-900 uppercase tracking-wide">
                    {appFlow === "new"
                      ? "NEW APPLICATION FOR SENIOR CITIZEN ID"
                      : appFlow === "renewal"
                      ? "RENEWAL OF SENIOR CITIZEN ID"
                      : "REPLACEMENT / LOST SENIOR CITIZEN ID"}
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                    {appFlow === "new"
                      ? "First-time application for Senior Citizen ID. Complete all required personal information and supporting documents."
                      : appFlow === "renewal"
                      ? "RENEWAL — Please enter your current Senior ID Number and prepare the required documents before proceeding."
                      : "For lost or damaged Senior Citizen IDs. Please upload a Notarized Affidavit of Loss and required identification documents."}
                  </p>
                </div>
              </div>

              {attemptedNext && !step1Valid && (
                <p className="text-xs text-red-600 font-medium">
                  {appFlow !== "new" && (!isIdVerified || !(existingIdNumber || "").trim())
                    ? "Please enter and verify your Senior Citizen ID number before proceeding."
                    : "Please check and complete all primary requirement checkboxes to proceed."}
                </p>
              )}

              {/* Footer Action */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!step1Valid) {
                      setAttemptedNext(true)
                      return
                    }
                    setAttemptedNext(false)
                    if (returnToReview) {
                      setStep(4)
                      setReturnToReview(false)
                    } else {
                      setStep(2)
                    }
                  }}
                  className="flex items-center justify-center px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <span>{t("nextButton") ? t("nextButton").toUpperCase() : "NEXT"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 2: PERSONAL INFORMATION ──────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-3">
                <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
                  {appFlow === "new" ? (t("wizardPersonal") || "Personal Information") : (t("verifiedPersonalInfo") || "Verified Personal Information")}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {appFlow === "new"
                    ? (t("reviewSeniorDesc") || "Please review your personal information from your QCID profile. Fill in the additional details below.")
                    : t("autoFetchedFromVerifiedSeniorId", { id: existingIdNumber || "—" }) || `Information automatically retrieved from verified Senior Citizen ID (${existingIdNumber || "—"}).`}
                </p>
              </div>

              {/* IMPORTANT REMINDER BOX */}
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-600">{t("importantReminder") || "IMPORTANT REMINDER"}</p>
                  <p className="text-blue-600/90 mt-0.5">
                    {t("qcidReminderNote") || "Please make sure the information on your QCID is correct and complete. If any detail is missing or incorrect, contact the QCID Team to update your QCID records before continuing your application. Accurate information is important for fast and smooth processing of your service."}
                  </p>
                </div>
              </div>

              {/* Applicant QCID Profile Information Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("qcIdLabel") || "QC ID"} *</label>
                    <input
                      type="text"
                      value={formData.qcidNumber || userProfile?.qcidNo || userProfile?.qcidNumber || getLoggedInUserQcid()}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("firstNameLabel") || "First name"} *</label>
                    <input
                      type="text"
                      value={formData.firstName || userProfile?.firstName || ""}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("middleNameLabel") || "Middle name"}</label>
                    <input
                      type="text"
                      value={formData.middleName || userProfile?.middleName || ""}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("lastNameLabel") || "Last name"} *</label>
                    <input
                      type="text"
                      value={formData.lastName || userProfile?.lastName || ""}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("suffixLabel") || "Suffix (Jr., Sr., III, etc.)"}</label>
                    <input
                      type="text"
                      value={formData.suffix || userProfile?.suffix || ""}
                      placeholder={t("suffixLabel") || "Suffix (Jr., Sr., etc.)"}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("nationalityLabel") || "Nationality"} *</label>
                    <input
                      type="text"
                      value={formData.nationality || userProfile?.nationality || "FILIPINO"}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("birthDateLabel") || "Date of birth"} *</label>
                    <input
                      type="text"
                      value={
                        formData.dobMonth && formData.dobDay && formData.dobYear
                          ? `${formData.dobMonth}/${formData.dobDay}/${formData.dobYear}`
                          : (userProfile as any)?.birthDateDisplay || (userProfile as any)?.birthDate || (userProfile as any)?.birthDateIso || ""
                      }
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("ageLabel") || "Age"} *</label>
                    <input
                      type="text"
                      value={formData.age || String(userProfile?.age || "")}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("genderLabel") || "Gender"} *</label>
                    <input
                      type="text"
                      value={formData.sex || userProfile?.sex || (userProfile as any)?.gender || "Female"}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("civilStatusLabel") || "Civil status"} *</label>
                    <input
                      type="text"
                      value={formData.civilStatus || userProfile?.civilStatus || "Single"}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Blood type *</label>
                    <select
                      value={formData.bloodType}
                      onChange={(e) => handleFieldChange("bloodType", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 transition-colors bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                    >
                      {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("houseNumberLabel") || "House/Building number"} *</label>
                    <input
                      type="text"
                      value={formData.houseNo || userProfile?.addressHouseNo || (userProfile as any)?.houseNo || ""}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("streetNameLabel") || "Street name"} *</label>
                    <input
                      type="text"
                      value={formData.street || userProfile?.addressStreet || (userProfile as any)?.street || ""}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("barangayLabel") || "Barangay"} *</label>
                    <input
                      type="text"
                      value={formData.barangay || userProfile?.addressBarangay || (userProfile as any)?.barangay || "Sauyo"}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("phoneNumberLabel") || "Phone number"} *</label>
                    <input
                      type="text"
                      value={formData.contactNo || userProfile?.contactNo || (userProfile as any)?.mobileNumber || ""}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("emailLabel") || "Email Address"} *</label>
                    <input
                      type="email"
                      value={formData.email || userProfile?.email || ""}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed mt-1"
                    />
                  </div>
                </div>

                {/* Existing Senior Citizen ID for Renewal & Lost ID */}
                {appFlow !== "new" && (
                  <div className="pt-4 border-t border-gray-200 space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Existing Senior Citizen ID *
                    </label>
                    <input
                      type="text"
                      value={existingIdNumber || "110000116932100"}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800 cursor-not-allowed font-mono mt-1"
                    />
                  </div>
                )}

                {/* EMERGENCY CONTACT */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#3b82f6]" />
                    {t("emergencyContactTitle") || "EMERGENCY CONTACT"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && !(formData.emergencyFirstName || "").trim() ? "text-red-600" : "text-gray-700"}`}>
                        {t("firstNameLabel") || "First Name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={formData.emergencyFirstName}
                        onChange={(e) => handleFieldChange("emergencyFirstName", e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50).toUpperCase())}
                        placeholder={t("firstNameLabel") || "First Name"}
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 shadow-2xs ${
                          attemptedNext && !(formData.emergencyFirstName || "").trim()
                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                            : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && !(formData.emergencyLastName || "").trim() ? "text-red-600" : "text-gray-700"}`}>
                        {t("lastNameLabel") || "Last Name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={formData.emergencyLastName}
                        onChange={(e) => handleFieldChange("emergencyLastName", e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50).toUpperCase())}
                        placeholder={t("lastNameLabel") || "Last Name"}
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 shadow-2xs ${
                          attemptedNext && !(formData.emergencyLastName || "").trim()
                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                            : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && (formData.emergencyContactNo || "").replace(/\D/g, "").length < 10 ? "text-red-600" : "text-gray-700"}`}>
                        {t("phoneNumberLabel") || "Contact Number"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        value={formData.emergencyContactNo}
                        onChange={(e) => handleFieldChange("emergencyContactNo", e.target.value.replace(/\D/g, ""))}
                        placeholder="09XXXXXXXXX"
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 shadow-2xs ${
                          attemptedNext && (formData.emergencyContactNo || "").replace(/\D/g, "").length < 10
                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                            : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && !(formData.emergencyRelationship || "").trim() ? "text-red-600" : "text-gray-700"}`}>
                        {t("pwdRelationshipLabel") || "Relationship"} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.emergencyRelationship}
                        onChange={(e) => handleFieldChange("emergencyRelationship", e.target.value)}
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 shadow-2xs ${
                          attemptedNext && !(formData.emergencyRelationship || "").trim()
                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                            : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      >
                        <option value="">{t("selectRelationshipOption") || "Select Relationship"}</option>
                        <option value="Child">{t("relationChild") || "Child"}</option>
                        <option value="Spouse">{t("relationSpouse") || "Spouse"}</option>
                        <option value="Sibling">{t("relationSibling") || "Sibling"}</option>
                        <option value="Relative">{t("relationRelative") || "Relative"}</option>
                        <option value="Caregiver">{t("relationCaregiver") || "Caregiver / Guardian"}</option>
                        <option value="Friend">{t("relationFriend") || "Friend / Neighbor"}</option>
                        <option value="Others">{t("relationOthers") || "Others"}</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && !(formData.emergencyAddress || "").trim() ? "text-red-600" : "text-gray-700"}`}>
                      {t("address") || "Emergency Address"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyAddress}
                      onChange={(e) => handleFieldChange("emergencyAddress", e.target.value)}
                      placeholder="Emergency Residential Address"
                      className={`w-full h-11 rounded-lg border px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 shadow-2xs ${
                        attemptedNext && !(formData.emergencyAddress || "").trim()
                          ? "border-red-400 focus:ring-red-300 bg-red-50"
                          : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {attemptedNext && !step2Valid && (
                <p className="text-xs text-red-600 font-medium">
                  {t("emergencyContactRequirementAlert") || "Punan ang lahat ng kinakailangang field para sa emergency contact bago magpatuloy."}
                </p>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span>{t("backButton") ? t("backButton").toUpperCase() : "BACK"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!step2Valid) {
                      setAttemptedNext(true)
                      return
                    }
                    setAttemptedNext(false)
                    if (returnToReview) {
                      setStep(4)
                      setReturnToReview(false)
                    } else {
                      setStep(3)
                    }
                  }}
                  className="px-7 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center bg-[#3b82f6] hover:bg-blue-600 text-white cursor-pointer shadow-xs"
                >
                  <span>{t("nextButton") ? t("nextButton").toUpperCase() : "NEXT"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3: SUBMIT DOCUMENTS / FILE UPLOAD ──────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">{t("fileUploadHeader") || "File upload"}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("fileUploadDesc1") || "Siguraduhing i-upload ang angkop na mga dokumento para sa bawat kategorya at tiyaking tugma ang lahat ng detalye—gaya ng inyong buong pangalan at tirahan—sa impormasyon sa inyong QC ID."}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("fileUploadDesc2") || 'Pindutin ang "Sample Document" na button sa itaas ng bawat pag-upload ng file upang makita ang halimbawa ng file at masigurong tugma ang inyong ia-upload.'}
              </p>

              <div className="space-y-6 pt-2">
                {currentRequirements.map((doc) => {
                  const files = uploadedFiles[doc.id] || []
                  const isUploaded = files.length > 0
                  const inputId = `upload-${doc.id}`
                  const missing = attemptedNext && doc.required && !isUploaded

                  return (
                    <div key={doc.id}>
                      {doc.sampleImage && (
                        <button
                          type="button"
                          onClick={() => setSelectedSampleDoc(doc)}
                          className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline mb-2 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {(t("sampleDocument") || "Sample Document").toUpperCase()}
                        </button>
                      )}

                      <div
                        className={`border rounded-xl p-5 transition-colors ${
                          isUploaded
                            ? "border-green-300 bg-green-50"
                            : missing
                            ? "border-red-400 bg-red-50"
                            : "border-border bg-card"
                        }`}
                      >
                        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground uppercase tracking-wide">
                          {doc.label} {doc.required && <span className="text-red-500">*</span>}
                          {isUploaded && (
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white shrink-0">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>

                        <p className="text-xs text-muted-foreground mt-2">
                          {t("allowedFileTypesCameraPdfNote") || "Allowed file types: JPG, JPEG, PNG, WEBP, PDF (o kumuha gamit ang Camera)"}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                          <input
                            type="file"
                            id={inputId}
                            key={`${inputId}-${files.length}`}
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const selected = e.target.files ? Array.from(e.target.files) : []
                              if (selected.length > 0) handleFileUpload(doc.id, selected)
                              e.target.value = ""
                            }}
                          />
                          <label
                            htmlFor={inputId}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold tracking-wide cursor-pointer hover:bg-blue-700 transition-colors shadow-xs"
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

                        {isUploaded && (
                          <div className="flex flex-wrap gap-3 pt-4">
                            {files.map((file, idx) => (
                              <div
                                key={`${file.name}-${idx}`}
                                className="relative w-40 border border-border rounded-lg bg-white p-3 flex flex-col items-center text-center shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(doc.id, idx)}
                                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer"
                                  title="Remove file"
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
                            ))}
                          </div>
                        )}

                        {missing && (
                          <p className="text-xs text-red-500 mt-2">
                            {t("uploadFilesRequirementAlert") || "Kinakailangang mag-upload ng file para sa bawat required document (*) bago magpatuloy."}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span>{t("backButton") ? t("backButton").toUpperCase() : "BACK"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!step3Valid) {
                      setAttemptedNext(true)
                      return
                    }
                    setAttemptedNext(false)
                    setStep(4)
                    setReturnToReview(false)
                  }}
                  className="px-7 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center bg-[#3b82f6] hover:bg-blue-600 text-white cursor-pointer shadow-xs"
                >
                  <span>{t("nextButton") ? t("nextButton").toUpperCase() : "NEXT"}</span>
                </button>
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

              {/* Card 1: Application Details */}
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/70 space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-xs font-bold uppercase text-gray-700 tracking-wide">
                    {t("applicationDetails") || "Application Details"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setReturnToReview(true); setStep(1) }}
                    className="text-xs font-semibold text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" /> {t("editLabel") || "Edit"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">{t("serviceLabel") || "Service"}:</span>{" "}
                    <span className="font-semibold text-gray-900">Senior Citizen ID</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t("applicationTypeLabel") || "Application Type"}:</span>{" "}
                    <span className="font-semibold text-gray-900 uppercase">{flowBadgeTitle}</span>
                  </div>
                  {appFlow !== "new" && existingIdNumber && (
                    <>
                      <div>
                        <span className="text-gray-500">
                          {appFlow === "renewal" ? (t("expiredOldSeniorId") || "Expired / Old Senior ID:") : (t("lostSeniorIdLabel") || "Lost Senior ID / QCID:")}
                        </span>{" "}
                        <span className="font-mono font-semibold text-gray-900">{existingIdNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">
                          {appFlow === "renewal" ? (t("reasonForRenewalLabel") || "Reason for Renewal:") : (t("reasonForReplacementLabel") || "Reason for Replacement:")}
                        </span>{" "}
                        <span className="font-semibold text-gray-900">
                          {appFlow === "renewal" ? reasonForRenewal : reasonForReplacement}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card 2: Personal Information */}
              <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-xs font-bold uppercase text-gray-800 tracking-wide flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#3b82f6]" />{" "}
                    {t("wizardPersonal") || "Personal Information"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setReturnToReview(true); setStep(2) }}
                    className="text-xs font-semibold text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" /> {t("editLabel") || "Edit"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-4 text-xs">
                    <div>
                      <p className="text-gray-500">{t("fullNameLabel") || "Full Name"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{fullName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("birthDateLabel") || "Date of Birth"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">
                        {formData.dobMonth}/{formData.dobDay}/{formData.dobYear}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("ageLabel") || "Age"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{formData.age} {t("yearsOld") || "taong gulang"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("genderLabel") || "Sex/Gender"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{formData.sex}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("civilStatusLabel") || "Civil Status"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{formData.civilStatus}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Blood Type</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{formData.bloodType || "O+"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("phoneNumberLabel") || "Contact Number"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5 font-mono">{formData.contactNo}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("emailLabel") || "Email Address"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{formData.email || userProfile?.email || "—"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-gray-500">{t("fullAddressLabel") || "Complete Address"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{fullAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t("barangayLabel") || "Barangay"}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">{formData.barangay}</p>
                    </div>
                    {formData.qcidNumber && (
                      <div>
                        <p className="text-gray-500">{t("qcIdLabel") || "QCID Number"}</p>
                        <p className="font-semibold text-gray-900 text-sm mt-0.5 font-mono">{formData.qcidNumber}</p>
                      </div>
                    )}
                    {formData.psaReference && (
                      <div>
                        <p className="text-gray-500">PSA Reference</p>
                        <p className="font-semibold text-gray-900 text-sm mt-0.5 font-mono">{formData.psaReference}</p>
                      </div>
                    )}
                    {formData.emergencyFirstName && (
                      <div className="sm:col-span-3 border-t border-gray-100 pt-3 mt-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-gray-500">{t("emergencyContactName") || "Emergency Contact Name"}</p>
                          <p className="font-semibold text-gray-900 text-sm mt-0.5">
                            {formData.emergencyFirstName} {formData.emergencyLastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t("emergencyContactNoLabel") || "Emergency Contact No."}</p>
                          <p className="font-semibold text-gray-900 text-sm mt-0.5 font-mono">
                            {formData.emergencyContactNo}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t("pwdRelationshipLabel") || "Relationship"}</p>
                          <p className="font-semibold text-gray-900 text-sm mt-0.5">
                            {formData.emergencyRelationship}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
              </div>

              {/* Card 3: Documents */}
              <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#3b82f6]" /> {t("uploadedDocuments") || "Uploaded Documents"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setReturnToReview(true); setStep(3) }}
                    className="text-xs font-semibold text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" /> {t("editLabel") || "Edit"}
                  </button>
                </div>

                <div className="space-y-4">
                  {currentRequirements.map((doc) => {
                    const files = uploadedFiles[doc.id] || []
                    const uploaded = files.length > 0
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
                            {files.map((f, i) => (
                              <button
                                key={`${f.name}-${i}`}
                                type="button"
                                onClick={() => setPreviewDocModal({ title: doc.label, file: f })}
                                className="w-full max-w-md border border-border hover:border-blue-400 rounded-lg overflow-hidden text-left bg-white cursor-pointer transition-colors shadow-xs"
                              >
                                <div className="h-28 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                  <FileThumbnail file={f} className="h-full w-full object-cover" />
                                </div>
                                <div className="px-3 py-2 text-center border-t border-border bg-white">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {f.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatFileSize(f.size)}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">{t("noFileUploadedYet") || "Walang nai-upload na dokumento"}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span>{t("backButton") ? t("backButton").toUpperCase() : "BACK"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-7 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center bg-[#3b82f6] hover:bg-blue-600 text-white cursor-pointer shadow-xs"
                >
                  <span>{t("submitApplicationUpper") || "SUBMIT APPLICATION"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SUBMIT CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#3b82f6] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-gray-900">{t("reviewBeforeSubmission") || "Review Before Submission"}</h3>
              <p className="text-sm font-semibold text-gray-900">
                {t("areYouSureSubmit") || "Are you sure you want to submit your application?"}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t("checkAllInfoNotice") || "Please check all information and uploaded documents before submitting. You can still go back and make changes."}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  setStep(4)
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {t("goBackEditBtn") || "← GO BACK & EDIT"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  handleFinalSubmit()
                }}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? (t("submittingUpper") || "Submitting...") : (t("yesSubmitBtn") || "YES, SUBMIT APPLICATION")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CAMERA MODAL ── */}
      {cameraDoc && (
        <DocumentCameraModal
          isOpen={Boolean(cameraDoc)}
          onClose={() => setCameraDoc(null)}
          docTitle={cameraDoc.label}
          onCapture={(file) => {
            handleFileUpload(cameraDoc.id, [file])
            setCameraDoc(null)
          }}
        />
      )}

      {/* ── SAMPLE DOCUMENT MODAL ── */}
      <SampleDocModal
        doc={selectedSampleDoc}
        isOpen={Boolean(selectedSampleDoc)}
        onClose={() => setSelectedSampleDoc(null)}
      />

      {/* ── UPLOADED DOCUMENT FULL PREVIEW MODAL ── */}
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

function SampleDocModal({
  doc,
  isOpen,
  onClose,
}: {
  doc: DocumentItem | null
  isOpen: boolean
  onClose: () => void
}) {
  const { t } = useLanguage()
  if (!isOpen || !doc) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            {t("sampleLabel", { name: doc.label }) || `SAMPLE: ${doc.label}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-muted-foreground">{doc.description}</p>
          {doc.sampleImage ? (
            <div className="border border-border rounded-xl overflow-hidden bg-gray-50 p-2 flex items-center justify-center">
              <img
                src={doc.sampleImage}
                alt={doc.label}
                className="max-h-80 w-auto object-contain rounded-lg shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none"
                }}
              />
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-muted-foreground text-sm">
              {t("noSampleImageAvailable") || "Walang sample image na available."}
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-900 cursor-pointer"
          >
            {t("close") ? t("close").toUpperCase() : "CLOSE"}
          </button>
        </div>
      </div>
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