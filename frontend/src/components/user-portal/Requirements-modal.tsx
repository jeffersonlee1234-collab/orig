import { X, AlertTriangle, AlertCircle } from "lucide-react"
import { useLanguage } from "../ui/language-context"


export interface RequirementSection {
  heading: string
  body?: string
  list?: string[]
  listClassName?: string
  note?: string
  noteList?: string[]
}

export interface RequirementFAQ {
  question: string
  answer: string
}

export interface ProgramRequirements {
  key: string
  programTitle: string
  sections: RequirementSection[]
  slotBannerText?: string
  faqs?: RequirementFAQ[]
}


export const AICS_REQUIREMENTS: Record<string, ProgramRequirements> = {
  aicsMedical: {
    key: "aicsMedical",
    programTitle: "SERVICE REQUIREMENTS FOR THE MEDICAL ASSISTANCE PROGRAM:",
    sections: [
      {
        heading: "I. Ano ang Medical Assistance Program?",
        body:
          "Ang Medical Assistance Program ay nagbibigay ng tulong pinansyal para sa mga residente ng Gov Service na walang kakayahang tugunan ang mga medikal na pangangailangan tulad ng gamot na hindi available sa Botika ng Bayan.",
      },
      {
        heading: "II. Sino ang kwalipikado sa programa?",
        list: [
          "Mga lehitimong residente ng Gov Service at mayroong Gov Service ID.",
          "Wala o hindi sapat ang kakayahan na tugunan ang mga medikal na pangangailangan.",
        ],
        listClassName: "text-muted-foreground list-decimal",
      },
      {
        heading: "III. Requirements",
        body: "Para sa Pasyente",
        list: [
          "Medical Certificate / Clinical Abstract",
          "Reseta",
          "Barangay Certificate of Indigency",
          "Gov Service ID",
        ],
        note:
          "Kung may authorized representative (pinakamalapit na kamag-anak / nearest of kin):",
        noteList: [
          "Gov Service ID o Valid ID",
          "Authorization letter nakasaad ang relasyon sa pasyente",
        ],
      },
    ],
  },

  aicsFuneral: {
    key: "aicsFuneral",
    programTitle:
      "SERVICE REQUIREMENTS FOR THE FUNERAL AND BURIAL ASSISTANCE PROGRAM:",
    sections: [
      {
        heading: "I. Ano ang Funeral and Burial Assistance Program?",
        body:
          "Ang Funeral and Burial Assistance Program ay batay sa Ordinansa 2865 S-2019 ay nagbibigay ng tulong pinansyal sa pamamagitan ng Certificate of Guarantee sa accredited partner funeral home ng lungsod.",
      },
      {
        heading: "II. Ano ang kasama sa funeral service package?",
        body:
          "Ang funeral service package ay nakasaad sa Funeral Contract kabilang ang mga sumusunod na serbisyo na hindi lalagpas sa Php25,000:",
        list: [
          "Retrieval of human remains from the place of death (within Gov Service)",
          "Use of white casket (OMS)",
          "Embalming and funeral arrangement of viewing place for a maximum of 7 days",
          "1 standing flower arrangement",
          "1 tarpaulin",
          "Provision of hearse for interment or cremation",
          "Registration of death certificate",
          "Securing of burial / cremation permit",
          "Interment arrangement at city-owned cemetery",
        ],
      },
      {
        heading: "III. Sino ang kwalipikado sa programa?",
        body: "Indigent o mahirap na pamilya ng mga namatay na residente ng Gov Service.",
      },
      {
        heading: "IV. Mga Dokumentong Kailangan",
        list: [
          "Referral Form mula sa barangay, hospital o funeral",
          "Certified True Copy ng Death Certificate",
          "Notarized Funeral Contract (Original Copy; nakatala ang mga serbisyo at ang amount)",
          'Certificate of Indigency (Original Copy; specified for "funeral/burial assistance"; may dry seal at pirmado ng barangay captain o kanyang duly assigned representative)',
          "Photocopy ng Valid Identification (ID) ng deceased at ng Informant, preferably Gov Service ID (may photo at signature)",
        ],
      },
    ],
  },

  aicsEducational: {
    key: "aicsEducational",
    programTitle:
      "SERVICE REQUIREMENTS FOR THE EDUCATIONAL ASSISTANCE FOR CHILDREN WITH DISABILITIES:",
    sections: [
      {
        heading: "I. Ano ang Educational Assistance for Children with Disabilities?",
        body:
          "Ang programang ito ay nagbibigay ng tulong-pinansyal sa mga taong may kapansanan upang masuportahan ang gastusing pang edukasyon. Ang halaga ay ₱5,000 para sa bawat kwalipikadong benepisyaryo.",
      },
      {
        heading: "II. Sino ang kwalipikado sa programa?",
        list: [
          "Taga-Gov Service na may rehistradong anak/bata na may kapansanan (may Gov Service PWD ID)",
          "Edad 6 hanggang 30",
          "Kasalukuyang nag-aaral sa pampublikong paaralan mula SPED hanggang Grade 10",
          "Kabilang sa isang mahirap na pamilya na may buwanang kita na ₱13,873 pababa",
        ],
        listClassName: "text-blue-600 list-disc",
      },
      {
        heading: "III. Mga Dokumentong Kailangan",
        list: [
          "Kopya ng pinakabagong school ID o pinakahuling Certificate of Enrollment ng benepisyaryo",
          "Sertipiko ng Indigency na inisyu ng Barangay na nagsasaad ng layunin ng pag-avail ng SSDD Educational Assistance",
          "Gov Service ID / PWD ID",
        ],
      },
      {
        heading: "IV. Mahalagang Paalala",
        list: [
          "Makakatanggap ng halagang ₱5,000 para sa bawat qualified applicant",
          "Ibinibigay lamang ito isang taon bawat pamilya",
          "Bibigyan ng prioridad ang mga aplikanteng hindi pa nakakatanggap ng assistance sa nakalipas na dalawang taon (2)",
        ],
      },
    ],
    faqs: [
      {
        question: "1. Sino ang maaaring makabenipisyo mula sa programang ito?",
        answer: "Kabilang sa isang mahirap na pamilya na may buwanang kita na ₱13,873 pababa.",
      },
      {
        question: "2. Kailangan po ba ng Gov Service ID para maka-avail ng serbisyong ito?",
        answer: "Ang aplikante po ay dapat may Gov Service ID / PWD ID.",
      },
      {
        question: "3. Ano ang mga kakailanganin na dokumento?",
        answer:
          "Kopya ng pinakabagong school ID o pinakahuling Certificate of Enrollment ng benepisyaryo. Sertipiko ng Indigency na inisyu ng Barangay na nagsasaad ng layunin ng pag-avail ng SSDD Educational Assistance. Gov Service ID / PWD ID.",
      },
      {
        question: "4. Paano mag-sumite ng aplikasyon para sa Educational Assistance Program?",
        answer:
          "Maaaring buksan ang online portal at pumunta sa porsyon ng SSDD (Social Services Development Department). Maaaring kompletuhin ang mga kinakailangang dokumento bago magsumite ng aplikasyon.",
      },
      {
        question: "5. Saan pwedeng i-upload ang mga dokumento?",
        answer:
          "Maaaring i-upload ang mga kinakailangang dokumento sa SSDD portal ng Gov Service.",
      },
      {
        question: "6. Magkano ang matatanggap sa Educational Assistance Program?",
        answer:
          "Makakatanggap ng halagang ₱5,000 para sa bawat qualified applicant. Paalala: ibinibigay lamang ito isang taon bawat pamilya.",
      },
      {
        question: "7. Kung natanggap na po ako ng educational assistance, maaari pa rin po ba akong mag-apply?",
        answer:
          "Bibigyan ng prioridad ang mga aplikanteng hindi pa nakakatanggap ng assistance sa nakalipas na dalawang taon (2).",
      },
    ],
  },
  aicsMaterial: {
    key: "aicsMaterial",
    programTitle: "SERVICE REQUIREMENTS FOR THE MATERIAL ASSISTANCE PROGRAM",
    sections: [
      {
        heading: "I. Ano ang Material Assistance Program?",
        body:
          "Ang Material Assistance Program ay nagbibigay ng tulong sa mga indibidwal o pamilyang nakakaranas ng crisis situation at nangangailangan ng non-food items o pangunahing gamit, depende sa assessment ng social worker.",
      },
      {
        heading: "II. Sino ang maaaring mag-apply?",
        list: [
          "Mga residenteng nangangailangan ng material assistance dahil sa crisis situation.",
          "Mga indibidwal o pamilyang nangangailangan ng basic non-food items.",
        ],
        listClassName: "text-blue-600 list-disc",
      },
      {
        heading: "III. Requirements",
        body: "Para sa Applicant:",
        list: [
          "Barangay Certificate of Indigency / Residency",
          "Gov Service ID o Valid Government-Issued ID",
          "Supporting document, kung applicable",
        ],
        note: "Depende sa uri ng assistance:",
        noteList: [
          "Hygiene Kit",
          "Sleeping Kit",
          "Clothing Assistance",
          "School Supplies",
          "Starter Kit",
          "Assistive Devices",
        ],
      },
    ],
  },
  aicsFood: {
    key: "aicsFood",
    programTitle: "SERVICE REQUIREMENTS FOR THE FOOD ASSISTANCE PROGRAM",
    sections: [
      {
        heading: "I. Ano ang Food Assistance Program?",
        body:
          "Ang Food Assistance Program ay nagbibigay ng tulong sa mga indibidwal o pamilyang nakakaranas ng crisis situation at nangangailangan ng pagkain o food support.",
      },
      {
        heading: "II. Sino ang maaaring mag-apply?",
        list: [
          "Mga residenteng nakakaranas ng crisis situation.",
          "Mga indibidwal o pamilyang nangangailangan ng food assistance.",
        ],
        listClassName: "text-blue-600 list-disc",
      },
      {
        heading: "III. Requirements",
        body: "Para sa Applicant:",
        list: [
          "Barangay Certificate of Indigency / Residency",
          "Gov Service ID o Valid Government-Issued ID",
          "Supporting document, kung applicable",
        ],
        note: "Type of Food Assistance:",
        noteList: [
          "Food Pack",
          "Emergency Food Assistance",
        ],
      },
    ],
  },
  aicsTransportation: {
    key: "aicsTransportation",
    programTitle: "SERVICE REQUIREMENTS FOR THE TRANSPORTATION ASSISTANCE PROGRAM",
    sections: [
      {
        heading: "I. Ano ang Transportation Assistance Program?",
        body:
          "Ang Transportation Assistance Program ay nagbibigay ng tulong sa mga indibidwal o pamilyang nasa crisis situation na nangangailangan ng assistance para sa kanilang paglalakbay, lalo na para sa Balik-Probinsya. Sa Gov Service, maaaring kabilang ang assistance ang pagbili ng ticket at iba pang travel support depende sa assessment.",
      },
      {
        heading: "II. Sino ang maaaring mag-apply?",
        list: [
          "Mga indibidwal o pamilyang nasa crisis situation.",
          "Indigent Gov Service residents na nangangailangan ng transportation assistance.",
        ],
        listClassName: "text-blue-600 list-disc",
      },
      {
        heading: "III. Requirements",
        body: "Para sa Applicant:",
        list: [
          "Barangay Certificate of Residency / Indigency",
          "Valid Government-Issued ID (Preferably Gov Service ID)",
        ],
        note: "Para sa Balik-Probinsya, kung applicable:",
        noteList: [
          "Travel Clearance",
          "Health Certificate / Fit-to-Travel Certificate",
        ],
      },
      {
        heading: "Mahalagang Paalala",
        body:
          "Ang Gov Service guide para sa Balik-Probinsya ay partikular na naglilista ng Barangay Certificate of Residency/Indigency, Travel Clearance, Health Certificate at valid government ID.",
      },
    ],
  },
}

