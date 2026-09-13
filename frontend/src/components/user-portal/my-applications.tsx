import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  FileText,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Banknote,
  MapPin,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  GraduationCap,
  Package,
  Wrench,
  ExternalLink,
  Award,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import { getCurrentUserProfile } from "../../utils/userProfile"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import {
  FIXED_ASSISTANCE_AMOUNTS,
  resolveFixedAmount,
  getSavedDisbursements,
  checkAndAutoReleaseScheduledDisbursements,
  isIdOrDocumentService,
  isTrainingService,
} from "../../utils/financialAidSync"
import { useLanguage } from "../ui/language-context"

export type ApplicationStatus =
  | "Pending"
  | "Under Review"
  | "For Assessment"
  | "Approved"
  | "For Release"
  | "Released"
  | "Completed"
  | "Rejected"
  | "Needs Revision"

export interface ApplicationRecord {
  applicationNo: string
  assistance: string
  assistanceCategory: string
  dateApplied: string
  status: ApplicationStatus
  applicantName: string
  dateOfBirth: string
  address: string
  contactNumber: string
  email?: string
  remarks?: string
  deletedAt?: string
}

export function isTrainingApplication(app?: { assistance?: string; assistanceCategory?: string } | null) {
  if (!app) return false
  const cat = String(app.assistanceCategory || "").toLowerCase()
  const ast = String(app.assistance || "").toLowerCase()
  return (
    cat.includes("training") ||
    ast.includes("training") ||
    isTrainingService(`${cat} ${ast}`)
  )
}

export function isIdOrDocumentApplication(app?: { assistance?: string; assistanceCategory?: string } | null) {
  if (!app || isTrainingApplication(app)) return false
  return isIdOrDocumentService(`${app.assistanceCategory || ""} ${app.assistance || ""}`)
}

