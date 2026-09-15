import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertCircle, FileText, X, RefreshCw, HeartHandshake, Info, CheckCircle2, RotateCcw } from "lucide-react"
import SoloParentApplicationWizard from "./solo-parent-wizard"
import ChildWelfareApplicationWizard, { getLocalizedChildWelfarePrograms } from "./child-welfare-wizard"
import { useLanguage } from "../ui/language-context"
import { API_BASE, getAuthHeaders } from "../../config/api"
import { cachedApiFetch } from "../../utils/cachedApiFetch"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import { formatAppDate } from "./my-applications"

interface RequirementItem {
  title: string
  desc?: string
}

function getLocalizedSoloParentRequirements(
  language: string,
  type: "new" | "renewal" | "loss"
): RequirementItem[] {
  if (type === "renewal") {
    if (language === "en") {
      return [
        {
          title: "Old / Expired Solo Parent ID",
          desc: "Prepare your existing Solo Parent ID number and original or copy of the ID card.",
        },
        {
          title: "ID Picture (2×2)",
          desc: "Recent 2×2 ID Picture with clean white background.",
        },
        {
          title: "Barangay Endorsement",
          desc: "Endorsement from the Solo Parent President of your Barangay.",
        },
        {
          title: "Barangay Certificate of Residency",
          desc: "Required if there is a change of residence in Gov Service since your last application.",
        },
        {
          title: "Sworn Affidavit of Solo Parent",
          desc: "Sworn statement certifying continued sole parental care and support.",
        },
      ]
    }
    if (language === "bis") {
      return [
        {
          title: "Daang / Na-expire nga Solo Parent ID",
          desc: "Ihanda ang imong kasamtangang Solo Parent ID number ug orihinal o kopya sa ID card.",
        },
        {
          title: "ID Picture (2×2)",
          desc: "Bag-ong 2×2 ID Picture nga adunay puti nga background.",
        },
        {
          title: "Endorsement sa Barangay",
          desc: "Endorsement gikan sa Solo Parent President sa imong Barangay.",
        },
        {
          title: "Barangay Certificate of Residency",
          desc: "Gikinahanglan kung adunay pagbag-o sa pinuy-anan sa Gov Service sukad sa miaging aplikasyon.",
        },
        {
          title: "Sworn Affidavit of Solo Parent",
          desc: "Pinanumpaang pamahayag nga nagpamatuod sa padayong bugtong pag-atiman sa anak/mga anak.",
        },
      ]
    }
    return [
      {
        title: "Lumang / Expired Solo Parent ID",
        desc: "Ihanda ang inyong kasalukuyang Solo Parent ID number at orihinal o kopya ng ID card.",
      },
      {
        title: "ID Picture (2×2)",
        desc: "Kasalukuyang 2×2 ID Picture na may puting background.",
      },
      {
        title: "Barangay Endorsement",
        desc: "Endorsement mula sa Solo Parent President ng inyong Barangay.",
      },
      {
        title: "Barangay Certificate of Residency",
        desc: "Kailangan kung may pagbabago sa inyong tirahan sa Gov Service mula sa huling aplikasyon.",
      },
      {
        title: "Sworn Affidavit of Solo Parent",
        desc: "Pinanumpaang salaysay na nagpapatunay ng patuloy na solong pagtataguyod sa anak/mga anak.",
      },
    ]
  }

  if (type === "loss") {
    if (language === "en") {
      return [
        {
          title: "Notarized Affidavit of Loss",
          desc: "Stating the reason, date, and details of loss of your Solo Parent ID card.",
        },
        {
          title: "Valid Government ID / Gov Service ID",
          desc: "With photo and signature as official proof of identity.",
        },
        {
          title: "ID Picture (2×2)",
          desc: "Recent 2×2 ID Picture with clean white background.",
        },
        {
          title: "Barangay Certificate of Residency",
          desc: "Proof of legitimate residency in Gov Service.",
        },
      ]
    }
    if (language === "bis") {
      return [
        {
          title: "Notarized Affidavit of Loss",
          desc: "Nagpatin-aw sa hinungdan, petsa, ug mga detalye sa pagkawala sa imong Solo Parent ID card.",
        },
        {
          title: "Balido nga Government ID / Gov Service ID",
          desc: "Adunay litrato ug pirma isip opisyal nga pruweba sa imong pagkatawo.",
        },
        {
          title: "ID Picture (2×2)",
          desc: "Bag-ong 2×2 ID Picture nga adunay limpyo nga puti nga background.",
        },
        {
          title: "Barangay Certificate of Residency",
          desc: "Pruweba sa lehitimong pagpuyo sa Gov Service.",
        },
      ]
    }
    return [
      {
        title: "Notarized Affidavit of Loss",
        desc: "Nagsasaad ng dahilan, petsa, at detalye ng pagkawala ng inyong Solo Parent ID card.",
      },
      {
        title: "Valid Government ID / Gov Service ID",
        desc: "May larawan at lagda bilang opisyal na patunay ng inyong pagkakakilanlan.",
      },
      {
        title: "ID Picture (2×2)",
        desc: "Kasalukuyang 2×2 ID Picture na may malinis na puting background.",
      },
      {
        title: "Barangay Certificate of Residency",
        desc: "Patunay ng lehitimong paninirahan sa Gov Service.",
      },
    ]
  }

  // New Application
  if (language === "en") {
    return [
      {
        title: "1 PC 2×2 ID Picture",
        desc: "Recent 2×2 color photo with clean white background.",
      },
      {
        title: "PSA Birth Certificate/s of Children",
        desc: "Birth certificate/s of dependent child/children.",
      },
      {
        title: "Barangay Certificate of Residency & Parental Care",
        desc: "Proof of legitimate residency and parental care in Gov Service.",
      },
      {
        title: "Proof of Circumstance (Category Document)",
        desc: "Death Certificate, Medical/Detention Record, Court Order, OFW Contract, or CENOMAR based on category.",
      },
      {
        title: "Sworn Affidavit of Solo Parent",
        desc: "Certifying sole parental care and support, and non-cohabitation.",
      },
    ]
  }
  if (language === "bis") {
    return [
      {
        title: "1 PC 2×2 ID Picture",
        desc: "Bag-ong 2×2 ID Picture nga adunay limpyo nga puti nga background.",
      },
      {
        title: "PSA Birth Certificate sa mga Anak",
        desc: "Birth Certificate sa anak o mga anak.",
      },
      {
        title: "Barangay Certificate of Residency & Parental Care",
        desc: "Pruweba sa lehitimong pagpuyo ug pag-atiman sa Gov Service.",
      },
      {
        title: "Pruweba sa Sitwasyon (Kategorya)",
        desc: "Death Certificate, Medical/Detention Record, Court Order, OFW Contract, o CENOMAR base sa kategorya.",
      },
      {
        title: "Sworn Affidavit of Solo Parent",
        desc: "Nagpamatuod nga ikaw bugtong nag-atiman sa bata ug walay kapuyo.",
      },
    ]
  }
  return [
    {
      title: "1 PC 2×2 ID Picture",
      desc: "Kasalukuyang 2×2 ID Picture na may malinis na puting background.",
    },
    {
      title: "PSA Birth Certificate ng mga Anak",
      desc: "Birth Certificate ng anak o mga anak.",
    },
    {
      title: "Barangay Certificate of Residency & Parental Care",
      desc: "Patunay ng lehitimong paninirahan at pangangalaga sa Gov Service.",
    },
    {
      title: "Katibayan ng Sitwasyon (Category Document)",
      desc: "Death Certificate ng asawa, Medical/Detention Record, Court Order, OFW Contract, o CENOMAR base sa kategorya.",
    },
    {
      title: "Sworn Affidavit of Solo Parent",
      desc: "Pinanumpaang salaysay na nagpapatunay ng solong pagtataguyod sa anak at walang kinakasama.",
    },
  ]
}

