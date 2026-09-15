import { lazy, type ComponentType } from "react"

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = sessionStorage.getItem("page_has_been_force_refreshed")
    try {
      const module = await componentImport()
      if (!module) {
        throw new Error("Module failed to load")
      }
      const component = module.default || module
      if (!component || (typeof component !== "function" && typeof component !== "object")) {
        throw new Error("Module does not export a valid React component")
      }
      sessionStorage.removeItem("page_has_been_force_refreshed")
      return { default: component }
    } catch (error) {
      console.warn("[LazyRetry] Dynamic chunk import failed, refreshing page...", error)
      if (!pageHasBeenForceRefreshed) {
        sessionStorage.setItem("page_has_been_force_refreshed", "true")
        window.location.reload()
        return new Promise(() => {})
      }
      throw error
    }
  })
}
