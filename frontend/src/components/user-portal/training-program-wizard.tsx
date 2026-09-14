import { useState, useEffect } from "react"
import {
  Check,
  AlertCircle,
  FileText,
  Upload,
  X,
  Loader2,
  Info,
  Sparkles,
} from "lucide-react"
import { useLanguage } from "../ui/language-context"

function generateReference(qcid?: string) {
  if (qcid && qcid.trim()) return qcid.trim()
  return getLoggedInUserQcid()
}

const COURSE_OPTIONS = [
  "Bread and Pastry Production",
  "Cake Making",
  "Pastry Making",
  "Bread Making",
  "Motorcycle/Small Engine Servicing",
  "Special Training for Employment Program",
  "Service Electrical System",
]

const ALLOWED_UPLOAD_FILE_TYPES = "JPG, JPEG, PNG, WEBP"

function formatFileSize(bytes: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

interface RequiredDoc {
  id: string
  label: string
  description: string
  images?: string[]
  downloadUrl?: string
}

const REQUIRED_DOCUMENTS: RequiredDoc[] = [
  {
    id: "letterOfIntent",
    label: "Letter of Intent",
    description: "Personal letter na nagsasaad kung sino ka, ang kursong nais mong pasukan, at ang dahilan. Lagdaan at petsahan.",
    images: ["/samples/LETTER OF INTENT.png"],
    downloadUrl: "/samples/LETTER OF INTENT.png",
  },
  {
    id: "validId",
    label: "QC ID o Valid Government-issued ID",
    description: "Dapat malinaw ang larawan, pangalan, at petsa ng validity (kung meron).",
  },
  {
    id: "barangayCert",
    label: "Barangay Certificate / Proof of Residency",
    description: "Kunin sa barangay hall ng iyong tirahan.",
  },
]

interface FormData {
  desiredCourse: string
  desiredCourseOther: string
  fullName: string
  yearsResident: string
  address: string
  contactNumber: string
  email: string
}

const EMPTY_FORM: FormData = {
  desiredCourse: "",
  desiredCourseOther: "",
  fullName: "",
  yearsResident: "",
  address: "",
  contactNumber: "",
  email: "",
}

function Field({
  label,
  required,
  invalid,
  invalidNote,
  hint,
  children,
}: {
  label: string
  required?: boolean
  invalid?: boolean
  invalidNote?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={`text-xs font-semibold ${invalid ? "text-red-600" : "text-muted-foreground"}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !invalid && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {invalid && <p className="text-xs text-red-500 mt-1">{invalidNote || "Kailangan punan ang field na ito."}</p>}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  invalid = false,
  numeric = false,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  invalid?: boolean
  numeric?: boolean
  maxLength?: number
}) {
  return (
    <input
      type={numeric ? "tel" : type}
      inputMode={numeric ? "numeric" : undefined}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => {
        let raw = e.target.value
        if (numeric) raw = raw.replace(/[^0-9]/g, "")
        if (maxLength && raw.length > maxLength) raw = raw.slice(0, maxLength)
        onChange(raw)
      }}
      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
        invalid ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-border focus:ring-blue-400"
      }`}
    />
  )
}

function SelectInput({
  value,
  onChange,
  options,
  invalid = false,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  invalid?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
        invalid ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-border focus:ring-blue-400"
      }`}
    >
      <option value="">Piliin</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

interface DocumentModalProps {
  doc: RequiredDoc | null
  isOpen: boolean
  onClose: () => void
}

function DocumentSampleModal({ doc, isOpen, onClose }: DocumentModalProps) {
  const { t } = useLanguage()
  if (!isOpen || !doc) return null
  const hasImages = Boolean(doc.images && doc.images.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 pb-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-foreground">{t("sampleLabel", { name: doc.label })}</h3>
        </div>

        <div className="p-6 overflow-y-auto">
          {hasImages ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {doc.images!.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${doc.label} sample ${i + 1}`}
                  className="max-h-96 rounded-lg border border-border object-contain"
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-sm font-semibold mb-2">{t("noSampleImageAvailable")}</p>
            </div>
          )}

          {doc.description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-left">
              <p className="text-xs text-blue-700 leading-relaxed">{doc.description}</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-gray-200 flex items-center justify-between gap-4 shrink-0">
          {doc.downloadUrl ? (
            <a href={doc.downloadUrl} download className="px-6 h-10 flex items-center rounded-xl bg-gray-100 text-foreground text-sm font-medium hover:bg-gray-200 transition-colors">{t("download").toUpperCase()}</a>
          ) : (
            <span />
          )}
          <button onClick={onClose} className="px-6 h-10 rounded-xl bg-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">{t("close").toUpperCase()}</button>
        </div>
      </div>
    </div>
  )
}

function DocumentUploadRow({
  doc,
  files,
  invalid,
  onUpload,
  onRemove,
  onSampleClick,
}: {
  doc: RequiredDoc
  files: File[]
  invalid?: boolean
  onUpload: (files: File[]) => void
  onRemove: (fileIndex: number) => void
  onSampleClick: (doc: RequiredDoc) => void
}) {
  const inputId = `training-upload-${doc.id}`
  const uploaded = files.length > 0

  return (
    <div className="space-y-2">
      {doc.images && doc.images.length > 0 && (
        <button
          type="button"
          onClick={() => onSampleClick(doc)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-none border-none p-0 cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" />
          SAMPLE DOCUMENT
        </button>
      )}

    <div
      className={`border rounded-lg px-4 py-4 space-y-3 transition-colors ${
        invalid
          ? "border-red-400 border-dashed bg-red-50"
          : uploaded
          ? "border-emerald-400 bg-emerald-50"
          : "border-dashed border-border bg-white"
      }`}
    >
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        {doc.label} *
        {uploaded && (
          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 shrink-0">
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </span>
        )}
      </p>
      <p className="text-xs text-muted-foreground">{doc.description}</p>
      <p className="text-xs text-muted-foreground">Allowed file types: {ALLOWED_UPLOAD_FILE_TYPES}</p>

      <input
        type="file"
        id={inputId}
        key={`${inputId}-${files.length}`}
        accept=".jpg,.jpeg,.png,.webp,image/*"
        className="hidden"
        onChange={(e) => {
          const selectedFiles = e.target.files ? Array.from(e.target.files) : []
          if (selectedFiles.length > 0) onUpload(selectedFiles)
          e.target.value = ""
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
      >
        <Upload className="h-3.5 w-3.5" />
        UPLOAD PHOTO
      </label>

      {uploaded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative border border-border rounded-lg overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center text-white transition-colors z-10"
                aria-label={`Alisin ang ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
              <div className="h-20 bg-gray-100 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="px-2 py-1.5 text-center">
                <p className="text-[11px] font-medium text-foreground truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {invalid && <p className="text-xs text-red-500">Kailangan mag-upload ng dokumentong ito.</p>}
    </div>
    </div>
  )
}

import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"

interface TrainingProgramWizardProps {
  onBack?: () => void
}

export default function TrainingProgramWizard({ onBack }: TrainingProgramWizardProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    const prof = getCurrentUserProfile()
    const fullName = `${prof.firstName || ""} ${prof.lastName || ""}`.trim()
    const address = [prof.addressHouseNo, prof.addressStreet, prof.addressBarangay, prof.addressCityMunicipality].filter(Boolean).join(", ")
    return {
      desiredCourse: "",
      desiredCourseOther: "",
      fullName: fullName,
      yearsResident: "5",
      address: address || "Sauyo, Quezon City",
      contactNumber: String(prof.contactNo || prof.mobileNumber || "").replace(/\s+/g, ""),
      email: prof.email || "",
    }
  })

  useEffect(() => {
    const syncProfile = () => {
      const prof = getCurrentUserProfile()
      if (prof) {
        const fullName = `${prof.firstName || ""} ${prof.lastName || ""}`.trim()
        const address = [prof.addressHouseNo, prof.addressStreet, prof.addressBarangay, prof.addressCityMunicipality].filter(Boolean).join(", ")
        setFormData((prev) => ({
          ...prev,
          fullName: prev.fullName || fullName,
          address: prev.address || address,
          contactNumber: prev.contactNumber || String(prof.contactNo || prof.mobileNumber || "").replace(/\s+/g, ""),
          email: prev.email || prof.email || "",
        }))
      }
    }
    window.addEventListener("user_profile_updated", syncProfile)
    window.addEventListener("storage", syncProfile)
    return () => {
      window.removeEventListener("user_profile_updated", syncProfile)
      window.removeEventListener("storage", syncProfile)
    }
  }, [])
  const [attempted, setAttempted] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File[]>>({})
  const [stage, setStage] = useState<"form" | "submitting" | "pending">("form")
  const [reference, setReference] = useState("")
  const [isBlocked, setIsBlocked] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3)
  const [selectedSampleDoc, setSelectedSampleDoc] = useState<RequiredDoc | null>(null)
  const [showSampleModal, setShowSampleModal] = useState(false)

  // Auto-redirect to pending status screen (Pic 2) after 3 seconds on pending
  useEffect(() => {
    if (stage !== "pending") return

    setRedirectCountdown(3)
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsBlocked(true)
          setStage("form")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [stage])

  const updateField = (key: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  const handleFileUpload = (docId: string, files: File[]) => {
    if (!files || files.length === 0) return
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    const allowedExtensions = /\.(jpe?g|png|webp|jfif|bmp|heic|heif)$/i

    const validFiles = files.filter(
      (f) => allowedTypes.includes(f.type) || allowedExtensions.test(f.name)
    )
    const rejectedCount = files.length - validFiles.length

    if (rejectedCount > 0) {
      alert(`${rejectedCount} file(s) ang hindi tinanggap. Mga litrato o larawan (JPG, JPEG, PNG, WEBP) lamang ang maaaring i-upload. Bawal ang document/PDF file.`)
    }

    if (validFiles.length === 0) return
    setUploadedDocs((prev) => ({ ...prev, [docId]: [validFiles[0]] }))
  }
  const handleRemoveFile = (docId: string, fileIndex: number) => {
    setUploadedDocs((prev) => {
      const updated = [...(prev[docId] || [])]
      updated.splice(fileIndex, 1)
      return { ...prev, [docId]: updated }
    })
  }

  const formValid =
    formData.desiredCourse !== "" &&
    formData.fullName.trim() !== "" &&
    formData.yearsResident.trim() !== "" &&
    formData.address.trim() !== "" &&
    formData.contactNumber.trim().length === 11 &&
    REQUIRED_DOCUMENTS.every((doc) => (uploadedDocs[doc.id]?.length ?? 0) > 0)

  const handleSubmit = () => {
    if (!formValid) {
      setAttempted(true)
      return
    }
    setStage("submitting")
    setReference(generateReference())
    setTimeout(() => setStage("pending"), 1500)
  }

  if (stage === "submitting") {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-soft flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Submitting your application</h2>
          <p className="text-sm text-muted-foreground max-w-sm">This will only take a moment...</p>
        </div>
      </div>
    )
  }

  if (isBlocked) {
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
            You already have a pending application for the Training Program. Please wait for evaluation before submitting a new application.
          </p>
        </div>
      </div>
    )
  }

  if (stage === "pending") {
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
              Mabuhay! Ang inyong aplikasyon ay Natanggap Na
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ang inyong Training Program application ay matagumpay na naisumite at kasalukuyang sinusuri.
            </p>
          </div>

          {/* Reference Card */}
          <div className="border border-border rounded-xl p-5 max-w-md mx-auto space-y-2.5 text-left bg-gray-50/60">
            <div className="flex justify-between items-center text-xs text-foreground border-b border-border/80 pb-2">
              <span className="font-semibold text-muted-foreground">Application Reference No.:</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{reference}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-semibold text-foreground">Training Program</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Kursong Pinili:</span>
              <span className="font-semibold text-foreground">{formData.desiredCourse}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Aplikante:</span>
              <span className="font-semibold text-foreground">{formData.fullName || "Applicant"}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Petsa:</span>
              <span className="text-foreground">
                {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 max-w-md mx-auto flex items-center justify-center gap-2.5 text-center">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <p>
              Maaari ninyong tingnan ang Notifications para sa mga update sa inyong aplikasyon.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3b82f6]" />
            <span>
              Awtomatikong lilipat sa application status sa loob ng {redirectCountdown} segundo...
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {onBack && (
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
      )}

      <div>
        <h2 className="text-lg font-bold text-foreground">Apply for Training Program</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Punan ang form sa ibaba para mag-apply online. Ang mga field na may <span className="text-red-500">*</span>{" "}
          ay kinakailangan.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-5">
        <Field label="Desired Course / Skill" required invalid={attempted && formData.desiredCourse === ""}>
          <SelectInput
            value={formData.desiredCourse}
            onChange={(v) => updateField("desiredCourse", v)}
            options={COURSE_OPTIONS}
            invalid={attempted && formData.desiredCourse === ""}
          />
        </Field>

        <Field label="Buong Pangalan" required invalid={attempted && formData.fullName.trim() === ""}>
          <TextInput
            value={formData.fullName}
            onChange={(v) => updateField("fullName", v)}
            invalid={attempted && formData.fullName.trim() === ""}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Ilang taon nang residente ng QC"
            required
            invalid={attempted && formData.yearsResident.trim() === ""}
          >
            <TextInput
              value={formData.yearsResident}
              onChange={(v) => updateField("yearsResident", v)}
              invalid={attempted && formData.yearsResident.trim() === ""}
              numeric
              placeholder="e.g. 5"
            />
          </Field>
          <Field
            label="Contact Number"
            required
            invalid={attempted && formData.contactNumber.trim().length !== 11}
            hint={attempted && formData.contactNumber.trim().length > 0 && formData.contactNumber.trim().length !== 11 ? "Kailangang 11 digits (e.g. 09XXXXXXXXX)" : undefined}
          >
            <TextInput
              value={formData.contactNumber}
              onChange={(v) => updateField("contactNumber", v)}
              invalid={attempted && formData.contactNumber.trim().length !== 11}
              numeric
              maxLength={11}
              placeholder="09XXXXXXXXX"
            />
          </Field>
        </div>

        <Field label="Kumpletong Address" required invalid={attempted && formData.address.trim() === ""}>
          <TextInput
            value={formData.address}
            onChange={(v) => updateField("address", v)}
            invalid={attempted && formData.address.trim() === ""}
          />
        </Field>

        <Field label="Email Address">
          <TextInput value={formData.email} onChange={(v) => updateField("email", v)} type="email" />
        </Field>

        <div className="pt-2 border-t border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground">Mga Kinakailangang Dokumento</h3>
          {REQUIRED_DOCUMENTS.map((doc) => (
            <DocumentUploadRow
              key={doc.id}
              doc={doc}
              files={uploadedDocs[doc.id] || []}
              invalid={attempted && (uploadedDocs[doc.id]?.length ?? 0) === 0}
              onUpload={(files) => handleFileUpload(doc.id, files)}
              onRemove={(fileIndex) => handleRemoveFile(doc.id, fileIndex)}
              onSampleClick={(d) => {
                setSelectedSampleDoc(d)
                setShowSampleModal(true)
              }}
            />
          ))}
        </div>
      </div>

      <DocumentSampleModal
        doc={selectedSampleDoc}
        isOpen={showSampleModal}
        onClose={() => {
          setShowSampleModal(false)
          setSelectedSampleDoc(null)
        }}
      />

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Sa pag-click ng "SUBMIT", ipapadala ang iyong application sa SSDD. Makakatanggap ka ng notification kapag
          na-review na ito ng social worker.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!formValid}
        className={`w-full h-11 rounded-xl text-sm font-semibold transition-colors ${
          formValid
            ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        SUBMIT APPLICATION
      </button>
    </div>
  )
}