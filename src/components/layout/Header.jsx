import { useEffect, useRef, useState } from 'react'
import { FiBell, FiGrid, FiLock, FiLogOut, FiUser } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import NotificationPanel from './NotificationPanel'

function getInitials(name) {
  const parts = String(name || 'Admin')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'A'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function Header({
  sidebarCollapsed = false,
  onToggleSidebar,
  adminUser,
  onLogout,
  notifications = [],
  notificationUnreadCount = 0,
  notificationsLoading = false,
  onNotificationClick,
  onMarkAllNotificationsRead,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const menuRef = useRef(null)
  const notificationsRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleNotificationItemClick(item) {
    onNotificationClick?.(item)
    setNotificationsOpen(false)
  }

  return (
    <header className="z-20 h-[58px] shrink-0 border-b border-slate-200 bg-[#f3f4f7]">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-brand-orange hover:text-brand-orange"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
          >
            <FiGrid size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((value) => !value)
                setMenuOpen(false)
              }}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:text-brand-orange"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <FiBell size={13} />
              {notificationUnreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
                  {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                </span>
              ) : null}
            </button>

            <NotificationPanel
              open={notificationsOpen}
              items={notifications}
              unreadCount={notificationUnreadCount}
              loading={notificationsLoading}
              onClose={() => setNotificationsOpen(false)}
              onItemClick={handleNotificationItemClick}
              onMarkAllRead={onMarkAllNotificationsRead}
            />
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((value) => !value)
                setNotificationsOpen(false)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-brand-orange shadow-sm transition hover:border-brand-orange"
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
            >
              {getInitials(adminUser?.name)}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {adminUser?.name || 'Admin'}
                  </p>
                  <p className="truncate text-xs text-slate-500">{adminUser?.email || ''}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                    {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </p>
                </div>
                <div className="p-1">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FiUser size={14} />
                    Profile
                  </Link>
                  <Link
                    to="/change-password"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FiLock size={14} />
                    Change password
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout?.()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    <FiLogOut size={14} />
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
