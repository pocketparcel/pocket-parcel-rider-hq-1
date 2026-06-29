import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminApi } from '../config/api'
import {
  notifySupportRequest,
  requestNotificationPermission,
  ticketNeedsAttention,
  unlockNotificationAudio,
} from '../utils/supportNotifications'

const ACTIVE_TICKET_KEY = 'support_active_ticket_id'
const POLL_INTERVAL_MS = 30000

export function useSupportNotifications({ adminToken, onUnauthorized }) {
  const location = useLocation()
  const navigate = useNavigate()
  const snapshotRef = useRef(null)
  const initializedRef = useRef(false)
  const onUnauthorizedRef = useRef(onUnauthorized)

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized
  }, [onUnauthorized])

  useEffect(() => {
    if (!adminToken) {
      initializedRef.current = false
      snapshotRef.current = null
      return undefined
    }

    requestNotificationPermission()

    function unlockAudio() {
      unlockNotificationAudio()
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => window.removeEventListener('pointerdown', unlockAudio)
  }, [adminToken])

  useEffect(() => {
    if (!adminToken || location.pathname === '/support') {
      return undefined
    }

    async function pollSupportTickets() {
      try {
        const response = await fetch(adminApi.supportTickets, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })

        if (response.status === 401) {
          onUnauthorizedRef.current?.()
          return
        }

        if (!response.ok) return

        const payload = await response.json()
        const tickets = Array.isArray(payload.data) ? payload.data : []

        const nextSnapshot = new Map()
        for (const ticket of tickets) {
          nextSnapshot.set(ticket.id, {
            lastMessageAt: ticket.lastMessageAt,
            messageCount: ticket.messageCount,
          })
        }

        if (!initializedRef.current) {
          snapshotRef.current = nextSnapshot
          initializedRef.current = true
          return
        }

        const previousSnapshot = snapshotRef.current || new Map()
        const activeTicketId = sessionStorage.getItem(ACTIVE_TICKET_KEY)

        for (const ticket of tickets) {
          if (!ticketNeedsAttention(ticket)) continue

          const previous = previousSnapshot.get(ticket.id)
          const riderName = ticket.rider?.fullName || 'Rider'
          const preview = ticket.lastMessagePreview || ticket.subject || 'New support activity'
          const isActiveTicket = activeTicketId === ticket.id

          if (!previous) {
            if (isActiveTicket) continue

            notifySupportRequest({
              title: ticket.ticketType === 'chat' ? 'New support chat' : 'New issue reported',
              body: `${riderName}: ${preview}`,
              onClick: () => navigate(`/support?ticket=${ticket.id}`),
            })
            continue
          }

          const hasNewActivity =
            ticket.lastMessageAt !== previous.lastMessageAt ||
            ticket.messageCount > previous.messageCount

          if (hasNewActivity && !isActiveTicket) {
            notifySupportRequest({
              title: ticket.ticketType === 'chat' ? 'New chat message' : 'New issue message',
              body: `${riderName}: ${preview}`,
              onClick: () => navigate(`/support?ticket=${ticket.id}`),
            })
          }
        }

        snapshotRef.current = nextSnapshot
      } catch (_) {}
    }

    pollSupportTickets()
    const timer = setInterval(pollSupportTickets, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [adminToken, location.pathname, navigate])

  return {}
}
