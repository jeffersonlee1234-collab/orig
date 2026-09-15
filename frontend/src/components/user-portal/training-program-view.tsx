import { useState, useEffect } from "react"
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  FileEdit,
  Award,
  Sparkles,
  Scissors,
  UtensilsCrossed,
  Laptop,
  Check,
  ArrowRight,
  Info,
  ShieldCheck,
  RefreshCw,
  Lock,
  Unlock,
  Target,
  Printer,
  Plus,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import { getCurrentUserProfile, getLoggedInUserQcid, type LoggedInUserProfile } from "../../utils/userProfile"
import { notifyApplicationChange } from "../../utils/realtimeSync"
import { useLanguage } from "../ui/language-context"

export type TrainingProgramTab = "available" | "apply" | "schedule" | "history"

export interface TrainingCourse {
  id: string
  title: string
  category: string
  description: string
  date: string
  time: string
  location: string
  landmark: string
  totalSlots: number
  availableSlots: number
  enrolledCount?: number
  percentFilled?: number
  durationHours: number
  instructor: string
  prerequisites: string
  materialsProvided: string
  icon?: string
}

export interface TrainingApplicationRecord {
  id: string | number
  referenceNumber: string
  qcid: string
  userId?: string
  trainingId: string
  trainingName: string
  applicantInfo: {
    fullName: string
    firstName: string
    middleName?: string
    lastName: string
    suffix?: string
    email: string
    contactNo: string
    address: string
    barangay: string
    city: string
    sex: string
    dateOfBirth: string
    age: string | number
    occupation?: string
  }
  status: "pending" | "under_review" | "approved" | "rejected" | "needs_revision"
  submittedAt: string
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
  revisionNotes?: string
  schedule: {
    trainingName: string
    trainingDate: string
    trainingTime: string
    trainingLocation: string
    landmark: string
    trainingStatus: "Upcoming" | "Ongoing" | "Completed"
  }
  attendance: {
    totalHours: number
    hoursCompleted: number
    completed: boolean
    sessions: Array<{
      day: number
      topic: string
      attended: boolean
      date: string
    }>
  }
  certificate?: {
    certificateNo: string
    issueDate: string
    title: string
    recipientName: string
    trainingName: string
    hoursCompleted: number
    status: string
  } | null
}

const DEFAULT_COURSES: TrainingCourse[] = [
  {
    id: "tr-sewing",
    title: "Sewing Training",
    category: "Livelihood & Skills Development",
    description: "Learn pattern drafting, tailoring of garments and curtains, operating and maintaining sewing machines, and creating marketable products for the community.",
    date: "September 15, 2026 - September 18, 2026",
    time: "9:00 AM - 12:00 PM (3 Hours/Day)",
    location: "Gov Services Skills Development Center, Batasan Hills",
    landmark: "Beside Batasan Hills Barangay Hall / Across Puregold",
    totalSlots: 25,
    availableSlots: 25,
    enrolledCount: 0,
    percentFilled: 0,
    durationHours: 12,
    instructor: "Mrs. Rosa Dimaculangan (Master Tailor)",
    prerequisites: "Gov Services Resident (18 years old and above), interest in garment making.",
    materialsProvided: "Sewing fabric, thread kit, pattern paper, tracing wheel, measuring tape.",
  },
  {
    id: "tr-cooking",
    title: "Cooking Training",
    category: "Livelihood & Skills Development",
    description: "Learn commercial cooking, food safety & sanitation, preparing popular snacks and dishes for eatery businesses, and proper food costing and pricing.",
    date: "September 20, 2026 - September 23, 2026",
    time: "1:00 PM - 4:00 PM (3 Hours/Day)",
    location: "Gov Services Skills Development Center, Batasan Hills",
    landmark: "3rd Floor Culinary Lab, near Batasan Hills Barangay Hall",
    totalSlots: 25,
    availableSlots: 25,
    enrolledCount: 0,
    percentFilled: 0,
    durationHours: 12,
    instructor: "Chef Anthony Santos (Culinary Specialist)",
    prerequisites: "Gov Services Resident, willing to follow kitchen hygiene & food safety guidelines.",
    materialsProvided: "Ingredients kit, cooking apron, hairnet, recipe guide booklet.",
  },
  {
    id: "tr-beauty",
    title: "Beauty Services Training",
    category: "Livelihood & Skills Development",
    description: "Core skills in haircutting, hairstyling, manicure/pedicure with nail art, facial cleansing, and basic cosmetology for salon or home-service livelihood.",
    date: "September 24, 2026 - September 27, 2026",
    time: "9:00 AM - 12:00 PM (3 Hours/Day)",
    location: "Gov Services Skills Development Center, Batasan Hills",
    landmark: "Ground Floor Wellness Studio, across Puregold Batasan",
    totalSlots: 25,
    availableSlots: 25,
    enrolledCount: 0,
    percentFilled: 0,
    durationHours: 12,
    instructor: "Ms. Cheryl Mendez (Certified Cosmetologist)",
    prerequisites: "Gov Services Resident (18 years old and above), enthusiastic to learn beauty care.",
    materialsProvided: "Nail grooming kit, salon cape, hair clips, sanitizer and manicure tools.",
  },
  {
    id: "tr-computer",
    title: "Basic Computer Training",
    category: "Livelihood & Skills Development",
    description: "Practical training in computer navigation, Microsoft Word document typing, Excel spreadsheet budgeting, internet search, email communication, and online job preparation.",
    date: "September 28, 2026 - October 01, 2026",
    time: "1:00 PM - 4:00 PM (3 Hours/Day)",
    location: "Gov Services Skills Development Center, Batasan Hills",
    landmark: "2nd Floor Computer Laboratory, Batasan Hills Center",
    totalSlots: 30,
    availableSlots: 30,
    enrolledCount: 0,
    percentFilled: 0,
    durationHours: 12,
    instructor: "Mr. Mark Villanueva (IT Skills Coordinator)",
    prerequisites: "Gov Services Resident seeking to learn practical computer skills from basic navigation to office tools.",
    materialsProvided: "Computer workstation with internet, digital handouts, practice USB drive.",
  },
]

interface TrainingProgramViewProps {
  initialTab?: TrainingProgramTab
}

