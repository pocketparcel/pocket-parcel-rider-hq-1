import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiEye, FiRefreshCw, FiRotateCcw, FiTrash2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import DataTable from '../components/data-table/DataTable'
import { adminApi } from '../config/api'
import { adminTableAutoRefresh, getAutoRefreshMs } from '../config/app'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const STATUS_LABELS = {
  available: 'Available',
  in_transit: 'In transit',
  delivered: 'Delivered',
  rejected: 'Rejected',
}

const SOURCE_LABELS = {
  local: 'Local',
  forward: 'Forward',
}

const ORDER_TYPE_LABELS = {
  local: 'Local',
  domestic: 'Domestic',
  international: 'International',
}

const ORDER_TABS = [
  { key: 'local', label: 'Local', orderType: 'local', warehouseAssigned: false, completed: false },
  { key: 'domestic', label: 'Domestic', orderType: 'domestic', warehouseAssigned: false, completed: false },
  {
    key: 'international',
    label: 'International',
    orderType: 'international',
    warehouseAssigned: false,
    completed: false,
  },
  { key: 'warehouse', label: 'Warehouse', warehouseAssigned: true, completed: false },
  { key: 'completed', label: 'Completed', completed: true },
]

const RIDER_FLOW_LABELS = {
  accepted: 'Accepted',
  picked_up: 'Picked up',
  verified: 'Verified',
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  delivered: 'Delivered',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value) {
  if (value == null || value === '') return false
  return UUID_PATTERN.test(String(value).trim())
}

function formatOrderPrimary(row) {
  if (row.orderNumber && !isUuid(row.orderNumber)) return String(row.orderNumber)
  if (row.referenceNumber && !isUuid(row.referenceNumber)) return String(row.referenceNumber)
  return '—'
}

function formatOrderSecondary(row) {
  const orderNo = row.orderNumber && !isUuid(row.orderNumber) ? String(row.orderNumber) : null
  const refNo = row.referenceNumber && !isUuid(row.referenceNumber) ? String(row.referenceNumber) : null
  if (orderNo && refNo && orderNo !== refNo) return refNo
  return null
}

function formatOrderExportLabel(row) {
  const primary = formatOrderPrimary(row)
  const secondary = formatOrderSecondary(row)
  if (primary === '—') return '—'
  return secondary ? `${primary} / ${secondary}` : primary
}

function StatusPill({ status }) {
  const styles = {
    available: 'bg-amber-50 text-amber-800',
    in_transit: 'bg-sky-50 text-sky-700',
    delivered: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
  }

  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {STATUS_LABELS[status] ?? displayValue(status)}
    </span>
  )
}

