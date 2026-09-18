// frontend/src/utils/realtimeSync.ts
// Cross-tab and live server synchronization utility for GovServe applications

import { clearApiCache } from "./cachedApiFetch"

const CHANNEL_NAME = "govserve_realtime_sync"

let channel: BroadcastChannel | null = null
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME)
  }
} catch (e) {
  console.warn("[RealtimeSync] BroadcastChannel not supported:", e)
}

export interface SyncMessage {
  type: "APPLICATION_SUBMITTED" | "APPLICATION_APPROVED" | "APPLICATION_REJECTED" | "APPLICATION_DELETED" | "STATUS_CHANGED"
  module?: "solo_parent" | "child_welfare" | "pwd_senior" | "aics" | "livelihood" | "case" | "appointment" | "all"
  referenceNumber?: string
  timestamp: number
}

export function notifyApplicationChange(
  type: SyncMessage["type"] = "APPLICATION_SUBMITTED",
  module: SyncMessage["module"] = "all",
  referenceNumber?: string
) {
  const msg: SyncMessage = {
    type,
    module,
    referenceNumber,
    timestamp: Date.now(),
  }

  // Clear in-memory API cache immediately so fresh data is fetched
  clearApiCache()

  // 1. BroadcastChannel (instant zero-latency multi-tab dispatch)
  try {
    if (channel) {
      channel.postMessage(msg)
    }
  } catch {}

  // 2. localStorage sync trigger (ensures cross-tab storage event fires)
  try {
    localStorage.setItem("govserve_last_sync_ping", JSON.stringify(msg))
  } catch {}

  // 3. Local window custom events (without redundant duplicates)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("govserve_realtime_event", { detail: msg }))
    window.dispatchEvent(new Event("pwd_senior_applications_updated"))
    window.dispatchEvent(new Event("solo_parent_applications_updated"))
    window.dispatchEvent(new Event("financial_disbursements_updated"))
    window.dispatchEvent(new Event("appointments_updated"))
  }
}

export function subscribeToRealtimeChanges(callback: (msg?: SyncMessage) => void): () => void {
  if (typeof window === "undefined") return () => {}

  let debounceTimer: any = null
  const debouncedCallback = (data?: SyncMessage) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      callback(data)
    }, 250)
  }

  // BroadcastChannel listener
  const onChannelMsg = (event: MessageEvent) => {
    clearApiCache()
    debouncedCallback(event.data)
  }

  // Local custom event listener
  const onWindowEvent = (e: Event) => {
    const customEvt = e as CustomEvent<SyncMessage>
    debouncedCallback(customEvt.detail)
  }

  // Storage listener for cross-tab ping
  const onStorage = (e: StorageEvent) => {
    if (e.key === "govserve_last_sync_ping" && e.newValue) {
      clearApiCache()
      try {
        const parsed = JSON.parse(e.newValue)
        debouncedCallback(parsed)
      } catch {
        debouncedCallback()
      }
    }
  }

  // Window focus & visibility change for immediate sync when user switches tabs/devices
  const onVisibilityOrFocus = () => {
    if (document.visibilityState === "visible") {
      clearApiCache()
      debouncedCallback()
    }
  }

  if (channel) {
    channel.addEventListener("message", onChannelMsg)
  }
  window.addEventListener("govserve_realtime_event", onWindowEvent)
  window.addEventListener("pwd_senior_applications_updated", onWindowEvent)
  window.addEventListener("storage", onStorage)
  window.addEventListener("focus", onVisibilityOrFocus)
  document.addEventListener("visibilitychange", onVisibilityOrFocus)

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (channel) {
      channel.removeEventListener("message", onChannelMsg)
    }
    window.removeEventListener("govserve_realtime_event", onWindowEvent)
    window.removeEventListener("pwd_senior_applications_updated", onWindowEvent)
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("focus", onVisibilityOrFocus)
    document.removeEventListener("visibilitychange", onVisibilityOrFocus)
  }
}
