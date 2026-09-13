import { useState, useRef, useEffect } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  ShieldAlert,
  Users,
  Baby,
  HeartHandshake,
  GraduationCap,
  Moon,
  Sun,
  Bell,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronDown,
  X,
  Trash2,
  FileText,
  Wallet,
  BookOpen,
} from "lucide-react"
import { Tooltip } from "../ui/tooltip"
import { ProfileModal } from "../ui/profile-modal"
import { useLanguage } from "../ui/language-context"
import { getSavedProfilePhoto } from "../../utils/profilePhoto"
import { getCurrentUserProfile, getLoggedInUserQcid } from "../../utils/userProfile"
import { API_BASE } from "../../config/api"
import { subscribeToRealtimeChanges } from "../../utils/realtimeSync"

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

interface NavChild {
  path: string
  label: string
}

interface ResidentNavItem {
  id: string
  path?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavChild[]
}

function getResidentNav(t: (key: string, vars?: Record<string, string>) => string): ResidentNavItem[] {
  return [
    {
      id: "overview",
      path: "/portal/overview",
      label: t("navServiceGuide") || "Help & Service Guide",
      icon: BookOpen,
    },
    {
      id: "aics",
      label: t("navAICSAssistance"),
      icon: ShieldAlert,
      children: [
        { path: "/portal/aics?type=medical", label: t("aicsMedical") },
        { path: "/portal/aics?type=funeral", label: t("aicsFuneral") },
        { path: "/portal/aics?type=educational", label: t("assistEducational") },
        { path: "/portal/aics?type=material", label: t("aicsMaterial") },
        { path: "/portal/aics?type=food", label: t("aicsFood") },
        { path: "/portal/aics?type=transportation", label: t("aicsTransportation") },
      ],
    },
    {
      id: "pwd",
      label: t("navPWDServices"),
      icon: WheelchairIcon,
      children: [
        { path: "/portal/apply-pwd-senior?category=pwd&type=new", label: t("navNewPwdId") },
        { path: "/portal/apply-pwd-senior?category=pwd&type=renewal", label: t("navRenewalPwdId") },
        { path: "/portal/apply-pwd-senior?category=pwd&type=loss", label: t("navLossPwdId") },
        { path: "/portal/apply-pwd-senior?category=pwd&type=assistance", label: t("navPwdAssistance") },
      ],
    },
    {
      id: "senior",
      label: t("navSeniorServices"),
      icon: Users,
      children: [
        { path: "/portal/apply-pwd-senior?category=senior&type=new", label: t("navNewSeniorId") },
        { path: "/portal/apply-pwd-senior?category=senior&type=renewal", label: t("navRenewalSeniorId") },
        { path: "/portal/apply-pwd-senior?category=senior&type=loss", label: t("navLossSeniorId") },
        { path: "/portal/apply-pwd-senior?category=senior&type=medicine-booklet", label: t("navSeniorMedicineBooklet") },
        { path: "/portal/apply-pwd-senior?category=senior&type=movie-booklet", label: t("navSeniorMovieBooklet") },
        { path: "/portal/apply-pwd-senior?category=senior&type=social-assistance", label: t("navSeniorSocialAssistance") },
      ],
    },
    {
      id: "soloParent",
      label: t("navSoloParentServices"),
      icon: Baby,
      children: [
        { path: "/portal/apply-solo-parent?category=solo-parent&type=new", label: t("navNewSoloParent") },
        { path: "/portal/apply-solo-parent?category=solo-parent&type=renewal", label: t("navRenewalSoloParent") },
        { path: "/portal/apply-solo-parent?category=solo-parent&type=loss", label: t("navLossSoloParent") },
      ],
    },
    {
      id: "childWelfare",
      label: t("navChildWelfareServices"),
      icon: HeartHandshake,
      children: [
        { path: "/portal/apply-solo-parent?category=child-welfare&program=nutritional-assistance", label: t("navChildNutritional") || "Nutritional Assistance" },
        { path: "/portal/apply-solo-parent?category=child-welfare&program=child-protection", label: t("navChildProtection") || "Child Protection Assistance" },
        { path: "/portal/apply-solo-parent?category=child-welfare&program=emergency-assistance", label: t("navChildEmergency") || "Emergency Assistance" },
      ],
    },
    {
      id: "livelihood",
      label: t("navLivelihoodTraining"),
      icon: GraduationCap,
      children: [
        { path: "/portal/apply-livelihood?category=livelihood", label: t("navLivelihoodProgram") },
        { path: "/portal/apply-livelihood?category=training", label: t("navTrainingProgram") },
      ],
    },
    { id: "financialAid", path: "/portal/financial-aid", label: "Financial Aid Disbursement", icon: Wallet },
    { id: "myApplications", path: "/portal/my-applications", label: t("navMyApplications") || "Application History", icon: FileText },
  ]
}


