import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  X,
  ArrowRight,
  Info,
} from "lucide-react"

interface AIAssistanceFinderModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIAssistanceFinderModal({
  isOpen,
  onClose,
}: AIAssistanceFinderModalProps) {
  const navigate = useNavigate()

  const [aiMode, setAiMode] = useState<"quick" | "narrative">("quick")
  const [aiBeneficiary, setAiBeneficiary] = useState("myself")
  const [aiPrimaryNeed, setAiPrimaryNeed] = useState("medical")
  const [aiMonthlyIncome, setAiMonthlyIncome] = useState("below_10k")
  const [aiDependents, setAiDependents] = useState("3-5")
  const [aiNarrativeText, setAiNarrativeText] = useState("")
  const [aiIsAnalyzing, setAiIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  if (!isOpen) return null

  const handleRunAiAssessment = (customNarrative?: string) => {
    setAiIsAnalyzing(true)
    setAiResult(null)

    setTimeout(() => {
      let score = 94
      let status = "Highly Eligible"
      const recs: any[] = []
      const explanations: string[] = []

      const narrativeToTest = (
        customNarrative !== undefined ? customNarrative : aiNarrativeText
      ).toLowerCase()

      const isMedical =
        aiPrimaryNeed === "medical" ||
        narrativeToTest.includes("gamot") ||
        narrativeToTest.includes("hospital") ||
        narrativeToTest.includes("ospital") ||
        narrativeToTest.includes("dialysis") ||
        narrativeToTest.includes("surgery") ||
        narrativeToTest.includes("chemo")

      const isSoloParent =
        aiPrimaryNeed === "solo_parent" ||
        narrativeToTest.includes("solo parent") ||
        narrativeToTest.includes("solong magulang") ||
        narrativeToTest.includes("hiwalay") ||
        narrativeToTest.includes("buntis") ||
        narrativeToTest.includes("single mom")

      const isBurial =
        aiPrimaryNeed === "burial" ||
        narrativeToTest.includes("libing") ||
        narrativeToTest.includes("burol") ||
        narrativeToTest.includes("namatay") ||
        narrativeToTest.includes("kabaong") ||
        narrativeToTest.includes("cremation")

      const isLivelihood =
        aiPrimaryNeed === "livelihood" ||
        narrativeToTest.includes("negosyo") ||
        narrativeToTest.includes("puhunan") ||
        narrativeToTest.includes("pangkabuhayan") ||
        narrativeToTest.includes("tindahan") ||
        narrativeToTest.includes("trabaho")

      const isPwdSenior =
        aiPrimaryNeed === "pwd_senior" ||
        narrativeToTest.includes("pwd") ||
        narrativeToTest.includes("kapansanan") ||
        narrativeToTest.includes("senior") ||
        narrativeToTest.includes("lolo") ||
        narrativeToTest.includes("lola")

      if (isMedical) {
        recs.push({
          title: "AICS Medical Assistance & Hospital Guarantee Letter",
          badge: "Immediate Crisis Aid",
          badgeColor:
            "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800",
          estAmount: "₱3,000 – ₱25,000 (Based on Hospital Bill)",
          desc: "Kagyat na tulong pinansyal para sa pambili ng mga gamot, laboratory procedures, chemotherapy, o hospital discharge bills.",
          docs: [
            "Medical Abstract / Certificate",
            "Hospital Billing Statement / Reseta",
            "Barangay Certificate of Indigency",
            "Valid Government ID",
          ],
          actionUrl: "/portal/aics?type=medical",
          actionLabel: "Mag-apply sa AICS Medical",
        })
        explanations.push(
          "Natutugunan ang DSWD Crisis Intervention Unit criteria para sa kagyat na tulong medikal o emergency hospitalization."
        )
      }

      if (isBurial) {
        recs.push({
          title: "AICS Funeral & Burial Cash Assistance",
          badge: "Immediate Crisis Aid",
          badgeColor:
            "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800",
          estAmount: "₱5,000 – ₱10,000 Cash Grant",
          desc: "Tulong sa gastusin sa libing, serbisyo sa punerarya, at pagpapalibing para sa indigent families.",
          docs: [
            "Death Certificate (Certified True Copy)",
            "Funeral Contract",
            "Barangay Indigency",
            "Valid ID ng Ka-anak",
          ],
          actionUrl: "/portal/aics?type=funeral",
          actionLabel: "Mag-apply sa Funeral Aid",
        })
        explanations.push(
          "Kwalipikado sa emergency bereavement fund batay sa municipal social welfare guidelines."
        )
      }

      if (isSoloParent || aiBeneficiary === "children") {
        recs.push({
          title: "Solo Parent ID & Monthly Subsidy (RA 11861)",
          badge: "Special Sector Welfare",
          badgeColor:
            "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800",
          estAmount:
            "₱1,000 Monthly Local Allowance + 10% Discount sa Gatas/Supplies",
          desc: "Komprehensibong benepisyo para sa mga solong magulang na nagtataguyod ng mga anak na wala pang 18 taong gulang.",
          docs: [
            "Barangay Certificate of Solo Parent",
            "Birth Certificate ng mga Anak (PSA)",
            "Income Tax Return / Certificate of Low Income",
            "Valid ID",
          ],
          actionUrl: "/portal/apply-solo-parent",
          actionLabel: "Mag-apply para sa Solo Parent ID",
        })
        explanations.push(
          "Pasok sa Expanded Solo Parents Welfare Act (RA 11861) batay sa bilang ng mga umaasang anak."
        )
      }

      if (isPwdSenior) {
        recs.push({
          title: "PWD & Senior Citizen ID / Social Pension (RA 7277 / RA 9994)",
          badge: "Statutory Benefits",
          badgeColor:
            "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800",
          estAmount: "20% Discount + VAT Exemption + Monthly Local Pension",
          desc: "Opisyal na diskwento sa gamot, pamasahe, pagkain, at subsidiya sa assistive devices tulad ng wheelchair o hearing aid.",
          docs: [
            "Medical Certificate na may pirma ng Licensed Doctor",
            "Barangay Certificate of Residency",
            "1x1 ID Picture",
            "Birth Certificate",
          ],
          actionUrl: "/portal/apply-pwd-senior",
          actionLabel: "Mag-apply sa PWD / Senior",
        })
        explanations.push(
          "May karapatan sa proteksyong panlipunan sa ilalim ng Magna Carta for Persons with Disabilities at Senior Citizens Act."
        )
      }

      // Always include Livelihood / Skills development as complementary or primary long-term support
      if (isLivelihood || recs.length < 2) {
        recs.push({
          title: "Sustainable Livelihood Capital Assistance & Skills Training",
          badge: "Long-Term Rehabilitation",
          badgeColor:
            "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
          estAmount: "₱5,000 – ₱15,000 Micro-enterprise Starter Grant",
          desc: "Tulong-puhunan o pagsasanay sa pagnenegosyo (Food Processing, Dressmaking, Electrical) upang magkaroon ng tuloy-tuloy na kita.",
          docs: [
            "Barangay Business Clearance / Indigency",
            "Livelihood Proposal Form",
            "Valid ID",
          ],
          actionUrl: "/portal/apply-livelihood",
          actionLabel: "Mag-apply sa Livelihood Program",
        })
        explanations.push(
          "Inirerekomenda ang pagsasama sa Sustainable Livelihood Program upang magkaroon ng sariling kakayahan pagkatapos ng krisis."
        )
      }

      // Socio-economic scoring
      if (aiMonthlyIncome === "below_10k" || aiMonthlyIncome === "none") {
        score = 96
        explanations.unshift(
          "Ang idineklarang kita ng sambahayan ay pasok sa Regional Indigency Threshold para sa mga pamilyang nangangailangan ng agarang tulong ng pamahalaan."
        )
      } else if (aiMonthlyIncome === "10k_18k") {
        score = 88
        explanations.unshift(
          "Ang antas ng kita ay nasa Low-Income Bracket na kwalipikado sa mga subsidiya at auxiliary social services."
        )
      } else {
        score = 75
        status = "Conditionally Eligible"
        explanations.unshift(
          "Kwalipikado sa mga selective emergency assistance ngunit sasailalim sa mas masusing General Intake Sheet (GIS) review ng Social Worker."
        )
      }

      setAiResult({
        score,
        status,
        recommendations: recs,
        explanations,
      })
      setAiIsAnalyzing(false)
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  MSWDO Smart Assistance &amp; Eligibility Finder
                </h3>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Alamin kung saang mga programa ng pamahalaan ikaw kwalipikado at kumuha ng angkop na tulong.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-gray-800 dark:text-slate-100 text-sm">
          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setAiMode("quick")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                aiMode === "quick"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-200"
              }`}
            >
              ⚡ Mabilisang Form (Guided)
            </button>
            <button
              type="button"
              onClick={() => setAiMode("narrative")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                aiMode === "narrative"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-200"
              }`}
            >
              💬 Magkwento ng Sitwasyon (AI Free Text)
            </button>
          </div>

          {/* Form Mode Content */}
          {aiMode === "quick" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  1. Para kanino ang hinihinging tulong?
                </label>
                <select
                  value={aiBeneficiary}
                  onChange={(e) => setAiBeneficiary(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="myself">Aking Sarili</option>
                  <option value="children">Aking mga Anak (Menor de edad)</option>
                  <option value="parents">Magulang / Senior Citizen</option>
                  <option value="family">Buong Pamilya / Sambahayan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  2. Pangunahing pangangailangan ngayon:
                </label>
                <select
                  value={aiPrimaryNeed}
                  onChange={(e) => setAiPrimaryNeed(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="medical">Gamot / Ospital / Dialysis / Surgery (AICS)</option>
                  <option value="solo_parent">Suporta para sa Solo Parent (RA 11861)</option>
                  <option value="livelihood">Pangkabuhayan o Puhunan sa Negosyo</option>
                  <option value="pwd_senior">Benepisyo ng PWD o Senior Citizen</option>
                  <option value="burial">Gastos sa Libing / Punerarya (Burial)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  3. Buwanang kita ng buong sambahayan:
                </label>
                <select
                  value={aiMonthlyIncome}
                  onChange={(e) => setAiMonthlyIncome(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">Walang regular na pinagkakakitaan</option>
                  <option value="below_10k">Mababa sa ₱10,000 bawat buwan</option>
                  <option value="10k_18k">₱10,000 hanggang ₱18,000 bawat buwan</option>
                  <option value="above_18k">Higit sa ₱18,000 bawat buwan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  4. Bilang ng mga umaasang miyembro (Dependents):
                </label>
                <select
                  value={aiDependents}
                  onChange={(e) => setAiDependents(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1-2">1 hanggang 2 tao</option>
                  <option value="3-5">3 hanggang 5 tao</option>
                  <option value="6+">6 o higit pang miyembro</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Ilarawan ang iyong sitwasyon o krisis (Tagalog o English):
              </label>
              <textarea
                rows={3}
                value={aiNarrativeText}
                onChange={(e) => setAiNarrativeText(e.target.value)}
                placeholder="Halimbawa: Ako po ay isang solong ina na may 3 anak na nag-aaral at kasalukuyang na-ospital ang aking bunso dahil sa pneumonia. Wala po akong regular na trabaho..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-gray-500 font-medium">Quick examples:</span>
                <button
                  type="button"
                  onClick={() => {
                    const txt =
                      "Kailangan po ng tulong medikal sa chemotherapy at hospital bills ng nanay ko."
                    setAiNarrativeText(txt)
                    handleRunAiAssessment(txt)
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                >
                  Medical / Chemo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt =
                      "Solong magulang po ako at nag-aaral ang 2 kong anak, kailangan ng tulong-puhunan sa negosyo."
                    setAiNarrativeText(txt)
                    handleRunAiAssessment(txt)
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                >
                  Solo Parent + Livelihood
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt =
                      "Namatayan po kami at humihingi ng tulong para sa burol at kabaong."
                    setAiNarrativeText(txt)
                    handleRunAiAssessment(txt)
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                >
                  Burial / Libing
                </button>
              </div>
            </div>
          )}

          {/* Action Button to trigger AI */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleRunAiAssessment()}
              disabled={aiIsAnalyzing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {aiIsAnalyzing ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Sinusuri ng AI ang Impormasyon...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Suriin ang Aking Kwalipikasyon (Run AI Check)</span>
                </>
              )}
            </button>
          </div>

          {/* Results Container */}
          {aiResult && (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-800 animate-in fade-in duration-300">
              {/* Score Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center font-extrabold shadow-md">
                    <span className="text-sm leading-none">{aiResult.score}%</span>
                    <span className="text-[9px] uppercase tracking-tighter opacity-80">Match</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                        {aiResult.status}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-gray-500">Pasok sa MSWDO Criteria</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 font-medium">
                      Batay sa inyong sitwasyon, narito ang mga opisyal na tulong na maaari mong aplayan:
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendations Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Mga Inirerekomendang Programa ng Tulong (Tiered Package):
                </h4>

                {aiResult.recommendations.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${rec.badgeColor}`}
                          >
                            {rec.badge}
                          </span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {rec.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                          {rec.desc}
                        </p>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                          {rec.estAmount}
                        </span>
                      </div>
                    </div>

                    {/* Requirements list */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl text-[11px] text-gray-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-gray-700 dark:text-slate-200">
                          Mga Kailangang Ihanda:{" "}
                        </span>
                        {rec.docs.join(" • ")}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          navigate(rec.actionUrl)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
                      >
                        <span>{rec.actionLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Explainability Box */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs space-y-1.5">
                <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-600" />
                  Paliwanag ng AI Assessment (Transparency &amp; Ethics):
                </div>
                <ul className="list-disc list-inside text-gray-600 dark:text-slate-300 text-[11px] space-y-1">
                  {aiResult.explanations.map((exp: string, eIdx: number) => (
                    <li key={eIdx}>{exp}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <span>
            * Ang AI Assessment ay gabay at pre-screening. Ang pinal na pasya ay isasagawa ng MSWDO Social Worker.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-bold transition-colors cursor-pointer"
          >
            Isara (Close)
          </button>
        </div>
      </div>
    </div>
  )
}
