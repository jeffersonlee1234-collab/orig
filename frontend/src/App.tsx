import { useState, useEffect, lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import UserLayout from "./components/layout/user-layout"
import SocialServicesLayout from "./components/layout/layout"

import { moduleRoutes, defaultModulePath } from "./components/layout/routes"
import { LanguageProvider } from "./components/ui/language-context"
import { SessionInactivityWatcher } from "./components/ui/session-inactivity-modal"

// Lazy loaded Entry & Public pages
const LandingPage = lazy(() => import("./pages/landing"))
const Login = lazy(() => import("./components/entry-login/Login").then((m) => ({ default: m.Login })))
const Register = lazy(() => import("./components/entry-login/Register").then((m) => ({ default: m.Register })))
const ResetPassword = lazy(() => import("./components/entry-login/ResetPassword").then((m) => ({ default: m.ResetPassword })))

// Lazy loaded Resident Portal pages
const CitizenGuideHub = lazy(() => import("./components/user-portal/citizen-guide-hub"))
const AICSUser = lazy(() => import("./components/user-portal/aics-user"))
const ApplyPWDSenior = lazy(() => import("./components/user-portal/apply-pwd-senior"))
const ApplySoloParent = lazy(() => import("./components/user-portal/apply-solo-parent"))
const ApplyLivelihood = lazy(() => import("./components/user-portal/apply-livelihood"))
const ApplyFinancialAid = lazy(() => import("./components/user-portal/apply-financial-aid"))
const MyApplications = lazy(() => import("./components/user-portal/my-applications"))

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        <span className="text-xs font-semibold text-gray-500">Loading GovServe...</span>
      </div>
    </div>
  )
}

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
  const [auth, setAuth] = useState(() => getAuthContext());

  useEffect(() => {
    const handleAuthChange = () => {
      setAuth(getAuthContext());
    };

    window.addEventListener("auth_state_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("auth_state_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <SessionInactivityWatcher />
        <Suspense fallback={<PageLoadingFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  )
}