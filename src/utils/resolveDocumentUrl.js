import { API_ORIGIN } from '../config/api'

/**
 * Turn a stored document URL into one the admin UI can load.
 * Rewrites relative paths and mismatched hosts (e.g. localhost vs LAN IP).
 */
export function resolveDocumentUrl(url) {
  if (url == null) return null

  const trimmed = String(url).trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:')) return trimmed

  if (trimmed.startsWith('/')) {
    return `${API_ORIGIN}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    if (!parsed.pathname.includes('/uploads/')) {
      return trimmed
    }

    // Vite dev server proxies /uploads to the API (same-origin previews).
    if (import.meta.env.DEV) {
      return `${parsed.pathname}${parsed.search}`
    }

    const apiOrigin = new URL(API_ORIGIN)
    return `${apiOrigin.origin}${parsed.pathname}${parsed.search}`
  } catch {
    return trimmed
  }
}
