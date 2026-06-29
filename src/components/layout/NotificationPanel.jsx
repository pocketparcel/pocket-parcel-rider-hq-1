import {
  FiCheckCircle,
  FiMessageCircle,
  FiPackage,
  FiTruck,
  FiUserCheck,
  FiArchive,
} from 'react-icons/fi'

const TYPE_META = {
  support: { icon: FiMessageCircle, tone: 'text-rose-600 bg-rose-50' },
  rider_onboarding: { icon: FiUserCheck, tone: 'text-sky-600 bg-sky-50' },
  order_new: { icon: FiPackage, tone: 'text-amber-600 bg-amber-50' },
  order_delivered: { icon: FiCheckCircle, tone: 'text-emerald-600 bg-emerald-50' },
  order_warehouse: { icon: FiArchive, tone: 'text-violet-600 bg-violet-50' },
}

function groupItems(items) {
  const groups = new Map()
  for (const item of items) {
    const key = item.category || 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return [...groups.entries()]
}

function NotificationPanel({
  open,
  items = [],
  unreadCount = 0,
  loading = false,
  onClose,
  onItemClick,
  onMarkAllRead,
}) {
  if (!open) return null

  const groups = groupItems(items)

  return (
    <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          <p className="text-xs text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-brand-orange hover:underline"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="max-h-[min(70vh,420px)] overflow-y-auto">
        {loading && items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications…</p>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <FiTruck className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-sm font-medium text-slate-700">No notifications</p>
            <p className="mt-1 text-xs text-slate-500">
              Support, onboarding, and order updates will appear here.
            </p>
          </div>
        ) : (
          groups.map(([category, groupItemsList]) => (
            <section key={category}>
              <p className="sticky top-0 bg-slate-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {category}
              </p>
              <ul>
                {groupItemsList.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.order_new
                  const Icon = meta.icon
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onItemClick?.(item)}
                        className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                          item.isRead ? 'opacity-70' : 'bg-orange-50/30'
                        }`}
                      >
                        <span
                          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
                        >
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {item.title}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-400">{item.timeLabel}</span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">
                            {item.message}
                          </span>
                        </span>
                        {!item.isRead ? (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-2 text-right">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default NotificationPanel