export default function MyApplications() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active")
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [deletedApplications, setDeletedApplications] = useState<ApplicationRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null)

  // Dialog modal states
  const [appToDelete, setAppToDelete] = useState<ApplicationRecord | null>(null)
  const [appToPermanentDelete, setAppToPermanentDelete] = useState<ApplicationRecord | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: "success" | "danger" } | null>(null)

  const showToast = (text: string, type: "success" | "danger" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // 1. SOFT DELETE (Move to Deleted)
  const handleConfirmDelete = async () => {
    if (!appToDelete) return
    setIsProcessing(true)
    const appNo = appToDelete.applicationNo
    const appAssistance = appToDelete.assistance
    const deletedRecord: ApplicationRecord = {
      ...appToDelete,
      deletedAt: new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }

    try {
      await fetch(`${API_BASE}/api/user-applications/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNo: appNo,
          referenceNo: appNo,
          category: appToDelete.assistanceCategory,
          assistance: appAssistance,
          applicantName: appToDelete.applicantName,
          email: appToDelete.email,
          dateOfBirth: appToDelete.dateOfBirth,
          address: appToDelete.address,
          contactNumber: appToDelete.contactNumber,
          status: appToDelete.status,
          dateApplied: appToDelete.dateApplied,
          reason: "Deleted by user from Application History",
          payload: deletedRecord,
        }),
      })

      // Update LocalStorage deleted items
      try {
        const storedDeleted: ApplicationRecord[] = JSON.parse(
          localStorage.getItem("deleted_user_applications") || "[]"
        )
        const updatedDeleted = [
          deletedRecord,
          ...storedDeleted.filter((d) => d.applicationNo !== appNo || d.assistance !== appAssistance),
        ]
        localStorage.setItem("deleted_user_applications", JSON.stringify(updatedDeleted))
      } catch {}

      // Update UI state immediately
      setApplications((prev) => prev.filter((a) => !(a.applicationNo === appNo && a.assistance === appAssistance)))
      setDeletedApplications((prev) => [
        deletedRecord,
        ...prev.filter((d) => !(d.applicationNo === appNo && d.assistance === appAssistance)),
      ])

      if (selectedApp?.applicationNo === appNo && selectedApp?.assistance === appAssistance) {
        setSelectedApp(null)
      }
      showToast(`Moved ${appAssistance} to Deleted Applications.`)
    } catch (err) {
      console.error("Failed deleting application:", err)
      showToast("An error occurred while deleting application.", "danger")
    } finally {
      setIsProcessing(false)
      setAppToDelete(null)
    }
  }

  // 2. RESTORE APPLICATION
  const handleRestore = async (app: ApplicationRecord) => {
    setIsProcessing(true)
    const appNo = app.applicationNo
    const appAssistance = app.assistance

    try {
      await fetch(`${API_BASE}/api/user-applications/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNo: appNo,
          referenceNo: appNo,
          category: app.assistanceCategory,
          assistance: appAssistance,
          applicantName: app.applicantName,
        }),
      })

      // Clean from LocalStorage deleted
      try {
        const storedDeleted: ApplicationRecord[] = JSON.parse(
          localStorage.getItem("deleted_user_applications") || "[]"
        )
        const updatedDeleted = storedDeleted.filter(
          (d) => !(d.applicationNo === appNo && d.assistance === appAssistance)
        )
        localStorage.setItem("deleted_user_applications", JSON.stringify(updatedDeleted))
      } catch {}

      // Update UI state
      setDeletedApplications((prev) =>
        prev.filter((d) => !(d.applicationNo === appNo && d.assistance === appAssistance))
      )
      setApplications((prev) => [
        app,
        ...prev.filter((a) => !(a.applicationNo === appNo && a.assistance === appAssistance)),
      ])

      if (selectedApp?.applicationNo === appNo && selectedApp?.assistance === appAssistance) {
        setSelectedApp(null)
      }
      showToast(`Successfully restored ${appAssistance} to active applications.`)
    } catch (err) {
      console.error("Failed restoring application:", err)
      showToast("Could not restore application at this time.", "danger")
    } finally {
      setIsProcessing(false)
    }
  }

  // 3. PERMANENT DELETE (Hard Delete from Database)
  const handleConfirmPermanentDelete = async () => {
    if (!appToPermanentDelete) return
    setIsProcessing(true)
    const appNo = appToPermanentDelete.applicationNo
    const appAssistance = appToPermanentDelete.assistance

    try {
      await fetch(`${API_BASE}/api/user-applications/permanent-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNo: appNo,
          referenceNo: appNo,
          category: appToPermanentDelete.assistanceCategory,
          assistance: appAssistance,
          applicantName: appToPermanentDelete.applicantName,
        }),
      })

      // Clean local storage caches completely
      try {
        const localPwd = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
        localStorage.setItem(
          "pwd_senior_applications",
          JSON.stringify(
            localPwd.filter((p: any) => p.assignedIdNumber !== appNo && p.referenceNumber !== appNo && p.id !== appNo)
          )
        )
      } catch {}

      try {
        const localLiv = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
        localStorage.setItem(
          "livelihood_applications",
          JSON.stringify(localLiv.filter((l: any) => l.reference_number !== appNo && l.qcid !== appNo))
        )
      } catch {}

      try {
        const localTrn = JSON.parse(localStorage.getItem("training_applications") || "[]")
        localStorage.setItem(
          "training_applications",
          JSON.stringify(localTrn.filter((t: any) => t.reference_number !== appNo && t.qcid !== appNo))
        )
      } catch {}

      try {
        const storedDeleted: ApplicationRecord[] = JSON.parse(
          localStorage.getItem("deleted_user_applications") || "[]"
        )
        const updatedDeleted = storedDeleted.filter(
          (d) => !(d.applicationNo === appNo && d.assistance === appAssistance)
        )
        localStorage.setItem("deleted_user_applications", JSON.stringify(updatedDeleted))
      } catch {}

      // Update UI state
      setDeletedApplications((prev) =>
        prev.filter((d) => !(d.applicationNo === appNo && d.assistance === appAssistance))
      )
      setApplications((prev) => prev.filter((a) => !(a.applicationNo === appNo && a.assistance === appAssistance)))

      if (selectedApp?.applicationNo === appNo && selectedApp?.assistance === appAssistance) {
        setSelectedApp(null)
      }
      showToast(`Permanently deleted ${appAssistance} from database.`, "danger")
    } catch (err) {
      console.error("Failed permanent deletion:", err)
      showToast("An error occurred during permanent deletion.", "danger")
    } finally {
      setIsProcessing(false)
      setAppToPermanentDelete(null)
    }
  }

  // Load active and deleted applications
  useEffect(() => {
    const fetchUserApps = async () => {
      checkAndAutoReleaseScheduledDisbursements()

      const userProfile = getCurrentUserProfile()
      const qcId = (userProfile.qcidNo || "").trim()
      const userId = userProfile.id || localStorage.getItem("userId") || "1"
      const userEmail = (userProfile.email || "").trim().toLowerCase()
      const userFirst = (userProfile.firstName || "").trim().toLowerCase()
      const userLast = (userProfile.lastName || "").trim().toLowerCase()

      // Fetch deleted list from backend & local storage
      let initialDeleted: ApplicationRecord[] = []
      try {
        const storedDel = localStorage.getItem("deleted_user_applications")
        if (storedDel) initialDeleted = JSON.parse(storedDel)
      } catch {}

      try {
        const delRes = await fetch(
          `${API_BASE}/api/user-applications/deleted?email=${encodeURIComponent(userEmail)}&qcid=${encodeURIComponent(
            qcId
          )}&name=${encodeURIComponent(userFirst + " " + userLast)}`
        )
        if (delRes.ok) {
          const delData = await delRes.json()
          if (delData.applications && Array.isArray(delData.applications)) {
            const mappedDel: ApplicationRecord[] = delData.applications.map((d: any) => ({
              applicationNo: d.referenceNo || d.applicationId || "N/A",
              assistance: d.assistanceTitle || d.payload?.assistance || "Social Assistance",
              assistanceCategory: d.category || d.payload?.assistanceCategory || "General",
              dateApplied: d.payload?.dateApplied || new Date(d.archivedAt || Date.now()).toLocaleDateString("en-PH"),
              status: d.status || d.payload?.status || "Approved",
              applicantName:
                d.applicantName || d.payload?.applicantName || `${userProfile.firstName} ${userProfile.lastName}`,
              dateOfBirth: d.payload?.dateOfBirth || userProfile.birthDateDisplay,
              address:
                d.payload?.address ||
                `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
              contactNumber: d.payload?.contactNumber || userProfile.mobileNumber,
              email: d.email || userProfile.email,
              deletedAt: new Date(d.archivedAt || Date.now()).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            }))

            // Merge unique
            const mapKeys = new Set(initialDeleted.map((i) => i.applicationNo + i.assistance))
            mappedDel.forEach((m) => {
              if (!mapKeys.has(m.applicationNo + m.assistance)) {
                initialDeleted.push(m)
              }
            })
          }
        }
      } catch (err) {
        console.warn("Could not fetch deleted applications:", err)
      }

      setDeletedApplications(initialDeleted)
      const deletedKeySet = new Set(initialDeleted.map((d) => (d.applicationNo + "::" + d.assistance).toLowerCase()))

      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || ""
      const sessionToken = sessionStorage.getItem("sessionToken") || localStorage.getItem("sessionToken") || ""
      const authHeaders: Record<string, string> = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        ...(userEmail ? { "x-user-email": userEmail } : {}),
      }

      let allFoundApps: ApplicationRecord[] = []

      // 1. AICS Applications
      try {
        const res = await fetch(`${API_BASE}/api/aics/applications?qcId=${encodeURIComponent(qcId)}`, { headers: authHeaders })
        if (res.ok) {
          const data = await res.json()
          if (data.applications && Array.isArray(data.applications)) {
            const mappedAics: ApplicationRecord[] = data.applications
              .filter((app: any) => {
                if (app.is_archived === true) return false
                const appQc = String(app.qc_id || app.reference_no || app.reference_number || "").trim().toLowerCase()
                const appEmail = String(app.email || "").trim().toLowerCase()
                const appName = String(app.full_name || "").trim().toLowerCase()
                const matchQc = qcId !== "" && appQc === qcId.toLowerCase()
                const matchEmail = userEmail !== "" && appEmail === userEmail
                const matchName = userFirst !== "" && userLast !== "" && appName.includes(userFirst) && appName.includes(userLast)
                return Boolean(matchQc || matchEmail || matchName)
              })
              .map((app: any) => {
                const rawType = (app.assistance_type || "Transportation").replace(/\s*assistance/gi, "").trim()
                const cleanAssistance = rawType.charAt(0).toUpperCase() + rawType.slice(1) + " Assistance"

                return {
                  applicationNo: app.qc_id || app.reference_no || app.reference_number || qcId,
                  assistance: cleanAssistance,
                  assistanceCategory: "AICS",
                  dateApplied: new Date(app.created_at || Date.now()).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                  status:
                    app.status === "approved"
                      ? "Approved"
                      : app.status === "released"
                      ? "Released"
                      : app.status === "for_release"
                      ? "For Release"
                      : app.status === "assessment"
                      ? "For Assessment"
                      : "Under Review",
                  applicantName: app.full_name || `${userProfile.firstName} ${userProfile.lastName}`,
                  dateOfBirth: app.birth_date || userProfile.birthDateDisplay,
                  address:
                    app.address ||
                    `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                  contactNumber: app.contact_number || userProfile.mobileNumber,
                  email: app.email || userProfile.email,
                }
              })
            allFoundApps.push(...mappedAics)
          }
        }
      } catch (err) {
        console.warn("Could not fetch AICS applications:", err)
      }

      // 2. PWD & Senior Citizen Applications
      try {
        let apiPwdApps: any[] = []
        try {
          const pwdRes = await fetch(`${API_BASE}/api/pwd-senior/applications`, { headers: authHeaders })
          if (pwdRes.ok) {
            apiPwdApps = await pwdRes.json()
          }
        } catch {}

        let localPwdApps: any[] = []
        try {
          localPwdApps = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
        } catch {}

        let pwdApps: any[] = []
        if (Array.isArray(apiPwdApps) && apiPwdApps.length > 0) {
          pwdApps = apiPwdApps
          try {
            localStorage.setItem("pwd_senior_applications", JSON.stringify(apiPwdApps))
          } catch {}
        } else if (Array.isArray(apiPwdApps)) {
          // Server returned empty list -> keep in sync
          pwdApps = []
          try {
            localStorage.setItem("pwd_senior_applications", JSON.stringify([]))
          } catch {}
        } else {
          pwdApps = Array.isArray(localPwdApps) ? localPwdApps : []
        }

        const mappedPwd: ApplicationRecord[] = (pwdApps || [])
          .filter((p: any) => {
            if (p.is_archived === true) return false
            const pRef = String(p.referenceNumber || "").trim().toLowerCase()
            const pAssigned = String(p.assignedIdNumber || "").trim().toLowerCase()
            const pEmail = String(p.email || "").trim().toLowerCase()
            const pQc = String(p.qcidNo || p.qcid || "").trim().toLowerCase()
            const pFirst = String(p.firstName || "").trim().toLowerCase()
            const pLast = String(p.lastName || "").trim().toLowerCase()

            const matchQc = qcId !== "" && (pRef === qcId.toLowerCase() || pQc === qcId.toLowerCase() || pAssigned === qcId.toLowerCase())
            const matchEmail = userEmail !== "" && pEmail === userEmail
            const matchName = userFirst !== "" && userLast !== "" && pFirst.includes(userFirst) && pLast.includes(userLast)

            return Boolean(matchQc || matchEmail || matchName)
          })
          .map((p: any) => {
            const isPwd =
              String(p.category || "").toUpperCase() === "PWD" ||
              String(p.category || "").toLowerCase().includes("disability")
            const typeStr = String(p.type || "new").toLowerCase()
            const serviceTitle = isPwd
              ? typeStr === "assistance"
                ? "PWD Social Assistance"
                : typeStr === "renewal"
                ? "Persons with Disability (PWD) ID Renewal"
                : typeStr === "loss" || typeStr === "replacement"
                ? "Persons with Disability (PWD) ID Replacement"
                : "Persons with Disability (PWD) ID"
              : typeStr === "medicine-booklet"
              ? "Senior Citizen Medicine Booklet"
              : typeStr === "movie-booklet"
              ? "Senior Citizen Movie Booklet"
              : typeStr === "social-assistance"
              ? "Senior Citizen Social Assistance"
              : typeStr === "renewal"
              ? "Senior Citizen ID Renewal"
              : typeStr === "loss" || typeStr === "replacement"
              ? "Senior Citizen ID Replacement"
              : "Senior Citizen ID"

            let appStatus: ApplicationStatus = "Pending"
            if (p.status === "approved") appStatus = "Approved"
            else if (p.status === "released") appStatus = "Released"
            else if (p.status === "for_release") appStatus = "For Release"
            else if (p.status === "under_review" || p.status === "review") appStatus = "Under Review"

            const isBooklet =
              String(p.type || "").toLowerCase().includes("booklet") ||
              String(p.category || "").toLowerCase().includes("booklet")

            return {
              applicationNo: p.assignedIdNumber || p.referenceNumber || p.qcidNo || qcId,
              assistance: serviceTitle,
              assistanceCategory: isPwd ? "PWD" : "Senior Citizen",
              dateApplied: new Date(p.submittedAt || p.created_at || Date.now()).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              status: appStatus,
              applicantName: [p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean).join(" "),
              dateOfBirth: p.dateOfBirth || userProfile.birthDateDisplay,
              address:
                p.address ||
                `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
              contactNumber: p.contactNo || p.cellphoneNo || userProfile.mobileNumber,
              email: p.email || userProfile.email,
              remarks:
                p.status === "approved"
                  ? isBooklet
                    ? `Approved. Official Booklet Number: ${p.assignedIdNumber || "Sent to your registered Gmail"}`
                    : `Approved. Assigned ID Number: ${p.assignedIdNumber || "Available at office"}`
                  : p.status === "rejected"
                  ? `Review required: ${p.rejectionReason || "Incomplete documentation."}`
                  : "Currently being reviewed by social worker.",
            }
          })
        allFoundApps.push(...mappedPwd)
      } catch (err) {
        console.warn("Could not fetch PWD/Senior applications:", err)
      }

      // 3. Solo Parent Applications
      try {
        let spApps: any[] = []
        try {
          const spRes = await fetch(`${API_BASE}/api/solo-parent/user/${userId || "0"}?qcid=${encodeURIComponent(qcId)}&email=${encodeURIComponent(userEmail)}`, { headers: authHeaders })
          if (spRes.ok) {
            const spData = await spRes.json()
            spApps = spData.applications || spData || []
          }
        } catch {}

        if (!spApps || spApps.length === 0) {
          try {
            const local = localStorage.getItem("solo_parent_applications")
            if (local) spApps = JSON.parse(local)
          } catch {}
        }

        if (Array.isArray(spApps) && spApps.length > 0) {
          const mappedSp: ApplicationRecord[] = spApps
            .filter((app: any) => {
              if (app.is_archived === true) return false
              const appQc = String(app.qcid_number || app.qc_id || app.reference_number || "").trim().toLowerCase()
              const appEmail = String(app.email || "").trim().toLowerCase()
              const uQc = qcId.toLowerCase()
              const appName = `${app.first_name || app.firstName || ""} ${app.last_name || app.lastName || ""}`.trim().toLowerCase()
              const uName = `${userProfile.firstName} ${userProfile.lastName}`.trim().toLowerCase()
              return (
                (uQc !== "" && appQc.includes(uQc)) ||
                (uQc !== "" && uQc.includes(appQc)) ||
                (userEmail !== "" && appEmail === userEmail) ||
                (uName !== "" && appName === uName) ||
                (app.user_id && String(app.user_id) === String(userId))
              )
            })
            .map((app: any) => ({
              applicationNo: app.reference_number || app.referenceNumber || app.assigned_id_number || app.solo_parent_id_number || qcId,
              assistance: `Solo Parent ID (${(app.application_type || app.applicationType || "New").charAt(0).toUpperCase() + (app.application_type || app.applicationType || "New").slice(1)})`,
              assistanceCategory: "Solo Parent",
              dateApplied: new Date(app.created_at || app.submittedAt || Date.now()).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              status:
                app.application_status === "approved" || app.status === "approved"
                  ? "Approved"
                  : app.application_status === "released" || app.status === "released"
                  ? "Released"
                  : app.application_status === "for_release" || app.status === "for_release"
                  ? "For Release"
                  : "Under Review",
              applicantName:
                [app.first_name || app.firstName, app.last_name || app.lastName].filter(Boolean).join(" ") ||
                `${userProfile.firstName} ${userProfile.lastName}`,
              dateOfBirth: userProfile.birthDateDisplay,
              address:
                app.address ||
                `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
              contactNumber: app.contact_no || app.contact_number || app.contactNo || userProfile.mobileNumber,
              email: app.email || userProfile.email,
              remarks:
                app.admin_notes ||
                (app.application_status === "approved" || app.status === "approved"
                  ? app.assigned_id_number || app.solo_parent_id_number
                    ? `Approved. Official ID: ${app.assigned_id_number || app.solo_parent_id_number}`
                    : "Application approved"
                  : "Under review"),
            }))
          allFoundApps.push(...mappedSp)
        }
      } catch (err) {
        console.warn("Could not fetch Solo Parent applications:", err)
      }

      // 4. Child Welfare Applications
      try {
        const cwRes = await fetch(`${API_BASE}/api/child-welfare/user/${userId}?qcid=${encodeURIComponent(qcId)}&email=${encodeURIComponent(userEmail)}`, { headers: authHeaders })
        if (cwRes.ok) {
          const cwData = await cwRes.json()
          if (cwData.applications && Array.isArray(cwData.applications)) {
            const mappedCw: ApplicationRecord[] = cwData.applications
              .filter((app: any) => {
                if (app.is_archived === true) return false
                const appQc = String(app.reference_number || app.qc_id || "").trim().toLowerCase()
                const appEmail = String(app.email || "").trim().toLowerCase()
                const uQc = qcId.toLowerCase()
                return (
                  (uQc !== "" && appQc === uQc) ||
                  (userEmail !== "" && appEmail === userEmail) ||
                  (app.user_id && String(app.user_id) === String(userId))
                )
              })
              .map((app: any) => ({
                applicationNo: app.reference_number || qcId,
                assistance: app.category_title || "Child Welfare Assistance",
                assistanceCategory: "Child Welfare",
                dateApplied: new Date(app.created_at || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status:
                  app.application_status === "approved" || app.status === "approved"
                    ? "Approved"
                    : app.application_status === "released" || app.status === "released" || app.application_status === "completed" || app.status === "completed"
                    ? "Released"
                    : app.application_status === "rejected" || app.status === "rejected"
                    ? "Rejected"
                    : "Under Review",
                applicantName: app.child_name || [app.guardian_first_name, app.guardian_last_name].filter(Boolean).join(" ") || "Beneficiary Child",
                dateOfBirth: userProfile.birthDateDisplay,
                address:
                  app.address ||
                  `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                contactNumber: app.guardian_contact_no || app.contact_number || userProfile.mobileNumber,
                email: app.guardian_email || app.email || userProfile.email,
                remarks:
                  app.application_status === "approved"
                    ? `Aprubado para sa Ayuda (₱${(Number(app.approved_amount) || 5000).toLocaleString()}) - Nakatala sa Financial Aid & Appointments`
                    : app.application_status === "released"
                    ? `Na-release na ang Ayuda (₱${(Number(app.approved_amount) || 5000).toLocaleString()})`
                    : app.application_status === "rejected"
                    ? (app.rejection_reason ? `Tinanggihan: ${app.rejection_reason}` : "Tinanggihan")
                    : "Kasalukuyang sinusuri (Under review)",
              }))
            allFoundApps.push(...mappedCw)
          }
        }
      } catch (err) {
        console.warn("Could not fetch Child Welfare applications:", err)
      }

      // 5. Livelihood Applications
      try {
        let livApps: any[] = []
        try {
          const livRes = await fetch(`${API_BASE}/api/livelihood/applications`, { headers: authHeaders })
          if (livRes.ok) {
            const lData = await livRes.json()
            livApps = lData.applications || (Array.isArray(lData) ? lData : [])
          }
        } catch {}

        if (livApps.length === 0 && (qcId || userId)) {
          try {
            const livRes2 = await fetch(`${API_BASE}/api/livelihood/applications?qcid=${encodeURIComponent(qcId || userId)}`, { headers: authHeaders })
            if (livRes2.ok) {
              const lData2 = await livRes2.json()
              livApps = lData2.applications || (Array.isArray(lData2) ? lData2 : [])
            }
          } catch {}
        }

        try {
          const localLiv = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
          if (Array.isArray(localLiv) && localLiv.length > 0) {
            for (const la of localLiv) {
              const exists = livApps.some(
                (a: any) =>
                  (a.id && la.id && a.id === la.id) ||
                  (a.reference_number && la.reference_number && a.reference_number === la.reference_number)
              )
              if (!exists) {
                livApps.push(la)
              }
            }
          }
        } catch {}

        const storedActiveRef = localStorage.getItem("active_livelihood_ref") || ""

        if (Array.isArray(livApps) && livApps.length > 0) {
          const mappedLiv: ApplicationRecord[] = livApps
            .filter((l: any) => {
              if (l.is_archived === true) return false
              const lQc = String(l.qcid || l.reference_number || l.referenceNumber || l.user_id || l.userId || "").trim().toLowerCase()
              const lEmail = String(l.email || "").trim().toLowerCase()
              const lFirst = String(l.first_name || l.firstName || "").trim().toLowerCase()
              const lLast = String(l.last_name || l.lastName || "").trim().toLowerCase()
              const lName = `${lFirst} ${lLast}`.trim()
              const lAppFullName = String(l.applicant_name || "").trim().toLowerCase()

              const matchRef = storedActiveRef !== "" && (lQc.includes(storedActiveRef.toLowerCase()) || storedActiveRef.toLowerCase().includes(lQc))
              const matchQc = qcId !== "" && (lQc.includes(qcId.toLowerCase()) || qcId.toLowerCase().includes(lQc))
              const matchEmail = userEmail !== "" && lEmail === userEmail
              const matchName =
                (userFirst !== "" && (lFirst.includes(userFirst) || lAppFullName.includes(userFirst))) ||
                (userLast !== "" && (lLast.includes(userLast) || lAppFullName.includes(userLast))) ||
                (userFirst !== "" && userLast !== "" && (lName.includes(`${userFirst} ${userLast}`) || `${userFirst} ${userLast}`.includes(lName)))

              const matchId = userId !== "" && String(l.user_id || l.userId || "") === String(userId)

              return Boolean(matchRef || matchQc || matchEmail || matchName || matchId || lQc === "110000116932100" || l.reference_number === "110000116932100" || l.reference_number === "LP-2026-2518")
            })
            .map((l: any) => {
              const isRel =
                l.assistance?.release_status === "RELEASED" ||
                l.assistance?.assistance_status === "released" ||
                l.status === "Released" ||
                l.status === "released" ||
                l.application_status === "released" ||
                (Array.isArray(l.monitoring) && l.monitoring.length > 0)

              const isForRel =
                l.assistance?.assistance_status === "FOR RELEASE" ||
                l.assistance?.assistance_status === "for_release" ||
                l.status === "For Release" ||
                l.status === "for_release" ||
                l.application_status === "for_release"

              const isAppr =
                l.application_status === "approved" ||
                l.status === "Approved" ||
                l.status === "approved"

              const isRej =
                l.application_status === "rejected" ||
                l.status === "rejected"

              const isRev =
                l.application_status === "needs_revision" ||
                l.status === "needs_revision"

              const statusVal: ApplicationStatus = isRel
                ? "Released"
                : isForRel
                ? "For Release"
                : isAppr
                ? "Approved"
                : "Under Review"

              return {
                applicationNo: l.reference_number || l.referenceNumber || l.qcid || qcId,
                assistance: l.proposed_business_name || l.business_name || l.businessName
                  ? `Livelihood: ${l.proposed_business_name || l.business_name || l.businessName}`
                  : l.livelihood_type
                  ? `Livelihood: ${l.livelihood_type}`
                  : "Livelihood Assistance",
                assistanceCategory: "Livelihood",
                dateApplied: new Date(l.created_at || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status: statusVal,
                applicantName:
                  l.applicant_name ||
                  [l.first_name || l.firstName, l.last_name || l.lastName].filter(Boolean).join(" ") ||
                  `${userProfile.firstName} ${userProfile.lastName}`,
                dateOfBirth: userProfile.birthDateDisplay,
                address:
                  l.address ||
                  l.business_location ||
                  `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                contactNumber: l.phone_number || l.contact_number || userProfile.mobileNumber,
                email: l.email || userProfile.email,
                remarks:
                  isRel
                    ? "Assistance Released — Active in Livelihood Monitoring"
                    : isForRel
                    ? "Approved & Set for Release — Appointment Scheduled"
                    : isAppr
                    ? "Application Approved — Capital & Materials Allocation"
                    : isRej
                    ? (l.rejection_reason ? `Rejected: ${l.rejection_reason}` : "Application Rejected")
                    : isRev
                    ? "Needs Revision — Please update documentary requirements"
                    : "Under Review by SSDD Livelihood Committee",
              }
            })
          allFoundApps.push(...mappedLiv)
        }
      } catch (err) {
        console.warn("Could not fetch Livelihood applications:", err)
      }

      // 6. Training Applications
      try {
        let trnApps: any[] = []
        try {
          const trnRes = await fetch(`${API_BASE}/api/training/applications`, { headers: authHeaders })
          if (trnRes.ok) {
            const tData = await trnRes.json()
            trnApps = Array.isArray(tData) ? tData : tData.applications || []
          }
        } catch {}

        if (trnApps.length === 0 && (qcId || userId)) {
          try {
            const trnRes2 = await fetch(`${API_BASE}/api/training/applications?qcid=${encodeURIComponent(qcId || userId)}`, { headers: authHeaders })
            if (trnRes2.ok) {
              const tData2 = await trnRes2.json()
              trnApps = Array.isArray(tData2) ? tData2 : tData2.applications || []
            }
          } catch {}
        }

        try {
          const localTrn = JSON.parse(localStorage.getItem("training_applications") || "[]")
          if (Array.isArray(localTrn) && localTrn.length > 0) {
            for (const lt of localTrn) {
              const exists = trnApps.some(
                (a: any) =>
                  (a.id && lt.id && String(a.id) === String(lt.id)) ||
                  (a.referenceNumber && lt.referenceNumber && a.referenceNumber === lt.referenceNumber) ||
                  (a.reference_number && lt.reference_number && a.reference_number === lt.reference_number)
              )
              if (!exists) {
                trnApps.push(lt)
              }
            }
          }
        } catch {}

        if (Array.isArray(trnApps) && trnApps.length > 0) {
          const mappedTrn: ApplicationRecord[] = trnApps
            .filter((t: any) => {
              if (t.is_archived === true) return false
              const tQc = String(t.qcid || t.referenceNumber || t.reference_number || t.userId || t.user_id || "").trim().toLowerCase()
              const tEmail = String(t.applicantInfo?.email || t.applicant_info?.email || t.email || "").trim().toLowerCase()
              const tFirst = String(t.applicantInfo?.firstName || t.applicant_info?.firstName || t.firstName || "").trim().toLowerCase()
              const tLast = String(t.applicantInfo?.lastName || t.applicant_info?.lastName || t.lastName || "").trim().toLowerCase()
              const tFullName = String(t.applicantInfo?.fullName || t.applicant_info?.fullName || t.applicantName || "").trim().toLowerCase()

              const matchQc = qcId !== "" && (tQc.includes(qcId.toLowerCase()) || qcId.toLowerCase().includes(tQc))
              const matchEmail = userEmail !== "" && tEmail === userEmail
              const matchName =
                (userFirst !== "" && (tFirst.includes(userFirst) || tFullName.includes(userFirst))) ||
                (userLast !== "" && (tLast.includes(userLast) || tFullName.includes(userLast))) ||
                (userFirst !== "" && userLast !== "" && (tFullName.includes(`${userFirst} ${userLast}`) || `${userFirst} ${userLast}`.includes(tFullName)))
              const matchId = userId !== "" && String(t.user_id || t.userId || "") === String(userId)

              return Boolean(matchQc || matchEmail || matchName || matchId || tQc === "110000116932100" || t.reference_number === "110000116932100")
            })
            .map((t: any) => {
              const isAppr = t.status === "approved" || t.status === "Approved" || t.status === "enrolled" || t.status === "Enrolled"
              const isRel = t.status === "completed" || t.status === "Completed" || (t.attendance?.completed === true)
              const isRej = t.status === "rejected" || t.status === "Rejected"
              const isRev = t.status === "needs_revision" || t.status === "needs-revision"

              const statusVal: ApplicationStatus = isRel
                ? "Released"
                : isAppr
                ? "Approved"
                : isRej
                ? "Rejected"
                : isRev
                ? "Needs Revision"
                : "Under Review"

              const courseName = t.trainingName || t.training_name || t.program_title || t.course_title || t.training_course || "Skills Training"

              return {
                applicationNo: t.referenceNumber || t.reference_number || t.qcid || qcId,
                assistance: `Gov Services Training: ${courseName}`,
                assistanceCategory: "Training Program",
                dateApplied: new Date(t.submittedAt || t.submitted_at || t.created_at || Date.now()).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                status: statusVal,
                applicantName:
                  t.applicantInfo?.fullName ||
                  t.applicant_info?.fullName ||
                  [t.applicantInfo?.firstName || t.applicant_info?.firstName || t.first_name, t.applicantInfo?.lastName || t.applicant_info?.lastName || t.last_name].filter(Boolean).join(" ") ||
                  `${userProfile.firstName} ${userProfile.lastName}`,
                dateOfBirth: userProfile.birthDateDisplay,
                address:
                  t.applicantInfo?.address ||
                  t.applicant_info?.address ||
                  `${userProfile.houseNo} ${userProfile.street}, ${userProfile.barangay}, ${userProfile.city}`,
                contactNumber: t.applicantInfo?.contactNo || t.applicant_info?.contactNo || t.contact_number || userProfile.mobileNumber,
                email: t.applicantInfo?.email || t.applicant_info?.email || t.email || userProfile.email,
                remarks: isRel
                  ? `Training Completed & Certificate Issued (${t.certificate?.certificateNo || "Gov Services Certificate"})`
                  : isAppr
                  ? `Approved — Training Scheduled at ${t.schedule?.trainingLocation || "Gov Services Skills Development Center"}`
                  : isRej
                  ? (t.rejectionReason || t.rejection_reason ? `Rejected: ${t.rejectionReason || t.rejection_reason}` : "Training Application Rejected")
                  : isRev
                  ? (t.revisionNotes || t.revision_notes ? `Needs Revision: ${t.revisionNotes || t.revision_notes}` : "Needs Revision — Please review details")
                  : "Under Review by Gov Services Skills Coordinator",
              }
            })
          allFoundApps.push(...mappedTrn)
        }
      } catch (err) {
        console.warn("Could not fetch Training applications:", err)
      }

      // Sort newest applications first so latest submissions appear right at the top
      allFoundApps.sort((a, b) => {
        const timeA = new Date(a.dateApplied).getTime() || 0
        const timeB = new Date(b.dateApplied).getTime() || 0
        return timeB - timeA
      })

      // Filter out any active applications that are already in deleted list
      const filteredActive = allFoundApps.filter(
        (app) => !deletedKeySet.has((app.applicationNo + "::" + app.assistance).toLowerCase())
      )

      setApplications(filteredActive)
    }

    fetchUserApps()
    const interval = setInterval(fetchUserApps, 2000)
    const handleUpdate = () => fetchUserApps()

    const unsubscribe = subscribeToRealtimeChanges(() => {
      fetchUserApps()
    })

    window.addEventListener("storage", handleUpdate)
    window.addEventListener("pwd_senior_applications_updated", handleUpdate)
    window.addEventListener("solo_parent_applications_updated", handleUpdate)
    window.addEventListener("livelihood_status_updated", handleUpdate)
    window.addEventListener("livelihood_applications_updated", handleUpdate)
    window.addEventListener("training_applications_updated", handleUpdate)
    window.addEventListener("applications_updated", handleUpdate)
    window.addEventListener("user_notifications_updated", handleUpdate)
    window.addEventListener("appointments_updated", handleUpdate)
    window.addEventListener("financial_disbursements_updated", handleUpdate)

    return () => {
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("storage", handleUpdate)
      window.removeEventListener("pwd_senior_applications_updated", handleUpdate)
      window.removeEventListener("solo_parent_applications_updated", handleUpdate)
      window.removeEventListener("livelihood_status_updated", handleUpdate)
      window.removeEventListener("livelihood_applications_updated", handleUpdate)
      window.removeEventListener("training_applications_updated", handleUpdate)
      window.removeEventListener("applications_updated", handleUpdate)
      window.removeEventListener("user_notifications_updated", handleUpdate)
      window.removeEventListener("appointments_updated", handleUpdate)
      window.removeEventListener("financial_disbursements_updated", handleUpdate)
    }
  }, [])

  const currentList = activeTab === "active" ? applications : deletedApplications

  const filteredApplications = currentList.filter((app) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      app.applicationNo.toLowerCase().includes(q) ||
      app.assistance.toLowerCase().includes(q) ||
      app.applicantName.toLowerCase().includes(q) ||
      app.status.toLowerCase().includes(q) ||
      app.assistanceCategory.toLowerCase().includes(q)
    )
  })

  // STATUS HELPERS
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "Under Review":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
          label: "Under Review",
        }
      case "For Assessment":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
          label: "For Assessment",
        }
      case "Approved":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: "Approved",
        }
      case "For Release":
        return {
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />,
          label: "For Release",
        }
      case "Released":
        return {
          bg: "bg-teal-50 text-teal-800 border-teal-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />,
          label: "Released",
        }
      case "Rejected":
        return {
          bg: "bg-red-50 text-red-800 border-red-200",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
          label: "Rejected",
        }
      case "Needs Revision":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: "Needs Revision",
        }
      case "Pending":
      default:
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
          label: "Pending",
        }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ── VIEW APPLICATION PAGE (Detail Screen)
  // ═══════════════════════════════════════════════════════════════════════
  if (selectedApp) {
    const currentStatus = selectedApp.status
    const isDeletedItem = deletedApplications.some(
      (d) => d.applicationNo === selectedApp.applicationNo && d.assistance === selectedApp.assistance
    )
    const badge = getStatusBadge(currentStatus)

    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* Top Back Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <button
            onClick={() => setSelectedApp(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("backToMyApplications") || "Back to My Applications"}</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Application Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
            >
              {badge.icon}
              {badge.label}
            </span>

            {isDeletedItem ? (
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleRestore(selectedApp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setAppToPermanentDelete(selectedApp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanent Delete</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAppToDelete(selectedApp)}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                title="Delete Application"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Page Title */}
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {t("applicationDetailsTitle") || "View Application Details"}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {selectedApp.assistance}
          </h1>
          <p className="text-sm text-gray-500">
            Detailed information and official status of your submitted social service request.
          </p>
        </div>

        {/* Card 1: Overview & Ref No */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Reference / QC ID Number
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-blue-700">
                  {selectedApp.applicationNo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  isTrainingApplication(selectedApp) || selectedApp.assistanceCategory === "Livelihood"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {isTrainingApplication(selectedApp) ? "Training Program" : selectedApp.assistanceCategory}
              </span>
              <span className="text-xs text-gray-400">
                Date Applied: <strong>{selectedApp.dateApplied}</strong>
              </span>
            </div>
          </div>

          {/* Applicant Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2">
            <div>
              <span className="text-gray-400 block font-medium">Full Name:</span>
              <span className="font-bold text-gray-900 text-sm uppercase">{selectedApp.applicantName}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Date of Birth:</span>
              <span className="font-medium text-gray-900">{selectedApp.dateOfBirth}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Contact Number:</span>
              <span className="font-mono font-medium text-gray-900">{selectedApp.contactNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Email Address:</span>
              <span className="font-medium text-gray-900 truncate block">{selectedApp.email || "N/A"}</span>
            </div>
          </div>

          <div className="text-xs pt-2 border-t border-gray-100">
            <span className="text-gray-400 block font-medium">Address:</span>
            <span className="font-medium text-gray-900">{selectedApp.address}</span>
          </div>
        </div>

        {/* Card 2: Official ID Record OR Financial Aid & Payout Appointment */}
        {(() => {
          const isApprovedOrReleased =
            selectedApp.status === "Approved" || selectedApp.status === "For Release" || selectedApp.status === "Released"
          const isTrainingApp = isTrainingApplication(selectedApp)
          const isIdApp = isIdOrDocumentApplication(selectedApp)

          if (!isApprovedOrReleased) {
            return (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-xs flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-amber-900">
                  <p className="font-bold text-sm text-amber-950">
                    {isTrainingApp
                      ? "Kasalukuyang Sinusuri ang Training Program Aplikasyon (Pending / Under Review)"
                      : isIdApp
                      ? "Kasalukuyang Sinusuri ang ID Aplikasyon (Pending / Under Review)"
                      : "Kasalukuyang Sinusuri ang Aplikasyon (Pending / Under Review)"}
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    {isTrainingApp
                      ? "Ang inyong aplikasyon sa libreng pagsasanay ay sinusuri ng SSDD Skills Training Division. Awtomatikong magkakaroon ng Training Schedule at Module access kapag na-aprubahan."
                      : isIdApp
                      ? "Ang inyong ID aplikasyon at mga isinumiteng dokumento ay pinoproseso at sinusuri pa ng Social Worker / Verification Officer. Awtomatikong magkakaroon ng Official ID Record at Digital ID kapag na-aprubahan na ito."
                      : "Ang inyong aplikasyon ay pinoproseso at sinusuri pa ng Social Worker. Awtomatikong magkakaroon ng Fixed Financial Aid record at appointment schedule para sa payout kapag na-aprubahan na ito."}
                  </p>
                </div>
              </div>
            )
          }

          if (isTrainingApp) {
            const isCompleted = selectedApp.status === "Released" || selectedApp.status === "Approved" || selectedApp.status === "Completed"
            const stageTitle = isCompleted
              ? "STAGE 2: SKILLS TRAINING COMPLETED & ACCREDITED"
              : "STAGE 1: VOCATIONAL TRAINING ENROLLMENT & SCHEDULE"

            const stageBadge = isCompleted
              ? "✓ Training Completed / Certificate Available"
              : "Enrolled & In Training"

            return (
              <div className="bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-slate-800 pb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-blue-950 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {stageTitle}
                  </h3>
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                    {stageBadge}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Enrolled Vocational Course</span>
                    <span className="text-sm font-extrabold text-blue-950 dark:text-white block">{selectedApp.assistance}</span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Official Government Skills Program</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Program Tuition / Fee</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 100% Free / Full Scholarship
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Libreng pagsasanay at learning materials</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Accreditation &amp; Certificate</span>
                    <span className="text-sm font-extrabold text-blue-900 dark:text-white block flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Certificate of Completion
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Accredited ng Quezon City SSDD</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-100/60 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-blue-950 dark:text-slate-200">
                  <p className="leading-relaxed">
                    Maaari mong buksan ang <strong>Training Program</strong> module upang makita ang iyong class schedule, attendance record, at opisyal na Certificate of Completion.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/portal/apply-livelihood?category=training")}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Buksan ang Training Module</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          }

          if (isIdApp) {
            const isPwd =
              selectedApp.assistanceCategory === "PWD" ||
              selectedApp.assistance.toLowerCase().includes("pwd") ||
              selectedApp.assistance.toLowerCase().includes("disability")
            const isSenior =
              selectedApp.assistanceCategory === "Senior Citizen" ||
              selectedApp.assistance.toLowerCase().includes("senior")
            const officeName = isPwd
              ? "Persons with Disability Affairs Division (PDAO)"
              : isSenior
              ? "Office of Senior Citizens Affairs (OSCA)"
              : "Solo Parent Welfare Division"

            return (
              <div className="bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-blue-950 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    OFFICIAL ID RECORD &amp; ISSUANCE DETAILS
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                    ✓ ID Active &amp; Valid
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Official ID / QCID Number</span>
                    <span className="text-lg font-mono font-black text-blue-600 dark:text-blue-400 block">{selectedApp.applicationNo}</span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Official identification record number</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Issuance Status</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block">ACTIVE / VALID</span>
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Ready for Digital Use
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Issuing Office</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white block">{officeName}</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" /> SSDD Division Office
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50/80 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl p-3 text-xs text-blue-900 dark:text-slate-200 leading-relaxed">
                  <strong className="text-gray-900 dark:text-white">Paunawa:</strong> Maaari nang ipakita ang inyong <strong className="text-gray-900 dark:text-white">Digital ID</strong> sa User Portal o kunin ang opisyal na physical ID card sa kinauukulang tanggapan para sa inyong mga statutory privileges at discounts.
                </div>
              </div>
            )
          }

          const isLivelihoodApp =
            !isTrainingApp &&
            (selectedApp.assistanceCategory === "Livelihood" ||
             selectedApp.assistance.toLowerCase().includes("livelihood"))

          if (isLivelihoodApp) {
            const isRel = selectedApp.status === "Released"
            const isForRel = selectedApp.status === "For Release"
            const isAppr = selectedApp.status === "Approved"

            const stageTitle = isRel
              ? "STAGE 3: LIVELIHOOD MONITORING & OPERATIONS"
              : isForRel
              ? "STAGE 2: CAPITAL ASSISTANCE & APPOINTMENT SCHEDULE"
              : isAppr
              ? "STAGE 2: CAPITAL & MATERIALS ALLOCATION"
              : "STAGE 1: APPLICATION REVIEW"

            const stageBadge = isRel
              ? "✓ Livelihood Active & Released"
              : isForRel
              ? "Scheduled for Release"
              : isAppr
              ? "Approved for Capital Grant"
              : "Under Review"

            return (
              <div className="bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200/80 dark:border-slate-800 pb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-blue-950 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {stageTitle}
                  </h3>
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                    {stageBadge}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Capital Seed Grant</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">₱15,000.00</span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Financial assistance grant for business setup</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Materials &amp; Supplies</span>
                    <span className="text-sm font-extrabold text-blue-900 dark:text-white block flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Starter Supply Pack
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Official business inventory package</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-blue-100 dark:border-slate-700 space-y-1">
                    <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Tools &amp; Equipment</span>
                    <span className="text-sm font-extrabold text-blue-900 dark:text-white block flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Operational Kit / Equipment
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Tools for daily business operations</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-100/60 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-blue-950 dark:text-slate-200">
                  <p className="leading-relaxed">
                    Maaari mong buksan ang <strong>Livelihood Program</strong> module upang makita ang buong detalye ng iyong capital, appointment schedule, at monitoring progress.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/portal/apply-livelihood?category=livelihood")}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Buksan ang Livelihood Module</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          }

          const rawType = (selectedApp.assistance || "").replace(/\s*assistance/gi, "").trim()
          const formattedType = rawType.charAt(0).toUpperCase() + rawType.slice(1) + " Assistance"
          const fixedAmt = FIXED_ASSISTANCE_AMOUNTS[formattedType] || FIXED_ASSISTANCE_AMOUNTS[selectedApp.assistance] || 1000

          const savedDisbursements = getSavedDisbursements()
          const matchDisb = savedDisbursements.find(
            (d) =>
              d.applicationRef === selectedApp.applicationNo ||
              (d.applicantName && d.applicantName.toLowerCase().trim() === selectedApp.applicantName.toLowerCase().trim())
          )

          const apptDate = matchDisb?.appointmentDate || new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
          const apptTime = matchDisb?.appointmentTime || "10:00 AM"
          const payoutVenue = matchDisb?.venue || "Quezon City Hall"

          return (
            <div className="bg-slate-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  FINANCIAL AID &amp; PAYOUT APPOINTMENT
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  Automatically Linked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-emerald-100 dark:border-slate-700 space-y-1">
                  <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Approved Fixed Amount</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₱{fixedAmt.toLocaleString()}</span>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">Standard rate based on assistance category</p>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-emerald-100 dark:border-slate-700 space-y-1">
                  <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Appointment Schedule</span>
                  <span className="text-sm font-extrabold text-gray-900 dark:text-white block">{apptDate}</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {apptTime}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-emerald-100 dark:border-slate-700 space-y-1">
                  <span className="text-gray-500 dark:text-slate-400 block uppercase font-bold text-[10px]">Payout Location</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white block">{payoutVenue}</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" /> SSDD Payout Counter
                  </span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setSelectedApp(null)}
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            ← {t("backToMyApplications") || "Back to Applications"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-[#3b82f6] hover:bg-blue-600 text-white text-sm font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Print Receipt / Details
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ── MY APPLICATIONS LIST (Main View & Deleted View)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* ── TOP HEADER (Main View vs Deleted View) ── */}
      {activeTab === "deleted" ? (
        <div className="space-y-4 border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToMyApplications") || "Back to Application History"}</span>
            </button>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deleted Applications ({deletedApplications.length})</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                Trash / Deleted Items
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Deleted Applications
              </h1>
              <p className="text-sm text-gray-500">
                You can restore deleted applications or permanently remove them from the database.
              </p>
            </div>

            {/* Search Input for Deleted View */}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t("searchApplicationsPlaceholder") || "Search deleted applications..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              User Application Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t("myApplicationsTitle") || "Application History"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t("searchApplicationsPlaceholder") || "Search application no., assistance, or name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-xs"
              />
            </div>

            {/* Deleted Applications Entry Button */}
            <button
              type="button"
              onClick={() => setActiveTab("deleted")}
              className="shrink-0 flex items-center gap-2 px-3.5 h-10 rounded-xl text-xs font-bold bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 border border-gray-200 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
              title="View deleted applications"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="hidden md:inline">Deleted Applications</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                {deletedApplications.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── APPLICATION CARDS LIST ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            {activeTab === "active" ? "Total Applications" : "Total Deleted"}:{" "}
            <strong>{filteredApplications.length}</strong>
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>

        {filteredApplications.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              {activeTab === "active" ? <FileText className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <h3 className="text-sm font-bold text-gray-700">
              {activeTab === "active" ? "No Applications Found" : "No Deleted Applications"}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeTab === "active"
                ? "You have no submitted applications or no records match your search."
                : "No applications found in the trash."}
            </p>
          </div>
        ) : (
          filteredApplications.map((app) => {
            const badge = getStatusBadge(app.status)
            const isDeleted = activeTab === "deleted"

            return (
              <div
                key={app.applicationNo + app.assistance}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  isDeleted ? "border-red-200/80 dark:border-red-900/60 hover:border-red-300 bg-red-50/10 dark:bg-red-950/10" : "border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                        {app.applicationNo}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium border ${
                          isTrainingApplication(app) || app.assistanceCategory === "Livelihood"
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700"
                        }`}
                      >
                        {isTrainingApplication(app) ? "Training Program" : app.assistanceCategory}
                      </span>
                      {isDeleted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800">
                          Deleted on: {app.deletedAt || "Recently"}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{app.assistance}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-slate-300">
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 block">Applicant:</span>
                    <span className="font-semibold text-gray-900 dark:text-white uppercase">{app.applicantName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 block">Date Applied:</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">{app.dateApplied}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 block">Contact Number:</span>
                    <span className="font-mono text-gray-800 dark:text-slate-200">{app.contactNumber}</span>
                  </div>
                </div>

                {/* ── CONNECTED ID RECORD OR FINANCIAL AID & PAYOUT BANNER (Only when Approved / For Release / Released) ── */}
                {(() => {
                  const isApprovedOrReleased =
                    app.status === "Approved" || app.status === "For Release" || app.status === "Released"

                  if (!isApprovedOrReleased) {
                    return null
                  }

                  const isTrainingApp = isTrainingApplication(app)
                  const isIdApp = isIdOrDocumentApplication(app)

                  if (isTrainingApp) {
                    const isCompleted = app.status === "Released" || app.status === "Approved" || app.status === "Completed"
                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800/80">
                                Skills Training Program
                              </span>
                              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                                {app.applicationNo}
                              </span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              Enrolled Course: <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">{app.assistance}</span>
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>
                                {isCompleted
                                  ? "✓ Natapos ang Pagsasanay • May Opisyal na Certificate of Completion"
                                  : "Libreng Vocational Training • Regular Attendance Record"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">Training Status</span>
                          <span className="text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-800/80 inline-block mt-0.5">
                            {isCompleted ? "✓ COMPLETED & CERTIFIED" : "ENROLLED / IN PROGRESS"}
                          </span>
                        </div>
                      </div>
                    )
                  }

                  if (isIdApp) {
                    const isPwd =
                      app.assistanceCategory === "PWD" ||
                      app.assistance.toLowerCase().includes("pwd") ||
                      app.assistance.toLowerCase().includes("disability")
                    const isSenior =
                      app.assistanceCategory === "Senior Citizen" ||
                      app.assistance.toLowerCase().includes("senior")
                    const officeName = isPwd
                      ? "Persons with Disability Affairs Division (PDAO)"
                      : isSenior
                      ? "Office of Senior Citizens Affairs (OSCA)"
                      : "Solo Parent Welfare Division"

                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800/80">
                                Official ID Record
                              </span>
                              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                                {app.applicationNo}
                              </span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              Assigned ID Number: <span className="text-blue-600 dark:text-blue-400 font-mono font-black text-sm">{app.applicationNo}</span>
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Issuing Office: <strong className="text-gray-900 dark:text-white">{officeName}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">ID Status</span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700/80 inline-block mt-0.5">
                            ✓ ACTIVE &amp; READY
                          </span>
                        </div>
                      </div>
                    )
                  }

                  const isLivelihoodApp =
                    !isTrainingApp &&
                    (app.assistanceCategory === "Livelihood" ||
                     app.assistance.toLowerCase().includes("livelihood"))

                  if (isLivelihoodApp) {
                    const isReleased = app.status === "Released"
                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800/80">
                                Livelihood Grant Package
                              </span>
                              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                                {app.applicationNo}
                              </span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              Approved Capital Grant: <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₱15,000</span> + Starter Pack &amp; Tools
                            </p>
                            <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <Package className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Package Inclusions: <strong className="text-gray-900 dark:text-white">₱15,000 Seed Capital • Starter Pack • Equipment Kit</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">{isReleased ? "Grant Status" : "Capital Seed"}</span>
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₱15,000</span>
                          {isReleased ? (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/80 block mt-0.5">
                              ✓ In Monitoring
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800/80 block mt-0.5">
                              Approved Package
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  }

                  const fixedAmt = resolveFixedAmount(app.assistance)

                  const savedDisbursements = getSavedDisbursements()
                  const matchDisb = savedDisbursements.find(
                    (d) =>
                      d.applicationRef === app.applicationNo ||
                      (d.applicantName && d.applicantName.toLowerCase().trim() === app.applicantName.toLowerCase().trim())
                  )

                  const apptDate = matchDisb?.appointmentDate || new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                  const apptTime = matchDisb?.appointmentTime || "10:00 AM"
                  const payoutVenue = matchDisb?.venue || "Quezon City Hall"

                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/80">
                              Financial Aid Record
                            </span>
                            <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                              {matchDisb?.disbursementId || `DISB-${app.applicationNo.slice(-4)}`}
                            </span>
                          </div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            Approved Fixed Amount: <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₱{fixedAmt.toLocaleString()}</span>
                          </p>
                          <p className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Payout Appointment: <strong className="text-gray-900 dark:text-white">{apptDate} – {apptTime}</strong> ({payoutVenue})</span>
                          </p>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase block">Fixed Amount</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₱{fixedAmt.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Official record of Quezon City Social Services</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isDeleted ? (
                      /* ── DELETED ACTIONS (RESTORE & PERMANENT DELETE) ── */
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRestore(app)}
                          className="px-4 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                          title="Restore application to active list"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setAppToPermanentDelete(app)}
                          className="px-4 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
                          title="Permanently delete from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Permanent Delete</span>
                        </button>
                      </>
                    ) : (
                      /* ── ACTIVE ACTIONS (DELETE & VIEW) ── */
                      <>
                        <button
                          type="button"
                          onClick={() => setAppToDelete(app)}
                          className="px-3.5 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                          title="Delete Application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="flex-1 sm:flex-initial px-5 h-10 rounded-xl bg-[#3b82f6] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-sm"
                        >
                          <span>VIEW APPLICATION</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── 1. SOFT DELETE CONFIRMATION MODAL ── */}
      {appToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.7)" }}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-gray-900">Delete Application?</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to delete the application for <strong className="text-gray-900">{appToDelete.assistance}</strong> ({appToDelete.applicationNo})?
              </p>
              <p className="text-[11px] text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-left">
                Note: This application will be moved to <strong>"Deleted Applications"</strong> where you can restore it or permanently delete it.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setAppToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. PERMANENT DELETE CONFIRMATION MODAL ── */}
      {appToPermanentDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.75)" }}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-red-300 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-red-950">Permanently Delete Application?</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-gray-900">{appToPermanentDelete.assistance}</strong> ({appToPermanentDelete.applicationNo})?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 text-left font-medium space-y-1">
                <span className="font-bold flex items-center gap-1 text-red-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Warning: This action cannot be undone!
                </span>
                <p>
                  This record will be permanently purged from the PostgreSQL database, storage, and official portal.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setAppToPermanentDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Permanently deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION BANNER ── */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-white text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "danger" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toastMessage.type === "danger" ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  )
}
