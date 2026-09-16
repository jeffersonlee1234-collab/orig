import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { useLanguage } from "../ui/language-context"
import { LivelihoodRequirementsModal } from "./livelihood-requirements-data"
import LivelihoodApplicationWizard from "./livelihood-wizard"
import LivelihoodStatusCard, { type LivelihoodApplicationRecord } from "./livelihood-status-card"
import LivelihoodAssistanceView from "./livelihood-assistance-view"
import LivelihoodMonitoringView from "./livelihood-monitoring-view"
import TrainingProgramView from "./training-program-view"
import { API_BASE } from "../../config/api"
import { getLoggedInUserQcid, getCurrentUserProfile } from "../../utils/userProfile"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import {
  FileText,
  Package,
  Activity,
  Lock,
} from "lucide-react"

type LivelihoodProgramTab = "apply" | "assistance" | "monitoring"

// Default mock approved application so the user can immediately test parts 2 and 3 if desired
const DEFAULT_LIVELIHOOD_APP: LivelihoodApplicationRecord = {
  id: 3,
  reference_number: "LP-2026-2518",
  user_id: "110000116932100",
  application_status: "approved",
  qcid: "110000116932100",
  first_name: "CLARISA MAE",
  middle_name: "GALIAS",
  last_name: "DIMAL",
  suffix: "",
  nationality: "FILIPINO",
  date_of_birth: "10/29/2004",
  age: 21,
  gender: "Female",
  civilStatus: "Single",
  bloodType: "O+",
  house_building_no: "11",
  street_name: "SAMPALOC STREET",
  barangay: "Sauyo",
  phone_number: "0917 234 5678",
  email: "clarisa.dimal@example.com",
  livelihood_type: "Sari-sari Store",
  livelihood_status: "New Livelihood",
  business_description: "Establishing a neighborhood retail store to support the family and provide daily essential goods in Brgy. Sauyo.",
  business_location: "11 Sampaloc Street, Brgy. Sauyo, Quezon City",
  same_as_registered_address: true,
  assistance_needed: ["Financial / Capital Assistance", "Materials / Supplies", "Equipment"],
  estimated_amount: 15000,
  reason_purpose: "Capital assistance for grocery inventory and basic store equipment (digital scale and display rack).",
  uploaded_documents: [
    { id: "id-1", label: "Valid ID / QCID", type: "validId", original_filename: "QCID_Clarisa_Dimal.png" },
    { id: "id-2", label: "Proof of Residency", type: "proofOfResidency", original_filename: "Brgy_Sauyo_Residency.pdf" },
  ],
  approved_by: "SSDD Livelihood Committee",
  approved_date: "2026-08-16T10:00:00Z",
  created_at: "2026-08-15T09:41:00Z",
  assistance: {
    reference_number: "LP-2026-2518",
    assistance_status: "for_processing",
    release_status: "NOT RELEASED",
    approved_financial_amount: 15000,
    approved_materials: [
      { item: "Rice Sacks (50kg)", quantity: "2 sacks", remarks: "Sinandomeng premium grain" },
      { item: "Canned Goods Assortment", quantity: "3 boxes", remarks: "Assorted canned goods starter pack" },
    ],
    approved_equipment: [
      { equipment: "Heavy-duty Display Shelving Rack", quantity: "1 unit", remarks: "4-tier powder-coated steel" },
      { equipment: "Digital Weighing Scale", quantity: "1 unit", remarks: "30kg capacity rechargeable" },
    ],
    release_date: "",
    release_time: "",
    release_location: "Gov Service Center - SSDD Livelihood Center",
    instructions: "Please bring a valid ID and your claim voucher.",
  },
  monitoring: [],
}


