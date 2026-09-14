import { X, CheckCircle2, AlertTriangle } from "lucide-react"
import { useLanguage, type Language } from "../ui/language-context"

export interface RequirementsModalProps {
  accepted: boolean
  onAcceptedChange: (checked: boolean) => void
  onContinue: () => void
  showInfoBanner?: boolean
  onCloseInfoBanner?: () => void
  onClose?: () => void
}

const MODAL_TEXTS: Record<
  Language,
  {
    title: string
    subtitle: string
    reminderTitle: string
    reminderText: string
    sec1Title: string
    sec1Body: string
    sec1Sub: string
    sec1Items: string[]
    sec2Title: string
    sec2Items: string[]
    sec3Title: string
    sec3Subtitle: string
    sec3Items: string[]
    acceptCheckbox: string
    continueBtn: string
  }
> = {
  en: {
    title: "Apply for Livelihood — Requirements",
    subtitle: "Please Review the Following Requirements for this Service",
    reminderTitle: "IMPORTANT REMINDER",
    reminderText:
      "Please scroll and read all the information and requirements below before proceeding with your Livelihood Program application.",
    sec1Title: "What is the Livelihood Program?",
    sec1Body:
      "The Livelihood Program provides financial and material support to qualified applicants who wish to start or sustain small micro-enterprises and community livelihoods.",
    sec1Sub: "Eligible businesses may include:",
    sec1Items: [
      "Sari-sari Store",
      "Food / Eatery Business",
      "Online Selling / Retail",
      "Sewing / Tailoring",
      "Beauty & Personal Care Services",
      "Repair & Technical Services",
      "Other micro-livelihood enterprises",
    ],
    sec2Title: "Who is eligible to apply?",
    sec2Items: [
      "Must possess a valid and active Gov Service ID.",
      "Must have complete and accurate personal information on profile.",
      "Must meet the eligibility guidelines of the Livelihood Program.",
      "Must not have an existing pending livelihood application.",
    ],
    sec3Title: "Documentary Requirements",
    sec3Subtitle: "Please prepare clear copies of the following:",
    sec3Items: [
      "Valid ID / Gov Service ID",
      "Barangay Certificate / Proof of Residency (if required)",
      "Supporting Documents for livelihood / business proposal",
      "Other verification documents requested by administrators",
    ],
    acceptCheckbox: "I accept and understand the requirements for this service.",
    continueBtn: "I UNDERSTAND • APPLY FOR LIVELIHOOD",
  },
  tl: {
    title: "Apply for Livelihood — Requirements",
    subtitle: "Mangyaring Suriin ang mga Sumusunod na Kinakailangan para sa Serbisyong Ito",
    reminderTitle: "MAHALAGANG PAALALA",
    reminderText:
      "Mangyaring mag-scroll at basahin ang lahat ng impormasyon at mga kinakailangan sa ibaba bago magpatuloy sa iyong aplikasyon sa Livelihood Program.",
    sec1Title: "Ano ang Livelihood Program?",
    sec1Body:
      "Ang Livelihood Program ay nagbibigay ng suporta sa mga kwalipikadong aplikante na nais magsimula o magpatuloy ng maliit na pagkakakitaan.",
    sec1Sub: "Maaaring kabilang dito ang:",
    sec1Items: [
      "Sari-sari Store",
      "Food Business",
      "Online Selling",
      "Sewing / Tailoring",
      "Beauty Services",
      "Repair Services",
      "Iba pang maliit na livelihood",
    ],
    sec2Title: "Sino ang maaaring mag-apply?",
    sec2Items: [
      "Dapat ay may valid at active Gov Service ID.",
      "Dapat kumpleto at tama ang personal information sa profile.",
      "Dapat nakakatugon sa eligibility requirements ng Livelihood Program.",
      "Hindi dapat may existing pending livelihood application.",
    ],
    sec3Title: "Documentary Requirements",
    sec3Subtitle: "Pakihanda ang mga sumusunod:",
    sec3Items: [
      "Valid ID / Gov Service ID",
      "Proof of Residency kung kinakailangan",
      "Supporting Document para sa livelihood, kung kinakailangan",
      "Iba pang dokumentong maaaring hingin ng administrator",
    ],
    acceptCheckbox: "Tinatanggap at nauunawaan ko ang mga kinakailangan para sa serbisyong ito.",
    continueBtn: "NAUNAWAAN KO • APPLY FOR LIVELIHOOD",
  },
  bis: {
    title: "Apply for Livelihood — Requirements",
    subtitle: "Palihug Tan-awa ang mga Mosunod nga Kinahanglanon alang Niini nga Serbisyo",
    reminderTitle: "IMPORTANTE NGA PAHINUMDOM",
    reminderText:
      "Palihug i-scroll ug basaha ang tanang impormasyon ug mga kinahanglanon sa ubos sa dili pa mopadayon sa imong aplikasyon sa Livelihood Program.",
    sec1Title: "Unsa ang Livelihood Program?",
    sec1Body:
      "Ang Livelihood Program naghatag og suporta sa mga kwalipikadong aplikante nga gustong magsugod o mopadayon og gamay nga panginabuhi.",
    sec1Sub: "Mahimong maglakip kini sa:",
    sec1Items: [
      "Sari-sari Store",
      "Food Business",
      "Online Selling",
      "Panahi / Tailoring",
      "Beauty Services",
      "Repair Services",
      "Uban pang gamay nga panginabuhi",
    ],
    sec2Title: "Kinsa ang mahimong mag-apply?",
    sec2Items: [
      "Kinahanglan adunay balido ug aktibong Gov Service ID.",
      "Kinahanglan kompleto ug husto ang personal nga impormasyon sa profile.",
      "Kinahanglan nakatuman sa eligibility requirements sa Livelihood Program.",
      "Dili kinahanglan adunay nag-ung-ong nga aplikasyon sa panginabuhi.",
    ],
    sec3Title: "Mga Dokumentong Gikinahanglan",
    sec3Subtitle: "Palihug andama ang mga mosunod:",
    sec3Items: [
      "Valid ID / Gov Service ID",
      "Proof of Residency kung gikinahanglan",
      "Supporting Document alang sa panginabuhi, kung gikinahanglan",
      "Uban pang mga dokumento nga gikinahanglan sa tagdumala",
    ],
    acceptCheckbox: "Gidawat ug nasabtan nako ang mga kinahanglanon alang niini nga serbisyo.",
    continueBtn: "NASABTAN NAKO • APPLY FOR LIVELIHOOD",
  },
}

