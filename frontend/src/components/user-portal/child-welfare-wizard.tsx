import { useState, useEffect, type ReactNode } from "react"
import {
  Check,
  FileText,
  Upload,
  X,
  Pencil,
  Info,
  HeartHandshake,
  ShieldAlert,
  Users,
  Baby,
  Activity,
  AlertCircle,
  User,
  Camera,
  ChevronUp,
  RotateCcw,
} from "lucide-react"
import { useLanguage } from "../ui/language-context"
import { getCurrentUserProfile } from "../../utils/userProfile"
import { notifyApplicationChange, subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import { API_BASE, getAuthHeaders, getAuthToken } from "../../config/api"
import DocumentCameraModal from "../ui/document-camera-modal"

function generateReference(qcid?: string) {
  if (qcid && qcid.trim()) return qcid.trim()
  return "110000116932100"
}

export interface ChildWelfareProgram {
  id: number
  key: string
  title: string
  desc: string
  checklists: [string, string, string]
  receivedQuestion: string
  receivedOptions: string[]
  assistanceTypeLabel: string
  assistanceTypes: string[]
  whatIsIt: string
  whoIsEligible: string[]
  childRequirements: string[]
  parentRequirements: string[]
  specialRequirements: string[]
  hasProtectionConcern?: boolean
  hasEmergencyInfo?: boolean
  hasPsychosocialReason?: boolean
  hasShelterCareInfo?: boolean
  hasParentingReason?: boolean
  documents: {
    id: string
    label: string
    required: boolean
    description?: string
    sampleImage?: string
  }[]
  submitButtonText?: string
}

export const CHILD_WELFARE_PROGRAMS: ChildWelfareProgram[] = [
  {
    id: 1,
    key: "nutritional-assistance",
    title: "Nutritional Assistance",
    desc: "Provides nutritional support for children in need of nutritious food, supplementary feeding, milk or infant nutrition, nutritional supplements, and dietary counseling to improve their health and nutritional status.",
    checklists: [
      "Are you a legitimate resident of Quezon City?",
      "Are you applying for nutritional assistance for a child?",
      "Is the child currently in need of nutritional support?",
    ],
    receivedQuestion: "Have you already received nutritional assistance from another Quezon City office? *",
    receivedOptions: ["Yes, I already received nutritional assistance", "Not yet"],
    assistanceTypeLabel: "Choose the type of assistance *",
    assistanceTypes: [
      "Food Pack / Nutritious Food",
      "Supplementary Feeding",
      "Milk / Infant Nutrition",
      "Nutritional Supplements",
      "Nutrition Education / Counseling",
    ],
    whatIsIt: "The Nutritional Assistance Program provides support to children who need nutritious food packs, supplementary feeding, milk or infant nutrition, nutritional supplements, and proper nutrition guidance to improve their health and wellbeing.",
    whoIsEligible: [
      "Children residing in Quezon City who are in need of nutritional assistance.",
      "Children with specific nutritional needs or at risk of malnutrition.",
      "Applications may be submitted by the parent or legal guardian of the child.",
    ],
    childRequirements: [
      "PSA Birth Certificate of the Child",
    ],
    parentRequirements: [
      "QCID or Valid Government ID",
      "Proof of Residency",
      "Contact Information",
    ],
    specialRequirements: [
      "Nutrition / Supplementary Feeding Assessment",
    ],
    documents: [
      { id: "psaBirthCert", label: "PSA Birth Certificate of the Child", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
      { id: "parentId", label: "Valid ID of Parent/Guardian", required: true, sampleImage: "/samples/sample_valid_id.png" },
      { id: "proofResidency", label: "Proof of Residency", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
    ],
    submitButtonText: "SUBMIT APPLICATION",
  },
  {
    id: 2,
    key: "child-protection",
    title: "Child Protection Assistance",
    desc: "Provides protection, intervention, legal and case referral, and psychosocial support for children experiencing or at risk of abuse, neglect, exploitation, violence, or other safety concerns.",
    checklists: [
      "Are you a legitimate resident of Quezon City?",
      "Are you applying for child protection assistance for a child?",
      "Is the child currently experiencing a protection or safety concern?",
    ],
    receivedQuestion: "Have you already received child protection assistance from another Quezon City office? *",
    receivedOptions: ["Yes, I already received assistance", "Not yet"],
    assistanceTypeLabel: "Choose the type of assistance *",
    assistanceTypes: [
      "Child Protection / Safety Assistance",
      "Emergency Child Assistance",
      "Temporary Shelter / Protective Custody Referral",
      "Legal / Case Referral Assistance",
      "Psychosocial Support / Counseling Referral",
    ],
    whatIsIt: "The Child Protection Assistance Program provides comprehensive protection, intervention, counseling, and legal referral for children facing abuse, neglect, violence, exploitation, or urgent welfare concerns.",
    whoIsEligible: [
      "Children residing in Quezon City in need of child protection services.",
      "Children experiencing or at risk of abuse, neglect, exploitation, violence, or safety issues.",
      "Applications or reports may be filed by parents, guardians, relatives, or authorized reporting individuals.",
    ],
    childRequirements: [
      "PSA Birth Certificate of the Child",
      "Proof of Residency",
    ],
    parentRequirements: [
      "QCID or Valid Government ID",
      "Contact Information",
    ],
    specialRequirements: [
      "Case Information / Protection Report",
    ],
    hasProtectionConcern: true,
    documents: [
      { id: "psaBirthCert", label: "PSA Birth Certificate of the Child", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
      { id: "parentId", label: "Valid ID of Parent/Guardian/Reporting Person", required: true, sampleImage: "/samples/sample_valid_id.png" },
      { id: "proofResidency", label: "Proof of Residency", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
    ],
    submitButtonText: "SUBMIT APPLICATION",
  },
  {
    id: 3,
    key: "emergency-assistance",
    title: "Emergency Assistance",
    desc: "Provides immediate intervention and emergency aid for children facing crisis situations, including emergency food, medical aid, temporary shelter, transportation, and urgent protection.",
    checklists: [
      "Are you a legitimate resident of Quezon City?",
      "Are you requesting emergency assistance for a child?",
      "Is the child currently experiencing an emergency or immediate need?",
    ],
    receivedQuestion: "Is the child currently in immediate danger or in need of urgent assistance? *",
    receivedOptions: ["Yes", "No"],
    assistanceTypeLabel: "Choose the type of assistance *",
    assistanceTypes: [
      "Emergency Food Assistance",
      "Emergency Medical Assistance",
      "Emergency Transportation Assistance",
      "Emergency Shelter Assistance",
      "Emergency Protection / Intervention",
    ],
    whatIsIt: "The Emergency Assistance Program delivers urgent intervention and rapid response relief for children caught in crisis, medical emergencies, disasters, or critical safety situations.",
    whoIsEligible: [
      "Children residing in Quezon City in immediate need of emergency assistance.",
      "Children facing emergencies affecting their immediate health, safety, food security, or shelter.",
      "Requests may be submitted by parents, guardians, relatives, or authorized first responders.",
    ],
    childRequirements: [
      "PSA Birth Certificate of the Child",
      "Proof of Residency",
    ],
    parentRequirements: [
      "QCID or Valid Government ID",
      "Contact Information",
    ],
    specialRequirements: [
      "Emergency Assessment Information",
    ],
    hasEmergencyInfo: true,
    documents: [
      { id: "psaBirthCert", label: "PSA Birth Certificate of the Child", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
      { id: "parentId", label: "Valid ID of Parent/Guardian", required: true, sampleImage: "/samples/sample_valid_id.png" },
      { id: "proofResidency", label: "Proof of Residency", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
    ],
    submitButtonText: "SUBMIT EMERGENCY REQUEST",
  },
]

export function getLocalizedChildWelfarePrograms(language: string): ChildWelfareProgram[] {
  if (language === "tl") {
    return [
      {
        id: 1,
        key: "nutritional-assistance",
        title: "Tulong sa Nutrisyon",
        desc: "Nagbibigay ng suporta sa mga batang nangangailangan ng masustansyang pagkain, supplementary feeding, gatas o infant nutrition, nutritional supplements, at gabay tungkol sa wastong nutrisyon upang makatulong sa kanilang kalusugan at nutritional status.",
        checklists: [
          "Ikaw ba ay lehitimong residente ng Quezon City?",
          "Nag-a-apply ka ba para sa tulong sa nutrisyon para sa bata?",
          "Kasalukuyan bang nangangailangan ng suporta sa nutrisyon ang bata?",
        ],
        receivedQuestion: "Nakatanggap ka na ba ng tulong sa nutrisyon mula sa ibang opisina ng Quezon City? *",
        receivedOptions: ["Oo, nakatanggap na ako ng tulong sa nutrisyon", "Hindi pa"],
        assistanceTypeLabel: "Piliin ang uri ng tulong *",
        assistanceTypes: [
          "Food Pack / Masustansyang Pagkain",
          "Supplementary Feeding",
          "Gatas / Infant Nutrition",
          "Nutritional Supplements",
          "Edukasyon sa Nutrisyon / Counseling",
        ],
        whatIsIt: "Ang Nutritional Assistance Program ay nagbibigay ng suporta sa mga batang nangangailangan ng masustansyang pagkain, supplementary feeding, gatas o infant nutrition, nutritional supplements, at gabay tungkol sa wastong nutrisyon upang makatulong sa kanilang kalusugan at nutritional status.",
        whoIsEligible: [
          "Mga batang residente ng Quezon City na nangangailangan ng nutritional assistance.",
          "Mga batang may nutritional needs o nasa panganib ng malnutrition.",
          "Ang aplikasyon ay maaaring isumite ng magulang o legal na guardian ng bata.",
        ],
        childRequirements: [
          "PSA Birth Certificate ng Bata",
        ],
        parentRequirements: [
          "QCID o Valid ID ng Magulang / Guardian",
          "Katibayan ng Paninirahan (Proof of Residency)",
          "Impormasyon sa Pakikipag-ugnayan (Contact Information)",
        ],
        specialRequirements: [
          "Nutrition / Supplementary Feeding Assessment",
        ],
        documents: [
          { id: "psaBirthCert", label: "PSA Birth Certificate ng Bata", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
          { id: "parentId", label: "Valid ID ng Magulang / Guardian", required: true, sampleImage: "/samples/sample_valid_id.png" },
          { id: "proofResidency", label: "Katibayan ng Paninirahan (Proof of Residency)", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
        ],
        submitButtonText: "ISUMITE ANG APLIKASYON",
      },
      {
        id: 2,
        key: "child-protection",
        title: "Tulong sa Proteksyon ng Bata",
        desc: "Nagbibigay ng proteksyon, intervention, referral, at iba pang kinakailangang suporta para sa mga batang nakakaranas o nasa panganib ng abuse, neglect, exploitation, violence, o iba pang child protection concerns.",
        checklists: [
          "Ikaw ba ay lehitimong residente ng Quezon City?",
          "Nag-a-apply ka ba para sa proteksyon ng bata?",
          "Kasalukuyan bang may banta sa kaligtasan o proteksyon ang bata?",
        ],
        receivedQuestion: "Nakatanggap ka na ba ng tulong sa proteksyon mula sa ibang opisina ng Quezon City? *",
        receivedOptions: ["Oo, nakatanggap na ako ng tulong", "Hindi pa"],
        assistanceTypeLabel: "Piliin ang uri ng tulong *",
        assistanceTypes: [
          "Tulong sa Proteksyon / Kaligtasan ng Bata",
          "Pang-emerhensiyang Tulong sa Bata",
          "Temporary Shelter / Protective Custody Referral",
          "Tulong Legal / Case Referral",
          "Psychosocial Support / Counseling Referral",
        ],
        whatIsIt: "Ang Child Protection Assistance Program ay nagbibigay ng proteksyon, intervention, referral, at iba pang kinakailangang suporta para sa mga batang nakakaranas o nasa panganib ng abuse, neglect, exploitation, violence, o iba pang child protection concerns.",
        whoIsEligible: [
          "Mga batang residente ng Quezon City na nangangailangan ng child protection services.",
          "Mga batang nakakaranas o nasa panganib ng abuse, neglect, exploitation, violence, o iba pang safety concerns.",
          "Maaaring magsumite ng aplikasyon o referral ang magulang, legal guardian, kamag-anak, o authorized reporting person, depende sa sitwasyon.",
        ],
        childRequirements: [
          "PSA Birth Certificate ng Bata",
          "Katibayan ng Paninirahan (Proof of Residency)",
        ],
        parentRequirements: [
          "QCID o Valid ID ng Magulang / Guardian / Nag-uulat",
          "Impormasyon sa Pakikipag-ugnayan",
        ],
        specialRequirements: [
          "Case Information / Protection Report",
        ],
        hasProtectionConcern: true,
        documents: [
          { id: "psaBirthCert", label: "PSA Birth Certificate ng Bata", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
          { id: "parentId", label: "Valid ID ng Magulang / Guardian / Nag-uulat", required: true, sampleImage: "/samples/sample_valid_id.png" },
          { id: "proofResidency", label: "Katibayan ng Paninirahan (Proof of Residency)", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
        ],
        submitButtonText: "ISUMITE ANG APLIKASYON",
      },
      {
        id: 3,
        key: "emergency-assistance",
        title: "Pang-emerhensiyang Tulong",
        desc: "Nagbibigay ng agarang tulong at intervention sa mga batang nakakaranas ng emergency o agarang pangangailangan, kabilang ang medical, food, transportation, shelter, at protection concerns.",
        checklists: [
          "Ikaw ba ay lehitimong residente ng Quezon City?",
          "Humihiling ka ba ng pang-emerhensiyang tulong para sa bata?",
          "Kasalukuyan bang nakakaranas ng emergency o agarang pangangailangan ang bata?",
        ],
        receivedQuestion: "Kasalukuyan bang nasa agarang panganib o nangangailangan ng agarang saklolo ang bata? *",
        receivedOptions: ["Oo", "Hindi"],
        assistanceTypeLabel: "Piliin ang uri ng tulong *",
        assistanceTypes: [
          "Pang-emerhensiyang Tulong sa Pagkain",
          "Pang-emerhensiyang Tulong Medikal",
          "Pang-emerhensiyang Tulong sa Transportasyon",
          "Pang-emerhensiyang Silungan",
          "Pang-emerhensiyang Proteksyon / Intervention",
        ],
        whatIsIt: "Ang Emergency Assistance Program ay nagbibigay ng agarang tulong at intervention sa mga batang nakakaranas ng emergency o agarang pangangailangan, kabilang ang medical, food, transportation, shelter, at protection concerns.",
        whoIsEligible: [
          "Mga batang residente ng Quezon City na nangangailangan ng agarang tulong o saklolo.",
          "Mga batang nakakaranas ng emergency o sitwasyong maaaring makaapekto sa kanilang kaligtasan, kalusugan, o pangunahing pangangailangan.",
          "Maaaring magsumite ng request ang magulang, legal guardian, kamag-anak, o authorized person.",
        ],
        childRequirements: [
          "PSA Birth Certificate ng Bata",
          "Katibayan ng Paninirahan (Proof of Residency)",
        ],
        parentRequirements: [
          "QCID o Valid ID ng Magulang / Guardian",
          "Impormasyon sa Pakikipag-ugnayan",
        ],
        specialRequirements: [
          "Emergency Assessment Information",
        ],
        hasEmergencyInfo: true,
        documents: [
          { id: "psaBirthCert", label: "PSA Birth Certificate ng Bata", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
          { id: "parentId", label: "Valid ID ng Magulang / Guardian", required: true, sampleImage: "/samples/sample_valid_id.png" },
          { id: "proofResidency", label: "Katibayan ng Paninirahan (Proof of Residency)", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
        ],
        submitButtonText: "ISUMITE ANG APLIKASYON",
      },
    ]
  }

  if (language === "bis") {
    return [
      {
        id: 1,
        key: "nutritional-assistance",
        title: "Tabang sa Nutrisyon",
        desc: "Naghatag og tabang sa mga bata nga nagkinahanglan og masustansyang pagkaon, supplementary feeding, gatas o infant nutrition, nutritional supplements, ug giya sa nutrisyon.",
        checklists: [
          "Ikaw ba usa ka lehitimong residente sa Quezon City?",
          "Nag-apply ba ka og tabang sa nutrisyon para sa bata?",
          "Kasamtangan ba nga nagkinahanglan og tabang sa nutrisyon ang bata?",
        ],
        receivedQuestion: "Nakadawat na ba ka og tabang sa nutrisyon gikan sa laing opisina sa Quezon City? *",
        receivedOptions: ["Oo, nakadawat na ko og tabang sa nutrisyon", "Wala pa"],
        assistanceTypeLabel: "Pilia ang matang sa tabang *",
        assistanceTypes: [
          "Food Pack / Masustansyang Pagkaon",
          "Supplementary Feeding",
          "Gatas / Infant Nutrition",
          "Nutritional Supplements",
          "Edukasyon sa Nutrisyon / Counseling",
        ],
        whatIsIt: "Ang Nutritional Assistance Program naghatag og tabang sa mga bata nga nagkinahanglan og masustansyang pagkaon, supplementary feeding, gatas o infant nutrition, nutritional supplements, ug giya sa nutrisyon aron mapalambo ang ilang kahimsog.",
        whoIsEligible: [
          "Mga bata nga residente sa Quezon City nga nagkinahanglan og tabang sa nutrisyon.",
          "Mga bata nga adunay partikular nga panginahanglan sa nutrisyon o anaa sa peligro sa malnutrisyon.",
          "Ang aplikasyon mahimong isumite sa ginikanan o legal nga guardian sa bata.",
        ],
        childRequirements: [
          "PSA Birth Certificate sa Bata",
        ],
        parentRequirements: [
          "QCID o Balido nga ID sa Ginikanan / Guardian",
          "Katibayan sa Pagpuyo (Proof of Residency)",
          "Impormasyon sa Pakig-kontak (Contact Information)",
        ],
        specialRequirements: [
          "Nutrition / Supplementary Feeding Assessment",
        ],
        documents: [
          { id: "psaBirthCert", label: "PSA Birth Certificate sa Bata", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
          { id: "parentId", label: "Balido nga ID sa Ginikanan / Guardian", required: true, sampleImage: "/samples/sample_valid_id.png" },
          { id: "proofResidency", label: "Katibayan sa Pagpuyo (Proof of Residency)", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
        ],
        submitButtonText: "ISUMITE ANG APLIKASYON",
      },
      {
        id: 2,
        key: "child-protection",
        title: "Tabang sa Proteksyon sa Bata",
        desc: "Naghatag og proteksyon, intervention, referral, ug suporta para sa mga bata nga nag-atubang o anaa sa peligro sa pang-abuso, kapabayaan, o kapintasan.",
        checklists: [
          "Ikaw ba usa ka lehitimong residente sa Quezon City?",
          "Nag-apply ba ka para sa proteksyon sa bata?",
          "Kasamtangan ba nga dunay kabalaka sa kaluwasan o proteksyon ang bata?",
        ],
        receivedQuestion: "Nakadawat na ba ka og tabang sa proteksyon gikan sa laing opisina sa Quezon City? *",
        receivedOptions: ["Oo, nakadawat na ko og tabang", "Wala pa"],
        assistanceTypeLabel: "Pilia ang matang sa tabang *",
        assistanceTypes: [
          "Tabang sa Proteksyon / Kaluwasan sa Bata",
          "Pang-emerhensya nga Tabang sa Bata",
          "Temporary Shelter / Protective Custody Referral",
          "Tabang Legal / Case Referral",
          "Psychosocial Support / Counseling Referral",
        ],
        whatIsIt: "Ang Child Protection Assistance Program naghatag og proteksyon, intervention, referral, ug suporta para sa mga bata nga nag-atubang o anaa sa peligro sa pang-abuso, kapabayaan, o kapintasan.",
        whoIsEligible: [
          "Mga bata nga residente sa Quezon City nga nagkinahanglan og proteksyon.",
          "Mga bata nga nakasinati o anaa sa peligro sa pang-abuso, kapabayaan, o kapintasan.",
          "Mahimong magsumite og aplikasyon ang ginikanan, legal nga guardian, paryente, o tig-report.",
        ],
        childRequirements: [
          "PSA Birth Certificate sa Bata",
          "Katibayan sa Pagpuyo (Proof of Residency)",
        ],
        parentRequirements: [
          "QCID o Balido nga ID sa Ginikanan / Guardian / Tig-report",
          "Impormasyon sa Pakig-kontak",
        ],
        specialRequirements: [
          "Case Information / Protection Report",
        ],
        hasProtectionConcern: true,
        documents: [
          { id: "psaBirthCert", label: "PSA Birth Certificate sa Bata", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
          { id: "parentId", label: "Balido nga ID sa Ginikanan / Nag-report", required: true, sampleImage: "/samples/sample_valid_id.png" },
          { id: "proofResidency", label: "Katibayan sa Pagpuyo (Proof of Residency)", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
        ],
        submitButtonText: "ISUMITE ANG APLIKASYON",
      },
      {
        id: 3,
        key: "emergency-assistance",
        title: "Pang-emerhensya nga Tabang",
        desc: "Naghatag og dinalian nga tabang ug intervention sa mga bata nga nag-atubang og emerhensya o dinaliang panginahanglan, lakip ang medikal, pagkaon, kapasilongan, ug proteksyon.",
        checklists: [
          "Ikaw ba usa ka lehitimong residente sa Quezon City?",
          "Nangayo ba ka og pang-emerhensya nga tabang para sa bata?",
          "Kasamtangan ba nga nakasinati og emerhensya o dinaliang panginahanglan ang bata?",
        ],
        receivedQuestion: "Kasamtangan ba nga anaa sa dinaliang peligro o nagkinahanglan og dinalian nga tabang ang bata? *",
        receivedOptions: ["Oo", "Dili"],
        assistanceTypeLabel: "Pilia ang matang sa tabang *",
        assistanceTypes: [
          "Pang-emerhensya nga Tabang sa Pagkaon",
          "Pang-emerhensya nga Tabang Medikal",
          "Pang-emerhensya nga Tabang sa Transportasyon",
          "Pang-emerhensya nga Kapasilongan",
          "Pang-emerhensya nga Proteksyon / Intervention",
        ],
        whatIsIt: "Ang Emergency Assistance Program naghatag og dinalian nga tabang ug intervention sa mga bata nga nag-atubang og emerhensya o dinaliang panginahanglan, lakip ang medikal, pagkaon, kapasilongan, ug proteksyon.",
        whoIsEligible: [
          "Mga bata nga residente sa Quezon City nga nagkinahanglan og dinalian nga tabang o saklolo.",
          "Mga bata nga nag-atubang og emerhensya nga makaapekto sa ilang kaluwasan, kahimsog, o pangunang panginahanglan.",
          "Mahimong magsumite og hangyo ang ginikanan, legal nga guardian, paryente, o otorisadong tawo.",
        ],
        childRequirements: [
          "PSA Birth Certificate sa Bata",
          "Katibayan sa Pagpuyo (Proof of Residency)",
        ],
        parentRequirements: [
          "QCID o Balido nga ID sa Ginikanan / Guardian",
          "Impormasyon sa Pakig-kontak",
        ],
        specialRequirements: [
          "Emergency Assessment Information",
        ],
        hasEmergencyInfo: true,
        documents: [
          { id: "psaBirthCert", label: "PSA Birth Certificate sa Bata", required: true, sampleImage: "/samples/BIRTH CERTIFICATE OF MINOR.jpg" },
          { id: "parentId", label: "Balido nga ID sa Ginikanan / Guardian", required: true, sampleImage: "/samples/sample_valid_id.png" },
          { id: "proofResidency", label: "Katibayan sa Pagpuyo (Proof of Residency)", required: true, sampleImage: "/samples/PROOF OF RESIDENCE.webp" },
        ],
        submitButtonText: "ISUMITE ANG APLIKASYON",
      },
    ]
  }

  return CHILD_WELFARE_PROGRAMS
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0.0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export interface UserProfile {
  userId?: string
  qcidNo?: string
  qcidNumber?: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  nationality?: string
  dobMonth?: string
  dobDay?: string
  dobYear?: string
  birthMonth?: string
  birthDay?: string
  birthYear?: string
  age?: string | number
  sex?: string
  civilStatus?: string
  addressHouseNo?: string
  houseNo?: string
  addressStreet?: string
  street?: string
  addressBarangay?: string
  barangay?: string
  addressCityMunicipality?: string
  city?: string
  contactNo?: string
  mobileNumber?: string
  email?: string
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
  return <FileText className="h-8 w-8 text-gray-400" />
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate pr-2">{title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 max-h-[65vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
          {isImage && previewUrl ? (
            <img src={previewUrl} alt={title} className="max-w-full max-h-[55vh] rounded-lg border border-gray-200 object-contain shadow-xs" />
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-500">
              <FileText className="h-12 w-12 text-blue-500" />
              <p className="text-sm font-medium">{file.name}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 text-xs text-gray-500 truncate bg-white">
          {file.name}
        </div>
      </div>
    </div>
  )
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{value || "—"}</p>
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
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer"
        >
          <ChevronUp className={`h-4 w-4 text-gray-500 transition-transform ${open ? "" : "rotate-180"}`} />
          {title}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
          <span>{t("editButton")?.toUpperCase() || "I-EDIT"}</span>
        </button>
      </div>
      {open && children}
    </div>
  )
}

interface ChildWelfareWizardProps {
  onBack?: () => void
  userProfile?: UserProfile
  initialProgramId?: number
  initialProgramKey?: string
  onStepChange?: (step: number) => void
  onSubmissionStageChange?: (stage: "form" | "matching" | "pending", status?: string) => void
}

export default function ChildWelfareApplicationWizard({
  onBack,
  userProfile: propUserProfile,
  initialProgramId,
  initialProgramKey,
  onStepChange,
  onSubmissionStageChange,
}: ChildWelfareWizardProps) {
  const { t, language } = useLanguage()
  const [profile, setProfile] = useState(() => (propUserProfile || getCurrentUserProfile()) as any)

  useEffect(() => {
    const handleProfileUpdate = () => {
      const p = getCurrentUserProfile() as any
      setProfile(p)
      if (p) {
        const d = getProfileData(p)
        setFormData((prev) => ({
          ...prev,
          qcidNumber: d.qcidNumber || prev.qcidNumber,
          firstName: d.firstName || prev.firstName,
          middleName: d.middleName || prev.middleName,
          lastName: d.lastName || prev.lastName,
          suffix: d.suffix || prev.suffix,
          nationality: d.nationality || prev.nationality || "FILIPINO",
          dobMonth: d.dobMonth || prev.dobMonth,
          dobDay: d.dobDay || prev.dobDay,
          dobYear: d.dobYear || prev.dobYear,
          age: d.age || prev.age,
          sex: d.sex || prev.sex,
          civilStatus: d.civilStatus || prev.civilStatus,
          addressHouseNo: d.addressHouseNo || prev.addressHouseNo,
          addressStreet: d.addressStreet || prev.addressStreet,
          barangay: d.barangay || prev.barangay,
          city: d.city || prev.city,
          contactNo: d.contactNo || prev.contactNo,
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
    { id: 1, label: t("cwStepChecklist") || (language === "tl" ? "KUMPLETUHIN ANG CHECKLIST" : language === "bis" ? "KUMPLETOHA ANG CHECKLIST" : "COMPLETE CHECKLIST") },
    { id: 2, label: t("cwStepPersonal") || (language === "tl" ? "PERSONAL NA IMPORMASYON" : language === "bis" ? "PERSONAL NGA IMPORMASYON" : "PERSONAL INFORMATION") },
    { id: 3, label: t("pwdStepDocuments") ? t("pwdStepDocuments").toUpperCase() : "SAMPLE DOCUMENTS" },
    { id: 4, label: t("cwStepReview") || (language === "tl" ? "SURIIN AT ISUMITE" : language === "bis" ? "SUSIHA UG ISUMITE" : "REVIEW & SUBMIT") },
  ]

  const [step, setStep] = useState(1)
  const [returnToReview, setReturnToReview] = useState(false)

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  const [attemptedNext, setAttemptedNext] = useState(false)
  const [showSampleModal, setShowSampleModal] = useState(false)
  const [selectedSampleDoc, setSelectedSampleDoc] = useState<{ id: string; label: string; sampleImage?: string; description?: string } | null>(null)
  const [cameraDoc, setCameraDoc] = useState<{ id: string; label: string } | null>(null)
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; file: File } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const currentPrograms = getLocalizedChildWelfarePrograms(language)

  // Step 1: Program selection & Checklist
  const [selectedProgramId, setSelectedProgramId] = useState<number>(() => {
    if (initialProgramId) return initialProgramId
    if (initialProgramKey) {
      const found = currentPrograms.find((p) => p.key === initialProgramKey)
      if (found) return found.id
    }
    return 1
  })

  useEffect(() => {
    if (initialProgramId) {
      setSelectedProgramId(initialProgramId)
    } else if (initialProgramKey) {
      const found = currentPrograms.find((p) => p.key === initialProgramKey)
      if (found) setSelectedProgramId(found.id)
    }
  }, [initialProgramId, initialProgramKey])

  const selectedProgram = currentPrograms.find((p) => p.id === selectedProgramId) || currentPrograms[0]

  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [check3, setCheck3] = useState(false)
  const [selectedAssistanceType, setSelectedAssistanceType] = useState<string>("")

  // Sync assistance type when program changes only if not matching
  useEffect(() => {
    if (selectedProgram && selectedAssistanceType && !selectedProgram.assistanceTypes.includes(selectedAssistanceType)) {
      setSelectedAssistanceType("")
    }
  }, [selectedProgramId, language])

  // Step 2: Personal / Beneficiary Information
  const parseProfileDob = (prof: any) => {
    let month = prof?.dobMonth || ""
    let day = prof?.dobDay || prof?.birthDay || ""
    let year = prof?.dobYear || prof?.birthYear || ""

    const rawDob = prof?.birthDateIso || prof?.birthDate || prof?.dateOfBirth || prof?.dob || ""
    if (typeof rawDob === "string" && rawDob.trim()) {
      if (rawDob.includes("-")) {
        const parts = rawDob.split("-")
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            year = parts[0]
            month = parts[1]
            day = parts[2]
          } else {
            month = parts[0]
            day = parts[1]
            year = parts[2]
          }
        }
      } else if (rawDob.includes("/")) {
        const parts = rawDob.split("/")
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            month = parts[0]
            day = parts[1]
            year = parts[2]
          } else if (parts[0].length === 4) {
            year = parts[0]
            month = parts[1]
            day = parts[2]
          }
        }
      }
    } else if (prof?.birthMonth) {
      const mStr = String(prof.birthMonth).toUpperCase()
      const MONTHS_MAP: Record<string, string> = {
        JANUARY: "01", JAN: "01", ENERO: "01",
        FEBRUARY: "02", FEB: "02", PEBRERO: "02",
        MARCH: "03", MAR: "03", MARSO: "03",
        APRIL: "04", APR: "04", ABRIL: "04",
        MAY: "05", MAYO: "05",
        JUNE: "06", JUN: "06", HUNYO: "06",
        JULY: "07", JUL: "07", HULYO: "07",
        AUGUST: "08", AUG: "08", AGOSTO: "08",
        SEPTEMBER: "09", SEP: "09", SETYEMBRE: "09",
        OCTOBER: "10", OCT: "10", OKTUBRE: "10",
        NOVEMBER: "11", NOV: "11", NOBYEMBRE: "11",
        DECEMBER: "12", DEC: "12", DISYEMBRE: "12",
      }
      month = MONTHS_MAP[mStr] || (mStr.match(/^\d+$/) ? mStr.padStart(2, "0") : "01")
    }

    return {
      month: month ? String(month).padStart(2, "0") : "",
      day: day ? String(day).padStart(2, "0") : "",
      year: year ? String(year) : "",
    }
  }

  const formatSex = (prof: any) => {
    const rawSex = String(prof?.sex || prof?.gender || "").toUpperCase()
    if (rawSex.includes("FEMALE") || rawSex.includes("BABAE")) return "Female"
    if (rawSex.includes("MALE") || rawSex.includes("LALAKI")) return "Male"
    return ""
  }

  const getProfileData = (prof: any) => {
    const p = prof || {}
    const dob = parseProfileDob(p)
    return {
      qcidNumber: p.qcidNo || p.qcidNumber || p.qcid || "",
      firstName: p.firstName || "",
      middleName: p.middleName || "",
      lastName: p.lastName || "",
      suffix: p.suffix || "",
      nationality: p.nationality || "FILIPINO",
      dobMonth: dob.month,
      dobDay: dob.day,
      dobYear: dob.year,
      age: p.age !== undefined && p.age !== null && p.age !== "" ? String(p.age) : "",
      sex: formatSex(p),
      civilStatus: p.civilStatus || "Single",
      addressHouseNo: p.addressHouseNo || p.houseNo || "",
      addressStreet: p.addressStreet || p.street || "",
      barangay: p.addressBarangay || p.barangay || "Sauyo",
      city: p.addressCityMunicipality || p.city || "Quezon City",
      contactNo: p.contactNo || p.mobileNumber || "",
      email: "", // User explicitly requested not to include email/gmail in applicant info
    }
  }

  const initialProfile = userProfile || getCurrentUserProfile() || ({} as any)
  const initialData = getProfileData(initialProfile)

  const [formData, setFormData] = useState({
    // I. Applicant / Child Information (pre-filled from profile)
    qcidNumber: initialData.qcidNumber,
    firstName: initialData.firstName,
    middleName: initialData.middleName,
    lastName: initialData.lastName,
    suffix: initialData.suffix,
    nationality: initialData.nationality,
    dobMonth: initialData.dobMonth,
    dobDay: initialData.dobDay,
    dobYear: initialData.dobYear,
    age: initialData.age,
    sex: initialData.sex,
    civilStatus: initialData.civilStatus,
    addressHouseNo: initialData.addressHouseNo,
    addressStreet: initialData.addressStreet,
    barangay: initialData.barangay,
    city: initialData.city,
    contactNo: initialData.contactNo,
    email: "",

    // II. Parent / Guardian / Reporting Person
    parentFullName: "",
    parentRelationship: "",
    parentContactNo: "",
    isReportingPersonCurrentParent: "Yes",
    specifiedRelationship: "",

    // Specific concern / details
    reasonForRequest: "",
    briefDescription: "",
    isImmediateDanger: "No",
    isChildSafe: "Yes",
    isParentAvailable: "Yes",
    emergencyType: "Emergency Medical Assistance",
    emergencyDate: "",
    emergencyTime: "",
    emergencyDateTime: "",
    reportEmergencyPriority: true,
    currentLivingSituation: "",

    // Certification
    certifiedCorrect: false,
  })

  // Sync profile when userProfile changes or loads
  useEffect(() => {
    const prof: any = userProfile || getCurrentUserProfile()
    if (prof) {
      const data = getProfileData(prof)
      setFormData((prev) => ({
        ...prev,
        qcidNumber: prev.qcidNumber || data.qcidNumber,
        firstName: prev.firstName || data.firstName,
        middleName: prev.middleName || data.middleName,
        lastName: prev.lastName || data.lastName,
        suffix: prev.suffix || data.suffix,
        nationality: prev.nationality || data.nationality,
        dobMonth: prev.dobMonth || data.dobMonth,
        dobDay: prev.dobDay || data.dobDay,
        dobYear: prev.dobYear || data.dobYear,
        age: prev.age || data.age,
        sex: prev.sex || data.sex,
        civilStatus: prev.civilStatus || data.civilStatus,
        addressHouseNo: prev.addressHouseNo || data.addressHouseNo,
        addressStreet: prev.addressStreet || data.addressStreet,
        barangay: prev.barangay || data.barangay,
        city: prev.city || data.city,
        contactNo: prev.contactNo || data.contactNo,
      }))
    }
  }, [userProfile])

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Step 3: Documents
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})

  const handleFileUpload = (docId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    setUploadedFiles((prev) => ({
      ...prev,
      [docId]: [fileArray[0]],
    }))
  }

  const removeFile = (docId: string, index: number) => {
    setUploadedFiles((prev) => {
      const current = prev[docId] || []
      const updated = current.filter((_, i) => i !== index)
      return { ...prev, [docId]: updated }
    })
  }

  // Submission State
  const [submissionStage, setSubmissionStage] = useState<"form" | "matching" | "pending">("form")
  const [appStatus, setAppStatus] = useState<"pending" | "approved" | "rejected">("pending")
  const [reference, setReference] = useState("")
  const [isReapplying, setIsReapplying] = useState(() => {
    try {
      const progKey = initialProgramKey || "nutritional-assistance"
      const progId = initialProgramId || 1
      const isUrlParam = typeof window !== "undefined" && window.location.search.includes("reapply=true")
      const isLocal =
        localStorage.getItem(`cw_reapplying_${progKey}`) === "true" ||
        localStorage.getItem(`cw_reapplying_${progId}`) === "true"
      return Boolean(isUrlParam || isLocal)
    } catch {
      return false
    }
  })

  // Keep state synced with selectedProgram & localStorage
  useEffect(() => {
    try {
      const isLocal =
        localStorage.getItem(`cw_reapplying_${selectedProgram.key}`) === "true" ||
        localStorage.getItem(`cw_reapplying_${selectedProgram.id}`) === "true"
      if (isLocal) {
        setIsReapplying(true)
        setSubmissionStage("form")
      }
    } catch {}
  }, [selectedProgram.id, selectedProgram.key])

  const handleReapply = () => {
    try {
      localStorage.setItem(`cw_reapplying_${selectedProgram.key}`, "true")
      localStorage.setItem(`cw_reapplying_${selectedProgram.id}`, "true")
    } catch {}
    setIsReapplying(true)
    setSubmissionStage("form")
    setStep(1)
    setReference("")
    setUploadedFiles({})
    setCheck1(false)
    setCheck2(false)
    setCheck3(false)
    setSelectedAssistanceType("")
    try {
      ;(window as any).__isFormDirty = false
    } catch {}
  }

  // Reload / Navigation warning protection — active when user has entered form inputs or reached steps 2-4
  const isFormDirty =
    submissionStage === "form" &&
    (
      step >= 2 ||
      formData.parentFullName.trim() !== "" ||
      formData.parentContactNo.trim() !== "" ||
      formData.briefDescription.trim() !== "" ||
      formData.emergencyDate.trim() !== "" ||
      formData.emergencyTime.trim() !== "" ||
      formData.reasonForRequest.trim() !== "" ||
      Object.values(uploadedFiles).some((files) => files && files.length > 0)
    )

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

  // Listen to active user application status in Child Welfare
  useEffect(() => {
    if (isReapplying) return
    let active = true
    const checkActiveApplication = async () => {
      if (isReapplying) return
      try {
        const prof = getCurrentUserProfile()
        const uid = prof.id || (userProfile as any)?.id || (userProfile as any)?.userId || ""
        const token = localStorage.getItem("token")
        const headers: Record<string, string> = {}
        if (token) headers["Authorization"] = `Bearer ${token}`

        if (uid && uid !== "0") {
          const res = await fetch(`${API_BASE}/api/child-welfare/user/${uid}`, { headers })
          if (res.ok) {
            const data = await res.json()
            if (active && !isReapplying) {
              const applications = data.applications || []
              const matched = applications.find((a: any) => {
                if (!a) return false
                const aCatId = String(a.category_id || "")
                const aTitle = String(a.category_title || "").toLowerCase().trim()
                const progId = String(selectedProgram.id)
                const progTitle = selectedProgram.title.toLowerCase().trim()
                const progKey = selectedProgram.key.toLowerCase().trim()

                const idMatch = aCatId === progId
                const titleMatch = aTitle.includes(progTitle) || progTitle.includes(aTitle) || aTitle === progKey
                return idMatch || titleMatch
              })

              if (matched && ["pending", "approved", "rejected"].includes(matched.application_status)) {
                setSubmissionStage("pending")
                setAppStatus(matched.application_status as any)
                if (matched.reference_number) setReference(matched.reference_number)
                if (matched.support_types && matched.support_types.length > 0) {
                  const st = Array.isArray(matched.support_types) ? matched.support_types[0] : matched.support_types
                  setSelectedAssistanceType(st)
                }
                return
              } else {
                setSubmissionStage("form")
              }
            }
          }
        }
      } catch (err) {
        console.warn("Error checking child welfare application status:", err)
      }
    }

    checkActiveApplication()
    const unsubscribe = subscribeToRealtimeChanges(() => {
      if (!isReapplying) checkActiveApplication()
    })

    const handleUpdate = () => {
      if (!isReapplying) checkActiveApplication()
    }
    window.addEventListener("child_welfare_applications_updated", handleUpdate)
    window.addEventListener("applications_updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)

    return () => {
      active = false
      unsubscribe()
      window.removeEventListener("child_welfare_applications_updated", handleUpdate)
      window.removeEventListener("applications_updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [selectedProgram.id, selectedProgram.title, userProfile, isReapplying])

  // Validations
  const step1Valid =
    check1 &&
    check2 &&
    (!selectedProgram.checklists[2] || check3) &&
    selectedAssistanceType !== ""

  const step2Valid =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.parentFullName.trim() !== "" &&
    formData.parentRelationship.trim() !== "" &&
    formData.parentContactNo.trim().length >= 11 &&
    (formData.isReportingPersonCurrentParent !== "No" || formData.specifiedRelationship.trim() !== "") &&
    (!selectedProgram.hasProtectionConcern || (formData.reasonForRequest.trim() !== "" && formData.briefDescription.trim() !== "")) &&
    (!selectedProgram.hasEmergencyInfo || (formData.emergencyType.trim() !== "" && (formData.emergencyDate.trim() !== "" || formData.emergencyDateTime.trim() !== "") && formData.briefDescription.trim() !== "")) &&
    (!selectedProgram.hasPsychosocialReason || (formData.reasonForRequest.trim() !== "" && formData.briefDescription.trim() !== "")) &&
    (!selectedProgram.hasShelterCareInfo || (formData.reasonForRequest.trim() !== "" && formData.currentLivingSituation.trim() !== "")) &&
    (!selectedProgram.hasParentingReason || (formData.reasonForRequest.trim() !== "" && formData.briefDescription.trim() !== ""))

  const requiredDocItems = selectedProgram.documents.filter((d) => d.required)
  const step3Valid = requiredDocItems.every((d) => (uploadedFiles[d.id] || []).length > 0)

  const canGoNext =
    step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : true

  const handleNext = () => {
    if (!canGoNext) {
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

  const handleBack = () => {
    setAttemptedNext(false)
    if (step === 1) {
      onBack?.()
      return
    }
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    const ref = generateReference(userProfile?.qcidNo || formData.qcidNumber)
    setReference(ref)
    setShowConfirmModal(false)
    setSubmissionStage("pending")

    const userId = (userProfile as any)?.id || (userProfile as any)?.userId || "0"
    const payload = {
      userId: String(userId),
      referenceNumber: ref,
      applicationData: {
        programKey: selectedProgram.key,
        programTitle: selectedProgram.title,
        selectedCategoryId: String(selectedProgram.id),
        selectedCategory: { id: selectedProgram.id, title: selectedProgram.title, key: selectedProgram.key },
        selectedAssistanceType,
        formData: {
          ...formData,
          childName: [formData.firstName, formData.middleName, formData.lastName, formData.suffix].filter(Boolean).join(" "),
          parentFullName: formData.parentFullName,
          parentRelationship: formData.parentRelationship,
          parentContactNo: formData.parentContactNo,
          isReportingPersonCurrentParent: formData.isReportingPersonCurrentParent,
          specifiedRelationship: formData.specifiedRelationship,
          supportTypes: [selectedAssistanceType],
        },
      },
      requiredDocumentIds: selectedProgram.documents.filter((d) => d.required).map((d) => d.id),
    }

    try {
      const createRes = await fetch(`${API_BASE}/api/child-welfare/create`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      })

      if (createRes.ok) {
        const data = await createRes.json()
        const appId = data.applicationId
        if (data.referenceNumber) {
          setReference(data.referenceNumber)
        }

        // Upload all attached documents
        for (const doc of selectedProgram.documents) {
          const files = uploadedFiles[doc.id] || []
          if (files.length > 0 && appId) {
            const uploadData = new FormData()
            files.forEach((f) => uploadData.append("documents", f))
            uploadData.append("documentId", doc.id)
            uploadData.append("documentLabel", doc.label)
            const token = getAuthToken()
            await fetch(`${API_BASE}/api/child-welfare/${appId}/upload-documents`, {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}`, "x-access-token": token, "x-session-token": token } : undefined,
              body: uploadData,
            }).catch(() => {})
          }
        }

        // Submit application
        if (appId) {
          await fetch(`${API_BASE}/api/child-welfare/${appId}/submit`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
          }).catch(() => {})
        }

        notifyApplicationChange("APPLICATION_SUBMITTED", "child_welfare", data.referenceNumber || ref)
      } else {
        notifyApplicationChange("APPLICATION_SUBMITTED", "child_welfare", ref)
      }
    } catch (err) {
      console.warn("Child welfare submission error fallback:", err)
      notifyApplicationChange("APPLICATION_SUBMITTED", "child_welfare", ref)
    }

    try {
      localStorage.removeItem(`cw_reapplying_${selectedProgram.key}`)
      localStorage.removeItem(`cw_reapplying_${selectedProgram.id}`)
      ;(window as any).__isFormDirty = false
    } catch {}
    setIsReapplying(false)
    setSubmissionStage("pending")
  }

  // Notify parent of stage changes
  useEffect(() => {
    onSubmissionStageChange?.(submissionStage, appStatus)
  }, [submissionStage, appStatus, onSubmissionStageChange])

  if (submissionStage === "pending") {
    // 1. REJECTED STATE (matching AICS)
    if (appStatus === "rejected") {
      return (
        <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
              <X className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {language === "en"
                ? "Application Disapproved"
                : language === "bis"
                ? "Wala Na-aprobahan ang Aplikasyon"
                : "Hindi Na-approve ang Application"}
            </h2>
            <p className="text-xs text-gray-600 max-w-sm">
              {language === "en"
                ? `We regret to inform you that your application for ${selectedProgram.title} was not approved. You may contact the Quezon City Social Welfare Office for more details or submit a new application.`
                : language === "bis"
                ? `Gikasubo namo nga wala na-aprobahan ang imong aplikasyon para sa ${selectedProgram.title}. Mahimo kang makig-alayon sa Quezon City Social Welfare Office o mag-apply pag-usab.`
                : `Paumanhin, hindi na-approve ang inyong aplikasyon para sa ${selectedProgram.title}. Maaari kang makipag-ugnayan sa Quezon City Social Welfare Office para sa karagdagang detalye o mag-apply muli kung may mga dokumentong kailangang ayusin.`}
            </p>
            <div className="mt-2 bg-gray-50 rounded-xl px-4 py-3 w-full text-left space-y-2 text-xs border border-gray-200">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">
                  {language === "en" ? "Reference Number" : language === "bis" ? "Numero sa Reperensya" : "Reference Number"}
                </span>
                <span className="font-mono font-bold text-gray-900 text-sm">{reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">
                  {language === "en" ? "Program" : "Programa"}
                </span>
                <span className="font-semibold text-gray-900">{selectedProgram.title}</span>
              </div>
              {selectedAssistanceType && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">
                    {language === "en" ? "Type of Assistance" : language === "bis" ? "Matang sa Tabang" : "Uri ng Tulong"}
                  </span>
                  <span className="font-semibold text-gray-900">{selectedAssistanceType}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">
                  {language === "en" ? "Applicant Name" : language === "bis" ? "Ngalan sa Aplikante" : "Pangalan ng Aplikante"}
                </span>
                <span className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`cw_reapplying_${selectedProgram.key}`)
                    localStorage.removeItem(`cw_reapplying_${selectedProgram.id}`)
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
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  {language === "en" ? "RE-APPLY (APPLY AGAIN)" : language === "bis" ? "PAG-APPLY PAG-USAB (RE-APPLY)" : "MAG-APPLY MULI (RE-APPLY)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    // 2. APPROVED STATE (matching AICS Approved card)
    if (appStatus === "approved") {
      return (
        <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 ring-8 ring-emerald-50/50">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {language === "en"
                ? "Application Approved!"
                : language === "bis"
                ? "Na-aprobahan ang Aplikasyon!"
                : "Na-approve ang Application!"}
            </h2>
            <p className="text-xs text-gray-600 max-w-sm">
              {language === "en"
                ? `Your application for ${selectedProgram.title} has been officially approved by the Quezon City Social Services Development Department.`
                : language === "bis"
                ? `Ang imong aplikasyon para sa ${selectedProgram.title} opisyal na nga gi-aprobahan sa Quezon City Social Services Development Department.`
                : `Ang inyong aplikasyon para sa ${selectedProgram.title} ay opisyal nang na-apruba ng Quezon City Social Services Development Department.`}
            </p>
            <div className="mt-2 bg-gray-50 rounded-xl px-4 py-3 w-full text-left space-y-2 text-xs border border-gray-200">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">
                  {language === "en" ? "Reference Number" : language === "bis" ? "Numero sa Reperensya" : "Reference Number"}
                </span>
                <span className="font-mono font-bold text-blue-700 text-sm">{reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">
                  {language === "en" ? "Program" : "Programa"}
                </span>
                <span className="font-semibold text-gray-900">{selectedProgram.title}</span>
              </div>
              {selectedAssistanceType && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">
                    {language === "en" ? "Type of Assistance" : language === "bis" ? "Matang sa Tabang" : "Uri ng Tulong"}
                  </span>
                  <span className="font-semibold text-gray-900">{selectedAssistanceType}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">
                  {language === "en" ? "Applicant Name" : language === "bis" ? "Ngalan sa Aplikante" : "Pangalan ng Aplikante"}
                </span>
                <span className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</span>
              </div>
            </div>

            <div className="w-full bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 text-left flex items-start gap-2.5">
              <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {language === "en"
                  ? "You can now track the release schedule, appointment, or claiming instructions in your Application History and Notifications."
                  : language === "bis"
                  ? "Mahimo na nimo masubay ang release schedule, appointment, o instruksyon sa pag-claim sa imong Application History ug Notifications."
                  : "Maaari mo nang subaybayan ang release schedule, appointment, o claim instructions sa inyong Application History at Notifications."}
              </span>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`cw_reapplying_${selectedProgram.key}`)
                    localStorage.removeItem(`cw_reapplying_${selectedProgram.id}`)
                  } catch {}
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

    // 3. PENDING STATE (matching AICS Pending card)
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-8 my-6 bg-white border border-border rounded-2xl shadow-sm text-center space-y-6 animate-in fade-in duration-300">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
          <Baby className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {language === "en"
              ? "Under Review (Pending)"
              : language === "bis"
              ? "Gisusi Pa (Pending)"
              : (t("cwPendingBadge") || "Kasalukuyang Sinusuri (Pending Review)")}
          </span>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            {language === "en"
              ? "Application Submitted Successfully!"
              : language === "bis"
              ? "Malampusong Nasumite ang Aplikasyon!"
              : (t("cwSuccessTitle") || "Matagumpay na Naisumite ang Aplikasyon!")}
          </h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            {language === "en"
              ? `Your application for ${selectedProgram.title} has been received and is currently being reviewed by the Quezon City SSDD Social Worker.`
              : language === "bis"
              ? `Ang imong aplikasyon para sa ${selectedProgram.title} nadawat na ug kasamtangang gisusi sa Quezon City SSDD Social Worker.`
              : (t("cwSuccessDesc", { program: selectedProgram.title }) || `Ang inyong aplikasyon para sa ${selectedProgram.title} ay natanggap na at kasalukuyang sinusuri ng Quezon City SSDD Social Worker.`)}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-gray-500">
              {language === "en" ? "Reference Number" : language === "bis" ? "Numero sa Reperensya" : "Reference Number"}:
            </span>
            <span className="font-mono font-bold text-blue-700 text-sm">{reference}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">
              {language === "en" ? "Program" : "Programa"}:
            </span>
            <span className="font-semibold text-gray-900">{selectedProgram.title}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">
              {language === "en" ? "Type of Assistance" : language === "bis" ? "Matang sa Tabang" : "Uri ng Tulong"}:
            </span>
            <span className="font-semibold text-gray-900">{selectedAssistanceType}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">
              {language === "en" ? "Applicant Name" : language === "bis" ? "Ngalan sa Aplikante" : "Pangalan ng Aplikante"}:
            </span>
            <span className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">
              {language === "en" ? "Parent / Guardian" : language === "bis" ? "Ginikanan / Guardian" : "Magulang / Guardian"}:
            </span>
            <span className="font-semibold text-gray-900">{formData.parentFullName}</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 max-w-md mx-auto flex items-center gap-2 text-left">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            {language === "en"
              ? "You can track your application status in your Portal Notifications and Activity History."
              : language === "bis"
              ? "Mahimo nimong masubay ang status sa imong Portal Notifications ug Kasaysayan sa Kalihokan."
              : (t("trackPortalNotifDesc") || "Maaari ninyong i-track ang status sa inyong Portal Notifications at Activity History.")}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 pt-2 w-full max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(`cw_reapplying_${selectedProgram.key}`)
                localStorage.removeItem(`cw_reapplying_${selectedProgram.id}`)
              } catch {}
              ;(window as any).__isFormDirty = false
              window.location.href = "/portal/my-applications"
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
          >
            {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white relative">
        {/* Step Indicator Badges and Tab Bars */}
        <div className="flex items-center px-6 pt-6 pb-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div
                className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i === step - 1
                    ? "bg-blue-600 text-white"
                    : step > i + 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 transition-colors ${step > i + 1 ? "bg-blue-300" : "bg-gray-200"}`} />
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

        {/* Card Content */}
        <div className="p-6 sm:p-8 space-y-7">
          {/* ──────────────── STEP 1: PROGRAM & CHECKLIST ──────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Blue Info Alert Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 uppercase">
                    {selectedProgram.title.toUpperCase()} — PRIMARY REQUIREMENTS
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {language === "tl"
                      ? "Kumpletuhin ang mga pangunahing kwalipikasyon sa ibaba at ihanda ang mga kaukulang dokumento upang makapagpatuloy sa inyong aplikasyon."
                      : language === "bis"
                      ? "Kompletoha ang mga nag-unang kwalipikasyon sa ubos ug andama ang mga gikinahanglang dokumento aron makapadayon sa aplikasyon."
                      : "Complete the primary qualification questions below and prepare the required documents to proceed with your application."}
                  </p>
                </div>
              </div>

              {/* Section Title */}
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
                  SERVICE AND PRIMARY REQUIREMENTS
                </h2>
              </div>

              {attemptedNext && !step1Valid && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {language === "tl"
                      ? "Mangyaring lagyan ng check ang lahat ng aytem sa checklist at pumili ng uri ng tulong."
                      : language === "bis"
                      ? "Palihug markahi ang tanang aytem sa checklist ug pagpili og matang sa tabang."
                      : "Please check all items in the checklist and select the type of assistance."}
                  </span>
                </div>
              )}

              {/* Checklist Questions */}
              <div className="space-y-4">
                <CustomCheckbox
                  checked={check1}
                  onChange={setCheck1}
                  label={`${selectedProgram.checklists[0]} *`}
                />
                <CustomCheckbox
                  checked={check2}
                  onChange={setCheck2}
                  label={`${selectedProgram.checklists[1]} *`}
                />
                {selectedProgram.checklists[2] && (
                  <CustomCheckbox
                    checked={check3}
                    onChange={setCheck3}
                    label={`${selectedProgram.checklists[2]} *`}
                  />
                )}
              </div>

              {/* Assistance Category / Type Selection Dropdown */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5 tracking-wide uppercase">
                  {language === "tl" ? "PUMILI NG URI NG TULONG" : language === "bis" ? "PAGPILI OG MATANG SA TABANG" : "CLICK THE TYPE OF ASSISTANCE"}
                </h3>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {selectedProgram.assistanceTypeLabel || (language === "tl" ? "Pumili ng uri ng tulong *" : language === "bis" ? "Pagpili og matang sa tabang *" : "Choose the type of assistance *")}
                </label>
                <div className="relative">
                  <select
                    value={selectedAssistanceType}
                    onChange={(e) => setSelectedAssistanceType(e.target.value)}
                    className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#3b82f6]/40 focus:border-[#3b82f6] font-medium ${
                      attemptedNext && !selectedAssistanceType
                        ? "border-red-500 bg-red-50/30"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="" disabled>
                      {language === "tl" ? "Pumili ng Uri ng Tulong" : language === "bis" ? "Pagpili og Matang sa Tabang" : "Select Type of Assistance"}
                    </option>
                    {selectedProgram.assistanceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 2: PERSONAL INFORMATION ──────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="text-base font-bold text-gray-900 uppercase">
                  {selectedProgram.title} — {language === "tl" ? "PERSONAL NA IMPORMASYON" : language === "bis" ? "PERSONAL NGA IMPORMASYON" : "PERSONAL INFORMATION"}
                </h3>
              </div>

              {attemptedNext && !step2Valid && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {language === "tl"
                      ? "Mangyaring punan ang lahat ng kinakailangang fields na may pulang asterisko (*)."
                      : language === "bis"
                      ? "Palihug kompletoha ang tanang gikinahanglan nga fields nga adunay pulang asterisko (*)."
                      : "Please fill in all required fields marked with an asterisk (*)."}
                  </span>
                </div>
              )}

              {/* I. IMPORMASYON NG BATA / APLIKANTE (DISABLED & PRE-FILLED FROM USER PROFILE) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  {language === "tl" ? "I. IMPORMASYON NG APLIKANTE / BATA" : language === "bis" ? "I. IMPORMASYON SA APLIKANTE / BATA" : "I. APPLICANT / CHILD INFORMATION"}
                </h4>

                {/* Row 1: QC ID & First Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "QC ID (Opsyonal / Kung mayroon)" : language === "bis" ? "QC ID (Opsyonal / Kung anaa)" : "QC ID (Optional / If available)"}</label>
                    <input type="text" disabled value={formData.qcidNumber} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Pangalan (First Name) *" : language === "bis" ? "Unang Ngalan (First Name) *" : "First Name *"}</label>
                    <input type="text" disabled value={formData.firstName} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                </div>

                {/* Row 2: Middle Name, Last Name, Suffix */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Gitnang Pangalan (Middle Name)" : language === "bis" ? "Tunga nga Ngalan (Middle Name)" : "Middle Name"}</label>
                    <input type="text" disabled value={formData.middleName} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Apelyido (Last Name) *" : language === "bis" ? "Apelyido (Last Name) *" : "Last Name *"}</label>
                    <input type="text" disabled value={formData.lastName} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Suffix (Jr., Sr., III, atbp.)" : language === "bis" ? "Suffix (Jr., Sr., III, ug uban pa)" : "Suffix (Jr., Sr., III, etc.)"}</label>
                    <input type="text" disabled value={formData.suffix} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                </div>

                {/* Row 3: Nationality, Date of Birth, Age */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Nasyonalidad *" : language === "bis" ? "Nasyonalidad *" : "Nationality *"}</label>
                    <input type="text" disabled value={formData.nationality || "FILIPINO"} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Petsa ng Kapanganakan (MM/DD/YYYY)" : language === "bis" ? "Petsa sa Pagkatawo (MM/DD/YYYY)" : "Date of Birth (MM/DD/YYYY)"}</label>
                    <input
                      type="text"
                      disabled
                      value={
                        formData.dobMonth && formData.dobDay && formData.dobYear
                          ? `${formData.dobMonth}/${formData.dobDay}/${formData.dobYear}`
                          : [formData.dobMonth, formData.dobDay, formData.dobYear].filter(Boolean).join("/")
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Edad *" : language === "bis" ? "Edad *" : "Age *"}</label>
                    <input type="text" disabled value={formData.age} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                </div>

                {/* Row 4: Gender / Sex, Civil Status, Contact Number */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Kasarian *" : language === "bis" ? "Kasarian *" : "Gender / Sex *"}</label>
                    <input type="text" disabled value={formData.sex} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Katayuang Sibil" : language === "bis" ? "Sibil nga Kahimtang" : "Civil Status"}</label>
                    <input type="text" disabled value={formData.civilStatus} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Numero ng Telepono" : language === "bis" ? "Numero sa Telepono" : "Contact Number"}</label>
                    <input type="text" disabled value={formData.contactNo} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                </div>

                {/* Row 5: House / Building Number, Street, Barangay */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Numero ng Bahay / Gusali" : language === "bis" ? "Numero sa Balay / Edipisyo" : "House / Building Number"}</label>
                    <input type="text" disabled value={formData.addressHouseNo} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Kalye (Street)" : language === "bis" ? "Dalan (Street)" : "Street"}</label>
                    <input type="text" disabled value={formData.addressStreet} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">{language === "tl" ? "Barangay" : language === "bis" ? "Barangay" : "Barangay"}</label>
                    <input type="text" disabled value={formData.barangay} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* II. PARENT / GUARDIAN / REPORTING PERSON INFORMATION */}
              <div className="space-y-4 pt-3 border-t border-gray-200">
                <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  {t("parentGuardianTitle") || (language === "tl" ? "II. IMPORMASYON NG MAGULANG / GUARDIAN / NAG-UULAT" : language === "bis" ? "II. IMPORMASYON SA GINIKANAN / GUARDIAN / TIG-REPORT" : "II. PARENT / GUARDIAN / REPORTING PERSON INFORMATION")}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${attemptedNext && !formData.parentFullName.trim() ? "text-red-600" : "text-gray-700"}`}>
                      {language === "tl" ? "Buong Pangalan *" : language === "bis" ? "Tibuok Ngalan *" : "Full Name *"}
                    </label>
                    <input
                      type="text"
                      value={formData.parentFullName}
                      onChange={(e) => updateField("parentFullName", e.target.value.replace(/[^a-zA-Z\sñÑ.-]/g, "").toUpperCase())}
                      placeholder={language === "tl" ? "Ilagay ang Buong Pangalan" : "Enter Full Name"}
                      className={`w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        attemptedNext && !formData.parentFullName.trim() ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${attemptedNext && !formData.parentRelationship ? "text-red-600" : "text-gray-700"}`}>
                      {language === "tl" ? "Relasyon sa Bata *" : language === "bis" ? "Relasyon sa Bata *" : "Relationship to Child *"}
                    </label>
                    <select
                      value={formData.parentRelationship}
                      onChange={(e) => updateField("parentRelationship", e.target.value)}
                      className={`w-full h-10 border rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        attemptedNext && !formData.parentRelationship ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">{language === "tl" ? "Piliin ang Relasyon" : language === "bis" ? "Pilia ang Relasyon" : "Select Relationship"}</option>
                      {[
                        { val: "Parent", label: "Parent" },
                        { val: "Legal Guardian", label: "Legal Guardian" },
                        { val: "Relative", label: "Relative" },
                        { val: "Teacher", label: "Teacher" },
                        { val: "Neighbor", label: "Neighbor" },
                        { val: "Other", label: "Other" },
                      ].map((r) => (
                        <option key={r.val} value={r.val}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${attemptedNext && formData.parentContactNo.length < 11 ? "text-red-600" : "text-gray-700"}`}>
                      {language === "tl" ? "Numero ng Telepono *" : language === "bis" ? "Numero sa Telepono *" : "Contact Number *"}
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={formData.parentContactNo}
                      onChange={(e) => updateField("parentContactNo", e.target.value.replace(/\D/g, ""))}
                      placeholder={language === "tl" ? "Ilagay ang Contact Number" : "Enter Contact Number"}
                      className={`w-full h-10 rounded-lg border px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        attemptedNext && formData.parentContactNo.length < 11 ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div className="mt-4 pt-3 border-t border-gray-100 bg-gray-50/60 p-4 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                    {language === "tl" ? "Karagdagang Impormasyon" : "Additional Information"}
                  </h5>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      {language === "tl"
                        ? "Ang nag-uulat ba ang kasalukuyang magulang/guardian ng bata? *"
                        : "Is the reporting person the child's current parent/guardian? *"}
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="isReportingPersonCurrentParent"
                          value="Yes"
                          checked={formData.isReportingPersonCurrentParent === "Yes"}
                          onChange={() => updateField("isReportingPersonCurrentParent", "Yes")}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{language === "tl" ? "Oo (Yes)" : "Yes"}</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="isReportingPersonCurrentParent"
                          value="No"
                          checked={formData.isReportingPersonCurrentParent === "No"}
                          onChange={() => updateField("isReportingPersonCurrentParent", "No")}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{language === "tl" ? "Hindi (No)" : "No"}</span>
                      </label>
                    </div>
                  </div>

                  {formData.isReportingPersonCurrentParent === "No" && (
                    <div className="pt-2">
                      <label className={`block text-xs font-semibold mb-1 ${attemptedNext && !formData.specifiedRelationship.trim() ? "text-red-600" : "text-gray-700"}`}>
                        {language === "tl" ? "Kung Hindi, tukuyin ang relasyon sa bata: *" : "If No, specify relationship to the child: *"}
                      </label>
                      <input
                        type="text"
                        value={formData.specifiedRelationship}
                        onChange={(e) => updateField("specifiedRelationship", e.target.value.replace(/[^a-zA-Z\sñÑ.-]/g, ""))}
                        placeholder={language === "tl" ? "Ilagay ang relasyon" : "Enter relationship"}
                        className={`w-full max-w-md h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
                          attemptedNext && !formData.specifiedRelationship.trim() ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SPECIFIC PROGRAM DETAILS */}
              {selectedProgram.hasProtectionConcern && (
                <div className="space-y-4 pt-3 border-t border-gray-200">
                  <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    {language === "tl" ? "ALALAHANIN SA PROTEKSYON NG BATA" : language === "bis" ? "KABALAKA SA PROTEKSYON SA BATA" : "CHILD PROTECTION CONCERN"}
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {language === "tl" ? "Dahilan ng Ulat / Tulong *" : language === "bis" ? "Rason sa Pag-report / Tabang *" : "Reason for Report / Assistance *"}
                    </label>
                    <select
                      value={formData.reasonForRequest}
                      onChange={(e) => updateField("reasonForRequest", e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">
                        {language === "tl" ? "Pumili ng sitwasyon / dahilan..." : language === "bis" ? "Pilia ang sitwasyon / rason..." : "Select situation / reason..."}
                      </option>
                      {[
                        { val: "Child Abuse / Neglect", label: language === "tl" ? "Pang-aabuso sa Bata / Pagpapabaya (Child Abuse / Neglect)" : "Child Abuse / Neglect" },
                        { val: "Physical Abuse", label: language === "tl" ? "Pisikal na Pang-aabuso (Physical Abuse)" : "Physical Abuse" },
                        { val: "Emotional Abuse", label: language === "tl" ? "Emosyonal na Pang-aabuso (Emotional Abuse)" : "Emotional Abuse" },
                        { val: "Exploitation", label: language === "tl" ? "Pagsasamantala / Child Labor (Exploitation)" : "Exploitation / Child Labor" },
                        { val: "Abandonment", label: language === "tl" ? "Pag-abandona (Abandonment)" : "Abandonment" },
                        { val: "Threat to Safety / Urgent Protection", label: language === "tl" ? "Banta sa Kaligtasan / Agarang Proteksyon" : "Threat to Safety / Urgent Protection" },
                        { val: "Legal / Custody Concern", label: language === "tl" ? "Legal / Custody na Alalahanin" : "Legal / Custody Concern" },
                        { val: "Other Protection Concern", label: language === "tl" ? "Iba pang Alalahanin sa Proteksyon" : "Other Protection Concern" },
                      ].map((item) => (
                        <option key={item.val} value={item.val}>{item.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {language === "tl" ? "Maikling Paglalarawan ng Sitwasyon / Insidente *" : language === "bis" ? "Mubo nga Deskripsyon sa Hitabo *" : "Brief Description of the Concern / Incident *"}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.briefDescription}
                      onChange={(e) => updateField("briefDescription", e.target.value)}
                      placeholder={
                        language === "tl"
                          ? "Ilarawan ang nangyari o kung bakit kailangan ng bata ng agarang proteksyon..."
                          : language === "bis"
                          ? "Ihulagway kung unsay nahitabo o ngano kinahanglan ug dinaliang proteksyon ang bata..."
                          : "Please describe what happened or why the child needs urgent protection..."
                      }
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {language === "tl"
                          ? "Kasalukuyan bang nasa agarang panganib ang bata? *"
                          : language === "bis"
                          ? "Karon ba anaa sa dinaliang kapeligrohan ang bata? *"
                          : "Is the child currently in immediate danger? *"}
                      </label>
                      <div className="flex items-center gap-6">
                        {[
                          { val: "Yes", label: language === "tl" ? "Oo (Yes)" : language === "bis" ? "Oo (Yes)" : "Yes" },
                          { val: "No", label: language === "tl" ? "Hindi (No)" : language === "bis" ? "Dili (No)" : "No" },
                        ].map((v) => (
                          <label key={v.val} className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                            <input
                              type="radio"
                              name="childProtectionDanger"
                              value={v.val}
                              checked={formData.isImmediateDanger === v.val}
                              onChange={() => updateField("isImmediateDanger", v.val)}
                              className="h-4 w-4 text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <span>{v.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {language === "tl"
                          ? "Kasalukuyan bang nasa ligtas na lugar ang bata? *"
                          : language === "bis"
                          ? "Karon ba anaa sa luwas nga dapit ang bata? *"
                          : "Is the child currently in a safe location? *"}
                      </label>
                      <div className="flex items-center gap-6">
                        {[
                          { val: "Yes", label: language === "tl" ? "Oo (Yes)" : language === "bis" ? "Oo (Yes)" : "Yes" },
                          { val: "No", label: language === "tl" ? "Hindi (No)" : language === "bis" ? "Dili (No)" : "No" },
                        ].map((v) => (
                          <label key={v.val} className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                            <input
                              type="radio"
                              name="childProtectionSafe"
                              value={v.val}
                              checked={formData.isChildSafe === v.val}
                              onChange={() => updateField("isChildSafe", v.val)}
                              className="h-4 w-4 text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <span>{v.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Emergency Assistance Specific */}
              {selectedProgram.hasEmergencyInfo && (
                <div className="space-y-4 pt-3 border-t border-gray-200">
                  <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    {language === "tl" ? "III. DETALYE NG EMERHENSIYA" : language === "bis" ? "III. DETALYE SA EMERHENSIYA" : "III. EMERGENCY DETAILS"}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {language === "tl" ? "Uri ng Emerhensiya *" : language === "bis" ? "Matang sa Emerhensiya *" : "Type of Emergency *"}
                      </label>
                      <select
                        value={formData.emergencyType}
                        onChange={(e) => updateField("emergencyType", e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="Emergency Medical Assistance">Emergency Medical Assistance</option>
                        <option value="Emergency Food Assistance">Emergency Food Assistance</option>
                        <option value="Emergency Shelter / Temporary Housing">Emergency Shelter / Temporary Housing</option>
                        <option value="Emergency Transportation">Emergency Transportation</option>
                        <option value="Disaster / Calamity Assistance">Disaster / Calamity Assistance</option>
                        <option value="Accident / Injury">Accident / Injury</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {language === "tl" ? "Tinatayang Petsa ng Insidente *" : language === "bis" ? "Petsa sa Hitabo *" : "Approximate Date of Incident / Need *"}
                      </label>
                      <input
                        type="date"
                        value={formData.emergencyDate}
                        onChange={(e) => {
                          const val = e.target.value
                          updateField("emergencyDate", val)
                          updateField("emergencyDateTime", [val, formData.emergencyTime].filter(Boolean).join(" at "))
                        }}
                        className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {language === "tl" ? "Oras ng Insidente / Pangangailangan" : language === "bis" ? "Oras sa Hitabo" : "Time of Incident / Need"}
                      </label>
                      <input
                        type="time"
                        value={formData.emergencyTime}
                        onChange={(e) => {
                          const val = e.target.value
                          updateField("emergencyTime", val)
                          updateField("emergencyDateTime", [formData.emergencyDate, val].filter(Boolean).join(" at "))
                        }}
                        className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {language === "tl" ? "Maikling Paglalarawan ng Sitwasyong Pang-emerhensiya *" : language === "bis" ? "Mubo nga Deskripsyon sa Sitwasyon sa Emerhensiya *" : "Brief Description of the Emergency Situation *"}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.briefDescription}
                      onChange={(e) => updateField("briefDescription", e.target.value)}
                      placeholder={
                        language === "tl"
                          ? "Ilarawan ang nangyari at kung anong tulong ang agarang kailangan..."
                          : language === "bis"
                          ? "Ihulagway kung unsay nahitabo ug unsang tabang ang gikinahanglan..."
                          : "Please explain what happened and the urgent assistance required..."
                      }
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              )}

              {/* 3. Psychosocial Support Specific */}
              {selectedProgram.hasPsychosocialReason && (
                <div className="space-y-4 pt-3 border-t border-gray-200">
                  <h4 className="text-xs font-bold uppercase text-gray-800 tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                    <HeartHandshake className="w-4 h-4 text-purple-600" />
                    PSYCHOSOCIAL SUPPORT DETAILS
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Reason for Seeking Counseling / Psychosocial Support *
                    </label>
                    <select
                      value={formData.reasonForRequest}
                      onChange={(e) => updateField("reasonForRequest", e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Pumili ng dahilan...</option>
                      <option value="Trauma / Post-Traumatic Support">Trauma / Post-Traumatic Support</option>
                      <option value="Behavioral / Emotional Concern">Behavioral / Emotional Concern</option>
                      <option value="Grief / Loss of Family Member">Grief / Loss of Family Member</option>
                      <option value="Crisis / Stress Support">Crisis / Stress Support</option>
                      <option value="Victim of Abuse Support">Victim of Abuse Support</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────── STEP 3: SAMPLE DOCUMENTS & UPLOADS ──────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="text-base font-bold text-gray-900 uppercase">
                  {t("cwStepDocuments") || (language === "tl" ? "MAGSUMITE NG DOKUMENTO" : language === "bis" ? "ISUMITE ANG MGA DOKUMENTO" : "SAMPLE DOCUMENTS")}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === "tl"
                    ? `I-upload ang mga kaukulang dokumento para sa ${selectedProgram.title}. Ang may markang (*) ay kinakailangan.`
                    : language === "bis"
                    ? `I-upload ang mga angay nga dokumento para sa ${selectedProgram.title}. Ang may marka nga (*) gikinahanglan.`
                    : `Upload the required documents for ${selectedProgram.title}. Fields marked with (*) are required.`}
                </p>
              </div>

              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {t("allowedFileTypesCameraNote") || "Allowed file types: JPG, JPEG, PNG, WEBP, PDF (o kumuha gamit ang Camera). Siguraduhing malinaw ang kopya."}
                </p>
              </div>

              <div className="space-y-4">
                {selectedProgram.documents.map((doc, docIdx) => {
                  const files = uploadedFiles[doc.id] || []
                  const uploaded = files.length > 0
                  const isInvalid = doc.required && attemptedNext && !uploaded
                  const inputId = `upload-cw-doc-${doc.id}-${docIdx}`

                  return (
                    <div key={doc.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSampleDoc(doc)
                          setShowSampleModal(true)
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline mb-1.5 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {(t("sampleDocument") || (language === "tl" ? "Sample na Dokumento" : language === "bis" ? "Sample nga Dokumento" : "Sample Document")).toUpperCase()}
                      </button>

                      <div
                        className={`border rounded-xl p-4 sm:p-5 transition-colors ${
                          uploaded
                            ? "border-green-300 bg-green-50/60"
                            : isInvalid
                            ? "border-red-400 bg-red-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          {doc.label} {doc.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs font-normal">({language === "tl" ? "Opsyonal" : language === "bis" ? "Opsyonal" : "Optional"})</span>}
                          {uploaded && (
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white shrink-0 ml-1">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </p>

                        {doc.description && <p className="text-xs text-gray-500 mt-1">{doc.description}</p>}
                        <p className="text-[11px] text-gray-400 mt-1">
                          {t("allowedFileTypesCameraNote") || "Allowed file types: JPG, JPEG, PNG, WEBP (o kumuha gamit ang Camera)"}
                        </p>

                        <input
                          type="file"
                          id={inputId}
                          key={`${inputId}-${files.length}`}
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFileUpload(doc.id, e.target.files)
                            }
                            e.target.value = ""
                          }}
                        />

                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                          <label
                            htmlFor={inputId}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold tracking-wide cursor-pointer hover:bg-blue-700 transition-colors shadow-xs"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {t("uploadPhotoBtn") || (language === "tl" ? "MAG-UPLOAD NG LARAWAN" : language === "bis" ? "PAG-UPLOAD OG HULAGWAY" : "UPLOAD PHOTO")}
                          </label>

                          <button
                            type="button"
                            onClick={() => setCameraDoc(doc)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            {t("takePhotoCameraBtn") || (language === "tl" ? "KUMUHA NG LARAWAN (CAMERA)" : language === "bis" ? "PAGKUHA OG HULAGWAY (CAMERA)" : "TAKE PHOTO (CAMERA)")}
                          </button>
                        </div>

                        {uploaded && (
                          <div className="flex flex-wrap gap-3 pt-4">
                            {files.map((file, i) => (
                              <div
                                key={`${file.name}-${i}`}
                                className="relative w-36 sm:w-40 border border-gray-200 rounded-lg bg-white p-2.5 flex flex-col items-center text-center shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => removeFile(doc.id, i)}
                                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gray-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 cursor-pointer shadow-xs"
                                  aria-label={t("removeFile", { filename: file.name }) || "Remove file"}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDocModal({ title: doc.label, file })}
                                  className="h-16 w-full rounded-md overflow-hidden border border-gray-100 mb-2 flex items-center justify-center bg-gray-50 cursor-pointer hover:opacity-90"
                                >
                                  <FileThumbnail file={file} className="h-full w-full object-cover" />
                                </button>
                                <p className="text-[11px] font-medium text-gray-800 truncate w-full">{file.name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{formatFileSize(file.size)}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {isInvalid && (
                          <p className="text-xs text-red-500 mt-2">
                            {t("spDocRequiredNote") || (language === "tl" ? "Kailangan pang mag-upload ng dokumento para sa kinakailangang item na ito." : language === "bis" ? "Kinahanglan pang mag-upload og dokumento alang niining gikinahanglang aytem." : "A document must be uploaded for this required item.")}
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
                <h3 className="text-base font-bold text-gray-900 uppercase">
                  {(t("pwdReviewHeader") || (language === "tl" ? "SURIIN ANG IMPORMASYON" : language === "bis" ? "SUSIHA ANG IMPORMASYON" : "REVIEW INFORMATION")).toUpperCase()}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("pwdReviewDesc") || (language === "tl" ? "Pakisuri nang mabuti ang lahat ng impormasyon at uploaded documents bago isumite ang aplikasyon." : language === "bis" ? "Palihug susiha og maayo ang tanang impormasyon sa dili pa isumite ang aplikasyon." : "Please review all information and uploaded documents before submitting your application.")}
                </p>
              </div>

              {/* 1. Program & Assistance Details */}
              <ReviewSection title={language === "tl" ? "Mga Detalye ng Aplikasyon" : language === "bis" ? "Mga Detalye sa Aplikasyon" : "Application Details"} onEdit={() => { setReturnToReview(true); setStep(1) }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 text-xs">
                  <ReviewField
                    label={language === "tl" ? "Programa" : language === "bis" ? "Programa" : "Program"}
                    value={selectedProgram.title}
                  />
                  <ReviewField
                    label={language === "tl" ? "Uri ng Tulong" : language === "bis" ? "Matang sa Tabang" : "Type of Assistance"}
                    value={selectedAssistanceType}
                  />
                  {formData.reasonForRequest && (
                    <ReviewField
                      label={language === "tl" ? "Dahilan" : language === "bis" ? "Rason" : "Reason for Request"}
                      value={formData.reasonForRequest}
                    />
                  )}
                  {formData.briefDescription && (
                    <ReviewField
                      label={language === "tl" ? "Deskripsyon" : language === "bis" ? "Deskripsyon" : "Description"}
                      value={formData.briefDescription}
                    />
                  )}
                  {selectedProgram.hasProtectionConcern && (
                    <>
                      <ReviewField label="Immediate Danger" value={formData.isImmediateDanger} />
                      <ReviewField label="Child in Safe Location" value={formData.isChildSafe} />
                    </>
                  )}
                  {selectedProgram.hasEmergencyInfo && (
                    <>
                      <ReviewField label="Emergency Type" value={formData.emergencyType} />
                      <ReviewField
                        label="Incident Date & Time"
                        value={
                          [formData.emergencyDate, formData.emergencyTime].filter(Boolean).join(" at ") ||
                          formData.emergencyDateTime ||
                          "—"
                        }
                      />
                      <ReviewField label="Priority Level" value="HIGH PRIORITY (Emergency Response)" />
                    </>
                  )}
                  {selectedProgram.hasShelterCareInfo && (
                    <>
                      <ReviewField label="Living Situation" value={formData.currentLivingSituation} />
                      <ReviewField label="Child Safe" value={formData.isChildSafe} />
                      <ReviewField label="Parent Available" value={formData.isParentAvailable} />
                    </>
                  )}
                  <ReviewField label="Residency Status" value="Residente ng Lungsod Quezon (Verified)" />
                </div>
              </ReviewSection>

              {/* 2. Applicant / Child Information */}
              <ReviewSection title={language === "tl" ? "Impormasyon ng Aplikante / Bata" : language === "bis" ? "Impormasyon sa Aplikante / Bata" : "Applicant / Child Information"} onEdit={() => { setReturnToReview(true); setStep(2) }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 text-xs">
                  <ReviewField label="QC ID Number" value={formData.qcidNumber} />
                  <ReviewField label={language === "tl" ? "Buong Pangalan" : language === "bis" ? "Tibuok Ngalan" : "Full Name"} value={[formData.firstName, formData.middleName, formData.lastName, formData.suffix].filter(Boolean).join(" ")} />
                  <ReviewField
                    label={language === "tl" ? "Petsa ng Kapanganakan / Edad" : language === "bis" ? "Petsa sa Pagkatawo / Edad" : "Date of Birth / Age"}
                    value={`${[formData.dobMonth, formData.dobDay, formData.dobYear].filter(Boolean).join("/")} (${formData.age} y/o)`}
                  />
                  <ReviewField label={language === "tl" ? "Kasarian / Katayuang Sibil" : language === "bis" ? "Kasarian / Sibil nga Kahimtang" : "Sex / Civil Status"} value={`${formData.sex} / ${formData.civilStatus}`} />
                  <ReviewField label={language === "tl" ? "Numero ng Telepono" : language === "bis" ? "Numero sa Telepono" : "Contact Number"} value={formData.contactNo} />
                  <ReviewField
                    label={language === "tl" ? "Kumpletong Tirahan" : language === "bis" ? "Kompletong Pinuy-anan" : "Complete Address"}
                    value={`${formData.addressHouseNo} ${formData.addressStreet}, Brgy. ${formData.barangay}, ${formData.city}`}
                  />
                </div>
              </ReviewSection>

              {/* 3. Parent / Guardian / Reporting Person */}
              <ReviewSection title={language === "tl" ? "Impormasyon ng Magulang / Guardian / Nag-uulat" : language === "bis" ? "Impormasyon sa Ginikanan / Guardian / Tig-report" : "Parent / Guardian / Reporting Person Information"} onEdit={() => { setReturnToReview(true); setStep(2) }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 text-xs">
                  <ReviewField label={language === "tl" ? "Buong Pangalan" : language === "bis" ? "Tibuok Ngalan" : "Full Name"} value={formData.parentFullName} />
                  <ReviewField label={language === "tl" ? "Relasyon sa Bata" : language === "bis" ? "Relasyon sa Bata" : "Relationship to Child"} value={formData.parentRelationship} />
                  <ReviewField label={language === "tl" ? "Numero ng Telepono" : language === "bis" ? "Numero sa Telepono" : "Contact Number"} value={formData.parentContactNo} />
                  <ReviewField label={language === "tl" ? "Kasalukuyang Magulang/Guardian?" : "Is Current Parent/Guardian?"} value={formData.isReportingPersonCurrentParent} />
                  {formData.isReportingPersonCurrentParent === "No" && (
                    <ReviewField label={language === "tl" ? "Tinukoy na Relasyon" : "Specified Relationship"} value={formData.specifiedRelationship} />
                  )}
                </div>
              </ReviewSection>

              {/* 4. Uploaded Documents */}
              <ReviewSection title={language === "tl" ? "Mga Na-upload na Dokumento" : language === "bis" ? "Mga Na-upload nga Dokumento" : "Uploaded Documents"} onEdit={() => { setReturnToReview(true); setStep(3) }}>
                <div className="p-4 space-y-4">
                  {selectedProgram.documents.map((doc) => {
                    const files = uploadedFiles[doc.id] || []
                    const uploaded = files.length > 0
                    return (
                      <div key={doc.id}>
                        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase">
                          {doc.label} {doc.required && <span className="text-red-500">*</span>}
                          {uploaded ? (
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white shrink-0 ml-1">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 ml-1" />
                          )}
                        </p>
                        {uploaded ? (
                          <div className="mt-2 space-y-2">
                            {files.map((file, i) => (
                              <button
                                key={`${file.name}-${i}`}
                                type="button"
                                onClick={() => setPreviewDocModal({ title: doc.label, file })}
                                className="w-full max-w-md border border-gray-200 hover:border-blue-400 rounded-xl overflow-hidden text-left bg-white cursor-pointer transition-colors shadow-xs block"
                              >
                                <div className="h-28 w-full bg-gray-50 flex items-center justify-center overflow-hidden p-2">
                                  <FileThumbnail file={file} className="max-h-full max-w-full object-contain" />
                                </div>
                                <div className="px-3 py-2 text-center bg-white border-t border-gray-100">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{formatFileSize(file.size)}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">{language === "tl" ? "Walang nai-upload na dokumento" : language === "bis" ? "Walay na-upload nga dokumento" : "No document uploaded yet"}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ReviewSection>

              {/* Disclaimer Note (Pic 2 style) */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                  {language === "tl"
                    ? "Sa pag-click ng \"Isumite\", kinukumpirma mo na ang lahat ng impormasyong ibinigay ay totoo at kumpleto. Susuriin ang iyong aplikasyon ng isang evaluator, at makakatanggap ka ng abiso tungkol sa katayuan nito."
                    : language === "bis"
                    ? "Sa pag-click sa \"Isumite\", gipamatud-an nimo nga ang tanang impormasyon nga gihatag tinuod ug kompleto. Susihon ang imong aplikasyon sa evaluator."
                    : "By clicking \"Submit\", you confirm that all information provided is true and complete. Your application will be reviewed by an evaluator, and you will receive a notification to your email about the status of your application."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2 rounded-lg text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider cursor-pointer"
            >
              {returnToReview ? (language === "tl" ? "BUMALIK SA REVIEW" : language === "bis" ? "BALIK SA REVIEW" : "BACK TO REVIEW") : (t("backButton") || "BACK")}
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              className={`px-7 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center ${
                canGoNext
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>
                {returnToReview
                  ? language === "tl"
                    ? "BUMALIK SA REVIEW"
                    : language === "bis"
                    ? "BALIK SA REVIEW"
                    : "RETURN TO REVIEW"
                  : t("nextButton") || "NEXT"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-8 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
            >
              <span>{selectedProgram.submitButtonText || t("submitApplicationUpper") || "SUBMIT APPLICATION"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 📸 Document Camera Capture Modal */}
      <DocumentCameraModal
        isOpen={Boolean(cameraDoc)}
        onClose={() => setCameraDoc(null)}
        docTitle={cameraDoc?.label}
        onCapture={(file) => {
          if (cameraDoc) {
            handleFileUpload(cameraDoc.id, [file] as any)
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

      {/* 📄 SAMPLE DOCUMENT MODAL */}
      {showSampleModal && selectedSampleDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate pr-2">
                {selectedSampleDoc.label}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowSampleModal(false)
                  setSelectedSampleDoc(null)
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
              {selectedSampleDoc.sampleImage ? (
                <img
                  src={selectedSampleDoc.sampleImage}
                  alt={selectedSampleDoc.label}
                  className="max-w-full max-h-[55vh] rounded-lg border border-gray-200 object-contain shadow-xs"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-gray-500">
                  <FileText className="h-12 w-12 text-blue-500" />
                  <p className="text-sm font-medium">{selectedSampleDoc.label}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 text-xs text-gray-500 bg-white">
              {selectedSampleDoc.description || "Official Sample Document Reference"}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 text-center">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Baby className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900">{t("submitAppTitle") || "Isumite ang Aplikasyon?"}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {t("submitAppDesc", { program: selectedProgram.title, type: selectedAssistanceType }) || `Sigurado ka bang nais mong isumite ang inyong aplikasyon para sa ${selectedProgram.title} (${selectedAssistanceType})?`}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                {t("cancel") || "CANCEL"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs"
              >
                {t("yesSubmitBtn") || "YES, SUBMIT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}