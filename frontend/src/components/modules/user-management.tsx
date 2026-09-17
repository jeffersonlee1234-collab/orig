import { useState, useEffect, useMemo, useRef } from "react"
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  Phone,
  Calendar,
  FileText,
  CalendarCheck,
  Loader2,
  AlertCircle,
  MapPin,
  UserCheck,
} from "lucide-react"
import { API_BASE } from "../../config/api"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import MaskedText from "../ui/masked-text"

const authHeaders = (): Record<string, string> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// =====================================================================================
// Types
// =====================================================================================

export type AccountRole = "USER / BENEFICIARY" | "ADMINISTRATOR"
export type AccountStatus = "ACTIVE" | "INACTIVE"

export interface LinkedApplication {
  reference_number: string
  module?: string
  category?: string
  type?: string
  status?: string
  created_at: string
  assigned_id_number?: string
  solo_parent_id_number?: string
}

export interface LinkedAppointment {
  appointment_reference: string
  service_type: string
  appointment_date: string
  appointment_time: string
  status?: string
}

export interface CentralUser {
  id: string // e.g. "USR-0278" or numeric
  numericId?: number
  name: string
  firstName?: string
  lastName?: string
  email: string
  contactNumber: string
  address?: string
  role: AccountRole
  status: AccountStatus
  dateRegistered: string
  lastLogin: string
  qcidNumber?: string
  applicationsCount?: number
  applications?: LinkedApplication[]
  appointments?: LinkedAppointment[]
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  administrators: number
}

// =====================================================================================
// Utility Helpers
// =====================================================================================

function formatDateOnly(dateStr?: string) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "Never logged in"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