export function LivelihoodRequirementsModal({
  accepted,
  onAcceptedChange,
  onContinue,
  onClose,
}: RequirementsModalProps) {
  const { language } = useLanguage()
  const langKey = (language === "tl" || language === "bis" ? language : "en") as Language
  const content = MODAL_TEXTS[langKey] || MODAL_TEXTS.en

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border shrink-0 flex items-center justify-between gap-4 bg-muted/20">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">
              {content.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {content.subtitle}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body with Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm leading-relaxed text-foreground">
          {/* Important Reminder Banner */}
          <div className="relative flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold uppercase tracking-wider text-xs text-amber-800 dark:text-amber-300">
                {content.reminderTitle}
              </p>
              <p className="mt-1 text-amber-950 dark:text-amber-100 font-medium">
                {content.reminderText}
              </p>
            </div>
          </div>

          {/* Section I */}
          <div className="bg-muted/10 border border-border/80 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-base text-primary flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">I</span>
              {content.sec1Title}
            </h3>
            <p className="text-muted-foreground text-sm">
              {content.sec1Body}
            </p>
            <p className="font-semibold text-xs text-foreground uppercase tracking-wide pt-1">
              {content.sec1Sub}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {content.sec1Items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section II */}
          <div className="bg-muted/10 border border-border/80 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-base text-primary flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">II</span>
              {content.sec2Title}
            </h3>
            <ul className="space-y-2 pt-1 text-sm">
              {content.sec2Items.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section III */}
          <div className="bg-muted/10 border border-border/80 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-base text-primary flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">III</span>
              {content.sec3Title}
            </h3>
            <p className="text-muted-foreground text-xs">
              {content.sec3Subtitle}
            </p>
            <ul className="space-y-2 pt-1 text-sm">
              {content.sec3Items.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                  <span className="flex items-center justify-center h-4 w-4 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer with Acceptance Checkbox & Button */}
        <div className="p-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-muted/20">
          <label className="flex items-start gap-2.5 text-sm select-none text-foreground cursor-pointer group">
            <input
              type="checkbox"
              id="livelihood-accept-checkbox"
              checked={accepted}
              onChange={(e) => onAcceptedChange(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-border accent-primary cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium group-hover:text-primary transition-colors">
              {content.acceptCheckbox}
            </span>
          </label>

          <button
            onClick={onContinue}
            disabled={!accepted}
            id="btn-understand-apply-livelihood"
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold tracking-wide hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {content.continueBtn}
          </button>
        </div>
      </div>
    </div>
  )
}