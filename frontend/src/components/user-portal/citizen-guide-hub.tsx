import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ShieldAlert,
  Users,
  Baby,
  HeartHandshake,
  GraduationCap,
  Wallet,
  FileText,
  HelpCircle,
  Search,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Building2,
  CreditCard,
  PhoneCall,
  Stethoscope,
  Heart,
  Package,
  Utensils,
  Bus,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import { cachedApiFetch } from "../../utils/cachedApiFetch"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import AIAssistanceFinderModal from "./ai-assistance-finder-modal"

function WheelchairIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="11" cy="5" r="2" />
      <path d="M11 7v8h4l4 5" />
      <path d="M11 11h5" />
      <path d="M7 11.5a5 5 0 1 0 6 7.5" />
      <path d="m14 19 3 3" />
    </svg>
  )
}

export default function CitizenGuideHub() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [recentApps, setRecentApps] = useState<any[]>([])
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  const profile = getCurrentUserProfile()
  const qcid = getLoggedInUserQcid() || profile?.qcidNo || profile?.qcidNumber || ""
  const userId = profile?.id || localStorage.getItem("userId") || "1"
  const userName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}` : "Resident"

  // Fetch active / recent applications for user context bar with live real-time sync & delete protection
  useEffect(() => {
    let isMounted = true

    const fetchUserStatus = async () => {
      try {
        const found: any[] = []
        const currentQcid = (qcid || "").toLowerCase().trim()
        const userEmail = (profile?.email || "").toLowerCase().trim()
        const userLastName = (profile?.lastName || "").toLowerCase().trim()
        const userFirstName = (profile?.firstName || "").toLowerCase().trim()

        // 0. Build set of deleted / archived application references
        const deletedSet = new Set<string>()
        try {
          const localDel = JSON.parse(localStorage.getItem("deleted_user_applications") || "[]")
          if (Array.isArray(localDel)) {
            localDel.forEach((d: any) => {
              if (d.applicationNo) deletedSet.add(String(d.applicationNo).toLowerCase().trim())
              if (d.referenceNo) deletedSet.add(String(d.referenceNo).toLowerCase().trim())
              if (d.id) deletedSet.add(String(d.id).toLowerCase().trim())
            })
          }
        } catch {}

        const token = sessionStorage.getItem("token") || localStorage.getItem("token") || ""
        const sessionToken = sessionStorage.getItem("sessionToken") || localStorage.getItem("sessionToken") || ""
        const authHeaders: Record<string, string> = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(sessionToken ? { "x-session-token": sessionToken } : {}),
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        }

        try {
          const delData = await cachedApiFetch(
            `${API_BASE}/api/user-applications/deleted?email=${encodeURIComponent(userEmail)}&qcid=${encodeURIComponent(
              qcid
            )}&name=${encodeURIComponent(userFirstName + " " + userLastName)}`,
            { headers: authHeaders },
            4000
          ).catch(() => null)
          if (delData && delData.applications && Array.isArray(delData.applications)) {
            delData.applications.forEach((d: any) => {
              if (d.referenceNo) deletedSet.add(String(d.referenceNo).toLowerCase().trim())
              if (d.applicationId) deletedSet.add(String(d.applicationId).toLowerCase().trim())
              if (d.id) deletedSet.add(String(d.id).toLowerCase().trim())
            })
          }
        } catch {}

        const isUserMatch = (a: any) => {
          if (!a) return false
          if (a.is_archived === true) return false
          const aRef = String(a.reference_no || a.referenceNumber || a.reference_number || a.qc_id || a.qcid || a.applicationNo || a.assignedIdNumber || a.assigned_id_number || a.solo_parent_id_number || a.id || "").toLowerCase().trim()
          const aEmail = String(a.email || a.guardian_email || a.guardianEmail || a.applicantInfo?.email || a.applicant_info?.email || "").toLowerCase().trim()
          const aFirst = String(a.firstName || a.first_name || a.guardian_first_name || a.applicantInfo?.firstName || "").toLowerCase().trim()
          const aLast = String(a.lastName || a.last_name || a.guardian_last_name || a.applicantInfo?.lastName || "").toLowerCase().trim()
          const aName = String(a.full_name || a.applicantName || a.child_name || a.applicantInfo?.fullName || `${aFirst} ${aLast}`).toLowerCase().trim()

          // Check if deleted
          if (deletedSet.has(aRef) || (a.id && deletedSet.has(String(a.id).toLowerCase().trim()))) {
            return false
          }

          if (userEmail && aEmail && userEmail === aEmail) return true
          if (currentQcid && aRef && currentQcid.length >= 10 && aRef === currentQcid) return true

          if (userFirstName && userLastName && aFirst && aLast) {
            if (userFirstName === aFirst && userLastName === aLast) return true
          }
          if (userFirstName && userLastName && aName) {
            const combined = `${userFirstName} ${userLastName}`.trim()
            if (aName === combined || (aName.startsWith(userFirstName + " ") && aName.endsWith(" " + userLastName))) return true
          }

          return false
        }

        // 1. AICS Apps
        try {
          const data = await cachedApiFetch(`${API_BASE}/api/aics/applications?qcId=${encodeURIComponent(qcid)}`, { headers: authHeaders }, 4000).catch(() => null)
          if (data) {
            const list = Array.isArray(data) ? data : data.applications || []
            const matched = list.filter(isUserMatch).map((a: any) => {
              const rawType = (a.assistance_type || a.assistanceType || a.type || "AICS").replace(/\s*assistance/gi, "").trim()
              const cleanType = rawType.charAt(0).toUpperCase() + rawType.slice(1) + " Assistance"
              const refNum = a.qc_id || a.reference_no || a.reference_number || a.referenceNumber || a.id
              return {
                id: a.id || refNum,
                program: cleanType,
                category: "AICS",
                status: a.status || "pending",
                date: a.created_at || a.dateSubmitted || new Date().toISOString(),
                ref: refNum
              }
            })
            found.push(...matched)
          }
        } catch {}

        // 2. PWD / Senior Apps
        try {
          const list2 = await cachedApiFetch(`${API_BASE}/api/pwd-senior/applications`, { headers: authHeaders }, 4000).catch(() => null)
          if (Array.isArray(list2)) {
            const matched2 = list2.filter(isUserMatch).map((a: any) => {
              const refNum = a.assignedIdNumber || a.referenceNumber || a.reference_no || a.id
              return {
                id: a.id || refNum,
                program: `${a.category || "Social Service"} - ${a.type ? String(a.type).toUpperCase() : "Application"}`,
                category: a.category || "PWD / Senior",
                status: a.status || "pending",
                date: a.created_at || a.dateSubmitted || new Date().toISOString(),
                ref: refNum
              }
            })
            found.push(...matched2)
          }
        } catch {}

        // 3. Solo Parent Apps
        try {
          const data3 = await cachedApiFetch(`${API_BASE}/api/solo-parent/user/${userId}?qcid=${encodeURIComponent(qcid)}&email=${encodeURIComponent(userEmail)}`, { headers: authHeaders }, 4000).catch(() => null)
          if (data3) {
            const list3 = data3.applications || (Array.isArray(data3) ? data3 : [])
            const matched3 = list3.filter(isUserMatch).map((a: any) => {
              const refNum = a.assigned_id_number || a.solo_parent_id_number || a.reference_number || a.referenceNumber || a.id
              return {
                id: a.id || refNum,
                program: "Solo Parent ID",
                category: "Solo Parent",
                status: a.application_status || a.status || "pending",
                date: a.created_at || a.submitted_at || new Date().toISOString(),
                ref: refNum
              }
            })
            found.push(...matched3)
          }
        } catch {}

        // 4. Child Welfare Apps
        try {
          const data4 = await cachedApiFetch(`${API_BASE}/api/child-welfare/user/${userId}?qcid=${encodeURIComponent(qcid)}&email=${encodeURIComponent(userEmail)}`, { headers: authHeaders }, 4000).catch(() => null)
          if (data4) {
            const list4 = data4.applications || (Array.isArray(data4) ? data4 : [])
            const matched4 = list4.filter(isUserMatch).map((a: any) => {
              const refNum = a.reference_number || a.referenceNumber || a.id
              return {
                id: a.id || refNum,
                program: a.category_title || a.classification_title || "Child Welfare Assistance",
                category: "Child Welfare",
                status: a.application_status || a.status || "pending",
                date: a.created_at || new Date().toISOString(),
                ref: refNum
              }
            })
            found.push(...matched4)
          }
        } catch {}

        // 5. Livelihood Apps
        try {
          const data5 = await cachedApiFetch(`${API_BASE}/api/livelihood/applications`, { headers: authHeaders }, 4000).catch(() => null)
          if (data5) {
            const list5 = data5.applications || (Array.isArray(data5) ? data5 : [])
            const matched5 = list5.filter(isUserMatch).map((a: any) => {
              const refNum = a.reference_number || a.referenceNumber || a.qcid || a.id
              return {
                id: a.id || refNum,
                program: a.proposed_business_name ? `Livelihood: ${a.proposed_business_name}` : a.livelihood_type || "Livelihood Assistance",
                category: "Livelihood",
                status: a.application_status || a.status || "pending",
                date: a.created_at || new Date().toISOString(),
                ref: refNum
              }
            })
            found.push(...matched5)
          }
        } catch {}

        // 6. Training Apps
        try {
          const data6 = await cachedApiFetch(`${API_BASE}/api/training/applications`, { headers: authHeaders }, 4000).catch(() => null)
          if (data6) {
            const list6 = Array.isArray(data6) ? data6 : data6.applications || []
            const matched6 = list6.filter(isUserMatch).map((a: any) => {
              const refNum = a.reference_number || a.referenceNumber || a.qcid || a.id
              return {
                id: a.id || refNum,
                program: a.training_name || "Skills Training Program",
                category: "Training",
                status: a.status || "pending",
                date: a.created_at || new Date().toISOString(),
                ref: refNum
              }
            })
            found.push(...matched6)
          }
        } catch {}

        // 7. Clean up stale localStorage caches for deleted items
        const localKeys = ["pwd_senior_applications", "aics_applications", "all_user_applications", "applications", "livelihood_applications", "training_applications", "child_welfare_applications", "solo_parent_applications"]
        for (const k of localKeys) {
          try {
            const local = JSON.parse(localStorage.getItem(k) || "[]")
            if (Array.isArray(local)) {
              const cleaned = local.filter((item: any) => {
                const itemRef = String(item.referenceNumber || item.reference_no || item.applicationNo || item.id || "").toLowerCase().trim()
                return !deletedSet.has(itemRef)
              })
              if (cleaned.length !== local.length) {
                localStorage.setItem(k, JSON.stringify(cleaned))
              }
            }
          } catch {}
        }

        // Deduplicate found items by ref
        const uniqueFound: any[] = []
        const seenRefs = new Set<string>()
        for (const item of found) {
          const r = String(item.ref || item.id || "").toLowerCase().trim()
          if (!seenRefs.has(r)) {
            seenRefs.add(r)
            uniqueFound.push(item)
          }
        }

        if (isMounted) {
          setRecentApps(uniqueFound)
        }
      } catch {
        // ignore fetch error
      }
    }

    fetchUserStatus()

    // Real-time synchronization
    const handleUpdate = () => {
      fetchUserStatus()
    }

    const unsubscribe = subscribeToRealtimeChanges(() => {
      fetchUserStatus()
    })

    window.addEventListener("applications_updated", handleUpdate)
    window.addEventListener("solo_parent_applications_updated", handleUpdate)
    window.addEventListener("pwd_senior_applications_updated", handleUpdate)
    window.addEventListener("child_welfare_applications_updated", handleUpdate)
    window.addEventListener("financial_disbursements_updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)

    const interval = setInterval(fetchUserStatus, 3500)

    return () => {
      isMounted = false
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("applications_updated", handleUpdate)
      window.removeEventListener("solo_parent_applications_updated", handleUpdate)
      window.removeEventListener("pwd_senior_applications_updated", handleUpdate)
      window.removeEventListener("child_welfare_applications_updated", handleUpdate)
      window.removeEventListener("financial_disbursements_updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [qcid, profile?.email, profile?.lastName, profile?.firstName, userId])

  const aicsServices = [
    {
      type: "medical",
      title: "Medical Assistance",
      icon: Stethoscope,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      path: "/portal/aics?type=medical",
      desc: "Financial assistance for hospitalization bills, chemotherapy, dialysis, prescribed medications, and laboratory diagnostic procedures.",
      requirements: ["Medical Abstract / Certificate", "Hospital Bill / Statement of Account or Pharmacy Quotation", "Barangay Certificate of Indigency", "Valid QCID / Government ID"]
    },
    {
      type: "funeral",
      title: "Funeral & Burial Assistance",
      icon: Heart,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      path: "/portal/aics?type=funeral",
      desc: "Emergency support for funeral, burial, cremation, and casket expenses for deceased family members.",
      requirements: ["Registered Death Certificate", "Funeral Contract / Statement of Account", "Barangay Certificate of Indigency", "Valid QCID / Gov ID of Claimant"]
    },
    {
      type: "educational",
      title: "Educational Assistance",
      icon: GraduationCap,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      path: "/portal/aics?type=educational",
      desc: "Financial grant for school fees, supplies, learning materials, and student allowance for indigent students.",
      requirements: ["Certificate of Enrollment / Registration", "School ID / Student Assessment Form", "Barangay Indigency", "Parent/Guardian Valid ID"]
    },
    {
      type: "material",
      title: "Material Assistance",
      icon: Package,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      path: "/portal/aics?type=material",
      desc: "Direct provisions of assistive supplies, emergency hygiene packs, and material relief for displaced or distressed citizens.",
      requirements: ["Barangay Certificate of Indigency / Incident Report", "Valid QCID / Government ID", "Social Worker Case Validation"]
    },
    {
      type: "food",
      title: "Food Assistance",
      icon: Utensils,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      path: "/portal/aics?type=food",
      desc: "Emergency nutritional food support and subsistence vouchers for families facing sudden economic crisis.",
      requirements: ["Barangay Certificate of Indigency", "Valid QCID / Government ID", "Proof of Family Dependency"]
    },
    {
      type: "transportation",
      title: "Transportation Assistance",
      icon: Bus,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      path: "/portal/aics?type=transportation",
      desc: "Travel allowance for stranded individuals or residents needing emergency transit/repatriation to their home provinces.",
      requirements: ["Barangay Certificate / Police or Blotter Report if stranded", "Valid QCID / Gov ID", "Proof of Travel Necessity"]
    }
  ]

  const modulesList = [
    {
      id: "aics",
      title: "AICS Crisis Assistance",
      badge: "Financial & Material Aid",
      icon: ShieldAlert,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      desc: "Immediate relief and financial assistance for individuals and families in crisis situations (Medical, Funeral, Educational, Food, Transportation, Material).",
      features: ["Emergency Cash Aid", "Hospital & Med Support", "Direct Payout via Financial Aid", "Same-week Processing"],
      primaryAction: { label: "Explore AICS Services", path: "/portal/aics?type=medical" },
      secondaryAction: { label: "View All 6 Types", path: "#aics-breakdown" }
    },
    {
      id: "pwd",
      title: "Persons with Disability (PWD) Services",
      badge: "PDAO Welfare & Benefits",
      icon: WheelchairIcon,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      desc: "Comprehensive welfare services including New PWD ID registration, 3-year ID renewal, lost ID replacement, and financial social assistance.",
      features: ["20% Discount on Goods & Services", "12% VAT Exemption", "Free Movie Access", "PWD Social Pension"],
      primaryAction: { label: "Apply New PWD ID", path: "/portal/apply-pwd-senior?category=pwd&type=new" },
      secondaryAction: { label: "Renew or Replace ID", path: "/portal/apply-pwd-senior?category=pwd&type=renewal" }
    },
    {
      id: "senior",
      title: "Senior Citizen Services",
      badge: "OSCA Elderly Welfare",
      icon: Users,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      desc: "Programs for citizens aged 60+, including Official Senior ID registration, Medicine Discount Booklets, Free Movie Booklets, and Social Pension.",
      features: ["20% Senior Discount", "Medicine Purchase Booklet", "Free Movie Booklet", "Social Pension Program"],
      primaryAction: { label: "Apply Senior ID", path: "/portal/apply-pwd-senior?category=senior&type=new" },
      secondaryAction: { label: "Get Medicine/Movie Booklet", path: "/portal/apply-pwd-senior?category=senior&type=medicine-booklet" }
    },
    {
      id: "soloParent",
      title: "Solo Parent Services",
      badge: "RA 11861 Benefits",
      icon: Baby,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      desc: "Empowering single parents through Solo Parent ID issuance, 7-day parental leaves, educational grants, and monthly cash subsidies.",
      features: ["Solo Parent ID", "7-Day Additional Leave", "10% Discount on Child Essentials", "Monthly Subsidy for Low-Income"],
      primaryAction: { label: "Apply Solo Parent ID", path: "/portal/apply-solo-parent?category=solo-parent&type=new" },
      secondaryAction: { label: "Renew Solo Parent ID", path: "/portal/apply-solo-parent?category=solo-parent&type=renewal" }
    },
    {
      id: "childWelfare",
      title: "Child Welfare Services",
      badge: "Protection & Nutrition",
      icon: HeartHandshake,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      desc: "Dedicated social protection for minors, nutritional supplemental programs, emergency child welfare, and family psychosocial support.",
      features: ["Nutritional Assistance", "Emergency Child Protection", "Psychosocial Support", "Temporary Foster & Shelter"],
      primaryAction: { label: "Child Welfare Services", path: "/portal/apply-solo-parent?category=child-welfare&program=nutritional-assistance" },
      secondaryAction: { label: "Emergency Protection", path: "/portal/apply-solo-parent?category=child-welfare&program=child-protection" }
    },
    {
      id: "livelihood",
      title: "Livelihood & Skills Training",
      badge: "Socio-Economic Development",
      icon: GraduationCap,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      desc: "Empowering residents with micro-enterprise capital assistance grants, toolkits/equipment support, and technical vocational courses.",
      features: ["Seed Capital Grant", "Livelihood Toolkits", "Vocational Training Courses", "Mentorship & Monitoring"],
      primaryAction: { label: "Apply Livelihood Grant", path: "/portal/apply-livelihood?category=livelihood" },
      secondaryAction: { label: "Enroll in Training", path: "/portal/apply-livelihood?category=training" }
    },
    {
      id: "disbursement",
      title: "Financial Aid & Payout Tracker",
      badge: "Disbursement & Payouts",
      icon: Wallet,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      desc: "Check and track your approved financial aid payouts, payout schedule appointments, official QR claim vouchers, and cash distribution.",
      features: ["Real-time Payout Status", "Official Claim QR Code", "Scheduled Venue & Time", "Direct Cash / Bank Release"],
      primaryAction: { label: "Open Payout Tracker", path: "/portal/financial-aid" },
      secondaryAction: { label: "View Application History", path: "/portal/my-applications" }
    }
  ]

  const faqs = [
    {
      q: "What is AICS and who is eligible to apply?",
      a: "AICS (Assistance to Individuals in Crisis Situations) is an emergency social welfare program by Gov Service providing financial and material assistance to residents facing unexpected crisis such as hospitalization, death of a family member, sudden loss of income, or natural calamities. Any bona fide Gov Service resident with a valid Gov Service ID or Barangay Indigency can apply."
    },
    {
      q: "How do I renew or replace a lost PWD or Senior Citizen ID?",
      a: "You can easily renew or replace your ID online! Navigate to PWD Services or Senior Citizen Services in the portal, select 'Renewal' (if your ID is expiring/expired) or 'Replacement / Lost ID' (if damaged or lost). Enter your 16-digit ID number to auto-verify against city records in real-time and upload an Affidavit of Loss."
    },
    {
      q: "How long does it take for an application to be approved?",
      a: "Emergency AICS applications (such as Medical and Funeral) are typically reviewed and evaluated by assigned Social Workers within 24 to 72 hours. ID applications (PWD, Senior Citizen, Solo Parent) take 3 to 5 business days for verification and card generation."
    },
    {
      q: "How will I receive my approved financial assistance payout?",
      a: "Once approved, you will receive an update in the 'Financial Aid Disbursement' section showing your scheduled payout appointment, designated venue/payout center, and an official Digital Claim Voucher with a QR code."
    },
    {
      q: "Can I apply for multiple assistance programs?",
      a: "Yes. You can apply for different services (e.g. Senior ID + Medicine Booklet + AICS Medical Assistance) based on your needs, provided you meet the specific qualifications and submit the required documentation for each program."
    }
  ]

  const hasSearch = searchTerm.trim().length > 0

  const filteredAics = aicsServices.filter((s) => {
    if (!hasSearch) return true
    const term = searchTerm.toLowerCase()
    return (
      s.title.toLowerCase().includes(term) ||
      s.desc.toLowerCase().includes(term) ||
      s.requirements.some((r) => r.toLowerCase().includes(term))
    )
  })

  const filteredModules = modulesList.filter((m) => {
    const matchesSearch =
      !hasSearch ||
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.features.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()))
    if (selectedCategory === "all") return matchesSearch
    if (selectedCategory === "aics") return matchesSearch && m.id === "aics"
    if (selectedCategory === "pwd-senior") return matchesSearch && (m.id === "pwd" || m.id === "senior")
    if (selectedCategory === "family") return matchesSearch && (m.id === "soloParent" || m.id === "childWelfare")
    if (selectedCategory === "livelihood") return matchesSearch && (m.id === "livelihood" || m.id === "disbursement")
    return matchesSearch
  })

  const totalResultsCount = (hasSearch ? filteredAics.length : 0) + filteredModules.length

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 shadow-sm">
        {/* Blended Gov Serves Seal Watermark on the right side */}
        <div className="absolute -right-12 sm:-right-6 md:right-0 lg:right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
          <img
            src="/gov-serves-seal.png"
            alt="Gov Serves Seal"
            className="w-60 sm:w-72 md:w-88 lg:w-[420px] aspect-square object-contain opacity-20 md:opacity-25 mix-blend-screen filter drop-shadow-2xl"
          />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-blue-300" />
                Gov Serves Social Services Portal • Help & Service Guide
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                Welcome, {userName}!
              </h1>
              <p className="text-sm sm:text-base text-blue-100/80 max-w-2xl leading-relaxed">
                Learn about available financial aid programs (AICS), special sector benefits (PWD, Senior Citizen, Solo Parent), child welfare, livelihood grants, and document requirements before applying.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate("/portal/my-applications")}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold backdrop-blur-sm border border-white/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <FileText className="h-4 w-4" />
                Track My Applications
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services, requirements, or benefits (e.g. Medical, Senior Booklet, PWD ID, Funeral, Livelihood)..."
              className="w-full pl-12 pr-10 py-3.5 bg-white text-gray-900 placeholder-gray-400 dark:bg-slate-800/90 dark:text-white dark:placeholder-slate-400 rounded-2xl shadow-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 border-0"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
            {[
              { id: "all", label: "All Services" },
              { id: "aics", label: "AICS Crisis Aid (6 Types)" },
              { id: "pwd-senior", label: "PWD & Senior Citizens" },
              { id: "family", label: "Solo Parent & Child Welfare" },
              { id: "livelihood", label: "Livelihood & Payouts" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-white text-blue-900 shadow-sm ring-2 ring-white/50"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}

            {/* ✨ AI Assistance & Eligibility Finder Button */}
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:via-rose-400 hover:to-indigo-500 shadow-md shadow-indigo-900/30 border border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in"
              title="Click to assess eligibility and get personalized assistance recommendations"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-200 animate-spin-slow" />
              <span>✨ AI Assistance &amp; Eligibility Finder</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 space-y-8">
        {/* LIVE SEARCH RESULTS BANNER (SHOWN WHEN USER TYPES) */}
        {hasSearch && (
          <div className="bg-white border-2 border-blue-500 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Search Results for <span className="text-blue-600">"{searchTerm}"</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {totalResultsCount} found
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Reset Search
              </button>
            </div>

            {totalResultsCount === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-bold text-gray-700">No matching social service or requirement found.</p>
                <p className="text-xs text-gray-500">Try searching for keywords like "Medical", "PWD", "Senior", "Solo Parent", "Funeral", or "Livelihood".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matching Modules */}
                {filteredModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-4 rounded-xl border border-gray-200 bg-slate-50 flex flex-col justify-between gap-3 hover:border-blue-400 hover:bg-white transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          {mod.badge}
                        </span>
                        <h3 className="font-bold text-gray-900 text-sm">{mod.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{mod.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(mod.primaryAction.path)}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {mod.primaryAction.label} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Matching AICS Services */}
                {filteredAics.map((svc) => (
                  <div
                    key={svc.type}
                    className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between gap-3 hover:bg-white transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center">
                          <svc.icon className="h-4 w-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          AICS Crisis Aid
                        </span>
                        <h3 className="font-bold text-gray-900 text-sm">{svc.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{svc.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(svc.path)}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Apply for {svc.title} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CATEGORY FILTERED VIEW: APPEARS IN-PLACE AT THE TOP */}
        {!hasSearch && selectedCategory !== "all" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                  Filtered Services
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  {selectedCategory === "pwd-senior"
                    ? "PWD & Senior Citizen Welfare Services"
                    : selectedCategory === "family"
                    ? "Solo Parent & Child Welfare Services"
                    : selectedCategory === "livelihood"
                    ? "Livelihood, Training & Financial Aid Services"
                    : "AICS Crisis Intervention Programs"}
                </h2>
                <p className="text-xs text-gray-500">
                  Showing {filteredModules.length + (selectedCategory === "aics" ? aicsServices.length : 0)} available programs in this category.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                ✕ View All Services
              </button>
            </div>

            {/* If AICS is selected, show the 6 types breakdown */}
            {selectedCategory === "aics" && (
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wide">
                      <ShieldAlert className="h-4 w-4" />
                      Crisis Intervention Program
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900">
                      AICS 6 Assistance Types &amp; Document Checklist
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/portal/aics?type=medical")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Open AICS Application <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {aicsServices.map((svc) => (
                    <div
                      key={svc.type}
                      className="p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/50 border border-gray-200 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all gap-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${svc.iconColor} group-hover:scale-105 transition-transform flex items-center justify-center shrink-0 shadow-2xs`}>
                            <svc.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{svc.title}</h4>
                            <span className="text-[11px] text-blue-600 font-semibold">Crisis Financial Aid</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{svc.desc}</p>
                        
                        <div className="bg-slate-100/80 rounded-xl p-3 space-y-1.5">
                          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                            Key Requirements:
                          </div>
                          <ul className="text-[11px] text-gray-600 space-y-1 list-disc list-inside">
                            {svc.requirements.map((req, rIdx) => (
                              <li key={rIdx} className="leading-tight">{req}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(svc.path)}
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Apply for {svc.title} <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filtered Category Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredModules.map((mod) => (
                <div
                  key={mod.id}
                  className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-gray-300 transition-all gap-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl border ${mod.color}`}>
                          <mod.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">{mod.title}</h3>
                          <span className="text-xs font-semibold text-gray-500">{mod.badge}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {mod.desc}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {mod.features.map((feat, fIdx) => (
                        <div
                          key={fIdx}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-slate-50 py-1.5 px-2.5 rounded-lg border border-slate-100 truncate"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => navigate(mod.primaryAction.path)}
                      className={`w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${mod.btnColor}`}
                    >
                      {mod.primaryAction.label} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    {mod.secondaryAction && (
                      <button
                        type="button"
                        onClick={() => navigate(mod.secondaryAction.path)}
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        {mod.secondaryAction.label}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEFAULT VIEW (WHEN ALL SERVICES IS SELECTED) */}
        {!hasSearch && selectedCategory === "all" && (
          <>
            {/* 2. RECENT APPLICATIONS STATUS BANNER (IF ANY) */}
            {recentApps.length > 0 && (
              <div className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>Your Active & Recent Applications Status</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/portal/my-applications")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    View History <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentApps.slice(0, 3).map((app, idx) => {
                    const isApproved = String(app.status).toLowerCase() === "approved" || String(app.status).toLowerCase() === "completed"
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700/60 flex items-center justify-between text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <div className="font-bold text-gray-800 truncate">{app.program}</div>
                          <div className="text-gray-500 font-mono text-[11px] truncate">Ref: {app.ref}</div>
                        </div>
                        <div>
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Under Review
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 3. HOW IT WORKS (STEP-BY-STEP PROCESS) */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="text-center max-w-2xl mx-auto mb-8 space-y-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  How the Social Services Application Works
                </h2>
                <p className="text-sm text-gray-500">
                  Four simple steps from application filing to official payout and ID releasing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                {[
                  {
                    step: "01",
                    title: "Select Service & Requirements",
                    desc: "Choose the service you need (AICS, PWD, Senior, Solo Parent) and prepare the required digital files (Indigency, Medical Abstract, IDs).",
                    icon: FileCheck,
                    color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400"
                  },
                  {
                    step: "02",
                    title: "Fill Online Form & Upload",
                    desc: "Provide your citizen details, address, and upload legible photos or scanned copies of supporting documents.",
                    icon: FileText,
                    color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400"
                  },
                  {
                    step: "03",
                    title: "Social Worker Assessment",
                    desc: "Assigned City Social Workers review your case, evaluate eligibility, and approve the assistance amount or ID card request.",
                    icon: Building2,
                    color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-400"
                  },
                  {
                    step: "04",
                    title: "Approval & Payout / ID Claim",
                    desc: "Receive real-time notification, QR Claim Voucher for financial payout, or notification to claim your official ID card.",
                    icon: CreditCard,
                    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
                  }
                ].map((st, i) => (
                  <div
                    key={i}
                    className="relative p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-start gap-3 text-left hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-md transition-all group"
                  >
                    <div className="w-full flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl border ${st.color}`}>
                        <st.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xl font-black text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors">
                        {st.step}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{st.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{st.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. AICS 6 SERVICE TYPES BREAKDOWN */}
            <div id="aics-breakdown" className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wide">
                    <ShieldAlert className="h-4 w-4" />
                    Crisis Intervention Program
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                    AICS Assistance Types &amp; Document Checklist
                  </h2>
                  <p className="text-sm text-gray-500">
                    Direct financial and material assistance for indigent individuals in crisis situations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/portal/aics?type=medical")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer self-start md:self-auto"
                >
                  Open AICS Application <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {aicsServices.map((svc) => (
                  <div
                    key={svc.type}
                    className="p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/50 border border-gray-200 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all gap-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${svc.iconColor} group-hover:scale-105 transition-transform flex items-center justify-center shrink-0 shadow-2xs`}>
                          <svc.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{svc.title}</h3>
                          <span className="text-[11px] text-blue-600 font-semibold">Crisis Financial Aid</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{svc.desc}</p>
                      
                      <div className="bg-slate-100/80 rounded-xl p-3 space-y-1.5">
                        <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                          Key Requirements:
                        </div>
                        <ul className="text-[11px] text-gray-600 space-y-1 list-disc list-inside">
                          {svc.requirements.map((req, rIdx) => (
                            <li key={rIdx} className="leading-tight">{req}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(svc.path)}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Apply for {svc.title} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. ALL MODULES & SOCIAL SERVICES DIRECTORY */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  Explore All Social Welfare Modules & Services
                </h2>
                <span className="text-xs font-bold text-gray-500">
                  Showing {filteredModules.length} programs
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-gray-300 transition-all gap-5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl border ${mod.color}`}>
                            <mod.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-base">{mod.title}</h3>
                            <span className="text-xs font-semibold text-gray-500">{mod.badge}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        {mod.desc}
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {mod.features.map((feat, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-slate-50 py-1.5 px-2.5 rounded-lg border border-slate-100 truncate"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => navigate(mod.primaryAction.path)}
                        className={`w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${mod.btnColor}`}
                      >
                        {mod.primaryAction.label} <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      {mod.secondaryAction && (
                        <button
                          type="button"
                          onClick={() => navigate(mod.secondaryAction.path)}
                          className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer text-center"
                        >
                          {mod.secondaryAction.label}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 6. GENERAL QUALIFICATION & DOCUMENT REQUIREMENTS SUMMARY */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              General Qualification & Document Requirements
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
              Before submitting any application, make sure your digital copies are clear, legible, and uncropped.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4 space-y-2">
              <div className="font-bold text-sm text-blue-100 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-300" />
                Proof of Identity & Residency
              </div>
              <p className="text-xs text-blue-200/90 leading-relaxed">
                Official QCID Card, PhilSys National ID, Voter's Certification, or Barangay Certificate of Residency with at least 6 months residency.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4 space-y-2">
              <div className="font-bold text-sm text-blue-100 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-300" />
                Certificate of Indigency
              </div>
              <p className="text-xs text-blue-200/90 leading-relaxed">
                Issued by your Barangay Captain or authorized barangay official stating the family is indigent and specifying the purpose of assistance.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4 space-y-2">
              <div className="font-bold text-sm text-blue-100 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-300" />
                Program-Specific Documents
              </div>
              <p className="text-xs text-blue-200/90 leading-relaxed">
                Medical abstract/prescriptions for Medical aid; Death certificate & funeral contract for Burial aid; School Certificate for Education; Doctor's assessment for PWD.
              </p>
            </div>
          </div>
        </div>

        {/* 7. FREQUENTLY ASKED QUESTIONS (FAQS) */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">
                Frequently Asked Questions (FAQs) & Help
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Got questions about social services? Find quick answers below.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-sm text-gray-900 dark:text-white flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 text-xs sm:text-sm text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 leading-relaxed border-t border-gray-100 dark:border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 8. FOOTER CONTACT / HOTLINES */}
        <div className="bg-slate-100 border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="font-bold text-gray-900 text-sm flex items-center justify-center sm:justify-start gap-2">
              <PhoneCall className="h-4 w-4 text-blue-600" />
              Need Personal Assistance or Inquiries?
            </div>
            <p className="text-xs text-gray-500">
              Quezon City Social Services Development Department (SSDD) Hotline: (02) 8988-4242 loc. 8701 / 8702
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/portal/aics?type=medical")}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            Start an Application
          </button>
        </div>
      </div>

      {/* AI Assistance & Eligibility Finder Modal */}
      <AIAssistanceFinderModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  )
}