export default function ApplySoloParent() {
  const { t, language } = useLanguage()
  const [searchParams] = useSearchParams()

  const categoryParam = searchParams.get("category")?.toLowerCase() || "solo-parent"
  const typeParam = searchParams.get("type")?.toLowerCase() || "new"
  const programParam = searchParams.get("program")?.toLowerCase() || "nutritional-assistance"
  const isChildWelfare = categoryParam === "child-welfare"

  const currentCwPrograms = getLocalizedChildWelfarePrograms(language)
  const matchedCwProgram = currentCwPrograms.find((p) => p.key === programParam) || currentCwPrograms[0]

  const [showRequirementsModal, setShowRequirementsModal] = useState(false)
  const [blockedApp, setBlockedApp] = useState<any>(() => {
    try {
      if (typeof window === "undefined") return null
      const isReapp =
        window.location.search.includes("reapply=true") ||
        localStorage.getItem(`solo_parent_reapplying_${typeParam}`) === "true" ||
        localStorage.getItem("solo_parent_reapplying") === "true"
      if (isReapp) return null

      const prof = getCurrentUserProfile()
      const userQcidClean = (prof?.qcidNo || prof?.qcidNumber || "").replace(/\D/g, "")
      const userEmailClean = (prof?.email || "").toLowerCase().trim()
      const raw = localStorage.getItem("solo_parent_applications")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const match = parsed.find((a: any) => {
            const aType = String(a.application_type || a.applicationType || a.type || "new").toLowerCase()
            const matchType =
              typeParam === "renewal" ? aType === "renewal" :
              typeParam === "loss" ? (aType === "loss" || aType === "replacement") :
              (aType === "new" || !aType)
            if (!matchType) return false

            const aQcid = String(a.qcid_number || a.qcidNumber || a.qcid || a.reference_number || a.referenceNumber || "").replace(/\D/g, "")
            const aEmail = String(a.email || "").toLowerCase().trim()
            return (userQcidClean && (aQcid.includes(userQcidClean) || userQcidClean.includes(aQcid))) || (userEmailClean && aEmail === userEmailClean)
          })
          if (match) return match
        }
      }
      return null
    } catch {
      return null
    }
  })

  const [isBlocked, setIsBlocked] = useState<boolean>(false)
  const [selectedCategoryId] = useState<number | null>(null)
  const [understood, setUnderstood] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [cwSubmissionStage, setCwSubmissionStage] = useState<"form" | "matching" | "pending">("form")
  const [spSubmissionStage, setSpSubmissionStage] = useState<"form" | "matching" | "pending">("form")

  const [bypassedBlock, setBypassedBlock] = useState(() => {
    try {
      const isUrlParam = typeof window !== "undefined" && window.location.search.includes("reapply=true")
      const isLocal =
        localStorage.getItem(`solo_parent_reapplying_${typeParam}`) === "true" ||
        localStorage.getItem("solo_parent_reapplying") === "true"
      return Boolean(isUrlParam || isLocal)
    } catch {
      return false
    }
  })
  const bypassedBlockRef = useRef(bypassedBlock)

  useEffect(() => {
    let isMounted = true

    const checkActiveApp = async () => {
      if (bypassedBlockRef.current) return
      if (isChildWelfare) {
        if (isMounted) setIsBlocked(false)
        return
      }

      try {
        let backendApps: any[] = []
        let backendFetched = false

        const currentQcid = getLoggedInUserQcid() || ""
        const userProf = getCurrentUserProfile()
        const currentEmail = (userProf?.email || "").toLowerCase().trim()
        const uid = userProf?.id || (userProf as any)?.userId || ""

        try {
          const data = await cachedApiFetch(
            `${API_BASE}/api/solo-parent/user/${uid || "0"}?qcid=${encodeURIComponent(currentQcid)}&email=${encodeURIComponent(currentEmail)}`,
            { headers: getAuthHeaders() },
            2000
          ).catch(() => null)
          if (data) {
            const raw = Array.isArray(data) ? data : data.applications || []
            if (Array.isArray(raw)) {
              backendApps = raw
              backendFetched = true
            }
          }
        } catch {
          // silent fallback
        }

        const isMatchForSoloParent = (a: any) => {
          if (!a) return false
          const aType = String(a.application_type || a.applicationType || a.type || "new").toLowerCase()
          if (typeParam === "renewal") {
            if (aType !== "renewal") return false
          } else if (typeParam === "loss") {
            if (aType !== "loss" && aType !== "replacement") return false
          } else {
            if (aType === "loss" || aType === "replacement" || aType === "renewal") return false
          }

          const appRef = String(a.reference_number || a.referenceNumber || a.qcid_number || a.qcidNumber || a.qcid || a.form_data?.qcidNumber || "").trim().replace(/\D/g, "")
          const appEmail = String(a.email || a.form_data?.email || "").toLowerCase().trim()
          const appUid = String(a.user_id || a.userId || "").trim()
          const cleanUserQcid = String(currentQcid).replace(/\D/g, "")

          const matchUser =
            (uid && appUid && String(uid) === appUid && String(uid) !== "0") ||
            (cleanUserQcid && appRef && (cleanUserQcid === appRef || (cleanUserQcid.length >= 10 && appRef.startsWith(cleanUserQcid)))) ||
            (currentEmail && appEmail && currentEmail === appEmail)

          return Boolean(matchUser)
        }

        const allApps = backendFetched ? backendApps : []
        const userMatchingApps = allApps.filter(isMatchForSoloParent)
        const matchedApproved = userMatchingApps.find((a) => {
          const s = String(a.application_status || a.status || "").toLowerCase()
          return s === "approved" || s === "completed" || s === "for_release" || s === "active"
        })
        const matchedPending = userMatchingApps.find((a) => {
          const s = String(a.application_status || a.status || "pending").toLowerCase()
          return (s === "pending" || s === "draft" || s === "under_review") && (!matchedApproved || (a.id !== matchedApproved.id && a.reference_number !== matchedApproved.reference_number))
        })
        const matchedRejected = userMatchingApps.find((a) => {
          const s = String(a.application_status || a.status || "").toLowerCase()
          return (s === "rejected" || s === "disapproved") && !matchedApproved && !matchedPending
        })

        if (isMounted && !bypassedBlockRef.current) {
          if (matchedApproved) {
            setIsBlocked(true)
            setBlockedApp(matchedApproved)
          } else if (matchedPending) {
            setIsBlocked(true)
            setBlockedApp(matchedPending)
          } else if (matchedRejected) {
            setIsBlocked(true)
            setBlockedApp(matchedRejected)
          } else {
            setIsBlocked(false)
            setBlockedApp(null)
          }
        }
      } catch (err) {
        console.warn("Solo parent eligibility check skipped/offline:", err)
      }
    }

    checkActiveApp()
    const pollInterval = setInterval(checkActiveApp, 8000)

    const unsubscribe = subscribeToRealtimeChanges(() => {
      checkActiveApp()
    })

    const handleUpdated = () => checkActiveApp()
    window.addEventListener("solo_parent_applications_updated", handleUpdated)
    window.addEventListener("applications_updated", handleUpdated)
    window.addEventListener("storage", handleUpdated)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
      unsubscribe()
      window.removeEventListener("solo_parent_applications_updated", handleUpdated)
      window.removeEventListener("applications_updated", handleUpdated)
      window.removeEventListener("storage", handleUpdated)
    }
  }, [categoryParam, typeParam, programParam, isChildWelfare])

  useEffect(() => {
    try {
      const isReapp =
        localStorage.getItem(`solo_parent_reapplying_${typeParam}`) === "true" ||
        localStorage.getItem("solo_parent_reapplying") === "true" ||
        (typeof window !== "undefined" && window.location.search.includes("reapply=true"))
      if (isReapp) {
        bypassedBlockRef.current = true
        setBypassedBlock(true)
      } else {
        bypassedBlockRef.current = false
        setBypassedBlock(false)
      }
    } catch {
      bypassedBlockRef.current = false
      setBypassedBlock(false)
    }
    setShowRequirementsModal(false)
    setUnderstood(false)
    setCurrentStep(1)
  }, [categoryParam, typeParam])

  const isRenewal = typeParam === "renewal"
  const isLoss = typeParam === "loss"

  const modalTitle = isChildWelfare
    ? language === "en"
      ? `Requirements for Child Welfare Support — ${matchedCwProgram.title}`
      : language === "bis"
      ? `Mga Kinahanglanon sa Tabang sa Kaayohan sa Bata — ${matchedCwProgram.title}`
      : `Mga Kinakailangan sa Tulong sa Kapakanan ng Bata — ${matchedCwProgram.title}`
    : language === "en"
    ? "Requirements for Application of Gov Service Solo Parent ID"
    : language === "bis"
    ? "Mga Kinahanglanon sa Pag-apply og Gov Service Solo Parent ID"
    : "Mga Kinakailangan sa Aplikasyon ng Gov Service Solo Parent ID"

  const typeBadge = isChildWelfare
    ? { label: matchedCwProgram.title, color: "bg-blue-50 text-blue-700 border-blue-200" }
    : isRenewal
    ? {
        label: language === "en" ? "Renewal" : language === "bis" ? "Pag-renew" : "Pag-renew",
        color: "bg-amber-50 text-amber-700 border-amber-200",
      }
    : isLoss
    ? {
        label: language === "en" ? "Replacement" : language === "bis" ? "Pag-ilis" : "Pagpapalit",
        color: "bg-orange-50 text-orange-700 border-orange-200",
      }
    : {
        label: language === "en" ? "New Application" : language === "bis" ? "Bag-ong Aplikasyon" : "Bagong Aplikasyon",
        color: "bg-green-50 text-green-700 border-green-200",
      }

  const currentRequirements = getLocalizedSoloParentRequirements(
    language,
    isRenewal ? "renewal" : isLoss ? "loss" : "new"
  )

  const activeProfile = getCurrentUserProfile()

  // Render blocked active application UI directly (matches ApplyPWDSenior)
  if (isBlocked && !bypassedBlock && !isChildWelfare && (typeParam === "new" || !typeParam)) {
    const isAppApproved =
      String(blockedApp?.application_status || blockedApp?.status || "").toLowerCase() === "approved" ||
      String(blockedApp?.application_status || blockedApp?.status || "").toLowerCase() === "completed" ||
      String(blockedApp?.application_status || blockedApp?.status || "").toLowerCase() === "for_release" ||
      String(blockedApp?.application_status || blockedApp?.status || "").toLowerCase() === "active"

    const isAppRejected =
      String(blockedApp?.application_status || blockedApp?.status || "").toLowerCase() === "rejected" ||
      String(blockedApp?.application_status || blockedApp?.status || "").toLowerCase() === "disapproved"

    const rejectionReason = blockedApp?.rejection_reason || blockedApp?.rejectionReason || blockedApp?.admin_notes || ""

    const displayRef =
      blockedApp?.reference_number ||
      blockedApp?.referenceNumber ||
      blockedApp?.id ||
      getLoggedInUserQcid() ||
      "110000572516915"

    const assignedIdNo =
      blockedApp?.assigned_id_number ||
      blockedApp?.assignedIdNumber ||
      blockedApp?.solo_parent_id_number ||
      blockedApp?.soloParentIdNumber

    const rawDate = blockedApp?.created_at || blockedApp?.submittedAt || blockedApp?.submitted_at || blockedApp?.dateSubmitted
    const displayDate = formatAppDate(rawDate, blockedApp)

    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-150 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div
            className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
              isAppApproved
                ? "bg-emerald-500/10 text-emerald-600"
                : isAppRejected
                ? "bg-red-500/10 text-red-600"
                : "bg-amber-500/10 text-amber-500"
            }`}
          >
            {isAppApproved ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : isAppRejected ? (
              <X className="h-8 w-8 text-red-600" />
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
                : isAppRejected
                ? language === "en"
                  ? "Application Not Approved / Disapproved"
                  : language === "bis"
                  ? "Wala Na-aprobahan ang Aplikasyon"
                  : "Hindi Na-aprubahan ang Aplikasyon"
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
                : isAppRejected
                ? language === "en"
                  ? "Your application for Solo Parent ID was reviewed and not approved. You can review the reason below and submit a new application with the required documents."
                  : language === "bis"
                  ? "Ang imong aplikasyon para sa Solo Parent ID gisusi ug wala na-aprobahan. Mahimo nimong susihon ang hinungdan sa ubos ug mag-apply pag-usab."
                  : "Ang inyong aplikasyon para sa Solo Parent ID ay sinuri ng Social Worker at hindi na-aprubahan. Maaari ninyong suriin ang dahilan sa ibaba at mag-apply muli kalakip ang kumpletong mga dokumento."
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
                {language === "en" ? "Reference Number:" : language === "bis" ? "Numero sa Reperensya:" : "Application Reference No.:"}
              </span>
              <span className="font-mono font-bold text-blue-600">{displayRef}</span>
            </div>
            {assignedIdNo && (
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">
                  {language === "en" ? "Official ID Number:" : language === "bis" ? "Numero sa ID:" : "Opisyal na Numero ng ID:"}
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
              ) : isAppRejected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {language === "en" ? "Not Approved (Rejected)" : language === "bis" ? "Wala Na-aprobahan (Rejected)" : "Hindi Na-aprubahan (Rejected)"}
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
                {language === "en" ? "Date Filed:" : language === "bis" ? "Petsa sa Pag-file:" : "Petsa ng Pag-apply:"}
              </span>
              <span className="font-semibold text-gray-700">{displayDate}</span>
            </div>

            {isAppRejected && rejectionReason && (
              <div className="p-3 bg-red-50/90 border border-red-200 rounded-lg text-left mt-2">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">
                  {language === "en" ? "Reason for Disapproval:" : language === "bis" ? "Hinungdan sa Wala Pag-apruba:" : "Dahilan ng Hindi Pag-apruba:"}
                </span>
                <p className="text-xs text-red-700 mt-1 font-medium leading-relaxed">
                  {rejectionReason}
                </p>
              </div>
            )}
          </div>

          <div className="w-full pt-2 flex flex-col gap-2">
            {isAppApproved ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem("solo_parent_reapplying", "true")
                      localStorage.setItem("solo_parent_reapplying_renewal", "true")
                    } catch {}
                    window.location.href = `/portal/apply-solo-parent?category=solo-parent&type=renewal&reapply=true`
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  {language === "en"
                    ? "Apply for Renewal (Renewal Solo Parent ID)"
                    : language === "bis"
                    ? "Pag-apply para sa Renewal (Renewal Solo Parent ID)"
                    : "Mag-apply para sa Renewal (Renewal Solo Parent ID)"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem("solo_parent_reapplying", "true")
                      localStorage.setItem("solo_parent_reapplying_loss", "true")
                    } catch {}
                    window.location.href = `/portal/apply-solo-parent?category=solo-parent&type=loss&reapply=true`
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {language === "en"
                    ? "Apply for Replacement / Lost ID"
                    : language === "bis"
                    ? "Pag-apply para sa Replacement / Nawala nga ID"
                    : "Mag-apply para sa Replacement / Nawalang ID"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/portal/my-applications"
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer uppercase tracking-wide"
                >
                  {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
                </button>
              </>
            ) : isAppRejected ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem("solo_parent_reapplying", "true")
                      localStorage.setItem("solo_parent_reapplying_new", "true")
                    } catch {}
                    bypassedBlockRef.current = true
                    setBypassedBlock(true)
                    setIsBlocked(false)
                    setBlockedApp(null)
                    window.history.replaceState(null, "", "/portal/apply-solo-parent?category=solo-parent&type=new&reapply=true")
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>
                    {language === "en"
                      ? "RE-APPLY (SUBMIT NEW APPLICATION)"
                      : language === "bis"
                      ? "MAG-APPLY PAG-USAB (RE-APPLY)"
                      : "MAG-APPLY MULI (RE-APPLY APPLICATION)"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
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
                  window.location.href = "/portal/my-applications"
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer uppercase tracking-wide"
              >
                {language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY"}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const isFormActive = isChildWelfare ? cwSubmissionStage === "form" : spSubmissionStage === "form"
  const hasExistingApp = Boolean(isBlocked || blockedApp)
  const shouldShowRequirements = !hasExistingApp && !bypassedBlock && currentStep === 1 && isFormActive

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-2">
      {/* Top Requirements Banner with Button to Open Modal */}
      {shouldShowRequirements && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 mb-4 animate-in fade-in duration-150">
          <div className="bg-white border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm md:text-base font-bold text-foreground">
                    {modalTitle}
                  </h1>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeBadge.color}`}>
                    {typeBadge.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isChildWelfare
                    ? language === "en"
                      ? "Official service for Child & Youth Welfare of Gov Service."
                      : language === "bis"
                      ? "Opisyal nga serbisyo para sa Kaayohan sa Bata ug Kabatan-onan sa Gov Service."
                      : "Opisyal na serbisyo para sa Child & Youth Welfare ng Gov Service."
                    : language === "en"
                      ? "Official service for Solo Parents (RA 8972 / RA 11861) of Gov Service."
                      : language === "bis"
                      ? "Opisyal nga serbisyo para sa Solo Parents (RA 8972 / RA 11861) sa Gov Service."
                      : "Opisyal na serbisyo para sa Solo Parents (RA 8972 / RA 11861) ng Gov Service."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRequirementsModal(true)}
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer shrink-0"
            >
              {language === "en"
                ? "View Requirements"
                : language === "bis"
                ? "Tan-awa ang mga Kinahanglanon"
                : "Tingnan ang Requirements"}
            </button>
          </div>
        </div>
      )}

      {/* Background: Direct Form Wizard */}
      {isChildWelfare ? (
        <ChildWelfareApplicationWizard
          key={`child-welfare-${matchedCwProgram.key}`}
          userProfile={activeProfile as any}
          initialProgramId={matchedCwProgram.id}
          initialProgramKey={matchedCwProgram.key}
          onStepChange={setCurrentStep}
          onSubmissionStageChange={(stage) => setCwSubmissionStage(stage)}
        />
      ) : (
        <SoloParentApplicationWizard
          key={`solo-parent-${typeParam}`}
          userProfile={activeProfile as any}
          initialType={typeParam === "renewal" ? "renewal" : typeParam === "loss" ? "loss" : "new"}
          initialCategoryId={selectedCategoryId}
          isModalOpen={showRequirementsModal}
          onStepChange={setCurrentStep}
          onSubmissionStageChange={(stage) => setSpSubmissionStage(stage)}
          onBlockedStatusChange={(blocked, app) => {
            setIsBlocked(Boolean(blocked))
            if (app) setBlockedApp(app)
            if (blocked) {
              setShowRequirementsModal(false)
            }
          }}
        />
      )}

      {/* Requirements Dialog Modal appearing over content */}
      {showRequirementsModal && shouldShowRequirements && (
        <div
          onClick={() => setShowRequirementsModal(false)}
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150 cursor-default"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                <h2 className="text-base md:text-lg font-bold text-foreground truncate">
                  {modalTitle}
                </h2>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeBadge.color}`}>
                  {typeBadge.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRequirementsModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Important Reminder (Blue Box) */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-white">{t("importantReminder") || "Important reminder"}</p>
                  <p className="text-sm text-blue-800 dark:text-slate-200 mt-0.5">
                    {language === "en"
                      ? "Please scroll and read all requirements below."
                      : language === "bis"
                      ? "Palihug i-scroll ug basaha ang tanang gikinahanglang dokumento sa ubos."
                      : "Pakisuri at basahin ang lahat ng dokumentong kailangan sa ibaba."}
                  </p>
                </div>
              </div>

              {/* Status / Category Alert Box */}
              {isChildWelfare ? (
                <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
                  <HeartHandshake className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-blue-950 dark:text-white">
                    {language === "en"
                      ? "CHILD & YOUTH WELFARE — Official program for the welfare, protection, and development of children in Quezon City."
                      : language === "bis"
                      ? "CHILD & YOUTH WELFARE — Opisyal nga programa para sa kaayohan, proteksyon ug paglambo sa mga bata sa Lungsod Quezon."
                      : "CHILD & YOUTH WELFARE — Opisyal na programa para sa kapakanan, proteksyon at pag-unlad ng mga bata sa Lungsod Quezon."}
                  </p>
                </div>
              ) : isRenewal ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {language === "en"
                      ? "RENEWAL — Please prepare your current Solo Parent ID Number before proceeding."
                      : language === "bis"
                      ? "RENEWAL — Palihug ihanda ang imong kasamtangang Solo Parent ID Number sa dili pa mopadayon."
                      : "RENEWAL — Ihanda ang inyong kasalukuyang Solo Parent ID Number bago magpatuloy."}
                  </p>
                </div>
              ) : isLoss ? (
                <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-xl p-4 flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                    {language === "en"
                      ? "REPLACEMENT — Please prepare your Notarized Affidavit of Loss before proceeding."
                      : language === "bis"
                      ? "REPLACEMENT — Palihug ihanda ang imong Notarized Affidavit of Loss sa dili pa mopadayon."
                      : "REPLACEMENT — Ihanda ang inyong Notarized Affidavit of Loss bago magpatuloy."}
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-emerald-950/40 border border-green-200 dark:border-emerald-800/60 rounded-xl p-4 flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-green-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-green-900 dark:text-emerald-200">
                    {language === "en"
                      ? "NEW APPLICATION — Ensure all original or certified true copies of documentary requirements are prepared before proceeding."
                      : language === "bis"
                      ? "BAG-ONG APLIKASYON — Siguroha nga andam ang tanang orihinal o sertipikadong kopya sa mga gikinahanglang dokumento sa dili pa mopadayon."
                      : "NEW APPLICATION — Tiyaking handa ang lahat ng orihinal o certified true copy ng mga documentary requirements bago magpatuloy."}
                  </p>
                </div>
              )}

              {/* Requirements Body */}
              {isChildWelfare ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2 uppercase tracking-wide">
                      {language === "en"
                        ? `I. WHAT IS THE ${matchedCwProgram.title.toUpperCase()} PROGRAM?`
                        : language === "bis"
                        ? `I. UNSA ANG ${matchedCwProgram.title.toUpperCase()} PROGRAM?`
                        : `I. ANO ANG ${matchedCwProgram.title.toUpperCase()} PROGRAM?`}
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-gray-50 border border-border/80 rounded-xl p-3.5">
                      {matchedCwProgram.whatIsIt}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2 uppercase tracking-wide">
                      {language === "en"
                        ? "II. WHO IS ELIGIBLE FOR THE PROGRAM?"
                        : language === "bis"
                        ? "II. KINSA ANG KWALIPIKADO SA PROGRAMA?"
                        : "II. SINO ANG KWALIPIKADO SA PROGRAMA?"}
                    </h3>
                    <ul className="space-y-2">
                      {matchedCwProgram.whoIsEligible.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                          <span className="text-blue-600 font-bold leading-none mt-1 shrink-0">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3 uppercase tracking-wide">
                      {language === "en"
                        ? "III. REQUIREMENTS (REQUIRED DOCUMENTS)"
                        : language === "bis"
                        ? "III. MGA GIKINAHANGLANG DOKUMENTO (REQUIREMENTS)"
                        : "III. MGA KINAKAILANGANG DOKUMENTO (REQUIREMENTS)"}
                    </h3>

                    {matchedCwProgram.childRequirements.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">
                          {language === "en" ? "For the Child:" : language === "bis" ? "Para sa Bata:" : "Para sa Bata:"}
                        </h4>
                        <ul className="space-y-2">
                          {matchedCwProgram.childRequirements.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                              <span className="text-blue-600 font-bold leading-none mt-1 shrink-0">•</span>
                              <span className="leading-relaxed">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {matchedCwProgram.parentRequirements.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">
                          {language === "en"
                            ? "For Parent / Guardian / Reporting Person:"
                            : language === "bis"
                            ? "Para sa Ginikanan / Guardian / Tig-report:"
                            : "Para sa Magulang / Guardian / Nag-uulat:"}
                        </h4>
                        <ul className="space-y-2">
                          {matchedCwProgram.parentRequirements.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                              <span className="text-blue-600 font-bold leading-none mt-1 shrink-0">•</span>
                              <span className="leading-relaxed">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {matchedCwProgram.specialRequirements.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">
                          {language === "en"
                            ? "For Specific Assistance / If Applicable:"
                            : language === "bis"
                            ? "Para sa pipila ka matang sa tabang / Kung gikinahanglan:"
                            : "Para sa ilang uri ng tulong / Kung kinakailangan:"}
                        </h4>
                        <ul className="space-y-2">
                          {matchedCwProgram.specialRequirements.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                              <span className="text-blue-600 font-bold leading-none mt-1 shrink-0">•</span>
                              <span className="leading-relaxed">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-bold text-foreground mb-3 uppercase tracking-wide">
                    {isRenewal
                      ? language === "en"
                        ? "REQUIREMENTS (FOR RENEWAL)"
                        : language === "bis"
                        ? "MGA KINAHANGLANON (PARA SA PAG-RENEW)"
                        : "MGA KINAKAILANGAN (PARA SA PAG-RENEW)"
                      : isLoss
                      ? language === "en"
                        ? "REQUIREMENTS (FOR REPLACEMENT)"
                        : language === "bis"
                        ? "MGA KINAHANGLANON (PARA SA PAG-ILIS)"
                        : "MGA KINAKAILANGAN (PARA SA PAGPAPALIT)"
                      : language === "en"
                      ? "REQUIREMENTS (FOR NEW APPLICATION)"
                      : language === "bis"
                      ? "MGA KINAHANGLANON (PARA SA BAG-ONG APLIKASYON)"
                      : "MGA KINAKAILANGAN (PARA SA BAGONG APLIKASYON)"}
                  </h3>
                  <ul className="space-y-3 mb-6">
                    {currentRequirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span className="text-blue-600 font-bold leading-none mt-1 shrink-0">•</span>
                        <div>
                          <span className="font-semibold text-foreground">{req.title}</span>
                          {req.desc && <p className="text-muted-foreground text-xs mt-0.5">{req.desc}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer with Checkbox and Button */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-start gap-2.5 flex-1">
                <input
                  type="checkbox"
                  id="understand"
                  className="mt-0.5 cursor-pointer accent-blue-600 h-4 w-4"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                />
                <label htmlFor="understand" className="text-xs md:text-sm text-foreground cursor-pointer select-none">
                  {language === "en"
                    ? "I accept and understand the documentary requirements for this service"
                    : language === "bis"
                    ? "Gidawat ug nasabtan nako ang mga gikinahanglang dokumento alang niini nga serbisyo"
                    : "Tinatanggap at nauunawaan ko ang mga kailangang dokumento para sa serbisyong ito"}
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnderstood(true)
                  setShowRequirementsModal(false)
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all shrink-0 cursor-pointer shadow-sm"
              >
                {language === "en"
                  ? "Proceed with Application"
                  : language === "bis"
                  ? "Ipadayon ang Aplikasyon"
                  : "Ipagpatuloy ang Aplikasyon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}