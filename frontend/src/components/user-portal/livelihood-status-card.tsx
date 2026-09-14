import { useState } from "react"
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  PackageCheck,
} from "lucide-react"

export interface LivelihoodApplicationRecord {
  id: number | string
  reference_number: string
  user_id: string
  application_status: "pending" | "under_review" | "approved" | "rejected" | "needs_revision"
  qcid: string
  first_name: string
  middle_name?: string
  last_name: string
  suffix?: string
  nationality?: string
  date_of_birth?: string
  age?: number | string
  gender?: string
  civilStatus?: string
  bloodType?: string
  house_building_no?: string
  street_name?: string
  barangay?: string
  phone_number?: string
  email?: string
  livelihood_type: string
  livelihood_status: string
  business_description: string
  business_location: string
  same_as_registered_address?: boolean
  assistance_needed: string[]
  estimated_amount?: number | string
  reason_purpose: string
  uploaded_documents?: Array<{ id: string; label: string; type: string; original_filename?: string }>
  rejection_reason?: string
  revision_reason?: string
  revision_notes?: string
  admin_notes?: string
  approved_by?: string
  approved_date?: string
  created_at: string
  updated_at?: string
  assistance?: any
  monitoring?: any[]
}

interface LivelihoodStatusCardProps {
  application: LivelihoodApplicationRecord
  onUpdateApplication: (app: LivelihoodApplicationRecord) => void
  onProceedToAssistance: (app: LivelihoodApplicationRecord) => void
}

