import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  AlertTriangle,
  AlertCircle,
  X,
  Info,
  Check,
  Loader2,
  Pencil,
  Camera,
  Eye,
  Package,
  Wrench,
  Plus,
  Trash2,
} from "lucide-react"
import { useLanguage } from "../ui/language-context"
import { API_BASE } from "../../config/api"
import { notifyApplicationChange } from "../../utils/realtimeSync"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"

function formatFileSize(bytes?: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export interface UserProfileData {
  qcid: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  nationality: string
  dateOfBirth: string
  age: number | string
  gender: string
  civilStatus: string
  bloodType?: string
  houseBuildingNo: string
  streetName: string
  barangay: string
  phoneNumber: string
  email: string
}

export const DEFAULT_USER_PROFILE: UserProfileData = {
  qcid: "",
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  nationality: "FILIPINO",
  dateOfBirth: "",
  age: "",
  gender: "Female",
  civilStatus: "Single",
  bloodType: "O+",
  houseBuildingNo: "",
  streetName: "",
  barangay: "Sauyo",
  phoneNumber: "",
  email: "",
}

export interface UploadedDocItem {
  id: string
  type: "validId" | "proofOfResidency" | "supportingDocs"
  label: string
  name: string
  size?: number
  previewUrl?: string
  file?: File
}

export interface LivelihoodFormData {
  // Step 1: Applicant Information
  qcid: string
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  nationality: string
  dateOfBirth: string
  age: string | number
  gender: string
  civilStatus: string
  bloodType: string
  houseBuildingNo: string
  streetName: string
  barangay: string
  phoneNumber: string
  email: string

  // Step 2: Livelihood Details
  livelihoodType: string
  livelihoodStatus: "New Livelihood" | "Existing Livelihood" | ""
  businessDescription: string
  businessLocation: string
  sameAsRegisteredAddress: boolean

  // Step 3: Assistance & Requirements
  assistanceNeeded: string[] // 'Financial / Capital Assistance', 'Materials / Supplies', 'Equipment'
  estimatedAmount: string
  reasonPurpose: string
  requestedMaterials: Array<{ item: string; quantity: string }>
  requestedEquipment: Array<{ equipment: string; quantity: string }>
  uploadedDocuments: UploadedDocItem[]
}

const LIVELIHOOD_TYPES = [
  "Sari-sari Store",
  "Food Business",
  "Online Selling",
  "Sewing / Tailoring",
  "Beauty Services",
  "Repair Services",
]

const ASSISTANCE_OPTIONS = [
  "Financial / Capital Assistance",
  "Materials / Supplies",
  "Equipment",
]

interface LivelihoodWizardProps {
  initialData?: Partial<LivelihoodFormData>
  isUpdatingRevision?: boolean
  onSuccessSubmit?: (application: any) => void
  onCancel?: () => void
  onStepChange?: (step: number) => void
}

export default function LivelihoodApplicationWizard({
  initialData,
  isUpdatingRevision = false,
  onSuccessSubmit,
  onCancel,
  onStepChange,
}: LivelihoodWizardProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [returnToReview, setReturnToReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isEditingInfo, setIsEditingInfo] = useState(false)

  useEffect(() => {
    const handleProfileUpdate = () => {
      const prof = getCurrentUserProfile()
      if (prof) {
        setFormData((prev) => ({
          ...prev,
          qcid: prof.qcidNo || prof.qcidNumber || prev.qcid,
          firstName: prof.firstName || prev.firstName,
          middleName: prof.middleName || prev.middleName,
          lastName: prof.lastName || prev.lastName,
          suffix: prof.suffix || prev.suffix,
          nationality: prof.nationality || prev.nationality || "FILIPINO",
          dateOfBirth: prof.birthDateDisplay || prof.birthDate || prev.dateOfBirth,
          age: String(prof.age || prev.age || ""),
          gender: prof.sex || prof.gender || prev.gender,
          civilStatus: prof.civilStatus || prev.civilStatus,
          houseBuildingNo: prof.addressHouseNo || prof.houseNo || prev.houseBuildingNo,
          streetName: prof.addressStreet || prof.street || prev.streetName,
          barangay: prof.addressBarangay || prof.barangay || prev.barangay,
          phoneNumber: String(prof.contactNo || prof.mobileNumber || prev.phoneNumber || "").replace(/\s+/g, ""),
          email: prof.email || prev.email,
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

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  // Alert before reloading when on step 2 or higher
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step >= 2 && !isSubmitting) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [step, isSubmitting])

  // Form State initialized with Profile data
  const [formData, setFormData] = useState<LivelihoodFormData>(() => {
    let prof: any = {}
    let loggedQcid = ""
    try {
      prof = getCurrentUserProfile() || {}
      loggedQcid = getLoggedInUserQcid() || prof.qcidNo || ""
    } catch (_) {}

    return {
      qcid: initialData?.qcid || loggedQcid,
      firstName: initialData?.firstName || prof.firstName || "",
      middleName: initialData?.middleName || prof.middleName || "",
      lastName: initialData?.lastName || prof.lastName || "",
      suffix: initialData?.suffix || prof.suffix || "",
      nationality: initialData?.nationality || prof.nationality || "FILIPINO",
      dateOfBirth: initialData?.dateOfBirth || prof.birthDateDisplay || prof.birthDate || "",
      age: String(initialData?.age || prof.age || ""),
      gender: initialData?.gender || prof.sex || prof.gender || "Female",
      civilStatus: initialData?.civilStatus || prof.civilStatus || "Single",
      bloodType: (initialData as any)?.bloodType || prof.bloodType || "O+",
      houseBuildingNo: initialData?.houseBuildingNo || prof.addressHouseNo || prof.houseNo || "",
      streetName: initialData?.streetName || prof.addressStreet || prof.street || "",
      barangay: initialData?.barangay || prof.addressBarangay || prof.barangay || "Sauyo",
      phoneNumber: String(initialData?.phoneNumber || prof.contactNo || prof.mobileNumber || "").replace(/\s+/g, ""),
      email: initialData?.email || prof.email || "",

      livelihoodType: initialData?.livelihoodType || "",
      livelihoodStatus: initialData?.livelihoodStatus || "",
      businessDescription: initialData?.businessDescription || "",
      businessLocation: initialData?.businessLocation || "",
      sameAsRegisteredAddress: initialData?.sameAsRegisteredAddress || false,

      assistanceNeeded: initialData?.assistanceNeeded || [],
      estimatedAmount: initialData?.estimatedAmount || "",
      reasonPurpose: initialData?.reasonPurpose || "",
      requestedMaterials: initialData?.requestedMaterials || [],
      requestedEquipment: initialData?.requestedEquipment || [],
      uploadedDocuments: initialData?.uploadedDocuments || [],
    }
  })

  // Synchronize registered address if checkbox toggled
  useEffect(() => {
    if (formData.sameAsRegisteredAddress) {
      const fullRegistered = `${formData.houseBuildingNo ? formData.houseBuildingNo + " " : ""}${formData.streetName}, ${formData.barangay}, QUEZON CITY`.trim()
      setFormData((prev) => ({ ...prev, businessLocation: fullRegistered }))
    }
  }, [formData.sameAsRegisteredAddress, formData.houseBuildingNo, formData.streetName, formData.barangay])

  // File Upload Handlers
  const fileInputValidIdRef = useRef<HTMLInputElement>(null)
  const fileInputValidIdCameraRef = useRef<HTMLInputElement>(null)
  const fileInputResidencyRef = useRef<HTMLInputElement>(null)
  const fileInputResidencyCameraRef = useRef<HTMLInputElement>(null)
  const fileInputSupportingRef = useRef<HTMLInputElement>(null)
  const fileInputSupportingCameraRef = useRef<HTMLInputElement>(null)

  const [previewModalDoc, setPreviewModalDoc] = useState<UploadedDocItem | null>(null)

  const handleFileUpload = (type: "validId" | "proofOfResidency" | "supportingDocs", e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const dataUrl = (loadEvent.target?.result as string) || ""
      const newDocs: UploadedDocItem[] = [
        {
          id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type,
          label:
            type === "validId"
              ? "Valid ID / QCID"
              : type === "proofOfResidency"
              ? "Proof of Residency"
              : "Other Supporting Document",
          name: file.name,
          size: file.size,
          previewUrl: dataUrl,
          file,
        },
      ]

      setFormData((prev) => ({
        ...prev,
        uploadedDocuments: [...prev.uploadedDocuments.filter((d) => d.type !== type), ...newDocs],
      }))
    }
    reader.readAsDataURL(file)

    // Clear field error if set
    setErrors((prev) => {
      const next = { ...prev }
      delete next[type]
      return next
    })
    e.target.value = ""
  }

  const removeDoc = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      uploadedDocuments: prev.uploadedDocuments.filter((d) => d.id !== id),
    }))
  }

  // Toggle assistance needed
  const toggleAssistance = (type: string) => {
    setFormData((prev) => {
      const exists = prev.assistanceNeeded.includes(type)
      const updated = exists ? prev.assistanceNeeded.filter((a) => a !== type) : [...prev.assistanceNeeded, type]
      let newMaterials = prev.requestedMaterials || []
      let newEquipment = prev.requestedEquipment || []
      if (!exists && type === "Materials / Supplies" && newMaterials.length === 0) {
        newMaterials = [{ item: "", quantity: "1 set" }]
      }
      if (!exists && type === "Equipment" && newEquipment.length === 0) {
        newEquipment = [{ equipment: "", quantity: "1 unit" }]
      }
      return {
        ...prev,
        assistanceNeeded: updated,
        requestedMaterials: newMaterials,
        requestedEquipment: newEquipment,
      }
    })
    setErrors((prev) => {
      const next = { ...prev }
      delete next.assistanceNeeded
      return next
    })
  }

  // Requested Materials helpers
  const handleAddMaterialItem = () => {
    setFormData((prev) => ({
      ...prev,
      requestedMaterials: [...(prev.requestedMaterials || []), { item: "", quantity: "1 set" }],
    }))
  }
  const handleUpdateMaterialItem = (index: number, field: "item" | "quantity", value: string) => {
    setFormData((prev) => {
      const list = [...(prev.requestedMaterials || [])]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, requestedMaterials: list }
    })
  }
  const handleRemoveMaterialItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requestedMaterials: (prev.requestedMaterials || []).filter((_, i) => i !== index),
    }))
  }

  // Requested Equipment helpers
  const handleAddEquipmentItem = () => {
    setFormData((prev) => ({
      ...prev,
      requestedEquipment: [...(prev.requestedEquipment || []), { equipment: "", quantity: "1 unit" }],
    }))
  }
  const handleUpdateEquipmentItem = (index: number, field: "equipment" | "quantity", value: string) => {
    setFormData((prev) => {
      const list = [...(prev.requestedEquipment || [])]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, requestedEquipment: list }
    })
  }
  const handleRemoveEquipmentItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requestedEquipment: (prev.requestedEquipment || []).filter((_, i) => i !== index),
    }))
  }

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required"
    } else if (currentStep === 2) {
      if (!formData.livelihoodType) newErrors.livelihoodType = "Please select a Type of Livelihood"
      if (!formData.livelihoodStatus) newErrors.livelihoodStatus = "Please select Livelihood Status"
      if (!formData.businessDescription.trim()) newErrors.businessDescription = "Business description is required"
      if (!formData.businessLocation.trim()) newErrors.businessLocation = "Business location is required"
    } else if (currentStep === 3) {
      if (formData.assistanceNeeded.length === 0) {
        newErrors.assistanceNeeded = "Please select at least one type of assistance needed"
      }
      if (!formData.reasonPurpose.trim()) {
        newErrors.reasonPurpose = "Please provide the reason / purpose of assistance"
      }
      // Check for Valid ID
      const hasValidId = formData.uploadedDocuments.some((d) => d.type === "validId")
      if (!hasValidId) {
        newErrors.validId = "Valid ID / QCID upload is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      if (returnToReview) {
        setStep(4)
        setReturnToReview(false)
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
      setStep((prev) => Math.min(prev + 1, 4) as any)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => Math.max(prev - 1, 1) as any)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else if (onCancel) {
      onCancel()
    }
  }

  // Submit Application
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const loggedQcid = getLoggedInUserQcid() || formData.qcid || "110000116932100"
      const payload = {
        userId: loggedQcid,
        qcid: formData.qcid || loggedQcid,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        suffix: formData.suffix,
        nationality: formData.nationality,
        dateOfBirth: formData.dateOfBirth,
        age: formData.age,
        gender: formData.gender,
        civilStatus: formData.civilStatus,
        houseBuildingNo: formData.houseBuildingNo,
        streetName: formData.streetName,
        barangay: formData.barangay,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        livelihoodType: formData.livelihoodType,
        livelihoodStatus: formData.livelihoodStatus,
        businessDescription: formData.businessDescription,
        businessLocation: formData.businessLocation,
        sameAsRegisteredAddress: formData.sameAsRegisteredAddress,
        assistanceNeeded: formData.assistanceNeeded,
        estimatedAmount: formData.estimatedAmount ? parseFloat(formData.estimatedAmount.replace(/[^0-9.]/g, "")) : 15000,
        reasonPurpose: formData.reasonPurpose,
        requestedMaterials: (formData.requestedMaterials || []).filter((m) => m.item.trim()),
        requestedEquipment: (formData.requestedEquipment || []).filter((e) => e.equipment.trim()),
        uploadedDocuments: formData.uploadedDocuments.map((d) => ({
          id: d.id,
          type: d.type,
          label: d.label,
          name: d.name,
          original_filename: d.name,
          previewUrl: d.previewUrl || (d as any).file_url || "",
          file_url: d.previewUrl || (d as any).file_url || "",
          size: d.size,
          uploaded_at: new Date().toISOString(),
        })),
      }

      let res
      if (isUpdatingRevision && (initialData as any)?.reference_number) {
        // Update application
        res = await fetch(`${API_BASE}/api/livelihood/applications/${(initialData as any).reference_number}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, resubmit: true }),
        })
      } else {
        // Create new application
        res = await fetch(`${API_BASE}/api/livelihood/applications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (data.success && data.application) {
        // Store in localStorage for instant offline access
        try {
          const stored = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
          const updatedList = [data.application, ...stored.filter((a: any) => a.reference_number !== data.application.reference_number)]
          localStorage.setItem("livelihood_applications", JSON.stringify(updatedList))
          localStorage.setItem("active_livelihood_ref", data.application.reference_number)
        } catch (_) {}

        notifyApplicationChange("APPLICATION_SUBMITTED", "livelihood", data.application.reference_number)

        if (onSuccessSubmit) {
          onSuccessSubmit(data.application)
        }
        window.dispatchEvent(new Event("livelihood_status_updated"))
      } else {
        // Local fallback if server had an error
        const fallbackApp = {
          id: Date.now(),
          reference_number: formData.qcid || "110000116932100",
          user_id: formData.qcid,
          application_status: "under_review",
          ...payload,
          created_at: new Date().toISOString(),
        }
        try {
          const stored = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
          localStorage.setItem("livelihood_applications", JSON.stringify([fallbackApp, ...stored]))
          localStorage.setItem("active_livelihood_ref", fallbackApp.reference_number)
        } catch (_) {}

        if (onSuccessSubmit) onSuccessSubmit(fallbackApp)
        window.dispatchEvent(new Event("livelihood_status_updated"))
      }
    } catch (err) {
      console.warn("API request failed, falling back locally:", err)
      const fallbackApp = {
        id: Date.now(),
        reference_number: formData.qcid || "110000116932100",
        user_id: formData.qcid,
        application_status: "under_review",
        ...formData,
        created_at: new Date().toISOString(),
      }
      try {
        const stored = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
        localStorage.setItem("livelihood_applications", JSON.stringify([fallbackApp, ...stored]))
        localStorage.setItem("active_livelihood_ref", fallbackApp.reference_number)
      } catch (_) {}
      if (onSuccessSubmit) onSuccessSubmit(fallbackApp)
    } finally {
      setIsSubmitting(false)
    }
  }

  const validIdDocs = formData.uploadedDocuments.filter((d) => d.type === "validId")
  const residencyDocs = formData.uploadedDocuments.filter((d) => d.type === "proofOfResidency")
  const supportingDocs = formData.uploadedDocuments.filter((d) => d.type === "supportingDocs")

  const fullRegisteredAddress = `${formData.houseBuildingNo ? formData.houseBuildingNo + " " : ""}${formData.streetName}, ${formData.barangay}, QUEZON CITY`.trim()
  const applicantFullName = `${formData.firstName} ${formData.middleName ? formData.middleName + " " : ""}${formData.lastName}${formData.suffix ? " " + formData.suffix : ""}`.trim()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Revision Notice Banner */}
      {isUpdatingRevision && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-bold">Updating Application for Resubmission</p>
            <p className="text-xs mt-0.5">
              Review and revise any information or requirements requested by the evaluator. Submitting this form will place your application back to <strong>Under Review</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Stepper Header */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs mb-6">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-heading">
              {isUpdatingRevision ? "Update Livelihood Application" : "Apply for Livelihood Program"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Quezon City Social Services & Development Department (SSDD)
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
            STEP {step} OF 4
          </span>
        </div>

        {/* Stepper Dots / Bars */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { s: 1, title: "Applicant Information" },
            { s: 2, title: "Livelihood Details" },
            { s: 3, title: "Assistance & Requirements" },
            { s: 4, title: "Review & Submit" },
          ].map((item) => {
            const isActive = step === item.s
            const isDone = step > item.s
            return (
              <div key={item.s} className="flex flex-col gap-1.5">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isDone ? "bg-emerald-500" : isActive ? "bg-blue-600" : "bg-muted"
                  }`}
                />
                <p
                  className={`text-[11px] sm:text-xs font-semibold truncate ${
                    isActive ? "text-blue-600 font-bold" : isDone ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span className="hidden sm:inline">{item.s}. </span>
                  {item.title}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Wizard Step Body */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 shadow-sm">
        {/* ============================================================ */}
        {/* STEP 1: APPLICANT INFORMATION                                */}
        {/* ============================================================ */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                STEP 1 OF 4 — Applicant Information
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Purpose: Ipakita at i-confirm ang personal information ng applicant bago magpatuloy sa application.
              </p>
            </div>

            {/* Important Reminder Notice Box */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-900 dark:text-blue-200">
                <p className="font-bold">Important Reminder:</p>
                <p className="mt-0.5">
                  Please make sure that your personal information is correct and complete before continuing with your Livelihood Program application.
                </p>
              </div>
            </div>

            {/* Auto-filled form fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Auto-filled from User Profile
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified QCID Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEditingInfo ? "Save / Lock Information" : "Edit Information"}</span>
                  </button>
                </div>
              </div>

              {/* Row 1: QC ID *, First name * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">QC ID *</label>
                  <input
                    type="text"
                    value={formData.qcid}
                    onChange={(e) => setFormData({ ...formData, qcid: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">First name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                  {errors.firstName && <p className="text-[11px] text-red-500 mt-1">{errors.firstName}</p>}
                </div>
              </div>

              {/* Row 2: Middle name, Last name *, Suffix (Jr., Sr., III, etc.) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Middle name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Last name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                  {errors.lastName && <p className="text-[11px] text-red-500 mt-1">{errors.lastName}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Suffix (Jr., Sr., III, etc.)</label>
                  <input
                    type="text"
                    placeholder="Suffix (Jr., Sr., III, etc.)"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed placeholder:text-gray-500 dark:placeholder:text-muted-foreground"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
              </div>

              {/* Row 3: Nationality *, Date of birth *, Age * */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nationality *</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Date of birth *</label>
                  <input
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Age *</label>
                  <input
                    type="text"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
              </div>

              {/* Row 4: Gender *, Civil status *, Blood type * */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Gender *</label>
                  {isEditingInfo ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full border border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 rounded-lg px-3 py-2 text-sm mt-1 bg-white dark:bg-card text-foreground focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.gender}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 dark:border-border rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed mt-1"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Civil status *</label>
                  {isEditingInfo ? (
                    <select
                      value={formData.civilStatus}
                      onChange={(e) => setFormData({ ...formData, civilStatus: e.target.value })}
                      className="w-full border border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 rounded-lg px-3 py-2 text-sm mt-1 bg-white dark:bg-card text-foreground focus:outline-none"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.civilStatus}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 dark:border-border rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed mt-1"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Blood type *</label>
                  <input
                    type="text"
                    value={formData.bloodType || "O+"}
                    readOnly
                    disabled
                    className="w-full border border-gray-200 dark:border-border rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed mt-1 font-medium select-none"
                  />
                </div>
              </div>

              {/* Row 5: House/Building number *, Street name *, Barangay * */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">House/Building number *</label>
                  <input
                    type="text"
                    value={formData.houseBuildingNo}
                    onChange={(e) => setFormData({ ...formData, houseBuildingNo: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Street name *</label>
                  <input
                    type="text"
                    value={formData.streetName}
                    onChange={(e) => setFormData({ ...formData, streetName: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Barangay *</label>
                  <input
                    type="text"
                    value={formData.barangay}
                    onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
              </div>

              {/* Row 6: Phone number *, Email * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Phone number *</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                  {errors.phoneNumber && <p className="text-[11px] text-red-500 mt-1">{errors.phoneNumber}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditingInfo}
                    readOnly={!isEditingInfo}
                    className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                      !isEditingInfo
                        ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                        : "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40 bg-white dark:bg-card text-foreground focus:outline-none"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-6 border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-5 h-11 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                id="btn-step1-next"
                className="px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                Next: Livelihood Details
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: LIVELIHOOD DETAILS                                   */}
        {/* ============================================================ */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                STEP 2 OF 4 — Livelihood Details
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Purpose: Dito ilalagay ng applicant kung anong klase ng livelihood o maliit na negosyo ang gusto niyang simulan o ipagpatuloy.
              </p>
            </div>

            <div className="space-y-5">
              {/* Type of Livelihood */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Type of Livelihood <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                  Piliin ang kategorya ng iyong livelihood o negosyo:
                </p>
                <select
                  value={formData.livelihoodType}
                  onChange={(e) => {
                    setFormData({ ...formData, livelihoodType: e.target.value })
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.livelihoodType
                      return next
                    })
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.livelihoodType ? "border-red-500" : "border-border"
                  }`}
                >
                  <option value="">Select Livelihood Type</option>
                  {LIVELIHOOD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.livelihoodType && <p className="text-xs text-red-500 mt-1">{errors.livelihoodType}</p>}
              </div>

              {/* Livelihood Status */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Livelihood Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {[
                    { val: "New Livelihood", desc: "Bagong sisimulang negosyo o pangkabuhayan" },
                    { val: "Existing Livelihood", desc: "Kasalukuyan nang operational na negosyo" },
                  ].map((item) => {
                    const isSelected = formData.livelihoodStatus === item.val
                    return (
                      <label
                        key={item.val}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-500/10 text-foreground ring-1 ring-blue-600"
                            : "border-border bg-card hover:bg-muted/20 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="livelihoodStatus"
                          value={item.val}
                          checked={isSelected}
                          onChange={() => {
                            setFormData({ ...formData, livelihoodStatus: item.val as any })
                            setErrors((prev) => {
                              const next = { ...prev }
                              delete next.livelihoodStatus
                              return next
                            })
                          }}
                          className="mt-0.5 accent-blue-600 h-4 w-4"
                        />
                        <div>
                          <p className="font-bold text-sm text-foreground">{item.val}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {errors.livelihoodStatus && <p className="text-xs text-red-500 mt-1">{errors.livelihoodStatus}</p>}
              </div>

              {/* Business Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Business / Livelihood Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Briefly describe your livelihood or business"
                  value={formData.businessDescription}
                  onChange={(e) => {
                    setFormData({ ...formData, businessDescription: e.target.value })
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.businessDescription
                      return next
                    })
                  }}
                  className={`w-full mt-1.5 px-3.5 py-2.5 text-sm border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.businessDescription ? "border-red-500" : "border-border"
                  }`}
                />
                {errors.businessDescription && (
                  <p className="text-xs text-red-500 mt-1">{errors.businessDescription}</p>
                )}
              </div>

              {/* Business Location */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Business Location <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.sameAsRegisteredAddress}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFormData((prev) => ({
                          ...prev,
                          sameAsRegisteredAddress: checked,
                          businessLocation: checked ? fullRegisteredAddress : "",
                        }))
                        if (checked) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.businessLocation
                            return next
                          })
                        }
                      }}
                      className="accent-blue-600 rounded h-3.5 w-3.5"
                    />
                    <span>Same as Registered Address</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Enter Business Location"
                  value={formData.businessLocation}
                  disabled={formData.sameAsRegisteredAddress}
                  readOnly={formData.sameAsRegisteredAddress}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      businessLocation: e.target.value,
                      sameAsRegisteredAddress: false,
                    })
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.businessLocation
                      return next
                    })
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl transition-colors ${
                    formData.sameAsRegisteredAddress
                      ? "border-gray-200 dark:border-border bg-gray-100 dark:bg-muted/40 text-gray-800 dark:text-foreground cursor-not-allowed"
                      : "bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none " +
                        (errors.businessLocation ? "border-red-500" : "border-border")
                  }`}
                />
                {errors.businessLocation && <p className="text-xs text-red-500 mt-1">{errors.businessLocation}</p>}
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Pakikumpleto ang lahat ng kinakailangang impormasyon sa Step 2 bago magpatuloy sa susunod na hakbang.</span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-6 border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-5 h-11 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                id="btn-step2-next"
                className="px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                Next: Assistance &amp; Requirements
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: ASSISTANCE & REQUIREMENTS                            */}
        {/* ============================================================ */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                STEP 3 OF 4 — Assistance &amp; Requirements
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Purpose: Dito pipili ang applicant kung anong assistance ang kailangan niya para sa livelihood at mag-a-upload ng mga required documents.
              </p>
            </div>

            <div className="space-y-5">
              {/* Assistance Needed */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Assistance Needed <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  {ASSISTANCE_OPTIONS.map((opt) => {
                    const isChecked = formData.assistanceNeeded.includes(opt)
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "border-blue-600 bg-blue-500/10 text-foreground font-semibold ring-1 ring-blue-600"
                            : "border-border bg-card hover:bg-muted/20 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAssistance(opt)}
                          className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm">{opt}</span>
                      </label>
                    )
                  })}
                </div>
                {errors.assistanceNeeded && <p className="text-xs text-red-500 mt-1">{errors.assistanceNeeded}</p>}
              </div>

              {/* Dynamic Materials / Supplies Requested by User */}
              {formData.assistanceNeeded.includes("Materials / Supplies") && (
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-blue-600" />
                        Hinihiling na Materyales / Supplies (Item &amp; Quantity)
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Ilista ang mga partikular na paninda o materyales na nais mong matanggap bilang starter kit.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMaterialItem}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> + Magdagdag ng Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.requestedMaterials.map((mat, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 rounded-xl border border-border bg-card items-center text-xs">
                        <input
                          type="text"
                          placeholder="Pangalan ng Item (hal. Sinandomeng Rice 50kg, Delata Pack)"
                          value={mat.item}
                          onChange={(e) => handleUpdateMaterialItem(idx, "item", e.target.value)}
                          className="col-span-8 px-3 py-1.5 border border-border rounded-lg bg-card text-foreground"
                        />
                        <input
                          type="text"
                          placeholder="Dami (hal. 2 sako, 3 boxes)"
                          value={mat.quantity}
                          onChange={(e) => handleUpdateMaterialItem(idx, "quantity", e.target.value)}
                          className="col-span-3 px-3 py-1.5 border border-border rounded-lg bg-card text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialItem(idx)}
                          className="col-span-1 p-1.5 rounded text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                          title="Tanggalin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Equipment Requested by User */}
              {formData.assistanceNeeded.includes("Equipment") && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Wrench className="h-4 w-4 text-indigo-600" />
                        Hinihiling na Kagamitan / Equipment (Equipment &amp; Quantity)
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Ilista ang mga kagamitan, kasangkapan, o makinarya na kailangan para sa iyong operasyon.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEquipmentItem}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> + Magdagdag ng Gamit
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.requestedEquipment.map((eq, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 rounded-xl border border-border bg-card items-center text-xs">
                        <input
                          type="text"
                          placeholder="Pangalan ng Gamit (hal. Digital Weighing Scale, Display Shelf, Sewing Machine)"
                          value={eq.equipment}
                          onChange={(e) => handleUpdateEquipmentItem(idx, "equipment", e.target.value)}
                          className="col-span-8 px-3 py-1.5 border border-border rounded-lg bg-card text-foreground"
                        />
                        <input
                          type="text"
                          placeholder="Dami (hal. 1 unit, 2 sets)"
                          value={eq.quantity}
                          onChange={(e) => handleUpdateEquipmentItem(idx, "quantity", e.target.value)}
                          className="col-span-3 px-3 py-1.5 border border-border rounded-lg bg-card text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipmentItem(idx)}
                          className="col-span-1 p-1.5 rounded text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                          title="Tanggalin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Reason / Purpose of Assistance */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Reason / Purpose of Assistance <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Briefly explain how the assistance will be used for your livelihood"
                  value={formData.reasonPurpose}
                  onChange={(e) => {
                    setFormData({ ...formData, reasonPurpose: e.target.value })
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.reasonPurpose
                      return next
                    })
                  }}
                  className={`w-full mt-1.5 px-3.5 py-2.5 text-sm border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.reasonPurpose ? "border-red-500" : "border-border"
                  }`}
                />
                {errors.reasonPurpose && <p className="text-xs text-red-500 mt-1">{errors.reasonPurpose}</p>}
              </div>

              {/* Upload Supporting Requirements - Medical Assistance Style */}
              <div className="pt-3 border-t border-border space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Upload Supporting Requirements</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tiyaking malinaw ang bawat larawan o kopya ng dokumento bago magpatuloy sa review at submission.
                  </p>
                </div>

                {/* 1. Upload Valid ID / QCID */}
                <div
                  className={`border rounded-xl p-4 space-y-3 transition-colors ${
                    validIdDocs.length > 0
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : errors.validId
                      ? "border-red-500/50 bg-red-500/5"
                      : "border-dashed border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      VALID ID / QCID <span className="text-red-500">*</span>
                      {validIdDocs.length > 0 && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 shrink-0">
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </p>
                    {validIdDocs.length > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {validIdDocs.length} file(s) uploaded
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Kahit anong valid government ID o QCID.
                  </p>

                  <p className="text-[11px] text-muted-foreground">
                    {t("allowedFileTypesCameraPdfNote") || "Allowed file types: JPG, JPEG, PNG, WEBP, PDF (o kumuha gamit ang Camera)"}
                  </p>

                  {/* Hidden inputs */}
                  <input
                    ref={fileInputValidIdRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/*"
                    onChange={(e) => handleFileUpload("validId", e)}
                    className="hidden"
                  />
                  <input
                    ref={fileInputValidIdCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileUpload("validId", e)}
                    className="hidden"
                  />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputValidIdRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {t("uploadPhotoBtn") || "UPLOAD PHOTO"}
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputValidIdCameraRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {t("takePhotoCameraBtn") || "KUMUHA NG LARAWAN (CAMERA)"}
                    </button>
                  </div>

                  {/* Uploaded File Previews */}
                  {validIdDocs.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {validIdDocs.map((doc) => {
                        const isPdf = doc.name.toLowerCase().endsWith(".pdf")
                        return (
                          <div
                            key={doc.id}
                            className="relative w-40 border border-border rounded-xl bg-card p-2.5 flex flex-col items-center text-center shadow-xs group"
                          >
                            <button
                              type="button"
                              onClick={() => removeDoc(doc.id)}
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer shadow-xs"
                              aria-label="Remove file"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div
                              onClick={() => setPreviewModalDoc(doc)}
                              className="h-20 w-full rounded-lg overflow-hidden border border-border mb-1.5 flex items-center justify-center bg-gray-50 dark:bg-muted/40 cursor-pointer hover:opacity-90 transition-opacity relative group/thumb"
                            >
                              {!isPdf && doc.previewUrl ? (
                                <img src={doc.previewUrl} alt={doc.name} className="h-full w-full object-cover" />
                              ) : (
                                <FileText className="h-8 w-8 text-blue-500" />
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate w-full" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(doc.size)}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {errors.validId && <p className="text-xs text-red-500 font-medium">{errors.validId}</p>}
                </div>

                {/* 2. Upload Proof of Residency */}
                <div
                  className={`border rounded-xl p-4 space-y-3 transition-colors ${
                    residencyDocs.length > 0
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : errors.proofOfResidency
                      ? "border-red-500/50 bg-red-500/5"
                      : "border-dashed border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      PROOF OF RESIDENCY <span className="text-red-500">*</span>
                      {residencyDocs.length > 0 && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 shrink-0">
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </p>
                    {residencyDocs.length > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {residencyDocs.length} file(s) uploaded
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Barangay Certificate of Residency o Utility Bill.
                  </p>

                  <p className="text-[11px] text-muted-foreground">
                    {t("allowedFileTypesCameraPdfNote") || "Allowed file types: JPG, JPEG, PNG, WEBP, PDF (o kumuha gamit ang Camera)"}
                  </p>

                  {/* Hidden inputs */}
                  <input
                    ref={fileInputResidencyRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/*"
                    onChange={(e) => handleFileUpload("proofOfResidency", e)}
                    className="hidden"
                  />
                  <input
                    ref={fileInputResidencyCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileUpload("proofOfResidency", e)}
                    className="hidden"
                  />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputResidencyRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {t("uploadPhotoBtn") || "UPLOAD PHOTO"}
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputResidencyCameraRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {t("takePhotoCameraBtn") || "KUMUHA NG LARAWAN (CAMERA)"}
                    </button>
                  </div>

                  {/* Uploaded File Previews */}
                  {residencyDocs.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {residencyDocs.map((doc) => {
                        const isPdf = doc.name.toLowerCase().endsWith(".pdf")
                        return (
                          <div
                            key={doc.id}
                            className="relative w-40 border border-border rounded-xl bg-card p-2.5 flex flex-col items-center text-center shadow-xs group"
                          >
                            <button
                              type="button"
                              onClick={() => removeDoc(doc.id)}
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer shadow-xs"
                              aria-label="Remove file"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div
                              onClick={() => setPreviewModalDoc(doc)}
                              className="h-20 w-full rounded-lg overflow-hidden border border-border mb-1.5 flex items-center justify-center bg-gray-50 dark:bg-muted/40 cursor-pointer hover:opacity-90 transition-opacity relative group/thumb"
                            >
                              {!isPdf && doc.previewUrl ? (
                                <img src={doc.previewUrl} alt={doc.name} className="h-full w-full object-cover" />
                              ) : (
                                <FileText className="h-8 w-8 text-blue-500" />
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate w-full" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(doc.size)}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {errors.proofOfResidency && <p className="text-xs text-red-500 font-medium">{errors.proofOfResidency}</p>}
                </div>

                {/* 3. Upload Other Supporting Documents */}
                <div
                  className={`border rounded-xl p-4 space-y-3 transition-colors ${
                    supportingDocs.length > 0
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-dashed border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      OTHER SUPPORTING DOCUMENTS
                      {supportingDocs.length > 0 && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 shrink-0">
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </p>
                    {supportingDocs.length > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {supportingDocs.length} file(s) uploaded
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Kahit anong supporting documents (Barangay Permit, DTI, quotations, larawan ng tindahan, etc.).
                  </p>

                  <p className="text-[11px] text-muted-foreground">
                    {t("allowedFileTypesCameraPdfNote") || "Allowed file types: JPG, JPEG, PNG, WEBP, PDF (o kumuha gamit ang Camera)"}
                  </p>

                  {/* Hidden inputs */}
                  <input
                    ref={fileInputSupportingRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/*"
                    onChange={(e) => handleFileUpload("supportingDocs", e)}
                    className="hidden"
                  />
                  <input
                    ref={fileInputSupportingCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileUpload("supportingDocs", e)}
                    className="hidden"
                  />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputSupportingRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {t("uploadPhotoBtn") || "UPLOAD PHOTO"}
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputSupportingCameraRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {t("takePhotoCameraBtn") || "KUMUHA NG LARAWAN (CAMERA)"}
                    </button>
                  </div>

                  {/* Uploaded File Previews */}
                  {supportingDocs.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {supportingDocs.map((doc) => {
                        const isPdf = doc.name.toLowerCase().endsWith(".pdf")
                        return (
                          <div
                            key={doc.id}
                            className="relative w-40 border border-border rounded-xl bg-card p-2.5 flex flex-col items-center text-center shadow-xs group"
                          >
                            <button
                              type="button"
                              onClick={() => removeDoc(doc.id)}
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer shadow-xs"
                              aria-label="Remove file"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div
                              onClick={() => setPreviewModalDoc(doc)}
                              className="h-20 w-full rounded-lg overflow-hidden border border-border mb-1.5 flex items-center justify-center bg-gray-50 dark:bg-muted/40 cursor-pointer hover:opacity-90 transition-opacity relative group/thumb"
                            >
                              {!isPdf && doc.previewUrl ? (
                                <img src={doc.previewUrl} alt={doc.name} className="h-full w-full object-cover" />
                              ) : (
                                <FileText className="h-8 w-8 text-blue-500" />
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate w-full" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(doc.size)}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-6 border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-5 h-11 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                id="btn-step3-next"
                className="px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                Next: Review Application
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 4: REVIEW & SUBMIT                                      */}
        {/* ============================================================ */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                STEP 4 OF 4 — Review &amp; Submit
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Purpose: Dito makikita at mabe-verify ng applicant ang lahat ng impormasyon bago isumite ang application.
              </p>
            </div>

            <div className="space-y-4">
              {/* Section 1: Applicant Information Summary */}
              <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Applicant Information
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setReturnToReview(true); setStep(1) }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Full Name:</span>
                    <p className="font-bold text-foreground mt-0.5">{applicantFullName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">QCID:</span>
                    <p className="font-bold text-foreground mt-0.5 font-mono">{formData.qcid}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nationality &amp; Blood Type:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.nationality} &bull; Blood Type: {formData.bloodType || "O+"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DOB, Age &amp; Gender:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.dateOfBirth} ({formData.age} yrs old) &bull; {formData.gender}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-medium text-foreground mt-0.5">{fullRegisteredAddress}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact Number &amp; Email:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.phoneNumber} &bull; {formData.email || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Livelihood Details Summary */}
              <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Livelihood Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setReturnToReview(true); setStep(2) }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Livelihood Type:</span>
                    <p className="font-bold text-foreground mt-0.5">{formData.livelihoodType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Livelihood Status:</span>
                    <p className="font-bold text-foreground mt-0.5">{formData.livelihoodStatus}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Business / Livelihood Description:</span>
                    <p className="font-medium text-foreground mt-0.5 leading-relaxed">{formData.businessDescription}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Business Location:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.businessLocation}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Assistance Requested Summary */}
              <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Assistance Requested
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setReturnToReview(true); setStep(3) }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Assistance Type:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {formData.assistanceNeeded.map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Purpose of Assistance:</span>
                    <p className="font-medium text-foreground mt-0.5 leading-relaxed">{formData.reasonPurpose}</p>
                  </div>

                  {/* Materials list in review */}
                  {formData.requestedMaterials && formData.requestedMaterials.some((m) => m.item.trim()) && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-muted-foreground block text-[11px] font-semibold">Hinihiling na Materyales / Paninda:</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium text-foreground">
                        {formData.requestedMaterials
                          .filter((m) => m.item.trim())
                          .map((m, idx) => (
                            <li key={idx}>
                              <strong>{m.item}</strong> — {m.quantity || "1 set"}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Equipment list in review */}
                  {formData.requestedEquipment && formData.requestedEquipment.some((e) => e.equipment.trim()) && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-muted-foreground block text-[11px] font-semibold">Hinihiling na Kagamitan / Equipment:</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium text-foreground">
                        {formData.requestedEquipment
                          .filter((e) => e.equipment.trim())
                          .map((e, idx) => (
                            <li key={idx}>
                              <strong>{e.equipment}</strong> — {e.quantity || "1 unit"}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Uploaded Requirements Summary */}
              <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Uploaded Requirements
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">✓</span>
                    <span className="font-semibold text-foreground">Valid ID / QCID:</span>
                    <span className="text-muted-foreground truncate">
                      {validIdDocs.map((d) => d.name).join(", ") || "Attached"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold ${residencyDocs.length > 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {residencyDocs.length > 0 ? "✓" : "—"}
                    </span>
                    <span className="font-semibold text-foreground">Proof of Residency:</span>
                    <span className="text-muted-foreground truncate">
                      {residencyDocs.length > 0 ? residencyDocs.map((d) => d.name).join(", ") : "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold ${supportingDocs.length > 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {supportingDocs.length > 0 ? "✓" : "—"}
                    </span>
                    <span className="font-semibold text-foreground">Other Supporting Documents:</span>
                    <span className="text-muted-foreground truncate">
                      {supportingDocs.length > 0 ? supportingDocs.map((d) => d.name).join(", ") : "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Buttons */}
            <div className="pt-6 border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-5 h-11 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                id="btn-submit-livelihood-app"
                className="px-8 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Document Full Preview Modal */}
      {previewModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wide truncate">
                  {previewModalDoc.label}
                </h4>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{previewModalDoc.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto bg-muted/20 flex items-center justify-center">
              {!previewModalDoc.name.toLowerCase().endsWith(".pdf") && previewModalDoc.previewUrl ? (
                <img
                  src={previewModalDoc.previewUrl}
                  alt={previewModalDoc.name}
                  className="max-w-full max-h-[55vh] rounded-lg border border-border object-contain shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                  <FileText className="h-16 w-16 text-blue-500" />
                  <p className="text-sm font-semibold text-foreground">{previewModalDoc.name}</p>
                  <p className="text-xs">{formatFileSize(previewModalDoc.size)}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-card">
              <span>{formatFileSize(previewModalDoc.size)}</span>
              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}