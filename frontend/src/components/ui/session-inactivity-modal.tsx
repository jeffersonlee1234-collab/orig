import { useState, useEffect, useRef, useCallback } from "react"
import { Clock, ShieldAlert, LogIn } from "lucide-react"
import { API_BASE } from "../../config/api"

// 15 Minutes Inactivity Timeout in milliseconds
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

type ExpiryReason = "inactivity" | "concurrent" | null;

export function SessionInactivityWatcher() {
  const [expiryReason, setExpiryReason] = useState<ExpiryReason>(null);
  const [newDeviceInfo, setNewDeviceInfo] = useState<string>("");
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);
  const verifyIntervalRef = useRef<any>(null);

  // Check if currently authenticated
  const checkIsAuth = useCallback(() => {
    return (
      sessionStorage.getItem("isAuthenticated") === "true" ||
      localStorage.getItem("isAuthenticated") === "true"
    );
  }, []);

  const getCurrentUserEmail = useCallback(() => {
    const directEmail = sessionStorage.getItem("user_email") || localStorage.getItem("user_email");
    if (directEmail) return directEmail.toLowerCase().trim();
    try {
      const rawUser = sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        return (parsed.email || "").toLowerCase().trim();
      }
    } catch {}
    return "";
  }, []);

  const getSessionToken = useCallback(() => {
    return sessionStorage.getItem("sessionToken") || localStorage.getItem("sessionToken") || "";
  }, []);

  const clearAuthSession = useCallback(() => {
    try {
      sessionStorage.removeItem("isAuthenticated");
      sessionStorage.removeItem("userRole");
      sessionStorage.removeItem("currentUser");
      sessionStorage.removeItem("user_email");
      sessionStorage.removeItem("sessionToken");
      sessionStorage.removeItem("session_terminated_reason");
      sessionStorage.removeItem("terminated_new_device");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("userRole");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("user_email");
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("user_profile");
      localStorage.removeItem("token");
    } catch {}
  }, []);

  const isVerifyingRef = useRef(false);

  // Check if account was logged into on another device (Single Active Session rule)
  const verifyConcurrentSession = useCallback(async () => {
    if (!checkIsAuth()) return;
    if (expiryReason) return;
    if (isVerifyingRef.current) return;

    const email = getCurrentUserEmail();
    const token = getSessionToken();

    // If no valid active session token or email, do not trigger concurrent mismatch
    if (!email || !token) return;

    try {
      isVerifyingRef.current = true;
      const res = await fetch(`${API_BASE}/api/auth/verify-session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email,
          "x-session-token": token,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.isSessionTerminated) {
          let devStr = "";
          if (data.newDevice) {
            const dev = data.newDevice;
            devStr = `${dev.device_name || dev.device_type || 'Another Device'}`;
            setNewDeviceInfo(devStr);
          }
          clearAuthSession();
          setExpiryReason("concurrent");
        }
      }
    } catch (err) {
      console.warn("Session verification network warning:", err);
    } finally {
      isVerifyingRef.current = false;
    }
  }, [checkIsAuth, expiryReason, getCurrentUserEmail, getSessionToken, clearAuthSession]);

  const handleUserActivity = useCallback(() => {
    if (!expiryReason) {
      lastActivityRef.current = Date.now();
    }
  }, [expiryReason]);

  useEffect(() => {
    if (!checkIsAuth()) {
      // Clear any lingering termination flags when not authenticated
      try {
        sessionStorage.removeItem("session_terminated_reason");
        sessionStorage.removeItem("terminated_new_device");
      } catch {}
      return;
    }

    lastActivityRef.current = Date.now();

    // Listen to user interaction events for 15-minute inactivity tracker
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "touchend", "scroll", "click"];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check every 10 seconds for 15-minute inactivity
    timerRef.current = setInterval(() => {
      if (checkIsAuth()) {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          clearAuthSession();
          setExpiryReason("inactivity");
        }
      }
    }, 10000);

    // Initial check for concurrent session
    verifyConcurrentSession();

    // Balanced periodic check every 30 seconds for concurrent device login
    verifyIntervalRef.current = setInterval(() => {
      verifyConcurrentSession();
    }, 30000);

    // Also check immediately when window gains focus or tab becomes visible
    const handleVisibilityOrFocus = () => {
      verifyConcurrentSession();
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (verifyIntervalRef.current) {
        clearInterval(verifyIntervalRef.current);
      }
    };
  }, [checkIsAuth, handleUserActivity, verifyConcurrentSession, clearAuthSession]);

  if (!expiryReason) {
    return null;
  }

  const handleReLogin = () => {
    sessionStorage.clear();
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userRole");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user_email");
    localStorage.removeItem("sessionToken");
    window.location.href = "/login";
  };

  const isConcurrent = expiryReason === "concurrent";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border text-center space-y-5 animate-in zoom-in-95 duration-150 ${
        isConcurrent ? "border-red-200" : "border-slate-200"
      }`}>
        {/* Header Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm border ${
            isConcurrent
              ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
              : "bg-amber-50 border-amber-200 text-amber-600"
          }`}
        >
          {isConcurrent ? (
            <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
          ) : (
            <Clock className="w-8 h-8 stroke-[2.2]" />
          )}
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            {isConcurrent && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />}
            <h3
              className={`text-2xl font-black tracking-tight ${
                isConcurrent ? "text-red-700" : "text-slate-900"
              }`}
              style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
            >
              {isConcurrent ? "Account Accessed Elsewhere" : "Session Expired"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {isConcurrent
              ? newDeviceInfo
                ? `Your account was accessed from a new device: ${newDeviceInfo}. You have been logged out from this session for your security.`
                : "Your account was accessed from another device. You have been logged out from this session for your security."
              : "Your session has timed out due to inactivity. Please log in again to continue."}
          </p>
        </div>

        {/* Re-login Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleReLogin}
            className={`w-full py-3.5 px-6 rounded-xl text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] ${
              isConcurrent
                ? "bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-200"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-200"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Log In Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionInactivityWatcher;
