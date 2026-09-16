import { useState, useEffect } from "react"
import {
  History,
  Building2,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  User,
  MapPin,
  TrendingUp,
} from "lucide-react"
import { useLanguage } from "../ui/language-context"
import { API_BASE } from "../../config/api"
import { getLoggedInUserQcid, getCurrentUserProfile } from "../../utils/userProfile"
import type { LivelihoodApplicationRecord } from "./livelihood-status-card"

interface LivelihoodHistoryViewProps {
  currentApplication: LivelihoodApplicationRecord | null
  onSelectApplication?: (app: LivelihoodApplicationRecord) => void
  onNavigateTab?: (tab: "apply" | "assistance" | "monitoring") => void
}

export default function LivelihoodHistoryView({
  currentApplication,
  onNavigateTab,
}: LivelihoodHistoryViewProps) {
  const { language } = useLanguage()
  const isEn = language === "en" || !language
  const isBis = language === "bis"

  const [historyApps, setHistoryApps] = useState<any[]>(() => {
    try {
      const profile = getCurrentUserProfile()
      const qcId = getLoggedInUserQcid() || profile.qcidNo || ""
      const local = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
      if (Array.isArray(local) && local.length > 0) {
        const matches = local.filter((a: any) => !qcId || a.qcid === qcId || a.user_id === qcId || a.reference_number === qcId)
        if (matches.length > 0) return matches
        return local
      }
    } catch (_) {}
    return currentApplication ? [currentApplication] : []
  })
  const [isLoading, setIsLoading] = useState(() => historyApps.length === 0)
  const [selectedAppModal, setSelectedAppModal] = useState<any | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadHistory = async (silent = false) => {
      try {
        if (!silent && historyApps.length === 0) {
          setIsLoading(true)
        }
        const profile = getCurrentUserProfile()
        const qcId = getLoggedInUserQcid() || profile.qcidNo || "110000116932100"
        const userEmail = (profile.email || "").toLowerCase().trim()
        const userFirst = (profile.firstName || "").toLowerCase().trim()
        const userLast = (profile.lastName || "").toLowerCase().trim()
        const userFull = `${userFirst} ${userLast}`.trim()

        const isUserMatch = (app: any) => {
          if (!app) return false
          if (app.qcid && qcId && String(app.qcid).trim() === String(qcId).trim()) return true
          if (app.reference_number && qcId && String(app.reference_number).trim() === String(qcId).trim()) return true
          if (app.email && userEmail && String(app.email).toLowerCase().trim() === userEmail) return true
          const appFullName = `${app.first_name || ""} ${app.last_name || ""}`.toLowerCase().trim()
          if (userFull && appFullName === userFull) return true
          if (userFirst && userLast && appFullName.includes(userFirst) && appFullName.includes(userLast)) return true
          return false
        }

        let allLivApps: any[] = []

        try {
          const res = await fetch(`${API_BASE}/api/livelihood/applications`)
          if (res.ok) {
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.applications || []
            allLivApps = list.filter(isUserMatch)
          }
        } catch (_) {}

        // Fallback or augment with local storage records
        try {
          const local = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
          if (Array.isArray(local)) {
            local.filter(isUserMatch).forEach((l) => {
              if (!allLivApps.some((a) => (a.id && l.id && a.id === l.id) || (a.reference_number && l.reference_number && a.reference_number === l.reference_number))) {
                allLivApps.push(l)
              }
            })
          }
        } catch (_) {}

        // Also ensure current active application is present in list if exists
        if (currentApplication && !allLivApps.some((a) => a.reference_number === currentApplication.reference_number || (a.id && currentApplication.id && a.id === currentApplication.id))) {
          allLivApps.unshift(currentApplication)
        }

        // Sort latest first
        allLivApps.sort((a, b) => {
          const timeA = new Date(a.created_at || a.approved_date || a.submitted_at || 0).getTime()
          const timeB = new Date(b.created_at || b.approved_date || b.submitted_at || 0).getTime()
          return timeB - timeA
        })

        if (isMounted) {
          setHistoryApps(allLivApps)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadHistory(historyApps.length > 0)

    const handleUpdate = () => loadHistory(true)
    window.addEventListener("livelihood_status_updated", handleUpdate)

    return () => {
      isMounted = false
      window.removeEventListener("livelihood_status_updated", handleUpdate)
    }
  }, [currentApplication?.id, currentApplication?.reference_number, currentApplication?.application_status, (currentApplication?.assistance as any)?.release_status])

  const totalGrants = historyApps.filter((a) => a.application_status === "approved" || a.status === "approved" || a.status === "released").length
  const totalAmount = historyApps.reduce((sum, a) => {
    const isAppr = a.application_status === "approved" || a.status === "approved" || a.status === "released"
    if (isAppr) {
      const amt = Number(a.assistance?.approved_financial_amount) || Number(a.estimated_amount) || 15000
      return sum + amt
    }
    return sum
  }, 0)

  const getStatusBadge = (stRaw: string, assist?: any) => {
    const st = String(stRaw || "pending").toLowerCase()
    const isReleased = assist?.release_status === "RELEASED" || assist?.assistance_status === "released" || st === "released"

    if (isReleased) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
          {isEn ? "RELEASED & ACTIVE" : isBis ? "NA-RELEASE NA" : "NA-RELEASE NA"}
        </span>
      )
    }

    if (st === "approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {isEn ? "APPROVED GRANT" : isBis ? "APROBADO" : "APRUBADO"}
        </span>
      )
    }

    if (st === "needs_revision" || st === "needs-revision") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
          {isEn ? "NEEDS REVISION" : isBis ? "KINAHANGLAN OG BAG-O" : "KAILANGAN NG REVISION"}
        </span>
      )
    }

    if (st === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
          {isEn ? "DISAPPROVED" : isBis ? "GIBALIBARAN" : "TINANGGIHAN"}
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
        <Clock className="h-3.5 w-3.5 text-blue-600 animate-spin" />
        {isEn ? "UNDER REVIEW" : isBis ? "GINASUSI" : "SINUSURI"}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Top Hero Banner ── */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase">
                {isEn
                  ? "STAGE 4 • LIVELIHOOD HISTORY"
                  : isBis
                  ? "IKAPAT NGA YUGTO • KASAYSAYAN SA PANGINABUHI"
                  : "YUGTO 4 • KASAYSAYAN NG KABUHAYAN"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold flex items-center gap-1">
                <History className="h-3 w-3" />
                {isEn ? "Grant Records Archive" : isBis ? "Arkibo sa mga Ayuda" : "Talaan ng mga Nakaraang Ayuda"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading">
              {isEn
                ? "Livelihood Application & Grant History"
                : isBis
                ? "Kasaysayan sa Aplikasyon ug Ayuda sa Panginabuhi"
                : "Kasaysayan ng Aplikasyon at Tulong sa Kabuhayan"}
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              {isEn
                ? "Complete chronological audit record of all your submitted livelihood assistance applications, approved capital payouts, material equipment grants, and monitoring inspections."
                : isBis
                ? "Kompletong kronolohikal nga rekord sa tanan nimong gisumite nga aplikasyon sa panginabuhi, naaprobahang kapital, gihatag nga kagamitan, ug mga inspeksyon sa monitoring."
                : "Kumpletong kronolohikal na talaan ng lahat ng iyong isinumiteng aplikasyon sa kabuhayan, naaprubahang kapital, ipinamahaging gamit, at mga ulat ng pagsubaybay."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold tracking-wide transition-all backdrop-blur-xs cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              {isEn ? "Print History" : isBis ? "I-print ang Kasaysayan" : "I-print ang Talaan"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Statistics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isEn ? "Total Applications" : isBis ? "Tanan nga Aplikasyon" : "Kabuuang Aplikasyon"}
            </span>
            <strong className="text-xl font-bold text-foreground mt-0.5 block">
              {historyApps.length}
            </strong>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isEn ? "Approved Grants" : isBis ? "Naaprobahang Ayuda" : "Aprubadong Grants"}
            </span>
            <strong className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {totalGrants}
            </strong>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isEn ? "Total Capital Value" : isBis ? "Kinatibuk-ang Bili sa Kapital" : "Kabuuang Halaga ng Kapital"}
            </span>
            <strong className="text-xl font-bold text-foreground mt-0.5 block">
              ₱{totalAmount.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* ── Applications History List ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                {isEn ? "Livelihood Records Timeline" : isBis ? "Linya sa Panahon sa Panginabuhi" : "Timeline ng mga Aplikasyon sa Kabuhayan"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? "View specific grant allocations, approved capital, and monitoring milestones"
                  : isBis
                  ? "Tan-awa ang mga partikular nga alokasyon sa tabang, giaprobahang kapital, ug monitoring"
                  : "Suriin ang mga nakalaang tulong, naaprubahang kapital, at pagsubaybay"}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
            {historyApps.length} {isEn ? "Records Found" : "Talaan"}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
            {isEn ? "Loading livelihood history records..." : "Kinukuha ang kasaysayan ng kabuhayan..."}
          </div>
        ) : historyApps.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-muted/20 border border-border space-y-3">
            <History className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-foreground">
              {isEn ? "No Livelihood Records Found" : isBis ? "Walay Nakit-ang Rekord sa Panginabuhi" : "Walang Nakitang Talaan sa Kabuhayan"}
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {isEn
                ? "You have not submitted any livelihood assistance applications yet. Begin by submitting an application in Stage 1."
                : isBis
                ? "Wala ka pa nakasumite og aplikasyon sa panginabuhi. Pagsugod pinaagi sa pag-apply sa Yugto 1."
                : "Wala ka pa naisusumiteng aplikasyon sa kabuhayan. Magsimula sa pamamagitan ng pag-apply sa Yugto 1."}
            </p>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab("apply")}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isEn ? "Apply for Livelihood Now" : isBis ? "Mag-apply Na Karon" : "Mag-apply sa Kabuhayan Ngayon"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {historyApps.map((app, idx) => {
              const refNo = app.reference_number || app.referenceNumber || `LP-2026-${app.id || 100}`
              const businessName = app.business_name || app.proposed_business_name || `${app.first_name}'s Enterprise`
              const livelihoodType = app.livelihood_type || "General Livelihood"
              const assist = app.assistance || {}
              const finAmount = Number(assist.approved_financial_amount) || Number(app.estimated_amount) || 15000
              const dateStr = app.approved_date || app.created_at || app.submitted_at || new Date().toISOString()
              const formattedDate = new Date(dateStr).toLocaleDateString(language === "en" ? "en-US" : "fil-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              const hasMonitoring = Array.isArray(app.monitoring) && app.monitoring.length > 0

              return (
                <div
                  key={app.id || refNo || idx}
                  className="p-5 rounded-2xl border border-border bg-card hover:border-indigo-500/40 transition-all shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-muted px-2.5 py-0.5 rounded-md text-foreground">
                          {refNo}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formattedDate}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        {businessName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(app.application_status || app.status, assist)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-muted/25 border border-border">
                      <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                        {isEn ? "Livelihood Type" : isBis ? "Matang sa Panginabuhi" : "Uri ng Kabuhayan"}
                      </span>
                      <span className="font-bold text-foreground block text-xs sm:text-sm mt-0.5">
                        {livelihoodType}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/25 border border-border">
                      <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                        {isEn ? "Financial Capital" : isBis ? "Pinansyal nga Kapital" : "Halaga ng Kapital"}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs sm:text-sm mt-0.5">
                        ₱{finAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/25 border border-border">
                      <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                        {isEn ? "Business Location" : isBis ? "Lokasyon sa Negosyo" : "Lokasyon ng Negosyo"}
                      </span>
                      <span className="font-semibold text-foreground block text-xs truncate mt-0.5" title={app.business_location || app.barangay}>
                        {app.business_location || (app.barangay ? `Brgy. ${app.barangay}, QC` : "Quezon City")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/25 border border-border">
                      <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                        {isEn ? "Monitoring Status" : isBis ? "Kahimtang sa Pagsubaybay" : "Estado ng Pagsubaybay"}
                      </span>
                      <span className="font-semibold text-foreground block text-xs mt-0.5 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                        {hasMonitoring ? `${app.monitoring.length} Inspections` : (isEn ? "Active / In Progress" : "Aktibo")}
                      </span>
                    </div>
                  </div>

                  {/* ── Card Action Buttons ── */}
                  <div className="flex items-center justify-between pt-1 border-t border-border flex-wrap gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {isEn ? "Evaluator: " : "Nagsuri: "}
                      <strong>{app.approved_by || "SSDD Livelihood Evaluator"}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {onNavigateTab && (app.application_status === "approved" || app.status === "approved") && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab("assistance")}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Package className="h-3.5 w-3.5" />
                          {isEn ? "Stage 2: Capital Details" : "Tingnan ang Kapital"}
                        </button>
                      )}

                      {onNavigateTab && (assist.release_status === "RELEASED" || hasMonitoring) && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab("monitoring")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          {isEn ? "Stage 3: Monitoring" : "Pagsubaybay"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
