import {
  FiGlobe,
  FiHelpCircle,
  FiHome,
  FiKey,
  FiLogOut,
  FiMap,
  FiMessageCircle,
  FiMessageSquare,
  FiSettings,
  FiShield,
  FiTruck,
  FiUsers,
} from 'react-icons/fi'
import Tooltip from '../ui/Tooltip'

function SidebarNavItem({ item, activeView, collapsed, onNavigate }) {
  const isActive = activeView === item.key
  const tooltipLabel = item.badge ? `${item.name} (${item.badge})` : item.name

  const button = (
    <button
      type="button"
      onClick={() => onNavigate?.(item.path)}
      className={`mb-1 flex w-full items-center rounded-lg text-left text-[13px] font-medium last:mb-0 ${
        collapsed ? 'relative justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'
      } ${
        isActive ? 'bg-rose-50 text-brand-orange' : 'text-slate-700 hover:bg-white'
      }`}
    >
      <item.icon size={16} className="shrink-0" />
      {!collapsed ? <span className="flex-1 truncate">{item.name}</span> : null}
      {!collapsed && item.badge ? (
        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
          {item.badge}
        </span>
      ) : null}
      {collapsed && item.badge ? (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
      ) : null}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip label={tooltipLabel} className="relative w-full">
        {button}
      </Tooltip>
    )
  }

  return button
}

function Sidebar({
  activeView = 'dashboard',
  onNavigate,
  onLogout,
  riderCount = 0,
  adminRole,
  logoSrc,
  collapsed = false,
}) {
  const mainItems = [
    { key: 'dashboard', path: '/dashboard', name: 'Dashboard', icon: FiHome },
    { key: 'live-map', path: '/live-map', name: 'Live Map', icon: FiMap },
    {
      key: 'riders',
      path: '/riders',
      name: 'Riders',
      icon: FiUsers,
      badge: riderCount > 0 ? String(riderCount) : null,
    },
    { key: 'orders', path: '/orders', name: 'Orders', icon: FiTruck },
    { key: 'support', path: '/support', name: 'Support', icon: FiMessageCircle },
    { key: 'help-faqs', path: '/help-faqs', name: 'Help FAQs', icon: FiHelpCircle },
    { key: 'dispatch-policies', path: '/dispatch-policies', name: 'Dispatch Policies', icon: FiShield },
    { key: 'platform-settings', path: '/platform-settings', name: 'Platform Settings', icon: FiMessageSquare },
    { key: 'vehicle-masters', path: '/vehicle-masters', name: 'Vehicle Masters', icon: FiSettings },
    { key: 'countries', path: '/countries', name: 'Countries', icon: FiGlobe },
    { key: 'api-clients', path: '/api-clients', name: 'API Clients', icon: FiKey },
  ]

  if (adminRole === 'super_admin') {
    mainItems.push({
      key: 'admin-users',
      path: '/admin-users',
      name: 'Admin Users',
      icon: FiShield,
    })
  }

  const logoutButton = (
    <button
      type="button"
      onClick={onLogout}
      className={`flex w-full items-center rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 ${
        collapsed ? 'justify-center px-2 py-2.5' : 'justify-center px-3 py-2'
      }`}
    >
      {collapsed ? <FiLogOut size={16} /> : 'Logout'}
    </button>
  )

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-slate-200 bg-[#f1f2f6] transition-[width] duration-200 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      <div
        className={`flex h-[58px] shrink-0 items-center border-b border-slate-200 bg-[#f3f4f7] ${
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'
        }`}
      >
        <img src={logoSrc} alt="Pocket Parcel" className="h-8 w-8 shrink-0 object-contain" />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-800">Pocket Parcel</p>
            <p className="truncate text-[10px] text-slate-500">Admin Platform</p>
          </div>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col overflow-y-auto ${collapsed ? 'p-2' : 'p-4'}`}>
        <div className="rounded-xl p-1">
          {!collapsed ? (
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Operations
            </p>
          ) : null}
          {mainItems.map((item) => (
            <SidebarNavItem
              key={item.key}
              item={item}
              activeView={activeView}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className={`mt-auto ${collapsed ? 'pt-2' : 'border-t border-slate-200 pt-4'}`}>
          {collapsed ? <Tooltip label="Logout">{logoutButton}</Tooltip> : logoutButton}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
