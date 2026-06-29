function parseNonNegativeInt(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback
  }
  const parsed = Number.parseInt(String(value).trim(), 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

const sharedTableRefreshSeconds = parseNonNegativeInt(
  import.meta.env.VITE_ADMIN_TABLE_AUTO_REFRESH_SECONDS,
  30,
)

/**
 * Auto-refresh interval for admin data tables (seconds).
 * Set to 0 to disable. Per-table vars override the shared default.
 */
export const adminTableAutoRefresh = {
  ordersSeconds: parseNonNegativeInt(
    import.meta.env.VITE_ADMIN_ORDERS_AUTO_REFRESH_SECONDS,
    sharedTableRefreshSeconds,
  ),
  ridersSeconds: parseNonNegativeInt(
    import.meta.env.VITE_ADMIN_RIDERS_AUTO_REFRESH_SECONDS,
    sharedTableRefreshSeconds,
  ),
  dashboardSeconds: parseNonNegativeInt(
    import.meta.env.VITE_ADMIN_DASHBOARD_AUTO_REFRESH_SECONDS,
    sharedTableRefreshSeconds,
  ),
  mapSeconds: parseNonNegativeInt(
    import.meta.env.VITE_ADMIN_MAP_AUTO_REFRESH_SECONDS,
    sharedTableRefreshSeconds,
  ),
}

export function getAutoRefreshMs(seconds) {
  if (!seconds || seconds <= 0) return 0
  return seconds * 1000
}

export const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