function getInitials(name: string) {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// =====================================================================================
// User Card Component
// =====================================================================================

function UserCard({
  u,
  onManage,
}: {
  u: CentralUser
  onManage: (u: CentralUser) => void
}) {
  const isAdmin = u.role === "ADMINISTRATOR"
  const isActive = u.status === "ACTIVE"

  return (
    <div
      onClick={() => onManage(u)}
      className={`border rounded-2xl p-4 md:p-5 transition-all shadow-2xs hover:shadow-md hover:border-blue-400 cursor-pointer group ${
        isActive ? "bg-white border-slate-200" : "bg-slate-50/80 border-slate-200 opacity-90"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-bold text-sm shadow-xs ${
            isAdmin
              ? "bg-gradient-to-br from-indigo-600 to-indigo-800"
              : "bg-gradient-to-br from-blue-600 to-sky-700"
          }`}
        >
          {getInitials(u.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight truncate uppercase">
              {u.name}
            </h3>

            {/* Role Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isAdmin
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              <Shield className="h-3 w-3" />
              {u.role}
            </span>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {u.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-600 mb-2.5">
            <p className="flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <MaskedText value={u.email} type="email" className="truncate" />
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <MaskedText value={u.contactNumber} type="phone" />
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <span className="font-mono font-bold text-slate-500">{u.id}</span>
              {u.qcidNumber && (
                <span className="text-slate-400">
                  · <MaskedText value={u.qcidNumber} type="id" />
                </span>
              )}
            </p>
          </div>

          {/* Activity Meta */}
          <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              Registered: {formatDateOnly(u.dateRegistered)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              Last Login: {formatDateTime(u.lastLogin)}
            </span>
            {u.applicationsCount !== undefined && u.applicationsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                <FileText className="h-3 w-3" />
                {u.applicationsCount} Linked Application{u.applicationsCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================================================
// Manage User Modal Component
// =====================================================================================

function ManageUserModal({
  user,
  onClose,
}: {
  user: CentralUser
  onClose: () => void
}) {
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailedUser, setDetailedUser] = useState<CentralUser>(user)

  // Fetch full details with linked applications & appointments
  useEffect(() => {
    let isMounted = true
    const fetchFullDetails = async () => {
      setIsLoadingDetails(true)
      try {
        const res = await fetch(`${API_BASE}/api/users/${user.numericId || user.id}`, {
          headers: authHeaders(),
        })
        if (res.ok && isMounted) {
          const data = await res.json()
          if (data.user) {
            setDetailedUser(data.user)
          }
        }
      } catch (err) {
        console.warn("Could not fetch detailed user profile:", err)
      } finally {
        if (isMounted) setIsLoadingDetails(false)
      }
    }

    fetchFullDetails()
    return () => {
      isMounted = false
    }
  }, [user.id, user.numericId])

  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const isActive = detailedUser.status === "ACTIVE"
  const isAdmin = detailedUser.role === "ADMINISTRATOR"

  const handleToggleStatus = async () => {
    const nextStatus = isActive ? "INACTIVE" : "ACTIVE"
    setIsTogglingStatus(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/${user.numericId || user.id}/status`, {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus.toLowerCase() }),
      })
      if (res.ok) {
        setDetailedUser((prev) => ({ ...prev, status: nextStatus as any }))
        window.dispatchEvent(new Event("user_updated"))
      }
    } catch (err) {
      console.error("Failed to toggle status:", err)
    } finally {
      setIsTogglingStatus(false)
    }
  }


  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm ${
                isAdmin
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-800"
                  : "bg-gradient-to-br from-blue-600 to-sky-700"
              }`}
            >
              {getInitials(detailedUser.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 uppercase">
                  {detailedUser.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isAdmin
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {isAdmin ? <Shield className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                  {detailedUser.role}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {detailedUser.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                User ID: <span className="font-bold text-slate-800">{detailedUser.id}</span>
                {detailedUser.qcidNumber && <span> · QCID: {detailedUser.qcidNumber}</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full h-8 w-8 flex items-center justify-center transition-colors text-2xl font-light cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* USER INFORMATION */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              User Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <p className="text-slate-400 font-semibold uppercase">Full Name</p>
                <p className="font-bold text-slate-900 mt-0.5">{detailedUser.name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Email Address</p>
                <div className="font-bold text-slate-900 mt-0.5">
                  <MaskedText value={detailedUser.email} type="email" />
                </div>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Contact Number</p>
                <div className="font-bold text-slate-900 mt-0.5">
                  <MaskedText value={detailedUser.contactNumber} type="phone" />
                </div>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">User ID</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{detailedUser.id}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Account Role</p>
                <p className="font-bold text-slate-900 mt-0.5">{detailedUser.role}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Account Status</p>
                <p className={`font-bold mt-0.5 ${isActive ? "text-emerald-700" : "text-rose-700"}`}>
                  {detailedUser.status}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Date Registered</p>
                <p className="font-bold text-slate-900 mt-0.5">{formatDateTime(detailedUser.dateRegistered)}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Last Login</p>
                <p className="font-bold text-slate-900 mt-0.5">{formatDateTime(detailedUser.lastLogin)}</p>
              </div>
              {detailedUser.address && (
                <div className="sm:col-span-2 md:col-span-3">
                  <p className="text-slate-400 font-semibold uppercase">Registered Address</p>
                  <p className="font-medium text-slate-900 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {detailedUser.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CONNECTED APPLICATION RECORDS */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              Connected Application Records ({detailedUser.applications?.length || 0})
            </h3>

            {isLoadingDetails ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-blue-600" />
                Loading connected applications...
              </div>
            ) : detailedUser.applications && detailedUser.applications.length > 0 ? (
              <div className="space-y-2">
                {detailedUser.applications.map((app, idx) => (
                  <div
                    key={app.reference_number || idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-800">
                          REF {app.reference_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                          {app.module || app.category || "Social Service"}
                        </span>
                        {app.type && (
                          <span className="text-slate-500 font-medium">({app.type})</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Submitted: {formatDateOnly(app.created_at)}
                        {(app.assigned_id_number || app.solo_parent_id_number) && (
                          <span className="font-mono font-bold text-emerald-700 ml-2">
                            · ID: {app.assigned_id_number || app.solo_parent_id_number}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        app.status === "approved" || app.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : app.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {app.status || "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                No submitted applications found for this user account yet.
              </div>
            )}
          </div>

          {/* CONNECTED APPOINTMENTS */}
          {detailedUser.appointments && detailedUser.appointments.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 text-blue-600" />
                Connected Appointments ({detailedUser.appointments.length})
              </h3>
              <div className="space-y-2">
                {detailedUser.appointments.map((apt, idx) => (
                  <div
                    key={apt.appointment_reference || idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-slate-800">{apt.appointment_reference}</p>
                      <p className="text-slate-500 text-[11px]">
                        {apt.service_type} · {apt.appointment_date} {apt.appointment_time}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] uppercase">
                      {apt.status || "Booked"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Account Status:</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {detailedUser.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTogglingStatus}
              onClick={handleToggleStatus}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                isActive
                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              }`}
            >
              {isTogglingStatus
                ? "Updating..."
                : isActive
                ? "Deactivate Account"
                : "Reactivate Account"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

  )
}

// =====================================================================================
// Main Admin User Management Component
// =====================================================================================

export default function UserManagement() {
  const [users, setUsers] = useState<CentralUser[]>(() => {
    try {
      const cached = localStorage.getItem("cached_central_users")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return []
  })
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_central_users")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return false
      }
    } catch {}
    return true
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<CentralUser | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState<"ALL" | AccountRole>("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | AccountStatus>("ALL")

  const isFetchingRef = useRef(false)

  // Fetch real central users directly from Backend API
  const loadUsers = async (silent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!silent && users.length === 0) setIsLoading(true)
    setErrorMessage(null)
    try {
      let res = await fetch(`${API_BASE}/api/users`, {
        headers: authHeaders(),
      })
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/auth/users`, {
          headers: authHeaders(),
        })
      }
      if (res.ok) {
        const data = await res.json()
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users)
          try {
            localStorage.setItem("cached_central_users", JSON.stringify(data.users))
          } catch {}
        }
      } else {
        if (!silent && users.length === 0) setErrorMessage("Failed to load user accounts from database.")
      }
    } catch (err) {
      console.warn("Could not fetch user records:", err)
      if (!silent && users.length === 0) setErrorMessage("Could not connect to database server.")
    } finally {
      isFetchingRef.current = false
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(false)

    const interval = setInterval(() => loadUsers(true), 8000)
    const handleSync = () => loadUsers(true)

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadUsers(true)
    })

    window.addEventListener("focus", handleSync)
    window.addEventListener("application_updated", handleSync)
    window.addEventListener("applications_updated", handleSync)
    window.addEventListener("user_updated", handleSync)

    return () => {
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("focus", handleSync)
      window.removeEventListener("application_updated", handleSync)
      window.removeEventListener("applications_updated", handleSync)
      window.removeEventListener("user_updated", handleSync)
    }
  }, [])

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = filterRole === "ALL" || u.role === filterRole
      const matchStatus = filterStatus === "ALL" || u.status === filterStatus

      if (searchTerm.trim() === "") return matchRole && matchStatus

      const term = searchTerm.toLowerCase().trim()
      const matchName = u.name.toLowerCase().includes(term)
      const matchEmail = u.email.toLowerCase().includes(term)
      const matchContact = (u.contactNumber || "").toLowerCase().includes(term)
      const matchId = (u.id || "").toLowerCase().includes(term)
      const matchQcid = (u.qcidNumber || "").toLowerCase().includes(term)

      return matchRole && matchStatus && (matchName || matchEmail || matchContact || matchId || matchQcid)
    })
  }, [users, filterRole, filterStatus, searchTerm])

  // Exact Dashboard Stats as strictly required:
  // TOTAL USERS, ACTIVE USERS, INACTIVE USERS, ADMINISTRATORS
  const stats: UserStats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "ACTIVE").length,
      inactive: users.filter((u) => u.status === "INACTIVE").length,
      administrators: users.filter((u) => u.role === "ADMINISTRATOR").length,
    }
  }, [users])

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Users className="h-4 w-4" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Management
          </h1>
        </div>
      </div>

      {/* 2. DASHBOARD KPI CARDS (TOTAL USERS, ACTIVE USERS, INACTIVE USERS, ADMINISTRATORS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL USERS */}
        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Users
            </span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.total}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            Registered citizen accounts
          </span>
        </div>

        {/* ACTIVE USERS */}
        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Users
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.active}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            Authorized to login &amp; apply
          </span>
        </div>

        {/* INACTIVE USERS */}
        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inactive Users
            </span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.inactive}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            Deactivated / Login restricted
          </span>
        </div>

        {/* ADMINISTRATORS */}
        <div className="p-4 md:p-5 rounded-2xl border bg-white border-slate-200 text-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Administrators
            </span>
            <Shield className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{stats.administrators}</p>
          <span className="text-[11px] font-medium mt-1 block text-slate-400">
            System administration roles
          </span>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-2xs space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by full name, email, contact number, QCID, or User ID (USR-...)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs md:text-sm bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold px-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdown Filters (Role & Status) */}
        <div className="flex items-center gap-4 flex-wrap text-xs">
          {/* Role Filter: All Roles, User / Beneficiary, Administrator */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Account Role:</span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="USER / BENEFICIARY">User / Beneficiary</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>

          {/* Status Filter: All Statuses, Active, Inactive */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Account Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-slate-400">
            Showing <strong className="text-slate-700">{filteredUsers.length}</strong> of {users.length} registered accounts
          </div>
        </div>
      </div>

      {/* 4. USER LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Registered Accounts ({filteredUsers.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-2xs">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Loading central accounts from database...</p>
          </div>
        ) : errorMessage ? (
          <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center text-rose-700 shadow-2xs space-y-2">
            <AlertCircle className="h-6 w-6 text-rose-500 mx-auto" />
            <p className="text-xs font-bold">{errorMessage}</p>
            <button
              onClick={() => loadUsers(false)}
              className="px-4 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-300 hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-2xs space-y-2">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No user accounts found</p>
            <p className="text-xs text-slate-500">
              {searchTerm ? "No users match your search criteria." : "No registered citizen accounts in the system yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <UserCard key={u.id} u={u} onManage={setSelectedUser} />
            ))}
          </div>
        )}
      </div>

      {/* Manage User Modal */}
      {selectedUser && (
        <ManageUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  )
}