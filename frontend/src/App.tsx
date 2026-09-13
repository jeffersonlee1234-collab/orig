import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import UserLayout from "./components/layout/user-layout"
import SocialServicesLayout from "./components/layout/layout"

import { moduleRoutes, defaultModulePath } from "./components/layout/routes"
import { Login } from "./components/entry-login/Login"
import { Register } from "./components/entry-login/Register"
import { ResetPassword } from "./components/entry-login/ResetPassword"
import LandingPage from "./pages/landing"

import CitizenGuideHub from "./components/user-portal/citizen-guide-hub"
import AICSUser from "./components/user-portal/aics-user"
import ApplyPWDSenior from "./components/user-portal/apply-pwd-senior"
import ApplySoloParent from "./components/user-portal/apply-solo-parent"
import ApplyLivelihood from "./components/user-portal/apply-livelihood"
import ApplyFinancialAid from "./components/user-portal/apply-financial-aid"
import MyApplications from "./components/user-portal/my-applications"

import { LanguageProvider } from "./components/ui/language-context"
import { SessionInactivityWatcher } from "./components/ui/session-inactivity-modal"

function getAuthContext() {
  const isAuth =
    sessionStorage.getItem('isAuthenticated') === 'true' ||
    localStorage.getItem('isAuthenticated') === 'true';

  let role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
  if (!role && isAuth) {
    try {
      const raw = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
      if (raw) {
        const parsed = JSON.parse(raw);
        role = parsed.role;
      }
    } catch {}
  }

  const resolvedRole = role || (isAuth ? 'user' : null);
  const isStaff = isAuth && (resolvedRole === 'staff' || resolvedRole === 'admin');
  const isResident = isAuth && !isStaff;

  const homePath = isStaff
    ? defaultModulePath
    : isResident
    ? "/portal/overview"
    : "/login";

  return {
    isAuthenticated: isAuth,
    userRole: resolvedRole,
    isStaff,
    isResident,
    homePath,
  };
}

export default function App() {
  const auth = getAuthContext();

  return (
    <LanguageProvider>
      <BrowserRouter>
        <SessionInactivityWatcher />
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={!auth.isAuthenticated ? <LandingPage /> : <Navigate to={auth.homePath} replace />} />
          <Route path="/login" element={!auth.isAuthenticated ? <Login /> : <Navigate to={auth.homePath} replace />} />
          <Route path="/register" element={!auth.isAuthenticated ? <Register /> : <Navigate to={auth.homePath} replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Staff / Admin Routes */}
          <Route
            element={
              auth.isStaff ? (
                <SocialServicesLayout />
              ) : (
                <Navigate to={auth.isAuthenticated ? auth.homePath : "/login"} replace />
              )
            }
          >
            <Route index element={<Navigate to={defaultModulePath} replace />} />
            {moduleRoutes.map((mod) => (
              <Route
                key={mod.path}
                path={mod.path.slice(1)}
                element={<mod.Component />}
              />
            ))}
          </Route>

          {/* Resident Routes */}
          <Route
            element={
              auth.isResident ? (
                <UserLayout />
              ) : (
                <Navigate to={auth.isAuthenticated ? auth.homePath : "/login"} replace />
              )
            }
          >
            <Route path="/portal" element={<Navigate to="/portal/overview" replace />} />
            <Route path="/portal/overview" element={<CitizenGuideHub />} />
            <Route path="/portal/guide" element={<CitizenGuideHub />} />
            <Route path="/portal/aics" element={<AICSUser />} />
            <Route path="/portal/apply-pwd-senior" element={<ApplyPWDSenior />} />
            <Route path="/portal/apply-solo-parent" element={<ApplySoloParent />} />
            <Route path="/portal/apply-livelihood" element={<ApplyLivelihood />} />
            <Route path="/portal/apply-financial-aid" element={<ApplyFinancialAid />} />
            <Route path="/portal/financial-aid" element={<ApplyFinancialAid />} />
            <Route path="/portal/my-applications" element={<MyApplications />} />
          </Route>

          {/* Fallback / Catch All */}
          <Route path="*" element={<Navigate to={auth.isAuthenticated ? auth.homePath : "/login"} replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}