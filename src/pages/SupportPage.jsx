import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiMessageCircle, FiRefreshCw, FiSearch, FiSend } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../config/api'
import { notifySupportTicketAttended, ticketNeedsAttention } from '../utils/supportNotifications'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function statusLabel(status) {
  switch (status) {
    case 'in_progress':
      return 'In Review'
    case 'resolved':
      return 'Resolved'
    case 'closed':
      return 'Closed'
    case 'open':
    default:
      return 'Open'
  }
}

function statusClass(status) {
  switch (status) {
    case 'in_progress':
      return 'bg-amber-50 text-amber-700'
    case 'resolved':
      return 'bg-emerald-50 text-emerald-700'
    case 'closed':
      return 'bg-slate-100 text-slate-600'
    case 'open':
    default:
      return 'bg-rose-50 text-rose-700'
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const ACTIVE_TICKET_KEY = 'support_active_ticket_id'

function SupportPage({ adminToken, onUnauthorized }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [selectedTicketId, setSelectedTicketId] = useState(() => searchParams.get('ticket'))
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [messageDraft, setMessageDraft] = useState('')
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingTicket, setLoadingTicket] = useState(false)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [riderTyping, setRiderTyping] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const typingStopRef = useRef(null)
  const lastTypingSignalRef = useRef(false)
  const lastMessageIdRef = useRef(null)
  const attendedEventRef = useRef(null)
  const onUnauthorizedRef = useRef(onUnauthorized)

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized
  }, [onUnauthorized])

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    }),
    [adminToken],
  )

  const loadTickets = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingTickets(true)
      setError('')
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const url = params.toString()
        ? `${adminApi.supportTickets}?${params.toString()}`
        : adminApi.supportTickets

      const response = await fetch(url, { headers })
      if (response.status === 401) {
        onUnauthorizedRef.current?.()
        return
      }
      if (!response.ok) {
        throw new Error(`Failed to load tickets (${response.status})`)
      }

      const payload = await response.json()
      const nextTickets = Array.isArray(payload.data) ? payload.data : []
      setTickets(nextTickets)

      if (nextTickets.length === 0) {
        setSelectedTicketId(null)
        setSelectedTicket(null)
        setMessages([])
      } else {
        setSelectedTicketId((current) => {
          if (current && nextTickets.some((ticket) => ticket.id === current)) {
            return current
          }
          return nextTickets[0].id
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to load support tickets')
    } finally {
      if (!silent) setLoadingTickets(false)
    }
  }, [headers, search, statusFilter])

  const markTicketAttended = useCallback((ticketId) => {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, needsAttention: false } : ticket,
      ),
    )
    setSelectedTicket((current) =>
      current?.id === ticketId ? { ...current, needsAttention: false } : current,
    )
    if (attendedEventRef.current !== ticketId) {
      attendedEventRef.current = ticketId
      notifySupportTicketAttended(ticketId)
    }
  }, [])

  const loadTicket = useCallback(async (ticketId) => {
    if (!ticketId) return

    try {
      setLoadingTicket(true)
      setError('')
      const response = await fetch(adminApi.supportTicketById(ticketId), { headers })
      if (response.status === 401) {
        onUnauthorizedRef.current?.()
        return
      }
      if (!response.ok) {
        throw new Error(`Failed to load ticket (${response.status})`)
      }

      const payload = await response.json()
      const ticket = payload.data ?? null
      setSelectedTicket(ticket)
      setMessages(Array.isArray(ticket?.messages) ? ticket.messages : [])
      markTicketAttended(ticketId)
    } catch (err) {
      setError(err.message || 'Failed to load ticket details')
    } finally {
      setLoadingTicket(false)
    }
  }, [headers, markTicketAttended])

  const signalTyping = useCallback(
    async (isTyping) => {
      if (!selectedTicketId || lastTypingSignalRef.current === isTyping) return
      lastTypingSignalRef.current = isTyping

      try {
        await fetch(adminApi.supportTicketTyping(selectedTicketId), {
          method: 'POST',
          headers,
          body: JSON.stringify({ isTyping }),
        })
      } catch (_) {}
    },
    [headers, selectedTicketId],
  )

  useEffect(() => {
    if (selectedTicketId) {
      sessionStorage.setItem(ACTIVE_TICKET_KEY, selectedTicketId)
    } else {
      sessionStorage.removeItem(ACTIVE_TICKET_KEY)
    }
  }, [selectedTicketId])

  useEffect(() => {
    return () => sessionStorage.removeItem(ACTIVE_TICKET_KEY)
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    const ticketFromQuery = searchParams.get('ticket')
    if (!ticketFromQuery) return
    setSelectedTicketId(ticketFromQuery)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (selectedTicketId) {
      loadTicket(selectedTicketId)
      setRiderTyping(false)
      lastTypingSignalRef.current = false
    }
  }, [loadTicket, selectedTicketId])

  useEffect(() => {
    if (!selectedTicketId) return undefined

    const hasText = messageDraft.trim().length > 0
    if (hasText) {
      signalTyping(true)
      if (typingStopRef.current) clearTimeout(typingStopRef.current)
      typingStopRef.current = setTimeout(() => signalTyping(false), 2000)
    } else {
      signalTyping(false)
    }

    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current)
    }
  }, [messageDraft, selectedTicketId, signalTyping])

  useEffect(() => {
    if (!selectedTicketId) return undefined

    const timer = setInterval(async () => {
      try {
        const response = await fetch(adminApi.supportTicketTyping(selectedTicketId), { headers })
        if (!response.ok) return
        const payload = await response.json()
        setRiderTyping(payload.data?.isTyping === true)
      } catch (_) {}
    }, 2000)

    return () => clearInterval(timer)
  }, [headers, selectedTicketId])

  useEffect(() => {
    if (!selectedTicketId) return undefined

    const timer = setInterval(async () => {
      try {
        const after = lastMessageIdRef.current
        const url = after
          ? `${adminApi.supportTicketMessages(selectedTicketId)}?after=${after}`
          : adminApi.supportTicketMessages(selectedTicketId)
        const response = await fetch(url, { headers })
        if (!response.ok) return
        const payload = await response.json()
        const incoming = Array.isArray(payload.data) ? payload.data : []
        if (incoming.length === 0) return
        setMessages((current) => {
          const ids = new Set(current.map((item) => item.id))
          const merged = [...current]
          for (const message of incoming) {
            if (!ids.has(message.id)) merged.push(message)
          }
          return merged
        })
      } catch (_) {}
    }, 5000)

    return () => clearInterval(timer)
  }, [headers, selectedTicketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedTicketId, riderTyping])

  async function handleSendMessage(event) {
    event.preventDefault()
    if (!selectedTicketId || !messageDraft.trim() || sending) return

    try {
      setSending(true)
      setError('')
      const response = await fetch(adminApi.supportTicketMessages(selectedTicketId), {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: messageDraft.trim() }),
      })
      if (response.status === 401) {
        onUnauthorized?.()
        return
      }
      if (!response.ok) {
        throw new Error(`Failed to send message (${response.status})`)
      }

      const payload = await response.json()
      const message = payload.data
      setMessageDraft('')
      await signalTyping(false)
      if (message) {
        setMessages((current) => [...current, message])
      }
      await loadTickets({ silent: true })
    } catch (err) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(nextStatus) {
    if (!selectedTicketId || updatingStatus) return

    try {
      setUpdatingStatus(true)
      setError('')
      const response = await fetch(adminApi.supportTicketStatus(selectedTicketId), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: nextStatus }),
      })
      if (response.status === 401) {
        onUnauthorized?.()
        return
      }
      if (!response.ok) {
        throw new Error(`Failed to update status (${response.status})`)
      }

      const payload = await response.json()
      setSelectedTicket((current) => ({ ...current, ...payload.data }))
      await loadTickets({ silent: true })
    } catch (err) {
      setError(err.message || 'Failed to update ticket status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Support Inbox</h2>
          <button
            type="button"
            onClick={loadTickets}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <FiRefreshCw size={12} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden xl:grid-cols-[248px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-2">
            <div className="flex gap-1.5">
              <div className="relative min-w-0 flex-1">
                <FiSearch className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') loadTickets()
                  }}
                  placeholder="Search..."
                  className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-brand-orange"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-[92px] shrink-0 rounded-md border border-slate-200 px-1.5 py-1.5 text-xs outline-none focus:border-brand-orange"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingTickets ? (
              <p className="p-2 text-xs text-slate-500">Loading...</p>
            ) : tickets.length === 0 ? (
              <p className="p-2 text-xs text-slate-500">No tickets yet.</p>
            ) : (
              tickets.map((ticket) => {
                const active = ticket.id === selectedTicketId
                const unread = ticketNeedsAttention(ticket)
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full border-b border-slate-100 px-2 py-2 text-left transition ${
                      active ? 'bg-orange-50' : unread ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {unread ? (
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500 align-middle" />
                        ) : null}
                        {ticket.rider?.fullName || 'Rider'}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusClass(ticket.status)}`}
                      >
                        {statusLabel(ticket.status)}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-500">
                      {ticket.ticketNumber} • {ticket.lastMessagePreview || ticket.subject}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(ticket.lastMessageAt)}</p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          {!selectedTicketId ? (
            <div className="flex flex-1 items-center justify-center p-4 text-xs text-slate-500">
              Select a ticket.
            </div>
          ) : loadingTicket && !selectedTicket ? (
            <div className="flex flex-1 items-center justify-center p-4 text-xs text-slate-500">
              Loading...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-2.5 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <FiMessageCircle className="shrink-0 text-brand-orange" size={14} />
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {selectedTicket?.subject || 'Support ticket'}
                    </h3>
                  </div>
                  <p className="truncate text-[11px] text-slate-500">
                    {selectedTicket?.rider?.fullName || 'Rider'} • {selectedTicket?.rider?.phone || '-'}
                    {' • '}
                    {selectedTicket?.ticketNumber}
                    {selectedTicket?.ticketType === 'chat' ? ' • Chat' : ' • Report'}
                    {riderTyping ? ' • typing...' : ''}
                  </p>
                </div>
                <select
                  value={selectedTicket?.status || 'open'}
                  disabled={updatingStatus}
                  onChange={(event) => handleStatusChange(event.target.value)}
                  className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-orange"
                >
                  {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-2.5">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500">No messages yet.</p>
                ) : (
                  messages.map((message) => {
                    const incoming = message.senderType === 'rider'
                    return (
                      <div
                        key={message.id}
                        className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-xl px-2.5 py-1.5 text-xs shadow-sm ${
                            incoming
                              ? 'rounded-bl-sm bg-white text-slate-800'
                              : 'rounded-br-sm bg-brand-orange text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
                          <p className={`mt-0.5 text-[9px] ${incoming ? 'text-slate-400' : 'text-white/75'}`}>
                            {incoming ? 'Rider' : message.senderName || 'Support'} • {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                {riderTyping ? (
                  <div className="flex justify-start">
                    <div className="rounded-xl rounded-bl-sm bg-white px-2.5 py-1.5 text-xs shadow-sm">
                      <div className="flex items-center gap-1 py-0.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-2">
                <div className="flex items-center gap-1.5">
                  <textarea
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    rows={1}
                    placeholder="Reply..."
                    className="max-h-20 min-h-[34px] flex-1 resize-none rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand-orange"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageDraft.trim()}
                    className="inline-flex h-[34px] shrink-0 items-center gap-1 rounded-md bg-brand-orange px-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiSend size={12} />
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default SupportPage
