import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMessageCircle,
  FiPackage,
  FiRefreshCw,
  FiTruck,
  FiUsers,
  FiZap,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { adminApi } from '../config/api'
import { adminTableAutoRefresh, getAutoRefreshMs } from '../config/app'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const STATUS_LABELS = {
  available: 'Available',
  in_transit: 'In transit',
  delivered: 'Delivered',
  rejected: 'Rejected',
}

const ORDER_TYPE_LABELS = {
  local: 'Local',
  domestic: 'Domestic',
  international: 'International',
}

const STATUS_STYLES = {
  available: 'bg-amber-50 text-amber-800',
  in_transit: 'bg-sky-50 text-sky-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value) {
  if (value == null || value === '') return false
  return UUID_PATTERN.test(String(value).trim())
}

function formatOrderLabel(order) {
  if (order.orderNumber && !isUuid(order.orderNumber)) return String(order.orderNumber)
  if (order.referenceNumber && !isUuid(order.referenceNumber)) return String(order.referenceNumber)
  return '—'
}

function formatRs(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 'Rs 0.00'
  return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusPill({ status }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, hint, tone = 'slate', to }) {
  const toneClasses = {
    orange: 'border-orange-200 bg-orange-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    sky: 'border-sky-200 bg-sky-50',
    violet: 'border-violet-200 bg-violet-50',
    amber: 'border-amber-200 bg-amber-50',
    rose: 'border-rose-200 bg-rose-50',
    slate: 'border-slate-200 bg-white',
  }

  const content = (
    <article className={`rounded-xl border p-4 ${toneClasses[tone] ?? toneClasses.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
          <Icon size={18} />
        </div>
        {to ? (
          <span className="text-[11px] font-medium text-brand-orange">View</span>
        ) : null}
      </div>
      <p className="mt-3 text-[12px] font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-none text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-slate-500">{hint}</p> : null}
    </article>
  )

  if (to) {
    return (
      <Link to={to} className="block transition hover:opacity-90">
        {content}
      </Link>
    )
  }

  return content
}

function BreakdownBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value} <span className="text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function AlertRow({ severity, title, detail, to }) {
  const styles = {
    critical: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }

  const body = (
    <div className={`rounded-lg border px-3 py-2.5 ${styles[severity] ?? styles.info}`}>
      <p className="text-[12px] font-semibold">{title}</p>
      {detail ? <p className="mt-0.5 text-[11px] opacity-90">{detail}</p> : null}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block transition hover:opacity-90">
        {body}
      </Link>
    )
  }

  return body
}

function DashboardPage({ adminToken, onUnauthorized }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const controllerRef = useRef(null)
  const dashboardRefreshMs = getAutoRefreshMs(adminTableAutoRefresh.dashboardSeconds)

  const fetchDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!adminToken) return

      controllerRef.current?.abort?.()
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        if (!silent) {
          setLoading(true)
          setError('')
        } else {
          setRefreshing(true)
        }

        const response = await fetch(adminApi.dashboard, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${adminToken}` },
        })

        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized?.()
            return
          }
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.message || `Request failed (${response.status})`)
        }

        const payload = await response.json()
        setData(payload.data ?? null)
      } catch (err) {
        if (err.name !== 'AbortError' && !silent) {
          setError(err.message || 'Failed to load dashboard')
        }
      } finally {
        if (!silent) setLoading(false)
        setRefreshing(false)
      }
    },
    [adminToken, onUnauthorized],
  )

  useEffect(() => {
    fetchDashboard()
    return () => controllerRef.current?.abort?.()
  }, [fetchDashboard])

  const refreshSilent = useCallback(() => {
    fetchDashboard({ silent: true })
  }, [fetchDashboard])

  useAutoRefresh({
    enabled: Boolean(adminToken) && dashboardRefreshMs > 0,
    intervalMs: dashboardRefreshMs,
    onRefresh: refreshSilent,
  })

  const kpis = data?.kpis ?? {}
  const byStatus = data?.orders?.byStatus ?? {}
  const byOrderType = data?.orders?.byOrderType ?? {}
  const riders = data?.riders ?? {}
  const support = data?.support ?? {}
  const recentOrders = data?.recentOrders ?? []

  const alerts = useMemo(() => {
    const items = []

    if ((kpis.unassignedAvailable ?? 0) > 0) {
      items.push({
        severity: 'warning',
        title: `${kpis.unassignedAvailable} orders awaiting rider`,
        detail: 'Unassigned orders are still in the available pool.',
        to: '/orders',
      })
    }

    if ((kpis.warehouseQueue ?? 0) > 0) {
      items.push({
        severity: 'info',
        title: `${kpis.warehouseQueue} orders at warehouse`,
        detail: 'Non-local orders routed to warehouse fallback.',
        to: '/orders',
      })
    }

    if ((kpis.unassignedAvailable ?? 0) > 0 && (kpis.dispatchEligibleRiders ?? 0) === 0) {
      items.push({
        severity: 'critical',
        title: 'No dispatch-eligible riders online',
        detail: 'Orders may stall until a rider comes online and is approved.',
        to: '/riders',
      })
    }

    if ((riders.dispatchBlocked ?? 0) > 0) {
      items.push({
        severity: 'warning',
        title: `${riders.dispatchBlocked} riders dispatch-blocked`,
        detail: 'Blocked by consecutive reject policy.',
        to: '/riders',
      })
    }

    if ((riders.pendingApproval ?? 0) > 0) {
      items.push({
        severity: 'info',
        title: `${riders.pendingApproval} riders pending approval`,
        detail: 'Onboarding completed but not yet approved.',
        to: '/riders',
      })
    }

    if ((support.open ?? 0) + (support.inProgress ?? 0) > 0) {
      items.push({
        severity: 'warning',
        title: `${(support.open ?? 0) + (support.inProgress ?? 0)} open support tickets`,
        detail: `${support.open ?? 0} open · ${support.inProgress ?? 0} in progress`,
        to: '/support',
      })
    }

    if (items.length === 0) {
      items.push({
        severity: 'success',
        title: 'Operations look healthy',
        detail: 'No urgent dispatch or support alerts right now.',
      })
    }

    return items
  }, [kpis, riders, support])

  const statusTotal = useMemo(
    () => Object.values(byStatus).reduce((sum, n) => sum + Number(n || 0), 0),
    [byStatus],
  )

  const typeTotal = useMemo(
    () => Object.values(byOrderType).reduce((sum, n) => sum + Number(n || 0), 0),
    [byOrderType],
  )

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Loading dashboard…
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Failed to load dashboard: {error}
      </div>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-semibold leading-none text-slate-900">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Live operations overview — orders, riders, dispatch, and support.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
            {dashboardRefreshMs > 0 ? (
              <span className="text-slate-400">· refreshes every {adminTableAutoRefresh.dashboardSeconds}s</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => fetchDashboard({ silent: Boolean(data) })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {data?.generatedAt ? (
        <p className="text-[11px] text-slate-400">Last updated {formatDateTime(data.generatedAt)}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FiCheckCircle}
          label="Delivered today"
          value={String(kpis.todayDelivered ?? 0)}
          hint={`${kpis.todayCreated ?? 0} new orders today`}
          tone="emerald"
          to="/orders"
        />
        <KpiCard
          icon={FiUsers}
          label="Riders online"
          value={String(kpis.activeRiders ?? 0)}
          hint={`${kpis.dispatchEligibleRiders ?? 0} eligible for dispatch`}
          tone="sky"
          to="/riders"
        />
        <KpiCard
          icon={FiPackage}
          label="Awaiting rider"
          value={String(kpis.unassignedAvailable ?? 0)}
          hint={`${kpis.pendingOrders ?? 0} available in pool`}
          tone="amber"
          to="/orders"
        />
        <KpiCard
          icon={FiZap}
          label="Earnings today"
          value={formatRs(kpis.todayEarnings)}
          hint={`${formatRs(kpis.totalEarnings)} lifetime`}
          tone="orange"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FiTruck}
          label="In transit"
          value={String(kpis.inTransitOrders ?? 0)}
          hint="Active deliveries with riders"
          tone="sky"
          to="/orders"
        />
        <KpiCard
          icon={FiPackage}
          label="Warehouse queue"
          value={String(kpis.warehouseQueue ?? 0)}
          hint="Assigned to warehouse, not delivered"
          tone="violet"
          to="/orders"
        />
        <KpiCard
          icon={FiMessageCircle}
          label="Open support"
          value={String(kpis.openSupportTickets ?? 0)}
          hint={`${support.open ?? 0} open · ${support.inProgress ?? 0} in progress`}
          tone="rose"
          to="/support"
        />
        <KpiCard
          icon={FiUsers}
          label="Total riders"
          value={String(kpis.totalRiders ?? 0)}
          hint={`${kpis.offlineRiders ?? 0} offline · ${kpis.inactiveRiders ?? 0} inactive`}
          tone="slate"
          to="/riders"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Order pipeline</h2>
            <span className="text-[11px] text-slate-500">{statusTotal} total</span>
          </div>
          <div className="space-y-3">
            <BreakdownBar
              label="Available"
              value={byStatus.available ?? 0}
              total={statusTotal}
              color="bg-amber-400"
            />
            <BreakdownBar
              label="In transit"
              value={byStatus.in_transit ?? 0}
              total={statusTotal}
              color="bg-sky-500"
            />
            <BreakdownBar
              label="Delivered"
              value={byStatus.delivered ?? 0}
              total={statusTotal}
              color="bg-emerald-500"
            />
            <BreakdownBar
              label="Rejected"
              value={byStatus.rejected ?? 0}
              total={statusTotal}
              color="bg-rose-400"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Orders by type</h2>
            <span className="text-[11px] text-slate-500">{typeTotal} total</span>
          </div>
          <div className="space-y-3">
            <BreakdownBar
              label="Local"
              value={byOrderType.local ?? 0}
              total={typeTotal}
              color="bg-brand-orange"
            />
            <BreakdownBar
              label="Domestic"
              value={byOrderType.domestic ?? 0}
              total={typeTotal}
              color="bg-brand-blue"
            />
            <BreakdownBar
              label="International"
              value={byOrderType.international ?? 0}
              total={typeTotal}
              color="bg-violet-500"
            />
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-[12px] font-semibold text-slate-700">Rider fleet</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <dt className="text-slate-500">Online</dt>
                <dd className="font-semibold text-slate-900">{riders.online ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Offline</dt>
                <dd className="font-semibold text-slate-900">{riders.offline ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Dispatch eligible</dt>
                <dd className="font-semibold text-emerald-700">{riders.dispatchEligible ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Blocked</dt>
                <dd className="font-semibold text-amber-700">{riders.dispatchBlocked ?? 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recent orders</h2>
            <Link to="/orders" className="text-[12px] font-medium text-brand-orange">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Rider</th>
                  <th className="px-2 py-2">Pickup</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Earning</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-6 text-center text-sm text-slate-500">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-2.5">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-[12px] font-medium text-brand-blue hover:underline"
                        >
                          {formatOrderLabel(order)}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-[12px] text-slate-700">
                        {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType ?? '—'}
                      </td>
                      <td className="px-2 py-2.5 text-[12px] text-slate-700">
                        {order.riderName ?? (order.assignedToWarehouse ? 'Warehouse' : '—')}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2.5 text-[12px] text-slate-600">
                        {order.pickup ?? '—'}
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusPill status={order.status} />
                      </td>
                      <td className="px-2 py-2.5 text-[12px] text-slate-700">{formatRs(order.earning)}</td>
                      <td className="px-2 py-2.5 text-[11px] text-slate-500">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <FiAlertCircle className="text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-800">Operational alerts</h2>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertRow key={`${alert.title}-${alert.severity}`} {...alert} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <FiClock className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-800">Quick links</h2>
            </div>
            <div className="grid gap-2">
              <Link
                to="/orders"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Manage orders
              </Link>
              <Link
                to="/riders"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Rider roster
              </Link>
              <Link
                to="/dispatch-policies"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Dispatch policies
              </Link>
              <Link
                to="/support"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Support inbox
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage
