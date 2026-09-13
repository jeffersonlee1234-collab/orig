import { useState, useEffect, useRef, type ReactNode } from "react"
import {
  Check,
  CheckCircle2,
  ChevronUp,
  AlertCircle,
  FileText,
  Upload,
  Camera,
  X,
  Pencil,
  Info,
  Loader2,
  Sparkles,
  User,
} from "lucide-react"

import { useLanguage } from "../ui/language-context"
import DocumentCameraModal from "../ui/document-camera-modal"
import { API_BASE, getAuthHeaders, getAuthToken } from "../../config/api"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { notifyApplicationChange, subscribeToRealtimeChanges } from "../../utils/realtimeSync"

function generateReference(_status?: string | null, qcid?: string) {
  if (qcid && (qcid || "").trim() && qcid !== "110000116932100") return (qcid || "").trim()
  return getLoggedInUserQcid()
}

type IdStatus = "new" | "renewal" | "loss" | null

interface SoloParentCategory {
  id: number
  title: string
  description?: string
  requirements: string[]
}

const SOLO_PARENT_CATEGORIES: SoloParentCategory[] = [
  {
    id: 1,
    title: "Solo parent with child/children as a consequence of rape",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Complaint Affidavit / Police or Medical Record",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 2,
    title: "Death of the spouse",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Death Certificate of the Spouse",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 3,
    title: "Detention or criminal conviction of the spouse",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Certificate of Detention / Commitment Order",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 4,
    title: "Physical or mental incapacity of the spouse",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Medical Certificate / PWD ID of Spouse",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 5,
    title: "Legal or de facto separation of spouse",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Judicial Decree / Affidavit of Separation",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 6,
    title: "Declaration of nullity or annulment of marriage",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Court Order / Annotated Nullity of Marriage",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 7,
    title: "Abandonment by the spouse",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Police / Barangay Blotter of Abandonment",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 8,
    title: "Spouse is an OFW / migrant worker (RA 11861)",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Valid OFW Contract / POEA Record",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 9,
    title: "Unmarried father or mother who keeps and rears the child/children",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Certificate of No Marriage (CENOMAR)",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 10,
    title: "Legal guardian, adoptive or foster parent",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Proof of Guardianship / Adoption Decree",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 11,
    title: "Relative within the 4th civil degree who assumes parental care & support",
    requirements: [
      "PSA Birth Certificate of the Child/Children",
      "Proof of Relationship & Absence of Parents",
      "Barangay Certificate of Residency & Parental Care",
      "Sworn Affidavit of Solo Parent",
    ],
  },
  {
    id: 12,
    title: "Pregnant woman",
    requirements: [
      "Medical Certificate / Ultrasound (Pregnancy)",
      "Barangay Certificate of Residency",
      "Sworn Affidavit of Solo Parent",
    ],
  },
]

// ---- Step 3: Sample Documents (dynamic base sa ID status) ----
interface SampleDocument {
  id: string
  label: string
  description?: string
  images?: string[]
  downloadUrl?: string
}

const RENEWAL_DOCUMENTS: SampleDocument[] = [
  {
    id: "oldId",
    label: "OLD ID",
    description: "Ang iyong dating Solo Parent card.",
    images: ["/samples/OLD SOLO ID.jpg"],
    downloadUrl: "/samples/OLD SOLO ID.jpg",
  },
  {
    id: "idPicture",
    label: "RECENT 2X2 ID PICTURE",
    description: "Recent color photo, light background, clear face.",
    images: ["/samples/ID PICTURE (2X2).webp"],
    downloadUrl: "/samples/ID PICTURE (2X2).webp",
  },
  {
    id: "barangayCertificate",
    label: "BARANGAY CERTIFICATE (KUNG NAGBAGO ANG ADDRESS)",
    description: "Kailangan lamang kung nagbago ang tirahan mula noong huling application.",
    images: ["/samples/BARANGAY CERTIFICATE.webp"],
    downloadUrl: "/samples/BARANGAY CERTIFICATE.webp",
  },
  {
    id: "endorsement",
    label: "ENDORSEMENT FROM SOLO PARENT PRESIDENT",
    description: "Endorsement mula sa Solo Parent President ng iyong barangay.",
    images: ["/samples/ENDORSEMENT FROM SOLO PARENT.webp"],
    downloadUrl: "/samples/ENDORSEMENT FROM SOLO PARENT.webp",
  },
]

const LOSS_ID_DOCUMENTS: SampleDocument[] = [
  {
    id: "affidavitOfLoss",
    label: "AFFIDAVIT OF LOSS",
    description: "Notarized Affidavit of Loss na nagpapatunay ng pagkawala ng ID.",
    images: ["/samples/AFFIDAVIT OF LOSS.webp"],
    downloadUrl: "/samples/AFFIDAVIT OF LOSS.webp",
  },
  {
    id: "idPicture",
    label: "RECENT 2X2 ID PICTURE",
    description: "Recent color photo, light background, clear face.",
    images: ["/samples/ID PICTURE (2X2).webp"],
    downloadUrl: "/samples/ID PICTURE (2X2).webp",
  },
  {
    id: "validGovId",
    label: "VALID GOVERNMENT ID O QCID",
    description: "Kahit anong valid government-issued ID o QCitizen ID.",
    images: ["/samples/QC ID.png"],
    downloadUrl: "/samples/QC ID.png",
  },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// I-convert ang isang requirement string mula sa SOLO_PARENT_CATEGORIES
// patungong SampleDocument row (may sample image kung may existing match).
function requirementToDocument(requirement: string, index: number): SampleDocument {
  const id = `req-${index}-${slugify(requirement).slice(0, 40)}`

  if (/birth certificate/i.test(requirement)) {
    return {
      id,
      label: requirement.toUpperCase(),
      description: "PSA Birth certificate of the child/children.",
      images: ["/samples/BIRTH CERTIFICATE OF MINOR.jpg"],
      downloadUrl: "/samples/BIRTH CERTIFICATE OF MINOR.jpg",
    }
  }
  if (/barangay/i.test(requirement)) {
    return {
      id,
      label: requirement.toUpperCase(),
      description: "Original Barangay Certificate of Residency & Parental Care.",
      images: ["/samples/BARANGAY CERTIFICATE.webp"],
      downloadUrl: "/samples/BARANGAY CERTIFICATE.webp",
    }
  }
  if (/death/i.test(requirement)) {
    return {
      id,
      label: requirement.toUpperCase(),
      description: "PSA / Certified copy of Death Certificate of the spouse.",
      images: ["/samples/sample_death_certificate.png"],
      downloadUrl: "/samples/sample_death_certificate.png",
    }
  }
  return {
    id,
    label: requirement.toUpperCase(),
    description: "Clear copy or photo of the supporting document.",
    images: ["/samples/PROOF OF CIRCUMSTANCE (ANY ONE).webp"],
    downloadUrl: "/samples/PROOF OF CIRCUMSTANCE (ANY ONE).webp",
  }
}

// Ang 2x2 ID picture ay palaging kailangan para sa ID card mismo,
// kahit hindi ito nasa RA 8972/11861 requirements list.
const BASE_NEW_APPLICANT_DOCUMENT: SampleDocument = {
  id: "idPicture",
  label: "1 PC 2X2 ID PICTURE",
  description: "Recent color photo, light background, clear face.",
  images: ["/samples/ID PICTURE (2X2).webp"],
  downloadUrl: "/samples/ID PICTURE (2X2).webp",
}

function getNewApplicantDocuments(categoryId: number | null): SampleDocument[] {
  const category = SOLO_PARENT_CATEGORIES.find((c) => c.id === categoryId)
  if (!category) return [BASE_NEW_APPLICANT_DOCUMENT]
  return [BASE_NEW_APPLICANT_DOCUMENT, ...category.requirements.map(requirementToDocument)]
}

function getRequiredDocuments(idStatus: IdStatus, categoryId: number | null): SampleDocument[] {
  if (idStatus === "renewal") return RENEWAL_DOCUMENTS
  if (idStatus === "loss") return LOSS_ID_DOCUMENTS
  return getNewApplicantDocuments(categoryId)
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

interface UserProfile {
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
  bloodType?: string
  emergencyFirstName?: string
  emergencyLastName?: string
  emergencyContactNo?: string
  emergencyRelationship?: string
  emergencyAddress?: string
}

interface SoloParentApplicationWizardProps {
  onBack?: () => void
  userProfile?: UserProfile
  initialCategoryId?: number | null
  initialType?: IdStatus
  isModalOpen?: boolean
  onBlockedStatusChange?: (blocked: boolean) => void
  onStepChange?: (step: number) => void
  onSubmissionStageChange?: (stage: "form" | "matching" | "pending") => void
}

interface FamilyMember {
  id: string
  name: string
  relationship: string
  age: string
  birthday: string
  status: string
  educationalAttainment: string
  occupationMonthlyIncome: string
}

interface FormData {
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  citizenship?: string
  dobMonth: string
  dobDay: string
  dobYear: string
  age: string
  sex: string
  civilStatus: string
  contactNo: string
  addressHouseNo: string
  addressStreet: string
  addressBarangay: string
  addressCityMunicipality: string
  qcidNumber: string
  email: string
  bloodType: string
  emergencyFirstName: string
  emergencyLastName: string
  emergencyContactNo: string
  emergencyRelationship: string
  emergencyAddress: string
}

const EMPTY_FORM_DATA: FormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  citizenship: "",
  dobMonth: "",
  dobDay: "",
  dobYear: "",
  age: "",
  sex: "",
  civilStatus: "",
  contactNo: "",
  addressHouseNo: "",
  addressStreet: "",
  addressBarangay: "",
  addressCityMunicipality: "QUEZON CITY",
  qcidNumber: "",
  email: "",
  bloodType: "",
  emergencyFirstName: "",
  emergencyLastName: "",
  emergencyContactNo: "",
  emergencyRelationship: "",
  emergencyAddress: "",
}

function extractEmergencyContact(app: any, fallbackProfile?: any) {
  if (!app && !fallbackProfile) {
    return {
      emergencyFirstName: "",
      emergencyLastName: "",
      emergencyContactNo: "",
      emergencyRelationship: "",
      emergencyAddress: "",
    }
  }

  const fd =
    app?.form_data ||
    app?.formData ||
    (typeof app?.extra_data === "object" ? app?.extra_data?.formData : null) ||
    {}

  // Name extraction
  let efName = app?.emergency_first_name || app?.emergencyFirstName || fd?.emergencyFirstName || ""
  let elName = app?.emergency_last_name || app?.emergencyLastName || fd?.emergencyLastName || ""
  const rawFullName =
    app?.emergency_name ||
    app?.emergencyName ||
    app?.emergency_contact_person ||
    app?.emergencyContactPerson ||
    fd?.emergencyName ||
    fd?.emergencyContactPerson ||
    ""

  if ((!efName || !elName) && rawFullName) {
    const parts = rawFullName.trim().split(/\s+/)
    if (parts.length === 1) {
      efName = efName || parts[0]
      elName = elName || parts[0]
    } else if (parts.length > 1) {
      efName = efName || parts[0]
      elName = elName || parts.slice(1).join(" ")
    }
  }

  if (!efName && fallbackProfile?.emergencyFirstName) {
    efName = fallbackProfile.emergencyFirstName
  }
  if (!elName && fallbackProfile?.emergencyLastName) {
    elName = fallbackProfile.emergencyLastName
  }

  // Phone
  const ePhone =
    app?.emergency_contact_no ||
    app?.emergencyContactNo ||
    app?.emergency_phone ||
    app?.emergencyPhone ||
    fd?.emergencyContactNo ||
    fd?.emergencyPhone ||
    fallbackProfile?.emergencyContactNo ||
    app?.contact_no ||
    app?.contactNo ||
    fallbackProfile?.contactNo ||
    ""

  // Relationship
  const eRel =
    app?.emergency_relationship ||
    app?.emergencyRelationship ||
    app?.relationship ||
    fd?.emergencyRelationship ||
    fallbackProfile?.emergencyRelationship ||
    "Immediate Family"

  // Address
  let eAddr =
    app?.emergency_address ||
    app?.emergencyAddress ||
    fd?.emergencyAddress ||
    fallbackProfile?.emergencyAddress ||
    ""

  if (!eAddr) {
    const house = app?.address_house_no || app?.addressHouseNo || fallbackProfile?.addressHouseNo || ""
    const street = app?.address_street || app?.addressStreet || fallbackProfile?.addressStreet || ""
    const brgy = app?.address_barangay || app?.addressBarangay || fallbackProfile?.addressBarangay || ""
    const city = app?.address_city_municipality || app?.addressCityMunicipality || fallbackProfile?.addressCityMunicipality || "QUEZON CITY"
    if (house || street || brgy) {
      eAddr = [house, street, brgy, city].filter(Boolean).join(", ")
    }
  }

  return {
    emergencyFirstName: efName,
    emergencyLastName: elName,
    emergencyContactNo: ePhone,
    emergencyRelationship: eRel,
    emergencyAddress: eAddr,
  }
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  invalid = false,
  numbersOnly = false,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  invalid?: boolean
  numbersOnly?: boolean
  maxLength?: number
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value
    if (numbersOnly) {
      raw = raw.replace(/\D/g, "")
    }
    if (maxLength && raw.length > maxLength) {
      raw = raw.slice(0, maxLength)
    }
    onChange(raw)
  }
  return (
    <input
      type={numbersOnly ? "tel" : type}
      inputMode={numbersOnly ? "numeric" : undefined}
      value={value}
      placeholder={placeholder}
      onChange={handleChange}
      disabled={disabled}
      maxLength={maxLength}
      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
        disabled
          ? "border-border bg-gray-100 text-muted-foreground cursor-not-allowed"
          : invalid
          ? "border-red-400 focus:ring-red-300 bg-red-50"
          : "border-border focus:ring-blue-400"
      }`}
    />
  )
}

// ── Sample Document modal ──
interface DocumentModalProps {
  doc: SampleDocument | null
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
            <a
              href={doc.downloadUrl}
              download
              className="px-6 h-10 flex items-center rounded-xl bg-gray-100 text-foreground text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {t("download").toUpperCase()}
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-6 h-10 rounded-xl bg-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t("close").toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Multi-file upload row ──
function DocumentUploadRow({
  doc,
  docIndex,
  files,
  invalid,
  onUpload,
  onRemove,
  onSampleClick,
  onCameraClick,
}: {
  doc: SampleDocument
  docIndex: number
  files: File[]
  invalid?: boolean
  onUpload: (files: File[]) => void
  onRemove: (fileIndex: number) => void
  onSampleClick: (doc: SampleDocument) => void
  onCameraClick: (doc: SampleDocument) => void
}) {
  const { t } = useLanguage()
  const inputId = `upload-doc-${docIndex}`
  const uploaded = files.length > 0

  return (
    <div key={doc.id}>
      <button
        type="button"
        onClick={() => onSampleClick(doc)}
        className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline mb-2 cursor-pointer"
      >
        <FileText className="h-3.5 w-3.5" />
        {(t("sampleDocument") || "Sample Document").toUpperCase()}
      </button>

      <div
        className={`border rounded-xl p-5 transition-colors ${
          uploaded
            ? "border-green-300 bg-green-50"
            : invalid
            ? "border-red-400 bg-red-50"
            : "border-border bg-card"
        }`}
      >
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground uppercase tracking-wide">
          {doc.label} <span className="text-red-500">*</span>
          {uploaded && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white shrink-0">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            </span>
          )}
        </p>
        {doc.description && <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          {t("allowedFileTypesCameraNote") || "Allowed file types: JPG, JPEG, PNG, WEBP (o kumuha gamit ang Camera)"}
        </p>

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
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold tracking-wide cursor-pointer hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("uploadPhotoBtn") || "UPLOAD PHOTO"}
          </label>

          <button
            type="button"
            onClick={() => onCameraClick(doc)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
          >
            <Camera className="h-3.5 w-3.5" />
            {t("takePhotoCameraBtn") || "KUMUHA NG LARAWAN (CAMERA)"}
          </button>
        </div>

        {uploaded && (
          <div className="flex flex-wrap gap-3 pt-4">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative w-40 border border-border rounded-lg bg-white p-3 flex flex-col items-center text-center shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => onRemove(i)}
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

        {invalid && (
          <p className="text-xs text-red-500 mt-2">{t("spDocRequiredNote") || "Kailangan pang mag-upload ng dokumento para sa kinakailangang item na ito."}</p>
        )}
      </div>
    </div>
  )
}

// ── Review & Submit helpers ──
function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{value || "—"}</p>
    </div>
  )
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: ReactNode
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer"
        >
          <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`} />
          {title}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
          <span>{t("editButton")?.toUpperCase() || "I-EDIT"}</span>
        </button>
      </div>
      {open && children}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT: SoloParentApplicationWizard
// ============================================================================
export default function SoloParentApplicationWizard({
  onBack,
  userProfile: propUserProfile,
  initialCategoryId = null,
  initialType = "new",
  isModalOpen = false,
  onBlockedStatusChange,
  onStepChange,
  onSubmissionStageChange,
}: SoloParentApplicationWizardProps) {
  const { t, language } = useLanguage()
  const [profile, setProfile] = useState(() => (propUserProfile || getCurrentUserProfile()) as any)

  useEffect(() => {
    const handleProfileUpdate = () => {
      const p = getCurrentUserProfile() as any
      setProfile(p)
      if (p) {
        setFormData((prev) => ({
          ...prev,
          firstName: p.firstName || prev.firstName,
          middleName: p.middleName || prev.middleName,
          lastName: p.lastName || prev.lastName,
          suffix: p.suffix || prev.suffix,
          citizenship: p.nationality || prev.citizenship || "FILIPINO",
          dobMonth: p.dobMonth || prev.dobMonth,
          dobDay: p.dobDay || prev.dobDay,
          dobYear: p.dobYear || prev.dobYear,
          age: p.age ? String(p.age) : prev.age,
          sex: p.sex || p.gender || prev.sex,
          civilStatus: p.civilStatus || prev.civilStatus,
          contactNo: String(p.contactNo || p.mobileNumber || prev.contactNo || "").replace(/\s+/g, ""),
          addressHouseNo: p.addressHouseNo || p.houseNo || prev.addressHouseNo,
          addressStreet: p.addressStreet || p.street || prev.addressStreet,
          addressBarangay: p.addressBarangay || p.barangay || prev.addressBarangay,
          addressCityMunicipality: p.addressCityMunicipality || p.city || prev.addressCityMunicipality,
          qcidNumber: p.qcidNo || p.qcidNumber || prev.qcidNumber,
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
  const [idStatus, setIdStatus] = useState<IdStatus>(initialType)
  const lastInitialTypeRef = useRef<string | null>(null)

  useEffect(() => {
    if (initialType && lastInitialTypeRef.current !== initialType) {
      lastInitialTypeRef.current = initialType
      setIdStatus(initialType)
      setIsIdVerified(false)
      setExistingIdNumber("")
      setVerifyError("")
      const prof = getCurrentUserProfile()
      const isNew = initialType === "new"
      setFormData((prev) => ({
        ...EMPTY_FORM_DATA,
        firstName: prev.firstName || prof.firstName || userProfile?.firstName || "",
        middleName: prev.middleName || prof.middleName || userProfile?.middleName || "",
        lastName: prev.lastName || prof.lastName || userProfile?.lastName || "",
        suffix: prev.suffix || prof.suffix || userProfile?.suffix || "",
        citizenship: prev.citizenship || prof.nationality || userProfile?.nationality || "FILIPINO",
        dobMonth: prev.dobMonth || prof.dobMonth || userProfile?.dobMonth || "",
        dobDay: prev.dobDay || prof.dobDay || userProfile?.dobDay || "",
        dobYear: prev.dobYear || prof.dobYear || userProfile?.dobYear || "",
        age: prev.age || (prof.age ? String(prof.age) : userProfile?.age ? String(userProfile.age) : ""),
        sex: prev.sex || prof.sex || userProfile?.sex || "",
        civilStatus: prev.civilStatus || prof.civilStatus || userProfile?.civilStatus || "",
        contactNo: prev.contactNo || prof.contactNo || userProfile?.contactNo || "",
        addressHouseNo: prev.addressHouseNo || prof.addressHouseNo || userProfile?.addressHouseNo || "",
        addressStreet: prev.addressStreet || prof.addressStreet || userProfile?.addressStreet || "",
        addressBarangay: prev.addressBarangay || prof.addressBarangay || userProfile?.addressBarangay || "",
        addressCityMunicipality: prev.addressCityMunicipality || prof.addressCityMunicipality || userProfile?.addressCityMunicipality || "Quezon City",
        qcidNumber: prev.qcidNumber || prof.qcidNo || (prof as any).qcidNumber || userProfile?.qcidNo || (userProfile as any)?.qcidNumber || "",
        email: prev.email || prof.email || userProfile?.email || "",
        bloodType: prev.bloodType || (prof as any).bloodType || userProfile?.bloodType || "O+",
        // Emergency contact: BLANK on new application unless already entered; only auto-filled on renewal/loss
        emergencyFirstName: prev.emergencyFirstName || (isNew ? "" : (prof.emergencyFirstName || userProfile?.emergencyFirstName || "")),
        emergencyLastName: prev.emergencyLastName || (isNew ? "" : (prof.emergencyLastName || userProfile?.emergencyLastName || "")),
        emergencyContactNo: prev.emergencyContactNo || (isNew ? "" : (prof.emergencyContactNo || userProfile?.emergencyContactNo || "")),
        emergencyRelationship: prev.emergencyRelationship || (isNew ? "" : (prof.emergencyRelationship || userProfile?.emergencyRelationship || "")),
        emergencyAddress: prev.emergencyAddress || (isNew ? "" : ((prof as any).emergencyAddress || userProfile?.emergencyAddress || "")),
      }))
    }
  }, [initialType])

  const STEPS = [
    { id: 1, label: language === "en" ? "COMPLETE CHECKLIST" : language === "bis" ? "KOMPLETOHA ANG CHECKLIST" : "KUMPLETOHING CHECKLIST" },
    { id: 2, label: language === "en" ? "PERSONAL INFORMATION" : language === "bis" ? "PERSONAL NGA IMPORMASYON" : "IMPORMASYONG PERSONAL" },
    { id: 3, label: language === "en" ? "SAMPLE DOCUMENTS" : language === "bis" ? "MGA SAMPOL NGA DOKUMENTO" : "MGA SAMPOL NA DOKUMENTO" },
    { id: 4, label: language === "en" ? "REVIEW & SUBMIT" : language === "bis" ? "REBYU UG ISUMITE" : "REBYUHIN AT ISUMITE" },
  ]

  const [step, setStep] = useState(1)
  const [returnToReview, setReturnToReview] = useState(false)

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  const [attemptedNext, setAttemptedNext] = useState(false)
  const [selectedSampleDoc, setSelectedSampleDoc] = useState<SampleDocument | null>(null)
  const [showSampleModal, setShowSampleModal] = useState(false)
  const [cameraDoc, setCameraDoc] = useState<SampleDocument | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; file: File } | null>(null)

  // ---- Step 1: Complete Checklist / Verification ----
  const [isResident, setIsResident] = useState(false)
  const [hasSoleParentalCare, setHasSoleParentalCare] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(initialCategoryId ?? null)
  const [existingIdNumber, setExistingIdNumber] = useState("")
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [renewalReason, setRenewalReason] = useState("")
  const [replacementReason, setReplacementReason] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isIdVerified, setIsIdVerified] = useState(false)
  const [verifyError, setVerifyError] = useState("")
  const [verifiedRecord, setVerifiedRecord] = useState<{
    name: string
    idNumber: string
    barangay: string
    status: string
  } | null>(null)
  const selectedCategory = SOLO_PARENT_CATEGORIES.find((c) => c.id === selectedCategoryId) || null

  const [samplePlaceholder] = useState(() => {
    const rand = Math.floor(100000 + Math.random() * 900000)
    return `137404-2026-${rand}`
  })

  const formatSoloParentIdInput = (val: string): string => {
    const digits = val.replace(/\D/g, "").slice(0, 16)
    if (digits.length <= 6) return digits
    if (digits.length <= 10) return `${digits.slice(0, 6)}-${digits.slice(6)}`
    return `${digits.slice(0, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`
  }

  const fetchAllSoloParentApps = async () => {
    const allApps: any[] = []
    const seenIds = new Set<string>()
    let backendFetched = false

    const prof = getCurrentUserProfile()
    const uid = userId || prof.id || ""
    const qcid = (formData?.qcidNumber || prof.qcidNo || prof.qcidNumber || userProfile?.qcidNo || "").trim()
    const email = (formData?.email || prof.email || userProfile?.email || "").trim()
    const fn = (formData?.firstName || prof.firstName || userProfile?.firstName || "").trim()
    const ln = (formData?.lastName || prof.lastName || userProfile?.lastName || "").trim()

    // 1. Fetch user-specific applications from backend
    try {
      const res = await fetch(
        `${API_BASE}/api/solo-parent/user/${uid || "0"}?qcid=${encodeURIComponent(qcid)}&email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(fn)}&lastName=${encodeURIComponent(ln)}&_t=${Date.now()}`,
        { headers: getAuthHeaders(), cache: "no-store" }
      )
      if (res.ok) {
        const data = await res.json()
        const backendApps = data.applications || data || []
        if (Array.isArray(backendApps)) {
          backendFetched = true
          backendApps.forEach((a: any) => {
            const key = a.id || a.reference_number || a.referenceNumber
            if (key && !seenIds.has(String(key))) {
              seenIds.add(String(key))
              allApps.push(a)
            }
          })
        }
      }
    } catch {}

    // 2. Fetch by active reference if available
    const activeRef = reference || blockedReference || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : "")
    if (activeRef) {
      try {
        const resRef = await fetch(`${API_BASE}/api/solo-parent/reference/${encodeURIComponent(activeRef)}?_t=${Date.now()}`, { headers: getAuthHeaders(), cache: "no-store" })
        if (resRef.ok) {
          const dataRef = await resRef.json()
          const a = dataRef.application || dataRef
          if (a && (a.id || a.reference_number)) {
            const key = a.id || a.reference_number || a.referenceNumber
            if (!seenIds.has(String(key))) {
              seenIds.add(String(key))
              allApps.unshift(a)
              backendFetched = true
            }
          }
        }
      } catch {}
    }

    // 3. Fetch admin all applications as fallback if user has permissions
    if (allApps.length === 0) {
      try {
        const resAdmin = await fetch(`${API_BASE}/api/solo-parent/admin/all?limit=200&_t=${Date.now()}`, { headers: getAuthHeaders(), cache: "no-store" })
        if (resAdmin.ok) {
          const dataAdmin = await resAdmin.json()
          const backendApps = dataAdmin.applications || []
          if (Array.isArray(backendApps)) {
            backendFetched = true
            backendApps.forEach((a: any) => {
              const key = a.id || a.reference_number || a.referenceNumber
              if (key && !seenIds.has(String(key))) {
                seenIds.add(String(key))
                allApps.push(a)
              }
            })
          }
        }
      } catch {}
    }

    if (backendFetched) {
      try {
        localStorage.setItem("solo_parent_applications", JSON.stringify(allApps))
      } catch {}
      return allApps
    }

    // 4. Fallback to localStorage only when backend is completely offline
    try {
      const raw = localStorage.getItem("solo_parent_applications")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}

    return allApps
  }

  const handleVerifyId = async () => {
    setVerifyError("")
    const typed = (existingIdNumber || "").trim()
    const cleanDigits = typed.replace(/\D/g, "")

    if (cleanDigits.length < 6) {
      setVerifyError(
        language === "en"
          ? "Please enter a valid Solo Parent ID Number (e.g. 137404-2026-XXXXXX)."
          : language === "bis"
          ? "Palihug ibutang ang balido nga Solo Parent ID Number (e.g. 137404-2026-XXXXXX)."
          : "Kailangang ilagay ang tamang Solo Parent ID Number (e.g. 137404-2026-XXXXXX)."
      )
      setIsIdVerified(false)
      return
    }

    setIsVerifying(true)
    try {
      const apps = await fetchAllSoloParentApps()
      const prof = getCurrentUserProfile()
      const userQcidDigits = (prof.qcidNo || prof.qcidNumber || userProfile?.qcidNo || "").replace(/\D/g, "")
      const userEmail = (prof.email || userProfile?.email || "").trim().toLowerCase()
      const userFirstName = (prof.firstName || userProfile?.firstName || "").trim().toLowerCase()
      const userLastName = (prof.lastName || userProfile?.lastName || "").trim().toLowerCase()

      // Find approved Solo Parent applications
      const approvedApps = apps.filter((a) => {
        if (!a) return false
        const cat = String(a.classification_title || a.category || a.service || a.application_type || "").toLowerCase()
        const isSolo =
          cat.includes("solo") ||
          cat.includes("parent") ||
          Boolean(a.solo_parent_id_number) ||
          Boolean(a.soloParentIdNumber) ||
          Boolean(a.children) ||
          Boolean(a.family_members) ||
          Boolean(a.familyMembers)

        const status = String(a.application_status || a.status || "").toLowerCase()
        const isApproved =
          status === "approved" ||
          status === "completed" ||
          status === "for_release" ||
          status === "active"

        return isApproved && isSolo
      })

      // Strict match: Must match an approved record belonging to this user or matching the ID
      const matchedApp = approvedApps.find((a) => {
        const aAssignedDigits = String(a.assigned_id_number || a.assignedIdNumber || "").replace(/\D/g, "")
        const aSoloIdDigits = String(a.solo_parent_id_number || a.soloParentIdNumber || "").replace(/\D/g, "")
        const aRefDigits = String(a.reference_number || a.referenceNumber || "").replace(/\D/g, "")
        const aQcidDigits = String(a.qcid_number || a.qcidNumber || a.qcid || "").replace(/\D/g, "")

        const aEmail = String(a.email || "").trim().toLowerCase()
        const aFirstName = String(a.first_name || a.firstName || "").trim().toLowerCase()
        const aLastName = String(a.last_name || a.lastName || "").trim().toLowerCase()

        const isUserMatch =
          (userQcidDigits && aQcidDigits && userQcidDigits === aQcidDigits) ||
          (userEmail && aEmail && userEmail === aEmail) ||
          (userLastName && aLastName && userLastName === aLastName && userFirstName === aFirstName)

        // Strict matching against digits
        const matchExactDigits =
          (aAssignedDigits && (aAssignedDigits === cleanDigits || (cleanDigits.length >= 10 && aAssignedDigits.includes(cleanDigits)) || (aAssignedDigits.length >= 10 && cleanDigits.includes(aAssignedDigits)))) ||
          (aSoloIdDigits && (aSoloIdDigits === cleanDigits || (cleanDigits.length >= 10 && aSoloIdDigits.includes(cleanDigits)) || (aSoloIdDigits.length >= 10 && cleanDigits.includes(aSoloIdDigits)))) ||
          (aRefDigits && (aRefDigits === cleanDigits || (cleanDigits.length >= 10 && aRefDigits.includes(cleanDigits)) || (aRefDigits.length >= 10 && cleanDigits.includes(aRefDigits))))

        // If user matched, allow exact digits matching
        if (isUserMatch && matchExactDigits) {
          return true
        }

        // Or if exact ID digits match in system
        if (cleanDigits.length >= 10 && matchExactDigits) {
          return true
        }

        return false
      })

      if (matchedApp) {
        setIsIdVerified(true)
        setVerifyError("")
        const applicantName = `${matchedApp.first_name || matchedApp.firstName || userProfile?.firstName || ""}`.trim()
        const rawOfficialId =
          matchedApp.assigned_id_number ||
          matchedApp.assignedIdNumber ||
          matchedApp.solo_parent_id_number ||
          matchedApp.soloParentIdNumber ||
          typed

        const officialId = formatSoloParentIdInput(rawOfficialId)
        setExistingIdNumber(officialId)
        setVerifiedRecord({
          name: applicantName,
          idNumber: officialId,
          barangay: matchedApp.address_barangay || matchedApp.addressBarangay || userProfile?.addressBarangay || "SAUYO",
          status: idStatus === "renewal" ? "Active / Expired" : "Replacement / Lost ID",
        })

        const emergencyData = extractEmergencyContact(matchedApp, userProfile)

        setFormData((prev) => ({
          ...prev,
          firstName: matchedApp.first_name || matchedApp.firstName || userProfile?.firstName || prev.firstName,
          middleName: matchedApp.middle_name || matchedApp.middleName || userProfile?.middleName || prev.middleName,
          lastName: matchedApp.last_name || matchedApp.lastName || userProfile?.lastName || prev.lastName,
          suffix: matchedApp.suffix || userProfile?.suffix || prev.suffix,
          citizenship: matchedApp.citizenship || matchedApp.nationality || userProfile?.nationality || prev.citizenship || "FILIPINO",
          dobMonth: matchedApp.dob_month || matchedApp.dobMonth || userProfile?.dobMonth || prev.dobMonth,
          dobDay: matchedApp.dob_day || matchedApp.dobDay || userProfile?.dobDay || prev.dobDay,
          dobYear: matchedApp.dob_year || matchedApp.dobYear || userProfile?.dobYear || prev.dobYear,
          age: String(matchedApp.age || userProfile?.age || prev.age),
          sex: matchedApp.sex || matchedApp.gender || userProfile?.sex || prev.sex,
          civilStatus: matchedApp.civil_status || matchedApp.civilStatus || userProfile?.civilStatus || prev.civilStatus,
          contactNo: matchedApp.contact_no || matchedApp.contactNo || matchedApp.phone_number || matchedApp.phoneNumber || userProfile?.contactNo || prev.contactNo,
          addressHouseNo: matchedApp.address_house_no || matchedApp.addressHouseNo || userProfile?.addressHouseNo || prev.addressHouseNo,
          addressStreet: matchedApp.address_street || matchedApp.addressStreet || userProfile?.addressStreet || prev.addressStreet,
          addressBarangay: matchedApp.address_barangay || matchedApp.addressBarangay || userProfile?.addressBarangay || prev.addressBarangay,
          addressCityMunicipality: matchedApp.address_city_municipality || matchedApp.addressCityMunicipality || userProfile?.addressCityMunicipality || prev.addressCityMunicipality || "QUEZON CITY",
          qcidNumber: matchedApp.qcid_number || matchedApp.qcidNumber || userProfile?.qcidNo || (userProfile as any)?.qcidNumber || prev.qcidNumber,
          email: matchedApp.email || userProfile?.email || prev.email,
          bloodType: matchedApp.blood_type || matchedApp.bloodType || userProfile?.bloodType || prev.bloodType || "O+",
          ...emergencyData,
        }))
      } else {
        setIsIdVerified(false)
        setVerifyError(
          language === "en"
            ? "No approved Solo Parent ID record found matching this ID number. Please enter your valid approved Solo Parent ID."
            : language === "bis"
            ? "Walay nakit-an nga naaprobahan nga rekord sa Solo Parent ID. Palihug ibutang ang imong balido nga approved ID number."
            : "Walang nahanap na aprubadong rekord ng Solo Parent ID para sa numerong ito. Tiyaking tama ang inyong aprubadong Solo Parent ID number."
        )
      }
    } catch (err) {
      console.error("Verification error:", err)
      setIsIdVerified(false)
      setVerifyError(
        language === "en"
          ? "Unable to verify ID at this time. Please try again."
          : language === "bis"
          ? "Dili masusi ang ID karong panahona. Palihug sulayi pag-usab."
          : "Hindi masuri ang ID sa ngayon. Pakisubukang muli."
      )
    } finally {
      setIsVerifying(false)
    }
  }
  
  // ---- Eligibility check (bago pumasok sa wizard) ----
  const currentProf = getCurrentUserProfile()
  const userId = userProfile?.userId || (userProfile as any)?.id || currentProf?.id || ""
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState<"draft" | "pending" | "approved" | null>(null)
  const [blockedReference, setBlockedReference] = useState("")
  const [blockedApp, setBlockedApp] = useState<any>(null)
  const [isReapplying, setIsReapplying] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const hasUrlReapply = window.location.search.includes("reapply=true")
        if (hasUrlReapply) return true
        localStorage.removeItem("solo_parent_reapplying")
        localStorage.removeItem("solo_parent_reapplying_new")
        localStorage.removeItem("solo_parent_reapplying_renewal")
        localStorage.removeItem("solo_parent_reapplying_loss")
      }
      return false
    } catch {
      return false
    }
  })

  const handleStartReapply = (targetType: "new" | "renewal" | "loss") => {
    try {
      localStorage.setItem("solo_parent_reapplying", "true")
      localStorage.setItem(`solo_parent_reapplying_${targetType}`, "true")
    } catch {}
    ;(window as any).__isFormDirty = false
    setIsReapplying(true)
    setIdStatus(targetType)
    setIsBlocked(false)
    setBlockReason(null)
    setStep(1)
    setAttemptedNext(false)
    setIsIdVerified(false)
    setExistingIdNumber("")
    setIsResident(false)
    setHasSoleParentalCare(false)
    setUploadedDocs({})
    try {
      const newUrl = `/portal/apply-solo-parent?category=solo-parent&type=${targetType}&reapply=true`
      window.history.replaceState(null, "", newUrl)
    } catch {}
  }

  useEffect(() => {
    let isMounted = true

    const checkEligibility = async (isInitial = false) => {
      if (isInitial) setCheckingEligibility(true)
      try {
        const typeToCheck = idStatus || "new"
        const prof = getCurrentUserProfile()
        const uid = userId || prof.id || ""
        const qcid = (prof.qcidNo || prof.qcidNumber || "").trim()
        const email = (prof.email || "").trim()
        const fn = (prof.firstName || "").trim()
        const ln = (prof.lastName || "").trim()

        let isBlockedFound = false
        let reasonFound: "draft" | "pending" | "approved" | null = null
        let refFound = ""
        let appFound: any = null

        const isReapply = isReapplying || (typeof window !== "undefined" && window.location.search.includes("reapply=true"))

        // 1. Backend Eligibility API
        try {
          const res = await fetch(
            `${API_BASE}/api/solo-parent/eligibility/${uid || "0"}?applicationType=${typeToCheck}&qcid=${encodeURIComponent(qcid)}&email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(fn)}&lastName=${encodeURIComponent(ln)}&reapply=${isReapply ? "true" : "false"}&_t=${Date.now()}`,
            { headers: getAuthHeaders(), cache: "no-store" }
          )
          if (res.ok) {
            const data = await res.json()
            if (data.blocked) {
              isBlockedFound = true
              reasonFound = data.reason || null
              refFound = data.referenceNumber || ""
              appFound = data.application || null
            }
          }
        } catch {}

        // 2. Local & Real-time fetch verification & auto-population
        const allApps = await fetchAllSoloParentApps()
        const userQcidClean = qcid.replace(/\D/g, "")
        const userEmailClean = email.toLowerCase()
        const userFnClean = fn.toLowerCase()
        const userLnClean = ln.toLowerCase()

        const matchedUserApps = allApps.filter((a) => {
          if (!a) return false
          const aQcid = String(a.qcid_number || a.qcidNumber || a.qcid || a.reference_number || a.referenceNumber || "").replace(/\D/g, "")
          const aRef = String(a.reference_number || a.referenceNumber || "").replace(/\D/g, "")
          const aEmail = String(a.email || "").toLowerCase().trim()
          const aFn = String(a.first_name || a.firstName || a.form_data?.firstName || "").toLowerCase().trim()
          const aLn = String(a.last_name || a.lastName || a.form_data?.lastName || "").toLowerCase().trim()
          const aAssigned = String(a.assigned_id_number || a.assignedIdNumber || a.solo_parent_id_number || a.soloParentIdNumber || "").replace(/\D/g, "")
          const aUid = String(a.user_id || a.userId || "").trim()

          const isSoloCategory =
            String(a.classification_title || a.category || a.service || a.application_type || "").toLowerCase().includes("solo") ||
            String(a.classification_title || a.category || a.service || a.application_type || "").toLowerCase().includes("parent") ||
            Boolean(a.solo_parent_id_number || a.soloParentIdNumber || a.children || a.family_members || a.familyMembers) ||
            Boolean(String(a.assigned_id_number || a.assignedIdNumber || "").includes("SP-"))

          const isUserMatch =
            (uid && aUid && aUid === String(uid)) ||
            (userQcidClean && (aQcid.includes(userQcidClean) || userQcidClean.includes(aQcid) || aRef.includes(userQcidClean) || userQcidClean.includes(aRef) || (aAssigned && aAssigned.includes(userQcidClean)))) ||
            (userEmailClean && aEmail && userEmailClean === aEmail) ||
            (userLnClean && aLn && (userLnClean === aLn || aLn.includes(userLnClean) || userLnClean.includes(aLn) || (userFnClean && aFn && (userFnClean.includes(aFn) || aFn.includes(userFnClean)))))

          return isSoloCategory && isUserMatch
        })

        const approvedApp = matchedUserApps.find((a) => {
          const st = String(a.application_status || a.status || "").toLowerCase()
          return st === "approved" || st === "completed" || st === "for_release" || st === "active"
        })

        const pendingApp = matchedUserApps.find((a) => {
          const st = String(a.application_status || a.status || "").toLowerCase()
          const aType = String(a.application_type || a.applicationType || a.type || "new").toLowerCase()
          const isMatchPendingType =
            typeToCheck === "renewal" ? aType === "renewal" :
            typeToCheck === "loss" ? (aType === "loss" || aType === "replacement") :
            (aType === "new" || !aType)
          return (st === "pending" || st === "draft" || st === "under_review") && isMatchPendingType
        })

        if (!isReapply && approvedApp) {
          isBlockedFound = true
          reasonFound = "approved"
          refFound = approvedApp.reference_number || approvedApp.referenceNumber || refFound
          appFound = approvedApp
        } else if (!isBlockedFound) {
          if (pendingApp) {
            isBlockedFound = true
            reasonFound = "pending"
            refFound = pendingApp.reference_number || pendingApp.referenceNumber || ""
            appFound = pendingApp
          }
        }

        // Pre-fill formData behind the scenes on Renewal / Loss without modifying Step 1 checkboxes or verification
        if (approvedApp && (typeToCheck === "renewal" || typeToCheck === "loss") && !isBlockedFound) {
          const emergencyData = extractEmergencyContact(approvedApp, prof)

          if (isMounted) {
            setFormData((prev) => ({
              ...prev,
              firstName: approvedApp.first_name || approvedApp.firstName || prof.firstName || prev.firstName,
              middleName: approvedApp.middle_name || approvedApp.middleName || prof.middleName || prev.middleName,
              lastName: approvedApp.last_name || approvedApp.lastName || prof.lastName || prev.lastName,
              suffix: approvedApp.suffix || prof.suffix || prev.suffix,
              citizenship: approvedApp.citizenship || approvedApp.nationality || prof.nationality || prev.citizenship || "FILIPINO",
              dobMonth: approvedApp.dob_month || approvedApp.dobMonth || prof.dobMonth || prev.dobMonth,
              dobDay: approvedApp.dob_day || approvedApp.dobDay || prof.dobDay || prev.dobDay,
              dobYear: approvedApp.dob_year || approvedApp.dobYear || prof.dobYear || prev.dobYear,
              age: String(approvedApp.age || prof.age || prev.age),
              sex: approvedApp.sex || approvedApp.gender || prof.sex || prev.sex,
              civilStatus: approvedApp.civil_status || approvedApp.civilStatus || prof.civilStatus || prev.civilStatus,
              contactNo: approvedApp.contact_no || approvedApp.contactNo || approvedApp.phone_number || approvedApp.phoneNumber || prof.contactNo || prev.contactNo,
              addressHouseNo: approvedApp.address_house_no || approvedApp.addressHouseNo || prof.addressHouseNo || prev.addressHouseNo,
              addressStreet: approvedApp.address_street || approvedApp.addressStreet || prof.addressStreet || prev.addressStreet,
              addressBarangay: approvedApp.address_barangay || approvedApp.addressBarangay || prof.addressBarangay || prev.addressBarangay,
              addressCityMunicipality: approvedApp.address_city_municipality || approvedApp.addressCityMunicipality || prof.addressCityMunicipality || prev.addressCityMunicipality || "QUEZON CITY",
              qcidNumber: approvedApp.qcid_number || approvedApp.qcidNumber || prof.qcidNo || prev.qcidNumber,
              email: approvedApp.email || prof.email || prev.email,
              bloodType: approvedApp.blood_type || approvedApp.bloodType || (prof as any).bloodType || prev.bloodType || "O+",
              ...emergencyData,
            }))
          }
        }

        if (isMounted) {
          setIsBlocked(isBlockedFound)
          setBlockReason(reasonFound)
          setBlockedReference(refFound)
          setBlockedApp(appFound)
          onBlockedStatusChange?.(isBlockedFound)
        }
      } catch (err) {
        console.warn("Eligibility check error:", err)
      } finally {
        if (isMounted && isInitial) {
          setCheckingEligibility(false)
        }
      }
    }

    checkEligibility(true)
    const interval = setInterval(() => checkEligibility(false), 2000)
    const handleUpdate = () => checkEligibility(false)

    const unsubscribe = subscribeToRealtimeChanges(() => {
      checkEligibility(false)
    })

    window.addEventListener("solo_parent_applications_updated", handleUpdate)
    window.addEventListener("applications_updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)

    return () => {
      isMounted = false
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("solo_parent_applications_updated", handleUpdate)
      window.removeEventListener("applications_updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [userId, idStatus])

  // ---- Submission & Application State ----
  const [submissionStage, setSubmissionStage] = useState<"form" | "matching" | "pending">("form")
  const [reference, setReference] = useState("")
  const [redirectCountdown, setRedirectCountdown] = useState<number>(1)

  useEffect(() => {
    onSubmissionStageChange?.(submissionStage)
  }, [submissionStage, onSubmissionStageChange])

  // Auto-redirect to pending status screen after 1 second on pending
  useEffect(() => {
    if (submissionStage !== "pending") return

    setRedirectCountdown(1)
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsBlocked(true)
          setBlockReason("pending")
          setBlockedReference(reference)
          setSubmissionStage("form")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [submissionStage, reference])
  const familyMembers: FamilyMember[] = []

  // ---- Step 2: Personal Information ----
  const [formData, setFormData] = useState<FormData>(() => {
    const prof = getCurrentUserProfile()
    const isNew = initialType === "new"
    return {
      ...EMPTY_FORM_DATA,
      firstName: prof.firstName || userProfile?.firstName || "",
      middleName: prof.middleName || userProfile?.middleName || "",
      lastName: prof.lastName || userProfile?.lastName || "",
      suffix: prof.suffix || userProfile?.suffix || "",
      citizenship: prof.nationality || userProfile?.nationality || "FILIPINO",
      dobMonth: prof.dobMonth || userProfile?.dobMonth || "",
      dobDay: prof.dobDay || userProfile?.dobDay || "",
      dobYear: prof.dobYear || userProfile?.dobYear || "",
      age: prof.age ? String(prof.age) : userProfile?.age ? String(userProfile.age) : "",
      sex: prof.sex || userProfile?.sex || "",
      civilStatus: prof.civilStatus || userProfile?.civilStatus || "",
      contactNo: prof.contactNo || userProfile?.contactNo || "",
      addressHouseNo: prof.addressHouseNo || userProfile?.addressHouseNo || "",
      addressStreet: prof.addressStreet || userProfile?.addressStreet || "",
      addressBarangay: prof.addressBarangay || userProfile?.addressBarangay || "",
      addressCityMunicipality: prof.addressCityMunicipality || userProfile?.addressCityMunicipality || "Quezon City",
      qcidNumber: prof.qcidNo || (prof as any).qcidNumber || userProfile?.qcidNo || (userProfile as any)?.qcidNumber || "",
      email: prof.email || userProfile?.email || "",
      bloodType: (prof as any).bloodType || userProfile?.bloodType || "O+",
      // Emergency contact: BLANK on new application; only auto-filled on renewal/loss
      emergencyFirstName: isNew ? "" : (prof.emergencyFirstName || userProfile?.emergencyFirstName || ""),
      emergencyLastName: isNew ? "" : (prof.emergencyLastName || userProfile?.emergencyLastName || ""),
      emergencyContactNo: isNew ? "" : (prof.emergencyContactNo || userProfile?.emergencyContactNo || ""),
      emergencyRelationship: isNew ? "" : (prof.emergencyRelationship || userProfile?.emergencyRelationship || ""),
      emergencyAddress: isNew ? "" : ((prof as any).emergencyAddress || userProfile?.emergencyAddress || (prof.addressHouseNo ? `${prof.addressHouseNo} ${prof.addressStreet}, ${prof.addressBarangay}, ${prof.addressCityMunicipality}` : "")),
    }
  })
  const updateField = (key: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  // ---- Step 3: Sample Documents (dynamic base sa idStatus) ----
  const requiredDocs = getRequiredDocuments(idStatus, selectedCategoryId)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File[]>>({})
  const [uploadedDocsBase64, setUploadedDocsBase64] = useState<Record<string, string>>({})

  // Reload / Navigation warning protection — active from Step 2 onwards when modal is closed and form is actively being filled
  const isFormDirty =
    !isModalOpen &&
    !isBlocked &&
    !checkingEligibility &&
    submissionStage === "form" &&
    step >= 2 &&
    step <= 4

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
    if (isBlocked || submissionStage !== "form" || checkingEligibility) {
      ;(window as any).__isFormDirty = false
    }
  }, [isBlocked, submissionStage, checkingEligibility])

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

    const fileToUpload = validFiles[0]
    setUploadedDocs((prev) => ({
      ...prev,
      [docId]: [fileToUpload],
    }))

    // Read as Base64 Data URL for persistent instant preview & database fallback
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setUploadedDocsBase64((prev) => ({ ...prev, [docId]: dataUrl }))
    }
    reader.readAsDataURL(fileToUpload)
  }

  const handleRemoveFile = (docId: string, fileIndex: number) => {
    setUploadedDocs((prev) => {
      const updated = [...(prev[docId] || [])]
      updated.splice(fileIndex, 1)
      return { ...prev, [docId]: updated }
    })
    setUploadedDocsBase64((prev) => {
      const updated = { ...prev }
      delete updated[docId]
      return updated
    })
  }

  const handleFinalSubmit = async () => {
    ;(window as any).__isFormDirty = false
    setSubmissionStage("matching")
    const fallbackRef = reference || generateReference(idStatus, userProfile?.qcidNo || formData?.qcidNumber)
    setReference(fallbackRef)

    const emFirst = (formData.emergencyFirstName || "").trim()
    const emLast = (formData.emergencyLastName || "").trim()
    const emCombined = [emFirst, emLast].filter(Boolean).join(" ")

    // Extract uploaded 2x2 photo Base64
    const photoKey = Object.keys(uploadedDocsBase64).find((k) =>
      /photo|picture|2x2|id_pic|avatar/i.test(k)
    )
    const applicantPhoto = photoKey ? uploadedDocsBase64[photoKey] : (userProfile as any)?.photo || ""

    const finalFormData = {
      ...formData,
      applicantPhoto: applicantPhoto || undefined,
      idPhoto: applicantPhoto || undefined,
      photoUrl: applicantPhoto || undefined,
      emergencyFirstName: emFirst,
      emergencyLastName: emLast,
      emergencyName: emCombined || (formData as any).emergencyName || "",
      emergencyContactPerson: emCombined || (formData as any).emergencyContactPerson || "",
      emergencyContactNo: (formData.emergencyContactNo || "").trim(),
      emergencyPhone: (formData.emergencyContactNo || "").trim(),
      emergencyRelationship: (formData.emergencyRelationship || "").trim(),
      emergencyAddress: (formData.emergencyAddress || "").trim(),
      bloodType: formData.bloodType || "O+",
    }

    // Pre-build document records with Base64 previews
    const newDocItems = requiredDocs.map((d) => ({
      documentId: d.id,
      documentLabel: d.label,
      files: (uploadedDocs[d.id] || []).map((f) => ({
        filename: f.name,
        fileUrl: uploadedDocsBase64[d.id] || `/uploads/solo-parent/${f.name}`,
        dataUrl: uploadedDocsBase64[d.id],
        uploadedAt: new Date().toISOString(),
      })),
    }))

    try {
      // 1. Create application record sa backend
      const res = await fetch(`${API_BASE}/api/solo-parent/create`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          userId: userId || userProfile?.id || "0",
          referenceNumber: fallbackRef,
          applicationData: {
            isResident,
            idStatus,
            selectedCategoryId,
            selectedCategory,
            existingIdNumber,
            isIdVerified,
            applicantPhoto: applicantPhoto || undefined,
            formData: finalFormData,
            familyMembers,
            emergencyFirstName: emFirst,
            emergencyLastName: emLast,
            emergencyName: emCombined,
            emergencyContactPerson: emCombined,
            emergencyContactNo: (formData.emergencyContactNo || "").trim(),
            emergencyPhone: (formData.emergencyContactNo || "").trim(),
            emergencyRelationship: (formData.emergencyRelationship || "").trim(),
            emergencyAddress: (formData.emergencyAddress || "").trim(),
            bloodType: formData.bloodType || "O+",
            status: "pending",
            application_status: "pending",
            documents: newDocItems,
          },
          documents: newDocItems,
          requiredDocumentIds: requiredDocs.map((d) => d.id),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const appId = data.applicationId
        if (data.referenceNumber) {
          setReference(data.referenceNumber)
        }

        // 2. I-upload ang lahat ng nakalakip na dokumento via multipart
        for (const doc of requiredDocs) {
          const files = uploadedDocs[doc.id] || []
          if (files.length > 0 && appId) {
            const uploadFormData = new FormData()
            files.forEach((f) => uploadFormData.append("documents", f))
            uploadFormData.append("documentId", doc.id)
            uploadFormData.append("documentLabel", doc.label)
            const token = getAuthToken()
            await fetch(`${API_BASE}/api/solo-parent/${appId}/upload-documents`, {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}`, "x-access-token": token, "x-session-token": token } : undefined,
              body: uploadFormData,
            }).catch(() => {})
          }
        }

        // 3. Markahan bilang pending / submitted
        if (appId) {
          await fetch(`${API_BASE}/api/solo-parent/${appId}/submit`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
          }).catch(() => {})
        }

        // Local cache sync for instant rendering across all portals
        try {
          const stored = JSON.parse(localStorage.getItem("solo_parent_applications") || "[]")
          const localRecord = {
            id: appId || String(Date.now()),
            reference_number: data.referenceNumber || fallbackRef,
            referenceNumber: data.referenceNumber || fallbackRef,
            category: "Solo Parent",
            applicantPhoto: applicantPhoto,
            photoUrl: applicantPhoto,
            idPhoto: applicantPhoto,
            firstName: formData.firstName,
            lastName: formData.lastName,
            middleName: formData.middleName,
            documents: newDocItems,
            form_data: finalFormData,
            extra_data: { formData: finalFormData, applicantPhoto },
            application_status: "pending",
            status: "pending",
            created_at: new Date().toISOString(),
          }
          localStorage.setItem("solo_parent_applications", JSON.stringify([localRecord, ...stored]))
        } catch {}

        // 4. Dispatch real-time event to Admin dashboard
        notifyApplicationChange("APPLICATION_SUBMITTED", "solo_parent", data.referenceNumber || fallbackRef)
      } else {
        // Fallback local save if server error
        try {
          const stored = JSON.parse(localStorage.getItem("solo_parent_applications") || "[]")
          const localRecord = {
            id: String(Date.now()),
            reference_number: fallbackRef,
            referenceNumber: fallbackRef,
            category: "Solo Parent",
            applicantPhoto: applicantPhoto,
            photoUrl: applicantPhoto,
            idPhoto: applicantPhoto,
            firstName: formData.firstName,
            lastName: formData.lastName,
            middleName: formData.middleName,
            documents: newDocItems,
            form_data: finalFormData,
            extra_data: { formData: finalFormData, applicantPhoto },
            application_status: "pending",
            status: "pending",
            created_at: new Date().toISOString(),
          }
          localStorage.setItem("solo_parent_applications", JSON.stringify([localRecord, ...stored]))
        } catch {}
        notifyApplicationChange("APPLICATION_SUBMITTED", "solo_parent", fallbackRef)
      }
    } catch (err) {
      console.warn("Final submit error / offline fallback:", err)
      try {
        const stored = JSON.parse(localStorage.getItem("solo_parent_applications") || "[]")
        const localRecord = {
          id: String(Date.now()),
          reference_number: fallbackRef,
          referenceNumber: fallbackRef,
          category: "Solo Parent",
          applicantPhoto: applicantPhoto,
          photoUrl: applicantPhoto,
          idPhoto: applicantPhoto,
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          documents: newDocItems,
          form_data: finalFormData,
          extra_data: { formData: finalFormData, applicantPhoto },
          application_status: "pending",
          status: "pending",
          created_at: new Date().toISOString(),
        }
        localStorage.setItem("solo_parent_applications", JSON.stringify([localRecord, ...stored]))
      } catch {}
      notifyApplicationChange("APPLICATION_SUBMITTED", "solo_parent", fallbackRef)
    }

    setTimeout(() => {
      setSubmissionStage("pending")
    }, 1000)
  }

  const step1Valid =
    isResident &&
    (idStatus === "new"
      ? selectedCategoryId !== null && hasSoleParentalCare
      : idStatus === "renewal"
      ? isIdVerified && (existingIdNumber || "").trim() !== "" && hasSoleParentalCare && renewalReason !== ""
      : isIdVerified && (existingIdNumber || "").trim() !== "" && hasSoleParentalCare && replacementReason !== "")

  const step2Valid =
    (idStatus === "new"
      ? (formData.firstName || "").trim() !== "" &&
        (formData.lastName || "").trim() !== "" &&
        (formData.contactNo || "").trim().length >= 10 &&
        (formData.addressBarangay || "").trim() !== ""
      : true) &&
    (formData.emergencyFirstName || "").trim() !== "" &&
    (formData.emergencyLastName || "").trim() !== "" &&
    (formData.emergencyContactNo || "").replace(/\D/g, "").length >= 10 &&
    (formData.emergencyRelationship || "").trim() !== "" &&
    (formData.emergencyAddress || "").trim() !== "" &&
    (formData.bloodType || "").trim() !== ""

  const step3Valid = requiredDocs.every((doc) => (uploadedDocs[doc.id]?.length ?? 0) > 0)

  const canGoNext =
    step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : true

  const goNext = () => {
    if (step === 1 && !step1Valid) {
      setAttemptedNext(true)
      return
    }
    if (step === 2 && !step2Valid) {
      setAttemptedNext(true)
      return
    }
    if (step === 3 && !step3Valid) {
      setAttemptedNext(true)
      return
    }

    setAttemptedNext(false)
    if (returnToReview) {
      setStep(4)
      setReturnToReview(false)
      return
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  const goBack = () => {
    setAttemptedNext(false)
    if (step === 1) {
      onBack?.()
      return
    }
    setStep((s) => Math.max(s - 1, 1))
  }

  const fullApplicantName = [formData.firstName, formData.middleName, formData.lastName, formData.suffix]
    .filter(Boolean)
    .join(" ")

  const applicationTypeLabel =
    idStatus === "renewal" ? t("spTypeRenewal") : idStatus === "loss" ? t("spTypeReplacementRequest") : t("spTypeApplication")



  if (isBlocked && (blockReason === "pending" || blockReason === "draft" || blockReason === "approved")) {
    const isAppApproved = blockReason === "approved" || blockedApp?.application_status === "approved" || blockedApp?.status === "approved"
    const displayRef = blockedReference || blockedApp?.reference_number || blockedApp?.referenceNumber || "REF-SP-2026-001"
    const assignedIdNo = blockedApp?.assigned_id_number || blockedApp?.assignedIdNumber || blockedApp?.solo_parent_id_number || blockedApp?.soloParentIdNumber
    const displayDate = blockedApp?.created_at || blockedApp?.submittedAt
      ? new Date(blockedApp.created_at || blockedApp.submittedAt).toLocaleDateString("en-PH", {
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
                ? language === "en"
                  ? "Application Approved"
                  : language === "bis"
                  ? "Na-aprobahan ang Aplikasyon!"
                  : "Na-approve ang Application!"
                : language === "en"
                ? "You Have an Existing Active Application"
                : language === "bis"
                ? "Aduna Ka Nay Aktibo nga Aplikasyon"
                : "May Kasalukuyan Ka Nang Aktibong Aplikasyon"}
            </h2>
            <p className="text-xs text-gray-600 max-w-md mt-1 leading-relaxed">
              {isAppApproved
                ? language === "en"
                  ? "Your application for Solo Parent ID has been officially approved! You already have an active Solo Parent ID. If you need to renew or replace your ID, please choose an option below."
                  : language === "bis"
                  ? "Ang imong aplikasyon para sa Solo Parent ID opisyal nga na-aprobahan sa Gov Service. Aduna ka nay aktibo nga ID."
                  : "Ang inyong aplikasyon para sa Solo Parent ID ay opisyal nang na-apruba ng Gov Service Social Services Development Department."
                : language === "en"
                ? "Your application for Solo Parent ID has been successfully submitted and is currently pending review. Please wait for a Social Worker's assessment before submitting a new application."
                : language === "bis"
                ? "Ang imong aplikasyon para sa Solo Parent ID nasumite na ug kasamtangang girebyu sa Social Worker."
                : "Ang inyong aplikasyon para sa Solo Parent ID ay matagumpay na naisumite at kasalukuyang sinusuri ng Social Worker."}
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-gray-500 font-medium">
                {language === "en" ? "Reference Number" : language === "bis" ? "Numero sa Reperensya" : "Reference Number"}
              </span>
              <span className="font-mono font-bold text-blue-600">
                {displayRef}
              </span>
            </div>
            {assignedIdNo && (
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">
                  {language === "en" ? "Official ID Number" : language === "bis" ? "Opisyal nga Numero sa ID" : "Opisyal na Numero ng ID"}
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
                  {language === "en" ? "Approved" : language === "bis" ? "Aprobado" : "Approved"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {language === "en" ? "Under Review (Pending)" : language === "bis" ? "Gisusi Pa (Pending)" : "Kasalukuyang Sinusuri (Pending)"}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">
                {language === "en" ? "Date Filed" : language === "bis" ? "Petsa sa Pag-file" : "Petsa ng Pag-apply"}
              </span>
              <span className="font-semibold text-gray-700">{displayDate}</span>
            </div>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2">
            {isAppApproved ? (
              <>
                <button
                  type="button"
                  onClick={() => handleStartReapply("renewal")}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
                >
                  {language === "en" ? "Apply for Renewal (Renewal Solo Parent ID)" : language === "bis" ? "Pag-apply para sa Renewal (Renewal Solo Parent ID)" : "Mag-apply para sa Renewal (Renewal Solo Parent ID)"}
                </button>
                <button
                  type="button"
                  onClick={() => handleStartReapply("loss")}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === "en" ? "Apply for Replacement / Lost ID" : language === "bis" ? "Pag-apply para sa Replacement / Nawala nga ID" : "Mag-apply para sa Replacement / Nawalang ID"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem("solo_parent_reapplying")
                      localStorage.removeItem(`solo_parent_reapplying_${idStatus || "new"}`)
                    } catch {}
                    ;(window as any).__isFormDirty = false
                    window.location.href = "/portal/my-applications"
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer uppercase tracking-wide"
                >
                  {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("solo_parent_reapplying")
                    localStorage.removeItem(`solo_parent_reapplying_${idStatus || "new"}`)
                  } catch {}
                  ;(window as any).__isFormDirty = false
                  window.location.href = "/portal/my-applications"
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
              >
                {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
    if (submissionStage === "matching") {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-soft flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{t("spSubmittingTitle")}</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{t("spSubmittingDesc")}</p>
        </div>
      </div>
    )
  }

  if (submissionStage === "pending") {
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
              {language === "en"
                ? "Application Received!"
                : language === "bis"
                ? "Nadawat na ang Imong Aplikasyon!"
                : "Mabuhay! Ang inyong aplikasyon ay Natanggap Na"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {language === "en"
                ? "Your Solo Parent ID application has been submitted and is currently being assessed."
                : language === "bis"
                ? "Ang imong aplikasyon para sa Solo Parent ID nasumite na ug kasamtangang gisusi."
                : "Ang inyong Solo Parent ID application ay matagumpay na naisumite at kasalukuyang sinusuri."}
            </p>
          </div>

          {/* Reference Card */}
          <div className="border border-border rounded-xl p-5 max-w-md mx-auto space-y-2.5 text-left bg-gray-50/60">
            <div className="flex justify-between items-center text-xs text-foreground border-b border-border/80 pb-2">
              <span className="font-semibold text-muted-foreground">
                {language === "en" ? "Reference Number:" : language === "bis" ? "Numero sa Reperensya:" : "Application Reference No.:"}
              </span>
              <span className="font-mono font-bold text-blue-700 text-sm">{reference}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-semibold text-foreground">Solo Parent ID Application</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">Application Type:</span>
              <span className="font-semibold text-foreground uppercase">{applicationTypeLabel}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">
                {language === "en" ? "Applicant:" : language === "bis" ? "Aplikante:" : "Aplikante:"}
              </span>
              <span className="font-semibold text-foreground">{fullApplicantName || "Applicant"}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-foreground">
              <span className="text-muted-foreground">
                {language === "en" ? "Date:" : language === "bis" ? "Petsa:" : "Petsa:"}
              </span>
              <span className="text-foreground">
                {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 max-w-md mx-auto flex items-center justify-center gap-2.5 text-center">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <p>
              {language === "en"
                ? "You may check Notifications or Application History for updates on your application."
                : language === "bis"
                ? "Mahimo nimong tan-awon ang Mga Notipikasyon o Kasaysayan sa Aplikasyon para sa mga update."
                : "Maaari ninyong tingnan ang Notifications para sa mga update sa inyong aplikasyon."}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 pt-1">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3b82f6]" />
              <span>
                {language === "en"
                  ? `Redirecting to application status in ${redirectCountdown} seconds...`
                  : language === "bis"
                  ? `Mibalhin sa status sa aplikasyon sulod sa ${redirectCountdown} segundo...`
                  : `Awtomatikong lilipat sa application status sa loob ng ${redirectCountdown} segundo...`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem("solo_parent_reapplying")
                  localStorage.removeItem(`solo_parent_reapplying_${idStatus || "new"}`)
                } catch {}
                ;(window as any).__isFormDirty = false
                window.location.href = "/portal/my-applications"
              }}
              className="w-full max-w-md py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
            >
              {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
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

        {/* Tab labels */}
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

        {/* Step content */}
        <div className="p-6 min-h-90">
          {/* ──────────────── STEP 1: COMPLETE CHECKLIST ──────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
                  {language === "en"
                    ? "SERVICE AND PRIMARY REQUIREMENTS"
                    : language === "bis"
                    ? "SERBISYO UG PANGUNANG KINAHANGLANON"
                    : "SERBISYO AT PANGUNAHING KINAKAILANGAN"}
                </h3>
              </div>

              {/* Checklist items without outer borders */}
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isResident}
                    onChange={(e) => setIsResident(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span className={`text-sm ${attemptedNext && !isResident ? "text-red-600 font-semibold" : "text-blue-700"}`}>
                    {language === "en"
                      ? "Are you a legitimate resident of Gov Service?"
                      : language === "bis"
                      ? "Ikaw ba usa ka lehitimong residente sa Gov Service?"
                      : "Ikaw ba ay lehitimong residente ng Gov Service?"} <span className="text-red-500">*</span>
                  </span>
                </label>
                {attemptedNext && !isResident && (
                  <p className="text-xs text-red-500 ml-6">
                    {language === "en"
                      ? "Must be a legitimate resident of Gov Service to apply."
                      : language === "bis"
                      ? "Kinahanglang residente sa Gov Service aron maka-apply."
                      : "Kinakailangang residente ng Gov Service upang makapag-apply."}
                  </p>
                )}

                {idStatus === "new" ? (
                  <>
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasSoleParentalCare}
                        onChange={(e) => setHasSoleParentalCare(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className={`text-sm ${attemptedNext && !hasSoleParentalCare ? "text-red-600 font-semibold" : "text-blue-700"}`}>
                        {language === "en"
                          ? "Are you a solo parent with sole parental care and custody over your child/children?"
                          : language === "bis"
                          ? "Ikaw ba usa ka solo parent nga adunay bugtong pag-atiman ug kustodiya sa imong anak/mga anak?"
                          : "Ikaw ba ay isang solo parent na may solong pag-aalaga at kustodiya sa iyong anak/mga anak?"} <span className="text-red-500">*</span>
                      </span>
                    </label>
                    {attemptedNext && !hasSoleParentalCare && (
                      <p className="text-xs text-red-500 ml-6">
                        {language === "en"
                          ? "Must have sole parental care and custody over your child/children."
                          : language === "bis"
                          ? "Kinahanglang adunay bugtong pag-atiman sa anak."
                          : "Kinakailangang may solong responsibilidad sa pag-aalaga ng anak."}
                      </p>
                    )}
                  </>
                ) : (
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasSoleParentalCare}
                      onChange={(e) => setHasSoleParentalCare(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                    />
                    <span className={`text-sm ${attemptedNext && !hasSoleParentalCare ? "text-red-600 font-semibold" : "text-blue-700"}`}>
                      {idStatus === "renewal"
                        ? language === "en"
                          ? "Do you have an existing or expired Solo Parent ID for renewal? *"
                          : language === "bis"
                          ? "Aduna ka bay kasamtangan o na-expire nga Solo Parent ID para sa renewal? *"
                          : "Mayroon ka bang kasalukuyan o expired na Solo Parent ID para sa renewal? *"
                        : language === "en"
                        ? "Was your Solo Parent ID lost or damaged, and in need of replacement? *"
                        : language === "bis"
                        ? "Nawala o nadaot ba ang imong Solo Parent ID, ug kinahanglan nga ilisan? *"
                        : "Nawala o nasira ba ang inyong Solo Parent ID, at kailangang palitan? *"}
                    </span>
                  </label>
                )}
              </div>

              {/* Blue Info Alert Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    {idStatus === "renewal"
                      ? language === "en"
                        ? "RENEWAL OF SOLO PARENT ID"
                        : language === "bis"
                        ? "PAG-RENEW SA SOLO PARENT ID"
                        : "PAG-RENEW NG SOLO PARENT ID"
                      : idStatus === "loss"
                      ? language === "en"
                        ? "REPLACEMENT OF LOST OR DAMAGED SOLO PARENT ID"
                        : language === "bis"
                        ? "PAG-ILIS SA NAWALA O NADAOT NGA SOLO PARENT ID"
                        : "PAGPAPALIT NG NAWALA O NASIRANG SOLO PARENT ID"
                      : language === "en"
                      ? "NEW APPLICATION FOR SOLO PARENT ID"
                      : language === "bis"
                      ? "BAG-ONG APLIKASYON PARA SA SOLO PARENT ID"
                      : "BAGONG APLIKASYON PARA SA SOLO PARENT ID"}
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {idStatus === "renewal"
                      ? language === "en"
                        ? "RENEWAL: Update your existing Solo Parent ID. Prepare your ID number and required documents."
                        : language === "bis"
                        ? "RENEWAL: I-update ang imong kasamtangang Solo Parent ID. Ihanda ang ID number ug mga gikinahanglang dokumento."
                        : "RENEWAL: I-update ang inyong kasalukuyang Solo Parent ID. Ihanda ang ID number at mga kaukulang dokumento."
                      : idStatus === "loss"
                      ? language === "en"
                        ? "REPLACEMENT: Application for lost or damaged Solo Parent ID. Prepare Affidavit of Loss or damaged ID."
                        : language === "bis"
                        ? "REPLACEMENT: Aplikasyon para sa nawala o nadaot nga Solo Parent ID. Ihanda ang Affidavit of Loss o nadaot nga ID."
                        : "REPLACEMENT: Aplikasyon para sa nawala o nasirang Solo Parent ID. Ihanda ang Affidavit of Loss o sirang ID."
                      : language === "en"
                      ? "NEW APPLICATION: First-time Solo Parent ID application. Complete all requirements."
                      : language === "bis"
                      ? "BAG-ONG APLIKASYON: Unang higayon nga pag-apply og Solo Parent ID. Kompletoha ang tanang kinahanglanon."
                      : "BAGONG APLIKASYON: Unang beses na aplikasyon para sa Solo Parent ID. Kumpletuhin ang lahat ng kailangan."}
                  </p>
                </div>
              </div>

              {/* Dropdown / ID verification section */}
              {idStatus === "new" && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide block">
                    {language === "en"
                      ? "CLICK THE TYPE OF ASSISTANCE / CATEGORY"
                      : language === "bis"
                      ? "PILIA ANG MATANG SA TABANG / KATEGORYA"
                      : "PILIIN ANG URI NG TULONG / KATEGORYA"} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCategoryId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null
                      setSelectedCategoryId(val)
                    }}
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 ${
                      attemptedNext && selectedCategoryId === null
                        ? "border-red-400 focus:ring-red-300 bg-red-50"
                        : "border-border focus:ring-blue-400"
                    }`}
                  >
                    <option value="">
                      {language === "en"
                        ? "Select Category"
                        : language === "bis"
                        ? "Pilia ang Kategorya"
                        : "Pumili ng Kategorya"}
                    </option>
                    {SOLO_PARENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                  {attemptedNext && selectedCategoryId === null && (
                    <p className="text-xs text-red-500 mt-1">
                      {language === "en"
                        ? "Please select a category to continue."
                        : language === "bis"
                        ? "Palihug pagpili og kategorya aron makapadayon."
                        : "Pumili ng kategorya upang makapagpatuloy."}
                    </p>
                  )}
                </div>
              )}

              {/* RENEWAL: STEP 1 — VERIFY EXISTING SOLO PARENT ID */}
              {idStatus === "renewal" && (
                <div className="space-y-5 pt-2">
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      {language === "en"
                        ? "Existing Solo Parent ID"
                        : language === "bis"
                        ? "Kasamtangang Solo Parent ID"
                        : "Kasalukuyang Solo Parent ID"}
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide block text-gray-700">
                      {language === "en"
                        ? "Existing Solo Parent ID Number"
                        : language === "bis"
                        ? "Kasamtangang Solo Parent ID Number"
                        : "Kasalukuyang Solo Parent ID Number"} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                      <div className="flex-1">
                        <TextInput
                          value={existingIdNumber}
                          onChange={(v) => {
                            const formatted = formatSoloParentIdInput(v)
                            setExistingIdNumber(formatted)
                            setIsIdVerified(false)
                            setVerifyError("")
                          }}
                          placeholder={samplePlaceholder}
                          invalid={attemptedNext && (!(existingIdNumber || "").trim() || !isIdVerified)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyId}
                        disabled={!(existingIdNumber || "").trim() || isVerifying}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 h-10 uppercase tracking-wide"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              {language === "en"
                                ? "Verifying..."
                                : language === "bis"
                                ? "Gisusi..."
                                : "Sinusuri..."}
                            </span>
                          </>
                        ) : (
                          <span>
                            {language === "en"
                              ? "VERIFY ID"
                              : language === "bis"
                              ? "I-VERIFY ANG ID"
                              : "I-VERIFY ANG ID"}
                          </span>
                        )}
                      </button>
                    </div>
                    {verifyError && <p className="text-xs text-red-500 mt-1">{verifyError}</p>}
                    {attemptedNext && !isIdVerified && (
                      <p className="text-xs text-red-500 mt-1">
                        {language === "en"
                          ? "Please click VERIFY ID and ensure your record is verified before proceeding."
                          : language === "bis"
                          ? "Palihug pindota ang VERIFY ID ug siguroha nga napamatud-an ang record sa dili pa mopadayon."
                          : "Pindutin ang VERIFY ID at tiyaking verified ang record bago magpatuloy."}
                      </p>
                    )}
                  </div>

                  {isIdVerified && (
                    <div className="space-y-4 max-w-md">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-200">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                            {language === "en"
                              ? "✓ Solo Parent ID Verified"
                              : language === "bis"
                              ? "✓ Napamatud-ang Solo Parent ID"
                              : "✓ Solo Parent ID Verified"}
                          </p>
                          <p className="text-xs text-emerald-800">
                            <span className="font-semibold">
                              {language === "en"
                                ? "Existing Solo Parent record found:"
                                : language === "bis"
                                ? "Nakit-an nga Solo Parent record:"
                                : "Nakitang rekord ng Solo Parent:"}
                            </span>{" "}
                            {verifiedRecord?.name || `${userProfile.firstName} ${userProfile.lastName}`}
                          </p>
                          <p className="text-xs text-emerald-800">
                            <span className="font-semibold">ID Status:</span> Active / Expired
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide block text-gray-700">
                          {language === "en"
                            ? "Reason for Renewal"
                            : language === "bis"
                            ? "Hinungdan sa Pag-renew"
                            : "Dahilan ng Pag-renew"} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-6 pt-1">
                          {[
                            { label: "Expired ID", value: "Expired ID" },
                            { label: "Updating Information", value: "Updating Information" },
                          ].map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="spRenewalReason"
                                checked={renewalReason === opt.value}
                                onChange={() => setRenewalReason(opt.value)}
                                className="h-4 w-4 text-blue-600 accent-blue-600 cursor-pointer"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {attemptedNext && !renewalReason && (
                          <p className="text-xs text-red-500 mt-1">
                            {language === "en"
                              ? "Please select a reason for renewal."
                              : language === "bis"
                              ? "Palihug pagpili og hinungdan sa renewal."
                              : "Pumili ng dahilan ng renewal."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LOSS: STEP 1 — VERIFY EXISTING SOLO PARENT ID */}
              {idStatus === "loss" && (
                <div className="space-y-5 pt-2">
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      {language === "en"
                        ? "Existing Solo Parent ID"
                        : language === "bis"
                        ? "Kasamtangang Solo Parent ID"
                        : "Kasalukuyang Solo Parent ID"}
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide block text-gray-700">
                      {language === "en"
                        ? "Existing Solo Parent ID Number"
                        : language === "bis"
                        ? "Kasamtangang Solo Parent ID Number"
                        : "Kasalukuyang Solo Parent ID Number"} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                      <div className="flex-1">
                        <TextInput
                          value={existingIdNumber}
                          onChange={(v) => {
                            const formatted = formatSoloParentIdInput(v)
                            setExistingIdNumber(formatted)
                            setIsIdVerified(false)
                            setVerifyError("")
                          }}
                          placeholder={samplePlaceholder}
                          invalid={attemptedNext && (!(existingIdNumber || "").trim() || !isIdVerified)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyId}
                        disabled={!(existingIdNumber || "").trim() || isVerifying}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 h-10 uppercase tracking-wide"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              {language === "en"
                                ? "Verifying..."
                                : language === "bis"
                                ? "Gisusi..."
                                : "Sinusuri..."}
                            </span>
                          </>
                        ) : (
                          <span>
                            {language === "en"
                              ? "VERIFY ID"
                              : language === "bis"
                              ? "I-VERIFY ANG ID"
                              : "I-VERIFY ANG ID"}
                          </span>
                        )}
                      </button>
                    </div>
                    {verifyError && <p className="text-xs text-red-500 mt-1">{verifyError}</p>}
                    {attemptedNext && !isIdVerified && (
                      <p className="text-xs text-red-500 mt-1">
                        {language === "en"
                          ? "Please click VERIFY ID and ensure your record is verified before proceeding."
                          : language === "bis"
                          ? "Palihug pindota ang VERIFY ID ug siguroha nga napamatud-an ang record sa dili pa mopadayon."
                          : "Pindutin ang VERIFY ID at tiyaking verified ang record bago magpatuloy."}
                      </p>
                    )}
                  </div>

                  {isIdVerified && (
                    <div className="space-y-4 max-w-md">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-200">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                            {language === "en"
                              ? "✓ Solo Parent ID Verified"
                              : language === "bis"
                              ? "✓ Napamatud-ang Solo Parent ID"
                              : "✓ Solo Parent ID Verified"}
                          </p>
                          <p className="text-xs text-emerald-800">
                            <span className="font-semibold">
                              {language === "en"
                                ? "Existing Solo Parent record found:"
                                : language === "bis"
                                ? "Nakit-an nga Solo Parent record:"
                                : "Nakitang rekord ng Solo Parent:"}
                            </span>{" "}
                            {verifiedRecord?.name || `${userProfile.firstName} ${userProfile.lastName}`}
                          </p>
                          <p className="text-xs text-emerald-800">
                            <span className="font-semibold">ID Status:</span> Active / Expired
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide block text-gray-700">
                          {language === "en"
                            ? "Reason for Replacement"
                            : language === "bis"
                            ? "Hinungdan sa Pag-ilis"
                            : "Dahilan ng Pagpapalit"} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-6 pt-1">
                          {[
                            { label: "Lost Solo Parent ID", value: "Lost" },
                            { label: "Damaged Solo Parent ID", value: "Damaged" },
                            { label: "Stolen Solo Parent ID", value: "Stolen" },
                          ].map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="spReplacementReason"
                                checked={replacementReason === opt.value}
                                onChange={() => setReplacementReason(opt.value)}
                                className="h-4 w-4 text-blue-600 accent-blue-600 cursor-pointer"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {attemptedNext && !replacementReason && (
                          <p className="text-xs text-red-500 mt-1">
                            {language === "en"
                              ? "Please select a reason for replacement."
                              : language === "bis"
                              ? "Palihug pagpili og hinungdan sa pag-ilis."
                              : "Pumili ng dahilan ng pagpapalit."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
                    {t("wizardPersonal") || "PERSONAL INFORMATION"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("reviewSeniorDesc") || "Please review your personal information from your QCID profile. Fill in the additional details below."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {isEditingInfo ? "LOCK INFORMATION" : "EDIT INFORMATION"}
                  </button>
                </div>
              </div>

              {/* IMPORTANT REMINDER BOX */}
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-600">{t("importantReminder") || "Important reminder"}</p>
                  <p className="text-blue-600/90 mt-0.5 text-xs sm:text-sm">
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
                      value={formData.qcidNumber}
                      onChange={(e) => updateField("qcidNumber", e.target.value)}
                      placeholder="110000116932100"
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
                    <label className="text-xs font-semibold text-gray-700">{t("firstNameLabel") || "First name"} *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      placeholder={t("firstNameLabel") || "First name"}
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
                    <label className="text-xs font-semibold text-gray-700">{t("middleNameLabel") || "Middle name"}</label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => updateField("middleName", e.target.value)}
                      placeholder={t("middleNameLabel") || "Middle name"}
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
                      placeholder={t("lastNameLabel") || "Last name"}
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
                      placeholder={t("suffixLabel") || "Suffix (Jr., Sr., III, etc.)"}
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
                      value={formData.citizenship}
                      onChange={(e) => updateField("citizenship", e.target.value)}
                      placeholder="FILIPINO"
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
                      value={
                        formData.dobMonth && formData.dobDay && formData.dobYear
                          ? `${formData.dobMonth}/${formData.dobDay}/${formData.dobYear}`
                          : (formData.dobMonth || "")
                      }
                      onChange={(e) => {
                        const val = e.target.value
                        const parts = val.split("/")
                        if (parts.length === 3) {
                          updateField("dobMonth", parts[0])
                          updateField("dobDay", parts[1])
                          updateField("dobYear", parts[2])
                        } else {
                          updateField("dobMonth", val)
                        }
                      }}
                      placeholder="MM/DD/YYYY"
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
                      onChange={(e) => updateField("age", e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 28"
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
                      placeholder="Male / Female"
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
                      placeholder="Single / Widowed / Separated"
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
                    <label className="text-xs font-semibold text-gray-700">Blood type *</label>
                    <select
                      value={formData.bloodType || "O+"}
                      onChange={(e) => updateField("bloodType", e.target.value)}
                      disabled={!isEditingInfo}
                      className={`w-full border rounded-lg px-3 py-2 text-sm mt-1 transition-colors ${
                        !isEditingInfo
                          ? "bg-gray-100 text-gray-800 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-900 border-blue-400 ring-2 ring-blue-100"
                      }`}
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
                      value={formData.addressHouseNo}
                      onChange={(e) => updateField("addressHouseNo", e.target.value)}
                      placeholder="e.g. 123"
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
                    <label className="text-xs font-semibold text-gray-700">{t("streetNameLabel") || "Street name"} *</label>
                    <input
                      type="text"
                      value={formData.addressStreet}
                      onChange={(e) => updateField("addressStreet", e.target.value)}
                      placeholder="e.g. Main St."
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
                      value={formData.addressBarangay}
                      onChange={(e) => updateField("addressBarangay", e.target.value)}
                      placeholder="e.g. Sauyo"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{t("phoneNumberLabel") || "Phone number"} *</label>
                    <input
                      type="text"
                      value={formData.contactNo}
                      onChange={(e) => updateField("contactNo", e.target.value.replace(/\D/g, ""))}
                      placeholder="09XXXXXXXXX"
                      maxLength={11}
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
                    <label className="text-xs font-semibold text-gray-700">{t("emailLabel") || "Email"} *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="name@example.com"
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

                {/* EMERGENCY CONTACT */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#3b82f6]" />
                    {t("emergencyContactTitle") || "EMERGENCY CONTACT"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && !(formData.emergencyFirstName || "").trim() ? "text-red-600" : "text-gray-700"}`}>
                        {t("firstNameLabel") || "First name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={formData.emergencyFirstName}
                        onChange={(e) => updateField("emergencyFirstName", e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50).toUpperCase())}
                        placeholder={t("firstNameLabel") || "First name"}
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm transition-colors ${
                          attemptedNext && !(formData.emergencyFirstName || "").trim()
                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                            : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && !(formData.emergencyLastName || "").trim() ? "text-red-600" : "text-gray-700"}`}>
                        {t("lastNameLabel") || "Last name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={formData.emergencyLastName}
                        onChange={(e) => updateField("emergencyLastName", e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50).toUpperCase())}
                        placeholder={t("lastNameLabel") || "Last name"}
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm transition-colors ${
                          attemptedNext && !(formData.emergencyLastName || "").trim()
                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                            : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${attemptedNext && (formData.emergencyContactNo || "").replace(/\D/g, "").length < 10 ? "text-red-600" : "text-gray-700"}`}>
                        {t("phoneNumberLabel") || "Phone number"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        value={formData.emergencyContactNo}
                        onChange={(e) => updateField("emergencyContactNo", e.target.value.replace(/\D/g, ""))}
                        placeholder="09XXXXXXXXX"
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm font-mono transition-colors ${
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
                        onChange={(e) => updateField("emergencyRelationship", e.target.value)}
                        className={`w-full h-11 rounded-lg border px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                          attemptedNext && !(formData.emergencyRelationship || "").trim()
                            ? "border-red-400 focus:ring-red-300 bg-red-50"
                            : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                        }`}
                      >
                        <option value="">{t("selectRelationshipOption") || "Select Relationship"}</option>
                        <option value="Immediate Family">Immediate Family</option>
                        <option value="Parent">Parent</option>
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
                      onChange={(e) => updateField("emergencyAddress", e.target.value)}
                      placeholder="Emergency Residential Address"
                      className={`w-full h-11 rounded-lg border px-3.5 text-sm transition-colors ${
                        attemptedNext && !(formData.emergencyAddress || "").trim()
                          ? "border-red-400 focus:ring-red-300 bg-red-50"
                          : "border-gray-300 bg-white focus:ring-[#3b82f6]/40 focus:border-[#3b82f6]"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {attemptedNext && !step2Valid && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Pakikumpleto ang lahat ng kinakailangang impormasyon sa Step 2 bago magpatuloy sa susunod na hakbang.</span>
                </div>
              )}
            </div>
          )}

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
                <p className="text-sm font-bold text-foreground">
                  {idStatus === "renewal" ? t("spDocForRenewalLabel") : idStatus === "loss" ? t("spDocForLossLabel") : t("spDocForNewLabel")}
                </p>

                <div className="space-y-6">
                  {requiredDocs.map((doc, docIndex) => (
                    <DocumentUploadRow
                      key={doc.id}
                      doc={doc}
                      docIndex={docIndex}
                      files={uploadedDocs[doc.id] || []}
                      invalid={attemptedNext && (uploadedDocs[doc.id]?.length ?? 0) === 0}
                      onUpload={(files) => handleFileUpload(doc.id, files)}
                      onRemove={(fileIndex) => handleRemoveFile(doc.id, fileIndex)}
                      onSampleClick={(d) => {
                        setSelectedSampleDoc(d)
                        setShowSampleModal(true)
                      }}
                      onCameraClick={(d) => setCameraDoc(d)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">{t("spDocFileTypeNote")}</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-foreground">{(t("pwdReviewHeader") || "REVIEW INFORMATION").toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">{t("pwdReviewDesc") || "Pakisuri nang mabuti ang lahat ng impormasyon at uploaded documents bago isumite ang aplikasyon."}</p>
              </div>

              {/* Application Details */}
              <ReviewSection title="Application Details" onEdit={() => { setReturnToReview(true); setStep(1) }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 text-xs">
                  <ReviewField
                    label="Application Type"
                    value={
                      idStatus === "new"
                        ? "New Application (Bagong Solo Parent ID)"
                        : idStatus === "renewal"
                        ? "Renewal ng Solo Parent ID"
                        : "Replacement / Lost Solo Parent ID"
                    }
                  />
                  {idStatus === "new" ? (
                    <ReviewField
                      label="Solo Parent Category / Reason"
                      value={selectedCategory ? selectedCategory.title : "—"}
                    />
                  ) : (
                    <>
                      <ReviewField
                        label="Solo Parent ID Number"
                        value={existingIdNumber || "—"}
                      />
                      <ReviewField
                        label={idStatus === "renewal" ? "Reason for Renewal" : "Reason for Replacement"}
                        value={(idStatus === "renewal" ? renewalReason : replacementReason) || "—"}
                      />
                    </>
                  )}
                  <ReviewField label="Residency Status" value="Residente ng Lungsod Quezon (Verified)" />
                </div>
              </ReviewSection>

              {/* Personal Information */}
              <ReviewSection title="Personal Information" onEdit={() => { setReturnToReview(true); setStep(2) }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 text-xs">
                  <ReviewField label="Full Name" value={fullApplicantName} />
                  <ReviewField
                    label="Date of Birth / Age"
                    value={`${[formData.dobMonth, formData.dobDay, formData.dobYear].filter(Boolean).join("/")} (${formData.age} y/o)`}
                  />
                  <ReviewField label="Sex / Gender" value={formData.sex} />
                  <ReviewField label="Civil Status" value={formData.civilStatus} />
                  <ReviewField label="Blood Type" value={formData.bloodType || "O+"} />
                  <ReviewField label="Contact Number" value={formData.contactNo} />
                  <ReviewField
                    label="Complete Address"
                    value={`${formData.addressHouseNo} ${formData.addressStreet}, Brgy. ${formData.addressBarangay}, ${formData.addressCityMunicipality}`}
                  />
                  <ReviewField label="Barangay" value={formData.addressBarangay} />
                  <ReviewField label="QCID Number" value={formData.qcidNumber} />
                  <ReviewField label="Email Address" value={formData.email || "—"} />
                  <ReviewField label="Emergency Contact" value={`${formData.emergencyFirstName} ${formData.emergencyLastName}`} />
                  <ReviewField label="Emergency Contact No." value={formData.emergencyContactNo} />
                  <ReviewField label="Emergency Relationship" value={formData.emergencyRelationship} />
                </div>
              </ReviewSection>

              {/* Uploaded Documents */}
              <ReviewSection title="Uploaded Documents" onEdit={() => { setReturnToReview(true); setStep(3) }}>
                <div className="p-4 space-y-4">
                  {requiredDocs.map((doc) => {
                    const files = uploadedDocs[doc.id] || []
                    const uploaded = files.length > 0
                    return (
                      <div key={doc.id}>
                        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                          {doc.label} <span className="text-red-500">*</span>
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
                            {files.map((file, i) => (
                              <button
                                key={`${file.name}-${i}`}
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
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-gray-50">
          {step === 1 ? (
            <div />
          ) : (
            <button onClick={goBack} className="text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
              {language === "en" ? "BACK" : language === "bis" ? "BALIK" : "BUMALIK"}
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className={`flex items-center justify-center px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
                canGoNext ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {language === "en" ? "NEXT" : language === "bis" ? "PADAYON" : "SUSUNOD"}
            </button>
          ) : (
            <button
              onClick={() => {
                setAttemptedNext(true)
                if (!canGoNext) return
                setShowConfirmModal(true)
              }}
              disabled={!canGoNext}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                canGoNext
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {language === "en" ? "SUBMIT APPLICATION" : language === "bis" ? "ISUMITE ANG APLIKASYON" : "ISUMITE ANG APLIKASYON"}
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
                <h3 className="text-base font-bold text-foreground">
                  {language === "en"
                    ? "Review Before Submission"
                    : language === "bis"
                    ? "Susiha sa Dili Pa Isumite"
                    : "Suriin Bago Isumite"}
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {language === "en"
                    ? "Please make sure that all information and uploaded documents are correct. You can still go back and make changes before submitting."
                    : language === "bis"
                    ? "Palihug siguroha nga husto ang tanang impormasyon ug gi-upload nga mga dokumento. Mahimo pa nimong balikon ug usbon sa dili pa isumite."
                    : "Pakisigurong tama ang lahat ng impormasyon at mga nai-upload na dokumento. Maaari ka pang bumalik at magbago bago tuluyang isumite."}
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
                {language === "en" ? "← GO BACK & EDIT" : language === "bis" ? "← BALIK UG BAG-OHA" : "← BUMALIK AT I-EDIT"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  handleFinalSubmit()
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <span>
                  {language === "en"
                    ? "YES, SUBMIT APPLICATION"
                    : language === "bis"
                    ? "OO, ISUMITE ANG APLIKASYON"
                    : "OO, ISUMITE ANG APLIKASYON"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Document Modal */}
      <DocumentSampleModal
        doc={selectedSampleDoc}
        isOpen={showSampleModal}
        onClose={() => {
          setShowSampleModal(false)
          setSelectedSampleDoc(null)
        }}
      />

      {/* 📸 Document Camera Capture Modal */}
      <DocumentCameraModal
        isOpen={Boolean(cameraDoc)}
        onClose={() => setCameraDoc(null)}
        docTitle={cameraDoc?.label}
        onCapture={(file) => {
          if (cameraDoc) {
            handleFileUpload(cameraDoc.id, [file])
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