function SourcePill({ sourceVariant }) {
  const isLocal = sourceVariant === 'local'
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        isLocal ? 'bg-violet-50 text-violet-700' : 'bg-indigo-50 text-indigo-700'
      }`}
    >
      {SOURCE_LABELS[sourceVariant] ?? displayValue(sourceVariant)}
    </span>
  )
}

function buildOrderColumns({
  onRetrigger,
  retriggeringId,
  onReset,
  resettingId,
  showWarehouseTab = false,
} = {}) {
  return [
    {
      key: 'orderNumber',
      label: 'Order #',
      sticky: 'left',
      width: '11rem',
      defaultVisible: true,
      getSortValue: (row) => formatOrderPrimary(row),
      getSearchValue: (row) =>
        [row.orderNumber, row.referenceNumber].filter((value) => value && !isUuid(value)).join(' '),
      render: (row) => (
        <div className="min-w-0 overflow-hidden">
          <p className="truncate font-medium text-slate-900">{formatOrderPrimary(row)}</p>
          {formatOrderSecondary(row) ? (
            <p className="truncate text-[10px] text-slate-500">{formatOrderSecondary(row)}</p>
          ) : null}
        </div>
      ),
      getExportValue: (row) => formatOrderExportLabel(row),
    },
    {
      key: 'requiredVehicle',
      label: 'Vehicle',
      getSortValue: (row) => row.requiredVehicleTypeName ?? row.customerAppVehicleType,
      render: (row) => (
        <div className="min-w-0 overflow-hidden">
          <p className="truncate text-slate-800">{displayValue(row.requiredVehicleTypeName ?? 'Unmapped')}</p>
          {row.customerAppVehicleType ? (
            <p className="truncate text-[10px] text-slate-500">{row.customerAppVehicleType}</p>
          ) : null}
        </div>
      ),
      getExportValue: (row) =>
        row.requiredVehicleTypeName
          ? `${row.requiredVehicleTypeName}${row.customerAppVehicleType ? ` (${row.customerAppVehicleType})` : ''}`
          : row.customerAppVehicleType ?? '',
    },
    {
      key: 'sourceVariant',
      label: 'Source',
      getSortValue: (row) => row.sourceVariant,
      render: (row) => <SourcePill sourceVariant={row.sourceVariant} />,
      getExportValue: (row) => SOURCE_LABELS[row.sourceVariant] ?? row.sourceVariant,
    },
    {
      key: 'orderType',
      label: 'Type',
      getSortValue: (row) => row.orderType,
      render: (row) => ORDER_TYPE_LABELS[row.orderType] ?? displayValue(row.orderType),
      getExportValue: (row) => ORDER_TYPE_LABELS[row.orderType] ?? row.orderType,
    },
    ...(showWarehouseTab
      ? [
          {
            key: 'warehouseName',
            label: 'Warehouse',
            getSortValue: (row) => row.warehouseName,
            render: (row) => (
              <div className="max-w-[220px]">
                <p className="truncate text-slate-800">{displayValue(row.warehouseName)}</p>
                {row.warehouseAddress ? (
                  <p className="truncate text-[10px] text-slate-500">{row.warehouseAddress}</p>
                ) : null}
              </div>
            ),
            getExportValue: (row) =>
              row.warehouseName
                ? `${row.warehouseName}${row.warehouseAddress ? ` (${row.warehouseAddress})` : ''}`
                : row.warehouseAddress ?? '',
          },
          {
            key: 'warehouseAssignedAt',
            label: 'Assigned at',
            getSortValue: (row) => row.warehouseAssignedAt,
            render: (row) => formatDate(row.warehouseAssignedAt),
            getExportValue: (row) => formatDate(row.warehouseAssignedAt),
          },
        ]
      : []),
    {
      key: 'status',
      label: 'Rider status',
      getSortValue: (row) => row.status,
      render: (row) => <StatusPill status={row.status} />,
      getExportValue: (row) => STATUS_LABELS[row.status] ?? row.status,
    },
    {
      key: 'customerOrderStatus',
      label: 'Customer status',
      getSortValue: (row) => row.customerOrderStatus,
      render: (row) => displayValue(row.customerOrderStatus),
    },
    {
      key: 'pickup',
      label: 'Pickup',
      getSortValue: (row) => row.pickup,
      render: (row) => (
        <div className="max-w-[220px]">
          <p className="truncate text-slate-800">{displayValue(row.pickup)}</p>
          {row.pickupHint ? <p className="truncate text-[10px] text-slate-500">{row.pickupHint}</p> : null}
        </div>
      ),
    },
    {
      key: 'dropoff',
      label: 'Dropoff',
      getSortValue: (row) => row.dropoff,
      render: (row) => (
        <div className="max-w-[220px]">
          <p className="truncate text-slate-800">{displayValue(row.dropoff)}</p>
          {row.dropCount > 1 ? (
            <p className="text-[10px] font-medium text-brand-orange">{row.dropCount} stops</p>
          ) : row.dropoffHint ? (
            <p className="truncate text-[10px] text-slate-500">{row.dropoffHint}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'dropCount',
      label: 'Stops',
      getSortValue: (row) => row.dropCount,
      render: (row) => row.dropCount,
    },
    {
      key: 'packageType',
      label: 'Package',
      getSortValue: (row) => row.packageType,
      render: (row) => displayValue(row.packageType),
    },
    {
      key: 'earning',
      label: 'Earning',
      getSortValue: (row) => row.earning,
      render: (row) => `Rs ${row.earning ?? 0}`,
      getExportValue: (row) => row.earning ?? 0,
    },
    {
      key: 'distanceKm',
      label: 'Distance',
      getSortValue: (row) => row.distanceKm,
      render: (row) => (row.distanceKm != null ? `${row.distanceKm} km` : '—'),
    },
    {
      key: 'riderName',
      label: 'Rider',
      getSortValue: (row) => row.riderName,
      render: (row) => (
        <div>
          <p className="text-slate-800">{displayValue(row.riderName)}</p>
          {row.riderPhone ? <p className="text-[10px] text-slate-500">{row.riderPhone}</p> : null}
        </div>
      ),
      getExportValue: (row) => row.riderName,
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      getSortValue: (row) => row.paymentStatus,
      render: (row) => displayValue(row.paymentStatus),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      getSortValue: (row) => row.totalAmount,
      render: (row) => (row.totalAmount ? `Rs ${row.totalAmount}` : '—'),
    },
    {
      key: 'createdAt',
      label: 'Created',
      getSortValue: (row) => row.createdAt,
      render: (row) => formatDate(row.createdAt),
      getExportValue: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      label: 'Actions',
      sticky: 'right',
      width: '15rem',
      defaultVisible: true,
      enableSort: false,
      getSearchValue: () => '',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          {row.canRetriggerDispatch ? (
            <button
              type="button"
              disabled={retriggeringId === row.id}
              onClick={() => onRetrigger?.(row)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
              title="Re-broadcast to online riders"
            >
              <FiRefreshCw className={`text-sm ${retriggeringId === row.id ? 'animate-spin' : ''}`} />
              Re-broadcast
            </button>
          ) : null}
          {row.canResetToAccepted ? (
            <button
              type="button"
              disabled={resettingId === row.id}
              onClick={() => onReset?.(row)}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
              title="Reset rider flow to accepted"
            >
              <FiRotateCcw className={`text-sm ${resettingId === row.id ? 'animate-spin' : ''}`} />
              Reset
            </button>
          ) : null}
          <Link
            to={`/orders/${encodeURIComponent(row.id)}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
          >
            <FiEye className="text-sm" />
            View
          </Link>
        </div>
      ),
      getExportValue: () => '',
    },
  ]
}