export default function TrainingProgramView({ initialTab = "available" }: TrainingProgramViewProps) {
  const { language } = useLanguage()
  const isEn = language === "en"
  const isBis = language === "bis"

  const [activeTab, setActiveTab] = useState<TrainingProgramTab>(initialTab)
  const [courses, setCourses] = useState<TrainingCourse[]>(DEFAULT_COURSES)
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Localized course helper
  const getLocalizedCourse = (course: TrainingCourse) => {
    if (isBis) {
      if (course.id.includes("sewing")) {
        return {
          ...course,
          title: "Sewing Training (Panahi)",
          description: "Pagkat-on sa pattern drafting, panahi sa mga sinina ug kurtina, paggamit ug pag-atiman sa sewing machine, ug paghimo og mga produkto nga mabaligya.",
          prerequisites: "Residente sa Gov Services (18 anyos pataas), interesado sa panahi.",
          materialsProvided: "Panapton, thread kit, pattern paper, tracing wheel, measuring tape.",
          landmark: "Tupad sa Batasan Hills Barangay Hall / Atbang sa Puregold",
        }
      }
      if (course.id.includes("cooking")) {
        return {
          ...course,
          title: "Cooking Training (Pagluto)",
          description: "Pagkat-on sa commercial cooking, kalimpyo sa pagkaon, pag-andam og snacks ug pagkaon alang sa karenderya, ug hustong costing.",
          prerequisites: "Residente sa Gov Services, andam mosunod sa food safety guidelines.",
          materialsProvided: "Ingredients kit, cooking apron, hairnet, recipe guide booklet.",
          landmark: "3rd Floor Culinary Lab, duol sa Batasan Hills Barangay Hall",
        }
      }
      if (course.id.includes("beauty")) {
        return {
          ...course,
          title: "Beauty Services Training",
          description: "Kahanas sa pagtupi, hairstyling, manicure/pedicure nga may nail art, facial cleansing ug basic cosmetology alang sa salon livelihood.",
          prerequisites: "Residente sa Gov Services (18 anyos pataas), gusto makakat-on sa beauty care.",
          materialsProvided: "Nail grooming kit, salon cape, hair clips, sanitizer ug mga gamit sa manicure.",
          landmark: "Ground Floor Wellness Studio, atbang sa Puregold Batasan",
        }
      }
      if (course.id.includes("computer")) {
        return {
          ...course,
          title: "Basic Computer Training",
          description: "Pagbansay sa computer navigation, Microsoft Word typing, Excel spreadsheet budgeting, internet search, email, ug online job preparation.",
          prerequisites: "Residente sa Gov Services nga gustong makakat-on og computer skills.",
          materialsProvided: "Computer workstation nga may internet, digital handouts, practice USB drive.",
          landmark: "2nd Floor Computer Laboratory, Batasan Hills Center",
        }
      }
    } else if (!isEn) {
      // Tagalog
      if (course.id.includes("sewing")) {
        return {
          ...course,
          title: "Sewing Training (Pananahi)",
          description: "Matutunan ang pattern drafting, pananahi ng mga damit at kurtina, paggamit at pag-aalaga ng sewing machine, at paglikha ng mga produktong maaaring ibenta sa komunidad.",
          prerequisites: "Gov Services Resident (18 taong gulang pataas), may interes sa pananahi.",
          materialsProvided: "Sewing fabric, thread kit, pattern paper, tracing wheel, measuring tape.",
          landmark: "Tapat ng Puregold Batasan / Katabi ng Batasan Hills Barangay Hall",
        }
      }
      if (course.id.includes("cooking")) {
        return {
          ...course,
          title: "Cooking Training (Pagluluto)",
          description: "Matutunan ang commercial cooking, food safety & sanitation, paghahanda ng merienda at lutong ulam na patok sa karenderya, at tamang costing at pagpepresyo.",
          prerequisites: "Gov Services Resident, handang sumunod sa kitchen hygiene & food safety guidelines.",
          materialsProvided: "Ingredients kit, cooking apron, hairnet, recipe guide booklet.",
          landmark: "3rd Floor Culinary Lab, malapit sa Batasan Hills Barangay Hall",
        }
      }
      if (course.id.includes("beauty")) {
        return {
          ...course,
          title: "Beauty Services Training",
          description: "Pangunahing kasanayan sa haircutting at hairstyling, manicure/pedicure na may nail art, facial cleansing at basic cosmetology para sa salon o home-service livelihood.",
          prerequisites: "Gov Services Resident (18 taong gulang pataas), masigasig matuto ng beauty care.",
          materialsProvided: "Nail grooming kit, salon cape, hair clips, sanitizer and manicure tools.",
          landmark: "Ground Floor Wellness Studio, tapat ng Puregold Batasan",
        }
      }
      if (course.id.includes("computer")) {
        return {
          ...course,
          title: "Basic Computer Training",
          description: "Pagsasanay sa computer navigation, Microsoft Word document typing, Excel spreadsheet budgeting, internet search, email communication, at online job preparation.",
          prerequisites: "Gov Services Resident na nais matuto ng computer mula sa basic navigation hanggang office tools.",
          materialsProvided: "Computer workstation with internet, digital handouts, practice USB drive.",
          landmark: "2nd Floor Computer Laboratory, Batasan Hills Center",
        }
      }
    }
    return course
  }

  // Current active user application state
  const [activeApplication, setActiveApplication] = useState<TrainingApplicationRecord | null>(null)
  const [allUserApplications, setAllUserApplications] = useState<TrainingApplicationRecord[]>([])

  // Apply Form State
  const [applyCourseId, setApplyCourseId] = useState<string>("tr-sewing")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formStep, setFormStep] = useState<"select" | "profile" | "review">("select")
  const [isAttested, setIsAttested] = useState(false)
  const [isRevising, setIsRevising] = useState(false)

  // Certificate Modal State
  const [certificateModalApp, setCertificateModalApp] = useState<TrainingApplicationRecord | null>(null)

  // User Profile
  const profile: LoggedInUserProfile = getCurrentUserProfile()
  const userQcid = getLoggedInUserQcid() || profile.qcidNo || "110000116932100"

  // Fetch available courses and user applications
  const fetchTrainingData = async () => {
    try {
      // 1. Fetch available programs
      try {
        const resProg = await fetch(`${API_BASE}/api/training/programs`)
        if (resProg.ok) {
          const data = await resProg.json()
          if (data.success && Array.isArray(data.programs) && data.programs.length > 0) {
            setCourses(data.programs)
          }
        }
      } catch (_) {}

      // 2. Fetch user applications
      try {
        const resApps = await fetch(`${API_BASE}/api/training/applications?qcid=${userQcid}`)
        if (resApps.ok) {
          const data = await resApps.json()
          if (data.success && Array.isArray(data.applications)) {
            const userApps = data.applications.filter(
              (a: any) =>
                a.qcid === userQcid ||
                a.userId === userQcid ||
                a.referenceNumber === userQcid ||
                a.referenceNumber?.startsWith(`${userQcid}-`) ||
                a.applicantInfo?.email?.toLowerCase() === profile.email?.toLowerCase()
            )
            setAllUserApplications(userApps)
            if (userApps.length > 0) {
              const ongoing = userApps.find((a: any) => a.status !== "rejected" && !a.attendance?.completed)
              setActiveApplication((prev) => {
                if (prev) {
                  const refreshed = userApps.find((a: any) => String(a.id) === String(prev.id) || a.referenceNumber === prev.referenceNumber)
                  if (refreshed) return refreshed
                }
                return ongoing || userApps[0]
              })
              return
            }
          }
        }
      } catch (_) {}

      // Fallback: localStorage
      const local = JSON.parse(localStorage.getItem("training_applications") || "[]")
      if (Array.isArray(local) && local.length > 0) {
        const match = local.filter(
          (a: any) =>
            a.qcid === userQcid ||
            a.userId === userQcid ||
            a.referenceNumber === userQcid ||
            a.referenceNumber?.startsWith(`${userQcid}-`) ||
            a.applicantInfo?.email?.toLowerCase() === profile.email?.toLowerCase()
        )
        setAllUserApplications(match)
        if (match.length > 0) {
          const ongoing = match.find((a: any) => a.status !== "rejected" && !a.attendance?.completed)
          setActiveApplication((prev) => {
            if (prev) {
              const refreshed = match.find((a: any) => String(a.id) === String(prev.id) || a.referenceNumber === prev.referenceNumber)
              if (refreshed) return refreshed
            }
            return ongoing || match[0]
          })
          return
        }
      }
    } catch (e) {
      console.error("Failed to load training data:", e)
    }
  }

  useEffect(() => {
    fetchTrainingData()
    const interval = setInterval(fetchTrainingData, 8000)
    return () => clearInterval(interval)
  }, [userQcid])

  // Get icon for training course
  const getCourseIcon = (id: string) => {
    if (id.includes("sewing")) return <Scissors className="h-6 w-6 text-indigo-600" />
    if (id.includes("cooking")) return <UtensilsCrossed className="h-6 w-6 text-amber-600" />
    if (id.includes("beauty")) return <Sparkles className="h-6 w-6 text-pink-600" />
    return <Laptop className="h-6 w-6 text-blue-600" />
  }

  // Handle open details modal
  const handleOpenDetails = (course: TrainingCourse) => {
    setSelectedCourse(course)
    setIsDetailModalOpen(true)
  }

  // Check if citizen has an ongoing active training (not yet completed, not rejected)
  const hasActiveOngoingTraining = Boolean(
    allUserApplications.some(
      (a) => a.status !== "rejected" && !a.attendance?.completed
    )
  )

  // Handle jump from course to Apply tab
  const handleSelectToApply = (course: TrainingCourse) => {
    if (hasActiveOngoingTraining) {
      const activeRunning = allUserApplications.find((a) => a.status !== "rejected" && !a.attendance?.completed)
      alert(
        isEn
          ? `You currently have an active training program (${activeRunning?.trainingName || activeApplication?.trainingName}). You can enroll in a new training course once your current training is completed and certified.`
          : isBis
          ? `Aduna kay aktibong training karon (${activeRunning?.trainingName || activeApplication?.trainingName}). Makapa-enroll ka sa bag-ong kurso kung mahuman na nimo ang imong kasamtangang pagbansay.`
          : `May kasalukuyan kang aktibong training program (${activeRunning?.trainingName || activeApplication?.trainingName}). Maaari ka lamang mag-apply sa panibagong kurso kapag natapos mo na ang iyong kasalukuyang pagsasanay at nakuha ang iyong sertipiko.`
      )
      return
    }
    setSelectedCourse(course)
    setApplyCourseId(course.id)
    setIsDetailModalOpen(false)
    setIsRevising(true)
    setActiveTab("apply")
    setFormStep("profile")
  }

  // Handle submit application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAttested) {
      alert(
        isEn
          ? "Please check the confirmation box before submitting your application."
          : isBis
          ? "Palihug i-tsek ang kumpirmasyon sa dili pa isumite ang aplikasyon."
          : "Paki-tsek ang kumpirmasyon bago isumite ang aplikasyon."
      )
      return
    }

    setIsSubmitting(true)
    const rawMatched = courses.find((c) => c.id === applyCourseId) || courses[0]
    const matched = getLocalizedCourse(rawMatched)

    const payload = {
      trainingId: matched.id,
      trainingName: matched.title,
      qcid: userQcid,
      applicantInfo: {
        fullName: `${profile.firstName} ${profile.middleName ? profile.middleName + " " : ""}${profile.lastName} ${profile.suffix || ""}`.trim(),
        firstName: profile.firstName,
        middleName: profile.middleName || "",
        lastName: profile.lastName,
        suffix: profile.suffix || "",
        email: profile.email || "",
        contactNo: profile.contactNo || profile.mobileNumber || "09172345678",
        address: `${profile.houseNo || ""} ${profile.street || ""}`.trim() || "Quezon City Resident Address",
        barangay: profile.barangay || "Central",
        city: profile.city || "Quezon City",
        sex: profile.sex || "Female",
        dateOfBirth: profile.birthDate || "1998-05-12",
        age: profile.age || 26,
        occupation: profile.occupation || "Resident",
      },
    }

    try {
      const res = await fetch(`${API_BASE}/api/training/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.application) {
          const newApp = data.application
          setActiveApplication(newApp)
          setAllUserApplications((prev) => [newApp, ...prev.filter((a) => String(a.id) !== String(newApp.id) && a.referenceNumber !== newApp.referenceNumber)])
          // Save in local storage
          const existing = JSON.parse(localStorage.getItem("training_applications") || "[]")
          const filtered = existing.filter((a: any) => String(a.id) !== String(newApp.id) && a.referenceNumber !== newApp.referenceNumber)
          localStorage.setItem("training_applications", JSON.stringify([newApp, ...filtered]))
        }
      } else {
        // Fallback local creation
        const candidateSuffix = allUserApplications.length > 0 ? `-${allUserApplications.length}` : ""
        const fallbackApp: TrainingApplicationRecord = {
          id: Date.now(),
          referenceNumber: `${userQcid}${candidateSuffix}`,
          qcid: userQcid,
          trainingId: matched.id,
          trainingName: matched.title,
          applicantInfo: payload.applicantInfo,
          status: "pending",
          submittedAt: new Date().toISOString(),
          schedule: {
            trainingName: matched.title,
            trainingDate: matched.date,
            trainingTime: matched.time,
            trainingLocation: matched.location,
            landmark: matched.landmark,
            trainingStatus: "Upcoming",
          },
          attendance: {
            totalHours: matched.durationHours,
            hoursCompleted: 0,
            completed: false,
            sessions: [
              { day: 1, topic: "Orientation & Fundamental Skills", attended: false, date: matched.date.split("-")[0]?.trim() || "Day 1" },
              { day: 2, topic: "Hands-on Application & Laboratory Work", attended: false, date: "Day 2" },
              { day: 3, topic: "Specialized Techniques & Practical Assessment", attended: false, date: "Day 3" },
              { day: 4, topic: "Final Evaluation, Livelihood Integration & Completion", attended: false, date: matched.date.split("-")[1]?.trim() || "Day 4" },
            ],
          },
          certificate: null,
        }
        setActiveApplication(fallbackApp)
        setAllUserApplications((prev) => [fallbackApp, ...prev])
        const existing = JSON.parse(localStorage.getItem("training_applications") || "[]")
        localStorage.setItem("training_applications", JSON.stringify([fallbackApp, ...existing]))
      }
    } catch (err) {
      console.error("Submit application error:", err)
    } finally {
      setIsSubmitting(false)
      setIsRevising(false)
      setActiveTab("apply")
    }
  }

  // User interactive daily attendance check-in (3 hours per day)
  const handleUserCheckin = async (dayNumber: number) => {
    if (!activeApplication) return
    const currentSessions = activeApplication.attendance?.sessions || [
      { day: 1, topic: "Orientation & Fundamental Skills", hours: 3, attended: false, date: "Day 1" },
      { day: 2, topic: "Hands-on Application & Practical Work", hours: 3, attended: false, date: "Day 2" },
      { day: 3, topic: "Specialized Techniques & Practical Assessment", hours: 3, attended: false, date: "Day 3" },
      { day: 4, topic: "Final Evaluation, Livelihood Integration & Completion", hours: 3, attended: false, date: "Day 4" },
    ]

    const targetSession = currentSessions.find((s) => s.day === dayNumber)
    if (targetSession && targetSession.attended) {
      return // Already attended, do not repeat or toggle off
    }

    const updatedSessions = currentSessions.map((s) => {
      if (s.day === dayNumber) {
        return { ...s, attended: true }
      }
      return s
    })

    const attendedCount = updatedSessions.filter((s) => s.attended).length
    const hoursCompleted = attendedCount * 3
    const isComplete = attendedCount === updatedSessions.length || hoursCompleted >= (activeApplication.attendance?.totalHours || 12)

    const updated: TrainingApplicationRecord = {
      ...activeApplication,
      attendance: {
        ...activeApplication.attendance,
        totalHours: activeApplication.attendance?.totalHours || 12,
        sessions: updatedSessions,
        hoursCompleted,
        completed: isComplete,
      },
      schedule: {
        ...activeApplication.schedule,
        trainingStatus: isComplete ? "Completed" : attendedCount > 0 ? "Ongoing" : "Upcoming",
      },
      certificate: isComplete
        ? activeApplication.certificate || {
            certificateNo: `GOV-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            issueDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
            title: `Certificate of Completion in ${activeApplication.trainingName}`,
            recipientName: activeApplication.applicantInfo?.fullName || "Resident Beneficiary",
            trainingName: activeApplication.trainingName,
            hoursCompleted: 12,
            status: "Issued",
          }
        : null,
    }

    // Instant local state update
    setActiveApplication(updated)
    setAllUserApplications((prev) => {
      const exists = prev.some((a) => String(a.id) === String(updated.id) || a.referenceNumber === updated.referenceNumber)
      const list = exists
        ? prev.map((a) => (String(a.id) === String(updated.id) || a.referenceNumber === updated.referenceNumber ? updated : a))
        : [updated, ...prev]
      try {
        localStorage.setItem("training_applications", JSON.stringify(list))
        window.dispatchEvent(new Event("storage"))
      } catch (_) {}
      return list
    })

    try {
      await fetch(`${API_BASE}/api/training/applications/${updated.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updated.status,
          attendance: updated.attendance,
          trainingStatus: updated.schedule?.trainingStatus,
          approvedBy: updated.approvedBy || "Gov Services Skills Development Division",
        }),
      })
    } catch (_) {}

    notifyApplicationChange(isComplete ? "APPLICATION_APPROVED" : "STATUS_CHANGED", "livelihood", updated.referenceNumber)
  }

  // Active status badge helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {isEn ? "APPROVED" : isBis ? "NAAPROBAHAN" : "NAAPRUBAHAN"}
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            {isEn ? "REJECTED" : isBis ? "GIBALIBARAN" : "HINDI NAAPRUBAHAN"}
          </span>
        )
      case "needs_revision":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            {isEn ? "NEEDS REVISION" : isBis ? "KINAHANGLAN OG PAG-USAB" : "KAILANGAN NG PAG-EDIT"}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <Clock3 className="h-3.5 w-3.5 text-blue-600" />
            {isEn ? "PENDING / UNDER REVIEW" : isBis ? "NAGPAABOT SA PAGSUSI" : "KASALUKUYANG SINUSURI"}
          </span>
        )
    }
  }

  const completedTrainings = allUserApplications.filter((a) => a.attendance?.completed || a.schedule?.trainingStatus === "Completed" || a.certificate)

  return (
    <div className="space-y-6">
      {/* Sub-Module Top Header */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white tracking-wide uppercase">
                {isEn ? "Gov Services" : isBis ? "Gov Services" : "Gov Services"}
              </span>
              <span className="text-xs text-muted-foreground">
                {isEn ? "Livelihood & Training Program Sub-Module" : isBis ? "Sub-Module sa Panginabuhi ug Pagsasanay" : "Sub-Module ng Kabuhayan at Pagsasanay"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {isEn ? "Gov Services Skills Training Program" : isBis ? "Gov Services Programa sa Pagbansay" : "Gov Services Programa sa Pagsasanay at Kasanayan"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              {isEn
                ? "Free skills training and certification for residents. Gain NC II/Skills credentials for livelihood capital assistance and employment opportunities."
                : isBis
                ? "Libreng bansay sa kahanas ug sertipikasyon alang sa mga residente. Pagkuha og NC II/Skills certificate alang sa ayuda sa panginabuhi ug trabaho."
                : "Libreng skills training at sertipikasyon para sa mga residente. Kumuha ng NC II/Skills certificate para sa livelihood assistance at hanapbuhay."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchTrainingData}
              className="p-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title={isEn ? "Refresh data" : isBis ? "I-refresh ang datos" : "I-refresh ang data"}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {activeApplication && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {isEn ? "Current Application" : isBis ? "Kasamtangang Aplikasyon" : "Kasalukuyang Aplikasyon"}
                </p>
                <div className="mt-0.5">{renderStatusBadge(activeApplication.status)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4-Stage Navigation Tabs */}
      <div className="bg-card border border-border rounded-2xl p-1.5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {/* Tab 1: Available Training */}
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            id="tab-available-training"
            className={`px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "available"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>{isEn ? "1. AVAILABLE TRAINING" : isBis ? "1. MGA BUKAS NGA PAGBANSAY" : "1. MGA BUKAS NA PAGSASANAY"}</span>
          </button>

          {/* Tab 2: Apply for Training */}
          <button
            type="button"
            onClick={() => setActiveTab("apply")}
            id="tab-apply-training"
            className={`px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "apply"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <FileEdit className="h-4 w-4 shrink-0" />
            <span>{isEn ? "2. APPLY FOR TRAINING" : isBis ? "2. MAG-APPLY SA PAGBANSAY" : "2. MAG-APPLY SA PAGSASANAY"}</span>
          </button>

          {/* Tab 3: Training Schedule */}
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            id="tab-training-schedule"
            className={`px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "schedule"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{isEn ? "3. TRAINING SCHEDULE" : isBis ? "3. ISKEDYUL SA PAGBANSAY" : "3. ISKEDYUL NG PAGSASANAY"}</span>
          </button>

          {/* Tab 4: Training History */}
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            id="tab-training-history"
            className={`px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Award className="h-4 w-4 shrink-0" />
            <span>{isEn ? "4. TRAINING HISTORY" : isBis ? "4. KASAYSAYAN SA PAGBANSAY" : "4. KASAYSAYAN NG PAGSASANAY"}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. AVAILABLE TRAINING CONTENT                                */}
      {/* ============================================================ */}
      {activeTab === "available" && (
        <div className="space-y-6">
          {/* Active Training Notice Banner */}
          {hasActiveOngoingTraining && (
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">
                    Active Training in Progress: {activeApplication?.trainingName}
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Only one active training program is allowed at a time. Please complete all 4 daily sessions (12 hours) and receive your Certificate of Completion before applying for a new course.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(activeApplication?.status === "approved" ? "schedule" : "apply")}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
              >
                <span>View Training Progress</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEn ? "Available Training Programs" : isBis ? "Mga Bukas nga Pagbansay" : "Mga Bukas na Pagsasanay"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? "Choose a training program suited to your interest and schedule before applying."
                  : isBis
                  ? "Pilia ang programa sa pagbansay nga angay sa imong interes ug iskedyul sa dili pa mag-apply."
                  : "Pumili ng training program na angkop sa iyong interes at schedule bago mag-apply."}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 w-fit">
              {courses.length} {isEn ? "Open Programs" : isBis ? "Bukas nga Programa" : "Bukas na Programa"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((rawCourse) => {
              const course = getLocalizedCourse(rawCourse)
              
              // Dynamic slot calculations based on backend or all stored applications
              const allStoredApps: TrainingApplicationRecord[] = (() => {
                try {
                  const stored = localStorage.getItem("training_applications")
                  return stored ? JSON.parse(stored) : []
                } catch {
                  return []
                }
              })()

              const courseApps = allStoredApps.filter(
                (a) =>
                  (a.trainingId === course.id ||
                    a.trainingName?.toLowerCase() === course.title?.toLowerCase() ||
                    a.schedule?.trainingName?.toLowerCase() === course.title?.toLowerCase()) &&
                  a.status !== "rejected"
              )

              const enrolledCount =
                course.enrolledCount !== undefined
                  ? course.enrolledCount
                  : courseApps.length
              const totalSlots = course.totalSlots || 25
              const availableSlots = Math.max(0, totalSlots - enrolledCount)
              const slotPercent = Math.min(
                100,
                Math.round((enrolledCount / totalSlots) * 100)
              )

              // Check if currently logged in user is already enrolled/applied in this course
              const isUserEnrolledInThis = allUserApplications.some(
                (a) =>
                  (a.trainingId === course.id ||
                    a.trainingName?.toLowerCase() === course.title?.toLowerCase() ||
                    a.schedule?.trainingName?.toLowerCase() === course.title?.toLowerCase()) &&
                  a.status !== "rejected"
              )

              const isBlockedByOngoingOtherTraining = hasActiveOngoingTraining && !isUserEnrolledInThis

              return (
                <div
                  key={course.id}
                  className={`bg-card border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                    isUserEnrolledInThis ? "border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20" : "border-border"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center border border-border shrink-0 group-hover:scale-105 transition-transform">
                          {getCourseIcon(course.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-base text-foreground group-hover:text-blue-600 transition-colors">
                              {course.title}
                            </h4>
                            {isUserEnrolledInThis && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                {isEn ? "ENROLLED" : isBis ? "NAKA-ENROLL" : "NAKA-ENROLL"}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {course.durationHours} {isEn ? "Hours Intensive Training" : isBis ? "Oras nga Masinsinang Pagbansay" : "Oras ng Masinsinang Pagsasanay"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${
                          availableSlots === 0
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}
                      >
                        {availableSlots === 0
                          ? isEn
                            ? "Full (0 slots left)"
                            : isBis
                            ? "Puno na (0 slots)"
                            : "Puno na (0 slots)"
                          : `${availableSlots} ${isEn ? "slots left" : isBis ? "slot nahabilin" : "slots natitira"}`}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Schedule & Location summary */}
                    <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium text-foreground">{course.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>{course.time}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{course.location} • <span className="italic text-[11px]">{course.landmark}</span></span>
                      </div>
                    </div>

                    {/* Slots progress */}
                    <div className="pt-2">
                      <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                        <span>{isEn ? "Slots filled" : isBis ? "Mga slot nga napuno" : "Mga slot na napuno"}</span>
                        <span className="font-mono">{enrolledCount} / {totalSlots} {isEn ? "slots" : "slots"} ({slotPercent}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            slotPercent >= 100
                              ? "bg-rose-500"
                              : slotPercent > 70
                              ? "bg-amber-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${slotPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-4 mt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(course)}
                      className="px-3 py-2 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 text-foreground text-xs font-semibold transition-all cursor-pointer text-center"
                    >
                      {isEn ? "View Details" : isBis ? "Tan-awa ang Detalye" : "Tingnan ang Detalye"}
                    </button>
                    {isUserEnrolledInThis ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab(activeApplication?.status === "approved" ? "schedule" : "apply")}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{isEn ? "View Status" : isBis ? "Tan-awa ang Status" : "Tingnan ang Status"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : isBlockedByOngoingOtherTraining ? (
                      <button
                        type="button"
                        disabled
                        title={isEn ? "Complete your active training first before applying for another course" : "Kumpletuhin muna ang kasalukuyang training bago mag-apply sa iba"}
                        className="px-3 py-2 rounded-xl bg-muted/60 text-muted-foreground border border-border/70 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                      >
                        <span>{isEn ? "In Training" : isBis ? "Ga-training Pa" : "Nagsasanay Pa"}</span>
                      </button>
                    ) : availableSlots === 0 ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                      >
                        <span>{isEn ? "Slots Full" : "Puno na ang Slots"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectToApply(course)}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{isEn ? "Apply Now" : isBis ? "Mag-apply Karon" : "Mag-apply Ngayon"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. APPLY FOR TRAINING & APPLICATION STATUS                   */}
      {/* ============================================================ */}
      {activeTab === "apply" && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Multiple Applications History Switcher */}
          {allUserApplications.length > 1 && (
            <div className="bg-card border border-border rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {isEn ? "Your Applications History:" : isBis ? "Imong mga Aplikasyon:" : "Iyong mga Aplikasyon:"}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {allUserApplications.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      setActiveApplication(app)
                      setIsRevising(false)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeApplication?.id === app.id && !isRevising
                        ? "bg-blue-600 text-white shadow-xs"
                        : "border border-border bg-muted/20 hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span>{app.trainingName}</span>
                    <span className="text-[10px] font-mono opacity-80">({app.referenceNumber})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Application Status Tracker Banner (if any) */}
          {activeApplication && !isRevising && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {isEn ? "Training Application Status" : isBis ? "Status sa Aplikasyon sa Pagbansay" : "Status ng Aplikasyon sa Pagsasanay"}
                    </h3>
                    {renderStatusBadge(activeApplication.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? "Reference Number:" : "Reference Number:"} <span className="font-mono font-bold text-foreground">{activeApplication.referenceNumber}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!hasActiveOngoingTraining && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRevising(true)
                        setFormStep("select")
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isEn ? "Apply for Another Course" : isBis ? "Mag-apply og Bag-ong Kurso" : "Mag-apply ng Bagong Kurso"}</span>
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {isEn ? "Submitted:" : isBis ? "Gisumite:" : "Naisumite:"} {new Date(activeApplication.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Status specific detailed explanation card */}
              {activeApplication.status === "pending" && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm">
                    <Clock3 className="h-4 w-4" />
                    <span>{isEn ? "PENDING / UNDER REVIEW" : isBis ? "NAGPAABOT SA PAGSUSI" : "KASALUKUYANG SINUSURI"}</span>
                  </div>
                  <p className="text-xs text-blue-900/80 dark:text-blue-200 leading-relaxed">
                    {isEn ? (
                      <>
                        Your application for <strong>{activeApplication.trainingName}</strong> is currently under review by the Gov Services Skills Development Coordinator. Please allow 1-2 business days for schedule verification.
                      </>
                    ) : isBis ? (
                      <>
                        Ang imong aplikasyon alang sa <strong>{activeApplication.trainingName}</strong> kasamtangang gisusi sa Gov Services Skills Development Coordinator. Palihug paghulat og 1-2 ka adlaw alang sa beripikasyon.
                      </>
                    ) : (
                      <>
                        Ang inyong aplikasyon para sa <strong>{activeApplication.trainingName}</strong> ay kasalukuyang sinusuri ng Gov Services Skills Development Coordinator. Maghintay ng 1-2 araw para sa beripikasyon at pinal na iskedyul.
                      </>
                    )}
                  </p>
                </div>
              )}

              {activeApplication.status === "approved" && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {activeApplication.attendance?.completed
                        ? isEn
                          ? "COMPLETED – 100% Training Completed & Certified!"
                          : isBis
                          ? "NAHUMAN – 100% Nakompleto ang Pagbansay!"
                          : "NAKUMPLETO – 100% Natapos ang Pagsasanay at Sertipikado!"
                        : isEn
                        ? "APPROVED – Your Training Slot is Confirmed!"
                        : isBis
                        ? "NAAPROBAHAN – Kumpirmado ang imong Training Slot!"
                        : "APPROVED – Kumpirmado ang inyong Training Slot!"}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900/80 dark:text-emerald-200 leading-relaxed">
                    {activeApplication.attendance?.completed ? (
                      isEn ? (
                        <>
                          You have completed all 4 daily sessions in <strong>{activeApplication.trainingName}</strong>. You may view or print your Certificate of Completion in Tab 4, or apply for another training program.
                        </>
                      ) : isBis ? (
                        <>
                          Nahuman nimo ang tanang 4 ka adlaw sa <strong>{activeApplication.trainingName}</strong>. Mahimo nimong tan-awon ang imong sertipiko sa Tab 4 o mag-apply sa laing kurso.
                        </>
                      ) : (
                        <>
                          Natapos mo ang lahat ng 4 na araw sa <strong>{activeApplication.trainingName}</strong>. Maaari mong tingnan o i-print ang iyong Certificate of Completion sa Tab 4, o mag-apply sa panibagong kurso.
                        </>
                      )
                    ) : isEn ? (
                      <>
                        You may now attend <strong>{activeApplication.trainingName}</strong>. Your assigned schedule is below and you can track your live session attendance in Tab 3.
                      </>
                    ) : isBis ? (
                      <>
                        Mahimo ka nang moapil sa <strong>{activeApplication.trainingName}</strong>. Gitakda ang imong iskedyul sa ubos ug mahimo nimong subayon ang imong attendance sa Tab 3.
                      </>
                    ) : (
                      <>
                        Maaari ka nang sumali sa <strong>{activeApplication.trainingName}</strong>. Nakatakda ang iyong schedule sa ibaba at maaari mong subaybayan ang iyong attendance sa Tab 3.
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveTab("schedule")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer w-fit"
                    >
                      <span>{isEn ? "Go to Training Schedule" : isBis ? "Adto sa Iskedyul sa Pagbansay" : "Pumunta sa Training Schedule"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    {activeApplication.attendance?.completed && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("history")
                          setCertificateModalApp(activeApplication)
                        }}
                        className="px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Award className="h-4 w-4" />
                        <span>{isEn ? "View Certificate" : "Tingnan ang Sertipiko"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeApplication.status === "rejected" && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                    <XCircle className="h-4 w-4" />
                    <span>{isEn ? "APPLICATION REJECTED" : isBis ? "GIBALIBARAN ANG APLIKASYON" : "HINDI NAAPRUBAHAN ANG APLIKASYON"}</span>
                  </div>
                  <p className="text-xs text-rose-900/80 dark:text-rose-200 leading-relaxed">
                    {isEn ? "Reason:" : isBis ? "Rason:" : "Dahilan:"} {activeApplication.rejectionReason || (isEn ? "Did not meet residency requirements or slots for this batch are full." : "Hindi pumasok sa residency validation o puno na ang slots sa naturang batch.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRevising(true)
                      setFormStep("select")
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer w-fit"
                  >
                    {isEn ? "Apply for Another Course" : isBis ? "Mag-apply sa Laing Kurso" : "Mag-apply sa Ibang Kurso"}
                  </button>
                </div>
              )}

              {/* Application Summary details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/20 p-4 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "Selected Program:" : isBis ? "Napiling Programa:" : "Napiling Programa:"}</span>
                  <span className="font-bold text-foreground">{activeApplication.trainingName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "Applicant Name:" : isBis ? "Ngalan sa Aplikante:" : "Pangalan ng Aplikante:"}</span>
                  <span className="font-bold text-foreground">{activeApplication.applicantInfo?.fullName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "QC ID Number:" : "QC ID Number:"}</span>
                  <span className="font-mono font-bold text-foreground">{activeApplication.qcid}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "Contact & Barangay:" : "Contact & Barangay:"}</span>
                  <span className="font-semibold text-foreground">{activeApplication.applicantInfo?.contactNo} • Brgy. {activeApplication.applicantInfo?.barangay}</span>
                </div>
              </div>
            </div>
          )}

          {/* APPLICATION FORM (shown if no application yet, or if revising/re-applying) */}
          {(!activeApplication || isRevising) && (
            <form onSubmit={handleSubmitApplication} className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
              <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {isEn ? "Apply for Training Program" : isBis ? "Mag-apply sa Programa sa Pagbansay" : "Mag-apply sa Programa ng Pagsasanay"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEn
                      ? "Fast-track application for Quezon City livelihood and skills training opportunities."
                      : isBis
                      ? "Paspas nga aplikasyon alang sa mga programa sa panginabuhi ug skills training sa QC."
                      : "Mabilisang aplikasyon para sa mga programang pangkabuhayan at skills training ng Quezon City."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${formStep === "select" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {isEn ? "1. Course" : isBis ? "1. Kurso" : "1. Kurso"}
                  </span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${formStep === "profile" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {isEn ? "2. Profile" : isBis ? "2. Impormasyon" : "2. Impormasyon"}
                  </span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${formStep === "review" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {isEn ? "3. Confirm" : isBis ? "3. Kumpirmasyon" : "3. Kumpirmasyon"}
                  </span>
                </div>
              </div>

              {/* Step 1: Selected Training */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wide">
                    {isEn ? "Step 1. Selected Training Program" : isBis ? "Step 1. Napiling Kurso sa Pagbansay" : "Step 1. Napiling Kursong Pagsasanay"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab("available")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    {isEn ? "Change Course →" : isBis ? "Ilisi ang Kurso →" : "Palitan ang Kurso →"}
                  </button>
                </div>

                {(() => {
                  const rawCourse = courses.find((c) => c.id === applyCourseId) || courses[0]
                  const selectedCourse = getLocalizedCourse(rawCourse)
                  return (
                    <div className="p-4 rounded-xl border border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-xs">
                          {getCourseIcon(selectedCourse.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">{selectedCourse.title}</p>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white">
                              {isEn ? "Selected" : isBis ? "Napili" : "Napili"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedCourse.durationHours} {isEn ? "Hours Intensive Training" : isBis ? "Oras nga Pagbansay" : "Oras ng Pagsasanay"} • {selectedCourse.date} ({selectedCourse.time})
                          </p>
                        </div>
                      </div>
                      <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                    </div>
                  )
                })()}
              </div>

              {/* Step 2: Auto-filled Applicant Information from User Profile */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wide">
                    {isEn
                      ? "Step 2. Applicant Profile (Auto-filled)"
                      : isBis
                      ? "Step 2. Impormasyon sa Aplikante (Auto-filled)"
                      : "Step 2. Impormasyon ng Aplikante (Auto-filled)"}
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {isEn ? "Verified Resident Profile" : isBis ? "Beripikadong Profile" : "Beripikadong Profile"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/20 border border-border text-xs text-muted-foreground flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    {isEn
                      ? "The following verified information is automatically loaded from your resident account so you do not need to re-type it."
                      : isBis
                      ? "Ang mosunod nga impormasyon awtomatikong gikuha gikan sa imong account aron dili na kinahanglan mag-type pag-usab."
                      : "Ang sumusunod na impormasyon ay kusang kinuha mula sa iyong account upang hindi mo na kailangang mag-type muli."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1.5">
                      QC ID / Reference Number
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-300/80 dark:border-gray-700 font-mono font-bold text-gray-700 dark:text-gray-300 cursor-not-allowed select-none shadow-xs">
                      {userQcid}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1.5">
                      {isEn ? "Full Name" : isBis ? "Tibuok Ngalan" : "Buong Pangalan"}
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-300/80 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 cursor-not-allowed select-none shadow-xs truncate">
                      {profile.firstName} {profile.middleName} {profile.lastName} {profile.suffix}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1.5">
                      {isEn ? "Email Address" : "Email Address"}
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-300/80 dark:border-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed select-none shadow-xs truncate">
                      {profile.email || "resident@quezoncity.gov.ph"}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1.5">
                      {isEn ? "Contact / Mobile Number" : isBis ? "Numero sa Telepono" : "Numero ng Telepono"}
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-300/80 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 cursor-not-allowed select-none shadow-xs">
                      {profile.contactNo || profile.mobileNumber || "0917 234 5678"}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1.5">
                      {isEn ? "Sex & Age" : isBis ? "Kinatawhan ug Edad" : "Kasarian at Edad"}
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-300/80 dark:border-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed select-none shadow-xs">
                      {profile.sex || "Female"} • {profile.age || "24"} {isEn ? "years old" : isBis ? "anyos" : "taong gulang"}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1.5">
                      {isEn ? "Barangay & City" : isBis ? "Barangay ug Dakbayan" : "Barangay at Lungsod"}
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-300/80 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300 cursor-not-allowed select-none shadow-xs truncate">
                      Brgy. {profile.barangay || "Sauyo"}, Quezon City
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Review Application */}
              <div className="space-y-3 pt-4 border-t border-border">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wide">
                  {isEn ? "Step 3. Review Application" : isBis ? "Step 3. Subaya ang Aplikasyon" : "Step 3. Repasuhin ang Aplikasyon"}
                </label>
                {(() => {
                  const rawPicked = courses.find((c) => c.id === applyCourseId) || courses[0]
                  const picked = getLocalizedCourse(rawPicked)
                  return (
                    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2 text-xs">
                      <div className="flex justify-between font-bold text-sm text-foreground">
                        <span>{picked.title}</span>
                        <span className="text-blue-600">{picked.durationHours} {isEn ? "Hours" : isBis ? "Oras" : "Oras"}</span>
                      </div>
                      <p className="text-muted-foreground">{isEn ? "Date:" : isBis ? "Petsa:" : "Petsa:"} <strong className="text-foreground">{picked.date}</strong> ({picked.time})</p>
                      <p className="text-muted-foreground">{isEn ? "Location:" : isBis ? "Lokasyon:" : "Lokasyon:"} <strong className="text-foreground">{picked.location}</strong></p>
                      <p className="text-muted-foreground italic">Landmark: {picked.landmark}</p>
                    </div>
                  )
                })()}

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAttested}
                    onChange={(e) => setIsAttested(e.target.checked)}
                    className="mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">
                    {isEn
                      ? "I hereby certify that all information provided is true and correct, and I commit to faithfully attend all 4 days (3 hours/day • 12 hours total) of the training program."
                      : isBis
                      ? "Gipamatud-an nako nga tinuod ang tanang impormasyon ug ako matinud-anong motambong sa tanang 4 ka adlaw sa pagbansay."
                      : "Pinatutunayan ko na totoo ang lahat ng impormasyong nakatala at ako ay tapat na dadalo sa lahat ng 4 na araw (3 oras bawat araw • 12 oras kabuuan) ng pagsasanay."}
                  </span>
                </label>
              </div>

              {/* Step 4: Submit Application */}
              <div className="pt-2 flex items-center justify-end gap-3">
                {isRevising && (
                  <button
                    type="button"
                    onClick={() => setIsRevising(false)}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted/40 text-xs font-bold text-muted-foreground cursor-pointer"
                  >
                    {isEn ? "Cancel" : isBis ? "Kanselaha" : "Kanselahin"}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !isAttested}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{isEn ? "Submitting..." : isBis ? "Gisumite..." : "Isinusumite..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{isEn ? "Submit Application" : isBis ? "Isumite ang Aplikasyon" : "Isumite ang Aplikasyon"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. TRAINING SCHEDULE CONTENT                                 */}
      {/* ============================================================ */}
      {activeTab === "schedule" && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isEn ? "Training Schedule & Attendance Tracker" : isBis ? "Iskedyul sa Pagbansay ug Attendance" : "Training Schedule & Attendance Record"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isEn
                ? "View your confirmed date, time, venue, and track live session attendance."
                : isBis
                ? "Tan-awa ang mga detalye sa adlaw, oras, lugar, ug subaya ang imong attendance."
                : "Tingnan ang detalye ng takdang araw, oras, venue, at subaybayan ang iyong attendance."}
            </p>
          </div>

          {!activeApplication || activeApplication.status !== "approved" ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <Calendar className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-foreground">
                {isEn ? "No Approved Training Schedule Yet" : isBis ? "Wala pay Naaprobahang Iskedyul" : "Wala Pang Naaprubahang Training Schedule"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isEn
                  ? "This section will be activated once your application has been APPROVED by the Gov Services Skills Development Division."
                  : isBis
                  ? "Mahimong aktibo kini nga seksyon kung APPROVED na ang imong aplikasyon gikan sa Gov Services Skills Development Division."
                  : "Magiging aktibo ang seksyong ito kapag APPROVED na ang iyong Training Application mula sa Gov Services Skills Development Division."}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab(activeApplication ? "apply" : "available")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2 mt-2"
              >
                <span>
                  {activeApplication
                    ? isEn ? "View Application Status" : isBis ? "Tan-awa ang Status" : "Tingnan ang Application Status"
                    : isEn ? "View Available Trainings" : isBis ? "Tan-awa ang mga Pagbansay" : "Tingnan ang Available Trainings"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Schedule Main Card */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                      {isEn ? "Confirmed Batch Schedule" : isBis ? "Kumpirmadong Iskedyul" : "Confirmed Batch Schedule"}
                    </span>
                    <h4 className="text-xl font-bold text-foreground mt-0.5">
                      {activeApplication.schedule?.trainingName || activeApplication.trainingName}
                    </h4>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 border border-blue-500/30 w-fit">
                    Status: {activeApplication.schedule?.trainingStatus || "Upcoming"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border">
                    <Calendar className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "Training Date" : isBis ? "Petsa sa Pagbansay" : "Petsa ng Pagsasanay"}</span>
                      <span className="font-bold text-foreground text-sm">{activeApplication.schedule?.trainingDate}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border">
                    <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "Training Time" : isBis ? "Oras sa Pagbansay" : "Oras ng Pagsasanay"}</span>
                      <span className="font-bold text-foreground text-sm">{activeApplication.schedule?.trainingTime}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border sm:col-span-2">
                    <MapPin className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "Location & Venue" : isBis ? "Lugar ug Landmark" : "Lokasyon at Landmark"}</span>
                      <span className="font-bold text-foreground text-sm block">{activeApplication.schedule?.trainingLocation}</span>
                      <span className="text-muted-foreground text-xs mt-0.5 block italic">
                        Landmark: {activeApplication.schedule?.landmark || "Across Puregold Batasan, Beside Batasan Hills Barangay Hall"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Attendance & Goal Progress Card */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <h4 className="text-base font-bold text-foreground">
                        {isEn ? "Daily Attendance & 3-Hour Goal Tracker" : isBis ? "Adlaw-adlaw nga Attendance & 3-Oras nga Tumong" : "Araw-araw na Attendance & 3-Oras na Goal Tracker"}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? "Attend 3 hours per day for 4 days (12 hours total). Complete all 4 daily sessions to unlock your official Certificate of Completion."
                        : isBis
                        ? "Tambong og 3 ka oras kada adlaw sulod sa 4 ka adlaw (12 ka oras tanan). Humanon ang tanang 4 ka adlaw aron ma-unlock ang imong Sertipiko."
                        : "Dumalo ng 3 oras bawat araw sa loob ng 4 na araw (12 oras kabuuan). Kumpletuhin ang lahat ng 4 araw para ma-unlock ang iyong Certificate of Completion."}
                    </p>
                  </div>
                  <div className="text-right shrink-0 bg-blue-500/10 border border-blue-500/20 px-3.5 py-2 rounded-xl">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">
                      {activeApplication.attendance?.hoursCompleted || 0} / 12 {isEn ? "Hours" : "Oras"}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {Math.min(4, Math.floor((activeApplication.attendance?.hoursCompleted || 0) / 3))} of 4 Days Completed
                    </span>
                  </div>
                </div>

                {/* Progress bar with percentage */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>{isEn ? "Training Progress" : "Progreso sa Pagsasanay"}</span>
                    <span className="text-blue-600 font-mono">
                      {Math.min(
                        100,
                        Math.round(((activeApplication.attendance?.hoursCompleted || 0) / 12) * 100)
                      )}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden p-0.5 border border-border">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-300 shadow-xs"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            4,
                            Math.round(((activeApplication.attendance?.hoursCompleted || 0) / 12) * 100)
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Interactive Daily Sessions Checklist */}
                <div className="space-y-2.5 pt-2">
                  {(activeApplication.attendance?.sessions || [
                    { day: 1, topic: "Orientation & Fundamental Skills", hours: 3, attended: false, date: "Day 1" },
                    { day: 2, topic: "Hands-on Application & Practical Work", hours: 3, attended: false, date: "Day 2" },
                    { day: 3, topic: "Specialized Techniques & Daily Assessment", hours: 3, attended: false, date: "Day 3" },
                    { day: 4, topic: "Final Output, Evaluation & Certificate Grant", hours: 3, attended: false, date: "Day 4" },
                  ]).map((sess) => (
                    <div
                      key={sess.day}
                      onClick={() => {
                        if (!sess.attended) {
                          handleUserCheckin(sess.day)
                        }
                      }}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                        sess.attended
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200 shadow-2xs cursor-default"
                          : "bg-muted/15 border-border hover:bg-blue-500/10 hover:border-blue-500/40 cursor-pointer group"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {sess.attended ? (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs bg-emerald-600 text-white ring-2 ring-emerald-500/30 select-none"
                            title={isEn ? "Session Completed (3 Hours)" : "Natapos na ang Sesyon (3 Oras)"}
                          >
                            <Check className="h-4 w-4 stroke-[3]" />
                          </div>
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105 shadow-xs bg-muted border border-border text-muted-foreground group-hover:border-blue-500 group-hover:bg-blue-500 group-hover:text-white"
                            title={isEn ? "Click to check-in 3 hours" : "I-click para mag-check in (3 oras)"}
                          >
                            D{sess.day}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                            Day {sess.day}: {sess.topic}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3 text-blue-500" />
                            <span><strong>3 Hours Daily Goal</strong> • {activeApplication.schedule?.trainingTime || "9:00 AM - 12:00 PM"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {sess.attended ? (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs select-none cursor-default inline-flex items-center justify-center">
                            Attended (3hrs)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUserCheckin(sess.day)
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center border border-blue-600 text-blue-600 group-hover:bg-blue-600 group-hover:text-white shadow-xs"
                          >
                            <span>{isEn ? "Check-in Day " + sess.day + " (3h)" : isBis ? "I-check-in Adlaw " + sess.day + " (3h)" : "I-check-in Araw " + sess.day + " (3h)"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Certificate Lock / Unlock Status Card */}
                {activeApplication.attendance?.completed ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-xs">
                        <Award className="h-6 w-6" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wide">
                          <Unlock className="h-3.5 w-3.5" />
                          <span>{isEn ? "Certificate Unlocked!" : isBis ? "Na-unlock ang Sertipiko!" : "Na-unlock ang Sertipiko!"}</span>
                        </div>
                        <p className="font-extrabold text-foreground text-sm sm:text-base">
                          {isEn ? "Congratulations! 100% Training Goal Completed." : isBis ? "Pahalipay! 100% Nakompleto ang Pagbansay." : "Binabati kita! 100% Nakumpleto ang Training Goal."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isEn ? "You have completed all 4 days (12 hours). Your official Certificate of Completion is ready to view and print." : isBis ? "Nahuman nimo ang tanang 4 ka adlaw (12 ka oras). Andam na ang imong opisyal nga sertipiko." : "Natapos mo ang lahat ng 4 na araw (12 oras). Handa na ang iyong opisyal na Certificate of Completion."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("history")
                        setCertificateModalApp(activeApplication)
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      <Award className="h-4 w-4" />
                      <span>{isEn ? "View & Print Certificate" : isBis ? "Tan-awa ang Sertipiko" : "Tingnan & I-print ang Sertipiko"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          {isEn ? "Official Certificate is Locked" : isBis ? "Naka-lock ang Opisyal nga Sertipiko" : "Naka-lock ang Opisyal na Sertipiko"}
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          {isEn
                            ? `Complete all 4 daily sessions (${12 - (activeApplication.attendance?.hoursCompleted || 0)} hours remaining) to unlock and receive your official Certificate.`
                            : isBis
                            ? `Kumpletuhon ang tanang 4 ka adlaw (${12 - (activeApplication.attendance?.hoursCompleted || 0)} ka oras ang nahabilin) aron makuha ang sertipiko.`
                            : `Kumpletuhin ang lahat ng 4 araw (${12 - (activeApplication.attendance?.hoursCompleted || 0)} oras ang natitira) para ma-unlock at makuha ang iyong Certificate of Completion.`}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold text-[11px] shrink-0 border border-amber-500/40 w-fit">
                      {Math.min(4, Math.floor((activeApplication.attendance?.hoursCompleted || 0) / 3))}/4 Days Done
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. TRAINING HISTORY & CERTIFICATES                           */}
      {/* ============================================================ */}
      {activeTab === "history" && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isEn ? "Training History & Official Certificates" : isBis ? "Kasaysayan sa Pagbansay ug Sertipiko" : "Kasaysayan ng Pagsasanay at Sertipiko"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isEn
                ? "Registry of your completed skills training programs and official Certificates of Completion. Certificates are unlocked only after finishing all 4 daily attendance sessions (3 hours/day)."
                : isBis
                ? "Talaan sa mga nahuman nimong training ug na-isyu nga mga Certificate of Completion. Ma-unlock lang kini human sa 4 ka adlaw nga pagbansay."
                : "Talaan ng mga natapos mong training program at mga naisyung Certificate of Completion. Mada-download o matitingnan lamang ang sertipiko kapag nakumpleto ang 4-Day Daily Attendance (3 oras bawat araw)."}
            </p>
          </div>

          {/* Active In-Progress Training Banner (If not yet completed) */}
          {activeApplication && activeApplication.status === "approved" && !activeApplication.attendance?.completed && (
            <div className="bg-card border border-amber-500/30 bg-amber-500/5 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                    {isEn ? "TRAINING IN PROGRESS" : "KASALUKUYANG PAGSASANAY"}
                  </span>
                  <h4 className="font-bold text-base text-foreground">
                    {activeApplication.trainingName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {isEn
                      ? `Attendance Progress: ${Math.min(4, Math.floor((activeApplication.attendance?.hoursCompleted || 0) / 3))}/4 Days (${activeApplication.attendance?.hoursCompleted || 0}/12 Hours). Complete remaining sessions to unlock Certificate.`
                      : `Progreso: ${Math.min(4, Math.floor((activeApplication.attendance?.hoursCompleted || 0) / 3))}/4 Araw (${activeApplication.attendance?.hoursCompleted || 0}/12 Oras). Kumpletuhin ang mga natitirang araw para makuha ang Sertipiko.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Target className="h-4 w-4" />
                <span>{isEn ? "Go to Daily Attendance" : "Pumunta sa Daily Attendance"}</span>
              </button>
            </div>
          )}

          {completedTrainings.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
                <Award className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-foreground">
                {isEn ? "No Completed Training Records Yet" : isBis ? "Wala pay Nahuman nga Pagbansay" : "Wala Pang Natapos na Pagsasanay"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isEn
                  ? "When you finish all 4 days (3 hours per day • 12 hours total) of skills training, your official Certificate of Completion will automatically appear and unlock here."
                  : isBis
                  ? "Kung mahuman nimo ang tanang 4 ka adlaw (3 ka oras kada adlaw) nga skills training, dinhi nimo makita ug ma-download ang imong opisyal nga sertipiko."
                  : "Kapag natapos mo ang lahat ng 4 na araw (3 oras bawat araw • 12 oras kabuuan) ng skills training, dito mo makikita at mada-download ang iyong opisyal na sertipiko."}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab(activeApplication ? "schedule" : "available")}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2 mt-2"
              >
                <span>{activeApplication ? (isEn ? "Complete Daily Attendance" : "Kumpletuhin ang Attendance") : (isEn ? "Explore Available Trainings" : "Maghanap ng Training Program")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTrainings.map((app) => (
                <div
                  key={app.id}
                  className="bg-card border border-emerald-500/30 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500/5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                        {isEn ? "COMPLETED (12 HOURS • 4 DAYS)" : isBis ? "NAHUMAN (12 KA ORAS • 4 KA ADLAW)" : "NAKUMPLETO (12 ORAS • 4 NA ARAW)"}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">REF {app.referenceNumber}</span>
                    </div>
                    <h4 className="font-bold text-base text-foreground">
                      {app.trainingName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {isEn ? "Completed on:" : isBis ? "Nahuman niadtong:" : "Natapos noong:"} <strong>{app.schedule?.trainingDate || "Recent"}</strong> {isEn ? "at" : "sa"} {app.schedule?.trainingLocation}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCertificateModalApp(app)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>{isEn ? "View & Print Certificate" : isBis ? "Tan-awa ug I-print ang Sertipiko" : "Tingnan at I-print ang Sertipiko"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TRAINING DETAILS                                      */}
      {/* ============================================================ */}
      {isDetailModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  {getCourseIcon(selectedCourse.id)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedCourse.title}</h3>
                  <p className="text-xs text-muted-foreground">{selectedCourse.durationHours} {isEn ? "Hours Skills Development Program" : "Hours Skills Development Program"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "What You Will Learn:" : isBis ? "Unsay Imong Makat-onan:" : "Ano ang Matututunan:"}</span>
                <p className="text-foreground leading-relaxed mt-0.5">{selectedCourse.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "Date:" : isBis ? "Petsa:" : "Petsa:"}</span>
                  <span className="font-bold text-foreground">{selectedCourse.date}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "Time:" : isBis ? "Oras:" : "Oras:"}</span>
                  <span className="font-bold text-foreground">{selectedCourse.time}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "Location & Landmark:" : isBis ? "Lugar ug Landmark:" : "Lokasyon at Landmark:"}</span>
                <span className="font-bold text-foreground block">{selectedCourse.location}</span>
                <span className="text-muted-foreground italic text-[11px] mt-0.5 block">{selectedCourse.landmark}</span>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="font-semibold text-muted-foreground block text-[11px]">{isEn ? "Instructor & Materials:" : isBis ? "Tigtudlo ug Gamit:" : "Instructor & Materials:"}</span>
                <p className="text-foreground font-medium">{selectedCourse.instructor}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">{isEn ? "Provided materials:" : isBis ? "Libreng gamit:" : "Libreng gamit:"} {selectedCourse.materialsProvided}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isEn ? "Close" : isBis ? "Isira" : "Isara"}
              </button>
              {allUserApplications.some(
                (a) =>
                  (a.trainingId === selectedCourse.id ||
                    a.trainingName?.toLowerCase() === selectedCourse.title?.toLowerCase() ||
                    a.schedule?.trainingName?.toLowerCase() === selectedCourse.title?.toLowerCase()) &&
                  a.status !== "rejected"
              ) ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    setActiveTab(activeApplication?.status === "approved" ? "schedule" : "apply")
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isEn ? "View Training Status" : "Tingnan ang Status"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : hasActiveOngoingTraining ? (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2 rounded-xl bg-muted text-muted-foreground border border-border text-xs font-bold shadow-xs cursor-not-allowed opacity-60"
                  title={isEn ? "Complete your active training first" : "Kumpletuhin muna ang kasalukuyang training"}
                >
                  <span>{isEn ? "Currently in Training" : "May Aktibong Training"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectToApply(selectedCourse)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isEn ? "Apply for This Training" : isBis ? "Mag-apply niining Pagbansay" : "Mag-apply sa Training na Ito"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: OFFICIAL CERTIFICATE OF COMPLETION                    */}
      {/* ============================================================ */}
      {certificateModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header controls */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                <span className="font-bold text-sm text-foreground">Official Certificate Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setCertificateModalApp(null)}
                className="text-muted-foreground hover:text-foreground text-base font-bold px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Certificate Canvas */}
            <div
              id="qc-official-certificate"
              className="bg-white text-slate-900 border-8 border-double border-amber-600/60 rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-md relative"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {/* Seal and headers */}
              <div className="flex items-center justify-center gap-3">
                <img
                  src="/samples/Government Service Integrity Seal.png"
                  alt="QC Seal"
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none"
                  }}
                />
                <div>
                  <h5 className="text-[11px] font-bold tracking-widest text-slate-700 uppercase">
                    Republic of the Philippines
                  </h5>
                  <h4 className="text-base font-extrabold tracking-wide text-[#0F172A]">
                    GOV SERVICES
                  </h4>
                  <p className="text-[10px] text-slate-600 tracking-wider uppercase">
                    Social Services Development Department • Skills Training Division
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] tracking-widest text-amber-700 font-bold uppercase block">
                  Certificate of Completion
                </span>
                <div className="w-24 h-0.5 bg-amber-600 mx-auto mt-1 mb-3" />
                <p className="text-xs text-slate-600 italic">
                  {isEn
                    ? "This certificate is proudly presented to"
                    : isBis
                    ? "Kini nga sertipiko mapasigarbohong gihatag kang"
                    : "Ipinagkakaloob ang katibayang ito kay"}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 underline decoration-amber-600 underline-offset-8 mt-1.5 mb-3">
                  {certificateModalApp.applicantInfo?.fullName || "CLARISA MAE GALIAS DIMAL"}
                </h3>
                <p className="text-xs text-slate-700 max-w-lg mx-auto leading-relaxed">
                  {isEn ? (
                    <>
                      for the successful completion of <strong>12 Hours of Intensive Skills Training (4 Days • 3 hrs/day)</strong> in the course of{" "}
                      <strong>{certificateModalApp.trainingName}</strong> held at Gov Services Skills Development Center, Batasan Hills.
                    </>
                  ) : isBis ? (
                    <>
                      alang sa malamposong paghuman sa <strong>12 ka Oras sa Pagsasanay (4 ka Adlaw • 3 ka oras/adlaw)</strong> sa ilalom sa{" "}
                      kursong <strong>{certificateModalApp.trainingName}</strong> nga gipahigayon sa Gov Services Skills Development Center, Batasan Hills.
                    </>
                  ) : (
                    <>
                      para sa matagumpay na pagtatapos ng <strong>12 Oras ng Masinsinang Pagsasanay (4 na Araw • 3 oras/araw)</strong> sa ilalim ng{" "}
                      kursong <strong>{certificateModalApp.trainingName}</strong> na ginanap sa Gov Services Skills Development Center, Batasan Hills.
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 text-left text-[10px] text-slate-600 border-t border-slate-200">
                <div>
                  <p>Certificate No: <strong className="font-mono text-slate-900">{certificateModalApp.certificate?.certificateNo || `GOV-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`}</strong></p>
                  <p>{isEn ? "Issue Date:" : isBis ? "Petsa sa Pag-isyu:" : "Petsa ng Pag-isyu:"} <strong className="text-slate-900">{certificateModalApp.certificate?.issueDate || new Date().toLocaleDateString()}</strong></p>
                  <p>QC ID: <strong className="font-mono text-slate-900">{certificateModalApp.qcid}</strong></p>
                </div>

                <div className="text-right">
                  <div className="w-32 h-10 border-b border-slate-400 ml-auto mb-1 flex items-end justify-center">
                    <span className="font-script text-xs text-slate-700 italic">Gov Services Skills Director</span>
                  </div>
                  <p className="font-bold text-slate-800">ATTY. MARIQUITA BELMONTE</p>
                  <p className="text-[9px] text-slate-500">SSDD Department Head</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setCertificateModalApp(null)}
                className="px-4 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 text-foreground text-xs font-semibold cursor-pointer"
              >
                {isEn ? "Close" : isBis ? "Isira" : "Isara"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>{isEn ? "Print Certificate" : isBis ? "I-print ang Sertipiko" : "I-print ang Sertipiko"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
