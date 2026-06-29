let audioContext = null

export function unlockNotificationAudio() {
  if (typeof window === 'undefined') return

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  if (!audioContext) {
    audioContext = new AudioContextClass()
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }
}

function playBellSound() {
  unlockNotificationAudio()
  if (!audioContext) return

  const now = audioContext.currentTime

  const playTone = (frequency, startOffset, duration) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, now + startOffset)
    gain.gain.exponentialRampToValueAtTime(0.2, now + startOffset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now + startOffset)
    oscillator.stop(now + startOffset + duration + 0.05)
  }

  playTone(880, 0, 0.22)
  playTone(659.25, 0.1, 0.32)
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  return Notification.requestPermission()
}

export function notifySupportRequest({ title, body, onClick }) {
  playBellSound()

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }

  if (Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(title, {
    body,
    icon: '/favicon.svg',
    tag: `support-${Date.now()}`,
    silent: false,
  })

  notification.onclick = () => {
    window.focus()
    onClick?.()
    notification.close()
  }
}

export function ticketNeedsAttention(ticket) {
  if (typeof ticket?.needsAttention === 'boolean') {
    return ticket.needsAttention
  }

  return (
    ticket?.lastMessageSenderType === 'rider' &&
    (ticket?.status === 'open' || ticket?.status === 'in_progress')
  )
}

export function countPendingSupportTickets(tickets = [], { excludeTicketId = null } = {}) {
  return tickets.filter((ticket) => {
    if (excludeTicketId && ticket.id === excludeTicketId) return false
    return ticketNeedsAttention(ticket)
  }).length
}

export const SUPPORT_TICKET_ATTENDED_EVENT = 'support-ticket-attended'

export function notifySupportTicketAttended(ticketId) {
  if (typeof window === 'undefined' || !ticketId) return
  window.dispatchEvent(
    new CustomEvent(SUPPORT_TICKET_ATTENDED_EVENT, { detail: { ticketId } }),
  )
}