interface RequirementsModalProps {
  requirements: ProgramRequirements
  accepted: boolean
  onAcceptedChange: (checked: boolean) => void
  onContinue: () => void

  showInfoBanner?: boolean
  onCloseInfoBanner?: () => void

  showSlotBanner?: boolean
  onCloseSlotBanner?: () => void

  onClose?: () => void
  serviceTitle?: string
  badgeLabel?: string
  badgeColor?: string
}

export default function RequirementsModal({
  requirements,
  accepted,
  onAcceptedChange,
  onContinue,
  showInfoBanner = true,
  onCloseInfoBanner,
  showSlotBanner = true,
  onCloseSlotBanner,
  onClose,
  serviceTitle,
  badgeLabel,
  badgeColor,
}: RequirementsModalProps) {
  const { t } = useLanguage()

  const handleDismiss = () => {
    if (onClose) {
      onClose()
    } else if (onContinue) {
      onContinue()
    }
  }

  const modalTitle = serviceTitle
    ? serviceTitle.toLowerCase().startsWith("requirements")
      ? serviceTitle
      : `Requirements for Application of ${serviceTitle}`
    : "Requirements for Application of AICS Assistance"

  const modalBadge = badgeLabel || serviceTitle || "AICS Assistance"
  const modalBadgeColor = badgeColor || "bg-blue-50 text-blue-700 border-blue-200"

  return (
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative cursor-default animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header (Matches Pic 2) */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
            <h2 className="text-base md:text-lg font-bold text-foreground truncate">
              {modalTitle}
            </h2>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${modalBadgeColor}`}>
              {modalBadge}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            type="button"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content (Matches Pic 2) */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Important reminder (Blue Box) */}
          {showInfoBanner && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">{t("importantReminder") || "Important reminder"}</p>
                <p className="text-sm text-blue-800 mt-0.5">Please scroll and read all requirements below.</p>
              </div>
              {onCloseInfoBanner && (
                <button
                  type="button"
                  onClick={onCloseInfoBanner}
                  className="text-blue-500 hover:text-blue-700 cursor-pointer"
                  aria-label="Close alert"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Slot / Alert Banner (Amber Box) */}
          {showSlotBanner && requirements.slotBannerText && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-amber-900 flex-1">
                {requirements.slotBannerText}
              </p>
              {onCloseSlotBanner && (
                <button
                  type="button"
                  onClick={onCloseSlotBanner}
                  className="text-amber-500 hover:text-amber-700 cursor-pointer"
                  aria-label="Close slot banner"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-5">
            {requirements.sections.map((section, i) => (
              <div key={i} className="space-y-2">
                <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
                  {section.heading}
                </h3>

                {section.body && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {section.body}
                  </p>
                )}

                {section.list && (
                  <ul className="space-y-2.5 mb-3">
                    {section.list.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span className="text-blue-600 font-bold leading-none mt-1 shrink-0">•</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.note && (
                  <p className="text-xs font-semibold text-foreground mt-3 mb-1.5">{section.note}</p>
                )}

                {section.noteList && (
                  <ul className="space-y-2 mb-3 pl-2">
                    {section.noteList.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-blue-600 font-bold leading-none mt-1 shrink-0">•</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {requirements.faqs && requirements.faqs.length > 0 && (
              <div className="pt-2">
                <h4 className="font-bold text-sm text-foreground mb-3 uppercase tracking-wide">
                  Frequently Asked Questions (FAQ):
                </h4>
                <div className="space-y-3">
                  {requirements.faqs.map((faq, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-900/60 border border-border/80 dark:border-slate-800 rounded-xl p-3.5">
                      <p className="font-semibold text-xs text-blue-900 dark:text-blue-300">{faq.question}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Matches Pic 2) */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-border dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-start gap-2.5 flex-1">
            <input
              type="checkbox"
              id="aics-modal-understand"
              checked={accepted}
              onChange={(e) => onAcceptedChange(e.target.checked)}
              className="mt-0.5 cursor-pointer accent-blue-600 h-4 w-4"
            />
            <label htmlFor="aics-modal-understand" className="text-xs md:text-sm text-foreground cursor-pointer select-none">
              {t("requirementsAcceptCheckbox") || "I accept and understand the documentary requirements for this service"}
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              onAcceptedChange(true)
              onContinue()
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all shrink-0 cursor-pointer shadow-sm"
          >
            Ipagpatuloy ang Aplikasyon
          </button>
        </div>
      </div>
    </div>
  )
}

