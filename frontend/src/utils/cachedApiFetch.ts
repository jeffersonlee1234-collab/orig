// frontend/src/utils/cachedApiFetch.ts
// Request deduplication, in-flight locking, and intelligent caching for high-frequency portal API calls

import { API_BASE } from "../config/api"

const inFlightMap = new Map<string, Promise<any>>()
const cacheMap = new Map<string, { data: any; expiresAt: number }>()

const DEFAULT_CACHE_MS = 3000 // 3 seconds default cache
const REQUEST_TIMEOUT_MS = 9000 // 9s timeout to prevent hanging pending sockets

export async function deduplicatedFetch(url: string, cacheTtlMs: number = DEFAULT_CACHE_MS): Promise<any> {
  return cachedApiFetch(url, undefined, cacheTtlMs)
}

export async function cachedApiFetch<T = any>(
  url: string,
  options?: RequestInit,
  cacheTtlMs: number = DEFAULT_CACHE_MS
): Promise<T> {
  const now = Date.now()
  const cacheKey = `${url}_${JSON.stringify(options?.headers || {})}`
  const cached = cacheMap.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.data as T
  }

  if (inFlightMap.has(cacheKey)) {
    return inFlightMap.get(cacheKey) as Promise<T>
  }

  const promise = (async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const separator = url.includes("?") ? "&" : "?"
      // Only append _t if cacheTtlMs is 0, otherwise use cache-friendly url
      const reqUrl = cacheTtlMs > 0 ? url : `${url}${separator}_t=${Date.now()}`

      const res = await fetch(reqUrl, {
        ...options,
        signal: options?.signal || controller.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      if (cacheTtlMs > 0) {
        cacheMap.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs })
      }
      return data as T
    } finally {
      clearTimeout(timeoutId)
      inFlightMap.delete(cacheKey)
    }
  })()

  inFlightMap.set(cacheKey, promise)
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
    const data = await deduplicatedFetch(`${API_BASE}/api/pwd-senior/applications`, 15000)
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn("Could not fetch PWD/Senior applications:", err)
    return []
  }
}

