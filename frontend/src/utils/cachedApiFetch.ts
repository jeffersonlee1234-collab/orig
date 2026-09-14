// frontend/src/utils/cachedApiFetch.ts
// Request deduplication & in-flight lock for high-frequency portal API calls

import { API_BASE } from "../config/api"

const inFlightMap = new Map<string, Promise<any>>()
const cacheMap = new Map<string, { data: any; expiresAt: number }>()

const DEFAULT_CACHE_MS = 2000 // 2 seconds

export async function deduplicatedFetch(url: string, cacheTtlMs: number = DEFAULT_CACHE_MS): Promise<any> {
  const now = Date.now()
  const cached = cacheMap.get(url)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  if (inFlightMap.has(url)) {
    return inFlightMap.get(url)
  }

  const promise = (async () => {
    try {
      const separator = url.includes("?") ? "&" : "?"
      const res = await fetch(`${url}${separator}_t=${Date.now()}`, {
        cache: "no-store",
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      cacheMap.set(url, { data, expiresAt: Date.now() + cacheTtlMs })
      return data
    } finally {
      inFlightMap.delete(url)
    }
  })()

  inFlightMap.set(url, promise)
  return promise
}

export function clearApiCache(urlPattern?: string) {
  if (!urlPattern) {
    cacheMap.clear()
    return
  }
  for (const key of cacheMap.keys()) {
    if (key.includes(urlPattern)) {
      cacheMap.delete(key)
    }
  }
}

export async function fetchPwdSeniorApplications(): Promise<any[]> {
  try {
    const data = await deduplicatedFetch(`${API_BASE}/api/pwd-senior/applications`, 2000)
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn("Could not fetch PWD/Senior applications:", err)
    return []
  }
}
