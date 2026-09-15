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

import { lazyWithRetry } from "../../utils/lazyWithRetry"

const AICS = lazyWithRetry(() => import("../modules/aics"))
const PWDSeniorCitizen = lazyWithRetry(() => import("../modules/pwd-senior-citizen"))
const SoloParentChildWelfare = lazyWithRetry(() => import("../modules/solo-parent-child-welfare"))
const LivelihoodTraining = lazyWithRetry(() => import("../modules/livelihood-training"))
const Appointments = lazyWithRetry(() => import("../modules/appointments"))
const FinancialAidDisbursement = lazyWithRetry(() => import("../modules/financial-aid-disbursement"))
const Reports = lazyWithRetry(() => import("../modules/reports"))
const ActivityLog = lazyWithRetry(() => import("../modules/activity-log"))
const CaseManagement = lazyWithRetry(() => import("../modules/case-management"))
const BeneficiaryManagement = lazyWithRetry(() => import("../modules/beneficiary-management"))
const UserManagement = lazyWithRetry(() => import("../modules/user-management"))

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