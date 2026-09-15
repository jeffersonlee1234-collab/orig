import { useState, useEffect } from "react"
import {
  Award,
  Search,
  CheckCircle2,
  Check,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import { useLanguage } from "../ui/language-context"
import { notifyApplicationChange } from "../../utils/realtimeSync"
import type { TrainingApplicationRecord } from "../user-portal/training-program-view"

export default function TrainingProgramAdmin() {
  const { language } = useLanguage()
  const isEn = language === "en"
  const isBis = language === "bis"

  const [applications, setApplications] = useState<TrainingApplicationRecord[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedApp, setSelectedApp] = useState<TrainingApplicationRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Review modal form state
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [previewCertApp, setPreviewCertApp] = useState<TrainingApplicationRecord | null>(null)

  const fetchTrainingApplications = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE}/api/training/applications`)
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.applications || []
        if (Array.isArray(list)) {
          setApplications(list)
          if (selectedApp) {
            const currentSelected = list.find((a: TrainingApplicationRecord) => String(a.id) === String(selectedApp.id) || a.referenceNumber === selectedApp.referenceNumber)
            if (currentSelected) setSelectedApp(currentSelected)
          }
          try {
            localStorage.setItem("training_applications", JSON.stringify(list))
          } catch (_) {}
          return
        }
      }
    } catch (_) {
    } finally {
      setIsLoading(false)
    }

    // Fallback: localStorage
    try {
      const stored = localStorage.getItem("training_applications")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setApplications(parsed)
          if (selectedApp) {
            const currentSelected = parsed.find((a: TrainingApplicationRecord) => String(a.id) === String(selectedApp.id) || a.referenceNumber === selectedApp.referenceNumber)
            if (currentSelected) setSelectedApp(currentSelected)
          }
        }
      }
    } catch (_) {}
  }

  useEffect(() => {
    fetchTrainingApplications()
    const interval = setInterval(fetchTrainingApplications, 8000)
    const handleSync = () => fetchTrainingApplications()
    window.addEventListener("storage", handleSync)
    window.addEventListener("application_status_updated", handleSync)
    window.addEventListener("training_applications_updated", handleSync)
    window.addEventListener("user_notifications_updated", handleSync)
    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleSync)
      window.removeEventListener("application_status_updated", handleSync)
      window.removeEventListener("training_applications_updated", handleSync)
      window.removeEventListener("user_notifications_updated", handleSync)
    }
  }, [selectedApp?.id, selectedApp?.referenceNumber])

  // Sync and persist application changes
  const persistAppUpdate = async (updated: TrainingApplicationRecord) => {
    const updatedList = applications.map((a) => (String(a.id) === String(updated.id) ? updated : a))
    setApplications(updatedList)
    setSelectedApp(updated)

    try {
      localStorage.setItem("training_applications", JSON.stringify(updatedList))
      window.dispatchEvent(new Event("storage"))
    } catch (_) {}

    try {
      await fetch(`${API_BASE}/api/training/applications/${updated.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updated.status,
          rejectionReason: updated.rejectionReason,
          attendance: updated.attendance,
          trainingStatus: updated.schedule?.trainingStatus,
          approvedBy: updated.approvedBy || "Gov Services Skills Development Division",
        }),
      })
    } catch (_) {}

    // Trigger real-time cross-tab sync so user portal notifications and application history immediately update
    const syncType = updated.status === "approved" ? "APPLICATION_APPROVED" : updated.status === "rejected" ? "APPLICATION_REJECTED" : "STATUS_CHANGED"
    notifyApplicationChange(syncType, "livelihood", updated.referenceNumber)
  }

  // Handle Approve
  const handleApprove = async (app: TrainingApplicationRecord) => {
    const updated: TrainingApplicationRecord = {
      ...app,
      status: "approved",
      approvedBy: "Gov Services Skills Development Division",
      approvedDate: new Date().toISOString(),
      rejectionReason: undefined,
      revisionNotes: undefined,
      schedule: {
        ...app.schedule,
        trainingStatus: "Upcoming",
      },
    }
    await persistAppUpdate(updated)
  }

  // Handle Reject
  const handleReject = async (app: TrainingApplicationRecord) => {
    if (!rejectReason.trim()) {
      alert(
        isEn
          ? "Please provide a reason for rejecting this application."
          : isBis
          ? "Palihug paghatag og rason sa pag-reject niining aplikasyon."
          : "Mangyaring magbigay ng dahilan para sa pag-reject ng aplikasyong ito."
      )
      return
    }
    const updated: TrainingApplicationRecord = {
      ...app,
      status: "rejected",
      rejectionReason: rejectReason,
    }
    await persistAppUpdate(updated)
    setShowRejectInput(false)
    setRejectReason("")
  }

  // Counters
  const pendingCount = applications.filter((a) => a.status === "pending" || a.status === "under_review").length
  const approvedCount = applications.filter((a) => a.status === "approved").length
  const completedCount = applications.filter((a) => a.attendance?.completed || a.schedule?.trainingStatus === "Completed").length
  const rejectedCount = applications.filter((a) => a.status === "rejected").length

  // Filtered applications
  const filteredApps = applications.filter((a) => {
    const matchStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "pending"
        ? a.status === "pending" || a.status === "under_review"
        : filterStatus === "completed"
        ? a.attendance?.completed || a.schedule?.trainingStatus === "Completed"
        : a.status === filterStatus

    const matchSearch =
      searchTerm === "" ||
      a.applicantInfo?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.qcid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.trainingName?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {isEn
              ? "Training Program Administration & Skills Registry"
              : isBis
              ? "Administrasyon sa Training Program ug Skills Registry"
              : "Pangasiwaan ng Training Program at Talaan ng Kasanayan"}
          </h3>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {isEn ? "Total Applications" : isBis ? "Tanan nga Aplikasyon" : "Kabuuang Aplikasyon"}
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">{applications.length}</p>
          <span className="text-[11px] text-muted-foreground">
            {isEn ? "All time submissions" : isBis ? "Tanan nga na-submit" : "Lahat ng naisumite"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            {isEn ? "Pending Review" : isBis ? "Nagpaabot og Pagsusi" : "Nangangailangan ng Pagsusuri"}
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          <span className="text-[11px] text-muted-foreground">
            {isEn ? "Needs review" : isBis ? "Kinahanglan susihon" : "Kailangang suriin"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            {isEn ? "Approved / Enrolled" : isBis ? "Naaprobahan / Na-enroll" : "Naaprubahan / Naka-enroll"}
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</p>
          <span className="text-[11px] text-muted-foreground">
            {isEn ? "Active in training" : isBis ? "Aktibo sa training" : "Aktibo sa pagsasanay"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
            {isEn ? "Certificates Issued" : isBis ? "Na-isyu nga Sertipiko" : "Naisyu na Sertipiko"}
          </span>
          <p className="text-2xl font-bold text-purple-600 mt-1">{completedCount}</p>
          <span className="text-[11px] text-muted-foreground">
            {isEn ? "12 hours (4 days) completed" : isBis ? "12 ka oras nahuman" : "12 oras (4 araw) nakumpleto"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: isEn ? "All" : isBis ? "Tanan" : "Lahat" },
            { id: "pending", label: `${isEn ? "Pending" : "Pending"} (${pendingCount})` },
            { id: "approved", label: `${isEn ? "Approved" : "Approved"} (${approvedCount})` },
            { id: "completed", label: `${isEn ? "Completed" : "Completed"} (${completedCount})` },
            { id: "rejected", label: `${isEn ? "Rejected" : "Rejected"} (${rejectedCount})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === f.id
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isEn ? "Search by name or ref..." : "Maghanap sa pangalan o ref..."}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
          <Award className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">
            {isEn ? "No Training Applications Found" : "Walang Nahanap na Aplikasyon"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isEn ? "No matching records found for this filter or search term." : "Walang rekord na tumutugma sa filter o search term na ito."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app) => {
            const isCompleted = app.attendance?.completed || app.schedule?.trainingStatus === "Completed"
            return (
              <div
                key={app.id}
                onClick={() => {
                  setSelectedApp(app)
                  setShowRejectInput(false)
                }}
                className="bg-card border border-border hover:border-purple-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md">
                      {app.referenceNumber}
                    </span>
                    {app.status === "approved" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                        APPROVED
                      </span>
                    )}
                    {app.status === "pending" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 border border-blue-500/30">
                        PENDING REVIEW
                      </span>
                    )}
                    {app.status === "rejected" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 border border-rose-500/30">
                        REJECTED
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 border border-purple-500/30 flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        CERTIFICATE ISSUED
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-base text-foreground group-hover:text-purple-600 transition-colors">
                      {app.applicantInfo?.fullName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      QC ID: <span className="font-mono font-medium text-foreground">{app.qcid}</span> • Brgy. {app.applicantInfo?.barangay} • {app.applicantInfo?.contactNo}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="font-semibold text-foreground">Program: {app.trainingName}</span>
                    <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                    <span>Attendance: <strong>{Math.min(4, Math.floor((app.attendance?.hoursCompleted || 0) / 3))}/4 Days ({app.attendance?.hoursCompleted || 0} / 12 Hours)</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCompleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewCertApp(app)
                      }}
                      className="px-3.5 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="h-4 w-4" />
                      <span>{isEn ? "View Certificate" : "Tingnan ang Sertipiko"}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* TRAINING APPLICATION DETAILS & MANAGEMENT MODAL              */}
      {/* ============================================================ */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
              <div>
                <span className="text-[11px] font-mono font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md">
                  {selectedApp.referenceNumber}
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {isEn ? "Training Application Details" : isBis ? "Mga Detalye sa Aplikasyon sa Pagbansay" : "Mga Detalye ng Aplikasyon sa Pagsasanay"}
                </h3>
                <p className="text-xs text-muted-foreground">Course: <strong>{selectedApp.trainingName}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Applicant Profile Grid */}
            <div className="bg-muted/20 p-4 rounded-xl border border-border space-y-2 text-xs">
              <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wide">Applicant Information</span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Full Name:</span>
                  <span className="font-bold text-foreground">{selectedApp.applicantInfo?.fullName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">QC ID:</span>
                  <span className="font-mono font-bold text-foreground">{selectedApp.qcid}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Contact &amp; Email:</span>
                  <span className="font-semibold text-foreground">{selectedApp.applicantInfo?.contactNo} • {selectedApp.applicantInfo?.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Barangay &amp; City:</span>
                  <span className="font-semibold text-foreground">Brgy. {selectedApp.applicantInfo?.barangay}, {selectedApp.applicantInfo?.city}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Sex &amp; Age:</span>
                  <span className="text-foreground">{selectedApp.applicantInfo?.sex} • {selectedApp.applicantInfo?.age} years old</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Occupation:</span>
                  <span className="text-foreground">{selectedApp.applicantInfo?.occupation || "Resident"}</span>
                </div>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="bg-muted/20 p-4 rounded-xl border border-border space-y-2 text-xs">
              <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wide">Assigned Schedule</span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <p><strong>Date:</strong> {selectedApp.schedule?.trainingDate}</p>
                <p><strong>Time:</strong> {selectedApp.schedule?.trainingTime}</p>
                <p className="col-span-2">
                  <strong>Venue:</strong>{" "}
                  {(selectedApp.schedule?.trainingLocation || "Gov Services Skills Development Center, Batasan Hills").replace(
                    /QC Skills Development Center/gi,
                    "Gov Services Skills Development Center"
                  )}{" "}
                  (<em>{selectedApp.schedule?.landmark}</em>)
                </p>
              </div>
            </div>

            {/* Attendance & Session Monitor (Live Observe-Only for Admin) */}
            {selectedApp.status === "approved" && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Daily Attendance Tracker (Live Observe Only • 12 Hours Target)</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {Math.min(
                      12,
                      (selectedApp.attendance?.sessions?.filter((s) => s.attended).length ||
                        Math.min(4, Math.floor((selectedApp.attendance?.hoursCompleted || 0) / 3))) * 3
                    )}{" "}
                    / 12 Hours (
                    {Math.min(
                      4,
                      selectedApp.attendance?.sessions?.filter((s) => s.attended).length ||
                        Math.floor((selectedApp.attendance?.hoursCompleted || 0) / 3)
                    )}
                    /4 Days)
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedApp.attendance?.sessions || [
                    { day: 1, topic: "Orientation & Fundamental Skills", hours: 3, attended: false, date: "Day 1" },
                    { day: 2, topic: "Hands-on Application & Practical Work", hours: 3, attended: false, date: "Day 2" },
                    { day: 3, topic: "Specialized Techniques & Practical Assessment", hours: 3, attended: false, date: "Day 3" },
                    { day: 4, topic: "Final Evaluation, Livelihood Integration & Completion", hours: 3, attended: false, date: "Day 4" },
                  ]).map((sess) => (
                    <div
                      key={sess.day}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        sess.attended
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 shadow-2xs"
                          : "bg-muted/10 border-border text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            sess.attended ? "bg-emerald-600 text-white shadow-xs" : "border border-border bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          {sess.attended ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : `D${sess.day}`}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Day {sess.day}: {sess.topic}</span>
                          <span className="text-[10px] text-muted-foreground block">3 Hours Daily Session</span>
                        </div>
                      </div>
                      <div>
                        {sess.attended ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white shadow-2xs select-none">
                            Attended (3hrs)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-muted/40 text-muted-foreground border border-border select-none">
                            Not yet attended
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2 border-t border-border">
              {showRejectInput && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                  <label className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                    Reason for Rejection:
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="State the reason why this application cannot be approved..."
                    className="w-full p-2 text-xs rounded-lg border border-rose-300 bg-background focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/40 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedApp)}
                      className="px-3 py-1 rounded-md bg-rose-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {(selectedApp.status === "pending" || selectedApp.status === "under_review") && !showRejectInput && (
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                    >
                      Reject Application
                    </button>
                  )}
                  {selectedApp.status === "approved" && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{isEn ? "Application Approved & Active in Training" : "Aprubado ang Aplikasyon • Aktibo sa Pagsasanay"}</span>
                    </div>
                  )}
                  {selectedApp.status === "rejected" && (
                    <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 text-xs font-bold border border-rose-500/30">
                      {isEn ? "Application Rejected" : "Hindi Naaprubahan"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedApp.status !== "approved" && selectedApp.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedApp)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve Application</span>
                    </button>
                  )}

                  {selectedApp.attendance?.completed && (
                    <button
                      type="button"
                      onClick={() => setPreviewCertApp(selectedApp)}
                      className="px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="h-4 w-4" />
                      <span>{isEn ? "View Certificate" : isBis ? "Tan-awa ang Sertipiko" : "Tingnan ang Sertipiko"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 text-foreground text-xs font-semibold cursor-pointer"
                  >
                    {isEn ? "Close" : "Isara"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CERTIFICATE PREVIEW MODAL (ADMIN VIEW-ONLY)                 */}
      {/* ============================================================ */}
      {previewCertApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                <span className="font-bold text-sm text-foreground">Official Certificate Preview (View Only)</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCertApp(null)}
                className="text-muted-foreground hover:text-foreground text-base font-bold px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div
              className="bg-white text-slate-900 border-8 border-double border-amber-600/60 rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-md relative"
              style={{ fontFamily: "Georgia, serif" }}
            >
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
                  {previewCertApp.applicantInfo?.fullName}
                </h3>
                <p className="text-xs text-slate-700 max-w-lg mx-auto leading-relaxed">
                  {isEn ? (
                    <>
                      for the successful completion of <strong>12 Hours of Intensive Training (4 Days • 3 hrs/day)</strong> in{" "}
                      <strong>{previewCertApp.trainingName}</strong> held at Gov Services Skills Development Center, Batasan Hills.
                    </>
                  ) : isBis ? (
                    <>
                      alang sa malamposong paghuman sa <strong>12 ka Oras sa Pagsasanay (4 ka Adlaw • 3 ka oras/adlaw)</strong> sa ilalom sa{" "}
                      kursong <strong>{previewCertApp.trainingName}</strong> nga gipahigayon sa Gov Services Skills Development Center, Batasan Hills.
                    </>
                  ) : (
                    <>
                      para sa matagumpay na pagtatapos ng <strong>12 Oras ng Masinsinang Pagsasanay (4 na Araw • 3 oras/araw)</strong> sa ilalim ng{" "}
                      kursong <strong>{previewCertApp.trainingName}</strong> na ginanap sa Gov Services Skills Development Center, Batasan Hills.
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 text-left text-[10px] text-slate-600 border-t border-slate-200">
                <div>
                  <p>Certificate No: <strong className="font-mono text-slate-900">{previewCertApp.certificate?.certificateNo || `GOV-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`}</strong></p>
                  <p>{isEn ? "Issue Date:" : isBis ? "Petsa sa Pag-isyu:" : "Petsa ng Pag-isyu:"} <strong className="text-slate-900">{previewCertApp.certificate?.issueDate || new Date().toLocaleDateString()}</strong></p>
                  <p>QC ID: <strong className="font-mono text-slate-900">{previewCertApp.qcid}</strong></p>
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setPreviewCertApp(null)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isEn ? "Close" : isBis ? "Isira" : "Isara"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
