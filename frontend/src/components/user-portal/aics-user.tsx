import { useSearchParams } from "react-router-dom"
import ApplyAICS from "./apply-aics"
import AICSServiceWizard, { type AICSServiceType } from "./aics-service-wizard"
import { useLanguage } from "../ui/language-context"

const AICS_CONFIG: Record<
  string,
  { title: string; key: string; reqKey: string; icon: string; matchers: string[]; desc: string; requirements: string[] }
> = {
  medical: {
    title: "Medical Assistance",
    key: "aicsMedical",
    reqKey: "aicsMedical",
    icon: "🩺",
    matchers: ["medical", "gamot", "hospital", "medicine", "medikal"],
    desc: "Hospitalization expenses, medicines, chemotherapy, dialysis, and diagnostic laboratory procedures.",
    requirements: ["Medical Abstract / Certificate", "Hospital Statement of Account / Pharmacy Quotation", "Barangay Indigency", "Valid QCID / Gov ID"]
  },
  funeral: {
    title: "Funeral Assistance",
    key: "aicsFuneral",
    reqKey: "aicsFuneral",
    icon: "🕊️",
    matchers: ["funeral", "burial", "libing", "patay", "burol"],
    desc: "Burial, cremation, and casket assistance for deceased indigent family members.",
    requirements: ["Death Certificate (Certified Copy)", "Funeral Contract / Official Receipt", "Barangay Indigency", "Valid QCID / Gov ID"]
  },
  educational: {
    title: "Educational Assistance",
    key: "Educational Assistance",
    reqKey: "aicsEducational",
    icon: "🎓",
    matchers: ["educational", "education", "aral", "school", "tuition", "edukasyon"],
    desc: "Tuition support, school supplies, learning aids, and student subsistence allowances.",
    requirements: ["Certificate of Registration / Enrollment", "School ID / Assessment Form", "Barangay Indigency", "Parent/Guardian ID"]
  },
  material: {
    title: "Material Assistance",
    key: "aicsMaterial",
    reqKey: "aicsMaterial",
    icon: "📦",
    matchers: ["material", "materyal"],
    desc: "Provisions of assistive medical devices, relief supplies, and emergency family essentials.",
    requirements: ["Barangay Certificate of Indigency / Incident Report", "Valid QCID / Government ID", "Social Worker Case Report"]
  },
  food: {
    title: "Food Assistance",
    key: "aicsFood",
    reqKey: "aicsFood",
    icon: "🍲",
    matchers: ["food", "pagkain", "grocery"],
    desc: "Emergency nutritional food packages and subsistence grocery assistance for families in crisis.",
    requirements: ["Barangay Certificate of Indigency", "Valid QCID / Government ID", "Proof of Family Dependency"]
  },
  transportation: {
    title: "Transportation Assistance",
    key: "aicsTransportation",
    reqKey: "aicsTransportation",
    icon: "🚌",
    matchers: ["transportation", "pamasahe", "transpo", "travel", "transport"],
    desc: "Emergency transit fares and repatriation allowance for stranded citizens returning to their provinces.",
    requirements: ["Barangay Certificate / Police Blotter if stranded", "Valid QCID / Government ID", "Proof of Travel Need"]
  },
}

export default function AICSUser() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawType = searchParams.get("type")?.toLowerCase() || "medical"
  const typeParam = AICS_CONFIG[rawType] ? rawType : "medical"
  const selectedConfig = AICS_CONFIG[typeParam] || AICS_CONFIG.medical

  const handleNavigateType = (newType: string) => {
    setSearchParams({ type: newType.toLowerCase() })
  }

  if (
    typeParam === "material" ||
    typeParam === "food" ||
    typeParam === "transportation"
  ) {
    return (
      <div className="py-2">
        <AICSServiceWizard
          key={typeParam}
          serviceType={typeParam as AICSServiceType}
          onBack={() => handleNavigateType("medical")}
        />
      </div>
    )
  }

  return (
    <div className="py-2">
      <ApplyAICS
        key={selectedConfig.reqKey}
        initialType={t(selectedConfig.key)}
        initialTypeKey={selectedConfig.reqKey}
      />
    </div>
  )
}