import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertCircle, RefreshCw, HeartHandshake, X, FileText, Info, CheckCircle2 } from "lucide-react"
import PWDApplicationWizard from "./pwd-senior-wizard"
import SeniorCitizenApplicationWizard from "./Senior-citizen-wizard"
import PWDSocialAssistanceWizard from "./pwd-assistance-wizard"
import SeniorBookletWizard from "./senior-booklet-wizard"
import SeniorSocialAssistanceWizard from "./senior-assistance-wizard"
import { useLanguage } from "../ui/language-context"
import { API_BASE } from "../../config/api"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import { fetchPwdSeniorApplications } from "../../utils/cachedApiFetch"

export default function ApplyPWDSenior() {
  const { t, language } = useLanguage()
  const [searchParams] = useSearchParams()

  const urlCategory = searchParams.get("category")?.toLowerCase() // "pwd" | "senior"
  const rawType = searchParams.get("type")?.toLowerCase() || "new"
  const urlType = rawType as "new" | "renewal" | "loss" | "assistance" | "medicine-booklet" | "movie-booklet" | "social-assistance"

  const [showModal, setShowModal] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedApp, setBlockedApp] = useState<any>(null)
  const [hasApprovedApp, setHasApprovedApp] = useState(false)

  const isSenior = urlCategory === "senior"
  const isSeniorMedicine = isSenior && urlType === "medicine-booklet"
  const isSeniorMovie = isSenior && urlType === "movie-booklet"
  const isSeniorSocial = isSenior && urlType === "social-assistance"
  const isSeniorId = isSenior && !isSeniorMedicine && !isSeniorMovie && !isSeniorSocial
  const isAssistance = !isSenior && urlType === "assistance"

  const [bypassedBlock, setBypassedBlock] = useState(() => {
    try {
      const isUrlParam = typeof window !== "undefined" && window.location.search.includes("reapply=true")
      const isLocal =
        localStorage.getItem(`pwd_senior_reapplying_${urlCategory || "pwd"}_${urlType || "new"}`) === "true" ||
        localStorage.getItem("pwd_senior_reapplying") === "true"
      return Boolean(isUrlParam || isLocal)
    } catch {
      return false
    }
  })
  const bypassedBlockRef = useRef(bypassedBlock)

  // Check for existing pending/active applications for this category & service
  useEffect(() => {
    let isMounted = true

    const checkActiveApp = async () => {
      try {
        const backendApps = await fetchPwdSeniorApplications()

        // Sync local storage with fresh backend records
        let localApps: any[] = []
        try {
          const raw = localStorage.getItem("pwd_senior_applications")
          if (raw) localApps = JSON.parse(raw)
          if (!Array.isArray(localApps)) localApps = []
        } catch {}

        let allApps = [...backendApps]
        for (const la of localApps) {
          if (la && !allApps.some((ba) => (ba.id && ba.id === la.id) || (ba.referenceNumber && ba.referenceNumber === la.referenceNumber))) {
            allApps.push(la)
          }
        }
        try {
          localStorage.setItem("pwd_senior_applications", JSON.stringify(allApps))
        } catch {}

        const currentQcid = getLoggedInUserQcid() || "110000572516915"
        const userProf = getCurrentUserProfile()
        const currentEmail = (userProf?.email || "").toLowerCase().trim()
        const currentLastName = (userProf?.lastName || "").toLowerCase().trim()
        const currentFirstName = (userProf?.firstName || "").toLowerCase().trim()
        const currentFullName = `${currentFirstName} ${userProf?.middleName || ""} ${currentLastName}`.toLowerCase().trim()
        const currentUid = String(userProf?.id || (userProf as any)?.userId || "").trim()

        const isUserMatch = (a: any) => {
          if (!a) return false

          const appRef = String(a.referenceNumber || a.reference_number || a.reference_no || a.id || "").toLowerCase().trim()
          const appQcid = String(a.qcid || a.qc_id || a.qcidNo || a.qcidNumber || a.qcid_number || "").toLowerCase().trim()
          const appAssigned = String(a.assignedIdNumber || a.assigned_id_number || "").toLowerCase().trim()
          const appEmail = String(a.email || "").toLowerCase().trim()
          const appLastName = String(a.lastName || a.last_name || "").toLowerCase().trim()
          const appFirstName = String(a.firstName || a.first_name || "").toLowerCase().trim()
          const appFullName = String(a.applicantName || a.applicant_name || `${appFirstName} ${appLastName}`).toLowerCase().trim()
          const appUid = String(a.userId || a.user_id || "").trim()

          // 1. User ID match
          if (currentUid && appUid && currentUid === appUid && currentUid !== "0") return true

          // 2. QCID / Reference match
          const qcidClean = currentQcid.toLowerCase().trim()
          if (qcidClean) {
            if (appRef === qcidClean || appQcid === qcidClean || appAssigned === qcidClean) return true
            if (qcidClean.length >= 8 && (appRef.includes(qcidClean) || appQcid.includes(qcidClean) || appAssigned.includes(qcidClean))) return true
            if (appRef.length >= 8 && qcidClean.includes(appRef)) return true
            const userDigits = qcidClean.replace(/\D/g, "")
            const appRefDigits = appRef.replace(/\D/g, "")
            const appQcidDigits = appQcid.replace(/\D/g, "")
            if (userDigits.length >= 8 && (appRefDigits === userDigits || appQcidDigits === userDigits || appRefDigits.includes(userDigits) || userDigits.includes(appRefDigits))) return true
          }

          // 3. Email match
          if (currentEmail && appEmail && currentEmail === appEmail) return true

          // 4. Name match (Last name matches + First name matches or contains)
          if (currentLastName && appLastName) {
            const lastNameMatch = currentLastName === appLastName || appLastName.includes(currentLastName) || currentLastName.includes(appLastName)
            if (lastNameMatch) {
              if (!currentFirstName || !appFirstName) return true
              if (currentFirstName === appFirstName) return true
              if (appFirstName.includes(currentFirstName) || currentFirstName.includes(appFirstName)) return true
              if (appFullName.includes(currentFirstName) || currentFullName.includes(appFirstName)) return true
            }
          }

          // 5. Full name match
          if (currentFullName && appFullName && (currentFullName === appFullName || appFullName.includes(currentLastName) && appFullName.includes(currentFirstName))) {
            return true
          }

          return false
        }

        // Filter all applications belonging to this user
        const userApps = allApps.filter(isUserMatch)

        // Classify applications for Senior Citizen vs PWD
        const seniorApps = userApps.filter((a) => {
          const cat = String(a.category || "").toLowerCase()
          const srv = String(a.service || "").toLowerCase()
          return cat.includes("senior") || srv.includes("senior")
        })

        const pwdApps = userApps.filter((a) => {
          const cat = String(a.category || "").toLowerCase()
          const srv = String(a.service || "").toLowerCase()
          const isSeniorCat = cat.includes("senior") || srv.includes("senior")
          return !isSeniorCat && (cat.includes("pwd") || cat.includes("disability") || srv.includes("pwd") || cat === "pwd")
        })

        const relevantApps = isSenior ? seniorApps : pwdApps

        // Check for specific sub-services
        if (isSeniorMedicine) {
          const medApps = seniorApps.filter((a) => {
            const t = String(a.type || a.service || "").toLowerCase()
            return t.includes("medicine")
          })
          const approvedMed = medApps.find((a) => ["approved", "completed", "for_release"].includes(String(a.status || "").toLowerCase()))
          const pendingMed = medApps.find((a) => ["pending", "under_review"].includes(String(a.status || "pending").toLowerCase()))
          if (isMounted) {
            if (approvedMed) {
              setIsBlocked(true)
              setBlockedApp(approvedMed)
            } else if (pendingMed) {
              setIsBlocked(true)
              setBlockedApp(pendingMed)
            } else {
              setIsBlocked(false)
              setBlockedApp(null)
            }
          }
        } else if (isSeniorMovie) {
          const movieApps = seniorApps.filter((a) => {
            const t = String(a.type || a.service || "").toLowerCase()
            return t.includes("movie")
          })
          const approvedMovie = movieApps.find((a) => ["approved", "completed", "for_release"].includes(String(a.status || "").toLowerCase()))
          const pendingMovie = movieApps.find((a) => ["pending", "under_review"].includes(String(a.status || "pending").toLowerCase()))
          if (isMounted) {
            if (approvedMovie) {
              setIsBlocked(true)
              setBlockedApp(approvedMovie)
            } else if (pendingMovie) {
              setIsBlocked(true)
              setBlockedApp(pendingMovie)
            } else {
              setIsBlocked(false)
              setBlockedApp(null)
            }
          }
        } else if (isSeniorSocial) {
          const socialApps = seniorApps.filter((a) => {
            const t = String(a.type || a.service || a.assistanceType || "").toLowerCase()
            return t.includes("assistance") || t.includes("social")
          })
          const approvedSocial = socialApps.find((a) => ["approved", "completed", "for_release"].includes(String(a.status || "").toLowerCase()))
          const pendingSocial = socialApps.find((a) => ["pending", "under_review"].includes(String(a.status || "pending").toLowerCase()))
          if (isMounted) {
            if (approvedSocial) {
              setIsBlocked(true)
              setBlockedApp(approvedSocial)
            } else if (pendingSocial) {
              setIsBlocked(true)
              setBlockedApp(pendingSocial)
            } else {
              setIsBlocked(false)
              setBlockedApp(null)
            }
          }
        } else if (isAssistance) {
          const pwdAssistanceApps = pwdApps.filter((a) => {
            const t = String(a.type || a.service || a.assistanceType || "").toLowerCase()
            return t.includes("assistance") || t.includes("social") || (a.documents || []).some((d: any) => String(d.name || "").toLowerCase().includes("indigency"))
          })
          const approvedAssistance = pwdAssistanceApps.find((a) => ["approved", "completed", "for_release"].includes(String(a.status || "").toLowerCase()))
          const pendingAssistance = pwdAssistanceApps.find((a) => ["pending", "under_review"].includes(String(a.status || "pending").toLowerCase()))
          if (isMounted) {
            if (approvedAssistance) {
              setIsBlocked(true)
              setBlockedApp(approvedAssistance)
            } else if (pendingAssistance) {
              setIsBlocked(true)
              setBlockedApp(pendingAssistance)
            } else {
              setIsBlocked(false)
              setBlockedApp(null)
            }
          }
        } else {
          // ID Cards (Senior Citizen ID or PWD ID)
          const idApps = relevantApps.filter((a) => {
            const t = String(a.type || a.service || "").toLowerCase()
            const isSub = t.includes("booklet") || t.includes("medicine") || t.includes("movie") || t.includes("assistance")
            return !isSub
          })

          // Check if user has ANY approved ID application
          const anyApprovedId = idApps.find((a) => {
            const s = String(a.status || "").toLowerCase()
            return s === "approved" || s === "completed" || s === "for_release"
          })

          // Check for pending applications matching current sub-flow
          const pendingNew = idApps.find((a) => {
            const s = String(a.status || "pending").toLowerCase()
            const t = String(a.type || "new").toLowerCase()
            return (s === "pending" || s === "under_review") && t !== "renewal" && t !== "loss" && t !== "replacement"
          })
          const pendingRenewal = idApps.find((a) => {
            const s = String(a.status || "pending").toLowerCase()
            const t = String(a.type || "").toLowerCase()
            return (s === "pending" || s === "under_review") && t === "renewal"
          })
          const pendingLoss = idApps.find((a) => {
            const s = String(a.status || "pending").toLowerCase()
            const t = String(a.type || "").toLowerCase()
            return (s === "pending" || s === "under_review") && (t === "loss" || t === "replacement")
          })

          if (isMounted) {
            if (urlType === "new" || !urlType) {
              // On New Application: if user ALREADY has an approved ID, STRICTLY block and show Approved ID
              if (anyApprovedId) {
                setIsBlocked(true)
                setBlockedApp(anyApprovedId)
                setHasApprovedApp(true)
              } else if (pendingNew) {
                setIsBlocked(true)
                setBlockedApp(pendingNew)
                setHasApprovedApp(false)
              } else {
                setIsBlocked(false)
                setBlockedApp(null)
                setHasApprovedApp(false)
              }
            } else if (urlType === "renewal") {
              if (pendingRenewal) {
                setIsBlocked(true)
                setBlockedApp(pendingRenewal)
              } else {
                setIsBlocked(false)
                setBlockedApp(null)
              }
              setHasApprovedApp(Boolean(anyApprovedId))
            } else if (urlType === "loss") {
              if (pendingLoss) {
                setIsBlocked(true)
                setBlockedApp(pendingLoss)
              } else {
                setIsBlocked(false)
                setBlockedApp(null)
              }
              setHasApprovedApp(Boolean(anyApprovedId))
            }
          }
        }
      } catch (err) {
        console.warn("Eligibility check skipped/offline:", err)
      }
    }

    checkActiveApp()
    const pollInterval = setInterval(checkActiveApp, 1500)

    const unsubscribe = subscribeToRealtimeChanges(() => {
      checkActiveApp()
    })

    const handleUpdated = () => checkActiveApp()
    window.addEventListener("pwd_senior_applications_updated", handleUpdated)
    window.addEventListener("applications_updated", handleUpdated)
    window.addEventListener("financial_disbursements_updated", handleUpdated)
    window.addEventListener("storage", handleUpdated)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
      unsubscribe()
      window.removeEventListener("pwd_senior_applications_updated", handleUpdated)
      window.removeEventListener("applications_updated", handleUpdated)
      window.removeEventListener("financial_disbursements_updated", handleUpdated)
      window.removeEventListener("storage", handleUpdated)
    }
  }, [urlCategory, urlType, isSenior, isAssistance, isSeniorSocial, isSeniorMedicine, isSeniorMovie, isSeniorId])

  // Keep modal closed on navigation so user can see and access the form UI directly
  useEffect(() => {
    try {
      const isReapp =
        localStorage.getItem(`pwd_senior_reapplying_${urlCategory || "pwd"}_${urlType || "new"}`) === "true" ||
        localStorage.getItem("pwd_senior_reapplying") === "true" ||
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
    setShowModal(false)
    setUnderstood(false)
    setCurrentStep(1)
  }, [urlCategory, urlType])

  const typeBadge = isSeniorMedicine
    ? { label: t("badgeMedicineBooklet"), color: "bg-blue-100 text-blue-700 border-blue-200" }
    : isSeniorMovie
    ? { label: t("badgeMovieBooklet"), color: "bg-blue-100 text-blue-700 border-blue-200" }
    : isSeniorSocial
    ? { label: t("badgeSocialAssistance"), color: "bg-blue-100 text-blue-700 border-blue-200" }
    : isAssistance
    ? { label: t("badgeSocialAssistance"), color: "bg-blue-100 text-blue-700 border-blue-200" }
    : urlType === "new"
    ? { label: t("badgeNewApplication"), color: "bg-green-100 text-green-700 border-green-200" }
    : urlType === "loss"
    ? { label: "Replacement / Lost ID", color: "bg-orange-100 text-orange-700 border-orange-200" }
    : { label: t("badgeRenewal"), color: "bg-amber-100 text-amber-700 border-amber-200" }

  const serviceCleanTitle = isSeniorMedicine
    ? "Medicine Discount Booklet"
    : isSeniorMovie
    ? "Free Movie Booklet"
    : isSeniorSocial
    ? "Senior Citizen Social Assistance"
    : isSeniorId
    ? "Senior Citizen ID"
    : isAssistance
    ? "PWD Social Assistance"
    : "PWD ID"

  const modalTitle = isSeniorMedicine
    ? t("seniorMedicineReqTitle")
    : isSeniorMovie
    ? t("seniorMovieReqTitle")
    : isSeniorSocial
    ? t("seniorSocialReqTitle")
    : isSeniorId
    ? t("seniorIdReqTitle")
    : isAssistance
    ? t("pwdAssistanceReqTitle")
    : t("pwdIdReqTitle")

  const pwdSocialAssistanceRequirements = [
    { title: t("pwdSocialReq1Title"), desc: t("pwdSocialReq1Desc") },
    { title: t("pwdSocialReq2Title"), desc: t("pwdSocialReq2Desc") },
    { title: t("pwdSocialReq3Title"), desc: t("pwdSocialReq3Desc") },
    { title: t("pwdSocialReq4Title"), desc: t("pwdSocialReq4Desc") },
  ]

  const generalPwdRequirements = [
    { title: t("pwdGenReqResidence"), desc: t("pwdGenReqResidenceDesc") },
    { title: t("pwdGenReqPhoto"), desc: t("pwdGenReqPhotoDesc") },
    { title: t("pwdGenReqSignature"), desc: "" },
    { title: t("pwdGenReqDisability"), desc: t("pwdGenReqDisabilityDesc") },
  ]

  const apparentDisabilityRequirements = [
    { title: t("pwdApparentPhoto"), desc: t("pwdApparentPhotoDesc") },
    { title: t("pwdApparentXray"), desc: t("pwdApparentXrayDesc") },
  ]

  const nonApparentDisabilityRequirements = [
    { title: t("pwdNonApparentCert"), desc: t("pwdNonApparentCertDesc") },
    { title: t("pwdNonApparentMedCert"), desc: t("pwdNonApparentMedCertDesc") },
  ]

  const seniorCitizenRequirements = [
    t("seniorReq1"),
    t("seniorReq2"),
    t("seniorReq3"),
    t("seniorReq4"),
    t("seniorReq5"),
    t("seniorReq6"),
  ]

  const seniorSocialRequirements = [
    t("seniorSocialReq1"),
    t("seniorSocialReq2"),
    t("seniorSocialReq3"),
    t("seniorSocialReq4"),
    t("seniorSocialReq5"),
    t("seniorSocialReq6"),
    t("seniorSocialReq7"),
  ]

  const seniorMedicineRequirements = [
    t("seniorMedReq1"),
    t("seniorMedReq2"),
    t("seniorMedReq3"),
    t("seniorMedReq4"),
    t("seniorMedReq5"),
  ]

  const seniorMovieRequirements = [
    t("seniorMovieReq1"),
    t("seniorMovieReq2"),
    t("seniorMovieReq3"),
    t("seniorMovieReq4"),
  ]

  const seniorLossRequirements = [
    t("seniorLossReq1"),
    t("seniorLossReq2"),
    t("seniorMedReq3"),
    t("seniorMedReq4"),
  ]

  const seniorRenewalRequirements = [
    t("seniorRenewalReq1"),
    t("seniorMedReq3"),
    t("seniorRenewalReq3"),
    t("seniorRenewalReq4"),
  ]

  // Render blocked active application UI directly (for PWD, Senior, Booklets, and Assistance wizards)
  const isAppApproved = String(blockedApp?.status || "").toLowerCase() === "approved" || String(blockedApp?.status || "").toLowerCase() === "completed" || String(blockedApp?.status || "").toLowerCase() === "for_release"
  if (isBlocked && (!bypassedBlock || isAppApproved)) {
    const displayRef = blockedApp?.referenceNumber || blockedApp?.reference_no || blockedApp?.reference_number || blockedApp?.id || blockedApp?.qc_id || blockedApp?.qcid || getLoggedInUserQcid() || "110000572516915"
    const assignedBookletNo = blockedApp?.assignedIdNumber || blockedApp?.assigned_id_number || blockedApp?.bookletNumber || blockedApp?.existingBookletNumber
    const displayDate = blockedApp?.created_at || blockedApp?.submittedAt || blockedApp?.dateSubmitted
      ? new Date(blockedApp.created_at || blockedApp.submittedAt || blockedApp.dateSubmitted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })

    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 animate-in fade-in duration-150 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isAppApproved ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-500"}`}>
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
                ? (isSeniorMedicine
                    ? (language === "en"
                        ? "Your application for Medicine Discount Booklet has been officially approved! Your official booklet number has been issued."
                        : language === "bis"
                        ? "Ang imong aplikasyon para sa Medicine Discount Booklet opisyal nang na-aprobahan."
                        : "Ang inyong aplikasyon para sa Medicine Discount Booklet ay opisyal nang na-apruba ng Gov Service.")
                    : isSeniorMovie
                    ? (language === "en"
                        ? "Your application for Free Movie Booklet has been officially approved! Your official booklet number has been issued."
                        : language === "bis"
                        ? "Ang imong aplikasyon para sa Free Movie Booklet opisyal nang na-aprobahan."
                        : "Ang inyong aplikasyon para sa Free Movie Booklet ay opisyal nang na-apruba ng Gov Service.")
                    : isAssistance || isSeniorSocial
                    ? (language === "en"
                        ? `Your application for ${serviceCleanTitle} has been officially approved! You can check your scheduled appointment or payout release status.`
                        : language === "bis"
                        ? `Ang imong aplikasyon para sa ${serviceCleanTitle} opisyal nang na-aprobahan sa Gov Service.`
                        : `Ang inyong aplikasyon para sa ${serviceCleanTitle} ay opisyal nang na-apruba ng Gov Service Social Services.`)
                    : (language === "en"
                        ? `Your application for ${serviceCleanTitle} has been officially approved! You already have an active ID.`
                        : language === "bis"
                        ? `Ang imong aplikasyon para sa ${serviceCleanTitle} opisyal nang na-aprobahan. Aduna ka nay aktibo nga ID.`
                        : `Ang inyong aplikasyon para sa ${serviceCleanTitle} ay opisyal nang na-apruba ng Gov Service.`))
                : (language === "en"
                    ? `Your application for ${serviceCleanTitle} has been successfully submitted and is currently pending review. Please wait for an assessment before submitting a new application.`
                    : language === "bis"
                    ? `Ang imong aplikasyon para sa ${serviceCleanTitle} nasumite na ug kasamtangang girebyu.`
                    : `Ang inyong aplikasyon para sa ${serviceCleanTitle} ay matagumpay na naisumite at kasalukuyang sinusuri.`)}
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-gray-500 font-medium">
                {language === "en" ? "Reference Number:" : language === "bis" ? "Numero sa Reperensya:" : "Application Reference No.:"}
              </span>
              <span className="font-mono font-bold text-blue-600">{displayRef}</span>
            </div>
            {assignedBookletNo && (
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-gray-500 font-medium">
                  {isSeniorMedicine || isSeniorMovie
                    ? (language === "en" ? "Official Booklet Number:" : language === "bis" ? "Numero sa Booklet:" : "Numero ng Booklet:")
                    : (language === "en" ? "Official ID Number:" : language === "bis" ? "Numero sa ID:" : "Opisyal na Numero ng ID:")}
                </span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {assignedBookletNo}
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
                {language === "en" ? "Date Filed:" : language === "bis" ? "Petsa sa Pag-file:" : "Petsa ng Pag-apply:"}
              </span>
              <span className="font-semibold text-gray-700">
                {displayDate}
              </span>
            </div>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2">
            {isAppApproved && !isAssistance && !isSeniorSocial && !isSeniorMedicine && !isSeniorMovie ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const cat = isSenior ? "senior" : "pwd"
                    window.location.href = `/portal/apply-pwd-senior?category=${cat}&type=renewal`
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  {isSenior
                    ? (language === "en" ? "Apply for Renewal (Renewal SENIOR ID)" : language === "bis" ? "Pag-apply para sa Renewal (Renewal SENIOR ID)" : "Mag-apply para sa Renewal (Renewal SENIOR ID)")
                    : (language === "en" ? "Apply for Renewal (Renewal PWD ID)" : language === "bis" ? "Pag-apply para sa Renewal (Renewal PWD ID)" : "Mag-apply para sa Renewal (Renewal PWD ID)")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cat = isSenior ? "senior" : "pwd"
                    window.location.href = `/portal/apply-pwd-senior?category=${cat}&type=loss`
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === "en" ? "Apply for Replacement / Lost ID" : language === "bis" ? "Pag-apply para sa Replacement / Nawala nga ID" : "Mag-apply para sa Replacement / Nawalang ID"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(`pwd_senior_reapplying_${urlCategory || "pwd"}_${urlType || "new"}`)
                      localStorage.removeItem("pwd_senior_reapplying")
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
                    localStorage.removeItem(`pwd_senior_reapplying_${urlCategory || "pwd"}_${urlType || "new"}`)
                    localStorage.removeItem("pwd_senior_reapplying")
                  } catch {}
                  ;(window as any).__isFormDirty = false
                  window.location.href = isAssistance || isSeniorSocial ? "/portal/financial-aid" : "/portal/my-applications"
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs uppercase tracking-wide"
              >
                {isAssistance || isSeniorSocial
                  ? (language === "bis" ? "TAN-AWA SA FINANCIAL AID / MY APPLICATIONS" : "VIEW IN FINANCIAL AID / DISBURSEMENT")
                  : (language === "bis" ? "TAN-AWA SA KASAYSAYAN SA APLIKASYON" : "VIEW IN APPLICATION HISTORY")}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-2">
      {/* Top Service Quick Info Banner - shown only on Step 1 when user is actively filling out the form */}
      {currentStep === 1 && !isBlocked && !blockedApp && !hasApprovedApp && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 mb-3 animate-in fade-in duration-150">
          <div className="bg-white border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isSenior ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm md:text-base font-bold text-foreground">
                    {serviceCleanTitle}
                  </h1>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeBadge.color}`}>
                    {typeBadge.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSenior
                    ? "Official government social service for Senior Citizens."
                    : "Official government social service for Persons with Disability (PWD)."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer shrink-0"
            >
              View Requirements
            </button>
          </div>
        </div>
      )}

      {/* Background: Direct Form Wizard */}
      {(() => {
        const activeProfile = getCurrentUserProfile();
        return isSeniorMedicine ? (
          <SeniorBookletWizard key="senior-medicine" bookletType="medicine" userProfile={activeProfile as any} onStepChange={setCurrentStep} />
        ) : isSeniorMovie ? (
          <SeniorBookletWizard key="senior-movie" bookletType="movie" userProfile={activeProfile as any} onStepChange={setCurrentStep} />
        ) : isSeniorSocial ? (
          <SeniorSocialAssistanceWizard key="senior-social" userProfile={activeProfile as any} onStepChange={setCurrentStep} />
        ) : isSenior ? (
          <SeniorCitizenApplicationWizard
            key={`senior-${urlType}`}
            initialIdStatus={urlType as "new" | "renewal" | "loss"}
            userProfile={activeProfile as any}
            onStepChange={setCurrentStep}
          />
        ) : isAssistance ? (
          <PWDSocialAssistanceWizard
            key="pwd-assistance"
            userProfile={activeProfile as any}
            onStepChange={setCurrentStep}
          />
        ) : (
          <PWDApplicationWizard
            key={`pwd-${urlType}`}
            initialIdStatus={urlType as "new" | "renewal" | "loss"}
            userProfile={activeProfile as any}
            onStepChange={setCurrentStep}
          />
        );
      })()}

      {/* Requirements Dialog Modal appearing over the content */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
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
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* MEDICINE BOOKLET REQUIREMENTS */}
              {isSeniorMedicine && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      {t("seniorDualCitizenshipNote") || 'NOTE: This may apply to seniors with "dual citizenship status" if he/she can prove his/her Filipino Citizen status and has resided in this city for at least six (6) months.'}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-blue-900">
                      {t("seniorMedicineReminder") || "Paalala: Para sa Medicine Discount Booklet ng Senior Citizen, tiyaking mayroong valid na Senior Citizen / OSCA ID."}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3 uppercase tracking-wide">
                      {t("seniorRequirementsHeading") || "REQUIREMENTS:"}
                    </h3>
                    <ul className="space-y-2.5">
                      {seniorMedicineRequirements.map((req, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-blue-600">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground italic">
                    {t("seniorSocialWorkerVisitNote") || "A social worker will contact you for verification and to schedule an appointment. Please bring all required documents when you visit."}
                  </p>
                </>
              )}

              {/* MOVIE BOOKLET REQUIREMENTS */}
              {isSeniorMovie && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      {t("seniorDualCitizenshipNote") || 'NOTE: This may apply to seniors with "dual citizenship status" if he/she can prove his/her Filipino Citizen status and has resided in this city for at least six (6) months.'}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-blue-900">
                      {t("seniorMovieReminder") || "Paalala: Para sa Free Movie Booklet ng Senior Citizen sa Quezon City cinemas, ihanda ang inyong valid OSCA ID."}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3 uppercase tracking-wide">
                      {t("seniorRequirementsHeading") || "REQUIREMENTS:"}
                    </h3>
                    <ul className="space-y-2.5">
                      {seniorMovieRequirements.map((req, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-blue-600">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground italic">
                    {t("seniorSocialWorkerVisitNote") || "A social worker will contact you for verification and to schedule an appointment. Please bring all required documents when you visit."}
                  </p>
                </>
              )}

              {/* SENIOR SOCIAL ASSISTANCE REQUIREMENTS */}
              {isSeniorSocial && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      {t("seniorDualCitizenshipNote") || 'NOTE: This may apply to seniors with "dual citizenship status" if he/she can prove his/her Filipino Citizen status and has resided in this city for at least six (6) months.'}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <HeartHandshake className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-blue-900">
                      {t("seniorSocialReminder") || "Paalala: Para sa Tulong Panlipunan (Social Assistance) ng Senior Citizens sa Quezon City, ihanda ang mga kaukulang dokumento at katibayan ng pangangailangan."}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3 uppercase tracking-wide">
                      {t("seniorRequirementsHeading") || "REQUIREMENTS:"}
                    </h3>
                    <ul className="space-y-2.5">
                      {seniorSocialRequirements.map((req, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-blue-600">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground italic">
                    {t("seniorSocialWorkerVisitNote") || "A social worker will contact you for verification and to schedule an appointment. Please bring all required documents when you visit."}
                  </p>
                </>
              )}

              {/* PWD ASSISTANCE SECTION */}
              {isAssistance && (
                <>
                  <div className="space-y-3">
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-white">{t("importantReminder")}</p>
                        <p className="text-sm text-blue-800 dark:text-slate-200 mt-1">
                          {t("pwdAssistanceReminderDesc")}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
                      <HeartHandshake className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-blue-950 dark:text-white">
                        {t("pwdAssistanceBanner")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3 uppercase tracking-wide">
                      {t("requiredDocumentsHeading")}
                    </h3>
                    <ul className="space-y-2 mb-4">
                      {pwdSocialAssistanceRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground bg-gray-50 dark:bg-slate-900/60 border border-border/80 rounded-xl p-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">☑</span>
                          <div>
                            <span className="font-bold text-foreground">{req.title}</span>
                            {req.desc && <p className="text-muted-foreground text-xs mt-0.5">{req.desc}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    {t("pwdPhotoClearNote")}
                  </p>
                </>
              )}

              {/* PWD ID SECTION */}
              {!isSenior && !isAssistance && (
                <>
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">{t("importantReminder")}</p>
                        <p className="text-sm text-blue-800 mt-1">{t("pwdGeneralReminderDesc")}</p>
                      </div>
                    </div>

                    <div className={`rounded-xl p-4 flex items-start gap-3 border ${
                      urlType === "renewal"
                        ? "bg-amber-50 border-amber-200"
                        : urlType === "loss"
                        ? "bg-orange-50 border-orange-200"
                        : "bg-green-50 border-green-200"
                    }`}>
                      <RefreshCw className={`h-5 w-5 shrink-0 mt-0.5 ${
                        urlType === "renewal" ? "text-amber-600" : urlType === "loss" ? "text-orange-600" : "text-green-600"
                      }`} />
                      <p className={`text-sm font-semibold ${
                        urlType === "renewal" ? "text-amber-900" : urlType === "loss" ? "text-orange-900" : "text-green-900"
                      }`}>
                        {urlType === "renewal"
                          ? t("pwdRenewalAlert")
                          : urlType === "loss"
                          ? "PAGPAPALIT NG NAWALA O NASIRANG PWD ID — Ihanda ang Affidavit of Loss o larawan ng sirang ID."
                          : t("pwdNewAlert")}
                      </p>
                    </div>
                  </div>

                  {/* General Requirements */}
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3">{t("pwdNewRenewalHeading")}</h3>
                    <ul className="space-y-1.5 mb-6">
                      {generalPwdRequirements.map((req, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-blue-600">•</span>
                          <div>
                            <span className="font-semibold">{req.title}</span>
                            {req.desc && <p className="text-muted-foreground text-xs">{req.desc}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Apparent Disability Requirements */}
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3">{t("apparentDisabilityHeading")}</h3>
                    <ul className="space-y-1.5 mb-6">
                      {apparentDisabilityRequirements.map((req, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-blue-600">•</span>
                          <div>
                            <span className="font-semibold">{req.title}</span>
                            <p className="text-muted-foreground text-xs">{req.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Non-Apparent Disability Requirements */}
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3">{t("nonApparentDisabilityHeading")}</h3>
                    <p className="text-xs text-muted-foreground mb-3 italic">
                      {t("nonApparentSubtitle")}
                    </p>
                    <ul className="space-y-1.5">
                      {nonApparentDisabilityRequirements.map((req, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-blue-600">•</span>
                          <div>
                            <span className="font-semibold">{req.title}</span>
                            <p className="text-muted-foreground text-xs">{req.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground italic">
                    {t("pwdBringDocumentsVerificationNote")}
                  </p>
                </>
              )}

              {/* SENIOR CITIZEN ID SECTION */}
              {isSeniorId && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      {t("seniorDualCitizenshipNote")}
                    </p>
                  </div>

                  <div className={`rounded-xl p-4 flex items-start gap-3 border ${
                    urlType === "loss"
                      ? "bg-orange-50 border-orange-200"
                      : urlType === "renewal"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-green-50 border-green-200"
                  }`}>
                    <RefreshCw className={`h-5 w-5 shrink-0 mt-0.5 ${
                      urlType === "loss"
                        ? "text-orange-600"
                        : urlType === "renewal"
                        ? "text-amber-600"
                        : "text-green-600"
                    }`} />
                    <p className={`text-sm font-semibold ${
                      urlType === "loss"
                        ? "text-orange-900"
                        : urlType === "renewal"
                        ? "text-amber-900"
                        : "text-green-900"
                    }`}>
                      {urlType === "loss"
                        ? t("seniorLossAlert") || "Paalala: Para sa pagpapalit ng nawala o nasirang Senior Citizen ID. Ihanda ang Notarized Affidavit of Loss at valid ID."
                        : urlType === "renewal"
                        ? t("seniorRenewalReminder") || "Paalala: Para sa pag-renew ng expired o nag-eexpire na Senior Citizen / OSCA ID."
                        : t("seniorNewAlert")}
                    </p>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-3">{t("seniorRequirementsHeading")}</h3>
                    <ul className="space-y-2.5">
                      {(urlType === "loss"
                        ? seniorLossRequirements
                        : urlType === "renewal"
                        ? seniorRenewalRequirements
                        : seniorCitizenRequirements
                      ).map((req, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-blue-600">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground italic">
                    {t("seniorSocialWorkerVisitNote")}
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer with Checkbox and Button */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5 flex-1">
                <input
                  type="checkbox"
                  id="understand"
                  className="mt-0.5 cursor-pointer accent-blue-600 h-4 w-4"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                />
                <label htmlFor="understand" className="text-xs md:text-sm text-foreground cursor-pointer select-none">
                  {t("requirementsAcceptCheckbox")}
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnderstood(true)
                  setShowModal(false)
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all shrink-0 cursor-pointer shadow-sm"
              >
                {t("continueApplicationBtn") || "Ipagpatuloy ang Aplikasyon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}