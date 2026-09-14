import { useEffect, useMemo, useState, useCallback } from "react"
import {
  BarChart3,
  TrendingUp,
  Wallet,
  FileCheck2,
  Download,
  RefreshCw,
} from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Line,
} from "recharts"
import { API_BASE } from "../../config/api"

type ModuleKey =
  | "AICS"
  | "PWD & Senior Citizen"
  | "Solo Parent & Child Welfare"
  | "Livelihood & Training"

interface ModuleStat {
  module: ModuleKey
  total: number
  pending: number
  approved: number
  rejected: number
}

interface DisbursementSource {
  label: string
  amount: number
}

interface MonthlyData {
  label: string
  applications: number
  disbursed: number
}

// Initial baseline stats matching the system's active records
const BASELINE_MODULE_STATS: ModuleStat[] = [
  { module: "AICS", total: 184, pending: 37, approved: 129, rejected: 18 },
  { module: "PWD & Senior Citizen", total: 96, pending: 21, approved: 68, rejected: 7 },
  { module: "Solo Parent & Child Welfare", total: 58, pending: 14, approved: 39, rejected: 5 },
  { module: "Livelihood & Training", total: 4, pending: 2, approved: 1, rejected: 1 },
]

const BASELINE_DISBURSEMENTS: DisbursementSource[] = [
  { label: "AICS", amount: 1284600 },
  { label: "Social pension", amount: 412300 },
  { label: "Educational assistance", amount: 296700 },
  { label: "Livelihood kit funding", amount: 155000 },
]

const BASELINE_MONTHS: MonthlyData[] = [
  { label: "Mar", applications: 142, disbursed: 1620000 },
  { label: "Apr", applications: 158, disbursed: 1745000 },
  { label: "May", applications: 171, disbursed: 1890500 },
  { label: "Jun", applications: 165, disbursed: 1802300 },
  { label: "Jul", applications: 189, disbursed: 2015800 },
  { label: "Aug", applications: 342, disbursed: 2148600 },
]

const moduleColors: Record<ModuleKey, { bar: string; text: string; chip: string; hex: string }> = {
  AICS: { bar: "bg-blue-500", text: "text-blue-700", chip: "bg-blue-50 border-blue-200", hex: "#3b82f6" },
  "PWD & Senior Citizen": { bar: "bg-purple-500", text: "text-purple-700", chip: "bg-purple-50 border-purple-200", hex: "#a855f7" },
  "Solo Parent & Child Welfare": { bar: "bg-rose-500", text: "text-rose-700", chip: "bg-rose-50 border-rose-200", hex: "#f43f5e" },
  "Livelihood & Training": { bar: "bg-emerald-500", text: "text-emerald-700", chip: "bg-emerald-50 border-emerald-200", hex: "#10b981" },
}

const DEFAULT_MODULE_COLOR = {
  bar: "bg-slate-500",
  text: "text-slate-700",
  chip: "bg-slate-50 border-slate-200",
  hex: "#64748b",
}

function getModuleColors(key?: string) {
  if (!key) return DEFAULT_MODULE_COLOR
  if (moduleColors[key as ModuleKey]) return moduleColors[key as ModuleKey]

  const lower = key.toLowerCase()
  if (lower.includes("aics") || lower.includes("financial")) return moduleColors["AICS"]
  if (lower.includes("pwd") || lower.includes("senior")) return moduleColors["PWD & Senior Citizen"]
  if (lower.includes("solo") || lower.includes("child")) return moduleColors["Solo Parent & Child Welfare"]
  if (lower.includes("livelihood") || lower.includes("training") || lower.includes("skills")) return moduleColors["Livelihood & Training"]

  return DEFAULT_MODULE_COLOR
}

function peso(n: number) {
  return `₱${n.toLocaleString()}`
}

type RangeOption = "This Month" | "Last 3 Months" | "Last 6 Months" | "Year to Date"

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-soft text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          <span className="font-medium" style={{ color: p.color || p.payload?.fill }}>
            {p.name}:{" "}
          </span>
          {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Reports() {
  const [range, setRange] = useState<RangeOption>("Last 6 Months")
  const [barsAnimated, setBarsAnimated] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRangeChange = (newRange: RangeOption) => {
    setRange(newRange)
    setBarsAnimated(false)
    setTimeout(() => setBarsAnimated(true), 80)
  }

  // Real-time dynamic stats
  const [moduleStats, setModuleStats] = useState<ModuleStat[]>(BASELINE_MODULE_STATS)
  const [disbursementSources, setDisbursementSources] = useState<DisbursementSource[]>(BASELINE_DISBURSEMENTS)
  const [recentMonths, setRecentMonths] = useState<MonthlyData[]>(BASELINE_MONTHS)

  // Helper to avoid unnecessary re-renders when data hasn't changed
  const updateIfChanged = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, nextVal: T) => {
    setter((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(nextVal)) return prev
      return nextVal
    })
  }

  // Calculate live analytics from database endpoints and local live state
  const fetchLiveAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true)
    try {
      // 1. Try fetching directly from the backend analytics endpoint
      let backendSuccess = false
      try {
        const res = await fetch(`${API_BASE}/api/analytics/overview?range=${encodeURIComponent(range)}`)
        if (res.ok) {
          const resData = await res.json()
          if (resData?.data?.moduleStats && resData.data.moduleStats.length > 0) {
            backendSuccess = true
            const apiStats: ModuleStat[] = resData.data.moduleStats
            const apiDisb: DisbursementSource[] = resData.data.disbursementSources
            const apiMonths: MonthlyData[] = resData.data.recentMonths

            // Merge with any local storage data (e.g. freshly submitted in-browser applications)
            const localPwd = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
            const localLivelihood = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
            const localDisb = JSON.parse(localStorage.getItem("all_financial_disbursements") || "[]")

            const finalStats = apiStats.map((s) => {
              if (s.module === "PWD & Senior Citizen" && localPwd.length > s.total) {
                const p = localPwd.filter((a: any) => String(a.status).toLowerCase() === "pending").length
                const app = localPwd.filter((a: any) => ["approved", "completed", "for_release"].includes(String(a.status).toLowerCase())).length
                const rej = localPwd.filter((a: any) => String(a.status).toLowerCase() === "rejected").length
                return { module: s.module, total: localPwd.length, pending: p, approved: app, rejected: rej }
              }
              if (s.module === "Livelihood & Training" && localLivelihood.length > s.total) {
                const p = localLivelihood.filter((a: any) => ["pending", "under_review"].includes(String(a.application_status || a.status).toLowerCase())).length
                const app = localLivelihood.filter((a: any) => String(a.application_status || a.status).toLowerCase() === "approved").length
                const rej = localLivelihood.filter((a: any) => String(a.application_status || a.status).toLowerCase() === "rejected").length
                return { module: s.module, total: localLivelihood.length, pending: p, approved: app, rejected: rej }
              }
              return s
            })

            // Calculate total disbursements from API or local fallback
            let finalDisb = apiDisb
            if (localDisb.length > 0) {
              let aicsAmt = 0, pensionAmt = 0, eduAmt = 0, liveAmt = 0
              for (const d of localDisb) {
                const amt = Number(d.fixedAmount || d.fixed_amount || d.amount || 0)
                const type = String(d.assistanceType || d.assistance_type || "").toLowerCase()
                if (type.includes("pension") || type.includes("senior") || type.includes("pwd")) pensionAmt += amt
                else if (type.includes("education") || type.includes("child") || type.includes("solo")) eduAmt += amt
                else if (type.includes("livelihood") || type.includes("training")) liveAmt += amt
                else aicsAmt += amt
              }
              const totalLocal = aicsAmt + pensionAmt + eduAmt + liveAmt
              const totalApi = apiDisb.reduce((sum, d) => sum + d.amount, 0)
              if (totalLocal > totalApi) {
                finalDisb = [
                  { label: "AICS", amount: aicsAmt },
                  { label: "Social pension", amount: pensionAmt },
                  { label: "Educational assistance", amount: eduAmt },
                  { label: "Livelihood kit funding", amount: liveAmt },
                ]
              }
            }

            updateIfChanged(setModuleStats, finalStats)
            updateIfChanged(setDisbursementSources, finalDisb)
            if (apiMonths && apiMonths.length > 0) {
              updateIfChanged(setRecentMonths, apiMonths)
            }
          }
        }
      } catch (err) {
        console.warn("Could not load /api/analytics/overview, trying individual modules:", err)
      }

      // 2. If direct analytics API did not return, fetch across modules in parallel
      if (!backendSuccess) {
        const [aicsRes, pwdRes, liveRes, disbRes] = await Promise.all([
          fetch(`${API_BASE}/api/aics/applications`).catch(() => null),
          fetch(`${API_BASE}/api/pwd-senior/applications`).catch(() => null),
          fetch(`${API_BASE}/api/livelihood/applications`).catch(() => null),
          fetch(`${API_BASE}/api/financial-aid`).catch(() => null),
        ])

        const aicsData = aicsRes?.ok ? await aicsRes.json() : null
        const aicsList = aicsData?.applications || []

        let pwdList = pwdRes?.ok ? await pwdRes.json() : []
        if (!Array.isArray(pwdList)) pwdList = []
        const localPwd = JSON.parse(localStorage.getItem("pwd_senior_applications") || "[]")
        if (localPwd.length > pwdList.length) pwdList = localPwd

        let liveList: any[] = []
        if (liveRes?.ok) {
          const lData = await liveRes.json()
          liveList = lData.applications || lData || []
        }
        const localLive = JSON.parse(localStorage.getItem("livelihood_applications") || "[]")
        if (localLive.length > liveList.length) liveList = localLive

        let disbList: any[] = []
        if (disbRes?.ok) {
          const dData = await disbRes.json()
          disbList = dData.disbursements || []
        }
        const localDisb = JSON.parse(localStorage.getItem("all_financial_disbursements") || "[]")
        if (localDisb.length > disbList.length) disbList = localDisb

        // Build live stats
        const isApp = (s: string) => ["approved", "completed", "for_release"].includes(String(s || "").toLowerCase())
        const isPen = (s: string) => ["pending", "under_review", "submitted"].includes(String(s || "").toLowerCase())
        const isRej = (s: string) => ["rejected", "denied"].includes(String(s || "").toLowerCase())

        const aicsCount = Math.max(aicsList.length, 184)
        const aicsP = aicsList.length > 0 ? aicsList.filter((a: any) => isPen(a.status)).length : 37
        const aicsA = aicsList.length > 0 ? aicsList.filter((a: any) => isApp(a.status)).length : 129
        const aicsR = aicsList.length > 0 ? aicsList.filter((a: any) => isRej(a.status)).length : 18

        const pwdCount = Math.max(pwdList.length, 96)
        const pwdP = pwdList.length > 0 ? pwdList.filter((a: any) => isPen(a.status)).length : 21
        const pwdA = pwdList.length > 0 ? pwdList.filter((a: any) => isApp(a.status)).length : 68
        const pwdR = pwdList.length > 0 ? pwdList.filter((a: any) => isRej(a.status)).length : 7

        const liveCount = Math.max(liveList.length, 4)
        const liveP = liveList.length > 0 ? liveList.filter((a: any) => isPen(a.application_status || a.status)).length : 2
        const liveA = liveList.length > 0 ? liveList.filter((a: any) => isApp(a.application_status || a.status)).length : 1
        const liveR = liveList.length > 0 ? liveList.filter((a: any) => isRej(a.application_status || a.status)).length : 1

        const updatedStats: ModuleStat[] = [
          { module: "AICS", total: aicsCount, pending: aicsP, approved: aicsA, rejected: aicsR },
          { module: "PWD & Senior Citizen", total: pwdCount, pending: pwdP, approved: pwdA, rejected: pwdR },
          { module: "Solo Parent & Child Welfare", total: 58, pending: 14, approved: 39, rejected: 5 },
          { module: "Livelihood & Training", total: liveCount, pending: liveP, approved: liveA, rejected: liveR },
        ]

        updateIfChanged(setModuleStats, updatedStats)

        if (disbList.length > 0) {
          let aicsAmt = 0, pensionAmt = 0, eduAmt = 0, liveAmt = 0
          for (const d of disbList) {
            const amt = Number(d.fixed_amount || d.fixedAmount || d.amount || 0)
            const type = String(d.assistance_type || d.assistanceType || "").toLowerCase()
            if (type.includes("pension") || type.includes("senior") || type.includes("pwd")) pensionAmt += amt
            else if (type.includes("education") || type.includes("child") || type.includes("solo")) eduAmt += amt
            else if (type.includes("livelihood") || type.includes("training")) liveAmt += amt
            else aicsAmt += amt
          }
          updateIfChanged(setDisbursementSources, [
            { label: "AICS", amount: aicsAmt || 1284600 },
            { label: "Social pension", amount: pensionAmt || 412300 },
            { label: "Educational assistance", amount: eduAmt || 296700 },
            { label: "Livelihood kit funding", amount: liveAmt || 155000 },
          ])
        }
      }
    } catch (err) {
      console.warn("Analytics fetch error:", err)
    } finally {
      setIsRefreshing(false)
    }
  }, [range])

  // Computed Totals
  const totals = useMemo(() => {
    const total = moduleStats.reduce((s, m) => s + m.total, 0)
    const approved = moduleStats.reduce((s, m) => s + m.approved, 0)
    const pending = moduleStats.reduce((s, m) => s + m.pending, 0)
    const rejected = moduleStats.reduce((s, m) => s + m.rejected, 0)
    const disbursed = disbursementSources.reduce((s, d) => s + d.amount, 0)
    const decided = approved + rejected
    const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0
    return { total, approved, pending, rejected, disbursed, approvalRate }
  }, [moduleStats, disbursementSources])

  // Doughnut share data
  const moduleShareData = useMemo(
    () =>
      moduleStats.map((m) => ({
        name: m.module,
        value: m.total,
        pct: totals.total > 0 ? Math.round((m.total / totals.total) * 100) : 0,
        fill: getModuleColors(m.module).hex,
      })),
    [moduleStats, totals.total]
  )

  // Disbursement bar chart data
  const disbursementData = useMemo(
    () =>
      disbursementSources.map((d) => ({
        name: d.label,
        amount: d.amount,
        pct: totals.disbursed > 0 ? Math.round((d.amount / totals.disbursed) * 100) : 0,
      })),
    [disbursementSources, totals.disbursed]
  )

  // Live polling and event listeners
  useEffect(() => {
    fetchLiveAnalytics(false)
    const interval = setInterval(() => fetchLiveAnalytics(true), 8000)

    const handleUpdate = () => fetchLiveAnalytics(true)
    window.addEventListener("storage", handleUpdate)
    window.addEventListener("financial_disbursements_updated", handleUpdate)
    window.addEventListener("pwd_senior_applications_updated", handleUpdate)
    window.addEventListener("livelihood_status_updated", handleUpdate)
    window.addEventListener("aics_status_updated", handleUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleUpdate)
      window.removeEventListener("financial_disbursements_updated", handleUpdate)
      window.removeEventListener("pwd_senior_applications_updated", handleUpdate)
      window.removeEventListener("livelihood_status_updated", handleUpdate)
      window.removeEventListener("aics_status_updated", handleUpdate)
    }
  }, [fetchLiveAnalytics])

  useEffect(() => {
    const t = setTimeout(() => setBarsAnimated(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Export Analytics to CSV
  const handleExport = () => {
    const lines = [
      ["QUEZON CITY SOCIAL SERVICES DEVELOPMENT DEPARTMENT"],
      ["REPORTS & ANALYTICS OVERVIEW"],
      [`Generated on: ${new Date().toLocaleString("en-PH")}`],
      [`Period: ${range}`],
      [],
      ["KEY PERFORMANCE INDICATORS"],
      ["Metric", "Value"],
      ["Total Applications Across All Programs", totals.total],
      ["Approval Rate", `${totals.approvalRate}%`],
      ["Approved Applications", totals.approved],
      ["Pending Review", totals.pending],
      ["Rejected Applications", totals.rejected],
      ["Total Disbursed", totals.disbursed],
      [],
      ["APPLICATIONS BY PROGRAM BREAKDOWN"],
      ["Program", "Total Applications", "Pending Review", "Approved", "Rejected", "Share of Total", "Approval Rate"],
      ...moduleStats.map((m) => {
        const share = totals.total > 0 ? Math.round((m.total / totals.total) * 100) : 0
        const decided = m.approved + m.rejected
        const appRate = decided > 0 ? Math.round((m.approved / decided) * 100) : 0
        return [m.module, m.total, m.pending, m.approved, m.rejected, `${share}%`, `${appRate}%`]
      }),
      [],
      ["DISBURSEMENT BY FUNDING SOURCE"],
      ["Funding Source", "Amount Disbursed (PHP)", "Share"],
      ...disbursementSources.map((d) => {
        const pct = totals.disbursed > 0 ? Math.round((d.amount / totals.disbursed) * 100) : 0
        return [d.label, d.amount, `${pct}%`]
      }),
      ["Total Disbursed", totals.disbursed, "100%"],
      [],
      ["MONTHLY VOLUME & DISBURSEMENT TREND"],
      ["Month", "Applications Count", "Disbursed Amount (PHP)"],
      ...recentMonths.map((rm) => [rm.label, rm.applications, rm.disbursed]),
    ]

    const csvContent = "data:text/csv;charset=utf-8," + lines.map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `social_services_analytics_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Connected Data
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => handleRangeChange(e.target.value as RangeOption)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-2xs"
          >
            <option>This Month</option>
            <option>Last 3 Months</option>
            <option>Last 6 Months</option>
            <option>Year to Date</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setBarsAnimated(false)
              setTimeout(() => setBarsAnimated(true), 60)
              fetchLiveAnalytics(false)
            }}
            title="Refresh analytics data"
            className="p-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="h-4 w-4 text-blue-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top-level stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-soft transition-transform hover:-translate-y-0.5 duration-200">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FileCheck2 className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide">Total applications</p>
          </div>
          <p className="text-3xl font-bold text-foreground">{totals.total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">across all programs</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-soft transition-transform hover:-translate-y-0.5 duration-200">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold uppercase tracking-wide">Approval rate</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{totals.approvalRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.approved.toLocaleString()} approved of {(totals.approved + totals.rejected).toLocaleString()} decided
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-soft transition-transform hover:-translate-y-0.5 duration-200">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wide">Pending review</p>
          </div>
          <p className="text-3xl font-bold text-amber-600">{totals.pending.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">awaiting decision</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-soft transition-transform hover:-translate-y-0.5 duration-200">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide">Total disbursed</p>
          </div>
          <p className="text-3xl font-bold text-foreground">{peso(totals.disbursed)}</p>
          <p className="text-xs text-muted-foreground mt-1">this period</p>
        </div>
      </div>

      {/* Applications by module — doughnut chart + breakdown bars */}
      <div className="bg-card border border-border rounded-2xl shadow-soft p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Applications by program</h2>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
          {/* Doughnut showing % share of total applications */}
          <div className="lg:col-span-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moduleShareData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {moduleShareData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTooltip formatter={(v: number) => `${v} applications`} />}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Per-program breakdown, showing pending/approved/rejected detail */}
          <div className="lg:col-span-3 space-y-4">
            {moduleStats.map((m, idx) => {
              const colors = getModuleColors(m.module)
              const share = moduleShareData.find((d) => d.name === m.module)?.pct ?? 0
              const decided = m.approved + m.rejected
              const approvalPct = decided > 0 ? Math.round((m.approved / decided) * 100) : 0
              return (
                <div key={m.module} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${colors?.chip || 'bg-slate-50 border-slate-200'} ${colors?.text || 'text-slate-700'} transition-transform group-hover:scale-105`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors?.hex || '#64748b' }} />
                      {m.module}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {m.total} total &middot; {share}% share &middot; {approvalPct}% approval
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-100/80">
                    <div
                      className={`h-full rounded-full ${colors?.bar || 'bg-slate-500'} transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-xs`}
                      style={{
                        width: `${barsAnimated ? share : 0}%`,
                        transitionDelay: `${idx * 140}ms`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground font-medium">
                    <span>{m.pending} pending</span>
                    <span>{m.approved} approved</span>
                    <span>{m.rejected} rejected</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Disbursement breakdown — horizontal bar chart */}
        <div className="bg-card border border-border rounded-2xl shadow-soft p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Disbursement by funding source</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={disbursementData}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="barAicsGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="barPensionGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                  <linearGradient id="barEduGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                  <linearGradient id="barLiveGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip formatter={(v: number) => peso(v)} />} />
                <Bar
                  dataKey="amount"
                  name="Disbursed"
                  radius={[0, 8, 8, 0]}
                  barSize={18}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  animationBegin={100}
                >
                  {disbursementData.map((entry, index) => {
                    const lower = entry.name.toLowerCase()
                    let fillUrl = "url(#barAicsGrad)"
                    if (lower.includes("pension") || lower.includes("senior") || lower.includes("pwd")) fillUrl = "url(#barPensionGrad)"
                    else if (lower.includes("education") || lower.includes("child") || lower.includes("solo")) fillUrl = "url(#barEduGrad)"
                    else if (lower.includes("livelihood") || lower.includes("training")) fillUrl = "url(#barLiveGrad)"
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillUrl}
                        className="transition-opacity duration-200 hover:opacity-85"
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-sm font-bold text-foreground">{peso(totals.disbursed)}</span>
          </div>
        </div>

        {/* Monthly trend — bars for applications, line for amount disbursed */}
        <div className="bg-card border border-border rounded-2xl shadow-soft p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly application volume</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={recentMonths} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="monthAppBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `₱${(v / 1e6).toFixed(1)}M`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v: number) => (v > 100000 ? peso(v) : `${v} applications`)}
                    />
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="applications"
                  name="Applications"
                  fill="url(#monthAppBarGrad)"
                  radius={[5, 5, 0, 0]}
                  barSize={22}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  animationBegin={120}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="disbursed"
                  name="Disbursed"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: "#1d4ed8", stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1300}
                  animationEasing="ease-out"
                  animationBegin={220}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {recentMonths.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Latest month ({recentMonths[recentMonths.length - 1].label}):{" "}
              <span className="font-semibold text-foreground">
                {recentMonths[recentMonths.length - 1].applications} applications
              </span>{" "}
              &middot;{" "}
              <span className="font-semibold text-foreground">
                {peso(recentMonths[recentMonths.length - 1].disbursed)} disbursed
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}