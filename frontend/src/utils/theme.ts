/**
 * Resolves the active theme state (true for dark, false for light).
 * 1. Checks if the user explicitly chose a theme in localStorage ("dark" | "light").
 * 2. If no preference has been saved yet (e.g. on new device or fresh browser),
 *    uses time-based auto dark mode:
 *    - 6:00 PM (18:00) to 6:00 AM (06:00) -> Auto Dark Mode
 *    - 6:00 AM (06:00) to 6:00 PM (18:00) -> Auto Light Mode (White Mode)
 */
export function getInitialTheme(): boolean {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;

    // Time-based automatic theme detection (6 PM to 6 AM is night)
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  } catch {
    return false;
  }
}

/**
 * Applies the theme to the root HTML document element and optionally stores the user's preference.
 */
export function applyTheme(isDark: boolean, persist: boolean = true) {
  try {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (persist) {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  } catch {}
}