export default function ApplyLivelihood() {
  const [searchParams, setSearchParams] = useSearchParams()

  const categoryParam = searchParams.get("category")?.toLowerCase() || "livelihood"
  const isTraining = categoryParam === "training"

  // Active Tab: 1. Apply, 2. Capital/Materials Assistance, 3. Monitoring
  const tabParam = (searchParams.get("tab") as LivelihoodProgramTab) || "apply"
  const [activeTab, setActiveTab] = useState<LivelihoodProgramTab>(tabParam)
  const { language } = useLanguage()
  const langKey = (language === "tl" || language === "bis" ? language : "en")

  const texts = {
    en: {
      catLivelihood: "Livelihood Assistance",
      catTraining: "Training Program",
      reqTitle: "Requirements for Gov Service Livelihood Program",
      reqBadge: "Livelihood Assistance",
      reqSub: "Official government service for Livelihood and Enterprise Assistance of Gov Service.",
      viewReq: "View Requirements",
      tab1: "1. APPLY FOR LIVELIHOOD",
      tab2: "2. CAPITAL / MATERIALS",
      tab3: "3. LIVELIHOOD MONITORING",
      locked: "(LOCKED)",
      lockStage2: "Stage 2 is Locked: This will only become active once your Livelihood Application is officially approved by SSDD Admin.",
      lockStage3: "Stage 3 is Locked: This will only become active once your Capital / Materials Assistance has been officially released.",
      activeAppRecord: "Active Application Record",
      applyNew: "Apply for New Livelihood",
      noAppTitle: "No Livelihood Application Yet",
      noAppSub: "Get started by reading the guidelines and documentary requirements before submitting an application.",
      applyBtn: "APPLY FOR LIVELIHOOD",
      combinedBtn: "View Requirements & Re-Apply",
      reApplySub: "Need to check requirements or re-apply for another livelihood grant?",
    },
    tl: {
      catLivelihood: "Tulong sa Kabuhayan",
      catTraining: "Programa sa Pagsasanay",
      reqTitle: "Mga Kinakailangan sa Gov Service Livelihood Program",
      reqBadge: "Tulong sa Kabuhayan",
      reqSub: "Opisyal na serbisyo para sa Pangkabuhayan at Negosyo Assistance ng Gov Service.",
      viewReq: "Tingnan ang Requirements",
      tab1: "1. MAG-APPLY SA LIVELIHOOD",
      tab2: "2. KAPITAL / KAGAMITAN",
      tab3: "3. PAGSUSUBAYBAY SA KABUHAYAN",
      locked: "(NAKA-LOCK)",
      lockStage2: "Naka-lock ang Stage 2: Magiging aktibo lamang ito kapag opisyal nang naaprubahan ng SSDD Admin ang iyong Livelihood Application.",
      lockStage3: "Naka-lock ang Stage 3: Magiging aktibo lamang ito kapag opisyal nang nai-release ang iyong Capital / Materials Assistance.",
      activeAppRecord: "Aktibong Talaan ng Aplikasyon",
      applyNew: "Mag-apply ng Bagong Livelihood",
      noAppTitle: "Wala pang Livelihood Application",
      noAppSub: "Magsimula sa pamamagitan ng pagbasa sa mga panuntunan at documentary requirements bago magsumite ng application.",
      applyBtn: "MAG-APPLY SA LIVELIHOOD",
      combinedBtn: "Tingnan ang Requirements & Mag-apply Muli",
      reApplySub: "Gusto mo bang suriin ang requirements o mag-apply muli para sa bagong negosyo?",
    },
    bis: {
      catLivelihood: "Tabang sa Panginabuhi",
      catTraining: "Programa sa Pagbansay",
      reqTitle: "Mga Kinahanglanon sa Gov Service Livelihood Program",
      reqBadge: "Tabang sa Panginabuhi",
      reqSub: "Opisyal nga serbisyo alang sa Panginabuhi ug Negosyo sa Gov Service.",
      viewReq: "Tan-awa ang mga Kinahanglanon",
      tab1: "1. MAG-APPLY SA PANGINABUHI",
      tab2: "2. KAPITAL / KAGAMITAN",
      tab3: "3. PAGBANTAY SA PANGINABUHI",
      locked: "(NAKA-LOCK)",
      lockStage2: "Naka-lock ang Stage 2: Mahimong aktibo lamang kini kon opisyal nang maaprobahan sa SSDD Admin ang imong Livelihood Application.",
      lockStage3: "Naka-lock ang Stage 3: Mahimong aktibo lamang kini kon opisyal nang napagawas ang imong Capital / Materials Assistance.",
      activeAppRecord: "Aktibong Rekord sa Aplikasyon",
      applyNew: "Mag-apply og Bag-ong Panginabuhi",
      noAppTitle: "Wala pay Livelihood Application",
      noAppSub: "Pagsugod pinaagi sa pagbasa sa mga lagda ug documentary requirements sa dili pa mosumite og aplikasyon.",
      applyBtn: "MAG-APPLY SA PANGINABUHI",
      combinedBtn: "Tan-awa ang Requirements & Mag-apply Pag-usab",
      reApplySub: "Gusto ba nimo tan-awon ang requirements o mag-apply pag-usab alang sa bag-ong negosyo?",
    },
  }[langKey]

  // Requirements Modal visibility & acceptance
  const [showRequirements, setShowRequirements] = useState(false)
  const [requirementsAccepted, setRequirementsAccepted] = useState(false)

  // Current Application Record
  const [activeApplication, setActiveApplication] = useState<LivelihoodApplicationRecord | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isUpdatingRevision, setIsUpdatingRevision] = useState(false)

  // Fetch applications from server with real-time polling
  useEffect(() => {
    if (isTraining) return

    const fetchApp = async () => {
      try {
        const userQcid = getLoggedInUserQcid()
        const userProf = getCurrentUserProfile()
        const storedRef = localStorage.getItem("active_livelihood_ref") || ""

        // 1. Fetch applications from backend
        let allApps: any[] = []
        let backendSuccess = false
        try {
          const res = await fetch(`${API_BASE}/api/livelihood/applications`)
          if (res.ok) {
            const data = await res.json()
            if (data.success && Array.isArray(data.applications)) {
              allApps = data.applications
              backendSuccess = true
              localStorage.setItem("livelihood_applications", JSON.stringify(data.applications))
            }
          }
        } catch (_) {}

        // Fallback fetch with qcid parameter if general list was empty
        if (allApps.length === 0 && userQcid && !backendSuccess) {
          try {
            const res2 = await fetch(`${API_BASE}/api/livelihood/applications?qcid=${userQcid}`)
            if (res2.ok) {
              const data2 = await res2.json()
              if (data2.success && Array.isArray(data2.applications)) {
                allApps = data2.applications
                backendSuccess = true
              }
            }
          } catch (_) {}
        }

        // Only merge locally cached applications if backend is completely unreachable
        if (!backendSuccess) {
          const localApps = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
          if (Array.isArray(localApps) && localApps.length > 0) {
            for (const la of localApps) {
              const exists = allApps.some(
                (a) =>
                  (a.id && la.id && a.id === la.id) ||
                  (a.reference_number && la.reference_number && a.reference_number === la.reference_number)
              )
              if (!exists) {
                allApps.push(la)
              }
            }
          }
        }

        if (allApps.length > 0) {
          const match =
            allApps.find((a: any) => storedRef && (a.reference_number === storedRef || a.qcid === storedRef)) ||
            allApps.find((a: any) => userQcid && (a.qcid === userQcid || a.user_id === userQcid)) ||
            allApps.find((a: any) => userProf?.email && a.email && String(a.email).toLowerCase().trim() === String(userProf.email).toLowerCase().trim()) ||
            allApps.find((a: any) => {
              const uName = `${userProf?.firstName || ""} ${userProf?.lastName || ""}`.toLowerCase().trim()
              const aName = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase().trim()
              return uName && aName && (aName.includes(uName) || uName.includes(aName))
            })

          if (match) {
            setActiveApplication(match)
            return
          }
        }

        // If no match found and backend succeeded (application deleted or not found)
        if (backendSuccess) {
          localStorage.removeItem("active_livelihood_ref")
        }
        setActiveApplication(null)
      } catch (_) {}
    }

    fetchApp()

    // Poll every 8 seconds so status automatically syncs across all devices
    const interval = setInterval(fetchApp, 8000)

    const unsubscribe = subscribeToRealtimeChanges(() => {
      fetchApp()
    })

    const handleSync = () => fetchApp()
    window.addEventListener("storage", handleSync)
    window.addEventListener("livelihood_status_updated", handleSync)

    return () => {
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("storage", handleSync)
      window.removeEventListener("livelihood_status_updated", handleSync)
    }
  }, [isTraining])

  // Sync tab with URL
  const handleTabChange = (tab: LivelihoodProgramTab) => {
    setActiveTab(tab)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("tab", tab)
      return next
    })
  }

  // Handle successful application submit
  const handleSuccessSubmit = (app: LivelihoodApplicationRecord) => {
    setActiveApplication(app)
    setIsWizardOpen(false)
    setIsUpdatingRevision(false)
    setActiveTab("apply")
  }

  // Handle user starting new application
  const handleStartNewApplication = () => {
    setShowRequirements(true)
    setRequirementsAccepted(false)
  }

  // Handle user accepting requirements and continuing to wizard
  const handleProceedToWizard = () => {
    setShowRequirements(false)
    setIsUpdatingRevision(false)
    setIsWizardOpen(true)
    setActiveTab("apply")
  }

  // Handle "Revise Application" from Needs Revision
  const handleUpdateApplication = (app: LivelihoodApplicationRecord) => {
    setActiveApplication(app)
    setIsUpdatingRevision(true)
    setIsWizardOpen(true)
    setActiveTab("apply")
  }

  // Lock states according to workflow specifications
  const isApproved = activeApplication?.application_status === "approved"
  const assistData = activeApplication?.assistance
  const rawAssistStatus = (assistData?.assistance_status || "").toLowerCase().trim()
  const rawReleaseStatus = (assistData?.release_status || "").toLowerCase().trim()
  const hasMonitoringLogs = Array.isArray(activeApplication?.monitoring) && activeApplication.monitoring.length > 0
  const isAssistanceReleased =
    rawAssistStatus === "released" ||
    rawReleaseStatus === "released" ||
    hasMonitoringLogs

  const [tabLockedKey, setTabLockedKey] = useState<"stage2" | "stage3" | null>(null)

  // Top 3-Part Program Navigation Bar
  const handleSelectTab = (tab: LivelihoodProgramTab) => {
    setTabLockedKey(null)
    if (tab === "assistance" && !isApproved) {
      setTabLockedKey("stage2")
      return
    }
    if (tab === "monitoring" && !isAssistanceReleased) {
      setTabLockedKey("stage3")
      return
    }
    setIsWizardOpen(false)
    handleTabChange(tab)
  }

  // Auto-switch to active stage when application data arrives or status transitions
  const hasInitializedTabRef = useRef(false)
  const prevStatusKeyRef = useRef<string>("")

  useEffect(() => {
    if (!activeApplication) return

    const currentStatusKey = `${activeApplication.application_status}_${assistData?.assistance_status || ""}_${assistData?.release_status || ""}_${isAssistanceReleased}`
    const isStatusChanged = prevStatusKeyRef.current !== "" && prevStatusKeyRef.current !== currentStatusKey

    // Initial auto-routing when app loads, or when status updates
    if (!hasInitializedTabRef.current || isStatusChanged) {
      prevStatusKeyRef.current = currentStatusKey
      hasInitializedTabRef.current = true

      if (isAssistanceReleased) {
        handleTabChange("monitoring")
      } else if (isApproved) {
        handleTabChange("assistance")
      } else {
        handleTabChange("apply")
      }
    }
  }, [activeApplication, isApproved, isAssistanceReleased, assistData])

  // If currently on a locked tab, fallback to available tab
  useEffect(() => {
    if (activeTab === "assistance" && !isApproved) {
      handleTabChange("apply")
    } else if (activeTab === "monitoring" && !isAssistanceReleased) {
      handleTabChange(isApproved ? "assistance" : "apply")
    }
  }, [activeTab, isApproved, isAssistanceReleased])

  return (
    <div className="min-h-[calc(100vh-4rem)] py-4 max-w-5xl mx-auto px-4 space-y-6">
      {isTraining ? (
        <TrainingProgramView />
      ) : (
        <>
          {/* Tab Locked Alert Notice */}
          {tabLockedKey && (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="font-semibold">
                  {tabLockedKey === "stage2" ? texts.lockStage2 : texts.lockStage3}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTabLockedKey(null)}
                className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

      {/* Top Requirements & Re-Apply Banner */}
      <div className="mb-4 animate-in fade-in duration-150">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm md:text-base font-bold text-foreground">
                  {texts.reqTitle}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  {texts.reqBadge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                {texts.reqSub} {texts.reApplySub}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={handleStartNewApplication}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>{texts.combinedBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 3-Part Program Navigation Bar */}
      <div className="bg-card border border-border rounded-2xl p-2 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {/* Tab 1 */}
          <button
            onClick={() => handleSelectTab("apply")}
            id="tab-apply-livelihood"
            className={`px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "apply"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{texts.tab1}</span>
          </button>

          {/* Tab 2: Capital / Materials Assistance */}
          <button
            type="button"
            onClick={() => handleSelectTab("assistance")}
            id="tab-capital-assistance"
            disabled={!isApproved}
            className={`px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 select-none ${
              !isApproved
                ? "opacity-50 bg-muted/40 text-muted-foreground cursor-not-allowed border border-dashed border-border"
                : activeTab === "assistance"
                ? "bg-indigo-600 text-white shadow-sm cursor-pointer"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer"
            }`}
          >
            {!isApproved ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Package className="h-4 w-4" />}
            <span>{texts.tab2} {!isApproved && texts.locked}</span>
          </button>

          {/* Tab 3: Livelihood Monitoring */}
          <button
            type="button"
            onClick={() => handleSelectTab("monitoring")}
            id="tab-livelihood-monitoring"
            disabled={!isAssistanceReleased}
            className={`px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 select-none ${
              !isAssistanceReleased
                ? "opacity-50 bg-muted/40 text-muted-foreground cursor-not-allowed border border-dashed border-border pointer-events-none"
                : activeTab === "monitoring"
                ? "bg-emerald-600 text-white shadow-sm cursor-pointer"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer"
            }`}
          >
            {!isAssistanceReleased ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Activity className="h-4 w-4" />}
            <span>{texts.tab3} {!isAssistanceReleased && texts.locked}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. APPLY FOR LIVELIHOOD CONTENT                              */}
      {/* ============================================================ */}
      {activeTab === "apply" && (
        <div>
          {isWizardOpen ? (
            <LivelihoodApplicationWizard
              initialData={
                isUpdatingRevision && activeApplication
                  ? {
                      qcid: activeApplication.qcid,
                      firstName: activeApplication.first_name,
                      middleName: activeApplication.middle_name || "",
                      lastName: activeApplication.last_name,
                      suffix: activeApplication.suffix || "",
                      nationality: activeApplication.nationality || "Filipino",
                      dateOfBirth: activeApplication.date_of_birth || "",
                      age: String(activeApplication.age || ""),
                      gender: activeApplication.gender || "Female",
                      civilStatus: activeApplication.civilStatus || "Single",
                      bloodType: activeApplication.bloodType || "O+",
                      houseBuildingNo: activeApplication.house_building_no || "",
                      streetName: activeApplication.street_name || "",
                      barangay: activeApplication.barangay || "",
                      phoneNumber: activeApplication.phone_number || "",
                      email: activeApplication.email || "",
                      livelihoodType: activeApplication.livelihood_type || "",
                      livelihoodStatus: (activeApplication.livelihood_status as any) || "",
                      businessDescription: activeApplication.business_description || "",
                      businessLocation: activeApplication.business_location || "",
                      sameAsRegisteredAddress: activeApplication.same_as_registered_address || false,
                      assistanceNeeded: activeApplication.assistance_needed || [],
                      estimatedAmount: String(activeApplication.estimated_amount || ""),
                      reasonPurpose: activeApplication.reason_purpose || "",
                    }
                  : undefined
              }
              isUpdatingRevision={isUpdatingRevision}
              onSuccessSubmit={handleSuccessSubmit}
              onCancel={() => setIsWizardOpen(false)}
            />
          ) : activeApplication ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">
                  {texts.activeAppRecord}
                </span>
              </div>

              <LivelihoodStatusCard
                application={activeApplication}
                onUpdateApplication={handleUpdateApplication}
                onProceedToAssistance={() => handleTabChange("assistance")}
              />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto opacity-60" />
              <div>
                <h2 className="text-lg font-bold text-foreground">{texts.noAppTitle}</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {texts.noAppSub}
                </p>
              </div>
              <button
                onClick={handleStartNewApplication}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm cursor-pointer"
              >
                {texts.applyBtn}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. CAPITAL / MATERIALS ASSISTANCE CONTENT                     */}
      {/* ============================================================ */}
      {activeTab === "assistance" && (
        <div>
          <LivelihoodAssistanceView
            application={activeApplication || DEFAULT_LIVELIHOOD_APP}
            onProceedToMonitoring={() => handleTabChange("monitoring")}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. LIVELIHOOD MONITORING CONTENT                             */}
      {/* ============================================================ */}
      {activeTab === "monitoring" && (
        <div>
          <LivelihoodMonitoringView
            application={activeApplication || DEFAULT_LIVELIHOOD_APP}
            onBackToAssistance={() => handleTabChange("assistance")}
          />
        </div>
      )}

      {/* Requirements Dialog Modal */}
      {showRequirements && (
        <LivelihoodRequirementsModal
          accepted={requirementsAccepted}
          onAcceptedChange={setRequirementsAccepted}
          onContinue={handleProceedToWizard}
          onClose={() => setShowRequirements(false)}
        />
      )}
        </>
      )}
    </div>
  )
}