interface AicsNotification {
  id: string
  title: string
  desc: string
  time: string
  unread: boolean
  reason?: string | null
}

function getReadNotifIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("aics_read_notifs") || "[]")
  } catch {
    return []
  }
}

function getUserIdentifiers() {
  const prof = getCurrentUserProfile()
  const qcid = prof.qcidNumber || prof.qcidNo || getLoggedInUserQcid() || "user"
  const email = (prof.email || "").toLowerCase().trim()
  const userId = String(prof.id || "1")
  const firstName = (prof.firstName || "").trim()
  const lastName = (prof.lastName || "").trim()
  return { userIdentifier: qcid, qcid, email, userId, ref: qcid, firstName, lastName }
}

function markNotifAsRead(id: string, userIdentifier?: string) {
  const readIds = getReadNotifIds()
  if (!readIds.includes(id)) {
    localStorage.setItem("aics_read_notifs", JSON.stringify([...readIds, id]))
  }
  const idents = getUserIdentifiers()
  if (userIdentifier) idents.userIdentifier = userIdentifier
  try {
    fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idents),
    }).catch(() => {})
  } catch (_) {}
}

function getDismissedNotifIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("aics_dismissed_notifs") || "[]")
  } catch {
    return []
  }
}

function dismissNotif(id: string, userIdentifier?: string) {
  const dismissedIds = getDismissedNotifIds()
  if (!dismissedIds.includes(id)) {
    localStorage.setItem("aics_dismissed_notifs", JSON.stringify([...dismissedIds, id]))
    window.dispatchEvent(new Event("user_notifications_updated"))
  }
  const idents = getUserIdentifiers()
  if (userIdentifier) idents.userIdentifier = userIdentifier
  try {
    fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idents),
    }).catch(() => {})
  } catch (_) {}
}

function dismissAllNotifs(ids: string[], userIdentifier?: string) {
  const dismissedIds = getDismissedNotifIds()
  const set = new Set([...dismissedIds, ...ids])
  localStorage.setItem("aics_dismissed_notifs", JSON.stringify(Array.from(set)))
  window.dispatchEvent(new Event("user_notifications_updated"))
  const idents = getUserIdentifiers()
  if (userIdentifier) idents.userIdentifier = userIdentifier
  try {
    fetch(`${API_BASE}/api/notifications/all`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...idents, notifIds: ids }),
    }).catch(() => {})
  } catch (_) {}
}

function Avatar({ size = 36 }: { size?: number }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [initials, setInitials] = useState<string>("QC")

  useEffect(() => {
    const readProfileData = () => {
      const qcid = getLoggedInUserQcid()
      const photo = getSavedProfilePhoto(qcid)
      setPhotoUrl(photo)
      setImgFailed(false)

      const prof = getCurrentUserProfile()
      const firstName = (prof.firstName || (prof as any).first_name || "").trim()
      const lastName = (prof.lastName || (prof as any).last_name || "").trim()
      const fullName = ((prof as any).fullName || (prof as any).name || "").trim()

      let init = ""
      if (firstName && lastName) {
        init = `${firstName[0]}${lastName[0]}`.toUpperCase()
      } else if (firstName) {
        init = firstName.slice(0, 2).toUpperCase()
      } else if (fullName) {
        const parts = fullName.split(/\s+/)
        if (parts.length >= 2) {
          init = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        } else if (parts[0]) {
          init = parts[0].slice(0, 2).toUpperCase()
        }
      }

      setInitials(init || "QC")
    }

    readProfileData()

    // Basahin ulit kapag na-update ang profile o photo
    window.addEventListener("storage", readProfileData)
    window.addEventListener("user_profile_updated", readProfileData)
    return () => {
      window.removeEventListener("storage", readProfileData)
      window.removeEventListener("user_profile_updated", readProfileData)
    }
  }, [])

  if (photoUrl && !imgFailed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl overflow-hidden shrink-0"
      >
        <img
          src={photoUrl}
          alt="Profile"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl bg-linear-to-br from-primary to-info flex items-center justify-center text-xs font-semibold text-white shrink-0 uppercase tracking-wider select-none"
    >
      {initials}
    </div>
  )
}


function ResidentSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useLanguage()
  const residentNav = getResidentNav(t)
  const location = useLocation()
  const currentFullUrl = location.pathname + location.search

  // Determine which section contains the active route
  const getActiveGroupId = () => {
    for (const item of residentNav) {
      if (item.children) {
        const isMatch = item.children.some(
          (child) =>
            currentFullUrl === child.path ||
            (location.pathname === "/portal/apply-pwd-senior" && child.path.includes(location.search)) ||
            (location.pathname === "/portal/apply-solo-parent" && child.path.includes(location.search)) ||
            (location.pathname === "/portal/apply-livelihood" && child.path.includes(location.search)) ||
            (location.pathname === "/portal/aics" && child.path.includes(location.search))
        )
        if (isMatch) return item.id
      }
    }
    return null
  }

  // Accordion state: by default only open the active group (or all closed)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const activeId = getActiveGroupId()
    return activeId ? { [activeId]: true } : {}
  })

  // Auto-sync accordion when user navigates
  useEffect(() => {
    const activeId = getActiveGroupId()
    if (activeId) {
      setExpandedMenus({ [activeId]: true })
    }
  }, [location.pathname, location.search])

  const toggleExpand = (id: string) => {
    setExpandedMenus((prev) => {
      const willBeOpen = !prev[id]
      if (willBeOpen) {
        // Accordion behavior: open clicked group and collapse all other groups
        return { [id]: true }
      } else {
        // Collapse clicked group
        return {}
      }
    })
  }

  const handleNavClick = (e: React.MouseEvent, targetPath: string) => {
    if (currentFullUrl === targetPath) return
    if ((window as any).__isFormDirty) {
      const confirmLeave = window.confirm(
        t("switchServiceConfirmWarning") ||
        "Are you sure you want to switch services? Any unsaved information you entered will be lost."
      )
      if (!confirmLeave) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      (window as any).__isFormDirty = false
    }
  }

  return (
    <aside
      className={`shrink-0 gradient-sidebar flex flex-col h-screen sticky top-0 overflow-hidden transition-all duration-300 ${
        open ? "w-64" : "w-16"
      }`}
    >
      <div className={`flex flex-col h-full ${open ? "w-64" : "w-16"}`}>
        {/* Brand + Toggle */}
        <div className={`p-5 flex items-center gap-3 ${!open ? "flex-col justify-center px-0" : "justify-between"}`}>
          <div className={`flex items-center gap-3 ${!open && "justify-center"}`}>
            <div className="h-11 w-11 flex items-center justify-center shrink-0">
              <img
                src="/samples/Government Service Integrity Seal.png"
                alt="GovServe"
                className="h-9 w-9 object-contain"
              />
            </div>
            {open && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-sidebar-foreground leading-tight truncate">
                  GovServe
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 font-semibold leading-tight truncate">
                  Citizen Portal
                </p>
              </div>
            )}
          </div>

          <Tooltip label={open ? t("collapseSidebar") : t("expandSidebar")}>
            <button
              aria-label="Toggle sidebar"
              onClick={onToggle}
              className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer ${
                !open && "mt-1"
              }`}
            >
              {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>

        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          <div>
            <div className="flex flex-col gap-1.5">
              {residentNav.map((item) => {
                const Icon = item.icon
                const isGroup = !!item.children && item.children.length > 0

                if (isGroup && item.children) {
                  const isAnyChildActive = item.children.some(
                    (child) => currentFullUrl === child.path || (location.pathname === "/portal/apply-pwd-senior" && child.path.includes(location.search))
                  )
                  const isExpanded = expandedMenus[item.id] ?? false

                  const groupHeader = (
                    <div key={item.id} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                          !open && "justify-center px-0"
                        } ${
                          isAnyChildActive
                            ? "bg-sidebar-primary/10 text-sidebar-foreground"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Icon
                          className={`h-4.5 w-4.5 shrink-0 ${
                            isAnyChildActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                          }`}
                        />
                        {open && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronDown
                              className={`h-4 w-4 text-sidebar-foreground/60 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-sidebar-primary" : ""
                              }`}
                            />
                          </>
                        )}
                      </button>

                      {/* Dropdown items */}
                      {open && isExpanded && (
                        <div className="flex flex-col gap-1 mt-1 pl-4 pr-1">
                          {item.children.map((child) => {
                            const isChildActive = currentFullUrl === child.path

                            return (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                onClick={(e) => handleNavClick(e, child.path)}
                                className={`flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                                  isChildActive
                                    ? "bg-sidebar-primary/20 text-sidebar-primary font-bold shadow-xs border-l-2 border-sidebar-primary"
                                    : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                }`}
                              >
                                <span className="truncate">{child.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )

                  return open ? groupHeader : <Tooltip key={item.id} label={item.label}>{groupHeader}</Tooltip>
                }

                // Standard single link
                const path = item.path || ""
                const link = (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={(e) => handleNavClick(e, path)}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        !open && "justify-center px-0"
                      } ${
                        isActive
                          ? "bg-sidebar-primary/15 text-sidebar-foreground shadow-soft"
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`h-4.5 w-4.5 shrink-0 ${
                            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                          }`}
                        />
                        {open && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {isActive && <ChevronRight className="h-4 w-4 text-sidebar-primary" />}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                )
                const rendered = open ? link : <Tooltip key={path} label={item.label}>{link}</Tooltip>

                // Divider + section label bago ang My Applications (Histories)
                if (item.id === "myApplications" || path === "/portal/my-applications") {
                  return (
                    <div key={`section-${item.id || path}`}>
                      <div className={`my-3 border-t border-sidebar-foreground/10 ${!open && "mx-2"}`} />
                      {open && (
                        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 select-none">
                          {t("navHistories") || "HISTORIES"}
                        </p>
                      )}
                      {rendered}
                    </div>
                  )
                }

                return rendered
              })}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  )
}

function ResidentHeader({
  dark,
  onToggleDark,
}: {
  dark: boolean
  onToggleDark: () => void
}) {
  const { t, language } = useLanguage()
  const residentNav = getResidentNav(t)
  const location = useLocation()
  const currentFullUrl = location.pathname + location.search

  let currentTitle = "Welcome"
  // 1. Search for exact full URL match (with search params) across ALL items
  for (const item of residentNav) {
    if (item.children) {
      const exactChild = item.children.find((c) => {
        if (c.path === currentFullUrl) return true
        const [cPath, cSearch] = c.path.split("?")
        if (cPath !== location.pathname) return false
        if (!cSearch) return false
        const cParams = new URLSearchParams(cSearch)
        const curParams = new URLSearchParams(location.search)
        let allMatch = true
        cParams.forEach((val, key) => {
          if (curParams.get(key) !== val) allMatch = false
        })
        return allMatch
      })
      if (exactChild) {
        currentTitle = `${item.label} — ${exactChild.label}`
        break
      }
    }
  }

  // 2. If no exact child matched, fall back to pathname matching
  if (currentTitle === "Welcome") {
    for (const item of residentNav) {
      if (item.path === location.pathname) {
        currentTitle = item.label
        break
      }
      if (item.children) {
        const baseChild = item.children.find((c) => c.path.split("?")[0] === location.pathname)
        if (baseChild) {
          currentTitle = item.label
          break
        }
      }
    }
  }
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpenState] = useState(() => {
    return (
      localStorage.getItem("is_profile_modal_open") === "true" ||
      sessionStorage.getItem("is_profile_modal_open") === "true"
    )
  })

  const setProfileOpen = (open: boolean) => {
    if (open) {
      localStorage.setItem("is_profile_modal_open", "true")
      sessionStorage.setItem("is_profile_modal_open", "true")
    } else {
      localStorage.removeItem("is_profile_modal_open")
      sessionStorage.removeItem("is_profile_modal_open")
    }
    setProfileOpenState(open)
  }

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<AicsNotification[]>([])
  const [selectedNotif, setSelectedNotif] = useState<AicsNotification | null>(null)
  const [now, setNow] = useState(new Date())
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    sessionStorage.removeItem("isAuthenticated")
    sessionStorage.removeItem("userRole")
    sessionStorage.removeItem("currentUser")
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("userRole")
    localStorage.removeItem("currentUser")
    window.location.href = "/login"
  }

    useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Live clock — ticks every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const readIds = getReadNotifIds()
        const dismissedIds = getDismissedNotifIds()
        const items: AicsNotification[] = []
        const prof = getCurrentUserProfile()
        const userQcId = prof.qcidNumber || prof.qcidNo || getLoggedInUserQcid() || "110000116932100"
        const userEmail = (prof.email || "").toLowerCase().trim()
        const userId = String(prof.id || "1")
        const firstName = (prof.firstName || "").trim()
        const lastName = (prof.lastName || "").trim()

        const params = new URLSearchParams()
        params.set("qcid", userQcId)
        params.set("userId", userId)
        params.set("email", userEmail)
        params.set("ref", userQcId)
        if (firstName) params.set("firstName", firstName)
        if (lastName) params.set("lastName", lastName)

        // 1. Primary: Fetch real-time synchronized notifications from PostgreSQL backend
        try {
          const notifRes = await fetch(`${API_BASE}/api/notifications?${params.toString()}`)
          if (notifRes.ok) {
            const notifData = await notifRes.json()
            if (Array.isArray(notifData.notifications)) {
              notifData.notifications.forEach((n: any) => {
                if (!dismissedIds.includes(n.id)) {
                  let translatedTitle = n.title
                  if (n.title.includes("AICS") && n.title.includes("Approved")) {
                    translatedTitle = t("notifAicsApprovedTitle") || n.title
                  } else if (n.title.includes("AICS") && n.title.includes("Not Approved")) {
                    translatedTitle = t("notifAicsRejectedTitle") || n.title
                  } else if (n.title.includes("Solo Parent") && n.title.includes("Approved")) {
                    translatedTitle = t("notifSoloParentApprovedTitle") || n.title
                  } else if (n.title.includes("Solo Parent") && n.title.includes("Not Approved")) {
                    translatedTitle = t("notifSoloParentRejectedTitle") || n.title
                  } else if (n.title.includes("Child Welfare") && n.title.includes("Approved")) {
                    translatedTitle = t("notifChildWelfareApprovedTitle") || n.title
                  } else if (n.title.includes("Child Welfare") && n.title.includes("Not Approved")) {
                    translatedTitle = t("notifChildWelfareRejectedTitle") || n.title
                  } else if (n.title.includes("Livelihood") && n.title.includes("Approved")) {
                    translatedTitle = t("notifLivelihoodApprovedTitle") || n.title
                  } else if (n.title.includes("Livelihood") && n.title.includes("Not Approved")) {
                    translatedTitle = t("notifLivelihoodRejectedTitle") || n.title
                  }

                  items.push({
                    id: n.id,
                    title: translatedTitle,
                    desc: n.desc || n.description,
                    time: n.time || new Date(n.created_at || Date.now()).toLocaleString(language === "en" ? "en-US" : "fil-PH"),
                    unread: !readIds.includes(n.id) && Boolean(n.unread),
                    reason: n.reason || null,
                  })
                }
              })
            }
          }
        } catch (_) {}

        // Purge legacy dirty computer notifications cache if present
        try {
          if (localStorage.getItem("all_user_notifications")) {
            localStorage.removeItem("all_user_notifications")
          }
        } catch (_) {}

        // Deduplicate and sort
        const uniqueMap = new Map<string, AicsNotification>()
        items.forEach((item) => {
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item)
          }
        })

        const sortedItems = Array.from(uniqueMap.values()).sort((a, b) => Number(b.unread) - Number(a.unread))
        setNotifications(sortedItems)
      } catch {}
    }

    fetchNotifs()
    const interval = setInterval(fetchNotifs, 2500)
    const unsubscribe = subscribeToRealtimeChanges(() => {
      fetchNotifs()
    })
    const handleNotifUpdate = () => fetchNotifs()
    window.addEventListener("user_notifications_updated", handleNotifUpdate)
    window.addEventListener("storage", handleNotifUpdate)

    return () => {
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("user_notifications_updated", handleNotifUpdate)
      window.removeEventListener("storage", handleNotifUpdate)
    }
  }, [language, t])

  const unreadNotifCount = notifications.filter((n) => n.unread).length

  const handleNotifClick = (id: string) => {
    const prof = getCurrentUserProfile()
    const userQcId = prof.qcidNumber || prof.qcidNo || getLoggedInUserQcid() || "user"
    markNotifAsRead(id, userQcId)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    const notif = notifications.find((n) => n.id === id)
    if (notif) {
      setSelectedNotif(notif)
      setNotifOpen(false)
    }
  }

  const handleDismissNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const prof = getCurrentUserProfile()
    const userQcId = prof.qcidNumber || prof.qcidNo || getLoggedInUserQcid() || "user"
    dismissNotif(id, userQcId)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleDismissAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    const prof = getCurrentUserProfile()
    const userQcId = prof.qcidNumber || prof.qcidNo || getLoggedInUserQcid() || "user"
    const allIds = notifications.map((n) => n.id)
    dismissAllNotifs(allIds, userQcId)
    setNotifications([])
  }

  const timeString = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const dateString = now.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <>
    <header className="h-16 sticky top-0 z-40 flex items-center justify-between gap-4 px-4 md:px-6 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{currentTitle}</p>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex flex-col items-end leading-tight mr-1 select-none">
          <span className="text-sm font-semibold text-foreground tabular-nums">{timeString}</span>
          <span className="text-[10px] text-muted-foreground">{dateString}</span>
        </div>

        <Tooltip label={dark ? "Switch to light mode" : "Switch to dark mode"}>
          <button
            aria-label="Toggle theme"
            onClick={onToggleDark}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </Tooltip>
        <div className="relative" ref={notifRef}>
          <Tooltip label={t("notifications")}>
            <button
              aria-label={t("notifications")}
              onClick={() => setNotifOpen((v) => !v)}
              className="relative h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>
          </Tooltip>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{t("notifications")}</span>
                  {unreadNotifCount > 0 && (
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {t("newBadge", { count: String(unreadNotifCount) })}
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDismissAll}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Burahin lahat ng notifications"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{language === "bis" ? "Papasa Tanan" : language === "tl" ? "Burahin Lahat" : "Clear All"}</span>
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n.id)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                          n.unread ? "bg-blue-600 ring-2 ring-blue-400/30" : "bg-transparent"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground leading-snug">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.desc}</p>
                        <p className="text-[10px] font-medium text-muted-foreground/80 mt-1.5">{n.time}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDismissNotif(e, n.id)}
                        aria-label="Burahin ang notification"
                        title={language === "bis" ? "Papasa" : language === "tl" ? "Burahin" : "Delete"}
                        className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t("noNewNotifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === "bis" ? "Walay pending o bag-ong mga pahibalo." : language === "tl" ? "Walang mga bagong abiso sa kasalukuyan." : "All caught up! No notifications right now."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground leading-tight">{t("hiUserShort", { name: (() => {
                const prof = getCurrentUserProfile();
                return (prof.firstName || (prof as any).first_name || "Resident").toUpperCase();
              })() })}</p>            
            </div>
            <Avatar />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-medium py-1.5 z-50">
              <button
                onClick={() => {
                  setProfileOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {t("profile")}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t("logOut")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <ProfileModal
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      role="Resident"
      user={getCurrentUserProfile()}
      email={getCurrentUserProfile().email}
      qcidNo={getCurrentUserProfile().qcidNo}
    />
    {selectedNotif && (
  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-medium p-5 mx-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{selectedNotif.title}</h3>
        <button
          onClick={() => setSelectedNotif(null)}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{selectedNotif.desc}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{selectedNotif.time}</p>

      {selectedNotif.reason ? (
        <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5">
          <p className="text-xs font-semibold text-destructive">{t("notifRejectionReasonLabel") || "Reason for Rejection"}</p>
          <p className="text-sm text-destructive/90 mt-1">{selectedNotif.reason}</p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground italic">{t("notifNoDetails") || "No additional details."}</p>
      )}

      <button
        onClick={() => setSelectedNotif(null)}
        className="mt-4 w-full rounded-xl bg-muted hover:bg-muted/70 text-foreground text-sm font-medium py-2 transition-colors cursor-pointer"
      >
        {t("close") || "Close"}
      </button>
    </div>
  </div>
)}
    </>
  )
}

export default function UserLayout() {
  const { t } = useLanguage()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("theme")
      if (saved === "dark") return true
      document.documentElement.classList.remove("dark")
      return false
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
      try {
        localStorage.setItem("theme", "dark")
      } catch {}
    } else {
      document.documentElement.classList.remove("dark")
      try {
        localStorage.setItem("theme", "light")
      } catch {}
    }
  }, [dark])

  useEffect(() => {
    const handlePopState = () => {
      if ((window as any).__isFormDirty) {
        const confirmLeave = window.confirm(
          t("leavePageConfirmWarning") ||
          "Are you sure you want to go back? Any unsaved information you entered will be lost."
        )
        if (!confirmLeave) {
          window.history.pushState(null, "", window.location.href)
        } else {
          (window as any).__isFormDirty = false
        }
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [t])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ResidentSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <div className="flex-1 flex flex-col min-w-0">
        <ResidentHeader
          dark={dark}
          onToggleDark={() => setDark((v) => !v)}
        />
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto animate-fade-in-up relative"
          style={{ scrollbarGutter: "stable" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}