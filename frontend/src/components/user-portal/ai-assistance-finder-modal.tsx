import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  X,
  ArrowRight,
  Info,
  ShieldAlert,
  Users,
  Baby,
  HeartHandshake,
  GraduationCap,
  Wallet,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Printer,
  RotateCcw,
  Check,
  Stethoscope,
  BookOpen,
  Send,
  Bot,
  MessageSquare,
  Loader2,
  Scale,
  BadgeCheck,
  Clock,
  Building2,
  MapPin,
  Activity,
} from "lucide-react"
import { useLanguage, type Language } from "../ui/language-context"
import { API_BASE } from "../../config/api"

interface AIAssistanceFinderModalProps {
  isOpen: boolean
  onClose: () => void
}

// Full Multilingual Dictionary for the AI Interview & Recommendation Engine
const I18N = {
  en: {
    modalTitle: "MSWDO Smart Social Assistance Intake Interview",
    modalBadge: "AI POWERED",
    modalSubtitle: "Complete this guided intake survey to identify all municipal social welfare programs you are eligible for.",
    step1Tab: "1. Household & Demographics",
    step2Tab: "2. Current Hardships & Crisis",
    step3Tab: "3. Narrative Statement",
    step4Tab: "4. AI Assessment & Recommendations",

    // Step 1
    s1Title: "Household Profile & Socio-Economic Demographics",
    s1Subtitle: "Please provide baseline demographic and living conditions to ensure precise MSWDO policy evaluation.",
    qApplicant: "Who is the primary applicant?",
    optSelf: "Myself (Individual)",
    optChild: "My Child / Minor Dependent",
    optSenior: "Senior Citizen Parent / Relative (60+)",
    optPwd: "Family Member with Disability (PWD)",
    optFamily: "Entire Household / Family",

    qIncome: "Estimated Total Monthly Household Income:",
    optIncNone: "No regular income / Informal daily survival",
    optIncLow: "Below ₱10,000 per month (Indigent threshold)",
    optIncMid: "₱10,000 – ₱18,000 per month (Low income)",
    optIncHigh: "Above ₱18,000 per month",

    qDependents: "Number of Dependent Family Members:",
    optDep12: "1 to 2 members",
    optDep35: "3 to 5 members",
    optDep6p: "6 or more members",

    qEmployment: "Primary Earner Employment Status:",
    optEmpUnemployed: "Unemployed / Looking for work",
    optEmpDaily: "Daily Wage / Sideline / Informal vendor",
    optEmpContractual: "Contractual / Agency employee",
    optEmpRegular: "Regular / Self-employed business",

    qResidency: "Residency & Housing Condition:",
    optResOwner: "Permanent Resident (Own house/lot)",
    optResRenter: "Renting / Boarding resident",
    optResInformal: "Informal Settler / Temporary shelter",

    qBarangay: "Barangay of Residence (Within Municipality):",
    optBrgyPoblacion: "Barangay Poblacion (Municipal Proper)",
    optBrgySanIsidro: "Barangay San Isidro",
    optBrgyStaMaria: "Barangay Santa Maria",
    optBrgySanVicente: "Barangay San Vicente",
    optBrgyOther: "Other Registered Barangay (Within Municipality)",
    optBrgyTransient: "Transient / Non-Resident / Stranded (Displaced / Emergency)",

    qSocialRegistry: "Existing Government Social Welfare Program Status:",
    optRegNon4Ps: "Non-4Ps Household (Direct Citizen Applicant)",
    optReg4Ps: "Active 4Ps Beneficiary (Pantawid Pamilyang Pilipino)",
    optRegSocialPension: "Indigent Social Pensioner / OSCA Member",
    optRegListahanan: "Listahanan-3 Identified Poor Household",

    qHealthInsurance: "Health Insurance & Medical Coverage (PhilHealth):",
    optHealthIndigent: "PhilHealth Indigent / Sponsored (LGU / DSWD)",
    optHealthSenior: "Senior Citizen Automatic Member (RA 10645)",
    optHealthEmployed: "Direct Contributor / Employed Member",
    optHealthNone: "No Active PhilHealth / Unenrolled",

    qUrgency: "Assistance Urgency & Timeline Need:",
    optUrgImmediate: "Immediate Emergency (Within 24–48h - Hospital Discharge / Burial / Crisis)",
    optUrgUrgent: "Urgent Need (Within 1–2 Weeks - Unpaid bills / Medicines)",
    optUrgStandard: "Standard Application (Regular Welfare ID / Annual Pension / Livelihood)",

    // Step 2: Real Life Circumstances & Hardships
    s2Title: "Current Life Situation & Hardships",
    s2Subtitle: "Select all real-life challenges or emergencies your household is currently facing. Our AI will automatically identify and diagnose the exact government programs you qualify for:",

    hMedTitle: "Medical Emergency, Hospitalization, or Costly Medications",
    hMedDesc: "Hospital admission, surgery bills, ongoing dialysis/chemo, laboratory fees, or maintenance prescription drugs you cannot afford.",

    hBurialTitle: "Bereavement & Death in the Family",
    hBurialDesc: "Recent passing of a loved one and struggling to pay for funeral parlor, casket, or burial plot expenses.",

    hFoodTitle: "Immediate Food Insecurity & Crisis Survival",
    hFoodDesc: "Lack of funds to buy daily groceries and milk, acute hunger, or total loss of household income.",

    hTranspoTitle: "Stranded / Emergency Provincial Travel",
    hTranspoDesc: "Stranded in the municipality/city with no money for travel fare to return to your home province.",

    hPwdTitle: "Family Member with Physical or Mental Disability",
    hPwdDesc: "A member has a physical, mental, visual, or hearing impairment, or lacks assistive devices like wheelchairs/canes.",

    hSeniorTitle: "Vulnerable Senior Citizen (60+ Years Old)",
    hSeniorDesc: "Living with an elderly parent or relative who has no adequate pension and struggles with medical maintenance.",

    hSoloParentTitle: "Single Parent Raising Children Alone",
    hSoloParentDesc: "Single-handedly bearing the responsibility of raising minor dependent children without spousal or co-parent support.",

    hChildTitle: "Young Children (0–5 yrs) Nutrition & Early Daycare",
    hChildDesc: "Have infants or toddlers who are underweight, need supplemental milk feeding, or early daycare education.",

    hLivelihoodTitle: "Lack of Livelihood Capital or Vocational Skills",
    hLivelihoodDesc: "Unemployed or informal daily earner needing startup seed funds for a micro-enterprise (sari-sari store, street vending) or free TESDA skills certification.",

    // Step 3
    s3Title: "Narrative Statement of Situation",
    s3Subtitle: "Describe your family's current emergency or financial hardship in your own words:",
    narrativePlaceholder: "Example: I am a single mother of 3 children living in Barangay Poblacion. My youngest child was recently hospitalized with pneumonia, and I currently have no stable work to pay the hospital bill...",
    quickChipsLabel: "Or click a pre-filled scenario:",
    chip1: "Hospital bills & maintenance medicines",
    chip2: "Solo parent needing store capital & child subsidy",
    chip3: "Bereavement / Funeral expenses for deceased parent",
    chip4: "Indigent senior citizen needing pension & wheelchair",

    // Actions
    btnNext: "Next Step",
    btnBack: "Previous",
    btnAnalyze: "Analyze & Generate AI Recommendation",
    btnAnalyzing: "Gemini AI is diagnosing MSWDO policies & household circumstances...",
    btnRetake: "Retake Intake Interview",
    btnApply: "Start Application",
    btnPrint: "Print Summary",
    btnClose: "Close",

    // Results
    resTitle: "Personalized MSWDO Social Assistance Recommendation",
    resSubtitle: "Based on your intake answers, you are eligible for the following municipal government programs:",
    matchConfidence: "Eligibility Match Score",
    statusEligible: "Highly Qualified for Government Aid",
    reqDocsTitle: "Required Documents to Prepare (Original & Copies):",
    rationaleTitle: "AI Policy Justification & Legal Basis (Transparency):",
    actionAdviceTitle: "Recommended Action Plan & Next Steps:",
    geminiBadge: "Verified by Google Gemini AI Engine",
    legalBasisLabel: "Statutory Legal Basis:",
    criteriaMatchedLabel: "Why You Qualify (Matched Eligibility Criteria):",
    householdMatrixTitle: "Citizen Household Eligibility Profile",
    incomeTierBadge: "Income Bracket Verified:",
    dependencyBadge: "Household Vulnerability:",
    statusPrescreened: "MSWDO Pre-Screened & Qualified",
    urgencyTierLabel: "Assessed Priority Tier:",
    windowLabel: "Designated MSWDO Window / Unit:",
    turnaroundLabel: "Processing Turnaround:",
    socialRegistryLabel: "Welfare Registry Status:",
    healthCoverageLabel: "Health Coverage / PhilHealth:",
    askGeminiTitle: "Ask MSWDO AI Social Worker Assistant",
    askGeminiSubtitle: "Have questions regarding documentary requirements, processing days, or appeal procedures? Ask below:",
    askGeminiPlaceholder: "Example: How many days will it take for medical assistance to be released?",
    askGeminiSend: "Send Question",
    askGeminiThinking: "Gemini AI is generating official MSWDO guidance...",
    chipPrompt1: "How fast is AICS medical aid released?",
    chipPrompt2: "What if I don't have a Barangay Indigency?",
    chipPrompt3: "Can I receive both Solo Parent & AICS help?",
    officialDisclaimerTitle: "Official Administrative Pre-Screening & Final Approval Notice",
    officialDisclaimerText: "Please be advised that this assessment is an automated AI-generated diagnostic and pre-screening tool designed to assist citizens in identifying applicable municipal social welfare programs. Official case validation, physical document verification, and the final decision to approve or disapprove any application, ID card, or cash assistance grant remain under the sole official authority and professional evaluation of the licensed MSWDO Social Workers and Department Officers.",
    disclaimer: "* This AI assessment serves as an automated pre-screening diagnostic. Official approval is subject to case validation by the licensed MSWDO Social Worker.",
  },

  tl: {
    modalTitle: "MSWDO Matalinong Panayam at Gabay sa Tulong Panlipunan",
    modalBadge: "AI POWERED",
    modalSubtitle: "Kumpletuhin ang gabay na panayam na ito upang matukoy ang lahat ng programa ng pamahalaan kung saan ka kwalipikado.",
    step1Tab: "1. Pamilya at Demograpiko",
    step2Tab: "2. Mga Hamon at Sitwasyon",
    step3Tab: "3. Sitwasyon at Kwento",
    step4Tab: "4. Rekomendasyon ng AI",

    // Step 1
    s1Title: "Profile ng Sambahayan at Katayuang Sosyo-Ekonomiko",
    s1Subtitle: "Magbigay ng detalyadong impormasyon tungkol sa iyong pamilya at kalagayan sa buhay para sa tumpak na ebalwasyon.",
    qApplicant: "Para kanino ang hinihinging tulong?",
    optSelf: "Aking Sarili (Indibidwal)",
    optChild: "Aking Anak / Menor de edad na Dependent",
    optSenior: "Magulang o Kamag-anak na Senior Citizen (60+)",
    optPwd: "Miyembro ng Pamilya na may Kapansanan (PWD)",
    optFamily: "Buong Pamilya / Sambahayan",

    qIncome: "Tinatayang Kabuuang Buwanang Kita ng Sambahayan:",
    optIncNone: "Walang regular na kita / Arawang pangkabuhayan lamang",
    optIncLow: "Mababa sa ₱10,000 bawat buwan (Indigent threshold)",
    optIncMid: "₱10,000 – ₱18,000 bawat buwan (Mababang kita)",
    optIncHigh: "Higit sa ₱18,000 bawat buwan",

    qDependents: "Bilang ng mga Umaasang Miyembro (Dependents):",
    optDep12: "1 hanggang 2 tao",
    optDep35: "3 hanggang 5 tao",
    optDep6p: "6 o higit pang miyembro",

    qEmployment: "Kalagayan sa Trabaho ng Pangunahing Nagtatrabaho:",
    optEmpUnemployed: "Walang trabaho / Naghahanap ng mapapasukan",
    optEmpDaily: "Arawan / Sideline / Manininda sa lansangan",
    optEmpContractual: "Kontraktwal / Agency employee",
    optEmpRegular: "Regular na empleyado / May sariling negosyo",

    qResidency: "Katayuan sa Paninirahan at Bahay:",
    optResOwner: "Permanenteng Residente (May sariling bahay/lupa)",
    optResRenter: "Nangungupahan / Umuupa ng kwarto",
    optResInformal: "Informal Settler / Pansamantalang tirahan",

    qBarangay: "Barangay ng Paninirahan sa Munisipyo:",
    optBrgyPoblacion: "Barangay Poblacion (Poblacion Proper)",
    optBrgySanIsidro: "Barangay San Isidro",
    optBrgyStaMaria: "Barangay Santa Maria",
    optBrgySanVicente: "Barangay San Vicente",
    optBrgyOther: "Ibang Rehistradong Barangay (Sa Loob ng Munisipyo)",
    optBrgyTransient: "Transient / Dumaraan / Na-stranded (Emergency)",

    qSocialRegistry: "Kasalukuyang Katayuan sa Social Welfare / 4Ps:",
    optRegNon4Ps: "Hindi Miyembro ng 4Ps (Karaniwang Mamamayan)",
    optReg4Ps: "Aktibong Benepisyaryo ng 4Ps (Pantawid Pamilya)",
    optRegSocialPension: "Indigent Social Pensioner / OSCA Member",
    optRegListahanan: "Kabilang sa Listahanan-3 Identified Poor",

    qHealthInsurance: "Seguro sa Kalusugan / PhilHealth Coverage:",
    optHealthIndigent: "PhilHealth Indigent / Sponsored (LGU / DSWD)",
    optHealthSenior: "Senior Citizen Automatic PhilHealth (RA 10645)",
    optHealthEmployed: "Direktang Nagbabayad / May Trabaho",
    optHealthNone: "Walang PhilHealth / Hindi Rehistrado",

    qUrgency: "Kagyat na Pangangailangan at Panahon:",
    optUrgImmediate: "Kagyat na Emergency (Sa loob ng 24–48h - Ospital / Libing / Krisis)",
    optUrgUrgent: "Mabilisang Pangangailangan (Sa loob ng 1–2 Linggo - Gamot / Reseta)",
    optUrgStandard: "Karaniwang Aplikasyon (ID Card / Taunang Pensyon / Puhunan)",

    // Step 2: Real Life Circumstances & Hardships
    s2Title: "Kasalukuyang Kalagayan at Nararanasang Krisis",
    s2Subtitle: "Piliin ang mga totoong suliranin o krisis na nararanasan ng iyong pamilya ngayon. Awtomatikong tutukuyin ng AI ang lahat ng programa ng tulong na naaangkop sa inyo:",

    hMedTitle: "Emergency sa Ospital, Operasyon, o Reseta ng Gamot",
    hMedDesc: "Nasa ospital, kailangan ng dialysis, chemotherapy, operasyon, lab tests, o reseta ng maintenance na gamot na walang pambili.",

    hBurialTitle: "Namatayan ng Kapamilya at Gastusin sa Libing",
    hBurialDesc: "Namatayan kamakailan at walang pambayad sa punerarya, kabaong, burol, o pagpapalibing.",

    hFoodTitle: "Kakulangan sa Pagkain at Arawang Pangangailangan",
    hFoodDesc: "Walang makain, labis na gutom ang pamilya, o biglaang nawalan ng kita ang pangunahing nagtatrabaho.",

    hTranspoTitle: "Na-stranded o Pamasahe Pauwi sa Probinsya",
    hTranspoDesc: "Walang pamasahe pauwi sa sariling probinsya o naipit sa lungsod matapos mawalan ng matitirhan o trabaho.",

    hPwdTitle: "May Kapamilyang may Kapansanan (PWD)",
    hPwdDesc: "Nahihirapan kumilos, makakita, o makarinig; kailangan ng wheelchair, saklay, hearing aid, o PWD ID.",

    hSeniorTitle: "May Nakatatandang Magulang o Kasambahay (60+ Anyos)",
    hSeniorDesc: "Walang sapat na pensyon, mataas ang gastos sa gamot, o nangangailangan ng social pension at alaga.",

    hSoloParentTitle: "Solong Magulang na Nagtataguyod sa mga Anak",
    hSoloParentDesc: "Mag-isang nagpapalaki at bumubuhay sa mga anak na menor de edad nang walang suporta mula sa dating kabiyak.",

    hChildTitle: "Bata (0–5 anyos) na Kulang sa Timbang o Kailangan ng Daycare",
    hChildDesc: "Payat o kulang sa nutrisyon ang bata, o kailangang ipasok sa libreng Daycare / Child Development Center.",

    hLivelihoodTitle: "Walang Trabaho / Kailangan ng Puhunan o Pagsasanay",
    hLivelihoodDesc: "Nais magsimula ng maliit na negosyo (sari-sari store, paninda) o makakuha ng libreng skills training sa TESDA.",

    // Step 3
    s3Title: "Kwento at Detalye ng Kasalukuyang Krisis",
    s3Subtitle: "Ilarawan gamit ang sariling salita ang pinakamabigat na suliranin o pangangailangan ng pamilya:",
    narrativePlaceholder: "Halimbawa: Ako po ay isang solong ina na may 3 anak mula Barangay Poblacion. Na-ospital po ang bunso kong anak dahil sa pneumonia at wala po akong regular na trabaho pambayad sa billing...",
    quickChipsLabel: "O pumili ng mabilisang sitwasyon:",
    chip1: "Hospital bills at maintenance na gamot ng may sakit",
    chip2: "Solong magulang na kailangan ng puhunan at ayuda sa anak",
    chip3: "Gastusin sa burol at libing ng namatayang magulang",
    chip4: "Matandang senior na kailangan ng social pension at wheelchair",

    // Actions
    btnNext: "Susunod na Hakbang",
    btnBack: "Bumalik",
    btnAnalyze: "Suriin at Magbigay ng Rekomendasyon ng AI",
    btnAnalyzing: "Sinusuri ng Gemini AI ang mga panuntunan ng MSWDO at datos ng pamilya...",
    btnRetake: "Ulitin ang Panayam",
    btnApply: "Mag-apply Agad",
    btnPrint: "I-print ang Buod",
    btnClose: "Isara",

    // Results
    resTitle: "Personal na Rekomendasyon ng Tulong Panlipunan ng MSWDO",
    resSubtitle: "Batay sa iyong mga isinumiteng sagot sa panayam, ikaw ay kwalipikado sa mga sumusunod na programa:",
    matchConfidence: "Antas ng Pagiging Kwalipikado (Match Score)",
    statusEligible: "Lubos na Kwalipikado sa Tulong ng Pamahalaan",
    reqDocsTitle: "Mga Dokumentong Dapat Ihanda (Orihinal at Kopya):",
    rationaleTitle: "Paliwanag at Batayan sa Batas (AI Transparency):",
    actionAdviceTitle: "Mga Inirerekomendang Hakbang at Plano:",
    geminiBadge: "Sinuri at Pinatotohanan ng Google Gemini AI",
    legalBasisLabel: "Batayan sa Batas:",
    criteriaMatchedLabel: "Bakit Ka Kwalipikado (Tugmang Pamantayan):",
    householdMatrixTitle: "Profile ng Kwalipikasyon ng Sambahayan",
    incomeTierBadge: "Antas ng Kita:",
    dependencyBadge: "Kalagayan ng Pamilya:",
    statusPrescreened: "Pre-Screened ng MSWDO",
    urgencyTierLabel: "Antas ng Prayoridad:",
    windowLabel: "Nakatalagang Window / Unit ng MSWDO:",
    turnaroundLabel: "Araw ng Pagproseso:",
    socialRegistryLabel: "Katayuan sa 4Ps / Registry:",
    healthCoverageLabel: "PhilHealth / Medical Coverage:",
    askGeminiTitle: "Magtanong sa MSWDO AI Social Worker Assistant",
    askGeminiSubtitle: "May mga katanungan tungkol sa mga dokumento, araw ng pag-release, o proseso? Magtanong dito:",
    askGeminiPlaceholder: "Halimbawa: Ilang araw bago makuha ang guarantee letter para sa ospital?",
    askGeminiSend: "Magtanong",
    askGeminiThinking: "Bumubuo ang Gemini AI ng opisyal na sagot batay sa panuntunan...",
    chipPrompt1: "Ilang araw ang pag-release ng tulong medikal sa AICS?",
    chipPrompt2: "Pano po kung walang Certificate of Indigency?",
    chipPrompt3: "Pwede bang sabay na kumuha ng Solo Parent at AICS?",
    officialDisclaimerTitle: "Opisyal na Paunawa sa AI Pre-Screening at Pinal na Pag-apruba ng Kawani",
    officialDisclaimerText: "Mahalagang Paunawa: Ang pagsusuring ito ay gabay at automated pre-screening lamang na binuo ng AI upang matulungan kayong matukoy ang mga nararapat na programa ng pamahalaan. Ang opisyal na pagsusuri, beripikasyon ng mga orihinal na dokumento, at ang pinal na pagpapasya kung aaprubahan o tatanggihan ang aplikasyon at ayuda ay ganap na nakasalalay sa pagpapasya at ebalwasyon ng mga lisensyadong Social Worker at opisyal ng MSWDO.",
    disclaimer: "* Ang pagsusuring ito ng AI ay nagsisilbing automated pre-screening. Ang pinal na pag-apruba ay nakasalalay sa pagsusuri ng lisensyadong Social Worker ng MSWDO.",
  },

  bis: {
    modalTitle: "MSWDO Maalamon nga Interbyu ug Giya sa Tabang Sosyal",
    modalBadge: "AI POWERED",
    modalSubtitle: "Kompletuha kining giya nga interbyu aron mahibal-an ang tanang programa sa gobyerno nga angayan nimong madawat.",
    step1Tab: "1. Pamilya ug Demograpiko",
    step2Tab: "2. Mga Kalisod ug Kahimtang",
    step3Tab: "3. Sitwasyon ug Sugilanon",
    step4Tab: "4. Rekomendasyon sa AI",

    // Step 1
    s1Title: "Profile sa Panimalay ug Panginabuhian",
    s1Subtitle: "Palihog paghatag og detalyadong kasayuran bahin sa imong pamilya ug kahimtang sa kinabuhi.",
    qApplicant: "Para kang kinsa ang gipangayo nga tabang?",
    optSelf: "Akong Kaugalingon (Indibidwal)",
    optChild: "Akong Anak / Menor de edad nga Pamilya",
    optSenior: "Ginikanan o Kabanay nga Senior Citizen (60+)",
    optPwd: "Miyembro sa Pamilya nga may Kapansanan (PWD)",
    optFamily: "Tibuok Pamilya / Panimalay",

    qIncome: "Gibanabana nga Kinatibuk-ang Kita sa Panimalay Kada Buwan:",
    optIncNone: "Walay regular nga kita / Adlaw-adlaw nga pangita lang",
    optIncLow: "Ubos sa ₱10,000 kada buwan (Indigent threshold)",
    optIncMid: "₱10,000 – ₱18,000 kada buwan (Ubos nga kita)",
    optIncHigh: "Labaw sa ₱18,000 kada buwan",

    qDependents: "Gidaghanon sa mga Nagsalig nga Miyembro (Dependents):",
    optDep12: "1 hangtod 2 ka tawo",
    optDep35: "3 hangtod 5 ka tawo",
    optDep6p: "6 o labaw pa nga miyembro",

    qEmployment: "Kahimtang sa Trabaho sa Nag-unang Nagtrabaho:",
    optEmpUnemployed: "Walay trabaho / Nangita og trabaho",
    optEmpDaily: "Adlawan / Sideline / Namaligya sa kadalanan",
    optEmpContractual: "Kontraktwal / Agency employee",
    optEmpRegular: "Regular nga empleyado / Naay kaugalingong negosyo",

    qResidency: "Kahimtang sa Puy-anan:",
    optResOwner: "Permanenteng Residente (Tag-iya sa balay/yuta)",
    optResRenter: "Nag-abang og kwarto o balay",
    optResInformal: "Informal Settler / Temporaryong puy-anan",

    qBarangay: "Barangay sa Puy-anan sa Munisipyo:",
    optBrgyPoblacion: "Barangay Poblacion (Sentro)",
    optBrgySanIsidro: "Barangay San Isidro",
    optBrgyStaMaria: "Barangay Santa Maria",
    optBrgySanVicente: "Barangay San Vicente",
    optBrgyOther: "Laing Rehistradong Barangay (Sulod sa Munisipyo)",
    optBrgyTransient: "Transient / Na-stranded (Dinalian)",

    qSocialRegistry: "Kahimtang sa Social Welfare / 4Ps:",
    optRegNon4Ps: "Dili Miyembro sa 4Ps (Direktang Lungsuranon)",
    optReg4Ps: "Aktibong Benepisyaryo sa 4Ps (Pantawid Pamilya)",
    optRegSocialPension: "Indigent Social Pensioner / OSCA Member",
    optRegListahanan: "Listahanan-3 Identified Poor",

    qHealthInsurance: "Seguro sa Panglawas / PhilHealth Coverage:",
    optHealthIndigent: "PhilHealth Indigent / Sponsored (LGU / DSWD)",
    optHealthSenior: "Senior Citizen Automatic PhilHealth (RA 10645)",
    optHealthEmployed: "Direktang Nagbayad / May Trabaho",
    optHealthNone: "Walay PhilHealth / Dili Rehistrado",

    qUrgency: "Gidugayon sa Panginahanglan:",
    optUrgImmediate: "Dinalian nga Emergency (Sulod sa 24–48h - Ospital / Lubong / Krisis)",
    optUrgUrgent: "Gikinahanglan Diriot (Sulod sa 1–2 Semana - Tambal / Reseta)",
    optUrgStandard: "Standard nga Aplikasyon (ID Card / Pension / Puhunan)",

    // Step 2: Real Life Circumstances & Hardships
    s2Title: "Kasamtangang Kalisdanan ug Sitwasyon sa Panimalay",
    s2Subtitle: "Pilia ang tanang tinuod nga kalisod o emerhensiya nga gi-atubang sa inyong panimalay karon. Tumbokon sa AI ang tanang tabang sa gobyerno nga angayan ninyong madawat:",

    hMedTitle: "Emergency sa Ospital, Operasyon, o Reseta sa Tambal",
    hMedDesc: "Naa sa ospital, nagkinahanglan og dialysis, chemotherapy, operasyon, lab tests, o tambal nga walay ipalit.",

    hBurialTitle: "Namatyan og Pamilya ug Gasto sa Lubong",
    hBurialDesc: "Namatyan bag-ohay lang ug walay ikabayad sa punerarya, lungon, haya, o paglubong.",

    hFoodTitle: "Kulang sa Pagkaon ug Adlaw-adlaw nga Panginahanglan",
    hFoodDesc: "Walang makaon, gutom, o dinaliang nawad-an og kita ang nag-unang nagtrabaho sa panimalay.",

    hTranspoTitle: "Na-stranded o Plete Pauli sa Probinsya",
    hTranspoDesc: "Walay pamasahe pauli sa probinsya o na-stranded sa syudad nga walay kapaingnan.",

    hPwdTitle: "May Miyembro sa Pamilya nga may Kapansanan (PWD)",
    hPwdDesc: "Naglisod og lihok/lakaw/kita/dungog, nagkinahanglan og wheelchair/tungkod, o PWD ID.",

    hSeniorTitle: "May Tigulang nga Ginikanan o Kabanay (60+ Anyos)",
    hSeniorDesc: "Walay igong pension, dako ang gasto sa tambal, o nagkinahanglan og social pension.",

    hSoloParentTitle: "Solo nga Ginikanan nga Nagbuhi sa mga Anak",
    hSoloParentDesc: "Nag-inusarang nagbuhi ug nag-atiman sa mga menor de edad nga anak nga walay suporta gikan sa partner.",

    hChildTitle: "Bata (0–5 anyos) nga Niwang o Nagkinahanglan og Daycare",
    hChildDesc: "Niwang o kulang sa nutrisyon ang bata, o kinahanglang ipasulod sa libreng Daycare.",

    hLivelihoodTitle: "Walay Trabaho / Nagkinahanglan og Puhunan o Pagbansay",
    hLivelihoodDesc: "Gusto magtukod og gamayng negosyo (sari-sari store, paninda) o mokuha og libreng pagbansay sa TESDA.",

    // Step 3
    s3Title: "Sugilanon ug Detalye sa Kasamtangang Sitwasyon",
    s3Subtitle: "Ihulagway gamit ang imong kaugalingong pulong ang pinakalisod nga suliran o panginahanglan sa pamilya:",
    narrativePlaceholder: "Pananglitan: Ako usa ka solo nga inahan nga dunay 3 ka anak nga nagpuyo sa Poblacion. Na-ospital ang akong kamanghuran tungod sa pneumonia ug wala koy regular nga trabaho...",
    quickChipsLabel: "O pagpili og dali nga sitwasyon:",
    chip1: "Hospital bills ug maintenance nga tambal sa masakiton",
    chip2: "Solo parent nga nagkinahanglan og puhunan ug ayuda sa anak",
    chip3: "Gasto sa haya ug lubong sa namatay nga ginikanan",
    chip4: "Tiguwang nga senior nga nanginahanglan og pension ug wheelchair",

    // Actions
    btnNext: "Sunod nga Lakang",
    btnBack: "Balik",
    btnAnalyze: "Susiha ug Paghatag og Rekomendasyon sa AI",
    btnAnalyzing: "Gisusi sa Gemini AI ang mga lagda sa MSWDO ug kahimtang sa pamilya...",
    btnRetake: "Usba ang Interbyu",
    btnApply: "Mag-apply Karon",
    btnPrint: "I-print ang Sumaryo",
    btnClose: "Isira",

    // Results
    resTitle: "Personal nga Rekomendasyon sa Tabang Sosyal sa MSWDO",
    resSubtitle: "Base sa imong mga tubag sa interbyu, kwalipikado ka sa mga mosunod nga programa:",
    matchConfidence: "Lebel sa Pagka-Kwalipikado (Match Score)",
    statusEligible: "Hingpit nga Kwalipikado sa Tabang sa Gobyerno",
    reqDocsTitle: "Mga Dokumento nga Kinahanglang Andamon (Orihinal ug Kopya):",
    rationaleTitle: "Katin-awan ug Basehanan sa Balaod (AI Transparency):",
    actionAdviceTitle: "Girekomendar nga Plano ug Sunod nga Lakang:",
    geminiBadge: "Gipamatud-an sa Google Gemini AI Engine",
    legalBasisLabel: "Balaodnon nga Sumbanan:",
    criteriaMatchedLabel: "Nganong Kwalipikado Ka (Nakatuman nga Sumbanan):",
    householdMatrixTitle: "Profile sa Kwalipikasyon sa Panimalay",
    incomeTierBadge: "Ang-ang sa Kita:",
    dependencyBadge: "Kahimtang sa Panimalay:",
    statusPrescreened: "Pre-Screened sa MSWDO",
    urgencyTierLabel: "Lebel sa Dinaliang Pagtagad:",
    windowLabel: "Window / Unit sa MSWDO:",
    turnaroundLabel: "Gidugayon sa Pagproseso:",
    socialRegistryLabel: "Kahimtang sa 4Ps / Registry:",
    healthCoverageLabel: "PhilHealth / Medical Coverage:",
    askGeminiTitle: "Pangutana sa MSWDO AI Social Worker Assistant",
    askGeminiSubtitle: "Naay mga pangutana bahin sa mga rekisitos, gidugayon sa pagpagawas, o proseso? Pangutana dinhi:",
    askGeminiPlaceholder: "Pananglitan: Pila ka adlaw una makuha ang tabang pinansyal sa ospital?",
    askGeminiSend: "Pangutana",
    askGeminiThinking: "Naghimo ang Gemini AI og opisyal nga giya...",
    chipPrompt1: "Pila ka adlaw una ma-release ang AICS medikal?",
    chipPrompt2: "Unsaon kung walay Certificate of Indigency?",
    chipPrompt3: "Pwede bang dungan mag-apply og Solo Parent ug AICS?",
    officialDisclaimerTitle: "Opisyal nga Pahibalo bahin sa AI Pre-Screening ug Pinal nga Pag-aprobar",
    officialDisclaimerText: "Pahibalo: Kining maong pagsusi maoy usa ka automated AI diagnostic ug pre-screening nga giya aron matabangan ang mga lungsuranon sa pag-ila sa mga programa sa gobyerno. Ang opisyal nga pagsusi, beripikasyon sa mga orihinal nga dokumento, ug ang pinal nga desisyon sa pag-aprobar o dili pag-aprobar sa aplikasyon ug ayuda nagpabilin ubos sa paghukom ug pagdumala sa mga lisensyadong Social Worker ug kawani sa MSWDO.",
    disclaimer: "* Kining pagsusi sa AI nagsilbi lamang nga automated pre-screening. Ang pinal nga pag-apruba nakasalalay sa pagsusi sa lisensyadong Social Worker sa MSWDO.",
  },
}

