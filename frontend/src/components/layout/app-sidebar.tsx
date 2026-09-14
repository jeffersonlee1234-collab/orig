import { NavLink } from "react-router-dom"
import { ChevronLeft, ChevronsRight, ChevronRight } from "lucide-react"
import { moduleRoutes } from "./routes"
import { Tooltip } from "../ui/tooltip"


export function AppSidebar({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
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
            <Tooltip label="GovServe">
              <div className="h-11 w-11 flex items-center justify-center shrink-0">
                <img
                  src="/samples/Government Service Integrity Seal.png"
                  alt="GovServe"
                  className="h-9 w-9 object-contain"
                />
              </div>
            </Tooltip>
            {open && (
              <div>
                <p className="text-sm font-bold text-sidebar-foreground leading-tight">
                  GovServe
                </p>
              </div>
            )}
          </div>

          <Tooltip label={open ? "Collapse sidebar" : "Expand sidebar"}>
            <button
              aria-label="Toggle sidebar"
              onClick={onToggle}
              className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
                !open && "mt-1"
              }`}
            >
              {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>

        {/* Nav groups */}
          {/* Nav groups */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          <div>
            <div className="flex flex-col gap-1">
              {moduleRoutes.map(({ path, label, icon: Icon }) => {
                const link = (
                  <NavLink
                    key={path}
                    to={path}
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
                            <span className="flex-1 text-left truncate">{label}</span>
                            {isActive && <ChevronRight className="h-4 w-4 text-sidebar-primary" />}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                )

                const rendered = open ? (
                  link
                ) : (
                  <Tooltip key={path} label={label} side="right">
                    {link}
                  </Tooltip>
                )

                // Divider + section label bago ang Beneficiary Management
                if (path === "/beneficiaries") {
                  return (
                    <div key={`section-${path}`}>
                      <div className={`my-3 border-t border-sidebar-foreground/10 ${!open && "mx-2"}`} />
                      {open && (
                        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                          Beneficiary
                        </p>
                      )}
                      {rendered}
                    </div>
                  )
                }

                // Divider + section label bago ang Case Management, para hiwalay
                // ang cross-program case tracking mula sa mga direktang service
                // applications sa itaas nito.
                if (path === "/case-management") {
                  return (
                    <div key={`section-${path}`}>
                      <div className={`my-3 border-t border-sidebar-foreground/10 ${!open && "mx-2"}`} />
                      {open && (
                        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                          Case Manage
                        </p>
                      )}
                      {rendered}
                    </div>
                  )
                }

                // Divider + section label bago ang Appointments, para hiwalay
                // ang "scheduling" mula sa mga direktang service applications.
                if (path === "/appointments") {
                  return (
                    <div key={`section-${path}`}>
                      <div className={`my-3 border-t border-sidebar-foreground/10 ${!open && "mx-2"}`} />
                      {open && (
                        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                          Scheduling
                        </p>
                      )}
                      {rendered}
                    </div>
                  )
                }

                // Divider + section label bago ang Activity Log, para hiwalay
                // ang read-only audit trail mula sa scheduling at applications.
                if (path === "/activity-log") {
                  return (
                    <div key={`section-${path}`}>
                      <div className={`my-3 border-t border-sidebar-foreground/10 ${!open && "mx-2"}`} />
                      {open && (
                        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                          Monitoring
                        </p>
                      )}
                      {rendered}
                    </div>
                  )
                }

                // Divider + section label bago ang User Management
                if (path === "/users") {
                  return (
                    <div key={`section-${path}`}>
                      <div className={`my-3 border-t border-sidebar-foreground/10 ${!open && "mx-2"}`} />
                      {open && (
                        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                          Administration
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