/**
 * Theme Manager with full real-time Auto Time-based switching:
 * - 6:00 AM (06:00) to 6:00 PM (18:00) -> Light Mode (Puti)
 * - 6:00 PM (18:00) to 6:00 AM (06:00) -> Dark Mode (Madilim)
 */

export type ThemeMode = "auto" | "light" | "dark";

export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}

export function getThemePreference(): ThemeMode {
  try {
    const mode = localStorage.getItem("theme_mode");
    if (mode === "dark" || mode === "light" || mode === "auto") {
      return mode;
    }
    // Backward compatibility: if only "theme" exists and no theme_mode
    const legacy = localStorage.getItem("theme");
    if (legacy === "dark") return "dark";
    if (legacy === "light") return "light";
    return "auto";
  } catch {
    return "auto";
  }
}

export function getEffectiveTheme(mode: ThemeMode = getThemePreference()): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return isNightTime();
}

export function getInitialTheme(): boolean {
  return getEffectiveTheme();
}

/**
 * Applies the effective theme class to the HTML document.
 */
export function applyTheme(isDark: boolean, persist: boolean = false) {
  try {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (persist) {
      localStorage.setItem("theme_mode", isDark ? "dark" : "light");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  } catch {}
}

export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem("theme_mode", mode);
    if (mode === "auto") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", mode);
    }
    const isDark = getEffectiveTheme(mode);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("theme_changed", { detail: { mode, isDark } }));
  } catch {}
}