export default function AIAssistanceFinderModal({
  isOpen,
  onClose,
}: AIAssistanceFinderModalProps) {
  const navigate = useNavigate()
  const { language: contextLang, setLanguage } = useLanguage()

  // Local language state (synced with global context)
  const [selectedLang, setSelectedLang] = useState<Language>(() => {
    return contextLang === "tl" || contextLang === "bis" ? contextLang : "en"
  })

  const t = I18N[selectedLang] || I18N.en

  const handleLanguageChange = (lang: Language) => {
    setSelectedLang(lang)
    setLanguage(lang)
  }

  // Interview Multi-step flow: 1 -> 2 -> 3 -> 4 (Results)
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Step 1: Socio-economic profile state
  const [applicantType, setApplicantType] = useState("self")
  const [incomeLevel, setIncomeLevel] = useState("low")
  const [dependentsCount, setDependentsCount] = useState("3-5")
  const [employmentStatus, setEmploymentStatus] = useState("daily")
  const [residencyType, setResidencyType] = useState("owner")
  const [barangay, setBarangay] = useState("poblacion")
  const [socialRegistry, setSocialRegistry] = useState("non_4ps")
  const [healthInsurance, setHealthInsurance] = useState("indigent")
  const [urgency, setUrgency] = useState("immediate")

  // Step 2: Real Life Circumstances & Hardship Indicators
  const [selectedHardships, setSelectedHardships] = useState<Record<string, boolean>>({
    med_emergency: true,
    bereavement: false,
    acute_hunger: false,
    stranded_transpo: false,
    mobility_disability: false,
    elderly_care: false,
    solo_parenting: false,
    toddler_daycare: false,
    unemployed_livelihood: false,
  })

  // Step 3: Narrative
  const [narrativeText, setNarrativeText] = useState("")

  // Step 4: AI Analysis Output
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  // Interactive Gemini Assistant Chat State
  const [chatInput, setChatInput] = useState("")
  const [isChatSending, setIsChatSending] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([])

  const toggleHardship = (key: string) => {
    setSelectedHardships((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Map icon and badge color to program
  const resolveProgramCardMeta = (prog: any) => {
    const id = String(prog.id || "").toLowerCase()
    const cat = String(prog.category || "").toLowerCase()
    let icon = HeartHandshake
    let badgeColor = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"

    if (id.includes("med") || cat.includes("med") || id.includes("health")) {
      icon = Stethoscope
      badgeColor = "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
    } else if (id.includes("burial") || id.includes("funeral") || id.includes("food") || id.includes("crisis")) {
      icon = ShieldAlert
      badgeColor = "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
    } else if (id.includes("solo")) {
      icon = Baby
      badgeColor = "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
    } else if (id.includes("pwd")) {
      icon = Users
      badgeColor = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
    } else if (id.includes("senior")) {
      icon = HeartHandshake
      badgeColor = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
    } else if (id.includes("child") || id.includes("daycare") || id.includes("feeding")) {
      icon = GraduationCap
      badgeColor = "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800"
    } else if (id.includes("livelihood") || id.includes("skills") || id.includes("training") || id.includes("grant")) {
      icon = Wallet
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
    } else if (id.includes("disburse") || id.includes("payout")) {
      icon = Wallet
      badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
    }

    return {
      ...prog,
      icon: prog.icon || icon,
      badgeColor: prog.badgeColor || badgeColor,
      actionUrl: prog.actionUrl || "/portal",
      actionLabel:
        prog.actionLabel ||
        (selectedLang === "en" ? "Apply Now" : selectedLang === "tl" ? "Mag-apply Agad" : "Mag-apply Karon"),
      docs: Array.isArray(prog.docs) ? prog.docs : (prog.requiredDocuments || []),
    }
  }

  // Run AI Evaluation logic (Gemini API with seamless local fallback)
  const handleRunAiEvaluation = async () => {
    setIsAnalyzing(true)
    setCurrentStep(4)
    setAnalysisResult(null)

    try {
      const response = await fetch(`${API_BASE}/api/ai/analyze-eligibility`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: selectedLang,
          applicantType,
          incomeLevel,
          dependentsCount,
          employmentStatus,
          residencyType,
          barangay,
          socialRegistry,
          healthInsurance,
          urgency,
          selectedHardships,
          narrativeText,
        }),
      })

      if (response.ok) {
        const json = await response.json()
        if (json.success && json.data) {
          const geminiData = json.data
          const formattedRecs = (geminiData.recommendedPrograms || []).map(resolveProgramCardMeta)

          setAnalysisResult({
            score: geminiData.confidenceScore || 95,
            rationale: geminiData.summaryRationale,
            justifications: geminiData.justifications || [],
            recommendations: formattedRecs.length > 0 ? formattedRecs : [],
            actionableAdvice: geminiData.actionableAdvice,
            isGeminiPowered: true,
          })
          setIsAnalyzing(false)
          return
        }
      }
    } catch (apiErr) {
      console.warn("[Gemini AI] Switching to local evaluation fallback:", apiErr)
    }

    // Fallback: Local Rule Diagnostic Engine
    setTimeout(() => {
      let baseScore = 95
      const recs: any[] = []
      const justifications: string[] = []

      const narrativeLower = narrativeText.toLowerCase()
      const hasMed =
        selectedHardships.med_emergency ||
        narrativeLower.includes("gamot") ||
        narrativeLower.includes("hospital") ||
        narrativeLower.includes("ospital") ||
        narrativeLower.includes("dialysis") ||
        narrativeLower.includes("chemo") ||
        narrativeLower.includes("surgery")

      const hasBurial =
        selectedHardships.bereavement ||
        narrativeLower.includes("libing") ||
        narrativeLower.includes("burol") ||
        narrativeLower.includes("namatay") ||
        narrativeLower.includes("kabaong")

      const hasFoodCrisis =
        selectedHardships.acute_hunger ||
        selectedHardships.stranded_transpo ||
        narrativeLower.includes("gutom") ||
        narrativeLower.includes("pagkain")

      const hasPwd =
        selectedHardships.mobility_disability ||
        applicantType === "pwd" ||
        narrativeLower.includes("pwd") ||
        narrativeLower.includes("kapansanan") ||
        narrativeLower.includes("wheelchair")

      const hasSenior =
        selectedHardships.elderly_care ||
        applicantType === "senior" ||
        socialRegistry === "social_pension" ||
        healthInsurance === "senior" ||
        narrativeLower.includes("senior") ||
        narrativeLower.includes("lolo") ||
        narrativeLower.includes("lola")

      const hasSoloParent =
        selectedHardships.solo_parenting ||
        applicantType === "child" ||
        narrativeLower.includes("solo parent") ||
        narrativeLower.includes("solong magulang") ||
        narrativeLower.includes("hiwalay")

      const hasChildWelfare =
        selectedHardships.toddler_daycare ||
        applicantType === "child" ||
        narrativeLower.includes("daycare") ||
        narrativeLower.includes("gatas") ||
        narrativeLower.includes("feeding")

      const hasLivelihood =
        selectedHardships.unemployed_livelihood ||
        employmentStatus === "unemployed" ||
        employmentStatus === "daily" ||
        narrativeLower.includes("negosyo") ||
        narrativeLower.includes("puhunan") ||
        narrativeLower.includes("tindahan")

      // 1. AICS Medical Card
      if (hasMed) {
        recs.push({
          id: "aics_medical",
          category: selectedLang === "en" ? "AICS Crisis Assistance" : selectedLang === "tl" ? "Tulong Medikal ng AICS" : "Tabang Medikal sa AICS",
          icon: Stethoscope,
          badgeColor: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
          title: selectedLang === "en" ? "AICS Medical & Hospitalization Guarantee Letter" : selectedLang === "tl" ? "AICS Medical Assistance & Hospital Guarantee Letter" : "AICS Tabang Medikal ug Guarantee Letter",
          priority: selectedLang === "en" ? "Immediate Crisis Relief" : selectedLang === "tl" ? "Kagyat na Tulong sa Krisis" : "Dinalian nga Tabang",
          eligibilityBadge: selectedLang === "en" ? "Pre-Qualified (Urgent Healthcare Need)" : selectedLang === "tl" ? "Kwalipikado (Kagyat na Gastusing Medikal)" : "Kwalipikado (Dinaliang Gasto sa Ospital)",
          legalBasis: selectedLang === "en" ? "DSWD Crisis Intervention Unit (CIU) Guidelines & Municipal AICS Ordinance" : selectedLang === "tl" ? "DSWD Crisis Intervention Unit (CIU) at Municipal AICS Ordinance" : "DSWD CIU Guidelines ug Municipal AICS Ordinansa",
          windowUnit: selectedLang === "en" ? "Window 2: Crisis Intervention Unit (CIU)" : selectedLang === "tl" ? "Window 2: Crisis Intervention Unit (CIU)" : "Window 2: Crisis Intervention Unit (CIU)",
          turnaround: selectedLang === "en" ? "Same-Day Release (Guarantee Letter) / 2-3 Days (Cash)" : selectedLang === "tl" ? "Same-Day Release (GL) / 2-3 Araw (Cash Aid)" : "Same-Day Release (GL) / 2-3 ka Adlaw (Cash)",
          estBenefit: "₱3,000 – ₱25,000 (Based on Hospital Bill / Prescription)",
          desc: selectedLang === "en"
            ? "Direct financial aid or hospital guarantee letter covering medicine costs, dialysis sessions, laboratory fees, and hospital bills."
            : selectedLang === "tl"
            ? "Tulong pinansyal o guarantee letter para sa pambili ng gamot, dialysis sessions, chemotherapy, laboratory tests, at billing sa ospital."
            : "Tabang pinansyal o guarantee letter para sa tambal, dialysis, chemotherapy, laboratory tests, ug bayronon sa ospital.",
          criteriaMatched: [
            selectedLang === "en" ? "Documented urgent medical condition, hospital confinement, dialysis, or costly maintenance prescription." : selectedLang === "tl" ? "May kagyat na gastusin sa ospital, dialysis, chemotherapy, o reseta ng gamot." : "Adunay bayronon sa ospital, dialysis, o mahal nga tambal.",
            selectedLang === "en" ? "Household monthly income falls within indigent/low-income threshold." : selectedLang === "tl" ? "Pasok ang kita ng pamilya sa indigent o low-income threshold." : "Ang kita sa pamilya nasulod sa indigent o ubos nga kita.",
            healthInsurance === "indigent" || healthInsurance === "senior"
              ? (selectedLang === "en" ? "Eligible for PhilHealth + MSWDO AICS Guarantee Letter co-financing (Zero Balance Billing)." : selectedLang === "tl" ? "Kwalipikado sa PhilHealth + MSWDO AICS co-financing para sa Zero Balance Billing." : "Kwalipikado sa PhilHealth + MSWDO AICS co-financing.")
              : (selectedLang === "en" ? "Eligible for direct municipal emergency hospital subsidy." : selectedLang === "tl" ? "Kwalipikado sa direktang emergency medical assistance mula sa munisipyo." : "Kwalipikado sa direct municipal emergency subsidy."),
            socialRegistry === "4ps"
              ? (selectedLang === "en" ? "4Ps Beneficiary verified: Co-assistance permitted without regular grant deduction." : selectedLang === "tl" ? "Beripikadong 4Ps: Pinapayagan ang tulong nang walang bawas sa regular na 4Ps grant." : "Beripikadong 4Ps: Gitugotan ang tabang nga walay bawas sa 4Ps grant.")
              : (selectedLang === "en" ? "Non-4Ps indigent citizen qualification verified." : selectedLang === "tl" ? "Kumpirmadong kwalipikadong indigent citizen." : "Kumpirmadong indigent citizen.")
          ],
          docs: [
            selectedLang === "en" ? "Medical Abstract / Medical Certificate (Original)" : selectedLang === "tl" ? "Medical Abstract o Sertipiko ng Doktor (Original)" : "Medical Abstract o Sertipiko sa Doktor (Original)",
            selectedLang === "en" ? "Hospital Billing Statement / Pharmacy Prescription" : selectedLang === "tl" ? "Hospital Billing Statement / Reseta ng Gamot" : "Hospital Billing Statement / Reseta sa Tambal",
            selectedLang === "en" ? "Barangay Certificate of Indigency (Medical Purpose)" : selectedLang === "tl" ? "Barangay Certificate of Indigency (Para sa Tulong Medikal)" : "Barangay Certificate of Indigency (Para sa Tabang Medikal)",
            selectedLang === "en" ? "Valid Government-Issued ID of Patient & Claimant" : selectedLang === "tl" ? "Valid Government ID ng Pasyente at Mag-aasikaso" : "Valid Government ID sa Pasyente ug Nagproseso",
          ],
          actionUrl: "/portal/aics?type=medical",
          actionLabel: selectedLang === "en" ? "Apply for AICS Medical" : selectedLang === "tl" ? "Mag-apply sa AICS Medical" : "Mag-apply sa AICS Medikal",
        })
        justifications.push(
          selectedLang === "en"
            ? "Meets DSWD Crisis Intervention Unit (CIU) guidelines for urgent healthcare financing and emergency medical subsidies."
            : selectedLang === "tl"
            ? "Natutugunan ang panuntunan ng DSWD Crisis Intervention Unit (CIU) para sa kagyat na subsidiya sa pagpapagamot at ospital."
            : "Nakatuman sa lagda sa DSWD Crisis Intervention Unit (CIU) para sa dinaliang subsidiya sa pagpatambal ug ospital."
        )
      }

      // 2. AICS Burial
      if (hasBurial) {
        recs.push({
          id: "aics_burial",
          category: selectedLang === "en" ? "AICS Crisis Assistance" : selectedLang === "tl" ? "Tulong sa Libing ng AICS" : "Tabang sa Lubong sa AICS",
          icon: ShieldAlert,
          badgeColor: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
          title: selectedLang === "en" ? "AICS Funeral & Burial Cash Assistance" : selectedLang === "tl" ? "AICS Funeral & Burial Cash Assistance" : "AICS Tabang Pinansyal sa Lubong",
          priority: selectedLang === "en" ? "Immediate Crisis Relief" : selectedLang === "tl" ? "Kagyat na Tulong sa Krisis" : "Dinalian nga Tabang",
          eligibilityBadge: selectedLang === "en" ? "Pre-Qualified (Bereavement Grant)" : selectedLang === "tl" ? "Kwalipikado sa Ayuda sa Libing" : "Kwalipikado sa Tabang sa Lubong",
          legalBasis: selectedLang === "en" ? "DSWD Crisis Intervention Unit Guidelines on Funeral Aid" : selectedLang === "tl" ? "DSWD CIU Guidelines sa Tulong sa Namatayan" : "DSWD CIU Guidelines sa Tabang sa Namatyan",
          windowUnit: selectedLang === "en" ? "Window 2: Crisis Intervention Unit (CIU)" : selectedLang === "tl" ? "Window 2: Crisis Intervention Unit (CIU)" : "Window 2: Crisis Intervention Unit (CIU)",
          turnaround: selectedLang === "en" ? "1–2 Working Days (Direct Cash Voucher)" : selectedLang === "tl" ? "1–2 Araw ng Pagproseso (Direct Cash Voucher)" : "1–2 ka Adlaw (Direct Cash)",
          estBenefit: "₱5,000 – ₱10,000 Cash Grant",
          desc: selectedLang === "en"
            ? "Financial assistance for funeral parlor expenses, casket, and burial plot for deceased family members."
            : selectedLang === "tl"
            ? "Tulong-pinansyal sa serbisyo ng punerarya, kabaong, at pagpapalibing para sa namatayang pamilya."
            : "Tabang pinansyal sa serbisyo sa punerarya, lungon, ug paglubong para sa namatyan nga pamilya.",
          criteriaMatched: [
            selectedLang === "en" ? "Immediate family relation to deceased." : selectedLang === "tl" ? "Direktang kamag-anak ng namatay." : "Direktang kapamilya sa namatay.",
            selectedLang === "en" ? "Struggling with funeral and mortuary debts." : selectedLang === "tl" ? "Kakulangan sa pambayad ng punerarya at libing." : "Kulang ang pambayad sa punerarya ug lubong.",
          ],
          docs: [
            selectedLang === "en" ? "Registered Death Certificate (Original & Copy)" : selectedLang === "tl" ? "Rehistradong Death Certificate (Original at Kopya)" : "Rehistradong Death Certificate",
            selectedLang === "en" ? "Funeral Contract / Official Receipt" : selectedLang === "tl" ? "Kontrata sa Punerarya o Resibo" : "Kontrata sa Punerarya o Resibo",
            selectedLang === "en" ? "Barangay Certificate of Indigency" : selectedLang === "tl" ? "Barangay Certificate of Indigency" : "Barangay Certificate of Indigency",
            selectedLang === "en" ? "Valid ID of Claimant" : selectedLang === "tl" ? "Valid ID ng Mag-aasikaso" : "Valid ID sa Nagproseso",
          ],
          actionUrl: "/portal/aics?type=burial",
          actionLabel: selectedLang === "en" ? "Apply for Burial Aid" : selectedLang === "tl" ? "Mag-apply sa Tulong sa Libing" : "Mag-apply sa Tabang sa Lubong",
        })
        justifications.push(
          selectedLang === "en"
            ? "Eligible for bereavement crisis grant under municipal AICS welfare provisions."
            : selectedLang === "tl"
            ? "Kwalipikado sa bereavement crisis cash grant sa ilalim ng municipal AICS guidelines."
            : "Kwalipikado sa bereavement crisis cash grant ubos sa municipal AICS guidelines."
        )
      }

      // 3. Food / Crisis Survival
      if (hasFoodCrisis && !hasMed && !hasBurial) {
        recs.push({
          id: "aics_food",
          category: selectedLang === "en" ? "AICS Crisis Assistance" : selectedLang === "tl" ? "Tulong sa Pagkain ng AICS" : "Tabang sa Pagkaon sa AICS",
          icon: ShieldAlert,
          badgeColor: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
          title: selectedLang === "en" ? "AICS Food Assistance & Crisis Cash Relief" : selectedLang === "tl" ? "AICS Food Assistance & Emergency Cash Relief" : "AICS Tabang sa Pagkaon ug Cash Relief",
          priority: selectedLang === "en" ? "Immediate Survival Aid" : selectedLang === "tl" ? "Kagyat na Ayuda sa Pagkain" : "Dinalian nga Ayuda sa Pagkaon",
          eligibilityBadge: selectedLang === "en" ? "Pre-Qualified (Emergency Subsidy)" : selectedLang === "tl" ? "Kwalipikado sa Ayuda" : "Kwalipikado sa Ayuda",
          legalBasis: "DSWD Crisis Intervention Unit Guidelines",
          windowUnit: selectedLang === "en" ? "Window 2: Crisis Intervention Unit (CIU)" : selectedLang === "tl" ? "Window 2: Crisis Intervention Unit (CIU)" : "Window 2: Crisis Intervention Unit (CIU)",
          turnaround: selectedLang === "en" ? "Same-Day Food Voucher / 1-2 Days Cash" : selectedLang === "tl" ? "Same-Day Food Voucher / 1-2 Araw Cash" : "Same-Day Food Voucher",
          estBenefit: "₱2,000 – ₱5,000 Cash / Food Voucher",
          desc: selectedLang === "en"
            ? "Emergency food assistance and cash relief for families in extreme hunger, disaster distress, or acute loss of income."
            : selectedLang === "tl"
            ? "Tulong sa agarang pagkain at ayuda para sa mga pamilyang walang makain, nasalanta, o biglaang nawalan ng kita."
            : "Tabang sa pagkaon ug ayuda para sa mga pamilya nga walay makaon o dinaliang nawad-an og panginabuhian.",
          criteriaMatched: [
            selectedLang === "en" ? "Severe income loss or food shortage in the household." : selectedLang === "tl" ? "Kakulangan sa pambili ng pagkain o biglaang nawalan ng kita." : "Kulang sa pagkaon o kalit nga nawad-an og kita.",
          ],
          docs: [
            selectedLang === "en" ? "Barangay Certificate of Indigency / Calamity" : selectedLang === "tl" ? "Barangay Certificate of Indigency" : "Barangay Certificate of Indigency",
            selectedLang === "en" ? "Valid Government ID" : selectedLang === "tl" ? "Valid ID" : "Valid ID",
          ],
          actionUrl: "/portal/aics?type=food",
          actionLabel: selectedLang === "en" ? "Apply for Food & Cash Relief" : selectedLang === "tl" ? "Mag-apply sa Food & Cash Relief" : "Mag-apply sa Food & Cash Relief",
        })
      }

      // 4. Solo Parent Welfare (RA 11861)
      if (hasSoloParent) {
        recs.push({
          id: "solo_parent",
          category: selectedLang === "en" ? "Solo Parent Services" : selectedLang === "tl" ? "Serbisyo sa Solo Parent" : "Serbisyo sa Solo Parent",
          icon: Baby,
          badgeColor: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
          title: selectedLang === "en" ? "Solo Parent ID & Monthly Subsidy (RA 11861)" : selectedLang === "tl" ? "Solo Parent ID & ₱1,000 Buwanang Ayuda (RA 11861)" : "Solo Parent ID ug ₱1,000 Binuwan nga Ayuda",
          priority: selectedLang === "en" ? "Statutory Special Sector Benefit" : selectedLang === "tl" ? "Batas Panlipunan (RA 11861)" : "Balaod Sosyal (RA 11861)",
          eligibilityBadge: selectedLang === "en" ? "Pre-Qualified under RA 11861" : selectedLang === "tl" ? "Kwalipikado sa ilalim ng RA 11861" : "Kwalipikado ubos sa RA 11861",
          legalBasis: "Republic Act No. 11861 (Expanded Solo Parents Welfare Act)",
          windowUnit: selectedLang === "en" ? "Window 1: Family & Child Welfare Desk" : selectedLang === "tl" ? "Window 1: Family & Child Welfare Desk" : "Window 1: Family & Child Welfare Desk",
          turnaround: selectedLang === "en" ? "7–10 Working Days (ID & Subsidy Processing)" : selectedLang === "tl" ? "7–10 Araw (ID at Subsidy Processing)" : "7–10 ka Adlaw (ID ug Subsidy)",
          estBenefit: selectedLang === "en" ? "₱1,000 Monthly Cash Subsidy + 10% Essentials Discount" : selectedLang === "tl" ? "₱1,000 Buwanang Ayuda + 10% Diskwento sa Gatas/Pagkain" : "₱1,000 Binuwan nga Ayuda + 10% Diskwento sa Gatas",
          desc: selectedLang === "en"
            ? "Comprehensive package under the Expanded Solo Parents Welfare Act granting monthly local cash allowance, 7-day parental leave, and educational scholarship priorities."
            : selectedLang === "tl"
            ? "Komprehensibong benepisyo sa ilalim ng RA 11861 kabilang ang buwanang tulong, 7-araw na parental leave, at subsidiya sa gatas at edukasyon."
            : "Komprehensibong benepisyo ubos sa RA 11861 lakip ang binuwan nga ayuda, 7-adlaw nga parental leave, ug diskwento sa gatas ug pagkaon.",
          criteriaMatched: [
            selectedLang === "en" ? "Solely providing parental care and financial support for minor children." : selectedLang === "tl" ? "Mag-isang nagtataguyod at nagpapakain sa mga anak nang walang suporta mula sa dating asawa." : "Nag-inusarang nag-atiman ug nagbuhi sa mga anak.",
            selectedLang === "en" ? "Income fits statutory bracket for local government monthly cash assistance." : selectedLang === "tl" ? "Pasok sa antas ng kita para sa ₱1,000 buwanang ayuda." : "Pasok sa kita alang sa ₱1,000 binuwan nga ayuda.",
          ],
          docs: [
            selectedLang === "en" ? "Barangay Certificate of Solo Parent Residency (6+ mos)" : selectedLang === "tl" ? "Barangay Certificate of Solo Parent Residency (6+ buwan)" : "Barangay Certificate of Solo Parent",
            selectedLang === "en" ? "PSA Birth Certificate of Minor Children" : selectedLang === "tl" ? "PSA Birth Certificate ng mga Anak" : "PSA Birth Certificate sa mga Anak",
            selectedLang === "en" ? "Affidavit of Abandonment / Death Certificate of Spouse" : selectedLang === "tl" ? "Sinumpaang Salaysay / Death Certificate ng Asawa" : "Sinumpaang Salaysay / Death Certificate sa Asawa",
            selectedLang === "en" ? "Certificate of Low Income / ITR" : selectedLang === "tl" ? "ITR o Certificate of Low Income" : "ITR o Certificate of Low Income",
          ],
          actionUrl: "/portal/apply-solo-parent",
          actionLabel: selectedLang === "en" ? "Apply for Solo Parent ID" : selectedLang === "tl" ? "Mag-apply para sa Solo Parent ID" : "Mag-apply para sa Solo Parent ID",
        })
        justifications.push(
          selectedLang === "en"
            ? "Meets Expanded Solo Parents Welfare Act (RA 11861) criteria for low-income solo guardians."
            : selectedLang === "tl"
            ? "Kwalipikado sa ilalim ng RA 11861 para sa mga solong magulang na may mababang buwanang kita."
            : "Kwalipikado ubos sa RA 11861 para sa solo nga ginikanan nga ubos ang kita."
        )
      }

      // 5. PWD Services
      if (hasPwd) {
        recs.push({
          id: "pwd_services",
          category: selectedLang === "en" ? "PWD Services" : selectedLang === "tl" ? "Serbisyo sa PWD" : "Serbisyo sa PWD",
          icon: Users,
          badgeColor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
          title: selectedLang === "en" ? "PWD Identification Card & Assistive Device Support" : selectedLang === "tl" ? "PWD ID & Pamamahagi ng Wheelchair/Kagamitan (RA 7277)" : "PWD ID ug Tabang sa Wheelchair/Gamit (RA 7277)",
          priority: selectedLang === "en" ? "Persons with Disability Sector" : selectedLang === "tl" ? "Sektor ng may Kapansanan (PWD)" : "Sektor sa may Kapansanan (PWD)",
          eligibilityBadge: selectedLang === "en" ? "Pre-Qualified under RA 7277" : selectedLang === "tl" ? "Kwalipikado sa ilalim ng RA 7277" : "Kwalipikado ubos sa RA 7277",
          legalBasis: "Republic Act No. 7277 & RA 10754 (Magna Carta for Persons with Disabilities)",
          windowUnit: selectedLang === "en" ? "Window 5: Persons with Disability Affairs Office (PDAO)" : selectedLang === "tl" ? "Window 5: Persons with Disability Affairs Office (PDAO)" : "Window 5: Persons with Disability Affairs Office (PDAO)",
          turnaround: selectedLang === "en" ? "5–7 Working Days (ID Printing & Device Scheduling)" : selectedLang === "tl" ? "5–7 Araw (ID Printing at Device Scheduling)" : "5–7 ka Adlaw (ID Printing ug Schedule)",
          estBenefit: selectedLang === "en" ? "20% Discount + VAT Exemption + Free Assistive Devices" : selectedLang === "tl" ? "20% Diskwento + VAT Exemption + Libreng Wheelchair/Gamit" : "20% Diskwento + VAT Exemption + Libreng Wheelchair",
          desc: selectedLang === "en"
            ? "Official municipal PWD registry benefits including 20% discount on medicines, grocery essentials, transport, plus priority distribution of wheelchairs, canes, and hearing aids."
            : selectedLang === "tl"
            ? "Opisyal na PWD ID na may 20% diskwento sa gamot, bilihin, pamasahe, at libreng alokasyon ng wheelchair o hearing aid."
            : "Opisyal nga PWD ID nga may 20% diskwento sa tambal, pagkaon, plete, ug libreng alokasyon sa wheelchair o tungkod.",
          criteriaMatched: [
            selectedLang === "en" ? "Documented physical, mental, orthopedic, or sensory disability." : selectedLang === "tl" ? "May kapansanan sa katawan, pagkilos, paningin, o pandinig." : "Adunay kapansanan sa lawas, panan-aw, o pandungog.",
            selectedLang === "en" ? "Entitled to statutory 20% discount + VAT exemption and MSWDO assistive tools." : selectedLang === "tl" ? "May karapatan sa 20% diskwento at libreng kagamitan mula sa MSWDO." : "May katungod sa 20% diskwento ug libreng gamit sa MSWDO.",
          ],
          docs: [
            selectedLang === "en" ? "Medical Certificate with Disability Assessment (with PTR)" : selectedLang === "tl" ? "Medical Certificate na may pirma ng Doktor ukol sa kapansanan" : "Medical Certificate gikan sa Doktor bahin sa kapansanan",
            selectedLang === "en" ? "Barangay Certificate of Residency" : selectedLang === "tl" ? "Barangay Certificate of Residency" : "Barangay Certificate of Residency",
            selectedLang === "en" ? "2x2 Recent ID Photos (2 copies)" : selectedLang === "tl" ? "2x2 ID Pictures (2 piraso)" : "2x2 ID Pictures (2 ka buok)",
          ],
          actionUrl: "/portal/apply-pwd-senior?type=pwd",
          actionLabel: selectedLang === "en" ? "Apply for PWD ID" : selectedLang === "tl" ? "Mag-apply para sa PWD ID" : "Mag-apply para sa PWD ID",
        })
        justifications.push(
          selectedLang === "en"
            ? "Eligible under Magna Carta for Persons with Disabilities (RA 7277 as amended by RA 10754)."
            : selectedLang === "tl"
            ? "Kwalipikado sa ilalim ng Magna Carta for Persons with Disabilities (RA 7277 / RA 10754)."
            : "Kwalipikado ubos sa Magna Carta for Persons with Disabilities (RA 7277 / RA 10754)."
        )
      }

      // 6. Senior Citizen Welfare & Social Pension
      if (hasSenior) {
        recs.push({
          id: "senior_services",
          category: selectedLang === "en" ? "Senior Citizen Services" : selectedLang === "tl" ? "Serbisyo sa Senior Citizen" : "Serbisyo sa Senior Citizen",
          icon: HeartHandshake,
          badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
          title: selectedLang === "en" ? "Senior Citizen ID & Indigent Social Pension (RA 11916)" : selectedLang === "tl" ? "Senior Citizen ID at Social Pension Allowance (RA 11916)" : "Senior Citizen ID ug Social Pension Allowance (RA 11916)",
          priority: selectedLang === "en" ? "Senior Citizen Sector (60+)" : selectedLang === "tl" ? "Sektor ng Nakatatanda (60+ Anyos)" : "Sektor sa mga Tigulang (60+)",
          eligibilityBadge: selectedLang === "en" ? "Pre-Qualified under RA 9994 / RA 11916" : selectedLang === "tl" ? "Kwalipikado sa ilalim ng RA 9994 / RA 11916" : "Kwalipikado ubos sa RA 9994 / RA 11916",
          legalBasis: "Republic Act No. 9994 & RA 11916 (Social Pension for Indigent Seniors Act)",
          windowUnit: selectedLang === "en" ? "Window 4: Office of Senior Citizens Affairs (OSCA)" : selectedLang === "tl" ? "Window 4: Office of Senior Citizens Affairs (OSCA)" : "Window 4: Office of Senior Citizens Affairs (OSCA)",
          turnaround: selectedLang === "en" ? "Same-Day ID Card Release / Quarterly Pension Payout" : selectedLang === "tl" ? "Same-Day ID Release / Quarterly Pension Payout" : "Same-Day ID / Quarterly Pension",
          estBenefit: selectedLang === "en" ? "₱1,000/Month Social Pension + 20% Senior Discount" : selectedLang === "tl" ? "₱1,000 Buwanang Social Pension + 20% Senior Diskwento" : "₱1,000 Binuwan nga Social Pension + 20% Diskwento",
          desc: selectedLang === "en"
            ? "Municipal OSCA ID issuance, medicine booklet, 20% discount on groceries/dining/fare, and quarterly ₱1,000/month social pension for indigent seniors."
            : selectedLang === "tl"
            ? "Pagkakaroon ng OSCA ID, medicine discount booklet, 20% diskwento, at buwanang ₱1,000 social pension para sa kapus-palad na senior."
            : "Paghatag og OSCA ID, medicine booklet, 20% diskwento, ug ₱1,000 binuwan nga social pension para sa kabus nga senior.",
          criteriaMatched: [
            selectedLang === "en" ? "Beneficiary is 60 years old and above." : selectedLang === "tl" ? "Ang benepisyaryo ay may edad 60 taong gulang pataas." : "Ang benepisyaryo 60 anyos pataas.",
            selectedLang === "en" ? "No existing pension from SSS, GSIS, or military/private providers." : selectedLang === "tl" ? "Walang natatanggap na regular na pensyon sa SSS o GSIS." : "Walay regular nga pension sa SSS o GSIS.",
          ],
          docs: [
            selectedLang === "en" ? "PSA Birth Certificate / Valid ID proving age 60+" : selectedLang === "tl" ? "PSA Birth Certificate o Valid ID na nagpapatunay ng edad (60+)" : "PSA Birth Certificate o Valid ID nga nagpamatuod sa edad (60+)",
            selectedLang === "en" ? "Barangay Certificate of Indigency & Non-Pensioner Status" : selectedLang === "tl" ? "Barangay Indigency (Walang natatanggap na SSS/GSIS)" : "Barangay Indigency (Walay nadawat nga SSS/GSIS)",
            selectedLang === "en" ? "2x2 Recent ID Photos (2 copies)" : selectedLang === "tl" ? "2 pirasong 2x2 ID Picture" : "2 ka 2x2 ID Picture",
          ],
          actionUrl: "/portal/apply-pwd-senior?type=senior",
          actionLabel: selectedLang === "en" ? "Apply for Senior ID" : selectedLang === "tl" ? "Mag-apply sa Senior ID" : "Mag-apply sa Senior ID",
        })
        justifications.push(
          selectedLang === "en"
            ? "Complies with Expanded Senior Citizens Act (RA 9994) & Social Pension Increase Act (RA 11916)."
            : selectedLang === "tl"
            ? "Nasasakop ng Expanded Senior Citizens Act (RA 9994) at Social Pension Act (RA 11916)."
            : "Nalakip sa Expanded Senior Citizens Act (RA 9994) ug Social Pension Act (RA 11916)."
        )
      }

      // 7. Child Welfare & ECCD Daycare Program
      if (hasChildWelfare) {
        recs.push({
          id: "child_welfare",
          category: selectedLang === "en" ? "Child Welfare Services" : selectedLang === "tl" ? "Kapakanan ng Bata" : "Kaayohan sa Bata",
          icon: GraduationCap,
          badgeColor: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
          title: selectedLang === "en" ? "Child Daycare Enrollment & Supplemental Nutrition Program" : selectedLang === "tl" ? "Daycare Enrollment at Supplemental Nutrition Feeding" : "Daycare Enrollment ug Supplemental Feeding Program",
          priority: selectedLang === "en" ? "Child Protection & Nutrition" : selectedLang === "tl" ? "Nutrisyon at Edukasyon ng Bata" : "Nutrisyon ug Edukasyon sa Bata",
          eligibilityBadge: selectedLang === "en" ? "Qualified for ECCD Enrollment" : selectedLang === "tl" ? "Kwalipikado sa Daycare & Feeding" : "Kwalipikado sa Daycare & Feeding",
          legalBasis: "Early Childhood Care and Development (ECCD) Act & DSWD Guidelines",
          windowUnit: selectedLang === "en" ? "Window 6: Early Childhood Care & Development (ECCD) Unit" : selectedLang === "tl" ? "Window 6: Early Childhood Care & Development Unit" : "Window 6: Early Childhood Care & Development Unit",
          turnaround: selectedLang === "en" ? "3–5 Working Days (Enrollment & Weight Screening)" : selectedLang === "tl" ? "3–5 Araw (Enrollment at Screening sa Nutrisyon)" : "3–5 ka Adlaw (Enrollment)",
          estBenefit: selectedLang === "en" ? "Free Early Education + 120-day Supplemental Milk & Meals" : selectedLang === "tl" ? "Libreng Daycare + 120-araw na Feeding Program at Gatas" : "Libreng Daycare + 120-adlaw nga Feeding Program",
          desc: selectedLang === "en"
            ? "Early childhood development center admission and targeted nutritional rehabilitation for malnourished or underweight toddlers."
            : selectedLang === "tl"
            ? "Libreng pagpasok sa Child Development Center (Daycare) at 120-day dietary feeding para sa mga batang kulang sa timbang."
            : "Libreng pag-eskwela sa Child Development Center (Daycare) ug feeding program para sa mga bata nga kulang sa timbang.",
          criteriaMatched: [
            selectedLang === "en" ? "Dependent child (0–5 years old) requiring early learning or dietary supplementation." : selectedLang === "tl" ? "May batang 0-5 taong gulang na kailangan ng maagang edukasyon o nutrisyon." : "Adunay bata (0-5 anyos) nga nagkinahanglan og edukasyon o feeding.",
          ],
          docs: [
            selectedLang === "en" ? "Child Birth Certificate (PSA/Local Civil Registry)" : selectedLang === "tl" ? "Birth Certificate ng Bata" : "Birth Certificate sa Bata",
            selectedLang === "en" ? "Immunization / Health Card from Barangay Health Center" : selectedLang === "tl" ? "Immunization Card mula sa Health Center" : "Immunization Card gikan sa Health Center",
            selectedLang === "en" ? "Barangay Indigency Certificate" : selectedLang === "tl" ? "Barangay Certificate of Indigency" : "Barangay Certificate of Indigency",
          ],
          actionUrl: "/portal/apply-solo-parent?category=child-welfare",
          actionLabel: selectedLang === "en" ? "Apply for Child Welfare" : selectedLang === "tl" ? "Mag-apply sa Child Welfare" : "Mag-apply sa Child Welfare",
        })
        justifications.push(
          selectedLang === "en"
            ? "Complies with Early Childhood Care and Development (ECCD) and National Supplementary Feeding guidelines."
            : selectedLang === "tl"
            ? "Pasok sa Early Childhood Care and Development (ECCD) at National Dietary Feeding guidelines."
            : "Pasok sa Early Childhood Care and Development (ECCD) ug feeding guidelines."
        )
      }

      // 8. Sustainable Livelihood & Skills Training
      if (hasLivelihood || recs.length < 2) {
        recs.push({
          id: "livelihood_prog",
          category: selectedLang === "en" ? "Livelihood & Training" : selectedLang === "tl" ? "Kabuhayan at Pagsasanay" : "Panginabuhi ug Pagbansay",
          icon: Wallet,
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
          title: selectedLang === "en" ? "Sustainable Livelihood Seed Grant & Skills Training" : selectedLang === "tl" ? "Puhunan sa Negosyo (Livelihood Seed Grant) at TESDA Training" : "Puhunan sa Negosyo ug Libreng Pagbansay sa TESDA",
          priority: selectedLang === "en" ? "Long-Term Socioeconomic Recovery" : selectedLang === "tl" ? "Pangmatagalang Pangkabuhayan" : "Malungtarong Panginabuhi",
          eligibilityBadge: selectedLang === "en" ? "Pre-Qualified for SLP Seed Capital" : selectedLang === "tl" ? "Kwalipikado sa SLP Puhunan" : "Kwalipikado sa SLP Puhunan",
          legalBasis: "DSWD Sustainable Livelihood Program (SLP) Guidelines",
          windowUnit: selectedLang === "en" ? "Window 3: Sustainable Livelihood Program (SLP) Desk" : selectedLang === "tl" ? "Window 3: Sustainable Livelihood Program Desk" : "Window 3: Sustainable Livelihood Program Desk",
          turnaround: selectedLang === "en" ? "10–14 Working Days (Proposal Review & Disbursal)" : selectedLang === "tl" ? "10–14 Araw (Ebalwasyon ng Panukala at Puhunan)" : "10–14 ka Adlaw (Pagsusi ug Puhunan)",
          estBenefit: selectedLang === "en" ? "₱5,000 – ₱15,000 Seed Capital + Free NC-II Course" : selectedLang === "tl" ? "₱5,000 – ₱15,000 Panimulang Puhunan + Libreng Sertipikasyon" : "₱5,000 – ₱15,000 Puhunan + Libreng Kurso sa TESDA",
          desc: selectedLang === "en"
            ? "Micro-enterprise capital grants for sari-sari stores, street food, small trading, plus free vocational training in baking, culinary, driving, and tailoring."
            : selectedLang === "tl"
            ? "Tulong-puhunan para sa sari-sari store, carinderia, o paninda, kalakip ang libreng pagsasanay sa pagluluto, pagmamaneho, at pananahi."
            : "Tabang-puhunan para sa sari-sari store o negosyo, uban ang libreng pagbansay sa pagluto, pagmaneho, ug panahi.",
          criteriaMatched: [
            selectedLang === "en" ? "Unemployed or informal daily worker intending to manage a micro-enterprise." : selectedLang === "tl" ? "Walang pirmihang trabaho na nais magsimula ng sariling tindahan o paninda." : "Walay regular nga trabaho nga gusto magtukod og negosyo.",
            selectedLang === "en" ? "Low household income bracket qualifies for non-collateral capital grants." : selectedLang === "tl" ? "Kwalipikado sa libreng puhunan nang walang kolateral." : "Kwalipikado sa libreng puhunan nga walay prenda.",
          ],
          docs: [
            selectedLang === "en" ? "Simple Business Proposal Plan" : selectedLang === "tl" ? "Simpleng Livelihood Proposal Form" : "Simpleng Livelihood Proposal Form",
            selectedLang === "en" ? "Barangay Clearance & Indigency" : selectedLang === "tl" ? "Barangay Clearance at Indigency" : "Barangay Clearance ug Indigency",
            selectedLang === "en" ? "Valid ID" : selectedLang === "tl" ? "Valid ID" : "Valid ID",
          ],
          actionUrl: "/portal/apply-livelihood",
          actionLabel: selectedLang === "en" ? "Apply for Livelihood" : selectedLang === "tl" ? "Mag-apply sa Pangkabuhayan" : "Mag-apply sa Panginabuhi",
        })
        justifications.push(
          selectedLang === "en"
            ? "Recommended under DSWD Sustainable Livelihood Program (SLP) for graduate economic self-sufficiency."
            : selectedLang === "tl"
            ? "Inirerekomenda sa ilalim ng DSWD Sustainable Livelihood Program (SLP) upang magkaroon ng sariling kakayahan sa kita."
            : "Girekomenda ubos sa DSWD Sustainable Livelihood Program (SLP) aron makaangkon og kaugalingong kita."
        )
      }

      // Economic Indigency scoring
      if (incomeLevel === "none" || incomeLevel === "low") {
        baseScore = 98
        justifications.unshift(
          selectedLang === "en"
            ? `Household monthly income declared is below the official municipal poverty threshold for a household with ${dependentsCount} dependents in Barangay ${barangay.replace('_', ' ').toUpperCase()}.`
            : selectedLang === "tl"
            ? `Ang idineklarang buwanang kita ng sambahayan ay pasok sa indigency poverty threshold para sa pamilyang may ${dependentsCount} miyembro sa Barangay ${barangay.replace('_', ' ').toUpperCase()}.`
            : `Ang gideklara nga kita sa panimalay pasok sa indigency poverty threshold para sa pamilya nga dunay ${dependentsCount} ka miyembro sa Barangay ${barangay.replace('_', ' ').toUpperCase()}.`
        )
      } else if (incomeLevel === "mid") {
        baseScore = 89
        justifications.unshift(
          selectedLang === "en"
            ? "Household falls within the Low-Income vulnerable tier, qualifying for subsidized services and crisis intervention."
            : selectedLang === "tl"
            ? "Ang sambahayan ay nasa Low-Income vulnerable tier, kaya kwalipikado sa mga subsidiya at kagyat na tulong sa krisis."
            : "Ang panimalay naa sa Low-Income vulnerable tier, busa kwalipikado sa mga subsidiya ug dinalian nga tabang sa krisis."
        )
      } else {
        baseScore = 78
        justifications.unshift(
          selectedLang === "en"
            ? "Eligible for selective emergency and statutory welfare programs subject to social worker case assessment."
            : selectedLang === "tl"
            ? "Kwalipikado sa mga piling emergency at batas panlipunan na sasailalim sa case assessment ng Social Worker."
            : "Kwalipikado sa piniling emergency ug mga balaod sosyal nga ipailalom sa case assessment sa Social Worker."
        )
      }

      setAnalysisResult({
        score: baseScore,
        recommendations: recs,
        justifications,
        isGeminiPowered: false,
      })
      setIsAnalyzing(false)
    }, 750)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100 dark:border-slate-800 overflow-hidden">
        {/* ========================================================= */}
        {/* MODAL HEADER */}
        {/* ========================================================= */}
        <div className="relative px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white tracking-tight">
                  {t.modalTitle}
                </h3>
                <span className="text-[9px] sm:text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs">
                  {t.modalBadge}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-200/90 leading-tight line-clamp-1">
                {t.modalSubtitle}
              </p>
            </div>
          </div>

          {/* Header Controls: Language Switcher & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Language Switcher */}
            <div className="flex rounded-xl bg-white/10 p-0.5 border border-white/20 backdrop-blur-sm text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedLang === "en" ? "bg-white text-blue-900 shadow-xs" : "text-white/80 hover:text-white"
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("tl")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedLang === "tl" ? "bg-white text-blue-900 shadow-xs" : "text-white/80 hover:text-white"
                }`}
                title="Tagalog"
              >
                TL
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("bis")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedLang === "bis" ? "bg-white text-blue-900 shadow-xs" : "text-white/80 hover:text-white"
                }`}
                title="Bisaya"
              >
                BIS
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* STEP PROGRESS NAVIGATION TABS */}
        {/* ========================================================= */}
        <div className="px-5 sm:px-7 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-bold">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentStep === 1
                  ? "bg-blue-600 text-white shadow-xs"
                  : currentStep > 1
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "text-gray-500 hover:text-gray-800 dark:text-slate-400"
              }`}
            >
              {currentStep > 1 && <Check className="h-3.5 w-3.5" />}
              <span>{t.step1Tab}</span>
            </button>

            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentStep === 2
                  ? "bg-blue-600 text-white shadow-xs"
                  : currentStep > 2
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "text-gray-500 hover:text-gray-800 dark:text-slate-400"
              }`}
            >
              {currentStep > 2 && <Check className="h-3.5 w-3.5" />}
              <span>{t.step2Tab}</span>
            </button>

            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentStep === 3
                  ? "bg-blue-600 text-white shadow-xs"
                  : currentStep > 3
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "text-gray-500 hover:text-gray-800 dark:text-slate-400"
              }`}
            >
              {currentStep > 3 && <Check className="h-3.5 w-3.5" />}
              <span>{t.step3Tab}</span>
            </button>

            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />

            <button
              type="button"
              onClick={() => {
                if (analysisResult) setCurrentStep(4)
                else handleRunAiEvaluation()
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentStep === 4
                  ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs font-black"
                  : "text-gray-500 hover:text-gray-800 dark:text-slate-400"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>{t.step4Tab}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL BODY (SCROLLABLE CONTENT FOR ACTIVE STEP) */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-gray-800 dark:text-slate-100 text-sm">
          {/* ------------------------------------------------------- */}
          {/* STEP 1: HOUSEHOLD & ECONOMIC PROFILE */}
          {/* ------------------------------------------------------- */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  {t.s1Title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {t.s1Subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Applicant Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t.qApplicant}
                  </label>
                  <select
                    value={applicantType}
                    onChange={(e) => setApplicantType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="self">{t.optSelf}</option>
                    <option value="child">{t.optChild}</option>
                    <option value="senior">{t.optSenior}</option>
                    <option value="pwd">{t.optPwd}</option>
                    <option value="family">{t.optFamily}</option>
                  </select>
                </div>

                {/* Monthly Income Bracket */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t.qIncome}
                  </label>
                  <select
                    value={incomeLevel}
                    onChange={(e) => setIncomeLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">{t.optIncNone}</option>
                    <option value="low">{t.optIncLow}</option>
                    <option value="mid">{t.optIncMid}</option>
                    <option value="high">{t.optIncHigh}</option>
                  </select>
                </div>

                {/* Registered Barangay */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                    {t.qBarangay}
                  </label>
                  <select
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="poblacion">{t.optBrgyPoblacion}</option>
                    <option value="san_isidro">{t.optBrgySanIsidro}</option>
                    <option value="sta_maria">{t.optBrgyStaMaria}</option>
                    <option value="san_vicente">{t.optBrgySanVicente}</option>
                    <option value="other">{t.optBrgyOther}</option>
                    <option value="transient">{t.optBrgyTransient}</option>
                  </select>
                </div>

                {/* Dependents count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t.qDependents}
                  </label>
                  <select
                    value={dependentsCount}
                    onChange={(e) => setDependentsCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1-2">{t.optDep12}</option>
                    <option value="3-5">{t.optDep35}</option>
                    <option value="6+">{t.optDep6p}</option>
                  </select>
                </div>

                {/* Employment Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t.qEmployment}
                  </label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unemployed">{t.optEmpUnemployed}</option>
                    <option value="daily">{t.optEmpDaily}</option>
                    <option value="contractual">{t.optEmpContractual}</option>
                    <option value="regular">{t.optEmpRegular}</option>
                  </select>
                </div>

                {/* Social Welfare / 4Ps Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-indigo-500" />
                    {t.qSocialRegistry}
                  </label>
                  <select
                    value={socialRegistry}
                    onChange={(e) => setSocialRegistry(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="non_4ps">{t.optRegNon4Ps}</option>
                    <option value="4ps">{t.optReg4Ps}</option>
                    <option value="social_pension">{t.optRegSocialPension}</option>
                    <option value="listahanan">{t.optRegListahanan}</option>
                  </select>
                </div>

                {/* Health Insurance / PhilHealth */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />
                    {t.qHealthInsurance}
                  </label>
                  <select
                    value={healthInsurance}
                    onChange={(e) => setHealthInsurance(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="indigent">{t.optHealthIndigent}</option>
                    <option value="senior">{t.optHealthSenior}</option>
                    <option value="employed">{t.optHealthEmployed}</option>
                    <option value="none">{t.optHealthNone}</option>
                  </select>
                </div>

                {/* Assistance Urgency */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-rose-500" />
                    {t.qUrgency}
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="immediate">{t.optUrgImmediate}</option>
                    <option value="urgent">{t.optUrgUrgent}</option>
                    <option value="standard">{t.optUrgStandard}</option>
                  </select>
                </div>

                {/* Housing / Residency */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t.qResidency}
                  </label>
                  <select
                    value={residencyType}
                    onChange={(e) => setResidencyType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="owner">{t.optResOwner}</option>
                    <option value="renter">{t.optResRenter}</option>
                    <option value="informal">{t.optResInformal}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* STEP 2: REAL-LIFE HARDSHIP & CRISIS CIRCUMSTANCES */}
          {/* ------------------------------------------------------- */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                  {t.s2Title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {t.s2Subtitle}
                </p>
              </div>

              {/* 9 Real-life Hardship Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[58vh] overflow-y-auto pr-1">
                {/* 1. Medical Emergency */}
                <div
                  onClick={() => toggleHardship("med_emergency")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.med_emergency
                      ? "bg-red-50/80 dark:bg-red-950/40 border-red-400 dark:border-red-600 shadow-xs ring-2 ring-red-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.med_emergency
                      ? "bg-red-600 text-white"
                      : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  }`}>
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hMedTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.med_emergency}
                        onChange={() => {}}
                        className="rounded text-red-600 focus:ring-red-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hMedDesc}
                    </p>
                  </div>
                </div>

                {/* 2. Bereavement / Funeral */}
                <div
                  onClick={() => toggleHardship("bereavement")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.bereavement
                      ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 shadow-xs ring-2 ring-slate-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.bereavement
                      ? "bg-slate-800 text-white dark:bg-slate-600"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hBurialTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.bereavement}
                        onChange={() => {}}
                        className="rounded text-slate-700 focus:ring-slate-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hBurialDesc}
                    </p>
                  </div>
                </div>

                {/* 3. Food Shortage / Survival */}
                <div
                  onClick={() => toggleHardship("acute_hunger")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.acute_hunger
                      ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-xs ring-2 ring-amber-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.acute_hunger
                      ? "bg-amber-600 text-white"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}>
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hFoodTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.acute_hunger}
                        onChange={() => {}}
                        className="rounded text-amber-600 focus:ring-amber-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hFoodDesc}
                    </p>
                  </div>
                </div>

                {/* 4. Stranded / Provincial Travel */}
                <div
                  onClick={() => toggleHardship("stranded_transpo")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.stranded_transpo
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.stranded_transpo
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  }`}>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hTranspoTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.stranded_transpo}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hTranspoDesc}
                    </p>
                  </div>
                </div>

                {/* 5. Physical / Mental Disability (PWD) */}
                <div
                  onClick={() => toggleHardship("mobility_disability")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.mobility_disability
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.mobility_disability
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  }`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hPwdTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.mobility_disability}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hPwdDesc}
                    </p>
                  </div>
                </div>

                {/* 6. Elderly Care / Senior Citizen */}
                <div
                  onClick={() => toggleHardship("elderly_care")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.elderly_care
                      ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-xs ring-2 ring-amber-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.elderly_care
                      ? "bg-amber-600 text-white"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}>
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hSeniorTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.elderly_care}
                        onChange={() => {}}
                        className="rounded text-amber-600 focus:ring-amber-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hSeniorDesc}
                    </p>
                  </div>
                </div>

                {/* 7. Solo Parent Raising Kids Alone */}
                <div
                  onClick={() => toggleHardship("solo_parenting")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.solo_parenting
                      ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-xs ring-2 ring-purple-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.solo_parenting
                      ? "bg-purple-600 text-white"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                  }`}>
                    <Baby className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hSoloParentTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.solo_parenting}
                        onChange={() => {}}
                        className="rounded text-purple-600 focus:ring-purple-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hSoloParentDesc}
                    </p>
                  </div>
                </div>

                {/* 8. Young Children Nutrition / Daycare */}
                <div
                  onClick={() => toggleHardship("toddler_daycare")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    selectedHardships.toddler_daycare
                      ? "bg-pink-50/80 dark:bg-pink-950/40 border-pink-400 dark:border-pink-600 shadow-xs ring-2 ring-pink-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.toddler_daycare
                      ? "bg-pink-600 text-white"
                      : "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300"
                  }`}>
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hChildTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.toddler_daycare}
                        onChange={() => {}}
                        className="rounded text-pink-600 focus:ring-pink-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hChildDesc}
                    </p>
                  </div>
                </div>

                {/* 9. Need Livelihood Seed Capital / Skills */}
                <div
                  onClick={() => toggleHardship("unemployed_livelihood")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none sm:col-span-2 ${
                    selectedHardships.unemployed_livelihood
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white dark:bg-slate-800/70 border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedHardships.unemployed_livelihood
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}>
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                        {t.hLivelihoodTitle}
                      </h5>
                      <input
                        type="checkbox"
                        checked={selectedHardships.unemployed_livelihood}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500 shrink-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                      {t.hLivelihoodDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* STEP 3: NARRATIVE / INTERVIEW CONVERSATIONAL STATEMENT */}
          {/* ------------------------------------------------------- */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  {t.s3Title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {t.s3Subtitle}
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={narrativeText}
                  onChange={(e) => setNarrativeText(e.target.value)}
                  placeholder={t.narrativePlaceholder}
                  className="w-full px-4 py-3 text-xs rounded-2xl border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white shadow-inner"
                />

                {/* Quick Scenarios chips */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                    {t.quickChipsLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNarrativeText(t.chip1)
                        setSelectedHardships((p) => ({ ...p, med_emergency: true }))
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900 transition-colors cursor-pointer"
                    >
                      🏥 {t.chip1}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNarrativeText(t.chip2)
                        setSelectedHardships((p) => ({ ...p, solo_parenting: true, unemployed_livelihood: true }))
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-900 transition-colors cursor-pointer"
                    >
                      👶 {t.chip2}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNarrativeText(t.chip3)
                        setSelectedHardships((p) => ({ ...p, bereavement: true }))
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      🕊️ {t.chip3}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNarrativeText(t.chip4)
                        setSelectedHardships((p) => ({ ...p, elderly_care: true, mobility_disability: true }))
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900 transition-colors cursor-pointer"
                    >
                      👴 {t.chip4}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* STEP 4: AI ANALYSIS OUTPUT & TIERED RECOMMENDATIONS */}
          {/* ------------------------------------------------------- */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {isAnalyzing ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      {t.btnAnalyzing}
                    </p>
                    <p className="text-xs text-gray-500">
                      Cross-referencing RA 11861, RA 7277, RA 9994, and DSWD Crisis Intervention Unit criteria...
                    </p>
                  </div>
                </div>
              ) : analysisResult ? (
                <div className="space-y-6">
                  {/* Overall Confidence Score Card with Household Qualification Profile */}
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-blue-500/15 border border-emerald-500/20 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center font-black shadow-md shrink-0">
                          <span className="text-lg leading-none">{analysisResult.score}%</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-85">Match</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              {t.statusEligible}
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-xs text-gray-500">{t.matchConfidence}</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {t.resTitle}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-slate-300">
                            {t.resSubtitle}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                      >
                        <Printer className="h-3.5 w-3.5 text-gray-500" />
                        <span>{t.btnPrint}</span>
                      </button>
                    </div>

                    {/* Granular Household Qualification Snapshot Matrix */}
                    <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      {/* Income Bracket */}
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-emerald-100 dark:border-slate-700/60 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">
                            {t.incomeTierBadge}
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200 truncate block">
                            {incomeLevel === "none" ? "No Regular Income" : incomeLevel === "low" ? "Low Income (<₱10,000)" : incomeLevel === "mid" ? "₱10,000 – ₱18,000" : ">₱18,000"}
                          </span>
                        </div>
                      </div>

                      {/* Dependents & Applicant */}
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-emerald-100 dark:border-slate-700/60 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">
                            {t.dependencyBadge}
                          </span>
                          <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200 truncate block">
                            {dependentsCount} Dep. ({applicantType === "self" ? "Individual" : applicantType === "child" ? "Minor" : applicantType === "senior" ? "Senior" : applicantType === "pwd" ? "PWD" : "Family"})
                          </span>
                        </div>
                      </div>

                      {/* Barangay & Urgency */}
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-emerald-100 dark:border-slate-700/60 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-rose-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">
                            {t.urgencyTierLabel}
                          </span>
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 truncate block">
                            {urgency === "immediate" ? "24–48h Emergency" : urgency === "urgent" ? "Priority (1–2 Wks)" : "Standard Track"}
                          </span>
                        </div>
                      </div>

                      {/* Welfare Registry Status */}
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-emerald-100 dark:border-slate-700/60 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">
                            {t.socialRegistryLabel}
                          </span>
                          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 truncate block">
                            {socialRegistry === "4ps" ? "Active 4Ps Beneficiary" : socialRegistry === "social_pension" ? "Social Pensioner" : socialRegistry === "listahanan" ? "Listahanan Poor" : "Direct Citizen"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Cards Stack */}
                  <div className="space-y-4">
                    {analysisResult.recommendations.map((rec: any) => {
                      const IconComp = rec.icon || ShieldAlert
                      return (
                        <div
                          key={rec.id}
                          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all space-y-4"
                        >
                          {/* Program Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-slate-700/80 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0">
                                <IconComp className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${rec.badgeColor}`}>
                                    {rec.priority}
                                  </span>
                                  {rec.eligibilityBadge && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                      <BadgeCheck className="h-3 w-3" />
                                      {rec.eligibilityBadge}
                                    </span>
                                  )}
                                  <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                                    {rec.title}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-300 leading-relaxed">
                                  {rec.desc}
                                </p>
                              </div>
                            </div>
                            <div className="sm:text-right shrink-0">
                              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                {rec.estBenefit}
                              </span>
                            </div>
                          </div>

                          {/* Specific Window & Processing Turnaround Row */}
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {rec.windowUnit && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-semibold border border-blue-200 dark:border-blue-900">
                                <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span>{rec.windowUnit}</span>
                              </div>
                            )}

                            {rec.turnaround && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-semibold border border-amber-200 dark:border-amber-900">
                                <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span><strong>{t.turnaroundLabel}</strong> {rec.turnaround}</span>
                              </div>
                            )}

                            {rec.legalBasis && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800">
                                <Scale className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                <span><strong>{t.legalBasisLabel}</strong> {rec.legalBasis}</span>
                              </div>
                            )}
                          </div>

                          {/* Why You Are Eligible (Matched Criteria) */}
                          {rec.criteriaMatched && rec.criteriaMatched.length > 0 && (
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 p-3.5 rounded-2xl space-y-2">
                              <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{t.criteriaMatchedLabel}</span>
                              </div>
                              <div className="space-y-1 pl-1">
                                {rec.criteriaMatched.map((crit: string, cIdx: number) => (
                                  <div key={cIdx} className="flex items-start gap-2 text-[11px] text-gray-700 dark:text-slate-300">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{crit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Requirements & Direct Action Link */}
                          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <span className="font-bold text-gray-700 dark:text-slate-200 text-[11px] block">
                                {t.reqDocsTitle}
                              </span>
                              <div className="text-gray-600 dark:text-slate-300 text-[11px] space-y-0.5">
                                {rec.docs.map((doc: string, dIdx: number) => (
                                  <div key={dIdx} className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                    <span>{doc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                navigate(rec.actionUrl)
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20 shrink-0"
                            >
                              <span>{rec.actionLabel}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* AI Explainability & Policy Justification */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/40 text-xs space-y-2">
                    <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{t.rationaleTitle}</span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {t.geminiBadge}
                      </span>
                    </div>

                    {analysisResult.rationale && (
                      <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed font-medium bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        {analysisResult.rationale}
                      </p>
                    )}

                    {analysisResult.justifications && analysisResult.justifications.length > 0 && (
                      <ul className="list-disc list-inside text-gray-700 dark:text-slate-300 text-[11px] space-y-1 pl-1">
                        {analysisResult.justifications.map((just: string, jIdx: number) => (
                          <li key={jIdx} className="leading-relaxed">{just}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Actionable Advice & Next Steps */}
                  {analysisResult.actionableAdvice && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 text-xs space-y-2">
                      <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{t.actionAdviceTitle}</span>
                      </div>
                      <div className="text-gray-700 dark:text-slate-300 text-[11px] leading-relaxed whitespace-pre-line pl-1 font-medium">
                        {analysisResult.actionableAdvice}
                      </div>
                    </div>
                  )}

                  {/* Official Administrative Discretion & Approval Notice Banner */}
                  <div className="p-4 sm:p-4.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 dark:border-amber-700/40 text-xs space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-300">
                      <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs sm:text-sm tracking-tight">{t.officialDisclaimerTitle}</span>
                    </div>
                    <p className="text-[11.5px] text-amber-900/90 dark:text-slate-300 leading-relaxed pl-1 font-normal">
                      {t.officialDisclaimerText}
                    </p>
                  </div>

                  {/* Interactive Gemini AI Social Worker Chat Assistant */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-indigo-50/50 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-indigo-100 dark:border-slate-700 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Bot className="h-4 w-4 text-amber-300" />
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {t.askGeminiTitle}
                          </h5>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400">
                            {t.askGeminiSubtitle}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick inquiry chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSendChatMessage(t.chipPrompt1)}
                        className="text-[10.5px] px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                      >
                        💡 {t.chipPrompt1}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendChatMessage(t.chipPrompt2)}
                        className="text-[10.5px] px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                      >
                        📋 {t.chipPrompt2}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendChatMessage(t.chipPrompt3)}
                        className="text-[10.5px] px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                      >
                        🤝 {t.chipPrompt3}
                      </button>
                    </div>

                    {/* Chat history list */}
                    {chatMessages.length > 0 && (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto p-3 rounded-2xl bg-white dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 text-xs">
                        {chatMessages.map((msg, mIdx) => (
                          <div
                            key={mIdx}
                            className={`flex flex-col ${
                              msg.role === "user" ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[11.5px] leading-relaxed shadow-xs ${
                                msg.role === "user"
                                  ? "bg-blue-600 text-white rounded-br-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 rounded-bl-xs"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chat Input Bar */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSendChatMessage()
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={t.askGeminiPlaceholder}
                        disabled={isChatSending}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isChatSending || !chatInput.trim()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                      >
                        {isChatSending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>{t.askGeminiSend}</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER CONTROLS */}
        {/* ========================================================= */}
        <div className="px-5 sm:px-7 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 italic text-center sm:text-left">
            {t.disclaimer}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {currentStep > 1 && currentStep < 4 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{t.btnBack}</span>
              </button>
            )}

            {currentStep < 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <span>{t.btnNext}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleRunAiEvaluation}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-extrabold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>{t.btnAnalyze}</span>
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1)
                  setAnalysisResult(null)
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t.btnRetake}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {t.btnClose}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
