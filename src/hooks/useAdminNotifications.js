import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adminApi } from '../config/api'
import { getAutoRefreshMs, adminTableAutoRefresh } from '../config/app'
import { SUPPORT_TICKET_ATTENDED_EVENT } from '../utils/supportNotifications'

const READ_IDS_KEY = 'admin_notification_read_ids'
const POLL_MS = getAutoRefreshMs(adminTableAutoRefresh.dashboardSeconds || 30) || 30000

function loadReadIds() {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids) {
  localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]))
}

function formatRelativeTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function useAdminNotifications({ adminToken, onUnauthorized }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState(() => loadReadIds())
  const initialLoadRef = useRef(true)
  const onUnauthorizedRef = useRef(onUnauthorized)
  const refreshTimerRef = useRef(null)

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized
  }, [onUnauthorized])

  const fetchNotifications = useCallback(async () => {
    if (!adminToken) return

    const isInitial = initialLoadRef.current
    try {
      if (isInitial) setLoading(true)
      const response = await fetch(adminApi.notifications, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (response.status === 401) {
        onUnauthorizedRef.current?.()
        return
      }
      if (!response.ok) return

      const payload = await response.json()
      setItems(Array.isArray(payload.data?.items) ? payload.data.items : [])
    } catch (_) {
    } finally {
      if (isInitial) {
        initialLoadRef.current = false
        setLoading(false)
      }
    }
  }, [adminToken])

  useEffect(() => {
    if (!adminToken) {
      initialLoadRef.current = true
      setItems([])
      setLoading(false)
      return undefined
    }

    fetchNotifications()
    if (!POLL_MS) return undefined

    const timer = setInterval(fetchNotifications, POLL_MS)

    function scheduleRefresh() {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null
        fetchNotifications()
      }, 1500)
    }

    window.addEventListener(SUPPORT_TICKET_ATTENDED_EVENT, scheduleRefresh)

    return () => {
      clearInterval(timer)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      window.removeEventListener(SUPPORT_TICKET_ATTENDED_EVENT, scheduleRefresh)
    }
  }, [adminToken, fetchNotifications])

  const enrichedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        isRead: readIds.has(item.id),
        timeLabel: formatRelativeTime(item.occurredAt),
      })),
    [items, readIds],
  )

  const unreadCount = useMemo(
    () => enrichedItems.filter((item) => !item.isRead).length,
    [enrichedItems],
  )

  const markRead = useCallback((id) => {
    if (!id) return
    setReadIds((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setReadIds((current) => {
      const next = new Set(current)
      for (const item of items) {
        next.add(item.id)
      }
      saveReadIds(next)
      return next
    })
  }, [items])

  return {
    items: enrichedItems,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  }
}
