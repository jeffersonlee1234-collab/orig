import { useEffect, useState, useRef } from "react"
import { X, Loader2, Info, FileText, Pencil, ChevronUp, Check, Upload, Camera, AlertCircle, RotateCcw, Clock } from "lucide-react"
import { useLanguage } from "../ui/language-context"
import RequirementsModal, { AICS_REQUIREMENTS } from "./Requirements-modal"
import DocumentCameraModal from "../ui/document-camera-modal"



function formatFileSize(bytes: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

interface ApplyAICSProps {
  initialType?: string
  initialTypeKey?: string   
  onBack?: () => void
}

type Step = "requirements" | "checklist" | "personal" | "documents" | "review" | "appointment" | "form" | "matching" | "pending"

import { API_BASE } from "../../config/api"
import { getCurrentUserProfile, getLoggedInUserQcid, toISODateString } from "../../utils/userProfile"
import { notifyApplicationChange } from "../../utils/realtimeSync"

export default function ApplyAICS({ initialType, initialTypeKey }: ApplyAICSProps) {
  const { t, language } = useLanguage()

  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const WIZARD_TABS = [
    t("wizardChecklist")?.toUpperCase() || "COMPLETE CHECKLIST",
    t("wizardPersonal")?.toUpperCase() || "PERSONAL INFORMATION",
    t("pwdStepDocuments")?.toUpperCase() || "UPLOAD DOCUMENTS",
    t("wizardReview")?.toUpperCase() || "REVIEW & SUBMIT",
  ]

  const SAMPLE_DOCUMENTS = [
    "MEDICAL CERTIFICATE / CLINICAL ABSTRACT",
    "RESETA NG GAMOT",
    "BARANGAY CERTIFICATE OF INDIGENCY",
    "QC ID NG PASYENTE",
    "AUTHORIZATION / PERSONAL LETTER",
  ]

  const FUNERAL_SAMPLE_DOCUMENTS = [
    "REFERRAL FORM MULA SA BARANGAY, HOSPITAL O FUNERAL",
    "CERTIFIED TRUE COPY NG DEATH CERTIFICATE",
    "NOTARIZED FUNERAL CONTRACT (ORIHINAL NA KOPYA; NAKATALA ANG MGA SERBISYO AT HALAGA)",
    "CERTIFICATE OF INDIGENCY (ORIHINAL NA KOPYA; PARA SA FUNERAL/BURIAL ASSISTANCE)",
    "ANUMANG BALIDONG GOVERNMENT ID (MAS MAINAM KUNG QC ID)",
    "PHOTOCOPY NG BALIDONG ID NG NAMATAY, MAS MAINAM KUNG QCID",
  ]

  const EDUCATIONAL_SAMPLE_DOCUMENTS = [
    "KOPYA NG PINAKABAGONG SCHOOL ID O PINAKABAGONG CERTIFICATE OF ENROLLMENT NG BENEPISYARYO",
    "BARANGAY ISSUED CERTIFICATE OF INDIGENCY NA NAGPAPAHIWATIG NG LAYUNIN PARA SA PAG-AVAIL NG SSDD EDUCATIONAL ASSISTANCE",
    "QC ID NG PERSON WITH DISABILITY",
  ]

  const ALLOWED_UPLOAD_FILE_TYPES = "JPG, JPEG, PNG, WEBP"

  const SAMPLE_DOCUMENT_INFO: Record<string, { images: string[]; downloadUrl?: string }> = {
    "MEDICAL CERTIFICATE / CLINICAL ABSTRACT": {
      images: ["/samples/MEDICAL CERTIFICATE.jpg"],
      downloadUrl: "/samples/MEDICAL CERTIFICATE.jpg",
    },
    "RESETA NG GAMOT": {
      images: ["/samples/RESETA NG GAMOT.jpg"],
      downloadUrl: "/samples/RESETA NG GAMOT.jpg",
    },
    "BARANGAY CERTIFICATE OF INDIGENCY": {
      images: ["/samples/BARANGAY CERTIFICATE OF INDIGENCY.jpg"],
      downloadUrl: "/samples/BARANGAY CERTIFICATE OF INDIGENCY.jpg",
    },
    "QC ID NG PASYENTE": {
      images: ["/samples/QC ID NG PASYENTE.jpg"],
      downloadUrl: "/samples/QC ID NG PASYENTE.jpg",
    },
    "AUTHORIZATION / PERSONAL LETTER": {
      images: ["/samples/AUTHORIZATION  PERSONAL LETTER.jpg"],
      downloadUrl: "/samples/AUTHORIZATION  PERSONAL LETTER.jpg",
    },
    "REFERRAL FORM MULA SA BARANGAY, HOSPITAL O FUNERAL": {
      images: ["/samples/sample_referral_form.png"],
      downloadUrl: "/samples/sample_referral_form.png",
    },
    "CERTIFIED TRUE COPY NG DEATH CERTIFICATE": {
      images: ["/samples/sample_death_certificate.png"],
      downloadUrl: "/samples/sample_death_certificate.png",
    },
     "NOTARIZED FUNERAL CONTRACT (ORIHINAL NA KOPYA; NAKATALA ANG MGA SERBISYO AT HALAGA)": {
      images: ["/samples/sample_burial_contract.png"],
      downloadUrl: "/samples/sample_burial_contract.png",
    },
    "CERTIFICATE OF INDIGENCY (ORIHINAL NA KOPYA; PARA SA FUNERAL/BURIAL ASSISTANCE)": {
      images: ["/samples/sample_certificate_of_indigency.png"],
      downloadUrl: "/samples/sample_certificate_of_indigency.png",
    },
    "ANUMANG BALIDONG GOVERNMENT ID (MAS MAINAM KUNG QC ID)": { 
      images: ["/samples/sample_valid_id.png"],
      downloadUrl: "/samples/sample_valid_id.png",
    },
    "PHOTOCOPY NG BALIDONG ID NG NAMATAY, MAS MAINAM KUNG QCID": {
      images: ["/samples/sample_valid_id.png"],
      downloadUrl: "/samples/sample_valid_id.png",
    },
    "KOPYA NG PINAKABAGONG SCHOOL ID O PINAKABAGONG CERTIFICATE OF ENROLLMENT NG BENEPISYARYO": {
      images: ["/samples/sample_school_id_or_cert_of_enrollment.png"],
      downloadUrl: "/samples/sample_school_id_or_cert_of_enrollment.png",
    },
    "BARANGAY ISSUED CERTIFICATE OF INDIGENCY NA NAGPAPAHIWATIG NG LAYUNIN PARA SA PAG-AVAIL NG SSDD EDUCATIONAL ASSISTANCE": {
      images: ["/samples/BARANGAY CERTIFICATE OF INDIGENCY.jpg"],
      downloadUrl: "/samples/BARANGAY CERTIFICATE OF INDIGENCY.jpg",
    },
    "QC ID NG PERSON WITH DISABILITY": {
      images: ["/samples/QC ID NG PASYENTE.jpg"],
      downloadUrl: "/samples/QC ID NG PASYENTE.jpg",
    },
  }

  const assistanceTypes = [
    t("assistMedical"),
    t("assistBurial"),
    t("assistEducational"),
    t("assistTransportationLower"),
  ]

  const [name] = useState("")
  const [type] = useState(initialType || assistanceTypes[0])
  const [reference, setReference] = useState("")
  const [appStatus, setAppStatus] = useState<"pending" | "approved" | "rejected" | "completed">("pending")
  const [rejectionReason, setRejectionReason] = useState("")

  const isFuneralAssistance =
    initialTypeKey === "aicsFuneral" ||
    type?.toLowerCase().includes("funeral") ||
    type?.toLowerCase().includes("libing") ||
    type?.toLowerCase().includes("burial")

  const isEducationalAssistance =
    initialTypeKey === "aicsEducational" ||
    type?.toLowerCase().includes("educational") ||
    type?.toLowerCase().includes("aral")

  const resolvedTypeKey =
    initialTypeKey ||
    (isFuneralAssistance
      ? "aicsFuneral"
      : isEducationalAssistance
      ? "aicsEducational"
      : type?.toLowerCase().includes("material")
      ? "aicsMaterial"
      : type?.toLowerCase().includes("food") || type?.toLowerCase().includes("pagkain")
      ? "aicsFood"
      : type?.toLowerCase().includes("transport") || type?.toLowerCase().includes("biyahe")
      ? "aicsTransportation"
      : "aicsMedical")

  const requirements = AICS_REQUIREMENTS[resolvedTypeKey] || AICS_REQUIREMENTS["aicsMedical"]
  const hasRequirements = Boolean(requirements)

  const [isReapplying, setIsReapplying] = useState(() => {
    try {
      return typeof window !== "undefined" && window.location.search.includes("reapply=true")
    } catch {
      return false
    }
  })
  const isReapplyingRef = useRef(isReapplying)
  useEffect(() => {
    isReapplyingRef.current = isReapplying
  }, [isReapplying])

  const [step, setStep] = useState<Step>(
    hasRequirements ? "checklist" : "form"
  )
  const [returnToReview, setReturnToReview] = useState(false)
  const [showRequirementsModal, setShowRequirementsModal] = useState(false)

  const [reqAccepted, setReqAccepted] = useState(false)
  const [showInfoBanner, setShowInfoBanner] = useState(true)
  const [showSlotBanner, setShowSlotBanner] = useState(true)

  const [checklistResident, setChecklistResident] = useState(false)
  const [checklistPatient, setChecklistPatient] = useState(false)
  const [checklistPriorAid, setChecklistPriorAid] = useState<"yes" | "no">("no")
  const [priorAidOffice, setPriorAidOffice] = useState("")
  const [priorAidType, setPriorAidType] = useState("")

  const handleReapply = () => {
    setIsReapplying(true)
    isReapplyingRef.current = true
    setStep(hasRequirements ? "checklist" : "form")
    setReference("")
    setAppStatus("pending")
    setUploadedDocs({})
    setChecklistResident(false)
    setChecklistPatient(false)
    setChecklistPriorAid("no")
    setEduEligResident(false)
    setEduEligAge(false)
    setEduEligSchool(false)
    setEduEligIndigent(false)
    setChecklistDeceasedResident("")
    try {
      ;(window as any).__isFormDirty = false
    } catch {}
  }

  const [eduEligResident, setEduEligResident] = useState(false)
  const [eduEligAge, setEduEligAge] = useState(false)
  const [eduEligSchool, setEduEligSchool] = useState(false)
  const [eduEligIndigent, setEduEligIndigent] = useState(false)

  const [checklistDeceasedResident, setChecklistDeceasedResident] = useState<"yes" | "no" | "">("")
  const [checklistRelation, setChecklistRelation] = useState("")
  const [checklistFuneralHome, setChecklistFuneralHome] = useState("")

  const canProceedChecklist = isFuneralAssistance
    ? Boolean(checklistDeceasedResident === "yes" && checklistRelation && checklistFuneralHome)
    : isEducationalAssistance
    ? eduEligResident && eduEligAge && eduEligSchool && eduEligIndigent
    : checklistResident && checklistPatient

  const [qcId] = useState(() => getLoggedInUserQcid())
  const [pFirstName, setPFirstName] = useState("")
  const [pMiddleName, setPMiddleName] = useState("")
  const [pLastName, setPLastName] = useState("")
  const [pSuffix, setPSuffix] = useState("")
  const [pNationality, setPNationality] = useState("FILIPINO")
  const [pBirthDate, setPBirthDate] = useState("")
  const [pAge, setPAge] = useState("")
  const [pGender, setPGender] = useState("")
  const [pCivilStatus, setPCivilStatus] = useState("")
  const [pHouseNumber, setPHouseNumber] = useState("")
  const [pStreetName, setPStreetName] = useState("")
  const [pBarangay, setPBarangay] = useState("")
  const [pPhoneNumber, setPPhoneNumber] = useState("")
  const [pEmail, setPEmail] = useState("")
  const [isSelfPatient, setIsSelfPatient] = useState(false)

  const [iRelation, setIRelation] = useState("")
  const [iFirstName, setIFirstName] = useState("")
  const [iMiddleName, setIMiddleName] = useState("")
  const [iLastName, setILastName] = useState("")
  const [iSuffix, setISuffix] = useState("")
  const [iGender, setIGender] = useState("")
  const [iBirthDate, setIBirthDate] = useState("")
  const [iAge, setIAge] = useState("")
  const [sameAddressAsApplicant, setSameAddressAsApplicant] = useState(false)
  const [iHouseNumber, setIHouseNumber] = useState("")
  const [iStreetName, setIStreetName] = useState("")
  const [iBarangay, setIBarangay] = useState("")

  const [benRelation, setBenRelation] = useState("")
  const [benIsSelf, setBenIsSelf] = useState(false)
  const [benFirstName, setBenFirstName] = useState("")
  const [benMiddleName, setBenMiddleName] = useState("")
  const [benLastName, setBenLastName] = useState("")
  const [benSuffix, setBenSuffix] = useState("")
  const [benBirthDate, setBenBirthDate] = useState("")
  const [benAge, setBenAge] = useState("")
  const [benGender, setBenGender] = useState("")
  const [benDisabilityType, setBenDisabilityType] = useState("")
  const [benSchoolName, setBenSchoolName] = useState("")
  const [benSchoolAddress, setBenSchoolAddress] = useState("")
  const [benGradeLevel, setBenGradeLevel] = useState("")
  const [benSameAddress, setBenSameAddress] = useState(false)
  const [benHouseNumber, setBenHouseNumber] = useState("")
  const [benStreetName, setBenStreetName] = useState("")
  const [benBarangay, setBenBarangay] = useState("")

  const [dFirstName, setDFirstName] = useState("")
  const [dMiddleName, setDMiddleName] = useState("")
  const [dLastName, setDLastName] = useState("")
  const [dSuffix, setDSuffix] = useState("")
  const [dGender, setDGender] = useState("")
  const [dBirthDate, setDBirthDate] = useState("")
  const [dDeathDate, setDDeathDate] = useState("")
  const [dAge, setDAge] = useState("")
  const [dCremationOrBurial, setDCremationOrBurial] = useState("")
  const [dPlaceOfDeath, setDPlaceOfDeath] = useState("")
  const [dBurialDate, setDBurialDate] = useState("")
  const [dBurialPlace, setDBurialPlace] = useState("")
  const [dBurialPlaceOther, setDBurialPlaceOther] = useState("")
  const [dCremationPlace, setDCremationPlace] = useState("")
  const [dCremationPlaceOther, setDCremationPlaceOther] = useState("")
  const [dSameAddressAsApplicant, setDSameAddressAsApplicant] = useState(false)
  const [dHouseNumber, setDHouseNumber] = useState("")
  const [dStreetName, setDStreetName] = useState("")
  const [dBarangay, setDBarangay] = useState("")

  useEffect(() => {
    const syncProfile = () => {
      const prof = getCurrentUserProfile()
      if (prof) {
        setPFirstName(prof.firstName || "")
        setPMiddleName(prof.middleName || "")
        setPLastName(prof.lastName || "")
        setPSuffix(prof.suffix || "")
        setPNationality(prof.nationality || "FILIPINO")
        setPBirthDate(prof.birthDateIso || prof.birthDate || toISODateString(prof.birthDate) || "")
        setPAge(String(prof.age || ""))
        setPGender(prof.sex === "Male" || prof.sex === "MALE" ? "Lalaki" : "Babae")
        setPCivilStatus(prof.civilStatus || "Single")
        setPHouseNumber(prof.addressHouseNo || prof.houseNo || "")
        setPStreetName(prof.addressStreet || prof.street || "")
        setPBarangay(prof.addressBarangay || prof.barangay || "Sauyo")
        setPPhoneNumber(String(prof.contactNo || prof.mobileNumber || "").replace(/\s+/g, ""))
        setPEmail(prof.email || "")
      }
    }
    syncProfile()
    window.addEventListener("user_profile_updated", syncProfile)
    window.addEventListener("storage", syncProfile)
    return () => {
      window.removeEventListener("user_profile_updated", syncProfile)
      window.removeEventListener("storage", syncProfile)
    }
  }, [qcId])

  useEffect(() => {
    if (dSameAddressAsApplicant) {
      setDHouseNumber(pHouseNumber)
      setDStreetName(pStreetName)
      setDBarangay(pBarangay)
    }
  }, [dSameAddressAsApplicant, pHouseNumber, pStreetName, pBarangay])
  useEffect(() => {
    if (dBirthDate && dDeathDate) {
      const b = new Date(dBirthDate)
      const d = new Date(dDeathDate)
      let age = d.getFullYear() - b.getFullYear()
      const m = d.getMonth() - b.getMonth()
      if (m < 0 || (m === 0 && d.getDate() < b.getDate())) {
        age--
      }
      if (age >= 0) {
        setDAge(String(age))
      }
    }
  }, [dBirthDate, dDeathDate])
  useEffect(() => {
    if (sameAddressAsApplicant) {
      setIHouseNumber(pHouseNumber)
      setIStreetName(pStreetName)
      setIBarangay(pBarangay)
    }
  }, [sameAddressAsApplicant, pHouseNumber, pStreetName, pBarangay])

  useEffect(() => {
    if (isSelfPatient) {
      setIRelation("Sarili")
      setIFirstName(pFirstName)
      setIMiddleName(pMiddleName)
      setILastName(pLastName)
      setISuffix(pSuffix)
      setIGender(pGender)
      setIBirthDate(toISODateString(pBirthDate))
      setIAge(pAge)
    }
  }, [isSelfPatient, pFirstName, pMiddleName, pLastName, pSuffix, pGender, pBirthDate, pAge])

  useEffect(() => {
    if (benSameAddress) {
      setBenHouseNumber(pHouseNumber)
      setBenStreetName(pStreetName)
      setBenBarangay(pBarangay)
    }
  }, [benSameAddress, pHouseNumber, pStreetName, pBarangay])

  useEffect(() => {
    if (benIsSelf) {
      setBenFirstName(pFirstName)
      setBenMiddleName(pMiddleName)
      setBenLastName(pLastName)
      setBenSuffix(pSuffix)
      setBenGender(pGender)
      setBenBirthDate(toISODateString(pBirthDate))
      setBenAge(pAge)
    }
  }, [benIsSelf, pFirstName, pMiddleName, pLastName, pSuffix, pGender, pBirthDate, pAge])

  const handleToggleSelfPatient = (checked: boolean) => {
    setIsSelfPatient(checked)
    setSameAddressAsApplicant(checked)
    if (checked) {
      setIRelation("Sarili")
      setIFirstName(pFirstName)
      setIMiddleName(pMiddleName)
      setILastName(pLastName)
      setISuffix(pSuffix)
      setIGender(pGender)
      setIBirthDate(toISODateString(pBirthDate))
      setIAge(pAge)
      setIHouseNumber(pHouseNumber)
      setIStreetName(pStreetName)
      setIBarangay(pBarangay)
    } else {
      setIRelation("")
      setIHouseNumber("")
      setIStreetName("")
      setIBarangay("")
      setIFirstName("")
      setIMiddleName("")
      setILastName("")
      setISuffix("")
      setIGender("")
      setIBirthDate("")
      setIAge("")
    }
  }

  const handleToggleSelfBeneficiary = (checked: boolean) => {
    setBenIsSelf(checked)
    setBenSameAddress(checked)
    if (checked) {
      setBenFirstName(pFirstName)
      setBenMiddleName(pMiddleName)
      setBenLastName(pLastName)
      setBenSuffix(pSuffix)
      setBenGender(pGender)
      setBenBirthDate(toISODateString(pBirthDate))
      setBenAge(pAge)
      setBenHouseNumber(pHouseNumber)
      setBenStreetName(pStreetName)
      setBenBarangay(pBarangay)
    } else {
      setBenHouseNumber("")
      setBenStreetName("")
      setBenBarangay("")
      setBenFirstName("")
      setBenMiddleName("")
      setBenLastName("")
      setBenSuffix("")
      setBenGender("")
      setBenBirthDate("")
      setBenAge("")
    }
  }

const canProceedPersonal = Boolean(
    pFirstName.trim() &&
    pLastName.trim() &&
    pNationality.trim() &&
    pBirthDate.trim() &&
    pAge.trim() &&
    pGender.trim() &&
    pHouseNumber.trim() &&
    pStreetName.trim() &&
    pBarangay.trim() &&
    pPhoneNumber.trim() &&
    (isFuneralAssistance
      ? dFirstName.trim() &&
        dLastName.trim() &&
        dGender.trim() &&
        dBirthDate.trim() &&
        dDeathDate.trim() &&
        dAge.trim() &&
        dCremationOrBurial.trim() &&
        dPlaceOfDeath.trim() &&
        dHouseNumber.trim() &&
        dStreetName.trim() &&
        dBarangay.trim()
      : isEducationalAssistance
      ? benRelation.trim() &&
        benFirstName.trim() &&
        benLastName.trim() &&
        benBirthDate.trim() &&
        benAge.trim() &&
        benGender.trim() &&
        benDisabilityType.trim() &&
        benSchoolName.trim() &&
        benSchoolAddress.trim() &&
        benGradeLevel.trim() &&
        benHouseNumber.trim() &&
        benStreetName.trim() &&
        benBarangay.trim()
      : iRelation.trim() &&
        iFirstName.trim() &&
        iLastName.trim() &&
        iGender.trim() &&
        iBirthDate.trim() &&
        iAge.trim() &&
        iHouseNumber.trim() &&
        iStreetName.trim() &&
        iBarangay.trim())
  )

  const requiredDocuments = isFuneralAssistance
    ? FUNERAL_SAMPLE_DOCUMENTS
    : isEducationalAssistance
    ? EDUCATIONAL_SAMPLE_DOCUMENTS
    : SAMPLE_DOCUMENTS

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File[]>>({})
  const [cameraDoc, setCameraDoc] = useState<string | null>(null)
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; file: File } | null>(null)

  // Reload / Navigation warning protection — strictly active only starting from Step 2 onwards (personal, documents, review)
  const isFormDirty =
    step === "personal" ||
    step === "documents" ||
    step === "review"

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
    const handleFileUpload = (docName: string, files: File[]) => {
    if (!files || files.length === 0) return

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    const allowedExtensions = /\.(jpe?g|png|webp)$/i

    const validFiles = files.filter(
      (f) => allowedTypes.includes(f.type) || allowedExtensions.test(f.name)
    )
    const rejectedCount = files.length - validFiles.length

    if (rejectedCount > 0) {
      alert(`${rejectedCount} file(s) ang hindi tinanggap. Mga litrato o larawan (JPG, JPEG, PNG, WEBP) lamang ang maaaring i-upload. Bawal ang document/PDF file.`)
    }

    if (validFiles.length === 0) return

    setUploadedDocs((prev) => ({
      ...prev,
      [docName]: [validFiles[0]],
    }))
  }

  const handleRemoveFile = (docName: string, fileIndex: number) => {
    setUploadedDocs((prev) => {
      const updated = [...(prev[docName] || [])]
      updated.splice(fileIndex, 1)
      return { ...prev, [docName]: updated }
    })
  }

  const canProceedDocuments = requiredDocuments.every(
    (doc) => (uploadedDocs[doc]?.length ?? 0) > 0
  )

  // Check for existing active/pending applications for the current user & service
  useEffect(() => {
    let isMounted = true

    const checkActiveAicsApplication = async () => {
      if (isReapplyingRef.current) return
      try {
        const userProfile = getCurrentUserProfile()
        const userQcid = (getLoggedInUserQcid() || userProfile.qcidNo || "").trim().toLowerCase()
        const userEmail = (userProfile.email || "").trim().toLowerCase()
        const userFirst = (userProfile.firstName || "").trim().toLowerCase()
        const userLast = (userProfile.lastName || "").trim().toLowerCase()

        let remoteApps: any[] = []
        try {
          const res = await fetch(`${API_BASE}/api/aics/applications`)
          if (res.ok) {
            const data = await res.json()
            if (data && Array.isArray(data.applications)) {
              remoteApps = data.applications
            } else if (Array.isArray(data)) {
              remoteApps = data
            }
          }
        } catch (err) {
          console.warn("Could not fetch remote AICS applications:", err)
        }

        let localApps: any[] = []
        try {
          const raw = localStorage.getItem("aics_applications")
          if (raw) localApps = JSON.parse(raw)
          if (!Array.isArray(localApps)) localApps = []
        } catch {}

        const allApps: any[] = [...remoteApps]
        for (const la of localApps) {
          const exists = allApps.some((a) => {
            if (a.id && la.id && a.id === la.id) return true
            const aRef = String(a.reference_no || a.reference_number || a.qc_id || "").trim()
            const laRef = String(la.reference_no || la.reference_number || la.qc_id || "").trim()
            return aRef && laRef && aRef === laRef
          })
          if (!exists) allApps.push(la)
        }

        const matchService = (a: any) => {
          if (!a) return false
          if (a.is_archived === true) return false
          const aType = String(a.assistance_type || a.service || a.type || "").toLowerCase()

          if (resolvedTypeKey === "aicsMedical" || type.toLowerCase().includes("med")) {
            return aType.includes("med") || aType.includes("gamot") || aType.includes("hospital") || aType.includes("krisis") || aType === ""
          }
          if (resolvedTypeKey === "aicsFuneral" || type.toLowerCase().includes("funeral") || type.toLowerCase().includes("libing") || type.toLowerCase().includes("burial")) {
            return aType.includes("funeral") || aType.includes("burial") || aType.includes("libing")
          }
          if (resolvedTypeKey === "aicsEducational" || type.toLowerCase().includes("educ") || type.toLowerCase().includes("aral")) {
            return aType.includes("educ") || aType.includes("school") || aType.includes("tuition") || aType.includes("aral")
          }
          return aType.includes(resolvedTypeKey.replace("aics", "").toLowerCase()) || aType.includes(type.toLowerCase())
        }

        const isUserMatch = (a: any) => {
          if (!a) return false
          const appQc = String(a.qc_id || a.reference_no || a.reference_number || "").trim().toLowerCase()
          const appEmail = String(a.email || "").trim().toLowerCase()
          const appName = String(a.full_name || `${a.first_name || ""} ${a.last_name || ""}`).trim().toLowerCase()
          const appFirst = String(a.first_name || "").trim().toLowerCase()
          const appLast = String(a.last_name || "").trim().toLowerCase()

          if (userQcid && appQc && userQcid.length >= 10 && appQc === userQcid) return true
          if (userEmail && appEmail && appEmail === userEmail) return true
          if (userFirst && userLast && appFirst && appLast && appFirst === userFirst && appLast === userLast) return true
          if (userFirst && userLast && appName && (appName === `${userFirst} ${userLast}` || (appName.startsWith(userFirst + " ") && appName.endsWith(" " + userLast)))) return true
          return false
        }

        const matchingApps = allApps.filter((a) => matchService(a) && isUserMatch(a))
        const activeApp = matchingApps.find((a) => {
          const s = String(a.status || "pending").toLowerCase()
          return (
            s === "pending" ||
            s === "under_review" ||
            s === "for_assessment" ||
            s === "assessment" ||
            s === "approved" ||
            s === "completed" ||
            s === "for_release" ||
            s === "rejected" ||
            s === "disapproved"
          )
        })

        if (isMounted && activeApp && !isReapplyingRef.current) {
          const ref = activeApp.reference_no || activeApp.reference_number || activeApp.qc_id || (activeApp.id ? `AICS-2026-${String(activeApp.id).padStart(4, "0")}` : "")
          setReference(ref)
          const rawSt = String(activeApp.status || "pending").toLowerCase()
          setAppStatus((rawSt === "disapproved" ? "rejected" : rawSt) as any)
          setRejectionReason(activeApp.rejection_reason || activeApp.rejectionReason || activeApp.remarks || activeApp.admin_notes || activeApp.reason || "")
          setStep("pending")
          if (activeApp.first_name) setPFirstName(activeApp.first_name)
          if (activeApp.last_name) setPLastName(activeApp.last_name)
          if (activeApp.email) setPEmail(activeApp.email)
        }
      } catch (err) {
        console.warn("[ApplyAICS] Error checking active application:", err)
      }
    }

    checkActiveAicsApplication()
    const interval = setInterval(checkActiveAicsApplication, 4000)

    const handleUpdate = () => checkActiveAicsApplication()
    window.addEventListener("aics_applications_updated", handleUpdate)
    window.addEventListener("govserve_realtime_event", handleUpdate)
    window.addEventListener("applications_updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("aics_applications_updated", handleUpdate)
      window.removeEventListener("govserve_realtime_event", handleUpdate)
      window.removeEventListener("applications_updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [type, resolvedTypeKey])

  // Live status poller when viewing pending status screen
  useEffect(() => {
    if (step !== "pending" || !reference) return

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/aics/applications/${encodeURIComponent(reference)}`)
        if (!res.ok) return
        const data = await res.json()
        const app = data.application || data
        const status = app?.status
        const reason = app?.rejection_reason || app?.rejectionReason || app?.remarks || app?.admin_notes || ""
        if (status) {
          const rawSt = status.toLowerCase()
          const cleanSt = rawSt === "disapproved" ? "rejected" : rawSt
          if (cleanSt !== appStatus) {
            setAppStatus(cleanSt as any)
          }
        }
        if (reason) {
          setRejectionReason(reason)
        }
      } catch (err) {
        console.warn("Status check skipped/offline:", err)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 4000)
    return () => clearInterval(interval)
  }, [step, reference, appStatus])


const checkDuplicateBeneficiary = async () => {
  const patientInfo = isFuneralAssistance
    ? {
        firstName: dFirstName,
        middleName: dMiddleName,
        lastName: dLastName,
        suffix: dSuffix,
        birthDate: dBirthDate,
        gender: dGender,
        address: `${[dHouseNumber, dStreetName].filter(Boolean).join(" ")}${dBarangay ? ` Brgy. ${dBarangay}` : ""}`,
      }
    : isEducationalAssistance
    ? {
        firstName: benFirstName,
        middleName: benMiddleName,
        lastName: benLastName,
        suffix: benSuffix,
        birthDate: benBirthDate,
        gender: benGender,
        address: `${[benHouseNumber, benStreetName].filter(Boolean).join(" ")}${benBarangay ? ` Brgy. ${benBarangay}` : ""}`,
      }
    : {
        firstName: pFirstName,
        middleName: pMiddleName,
        lastName: pLastName,
        suffix: pSuffix,
        birthDate: pBirthDate,
        gender: pGender,
        address: `${[pHouseNumber, pStreetName].filter(Boolean).join(" ")}${pBarangay ? ` Brgy. ${pBarangay}` : ""} Quezon City`,
      }

  const params = new URLSearchParams({
    assistanceType: type,
    firstName: patientInfo.firstName || "",
    middleName: patientInfo.middleName || "",
    lastName: patientInfo.lastName || "",
    suffix: patientInfo.suffix || "",
    birthDate: patientInfo.birthDate || "",
    gender: patientInfo.gender || "",
    address: patientInfo.address || "",
  })

  try {
    const res = await fetch(`${API_BASE}/api/aics/applications/check-duplicate?${params}`)
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.duplicate)
  } catch (err) {
    console.warn("Duplicate check skipped/offline:", err)
    return false
  }
}

const handleFinalSubmit = async () => {
  const isDuplicate = await checkDuplicateBeneficiary()
  if (isDuplicate) {
    alert("May kasalukuyang PENDING (Under Review) na application na may parehong impormasyon. Mangyaring maghintay muna sa pagsusuri bago magsumite ng panibagong aplikasyon.")
    return
  }

  setStep("matching")

  try {
    const assistanceTypeName = isEducationalAssistance
      ? "Educational Assistance"
      : isFuneralAssistance
      ? "Funeral Assistance"
      : type?.toLowerCase().includes("material")
      ? "Material Assistance"
      : type?.toLowerCase().includes("food")
      ? "Food Assistance"
      : type?.toLowerCase().includes("transport")
      ? "Transportation Assistance"
      : "Medical Assistance"

    const formData = new FormData()
    formData.append("assistanceType", assistanceTypeName)
    formData.append("qcId", qcId)
    formData.append("firstName", pFirstName)
    formData.append("middleName", pMiddleName)
    formData.append("lastName", pLastName)
    formData.append("suffix", pSuffix)
    formData.append("nationality", pNationality)
    formData.append("birthDate", pBirthDate)
    formData.append("age", pAge)
    formData.append("gender", pGender)
    formData.append("civilStatus", pCivilStatus)
    formData.append("phone", pPhoneNumber)
    formData.append("email", pEmail)

    const fullAddress = `${[pHouseNumber, pStreetName].filter(Boolean).join(" ")}${
      pBarangay ? ` Brgy. ${pBarangay}` : ""
    } Quezon City`
    formData.append("address", fullAddress)

    const details = isFuneralAssistance
            ? {
          deceasedFirstName: dFirstName,
          deceasedMiddleName: dMiddleName,
          deceasedLastName: dLastName,
          deceasedGender: dGender,
          deceasedBirthDate: dBirthDate,
          deceasedDeathDate: dDeathDate,
          deceasedAge: dAge,
          cremationOrBurial: dCremationOrBurial,
          placeOfDeath: dPlaceOfDeath,
          burialDate: dBurialDate,
          burialPlace: dBurialPlace === "Others (Specify)" ? dBurialPlaceOther : dBurialPlace,
          cremationPlace: dCremationPlace === "Others (Specify)" ? dCremationPlaceOther : dCremationPlace,
          deceasedHouseNumber: dHouseNumber,
          deceasedStreetName: dStreetName,
          deceasedBarangay: dBarangay,
          deceasedAddress: `${[dHouseNumber, dStreetName].filter(Boolean).join(" ")}${dBarangay ? ` Brgy. ${dBarangay}` : ""}`,
        }
      : isEducationalAssistance
      ? {
          beneficiaryRelation: benRelation,
          beneficiaryFirstName: benFirstName,
          beneficiaryMiddleName: benMiddleName,
          beneficiaryLastName: benLastName,
          beneficiaryBirthDate: benBirthDate,
          beneficiaryAge: benAge,
          beneficiaryGender: benGender,
          disabilityType: benDisabilityType,
          schoolName: benSchoolName,
          schoolAddress: benSchoolAddress,
          gradeLevel: benGradeLevel,
          beneficiaryHouseNumber: benHouseNumber,
          beneficiaryStreetName: benStreetName,
          beneficiaryBarangay: benBarangay,
          beneficiaryAddress: `${[benHouseNumber, benStreetName].filter(Boolean).join(" ")}${benBarangay ? ` Brgy. ${benBarangay}` : ""}`,
        }
      : {
          informantRelation: iRelation,
          informantFirstName: iFirstName,
          informantMiddleName: iMiddleName,
          informantLastName: iLastName,
          informantGender: iGender,
          informantBirthDate: iBirthDate,
          informantAge: iAge,
          informantHouseNumber: iHouseNumber,
          informantStreetName: iStreetName,
          informantBarangay: iBarangay,
          informantAddress: `${[iHouseNumber, iStreetName].filter(Boolean).join(" ")}${iBarangay ? ` Brgy. ${iBarangay}` : ""}`,
          priorAidOffice,
          priorAidType,
        }

    formData.append("details", JSON.stringify(details))

    const allFiles = Object.values(uploadedDocs).flat()
    const labels: string[] = []
    Object.entries(uploadedDocs).forEach(([docName, files]) => {
      files.forEach(() => labels.push(docName))
    })

    allFiles.forEach((file) => {
      formData.append("documents", file)
    })
    formData.append("documentLabels", JSON.stringify(labels))

    try {
      const response = await fetch(`${API_BASE}/api/aics/applications`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        const assignedRef = data.application?.reference_no || qcId || "110000116932100"
        setReference(assignedRef)
        try {
          localStorage.setItem('aics_application_submitted', String(Date.now()))
          window.dispatchEvent(new CustomEvent('aics_application_submitted'))
        } catch {}
        notifyApplicationChange("APPLICATION_SUBMITTED", "aics", assignedRef)
      } else {
        setReference(qcId || "110000116932100")
        notifyApplicationChange("APPLICATION_SUBMITTED", "aics", qcId || "110000116932100")
      }
    } catch (err) {
      console.warn("Backend unavailable, generating reference:", err)
      setReference(qcId || "110000116932100")
      notifyApplicationChange("APPLICATION_SUBMITTED", "aics", qcId || "110000116932100")
    }

    setTimeout(() => {
      setStep("pending")
    }, 1000)
  } catch (err) {
    console.error("Submit error:", err)
    setReference(qcId || "110000116932100")
    setStep("pending")
  }
}



  const renderTopRequirementsBanner = () => (
    <>
      <div className="mb-4">
        <div className="bg-white border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm md:text-base font-bold text-foreground">
                  {t("requirementsForAppOf").replace("{type}", type)}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                  {t("newApplication") || "New Application"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("officialServiceNote")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRequirementsModal(true)}
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer shrink-0"
          >
            {t("viewRequirements")}
          </button>
        </div>
      </div>

      {showRequirementsModal && requirements && (
        <RequirementsModal
          requirements={requirements}
          serviceTitle={type}
          badgeLabel={t("newApplication") || "New Application"}
          badgeColor="bg-green-50 text-green-700 border-green-200"
          accepted={reqAccepted}
          onAcceptedChange={setReqAccepted}
          onContinue={() => setShowRequirementsModal(false)}
          showInfoBanner={showInfoBanner}
          onCloseInfoBanner={() => setShowInfoBanner(false)}
          showSlotBanner={showSlotBanner}
          onCloseSlotBanner={() => setShowSlotBanner(false)}
          onClose={() => setShowRequirementsModal(false)}
        />
      )}
    </>
  )

  if (step === "checklist") {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {renderTopRequirementsBanner()}

        <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 relative">
          <div className="flex items-center px-6 pt-6 pb-4">
            {WIZARD_TABS.map((_, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i === 0
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {i + 1}
                </div>
                {i < WIZARD_TABS.length - 1 && <div className="flex-1 h-px bg-gray-200 dark:bg-slate-800 mx-2" />}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-b border-border dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-2 overflow-x-auto">
            {WIZARD_TABS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 px-4 py-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                  i === 0 ? "bg-blue-600 text-white shadow-xs" : "bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-slate-200"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="p-6 sm:p-8 space-y-7">
            {/* Blue Info Alert Banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-white">
                  {t("primaryReqAlertTitle").replace("{type}", type.toUpperCase())}
                </p>
                <p className="text-xs text-blue-700 dark:text-slate-200 mt-0.5">
                  {t("primaryReqAlertDesc")}
                </p>
              </div>
            </div>

            {isEducationalAssistance ? (
              <>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wide uppercase">{t("eligibility")}</h2>
                </div>

                <div className="space-y-3">
                  <CustomCheckbox
                    checked={eduEligResident}
                    onChange={setEduEligResident}
                    label={`${t("eduEligResident")} *`}
                  />
                  <CustomCheckbox
                    checked={eduEligAge}
                    onChange={setEduEligAge}
                    label={`${t("eduEligAge")} *`}
                  />
                  <CustomCheckbox
                    checked={eduEligSchool}
                    onChange={setEduEligSchool}
                    label={`${t("eduEligSchool")} *`}
                  />
                  <CustomCheckbox
                    checked={eduEligIndigent}
                    onChange={setEduEligIndigent}
                    label={`${t("eduEligIndigent")} *`}
                  />
                </div>
              </>
            ) : isFuneralAssistance ? (
              <>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wide uppercase">{t("eligibility")}</h2>
                </div>

                <div>
                  <p className="text-sm text-gray-800 dark:text-white mb-3">{t("deceasedResidentQuestion")} *</p>
                  <div className="flex items-center gap-8">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white cursor-pointer select-none">
                      <input
                        type="radio"
                        name="deceasedResident"
                        checked={checklistDeceasedResident === "yes"}
                        onChange={() => setChecklistDeceasedResident("yes")}
                        className="h-4 w-4 accent-[#3b82f6]"
                      />
                      {t("yes")}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white cursor-pointer select-none">
                      <input
                        type="radio"
                        name="deceasedResident"
                        checked={checklistDeceasedResident === "no"}
                        onChange={() => setChecklistDeceasedResident("no")}
                        className="h-4 w-4 accent-[#3b82f6]"
                      />
                      {t("no")}
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-800 dark:text-white mb-3">{t("relationToDeceasedQuestion")} *</p>
                  <div className="space-y-3">
                    {[
                      { key: "relationChild", value: "Anak" },
                      { key: "relationParent", value: "Magulang" },
                      { key: "relationSibling", value: "Kapatid" },
                      { key: "relationSpouse", value: "Asawa" },
                      { key: "otherOption", value: "Iba pa" },
                    ].map((rel) => (
                      <label key={rel.value} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white cursor-pointer select-none">
                        <input
                          type="radio"
                          name="relationToDeceased"
                          checked={checklistRelation === rel.value}
                          onChange={() => setChecklistRelation(rel.value)}
                          className="h-4 w-4 accent-[#3b82f6]"
                        />
                        {t(rel.key)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">
                    {t("funeralHomeQuestion")} *
                  </label>
                  <select
                    value={checklistFuneralHome}
                    onChange={(e) => setChecklistFuneralHome(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                  >
                   <option value="" disabled>{t("chooseFuneralHome")}</option>
                    <option value="Nieto Funeral Services">Nieto Funeral Services</option>
                    <option value="St. Fiacre Funeral Service">St. Fiacre Funeral Service</option>
                    <option value="Vivs Funeral Homes">Vivs Funeral Homes</option>
                    <option value="Rizalde Funeral Services">Rizalde Funeral Services</option>
                    <option value="Kaagapay Mo Karamay Funeral Homes Co.">Kaagapay Mo Karamay Funeral Homes Co.</option>
                    <option value="Bonita Memorial Homes">Bonita Memorial Homes</option>
                    <option value="St. James Memorial Chapel">St. James Memorial Chapel</option>
                    <option value="Amber Green Funeral Services">Amber Green Funeral Services</option>
                    <option value="Dayao Funeral Home Incorporated">Dayao Funeral Home Incorporated</option>
                    <option value="La Funeraria Paz, Inc.">La Funeraria Paz, Inc.</option>
                    <option value="Wyn Funeral Services">Wyn Funeral Services</option>
                    <option value="St. Ignatius Funeral Homes Inc.">St. Ignatius Funeral Homes Inc.</option>
                    <option value="Aijel Funeral Services">Aijel Funeral Services</option>
                    <option value="A & J Biglang-awa Funeral Homes">A & J Biglang-awa Funeral Homes</option>
                    <option value="Precious JP Funeral Services">Precious JP Funeral Services</option>
                    <option value="D. Imperial Funeral Services">D. Imperial Funeral Services</option>
                    <option value="Ka Andres Memorial Chapel">Ka Andres Memorial Chapel</option>
                    <option value="Memory Funeral Service">Memory Funeral Service</option>
                    <option value="Cinco Estrellas Memorial Chapels Inc.">Cinco Estrellas Memorial Chapels Inc.</option>
                    <option value="Sauyo Funeral Service">Sauyo Funeral Service</option>
                    <option value="ST. JACOB FUNERAL HOMES">ST. JACOB FUNERAL HOMES</option>
                    <option value="EVER MEMORIAL SERVICE">EVER MEMORIAL SERVICE</option>
                    <option value="LMCCI-Commonwealth, Inc">LMCCI-Commonwealth, Inc</option>
                    <option value="Elcielo Funeral">Elcielo Funeral</option>
                    <option value="Iba pa">{t("otherOption")}</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                    {t("funeralHomeHint")}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wide uppercase">{t("medicalRequirementsTitle")}</h2>
                </div>

                <div className="space-y-4">
                  <CustomCheckbox
                    checked={checklistResident}
                    onChange={setChecklistResident}
                    label={`${t("qcResidentQuestion")} *`}
                  />
                  <CustomCheckbox
                    checked={checklistPatient}
                    onChange={setChecklistPatient}
                    label={`${t("qcPatientQuestion")} *`}
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-800 dark:text-white mb-3">
                    {t("priorAidQuestion")} *
                  </p>
                  <div className="flex items-center gap-8">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white cursor-pointer select-none">
                      <input
                        type="radio"
                        name="priorAid"
                        checked={checklistPriorAid === "yes"}
                        onChange={() => setChecklistPriorAid("yes")}
                        className="h-4 w-4 accent-[#3b82f6]"
                      />
                      {t("priorAidYes")}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white cursor-pointer select-none">
                      <input
                        type="radio"
                        name="priorAid"
                        checked={checklistPriorAid === "no"}
                        onChange={() => {
                          setChecklistPriorAid("no")
                          setPriorAidOffice("")
                          setPriorAidType("")
                        }}
                        className="h-4 w-4 accent-[#3b82f6]"
                      />
                      {t("priorAidNo")}
                    </label>
                  </div>

                  {checklistPriorAid === "yes" && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t("priorAidOfficeLabel")}</label>
                        <input
                          value={priorAidOffice}
                          onChange={(e) => setPriorAidOffice(e.target.value)}
                          placeholder={t("priorAidOfficePlaceholder")}
                          className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t("priorAidTypeLabel")}</label>
                        <select
                          value={priorAidType}
                          onChange={(e) => setPriorAidType(e.target.value)}
                          className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        >
                          <option value="" disabled>{t("priorAidTypeLabel")}</option>
                          <option value="cash">{t("priorAidCash")}</option>
                          <option value="guarantee_letter">{t("priorAidGuaranteeLetter")}</option>
                          <option value="gamot">{t("priorAidMedicine")}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 tracking-wide uppercase">{t("clickAssistanceType")}</h3>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t("chooseAssistanceType")} **</label>
                  <div className="w-full h-11 rounded-lg border border-gray-300 bg-gray-50 px-3.5 flex items-center text-sm font-medium text-gray-800">
                    {t("medicinesMedicalSupplies")}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex justify-end">
            <button
              onClick={() => {
                if (returnToReview) {
                  setStep("review")
                  setReturnToReview(false)
                } else {
                  setStep("personal")
                }
              }}
              disabled={!canProceedChecklist}
              className={`flex items-center justify-center px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
                canProceedChecklist
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>{t("nextButton").toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === "personal") {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="border border-border rounded-2xl overflow-hidden shadow-soft bg-card relative">
          <div className="flex items-center px-6 pt-6 pb-4">
            {WIZARD_TABS.map((_, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i === 1
                      ? "bg-blue-600 text-white"
                      : i < 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < 1 ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < WIZARD_TABS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${i < 1 ? "bg-blue-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-b border-border bg-gray-50 p-2 overflow-x-auto">
            {WIZARD_TABS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 px-4 py-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                  i === 1
                    ? "bg-blue-600 text-white"
                    : i < 1
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-600">{t("importantReminder").toUpperCase()}</p>
                <p className="text-blue-600/90 mt-0.5">
                  {t("qcidReminderNote")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={`${t("qcIdLabel")} *`} full>
                <input value={qcId} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} />
              </Field>

              <Field label={`${t("firstNameLabel")} *`}>
                <input value={pFirstName} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("firstNameLabel")} />
              </Field>
              <Field label={t("middleNameLabel")}>
                <input value={pMiddleName} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("middleNameLabel")} />
              </Field>
              <Field label={`${t("lastNameLabel")} *`}>
                <input value={pLastName} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("lastNameLabel")} />
              </Field>

              <Field label={t("suffixLabel")}>
                <input value={pSuffix} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("suffixLabel")} />
              </Field>
              <Field label={`${t("nationalityLabel")} *`}>
                <input value={pNationality} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("nationalityLabel")} />
              </Field>
              <Field label={`${t("birthDateLabel")} *`}>
                <input type="date" value={toISODateString(pBirthDate)} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} />
              </Field>

              <Field label={`${t("ageLabel")} *`}>
                <input
                  value={pAge}
                  disabled
                  className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                  placeholder={t("ageLabel")}
                  inputMode="numeric"
                />
              </Field>
              <Field label={`${t("genderLabel")} *`}>
                <select value={pGender} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}>
                  <option value="" disabled>{t("pleaseChoose")}</option>
                  <option value="Lalaki">{t("genderMale")}</option>
                  <option value="Babae">{t("genderFemale")}</option>
                </select>
              </Field>
              <Field label={`${t("civilStatusLabel")} *`}>
                <select value={pCivilStatus} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}>
                  <option value="" disabled>{t("pleaseChoose")}</option>
                  <option value="Single">{t("civilStatusSingle")}</option>
                  <option value="Married">{t("civilStatusMarried")}</option>
                  <option value="Widowed">{t("civilStatusWidowed")}</option>
                  <option value="Separated">{t("civilStatusSeparated")}</option>
                </select>
              </Field>

              <Field label={`${t("houseNumberLabel")} *`}>
                <input value={pHouseNumber} disabled autoComplete="off" className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("houseNumberLabel")} />
              </Field>
              <Field label={`${t("streetNameLabel")} *`}>
                <input value={pStreetName} disabled autoComplete="off" className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("streetNameLabel")} />
              </Field>
              <Field label={`${t("barangayLabel")} *`}>
                <input value={pBarangay} disabled autoComplete="off" className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder={t("barangayLabel")} />
              </Field>

              <Field label={`${t("phoneNumberLabel")} *`}>
                <input value={pPhoneNumber} disabled className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`} placeholder="0900 000 0000" />
              </Field>
            </div>

          {!isFuneralAssistance && !isEducationalAssistance && (
            <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSelfPatient}
                onChange={(e) => handleToggleSelfPatient(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              {t("selfPatientCheckbox")}
            </label>
          )}
            {isFuneralAssistance && (
              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="font-heading font-semibold text-foreground">{t("deceasedInfoHeader")}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={`${t("firstNameLabel")} *`}>
                    <input
                      value={dFirstName}
                      maxLength={50}
                      onChange={(e) => setDFirstName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))}
                      className={`${inputCls} h-10`}
                      placeholder={t("firstNameLabel")}
                    />
                  </Field>
                  <Field label={t("middleNameLabel")}>
                    <input
                      value={dMiddleName}
                      maxLength={30}
                      onChange={(e) => setDMiddleName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 30))}
                      className={`${inputCls} h-10`}
                      placeholder={t("middleNameLabel")}
                    />
                  </Field>
                  <Field label={`${t("lastNameLabel")} *`}>
                    <input
                      value={dLastName}
                      maxLength={50}
                      onChange={(e) => setDLastName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))}
                      className={`${inputCls} h-10`}
                      placeholder={t("lastNameLabel")}
                    />
                  </Field>

                  <Field label={t("suffixLabel")}>
                    <input value={dSuffix} onChange={(e) => setDSuffix(e.target.value)} className={`${inputCls} h-10`} placeholder={t("suffixLabel")} />
                  </Field>
                  <Field label={`${t("genderLabel")} *`}>
                    <select value={dGender} onChange={(e) => setDGender(e.target.value)} className={`${inputCls} h-10`}>
                      <option value="" disabled>{t("pleaseChoose")}</option>
                      <option value="Lalaki">{t("genderMale")}</option>
                      <option value="Babae">{t("genderFemale")}</option>
                    </select>
                  </Field>
                  <Field label={`${t("birthDateLabel")} *`}>
                    <input type="date" value={dBirthDate} onChange={(e) => setDBirthDate(e.target.value)} className={`${inputCls} h-10`} />
                  </Field>

                  <Field label={`${t("deathDateLabel")} *`}>
                    <input type="date" value={dDeathDate} onChange={(e) => setDDeathDate(e.target.value)} className={`${inputCls} h-10`} />
                  </Field>
                  <Field label={`${t("ageLabel")} *`}>
                    <input
                      value={dAge}
                      disabled
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("ageAutoFilled")}
                    />
                  </Field>
                <Field label={`${t("cremationOrBurialLabel")} *`}>
                    <select
                      value={dCremationOrBurial}
                      onChange={(e) => {
                        setDCremationOrBurial(e.target.value)
                        if (e.target.value !== "Burial") {
                          setDBurialPlace("")
                          setDBurialPlaceOther("")
                        }
                        if (e.target.value !== "Cremation") {
                          setDCremationPlace("")
                          setDCremationPlaceOther("")
                        }
                      }}
                      className={`${inputCls} h-10`}
                    >
                      <option value="" disabled>{t("pleaseChoose")}</option>
                      <option value="Cremation">{t("cremationOption")}</option>
                      <option value="Burial">{t("burialOption")}</option>
                    </select>
                  </Field>

                  {dCremationOrBurial === "Cremation" && (
                    <Field label={`${t("cremationPlaceLabel")} *`}>
                      <select
                        value={dCremationPlace}
                        onChange={(e) => {
                          setDCremationPlace(e.target.value)
                          if (e.target.value !== "Others (Specify)") setDCremationPlaceOther("")
                        }}
                        className={`${inputCls} h-10`}
                      >
                        <option value="" disabled>{t("selectCremation")}</option>
                        <option value="Baesa Crematorium">{t("baesaCrematorium")}</option>
                        <option value="Others (Specify)">{t("othersSpecify")}</option>
                      </select>
                    </Field>
                  )}

                  {dCremationOrBurial === "Cremation" && dCremationPlace === "Others (Specify)" && (
                    <Field label={`${t("cremationPlaceOtherLabel")} *`}>
                      <input
                        value={dCremationPlaceOther}
                        onChange={(e) => setDCremationPlaceOther(e.target.value)}
                        className={`${inputCls} h-10`}
                        placeholder={t("cremationPlaceOtherPlaceholder")}
                      />
                    </Field>
                  )}

                  {dCremationOrBurial === "Burial" && (
                    <Field label={`${t("burialPlaceLabel")} *`}>
                      <select
                        value={dBurialPlace}
                        onChange={(e) => {
                          setDBurialPlace(e.target.value)
                          if (e.target.value !== "Others (Specify)") setDBurialPlaceOther("")
                        }}
                        className={`${inputCls} h-10`}
                      >
                        <option value="" disabled>{t("selectBurial")}</option>
                        <option value="Bagbag Public Cemetery">{t("bagbagCemetery")}</option>
                        <option value="Novaliches Public Cemetery">{t("novalichesCemetery")}</option>
                        <option value="Others (Specify)">{t("othersSpecify")}</option>
                      </select>
                    </Field>
                  )}

                  {dCremationOrBurial === "Burial" && dBurialPlace === "Others (Specify)" && (
                    <Field label={`${t("burialPlaceOtherLabel")} *`}>
                      <input
                        value={dBurialPlaceOther}
                        onChange={(e) => setDBurialPlaceOther(e.target.value)}
                        className={`${inputCls} h-10`}
                        placeholder={t("burialPlaceOtherPlaceholder")}
                      />
                    </Field>
                  )}

                  <Field label={`${t("placeOfDeathLabel")} *`} full>
                    <input value={dPlaceOfDeath} onChange={(e) => setDPlaceOfDeath(e.target.value)} className={`${inputCls} h-10`} placeholder={t("placeOfDeathLabel")} />
                  </Field>
                  <Field label={t("burialDateLabel")}>
                    <input type="date" value={dBurialDate} onChange={(e) => setDBurialDate(e.target.value)} className={`${inputCls} h-10`} />
                  </Field>
                  </div>

                <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dSameAddressAsApplicant}
                    onChange={(e) => setDSameAddressAsApplicant(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  {t("sameAsApplicantAddress")}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={`${t("houseNumberLabel")} *`}>
                    <input
                      value={dHouseNumber}
                      onChange={(e) => setDHouseNumber(e.target.value)}
                      disabled={dSameAddressAsApplicant}
                      autoComplete="off"
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("houseNumberLabel")}
                    />
                  </Field>
                  <Field label={`${t("streetNameLabel")} *`}>
                    <input
                      value={dStreetName}
                      onChange={(e) => setDStreetName(e.target.value)}
                      disabled={dSameAddressAsApplicant}
                      autoComplete="off"
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("streetNameLabel")}
                    />
                  </Field>
                  <Field label={`${t("barangayLabel")} *`}>
                    <input
                      value={dBarangay}
                      onChange={(e) => setDBarangay(e.target.value)}
                      disabled={dSameAddressAsApplicant}
                      autoComplete="off"
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("barangayLabel")}
                    />
                  </Field>
                </div>
              </div>
            )}

            {isEducationalAssistance && (
              <div className="border-t border-border pt-6 space-y-4">
                <Field label={`${t("relationToBeneficiaryLabel")} *`}>
                  <select
                    value={benRelation}
                    onChange={(e) => setBenRelation(e.target.value)}
                    className={`${inputCls} h-10`}
                  >
                    <option value="" disabled>{t("pleaseChoose")}</option>
                    <option value="Magulang">{t("relationParentType")}</option>
                    <option value="Tagapag-alaga (Guardian)">{t("relationGuardian")}</option>
                    <option value="Kapatid">{t("relationSiblingType")}</option>
                    <option value="Sarili">{t("relationSelf")}</option>
                    <option value="Iba pa">{t("otherOption")}</option>
                  </select>
                </Field>

                <h3 className="font-heading font-semibold text-foreground">{t("beneficiaryInfoHeader")}</h3>

                <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={benIsSelf}
                    onChange={(e) => handleToggleSelfBeneficiary(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  {t("selfBeneficiaryCheckbox")}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={`${t("beneficiaryFirstNameLabel")} *`}>
                    <input
                      value={benFirstName}
                      maxLength={50}
                      onChange={(e) => setBenFirstName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))}
                      disabled={benIsSelf}
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("beneficiaryFirstNameLabel")}
                    />
                  </Field>
                  <Field label={t("beneficiaryMiddleNameLabel")}>
                    <input
                      value={benMiddleName}
                      maxLength={30}
                      onChange={(e) => setBenMiddleName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 30))}
                      disabled={benIsSelf}
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("middleNameLabel")}
                    />
                  </Field>
                  <Field label={`${t("beneficiaryLastNameLabel")} *`}>
                    <input
                      value={benLastName}
                      maxLength={50}
                      onChange={(e) => setBenLastName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))}
                      disabled={benIsSelf}
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("beneficiaryLastNameLabel")}
                    />
                  </Field>

                  <Field label={t("beneficiarySuffixLabel")}>
                    <input
                      value={benSuffix}
                      onChange={(e) => setBenSuffix(e.target.value)}
                      disabled={benIsSelf}
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("suffixLabel")}
                    />
                  </Field>
                  <Field label={`${t("beneficiaryBirthDateLabel")} *`}>
                    <input
                      type="date"
                      value={toISODateString(benBirthDate)}
                      onChange={(e) => {
                        const val = e.target.value
                        setBenBirthDate(val)
                        if (val) {
                          const b = new Date(val)
                          if (!isNaN(b.getTime())) {
                            const today = new Date()
                            let age = today.getFullYear() - b.getFullYear()
                            const m = today.getMonth() - b.getMonth()
                            if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
                            if (age >= 0 && age < 150) setBenAge(String(age))
                          }
                        }
                      }}
                      disabled={benIsSelf}
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    />
                  </Field>
                  <Field label={`${t("beneficiaryAgeLabel")} *`}>
                    <input
                      value={benAge}
                      onChange={(e) => setBenAge(e.target.value.replace(/\D/g, ""))}
                      disabled={benIsSelf}
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("ageLabel")}
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label={`${t("beneficiaryGenderLabel")} *`}>
                    <select
                      value={benGender}
                      onChange={(e) => setBenGender(e.target.value)}
                      disabled={benIsSelf}
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    >
                      <option value="" disabled>{t("pleaseChoose")}</option>
                      <option value="Lalaki">{t("genderMale")}</option>
                      <option value="Babae">{t("genderFemale")}</option>
                    </select>
                  </Field>
                  <Field label={`${t("disabilityTypeLabel")} *`}>
                    <select
                      value={benDisabilityType}
                      onChange={(e) => setBenDisabilityType(e.target.value)}
                      className={`${inputCls} h-10`}
                    >
                      <option value="" disabled>{t("pleaseChoose")}</option>
                      <option value="Visual Impairment">{t("disabilityVisual")}</option>
                      <option value="Hearing Impairment">{t("disabilityHearing")}</option>
                      <option value="Physical/Orthopedic Disability">{t("disabilityPhysical")}</option>
                      <option value="Intellectual Disability">{t("disabilityIntellectual")}</option>
                      <option value="Autism Spectrum Disorder">{t("disabilityAutism")}</option>
                      <option value="Learning Disability">{t("disabilityLearning")}</option>
                      <option value="Iba pa">{t("otherOption")}</option>
                    </select>
                  </Field>

                  <Field label={`${t("schoolNameLabel")} *`} full>
                    <input
                      value={benSchoolName}
                      onChange={(e) => setBenSchoolName(e.target.value)}
                      className={`${inputCls} h-10`}
                      placeholder={t("schoolNameLabel")}
                    />
                  </Field>

                  <Field label={`${t("schoolAddressLabel")} *`}>
                    <input
                      value={benSchoolAddress}
                      onChange={(e) => setBenSchoolAddress(e.target.value)}
                      className={`${inputCls} h-10`}
                      placeholder={t("schoolAddressLabel")}
                    />
                  </Field>
                  <Field label={`${t("gradeLevelLabel")} *`}>
                    <input
                      value={benGradeLevel}
                      onChange={(e) => setBenGradeLevel(e.target.value)}
                      className={`${inputCls} h-10`}
                      placeholder={t("gradeLevelLabel")}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={benSameAddress}
                    onChange={(e) => setBenSameAddress(e.target.checked)}
                    tabIndex={benIsSelf ? -1 : 0}
                    className={`h-4 w-4 rounded border-border accent-primary ${benIsSelf ? "pointer-events-none" : ""}`}
                  />
                  {t("sameAsApplicantAddress")}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={`${t("beneficiaryHouseNumberLabel")} *`}>
                    <input
                      value={benHouseNumber}
                      onChange={(e) => setBenHouseNumber(e.target.value)}
                      disabled={benSameAddress}
                      autoComplete="off"
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("beneficiaryHouseNumberLabel")}
                    />
                  </Field>
                  <Field label={`${t("beneficiaryStreetNameLabel")} *`}>
                    <input
                      value={benStreetName}
                      onChange={(e) => setBenStreetName(e.target.value)}
                      disabled={benSameAddress}
                      autoComplete="off"
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("beneficiaryStreetNameLabel")}
                    />
                  </Field>
                  <Field label={`${t("beneficiaryBarangayLabel")} *`}>
                    <input
                      value={benBarangay}
                      onChange={(e) => setBenBarangay(e.target.value)}
                      disabled={benSameAddress}
                      autoComplete="off"
                      className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder={t("beneficiaryBarangayLabel")}
                    />
                  </Field>
                </div>
              </div>
            )}

             {!isFuneralAssistance && !isEducationalAssistance && (
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-heading font-semibold text-foreground">{t("informantInfoHeader")}</h3>
                            <Field label="Relasyon sa Pasyente *">
                <select
                  value={iRelation}
                  onChange={(e) => setIRelation(e.target.value)}
                  disabled={isSelfPatient}
                  className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  <option value="" disabled>Piliin</option>
                  <option value="Sarili">Sarili</option>
                  <option value="Magulang">Magulang</option>
                  <option value="Anak">Anak</option>
                  <option value="Kapatid">Kapatid</option>
                  <option value="Asawa">Asawa</option>
                  <option value="Iba pa">Iba pa</option>
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label={`${t("firstNameLabel")} *`}>
                  <input
                    value={iFirstName}
                    maxLength={50}
                    onChange={(e) => setIFirstName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))}
                    disabled={isSelfPatient}
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("firstNameLabel")}
                  />
                </Field>
                <Field label={t("middleNameLabel")}>
                  <input
                    value={iMiddleName}
                    maxLength={30}
                    onChange={(e) => setIMiddleName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 30))}
                    disabled={isSelfPatient}
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("middleNameLabel")}
                  />
                </Field>
                <Field label={`${t("lastNameLabel")} *`}>
                  <input
                    value={iLastName}
                    maxLength={50}
                    onChange={(e) => setILastName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))}
                    disabled={isSelfPatient}
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("lastNameLabel")}
                  />
                </Field>

                <Field label={t("suffixLabel")}>
                  <input
                    value={iSuffix}
                    onChange={(e) => setISuffix(e.target.value)}
                    disabled={isSelfPatient}
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("suffixLabel")}
                  />
                </Field>
                <Field label={`${t("genderLabel")} *`}>
                  <select
                    value={iGender}
                    onChange={(e) => setIGender(e.target.value)}
                    disabled={isSelfPatient}
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                  >
                    <option value="" disabled>{t("pleaseChoose")}</option>
                    <option value="Lalaki">{t("genderMale")}</option>
                    <option value="Babae">{t("genderFemale")}</option>
                  </select>
                </Field>
                <Field label={`${t("birthDateLabel")} *`}>
                  <input
                    type="date"
                    value={toISODateString(iBirthDate)}
                    onChange={(e) => {
                      const val = e.target.value
                      setIBirthDate(val)
                      if (val) {
                        const b = new Date(val)
                        if (!isNaN(b.getTime())) {
                          const today = new Date()
                          let age = today.getFullYear() - b.getFullYear()
                          const m = today.getMonth() - b.getMonth()
                          if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
                          if (age >= 0 && age < 150) setIAge(String(age))
                        }
                      }
                    }}
                    disabled={isSelfPatient}
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                  />
                </Field>

                <Field label={`${t("ageLabel")} *`}>
                  <input
                    value={iAge}
                    onChange={(e) => setIAge(e.target.value.replace(/\D/g, ""))}
                    disabled={isSelfPatient}
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("ageLabel")}
                    inputMode="numeric"
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sameAddressAsApplicant}
                  onChange={(e) => setSameAddressAsApplicant(e.target.checked)}
                  tabIndex={isSelfPatient ? -1 : 0}
                  className={`h-4 w-4 rounded border-border accent-primary ${isSelfPatient ? "pointer-events-none" : ""}`}
                />
                {t("sameAsApplicantAddress")}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label={`${t("houseNumberLabel")} *`}>
                  <input
                    value={iHouseNumber}
                    onChange={(e) => setIHouseNumber(e.target.value)}
                    disabled={sameAddressAsApplicant}
                    autoComplete="off"
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("houseNumberLabel")}
                  />
                </Field>
                <Field label={`${t("streetNameLabel")} *`}>
                  <input
                    value={iStreetName}
                    onChange={(e) => setIStreetName(e.target.value)}
                    disabled={sameAddressAsApplicant}
                    autoComplete="off"
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("streetNameLabel")}
                  />
                </Field>
                <Field label={`${t("barangayLabel")} *`}>
                  <input
                    value={iBarangay}
                    onChange={(e) => setIBarangay(e.target.value)}
                    disabled={sameAddressAsApplicant}
                    autoComplete="off"
                    className={`${inputCls} h-10 disabled:cursor-not-allowed disabled:opacity-80`}
                    placeholder={t("barangayLabel")}
                  />
                </Field>
              </div>
            </div>
                  )}
          </div>

          <div className="px-6 pb-6 flex justify-between">
            <button
              onClick={() => setStep("checklist")}
              className="px-6 h-10 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              {t("backButton").toUpperCase()}
            </button>
            <button
              onClick={() => {
                if (returnToReview) {
                  setStep("review")
                  setReturnToReview(false)
                } else {
                  setStep("documents")
                }
              }}
              disabled={!canProceedPersonal}
              className="px-6 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-opacity"
            >
              {t("nextButton").toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === "documents") {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="border border-border rounded-2xl overflow-hidden shadow-soft bg-card relative">
          <div className="flex items-center px-6 pt-6 pb-4">
            {WIZARD_TABS.map((_, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i === 2
                      ? "bg-blue-600 text-white"
                      : i < 2
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < 2 ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < WIZARD_TABS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${i < 2 ? "bg-blue-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-b border-border bg-gray-50 p-2 overflow-x-auto">
            {WIZARD_TABS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 px-4 py-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                  i === 2
                    ? "bg-blue-600 text-white"
                    : i < 2
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h2 className="font-heading font-semibold text-foreground mb-1">
                {t("fileUploadHeader")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("fileUploadDesc1")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t("fileUploadDesc2")}
              </p>
            </div>

            <div>
              <div className="space-y-4">
                {requiredDocuments.map((doc, docIndex) => {
                  const files = uploadedDocs[doc] || []
                  const inputId = `upload-doc-${docIndex}`
                  const uploaded = files.length > 0

                  return (
                    <div key={doc} className="space-y-2">
                      <div
                        className={`border rounded-lg px-4 py-4 space-y-3 transition-colors ${
                          uploaded ? "border-emerald-500/40 bg-emerald-500/5" : "border-dashed border-border"
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          {doc} *
                          {uploaded && (
                            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 shrink-0">
                              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("allowedFileTypesCameraNote") || `Allowed file types: ${ALLOWED_UPLOAD_FILE_TYPES} (o kumuha gamit ang Camera)`}
                        </p>

                        <input
                          type="file"
                          id={inputId}
                          key={`${inputId}-${files.length}`}
                          accept=".jpg,.jpeg,.png,.webp,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const selectedFiles = e.target.files ? Array.from(e.target.files) : []
                            handleFileUpload(doc, selectedFiles)
                            e.target.value = ""
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-2.5">
                          <label
                            htmlFor={inputId}
                            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
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

                        {uploaded && (
                          <div className="flex flex-wrap gap-3 pt-3">
                            {files.map((file, i) => (
                              <div
                                key={`${file.name}-${i}`}
                                className="relative w-40 border border-border rounded-lg bg-white p-3 flex flex-col items-center text-center shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(doc, i)}
                                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer"
                                  aria-label={t("removeFile", { filename: file.name })}
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
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 flex justify-between">
            <button
              onClick={() => setStep("personal")}
              className="px-6 h-10 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              {t("backButton").toUpperCase()}
            </button>
            <button
              onClick={() => {
                setStep("review")
                setReturnToReview(false)
              }}
              disabled={!canProceedDocuments}
              className="px-6 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-opacity"
            >
              {t("nextButton").toUpperCase()}
            </button>
          </div>
        </div>

        <DocumentCameraModal
          isOpen={Boolean(cameraDoc)}
          onClose={() => setCameraDoc(null)}
          docTitle={cameraDoc || undefined}
          onCapture={(file) => {
            if (cameraDoc) {
              handleFileUpload(cameraDoc, [file])
            }
          }}
        />
      </div>
    )
  }
  if (step === "review") {
    const hasPriorAidType = Boolean(priorAidType.trim())

    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        {isFuneralAssistance && (
          <div className="border-l-4 border-emerald-600 pl-4">
            <h1 className="text-xl font-heading font-semibold text-emerald-700">{t("burialAssistanceHeading")}</h1>
          </div>
        )}
        <div className="border border-border rounded-2xl overflow-hidden shadow-soft bg-card relative">
          <div className="flex items-center px-6 pt-6 pb-4">
            {WIZARD_TABS.map((_, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i === 3
                      ? "bg-blue-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {i < 3 ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < WIZARD_TABS.length - 1 && (
                  <div className="flex-1 h-px mx-2 transition-colors bg-blue-300" />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-b border-border bg-gray-50 p-2 overflow-x-auto">
            {WIZARD_TABS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 px-4 py-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                  i === 3
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h2 className="font-heading font-bold text-lg text-foreground mb-1">{t("reviewApplicationHeader").toUpperCase()}</h2>
              <p className="text-sm text-muted-foreground">
                {t("reviewApplicationDesc")}
              </p>
            </div>

            <ReviewSection
              title={t("requirementsSectionTitle")}
              onEdit={() => {
                setReturnToReview(true)
                setStep("checklist")
              }}
              editLabel={t("editButton")}
            >
              <div className="divide-y divide-border">
                {isFuneralAssistance ? (
                  <>
                    <ReviewCheckItem ok={checklistDeceasedResident === "yes"} label={t("deceasedResidentCheckLabel")} />
                    <ReviewCheckItem ok={Boolean(checklistRelation)} label={t("informantRelativeCheckLabel")} />
                  </>
                ) : isEducationalAssistance ? (
                  <>
                    <ReviewCheckItem ok={eduEligResident} label={t("eduEligResident")} />
                    <ReviewCheckItem ok={eduEligAge} label={t("eduEligAge")} />
                    <ReviewCheckItem ok={eduEligSchool} label={t("eduEligSchool")} />
                    <ReviewCheckItem ok={eduEligIndigent} label={t("eduEligIndigent")} />
                  </>
                ) : (
                  <>
                    <ReviewCheckItem ok={checklistResident} label={t("qcResidentQuestion")} />
                    <ReviewCheckItem
                      ok={checklistPatient}
                      label={t("qcPatientQuestion")}
                    />
                    <ReviewCheckItem
                      ok={true}
                      label={t("priorAidQuestion")}
                    />
                    <ReviewCheckItem ok={hasPriorAidType} label={t("priorAidTypeCheckLabel")} />
                    <ReviewCheckItem ok={true} label={t("assistanceTypeCheckLabel")} />
                  </>
                )}
              </div>
            </ReviewSection>
            <ReviewSection
              title={t("personalInfoSectionTitle")}
              onEdit={() => {
                setReturnToReview(true)
                setStep("personal")
              }}
              editLabel={t("editButton")}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 p-4">
                <ReviewField label={t("qcIdNumberLabel")} value={qcId} />
                <ReviewField
                  label={t("fullNameLabel")}
                  value={[pFirstName, pMiddleName, pLastName, pSuffix].filter(Boolean).join(" ")}
                />
                <ReviewField label={t("nationalityLabel")} value={pNationality} />
                <ReviewField label={t("birthDateLabel")} value={pBirthDate} />
                <ReviewField label={t("ageLabel")} value={pAge} />
                <ReviewField label={t("genderLabel")} value={pGender} />
                <ReviewField label={t("civilStatusLabel")} value={pCivilStatus} />
                <ReviewField
                  label={t("completeAddressLabel")}
                  value={`${[pHouseNumber, pStreetName].filter(Boolean).join(" ")}${pBarangay ? ` Brgy. ${pBarangay}` : ""} Quezon City`}
                />
                <ReviewField label={t("phoneNumberLabel")} value={pPhoneNumber} />
              </div>

              {isFuneralAssistance ? (
                <>
                  <div className="px-4 pt-2">
                    <h4 className="text-sm font-semibold text-foreground">{t("deceasedInfoHeader")}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 p-4">
                    <ReviewField label={t("firstNameLabel")} value={dFirstName} />
                    <ReviewField label={t("middleNameLabel")} value={dMiddleName} />
                    <ReviewField label={t("lastNameLabel")} value={[dLastName, dSuffix].filter(Boolean).join(" ")} />
                    <ReviewField label={t("genderLabel")} value={dGender} />
                    <ReviewField label={t("birthDateLabel")} value={dBirthDate} />
                    <ReviewField label={t("deathDateLabel")} value={dDeathDate} />
                    <ReviewField label={t("ageLabel")} value={dAge} />
                    <ReviewField label={t("houseNumberLabel")} value={dHouseNumber} />
                    <ReviewField label={t("streetNameLabel")} value={dStreetName} />
                    <ReviewField label={t("barangayLabel")} value={dBarangay} />
                    <ReviewField label={t("cremationOrBurialLabel")} value={dCremationOrBurial} />
                    {dCremationOrBurial === "Cremation" && (
                      <ReviewField
                        label={t("cremationOption")}
                        value={dCremationPlace === "Others (Specify)" ? dCremationPlaceOther : dCremationPlace}
                      />
                    )}
                    {dCremationOrBurial === "Burial" && (
                      <ReviewField
                        label={t("burialPlaceLabel")}
                        value={dBurialPlace === "Others (Specify)" ? dBurialPlaceOther : dBurialPlace}
                      />
                    )}
                    <ReviewField label={t("placeOfDeathLabel")} value={dPlaceOfDeath} />
                    <ReviewField label={t("burialDateLabel")} value={dBurialDate} />
                  </div>
                </>
              ) : isEducationalAssistance ? (
                <>
                  <div className="px-4 pt-2">
                    <h4 className="text-sm font-semibold text-foreground">{t("beneficiaryInfoHeader")}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 p-4">
                    <ReviewField label={t("relationToBeneficiaryLabel")} value={benRelation} />
                    <ReviewField
                      label={t("fullNameLabel")}
                      value={[benFirstName, benMiddleName, benLastName, benSuffix].filter(Boolean).join(" ")}
                    />
                    <ReviewField label={t("genderLabel")} value={benGender} />
                    <ReviewField label={t("birthDateLabel")} value={benBirthDate} />
                    <ReviewField label={t("ageLabel")} value={benAge} />
                    <ReviewField label={t("disabilityTypeLabel")} value={benDisabilityType} />
                    <ReviewField label={t("schoolNameLabel")} value={benSchoolName} />
                    <ReviewField label={t("schoolAddressLabel")} value={benSchoolAddress} />
                    <ReviewField label={t("gradeLevelLabel")} value={benGradeLevel} />
                    <ReviewField
                      label={t("completeAddressLabel")}
                      value={`${[benHouseNumber, benStreetName].filter(Boolean).join(" ")}${benBarangay ? ` Brgy. ${benBarangay}` : ""} Quezon City`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="px-4 pt-2">
                    <h4 className="text-sm font-semibold text-foreground">{t("informantInfoHeader")}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 p-4">
                    <ReviewField label="Relasyon sa Pasyente" value={iRelation} />
                    <ReviewField
                      label={t("fullNameLabel")}
                      value={[iFirstName, iMiddleName, iLastName, iSuffix].filter(Boolean).join(" ")}
                    />
                    <ReviewField label={t("genderLabel")} value={iGender} />
                    <ReviewField label={t("birthDateLabel")} value={iBirthDate} />
                    <ReviewField label={t("ageLabel")} value={iAge} />
                    <ReviewField
                      label={t("completeAddressLabel")}
                      value={`${[iHouseNumber, iStreetName].filter(Boolean).join(" ")}${iBarangay ? ` Brgy. ${iBarangay}` : ""} Quezon City`}
                    />
                  </div>
                </>
              )}
            </ReviewSection>

            <ReviewSection
              title={t("documentsSectionTitle")}
              onEdit={() => {
                setReturnToReview(true)
                setStep("documents")
              }}
              editLabel={t("editButton")}
            >
              <div className="p-4 space-y-6">
                {requiredDocuments.map((doc) => {
                  const files = uploadedDocs[doc] || []
                  const uploaded = files.length > 0
                  return (
                    <div key={doc}>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {doc} *
                        {uploaded && (
                          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 shrink-0">
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </p>

                      {uploaded ? (
                        <div className="mt-2 space-y-2">
                          {files.map((file, i) => (
                            <button
                              key={`${file.name}-${i}`}
                              type="button"
                              onClick={() => setPreviewDocModal({ title: doc, file })}
                              className="w-full max-w-md border border-border hover:border-blue-400 rounded-lg overflow-hidden text-left bg-white cursor-pointer transition-colors shadow-xs"
                            >
                              <div className="h-28 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                <FileThumbnail file={file} className="h-full w-full object-cover" />
                              </div>
                              <div className="px-3 py-2 text-center bg-white border-t border-border">
                                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>
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
            </ReviewSection>

            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-600/90">
                {t("submitConfirmNote")}
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 flex justify-between">
            <button
              onClick={() => setStep("documents")}
              className="inline-flex items-center gap-1.5 px-6 h-10 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              ← {t("backButton").toUpperCase()}
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-6 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors cursor-pointer"
            >
              SUBMIT APPLICATION
            </button>
          </div>
        </div>

        {/* 🔔 CONFIRMATION DIALOG / MODAL BEFORE SUBMIT */}
        {showConfirmModal && (
          <div
            onClick={() => setShowConfirmModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-border text-left cursor-default"
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
                    setStep("review")
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
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <span>YES, SUBMIT APPLICATION</span>
                </button>
              </div>
            </div>
          </div>
        )}

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

  if (step === "matching") {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-soft flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <h2 className="text-lg font-heading font-semibold text-foreground">{t("submittingApplication")}</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t("submittingApplicationDesc")}
          </p>
        </div>
      </div>
    )
  }
  if (step === "pending") {
    // NA-REJECT
    if (appStatus === "rejected") {
      return (
        <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 ring-8 ring-red-50/50 dark:ring-red-500/10">
              <X className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {language === "en"
                ? "Application Disapproved"
                : language === "bis"
                ? "Wala Na-aprobahan ang Aplikasyon"
                : "Hindi Na-approve ang Application"}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
              {language === "en"
                ? `We regret to inform you that your application for ${type} was not approved. You may contact the Quezon City Social Welfare Office for more details or submit a new application.`
                : language === "bis"
                ? `Gikasubo namo nga wala na-aprobahan ang imong aplikasyon para sa ${type}. Mahimo kang makig-alayon sa Quezon City Social Welfare Office o mag-apply pag-usab.`
                : `Paumanhin, hindi na-approve ang iyong aplikasyon para sa ${type.toLowerCase()}. Maaari kang makipag-ugnayan sa Quezon City Social Welfare Office para sa karagdagang detalye o mag-apply muli kung may mga dokumentong kailangang ayusin.`}
            </p>
            <div className="mt-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 w-full text-left space-y-2 text-xs border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en" ? "Reference Number" : language === "bis" ? "Numero sa Reperensya" : "Reference Number"}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en" ? "Service" : language === "bis" ? "Serbisyo" : "Serbisyo"}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en" ? "Applicant Name" : language === "bis" ? "Ngalan sa Aplikante" : "Pangalan ng Aplikante"}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{[pFirstName, pLastName].filter(Boolean).join(" ") || name || "Applicant"}</span>
              </div>
            </div>

            {rejectionReason && (
              <div className="w-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-3.5 text-xs text-red-800 dark:text-red-300 text-left space-y-1">
                <span className="font-bold uppercase tracking-wider block text-[10px] text-red-600 dark:text-red-400">
                  {language === "en" ? "Social Worker Evaluation Notes / Reason:" : language === "bis" ? "Rason sa Pagbalibad (Social Worker):" : "Dahilan ng Hindi Pag-apruba (Social Worker):"}
                </span>
                <p className="font-medium leading-relaxed">{rejectionReason}</p>
              </div>
            )}

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`aics_reapplying_${resolvedTypeKey}`)
                    localStorage.removeItem("aics_reapplying")
                  } catch {}
                  ;(window as any).__isFormDirty = false
                  window.location.href = "/portal/my-applications"
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
              >
                {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
              </button>
              <button
                type="button"
                onClick={handleReapply}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>
                  {language === "en" ? "RE-APPLY (APPLY AGAIN)" : language === "bis" ? "PAG-APPLY PAG-USAB (RE-APPLY)" : "MAG-APPLY MULI (RE-APPLY)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    // NA-APPROVE (o completed)
    if (appStatus === "approved" || appStatus === "completed") {
      return (
        <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50/50 dark:ring-emerald-500/10">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {language === "en"
                ? "Application Approved!"
                : language === "bis"
                ? "Na-aprobahan ang Aplikasyon!"
                : "Na-approve ang Application!"}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
              {language === "en"
                ? `Your application for ${type} has been officially approved by the Quezon City Social Services Development Department.`
                : language === "bis"
                ? `Ang imong aplikasyon para sa ${type} opisyal nga na-aprobahan sa Quezon City Social Services Development Department.`
                : `Ang inyong aplikasyon para sa ${type} ay opisyal nang na-apruba ng Quezon City Social Services Development Department.`}
            </p>
            <div className="mt-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 w-full text-left space-y-2 text-xs border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en" ? "Reference Number" : language === "bis" ? "Numero sa Reperensya" : "Reference Number"}
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en" ? "Service" : language === "bis" ? "Serbisyo" : "Serbisyo"}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en" ? "Applicant Name" : language === "bis" ? "Ngalan sa Aplikante" : "Pangalan ng Aplikante"}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{[pFirstName, pLastName].filter(Boolean).join(" ") || name || "Applicant"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en" ? "Date" : language === "bis" ? "Petsa" : "Petsa"}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </div>

            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {language === "en"
                ? "You may check your release schedule, appointment, or claim instructions in your Application History."
                : language === "bis"
                ? "Mahimo nimong subayon ang iskedyul sa pagpagawas, appointment, o instruksyon sa pag-claim sa Kasaysayan sa Aplikasyon."
                : "Maaari mo nang subaybayan ang release schedule, appointment, o claim instructions sa inyong Application History at Notifications."}
            </p>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`aics_reapplying_${resolvedTypeKey}`)
                    localStorage.removeItem("aics_reapplying")
                  } catch {}
                  ;(window as any).__isFormDirty = false
                  window.location.href = "/portal/my-applications"
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
              >
                {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
              </button>
              <button
                type="button"
                onClick={handleReapply}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>
                  {language === "en" ? "RE-APPLY (APPLY AGAIN)" : language === "bis" ? "PAG-APPLY PAG-USAB (RE-APPLY)" : "MAG-APPLY MULI (RE-APPLY)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    // NASA "PENDING" PA RIN (habang sinusuri ng Social Worker)
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 text-center shadow-lg space-y-6">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-50/60 dark:ring-amber-500/10 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Pending Review
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Application Under Review
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Your application for {type} has been submitted and is currently being evaluated by a Social Worker.
            </p>
          </div>

          {/* Reference Card */}
          <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 max-w-md mx-auto space-y-2.5 text-left bg-slate-50/90 dark:bg-slate-800/60">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700/60">
              <span className="font-semibold text-slate-500 dark:text-slate-400">{t("appRefNoLabel")}</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{reference}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t("serviceLabel")}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{type}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t("applicantLabel")}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{[pFirstName, pLastName].filter(Boolean).join(" ") || name || "Applicant"}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400">{t("dateLabel")}</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-0.5">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                Pending Review
              </span>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-200 rounded-xl p-4 text-xs text-amber-900 max-w-md mx-auto flex items-center justify-center gap-2.5 text-center">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p>
              Please wait for the social worker's evaluation. You will receive updates in your Application History and Notifications.
            </p>
          </div>

          <div className="w-full max-w-md mx-auto flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                ;(window as any).__isFormDirty = false
                window.location.href = "/portal/my-applications"
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
            >
              {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
            </button>
          </div>
        </div>
      </div>
    )
  }
}

const inputCls =
  "w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/40"

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}
function ReviewSection({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string
  onEdit: () => void
  editLabel: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`} />
          {title}
        </button>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Pencil className="h-3 w-3" />
          {editLabel.toUpperCase()}
        </button>
      </div>
      {open && children}
    </div>
  )
}

function ReviewCheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 text-sm text-foreground">
      <span
        className={`flex items-center justify-center h-4 w-4 rounded-full shrink-0 mt-0.5 ${
          ok ? "bg-emerald-500" : "bg-red-500"
        }`}
      >
        {ok ? (
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        ) : (
          <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        )}
      </span>
      <span>{label}</span>
    </div>
  )
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
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
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col cursor-default"
      >
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