function OrdersPage({ adminToken, onUnauthorized }) {
  const [activeTab, setActiveTab] = useState('local')
  const [rows, setRows] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [retriggeringId, setRetriggeringId] = useState('')
  const [resettingId, setResettingId] = useState('')
  const [deletingAll, setDeletingAll] = useState(false)
  const controllerRef = useRef(null)
  const silentControllerRef = useRef(null)
  const lastQueryRef = useRef(null)
  const ordersRefreshMs = getAutoRefreshMs(adminTableAutoRefresh.ordersSeconds)

  const fetchOrders = useCallback(
    async (query, { silent = false } = {}) => {
      if (!adminToken) return
      lastQueryRef.current = query

      const controller = new AbortController()
      if (silent) {
        silentControllerRef.current?.abort?.()
        silentControllerRef.current = controller
      } else {
        controllerRef.current?.abort?.()
        controllerRef.current = controller
      }

      try {
        if (!silent) {
          setLoading(true)
          setError('')
        }

        const url = new URL(adminApi.ordersPaged)
        url.searchParams.set('page', query.page)
        url.searchParams.set('pageSize', query.pageSize)
        if (query.search !== undefined) url.searchParams.set('search', query.search)
        if (query.sortBy) url.searchParams.set('sortBy', query.sortBy)
        if (query.sortDir) url.searchParams.set('sortDir', query.sortDir)
        const activeTabConfig = ORDER_TABS.find((tab) => tab.key === activeTab) ?? ORDER_TABS[0]
        if (activeTabConfig.completed) {
          url.searchParams.set('completed', 'true')
        } else {
          url.searchParams.set('excludeCompleted', 'true')
          if (activeTabConfig.warehouseAssigned) {
            url.searchParams.set('warehouseAssigned', 'true')
          } else if (activeTabConfig.orderType) {
            url.searchParams.set('orderType', activeTabConfig.orderType)
            url.searchParams.set('warehouseAssigned', 'false')
          }
        }

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized?.()
            return
          }
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.message || `Request failed (${response.status})`)
        }

        const payload = await response.json().catch(() => ({}))
        const data = payload.data ?? {}
        setRows(Array.isArray(data.items) ? data.items : [])
        setTotalRows(Number(data.meta?.total ?? 0))
      } catch (err) {
        if (err.name !== 'AbortError' && !silent) {
          setRows([])
          setTotalRows(0)
          setError(err.message || 'Failed to load orders')
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [adminToken, onUnauthorized, activeTab],
  )

  const refreshCurrentPage = useCallback(() => {
    if (lastQueryRef.current) {
      fetchOrders(lastQueryRef.current, { silent: true })
    }
  }, [fetchOrders])

  useAutoRefresh({
    enabled: Boolean(adminToken) && ordersRefreshMs > 0,
    intervalMs: ordersRefreshMs,
    onRefresh: refreshCurrentPage,
  })

  useEffect(() => {
    return () => {
      controllerRef.current?.abort?.()
      silentControllerRef.current?.abort?.()
    }
  }, [])

  const handleReset = useCallback(
    async (row) => {
      if (!adminToken || !row?.id) return
      const label = formatOrderPrimary(row)
      const orderLabel = label !== '—' ? label : 'this order'
      if (!window.confirm(`Reset rider flow for ${orderLabel} back to accepted?`)) return
      try {
        setResettingId(row.id)
        setError('')
        setSuccess('')
        const response = await fetch(adminApi.resetOrderToAccepted(row.id), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        })
        if (response.status === 401) {
          onUnauthorized?.()
          return
        }
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload.message || `Request failed (${response.status})`)
        }
        const updatedOrder = payload.data?.order
        if (updatedOrder?.id) {
          setRows((prev) =>
            prev.map((row) =>
              row.id === updatedOrder.id
                ? {
                    ...row,
                    riderFlowStage: updatedOrder.riderFlowStage,
                    canResetToAccepted: updatedOrder.canResetToAccepted,
                    updatedAt: updatedOrder.updatedAt,
                  }
                : row,
            ),
          )
        }
        setSuccess(payload.message || 'Order reset to accepted')
        if (lastQueryRef.current) {
          await fetchOrders(lastQueryRef.current, { silent: true })
        }
      } catch (err) {
        setError(err.message || 'Failed to reset order')
      } finally {
        setResettingId('')
      }
    },
    [adminToken, fetchOrders, onUnauthorized],
  )

  const handleDeleteAll = useCallback(async () => {
    if (!adminToken) return
    if (
      !window.confirm(
        'Delete ALL orders? This permanently removes every order and cannot be undone.',
      )
    ) {
      return
    }

    try {
      setDeletingAll(true)
      setError('')
      setSuccess('')
      const response = await fetch(adminApi.deleteAllOrders, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.status === 401) {
        onUnauthorized?.()
        return
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || `Request failed (${response.status})`)
      }
      setRows([])
      setTotalRows(0)
      setSuccess(payload.message || 'All orders deleted')
      if (lastQueryRef.current) {
        await fetchOrders(lastQueryRef.current)
      }
    } catch (err) {
      setError(err.message || 'Failed to delete orders')
    } finally {
      setDeletingAll(false)
    }
  }, [adminToken, fetchOrders, onUnauthorized])

  const handleRetrigger = useCallback(
    async (row) => {
      if (!adminToken || !row?.id) return
      try {
        setRetriggeringId(row.id)
        setError('')
        setSuccess('')
        const response = await fetch(adminApi.retriggerOrderDispatch(row.id), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        })
        if (response.status === 401) {
          onUnauthorized?.()
          return
        }
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload.message || `Request failed (${response.status})`)
        }
        setSuccess(payload.message || 'Order re-broadcast to riders')
        if (lastQueryRef.current) {
          await fetchOrders(lastQueryRef.current)
        }
      } catch (err) {
        setError(err.message || 'Failed to re-broadcast order')
      } finally {
        setRetriggeringId('')
      }
    },
    [adminToken, fetchOrders, onUnauthorized],
  )

  const tableData = useMemo(() => rows, [rows])
  const isWarehouseTab = activeTab === 'warehouse'
  const isCompletedTab = activeTab === 'completed'
  const columns = useMemo(
    () =>
      buildOrderColumns({
        onRetrigger: handleRetrigger,
        retriggeringId,
        onReset: handleReset,
        resettingId,
        showWarehouseTab: isWarehouseTab,
      }),
    [handleRetrigger, retriggeringId, handleReset, resettingId, isWarehouseTab],
  )

  return (
    <section className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-semibold leading-none text-slate-900">Orders</h1>
          <p className="mt-2 text-sm text-slate-600">
            View orders ingested from customer webhooks, including multi-stop local deliveries.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDeleteAll}
          disabled={deletingAll || loading}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiTrash2 className={`text-base ${deletingAll ? 'animate-pulse' : ''}`} />
          {deletingAll ? 'Deleting…' : 'Delete all orders'}
        </button>
      </div>

      {error ? (
        <p className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="flex shrink-0 flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {ORDER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-brand-orange text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        key={`orders-${activeTab}`}
        className="min-h-0 flex-1"
        columns={columns}
        data={tableData}
        loading={loading}
        emptyMessage={
          isCompletedTab
            ? 'No completed orders yet.'
            : isWarehouseTab
              ? 'No orders assigned to warehouse yet.'
              : `No ${ORDER_TYPE_LABELS[activeTab]?.toLowerCase() ?? activeTab} orders found.`
        }
        searchPlaceholder="Search order #, pickup, dropoff, rider..."
        dataMode="server"
        serverTotalRows={totalRows}
        onQueryChange={fetchOrders}
        exportFileName={`orders-${activeTab}`}
        minWidth={1700}
        maxHeight="100%"
      />
    </section>
  )
}

export default OrdersPage
