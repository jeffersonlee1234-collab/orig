import { lazy } from "react"
import {
  ShieldAlert,
  Users,
  Baby,
  GraduationCap,
  Calendar,
  Wallet,
  History,
  FolderKanban,
  IdCard,
  UserCog,
  BarChart3,
  type LucideIcon,
} from "lucide-react"

const AICS = lazy(() => import("../modules/aics"))
const PWDSeniorCitizen = lazy(() => import("../modules/pwd-senior-citizen"))
const SoloParentChildWelfare = lazy(() => import("../modules/solo-parent-child-welfare"))
const LivelihoodTraining = lazy(() => import("../modules/livelihood-training"))
const Appointments = lazy(() => import("../modules/appointments"))
const FinancialAidDisbursement = lazy(() => import("../modules/financial-aid-disbursement"))
const Reports = lazy(() => import("../modules/reports"))
const ActivityLog = lazy(() => import("../modules/activity-log"))
const CaseManagement = lazy(() => import("../modules/case-management"))
const BeneficiaryManagement = lazy(() => import("../modules/beneficiary-management"))
const UserManagement = lazy(() => import("../modules/user-management"))

export type ModuleRoute = {
  path: string
  label: string
  icon: LucideIcon
  Component: React.ComponentType
}

export const moduleRoutes: ModuleRoute[] = [
  { path: "/aics", label: "Assistance to Individual In Crisis", icon: ShieldAlert, Component: AICS },
  { path: "/pwd-senior", label: "PWD & Senior Citizen Services", icon: Users, Component: PWDSeniorCitizen },
  { path: "/solo-parent", label: "Solo Parent & Child Welfare", icon: Baby, Component: SoloParentChildWelfare },
  { path: "/livelihood", label: "Livelihood & Training Program", icon: GraduationCap, Component: LivelihoodTraining },
  { path: "/financial-aid", label: "Financial Aid Disbursement", icon: Wallet, Component: FinancialAidDisbursement },
  { path: "/beneficiaries", label: "Beneficiary Management", icon: IdCard, Component: BeneficiaryManagement },
  { path: "/case-management", label: "Case Management", icon: FolderKanban, Component: CaseManagement },
  { path: "/appointments", label: "Appointments", icon: Calendar, Component: Appointments },
  { path: "/activity-log", label: "Activity Log", icon: History, Component: ActivityLog },
  { path: "/reports", label: "Reports & Analytics", icon: BarChart3, Component: Reports },
  { path: "/users", label: "User Management", icon: UserCog, Component: UserManagement },
]

export const defaultModulePath = moduleRoutes[0].path