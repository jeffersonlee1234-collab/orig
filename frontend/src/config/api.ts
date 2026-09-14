export function getApiBase(): string {
  let url = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
  ).trim();

  // Strip accidental "VITE_API_URL=" or "VITE_API_BASE_URL=" prefix if pasted by user in Railway
  if (url.startsWith("VITE_API_URL=")) {
    url = url.replace(/^VITE_API_URL=/, "").trim();
  }
  if (url.startsWith("VITE_API_BASE_URL=")) {
    url = url.replace(/^VITE_API_BASE_URL=/, "").trim();
  }

  const isBrowser = typeof window !== "undefined";
  const isLocal =
    isBrowser &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (!url) {
    if (isLocal) {
      return "http://localhost:5000";
    }
    return "https://backend-production-1736.up.railway.app";
  }

  // If provided as a domain without protocol (e.g. backend-production-1736.up.railway.app)
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

export const API_BASE = getApiBase();

/**
 * Retrieves the stored JWT authentication token from localStorage or sessionStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("sessionToken") ||
    localStorage.getItem("sessionToken") ||
    null
  );
}

/**
 * Returns common HTTP headers including Authorization: Bearer <token> if available
 */
export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-access-token"] = token;
  }

  return headers;
}