export default function LivelihoodStatusCard({
  application,
  onUpdateApplication,
  onProceedToAssistance,
}: LivelihoodStatusCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false)

  const status = application.application_status || "under_review"
  const isUnderReview = status === "under_review" || status === "pending"
  const isApproved = status === "approved"
  const isRejected = status === "rejected"
  const isNeedsRevision = status === "needs_revision"

  const fullName = `${application.first_name} ${application.middle_name ? application.middle_name + " " : ""}${application.last_name}${application.suffix ? " " + application.suffix : ""}`.trim()

  return (
    <div className="space-y-6">
      {/* Main Status Header Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Status Header Banner */}
        <div
          className={`p-6 text-white ${
            isApproved
              ? "bg-gradient-to-r from-emerald-600 to-teal-700"
              : isRejected
              ? "bg-gradient-to-r from-rose-600 to-red-700"
              : isNeedsRevision
              ? "bg-gradient-to-r from-amber-600 to-orange-700"
              : "bg-gradient-to-r from-blue-700 to-indigo-800"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shrink-0">
                {isApproved && <CheckCircle2 className="h-7 w-7 text-white" />}
                {isRejected && <XCircle className="h-7 w-7 text-white" />}
                {isNeedsRevision && <AlertCircle className="h-7 w-7 text-white animate-pulse" />}
                {isUnderReview && <Clock className="h-7 w-7 text-white animate-pulse" />}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  APPLICATION STATUS
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {isApproved && "APPLICATION APPROVED"}
                  {isRejected && "APPLICATION REJECTED"}
                  {isNeedsRevision && "NEEDS REVISION"}
                  {isUnderReview && "PENDING / UNDER REVIEW"}
                </h2>
                <p className="text-xs text-white/90 mt-0.5">
                  Reference Number: <span className="font-mono font-bold">{application.reference_number}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetailModal(true)}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                View Full Details
              </button>
            </div>
          </div>
        </div>

        {/* Status Body and Explanations */}
        <div className="p-6 space-y-6">
          {/* ============================================================ */}
          {/* 1. PENDING / UNDER REVIEW STATE                              */}
          {/* ============================================================ */}
          {isUnderReview && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-foreground space-y-2">
                <p className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Kasalukuyang Sinusuri ang Iyong Livelihood Application
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ang iyong aplikasyon para sa <strong>{application.livelihood_type}</strong> ay matagumpay na natanggap at kasalukuyang sinusuri ng Quezon City Social Services Development Department (SSDD) assessment officer. Mangyaring abangan ang susunod na abiso ukol sa validation at release schedule.
                </p>
              </div>

              {/* Visual Workflow Steps */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Verification Progress
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shrink-0">
                      ✓
                    </span>
                    <div>
                      <p className="font-bold text-foreground">1. Application Submitted</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(application.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 animate-pulse">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-blue-700 dark:text-blue-300">2. Under Document Review</p>
                      <p className="text-[11px] text-muted-foreground">In Progress &bull; SSDD Desk</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5 opacity-60">
                    <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">3. Final Approval &amp; Release</p>
                      <p className="text-[11px] text-muted-foreground">Pending Assessment</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. NEEDS REVISION STATE                                      */}
          {/* ============================================================ */}
          {isNeedsRevision && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-amber-500/15 border border-amber-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-base text-amber-900 dark:text-amber-200">
                      May Kailangang Baguhin o Idagdag sa Iyong Aplikasyon
                    </h3>
                    <p className="text-xs text-amber-900/90 dark:text-amber-300 mt-1">
                      Pakibasa ang mga sumusunod na komento mula sa SSDD evaluator:
                    </p>
                  </div>
                </div>

                {/* Revision Notes Box */}
                <div className="p-4 rounded-xl bg-card border border-amber-500/30 text-sm text-foreground space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                      Reason for Revision:
                    </p>
                    <p className="font-bold text-foreground">
                      {application.revision_reason || application.rejection_reason || "Incomplete Documents / Information Update Required"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                      Admin Remarks / Instructions:
                    </p>
                    <p className="font-medium text-foreground leading-relaxed">
                      {application.revision_notes || application.admin_notes || "Paki-update ang impormasyon at mag-upload muli ng malinaw na kopya ng mga kinakailangang dokumento."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action: Revise Application */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground text-sm">Handa ka na bang i-update ang impormasyon?</p>
                  <p className="mt-0.5">Maaari mong baguhin ang mga detalye sa form at i-click ang Submit Application upang muling ma-review ng admin.</p>
                </div>

                <button
                  onClick={() => onUpdateApplication(application)}
                  id="btn-update-livelihood-revision"
                  className="w-full sm:w-auto px-6 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                  Revise Application
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. REJECTED STATE                                            */}
          {/* ============================================================ */}
          {isRejected && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                <div className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-base text-rose-900 dark:text-rose-200">
                      Application Closed / Hindi Naaprubahan
                    </h3>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                      Ikinalulungkot naming ipabatid na hindi pumasa ang aplikasyon batay sa sumusunod na opisyal na pagsusuri:
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-rose-500/20 text-sm text-foreground space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-0.5">
                      Reason for Rejection:
                    </p>
                    <p className="font-bold text-foreground">
                      {application.rejection_reason || "Hindi nakatugon sa eligibility guidelines ng Livelihood Program."}
                    </p>
                  </div>

                  {application.admin_notes && (
                    <div className="pt-2 border-t border-rose-500/20">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-0.5">
                        Admin Remarks:
                      </p>
                      <p className="font-medium text-foreground leading-relaxed">
                        {application.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border text-xs text-muted-foreground flex items-center justify-between">
                <span>Status: <strong className="text-rose-600 uppercase font-bold">Application Closed</strong></span>
                <span>Maaaring mag-aplay muli sa susunod na evaluation cycle.</span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. APPROVED STATE                                            */}
          {/* ============================================================ */}
          {isApproved && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                      Binabati Kita! Inaprubahan ang Iyong Livelihood Application
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      Ang iyong aplikasyon para sa <strong>{application.livelihood_type}</strong> ay opisyal nang naaprubahan ng QC SSDD.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-card border border-emerald-500/20">
                    <span className="text-muted-foreground">Inaprubahan ni:</span>
                    <p className="font-bold text-foreground mt-0.5">{application.approved_by || "SSDD Livelihood Committee"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-emerald-500/20">
                    <span className="text-muted-foreground">Petsa ng Pag-apruba:</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {application.approved_date ? new Date(application.approved_date).toLocaleDateString() : new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Call to action: Go directly to Part 2 */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                    Next Step: Part 2 of Program
                  </span>
                  <h4 className="text-base sm:text-lg font-bold">
                    Tingnan ang Capital / Materials Assistance Details
                  </h4>
                  <p className="text-xs text-white/80">
                    Alamin ang approved pondo, kagamitan (equipment), materyales, at release schedule.
                  </p>
                </div>

                <button
                  onClick={() => onProceedToAssistance(application)}
                  id="btn-proceed-capital-assistance"
                  className="w-full sm:w-auto px-6 h-11 rounded-xl bg-white text-blue-700 hover:bg-white/90 text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <PackageCheck className="h-4 w-4" />
                  View Capital &amp; Materials
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Summary Info Table */}
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Application Summary Snapshot
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">Applicant:</span>
                <p className="font-bold text-foreground mt-0.5 truncate">{fullName}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">Livelihood:</span>
                <p className="font-bold text-foreground mt-0.5 truncate">{application.livelihood_type}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">Business Status:</span>
                <p className="font-bold text-foreground mt-0.5">{application.livelihood_status}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">Assistance Types:</span>
                <p className="font-bold text-foreground mt-0.5 truncate">
                  {application.assistance_needed?.join(", ") || "Financial / Materials"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card border border-border w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="font-bold text-base text-foreground">Application Record: {application.reference_number}</h3>
                <p className="text-xs text-muted-foreground">{application.livelihood_type} &bull; {application.livelihood_status}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs text-foreground">
              <div className="space-y-1">
                <p className="font-bold text-primary uppercase text-[11px]">Applicant Information</p>
                <p><strong>Name:</strong> {fullName}</p>
                <p><strong>QCID:</strong> {application.qcid}</p>
                <p><strong>Phone:</strong> {application.phone_number}</p>
                <p><strong>Email:</strong> {application.email || "N/A"}</p>
                <p><strong>Address:</strong> {application.house_building_no} {application.street_name}, {application.barangay}, Quezon City</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <p className="font-bold text-primary uppercase text-[11px]">Business Details</p>
                <p><strong>Type:</strong> {application.livelihood_type}</p>
                <p><strong>Status:</strong> {application.livelihood_status}</p>
                <p><strong>Location:</strong> {application.business_location}</p>
                <p><strong>Description:</strong> {application.business_description}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <p className="font-bold text-primary uppercase text-[11px]">Assistance Requested</p>
                <p><strong>Types:</strong> {application.assistance_needed?.join(", ")}</p>
                {application.estimated_amount && Number(application.estimated_amount) > 0 ? (
                  <p><strong>Approved Grant Amount:</strong> ₱{Number(application.estimated_amount).toLocaleString()}</p>
                ) : null}
                <p><strong>Reason / Purpose:</strong> {application.reason_purpose}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <p className="font-bold text-primary uppercase text-[11px]">Uploaded Documents</p>
                {application.uploaded_documents && application.uploaded_documents.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {application.uploaded_documents.map((d, i) => (
                      <li key={i}>{d.label || d.type}: {d.original_filename || "Attached"}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Standard documents attached upon submission.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end bg-muted/20">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
