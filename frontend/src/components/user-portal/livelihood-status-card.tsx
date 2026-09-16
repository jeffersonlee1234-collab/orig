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
  RotateCcw,
} from "lucide-react"
import { useLanguage } from "../ui/language-context"

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
  const { language } = useLanguage()
  const isEn = language === "en"
  const isBis = language === "bis"

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
                  {isEn ? "APPLICATION STATUS" : isBis ? "STATUS SA APLIKASYON" : "STATUS NG APLIKASYON"}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {isApproved && (isEn ? "APPLICATION APPROVED" : isBis ? "NAAPROBAHAN ANG APLIKASYON" : "APPLICATION APPROVED")}
                  {isRejected && (isEn ? "APPLICATION DISAPPROVED" : isBis ? "WALA MAAPROBAHI ANG APLIKASYON" : "HINDI NAAPRUBAHAN ANG APLIKASYON")}
                  {isNeedsRevision && (isEn ? "NEEDS REVISION" : isBis ? "KINAHANGLANG USBAHON" : "KAILANGAN NG REBISYON")}
                  {isUnderReview && (isEn ? "PENDING / UNDER REVIEW" : isBis ? "GISUSI PA (PENDING)" : "KASALUKUYANG SINUSURI (PENDING)")}
                </h2>
                <p className="text-xs text-white/90 mt-0.5">
                  {isEn ? "Reference Number:" : isBis ? "Numero sa Reperensya:" : "Reference Number:"} <span className="font-mono font-bold">{application.reference_number}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetailModal(true)}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                {isEn ? "View Full Details" : isBis ? "Tan-awa ang Tibuok Detalye" : "Tingnan ang Kumpletong Detalye"}
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
                  {isEn
                    ? "Your Livelihood Application is Currently Under Review"
                    : isBis
                    ? "Kasamtangang Gisusi ang Imong Aplikasyon sa Panginabuhi"
                    : "Kasalukuyang Sinusuri ang Iyong Livelihood Application"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEn ? (
                    <>
                      Your application for <strong>{application.livelihood_type}</strong> has been successfully received and is currently being evaluated by the Quezon City Social Services Development Department (SSDD) assessment officer. Please await further notice regarding validation and release schedule.
                    </>
                  ) : isBis ? (
                    <>
                      Ang imong aplikasyon para sa <strong>{application.livelihood_type}</strong> malampusong nadawat ug kasamtangang gisusi sa Quezon City Social Services Development Department (SSDD) assessment officer. Palihug paghulat sa dugang pahibalo bahin sa validation ug schedule.
                    </>
                  ) : (
                    <>
                      Ang iyong aplikasyon para sa <strong>{application.livelihood_type}</strong> ay matagumpay na natanggap at kasalukuyang sinusuri ng Quezon City Social Services Development Department (SSDD) assessment officer. Mangyaring abangan ang susunod na abiso ukol sa validation at release schedule.
                    </>
                  )}
                </p>
              </div>

              {/* Visual Workflow Steps */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isEn ? "Verification Progress" : isBis ? "Progreso sa Pagpamatuod" : "Progreso ng Pagpapatunay"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shrink-0">
                      ✓
                    </span>
                    <div>
                      <p className="font-bold text-foreground">
                        {isEn ? "1. Application Submitted" : isBis ? "1. Nasumite ang Aplikasyon" : "1. Naisumite ang Aplikasyon"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{new Date(application.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 animate-pulse">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-blue-700 dark:text-blue-300">
                        {isEn ? "2. Under Document Review" : isBis ? "2. Pagsusi sa Dokumento" : "2. Pagsusuri ng Dokumento"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isEn ? "In Progress • SSDD Desk" : isBis ? "Nagpadayon • SSDD Desk" : "Kasalukuyan • SSDD Desk"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5 opacity-60">
                    <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {isEn ? "3. Final Approval & Release" : isBis ? "3. Katapusang Pag-apruba ug Release" : "3. Huling Pag-apruba at Release"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isEn ? "Pending Assessment" : isBis ? "Paghulat sa Pagsusi" : "Naghihintay ng Pagsusuri"}
                      </p>
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
                      {isEn
                        ? "Information Update or Additional Documents Required"
                        : isBis
                        ? "Adunay Kinahanglang Usbon o Idugang sa Imong Aplikasyon"
                        : "May Kailangang Baguhin o Idagdag sa Iyong Aplikasyon"}
                    </h3>
                    <p className="text-xs text-amber-900/90 dark:text-amber-300 mt-1">
                      {isEn
                        ? "Please read the following feedback and instructions from the SSDD evaluator:"
                        : isBis
                        ? "Palihug basaha ang mga komentaryo ug instruksyon gikan sa SSDD evaluator:"
                        : "Pakibasa ang mga sumusunod na komento at tagubilin mula sa SSDD evaluator:"}
                    </p>
                  </div>
                </div>

                {/* Revision Notes Box */}
                <div className="p-4 rounded-xl bg-card border border-amber-500/30 text-sm text-foreground space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                      {isEn ? "Reason for Revision:" : isBis ? "Hinungdan sa Pag-usab:" : "Dahilan ng Rebisyon:"}
                    </p>
                    <p className="font-bold text-foreground">
                      {application.revision_reason || application.rejection_reason || (isEn ? "Incomplete Documents / Information Update Required" : "Kulang ang Dokumento / Kinakailangan ng Update")}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                      {isEn ? "Admin Remarks / Instructions:" : isBis ? "Mga Pahayag / Instruksyon sa Admin:" : "Mga Tala / Tagubilin ng Admin:"}
                    </p>
                    <p className="font-medium text-foreground leading-relaxed">
                      {application.revision_notes || application.admin_notes || (isEn ? "Please update your details and re-upload clear copies of the required documents." : "Paki-update ang impormasyon at mag-upload muli ng malinaw na kopya ng mga kinakailangang dokumento.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action: Revise Application */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground text-sm">
                    {isEn ? "Ready to update your application?" : isBis ? "Andam na ba ka nga i-update ang imong aplikasyon?" : "Handa ka na bang i-update ang impormasyon?"}
                  </p>
                  <p className="mt-0.5">
                    {isEn
                      ? "You can modify your details and click Submit Application for expedited SSDD re-evaluation."
                      : isBis
                      ? "Mahimo nimong usbon ang mga detalye ug i-click ang Submit Application aron masusi kini pag-usab."
                      : "Maaari mong baguhin ang mga detalye sa form at i-click ang Submit Application upang muling ma-review ng admin."}
                  </p>
                </div>

                <button
                  onClick={() => onUpdateApplication(application)}
                  id="btn-update-livelihood-revision"
                  className="w-full sm:w-auto px-6 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                  {isEn ? "Revise Application" : isBis ? "I-update ang Aplikasyon" : "I-update ang Aplikasyon"}
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
                      {isEn ? "Application Closed / Disapproved" : isBis ? "Aplikasyon Gisira / Wala Maaprobahi" : "Application Closed / Hindi Naaprubahan"}
                    </h3>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                      {isEn
                        ? "We regret to inform you that your application was not approved based on the official evaluation below:"
                        : isBis
                        ? "Gikasubo namo nga ipahibalo nga wala maaprobahan ang aplikasyon sumala sa opisyal nga pagsusi sa ubos:"
                        : "Ikinalulungkot naming ipabatid na hindi pumasa ang aplikasyon batay sa sumusunod na opisyal na pagsusuri:"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-rose-500/20 text-sm text-foreground space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-0.5">
                      {isEn ? "Reason for Disapproval:" : isBis ? "Hinungdan sa Wala Pag-apruba:" : "Dahilan ng Hindi Pag-apruba:"}
                    </p>
                    <p className="font-bold text-foreground">
                      {application.rejection_reason || (isEn ? "Did not meet program eligibility guidelines." : "Hindi nakatugon sa eligibility guidelines ng Livelihood Program.")}
                    </p>
                  </div>

                  {application.admin_notes && (
                    <div className="pt-2 border-t border-rose-500/20">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-0.5">
                        {isEn ? "Admin Remarks:" : isBis ? "Mga Pahayag sa Admin:" : "Mga Tala ng Admin:"}
                      </p>
                      <p className="font-medium text-foreground leading-relaxed">
                        {application.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground text-sm">
                    {isEn ? "Would you like to re-apply?" : isBis ? "Gusto ba nimong mag-apply pag-usab?" : "Gusto mo bang mag-apply muli?"}
                  </p>
                  <p className="mt-0.5">
                    {isEn
                      ? "You may submit a fresh livelihood application along with complete supporting information and documents."
                      : isBis
                      ? "Mahimo kang mosumite og bag-ong aplikasyon sa panginabuhi uban ang kumpletong mga dokumento."
                      : "Maaari kang magsumite ng bagong livelihood application kalakip ang mga kinakailangang impormasyon at dokumento."}
                  </p>
                </div>

                <button
                  onClick={() => onUpdateApplication(application)}
                  id="btn-reapply-livelihood"
                  className="w-full sm:w-auto px-6 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 shrink-0 uppercase"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isEn ? "Re-Apply Now" : isBis ? "Mag-apply Pag-usab" : "Mag-apply Muli (Re-Apply)"}
                </button>
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
                      {isEn
                        ? "Congratulations! Your Livelihood Application is Approved"
                        : isBis
                        ? "Pahalipay! Gi-aprobahan ang Imong Aplikasyon sa Panginabuhi"
                        : "Binabati Kita! Inaprubahan ang Iyong Livelihood Application"}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      {isEn ? (
                        <>
                          Your application for <strong>{application.livelihood_type}</strong> has been officially approved by QC SSDD.
                        </>
                      ) : isBis ? (
                        <>
                          Ang imong aplikasyon alang sa <strong>{application.livelihood_type}</strong> opisyal nang gi-aprobahan sa QC SSDD.
                        </>
                      ) : (
                        <>
                          Ang iyong aplikasyon para sa <strong>{application.livelihood_type}</strong> ay opisyal nang naaprubahan ng QC SSDD.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-card border border-emerald-500/20">
                    <span className="text-muted-foreground">{isEn ? "Approved By:" : isBis ? "Gi-aprobahan ni:" : "Inaprubahan ni:"}</span>
                    <p className="font-bold text-foreground mt-0.5">{application.approved_by || "SSDD Livelihood Committee"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-emerald-500/20">
                    <span className="text-muted-foreground">{isEn ? "Approval Date:" : isBis ? "Petsa sa Pag-apruba:" : "Petsa ng Pag-apruba:"}</span>
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
                    {isEn ? "Next Step: Part 2 of Program" : isBis ? "Sunod nga Lakang: Bahin 2 sa Programa" : "Next Step: Part 2 of Program"}
                  </span>
                  <h4 className="text-base sm:text-lg font-bold">
                    {isEn
                      ? "View Capital / Materials Assistance Details"
                      : isBis
                      ? "Tan-awa ang mga Detalye sa Kapital / Materyales"
                      : "Tingnan ang Capital / Materials Assistance Details"}
                  </h4>
                  <p className="text-xs text-white/80">
                    {isEn
                      ? "Check your approved grant funds, equipment, supplies, and release schedule."
                      : isBis
                      ? "Susihon ang naaprobahang pundo, kagamitan (ekipo), materyales, ug iskedyul sa pagpagawas."
                      : "Alamin ang approved pondo, kagamitan (equipment), materyales, at release schedule."}
                  </p>
                </div>

                <button
                  onClick={() => onProceedToAssistance(application)}
                  id="btn-proceed-capital-assistance"
                  className="w-full sm:w-auto px-6 h-11 rounded-xl bg-white text-blue-700 hover:bg-white/90 text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <PackageCheck className="h-4 w-4" />
                  {isEn ? "View Capital & Materials" : isBis ? "Tan-awa ang Kapital ug Materyales" : "Tingnan ang Capital & Materials"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Summary Info Table */}
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {isEn ? "Application Summary Snapshot" : isBis ? "Mubo nga Sumaryo sa Aplikasyon" : "Application Summary Snapshot"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">{isEn ? "Applicant:" : isBis ? "Aplikante:" : "Aplikante:"}</span>
                <p className="font-bold text-foreground mt-0.5 truncate">{fullName}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">{isEn ? "Livelihood:" : isBis ? "Panginabuhi:" : "Kabuhayan:"}</span>
                <p className="font-bold text-foreground mt-0.5 truncate">{application.livelihood_type}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">{isEn ? "Business Status:" : isBis ? "Status sa Negosyo:" : "Status ng Negosyo:"}</span>
                <p className="font-bold text-foreground mt-0.5">{application.livelihood_status}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <span className="text-muted-foreground">{isEn ? "Assistance Types:" : isBis ? "Matang sa Tabang:" : "Uri ng Tulong:"}</span>
                <p className="font-bold text-foreground mt-0.5 truncate">
                  {application.assistance_needed?.join(", ") || (isEn ? "Financial / Materials" : "Pinansyal / Kagamitan")}
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
                <h3 className="font-bold text-base text-foreground">
                  {isEn ? "Application Record:" : isBis ? "Rekord sa Aplikasyon:" : "Talaan ng Aplikasyon:"} {application.reference_number}
                </h3>
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
                <p className="font-bold text-primary uppercase text-[11px]">{isEn ? "Applicant Information" : isBis ? "Impormasyon sa Aplikante" : "Impormasyon ng Aplikante"}</p>
                <p><strong>{isEn ? "Name:" : "Pangalan:"}</strong> {fullName}</p>
                <p><strong>QCID:</strong> {application.qcid}</p>
                <p><strong>{isEn ? "Phone:" : "Telepono:"}</strong> {application.phone_number}</p>
                <p><strong>Email:</strong> {application.email || "N/A"}</p>
                <p><strong>{isEn ? "Address:" : "Tirahan:"}</strong> {application.house_building_no} {application.street_name}, {application.barangay}, Quezon City</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <p className="font-bold text-primary uppercase text-[11px]">{isEn ? "Business Details" : isBis ? "Mga Detalye sa Negosyo" : "Detalye ng Negosyo"}</p>
                <p><strong>{isEn ? "Type:" : "Uri:"}</strong> {application.livelihood_type}</p>
                <p><strong>Status:</strong> {application.livelihood_status}</p>
                <p><strong>{isEn ? "Location:" : "Lokasyon:"}</strong> {application.business_location}</p>
                <p><strong>{isEn ? "Description:" : "Deskripsyon:"}</strong> {application.business_description}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <p className="font-bold text-primary uppercase text-[11px]">{isEn ? "Assistance Requested" : isBis ? "Gipangayong Tabang" : "Hinihinging Tulong"}</p>
                <p><strong>{isEn ? "Types:" : "Mga Uri:"}</strong> {application.assistance_needed?.join(", ")}</p>
                {application.estimated_amount && Number(application.estimated_amount) > 0 ? (
                  <p><strong>{isEn ? "Approved Grant Amount:" : isBis ? "Gi-aprobahang Ayuda:" : "Inaprubahang Halaga:"}</strong> ₱{Number(application.estimated_amount).toLocaleString()}</p>
                ) : null}
                <p><strong>{isEn ? "Reason / Purpose:" : isBis ? "Hinungdan / Katuyoan:" : "Dahilan / Layunin:"}</strong> {application.reason_purpose}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <p className="font-bold text-primary uppercase text-[11px]">{isEn ? "Uploaded Documents" : isBis ? "Na-upload nga mga Dokumento" : "Mga Dokumentong Naka-upload"}</p>
                {application.uploaded_documents && application.uploaded_documents.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {application.uploaded_documents.map((d, i) => (
                      <li key={i}>{d.label || d.type}: {d.original_filename || (isEn ? "Attached" : "Kalakip")}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">{isEn ? "Standard documents attached upon submission." : "Karaniwang mga dokumento ang nakalakip sa pagsumite."}</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end bg-muted/20">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
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

