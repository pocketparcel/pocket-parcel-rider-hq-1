import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import riderLogo from './assets/rider-logo.png'
import Header from './components/layout/Header'
import Layout from './components/layout/Layout'
import Sidebar from './components/layout/Sidebar'
import { adminApi } from './config/api'
import AdminLoginPage from './pages/AdminLoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailsPage from './pages/OrderDetailsPage'
import EditRiderPage from './pages/EditRiderPage'
import RidersPage from './pages/RidersPage'
import VehicleMastersPage from './pages/VehicleMastersPage'
import CountriesPage from './pages/CountriesPage'
import ApiClientsPage from './pages/ApiClientsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import ProfilePage from './pages/ProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import SupportPage from './pages/SupportPage'
import HelpFaqsPage from './pages/HelpFaqsPage'
import DispatchPoliciesPage from './pages/DispatchPoliciesPage'
import PlatformSettingsPage from './pages/PlatformSettingsPage'
import OnlineRidersMapPage from './pages/OnlineRidersMapPage'
import PayoutsPage from './pages/PayoutsPage'
import { useAdminNotifications } from './hooks/useAdminNotifications'
import { useSupportNotifications } from './hooks/useSupportNotifications'
import { notifySupportTicketAttended, requestNotificationPermission } from './utils/supportNotifications'

const ADMIN_TOKEN_KEY = 'admin_ui_token'
const ADMIN_USER_KEY = 'admin_ui_user'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '')
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const raw = localStorage.getItem(ADMIN_USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [riders, setRiders] = useState([])
  const [ridersLoading, setRidersLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const viewByPath = {
    '/dashboard': 'dashboard',
    '/live-map': 'live-map',
    '/riders': 'riders',
    '/orders': 'orders',
    '/payouts': 'payouts',
    '/support': 'support',
    '/help-faqs': 'help-faqs',
    '/dispatch-policies': 'dispatch-policies',
    '/platform-settings': 'platform-settings',
    '/vehicle-masters': 'vehicle-masters',
    '/countries': 'countries',
    '/api-clients': 'api-clients',
    '/admin-users': 'admin-users',
    '/profile': 'profile',
    '/change-password': 'change-password',
  }

  const activeView = viewByPath[location.pathname] ?? 'dashboard'

  function handleLogin(data) {
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin))
    setAdminToken(data.token)
    setAdminUser(data.admin)
    requestNotificationPermission()
    navigate('/dashboard', { replace: true })
  }

  function handleProfileUpdated(profile) {
    const nextUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
    }
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(nextUser))
    setAdminUser(nextUser)
  }

  function handleLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
    setAdminToken('')
    setAdminUser(null)
    navigate('/login', { replace: true })
  }

  useSupportNotifications({
    adminToken,
    onUnauthorized: handleLogout,
  })

  const {
    items: notifications,
    unreadCount: notificationUnreadCount,
    loading: notificationsLoading,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  } = useAdminNotifications({
    adminToken,
    onUnauthorized: handleLogout,
  })

  function handleNotificationClick(item) {
    markNotificationRead(item.id)
    if (item.type === 'support') {
      const ticketId = item.id.replace(/^support:/, '')
      notifySupportTicketAttended(ticketId)
    }
    if (item.href) {
      navigate(item.href)
    }
  }

  useEffect(() => {
    if (!adminToken) {
      setRidersLoading(false)
      return
    }
    const controller = new AbortController()

    async function loadRiders() {
      try {
        setRidersLoading(true)
        const response = await fetch(adminApi.riders, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        if (response.ok) {
          const payload = await response.json()
          setRiders(Array.isArray(payload.data) ? payload.data : [])
        } else if (response.status === 401) {
          handleLogout()
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setRiders([])
        }
      } finally {
        setRidersLoading(false)
      }
    }

    loadRiders()
    return () => controller.abort()
  }, [adminToken])

  const riderCount = riders.length

  if (!adminToken) {
    return (
      <Routes>
        <Route path="/login" element={<AdminLoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout
      header={
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          adminUser={adminUser}
          onLogout={handleLogout}
          notifications={notifications}
          notificationUnreadCount={notificationUnreadCount}
          notificationsLoading={notificationsLoading}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsRead={markAllNotificationsRead}
        />
      }
      sidebar={
        <Sidebar
          activeView={activeView}
          onNavigate={navigate}
          onLogout={handleLogout}
          riderCount={riderCount}
          adminRole={adminUser?.role}
          logoSrc={riderLogo}
          collapsed={sidebarCollapsed}
        />
      }
    >
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={<DashboardPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/live-map"
          element={<OnlineRidersMapPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/riders"
          element={
            <RidersPage
              riders={riders}
              loading={ridersLoading}
              adminToken={adminToken}
              onUnauthorized={handleLogout}
              dataMode="server"
            />
          }
        />
        <Route
          path="/riders/:id/edit"
          element={<EditRiderPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/orders"
          element={<OrdersPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/orders/:id"
          element={<OrderDetailsPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/payouts"
          element={<PayoutsPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/support"
          element={<SupportPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/help-faqs"
          element={<HelpFaqsPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/dispatch-policies"
          element={<DispatchPoliciesPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/platform-settings"
          element={<PlatformSettingsPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route path="/vehicle-masters" element={<VehicleMastersPage adminToken={adminToken} onUnauthorized={handleLogout} />} />
        <Route path="/countries" element={<CountriesPage adminToken={adminToken} onUnauthorized={handleLogout} />} />
        <Route
          path="/api-clients"
          element={<ApiClientsPage adminToken={adminToken} onUnauthorized={handleLogout} />}
        />
        <Route
          path="/admin-users"
          element={
            <AdminUsersPage
              adminToken={adminToken}
              adminUser={adminUser}
              onUnauthorized={handleLogout}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              adminToken={adminToken}
              onUnauthorized={handleLogout}
              onProfileUpdated={handleProfileUpdated}
            />
          }
        />
        <Route
          path="/change-password"
          element={
            <ChangePasswordPage adminToken={adminToken} onUnauthorized={handleLogout} />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
